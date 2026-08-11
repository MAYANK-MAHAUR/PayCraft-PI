const db = require('../config/database');
const WebhookService = require('./webhookService');
const QrService = require('./qrService');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class PaymentService {
  static async createPayment({
    merchantId,
    amount,
    currency = 'USD',
    description = '',
    customerEmail = null,
    customerName = null,
    metadata = {},
    idempotencyKey = null,
    paymentMethod = 'card',
    mode = 'test',
  }) {
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new BadRequestError('Amount must be a positive integer in cents (e.g. 1000 = $10.00)');
    }

    if (!currency || currency.length !== 3) {
      throw new BadRequestError('Currency must be a 3-letter ISO code (e.g. USD, EUR)');
    }

    // Sanitize inputs
    const sanitizedEmail = customerEmail ? String(customerEmail).trim().toLowerCase() : null;
    const sanitizedName = customerName ? String(customerName).trim().slice(0, 100) : null;
    const sanitizedDesc = description ? String(description).trim().slice(0, 255) : '';

    // Check existing transaction if idempotency key provided
    if (idempotencyKey) {
      const existing = await db.query(
        'SELECT * FROM transactions WHERE merchant_id = $1 AND idempotency_key = $2',
        [merchantId, idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }
    }

    // Fetch merchant business name for QR payload branding
    const merchantRes = await db.query('SELECT business_name FROM merchants WHERE id = $1', [merchantId]);
    const businessName = merchantRes.rows.length > 0 ? merchantRes.rows[0].business_name : 'PayCraft Merchant';

    // Create payment transaction in pending state
    const result = await db.query(
      `INSERT INTO transactions 
       (merchant_id, idempotency_key, amount, currency, status, description, customer_email, customer_name, metadata, payment_method, mode)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        merchantId,
        idempotencyKey,
        amount,
        currency.toUpperCase(),
        sanitizedDesc,
        sanitizedEmail,
        sanitizedName,
        JSON.stringify(metadata),
        paymentMethod,
        mode,
      ]
    );

    const transaction = result.rows[0];

    // Generate QR payload and image
    let qrPayload = null;
    let qrCodeUrl = null;
    try {
      qrPayload = QrService.generatePayload({
        transactionId: transaction.id,
        merchantId,
        amount: transaction.amount,
        currency: transaction.currency,
        businessName,
      });
      qrCodeUrl = await QrService.generateDataUrl(qrPayload);
    } catch (err) {
      console.warn('QR generation notice:', err.message);
    }

    const newStatus = 'succeeded';
    const failureReason = null;

    const updatedResult = await db.query(
      `UPDATE transactions
       SET status = $1, failure_reason = $2, qr_payload = $3, qr_code_url = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [newStatus, failureReason, qrPayload, qrCodeUrl, transaction.id]
    );

    const finalTransaction = updatedResult.rows[0];

    // Create Webhook Event asynchronously
    const eventType = newStatus === 'succeeded' ? 'payment.succeeded' : 'payment.failed';
    WebhookService.createWebhookEvent(
      merchantId,
      finalTransaction.id,
      eventType,
      {
        id: finalTransaction.id,
        amount: finalTransaction.amount,
        currency: finalTransaction.currency,
        status: finalTransaction.status,
        customer_email: finalTransaction.customer_email,
        description: finalTransaction.description,
        created_at: finalTransaction.created_at,
        qr_code_url: finalTransaction.qr_code_url,
        metadata: finalTransaction.metadata,
      }
    ).catch(err => console.error('Failed to log webhook event:', err));

    return finalTransaction;
  }

  static async processQrPayment({ qrPayload, customerEmail, customerName }) {
    const parsed = QrService.parsePayload(qrPayload);
    const { tx: transactionId } = parsed;

    const existingRes = await db.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (existingRes.rows.length === 0) {
      throw new NotFoundError('Transaction associated with QR code not found');
    }

    const existingTx = existingRes.rows[0];

    if (existingTx.status === 'succeeded') {
      return existingTx; // Already completed
    }

    const updatedResult = await db.query(
      `UPDATE transactions
       SET status = 'succeeded',
           payment_method = 'qr_code',
           customer_email = COALESCE($1, customer_email),
           customer_name = COALESCE($2, customer_name),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [customerEmail || null, customerName || null, transactionId]
    );

    const completedTx = updatedResult.rows[0];

    // Trigger webhook event
    WebhookService.createWebhookEvent(
      completedTx.merchant_id,
      completedTx.id,
      'payment.succeeded',
      {
        id: completedTx.id,
        amount: completedTx.amount,
        currency: completedTx.currency,
        status: completedTx.status,
        payment_method: 'qr_code',
        customer_email: completedTx.customer_email,
        created_at: completedTx.created_at,
      }
    ).catch(() => {});

    return completedTx;
  }

  static async getPayment(merchantId, paymentId) {
    const result = await db.query(
      'SELECT * FROM transactions WHERE id = $1 AND merchant_id = $2',
      [paymentId, merchantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Payment transaction not found');
    }

    return result.rows[0];
  }

  static async listPayments(merchantId, { limit = 20, offset = 0, status, mode } = {}) {
    let queryText = 'SELECT * FROM transactions WHERE merchant_id = $1';
    const queryParams = [merchantId];

    if (status) {
      queryParams.push(status);
      queryText += ` AND status = $${queryParams.length}`;
    }

    if (mode) {
      queryParams.push(mode);
      queryText += ` AND mode = $${queryParams.length}`;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await db.query(queryText, queryParams);

    const countResult = await db.query(
      'SELECT COUNT(*) FROM transactions WHERE merchant_id = $1',
      [merchantId]
    );

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    };
  }

  static async getStats(merchantId) {
    const whereClause = `WHERE (t.merchant_id = $1 OR t.sender_merchant_id = $1 OR t.receiver_merchant_id = $1)`;

    const totalVolumeResult = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) as total_volume, COUNT(*) as total_count
       FROM transactions t
       ${whereClause} AND t.status = 'succeeded'`,
      [merchantId]
    );

    const statusCountsResult = await db.query(
      `SELECT t.status, COUNT(*) as count
       FROM transactions t
       ${whereClause}
       GROUP BY t.status`,
      [merchantId]
    );

    const recentResult = await db.query(
      `SELECT
         t.*,
         sm.full_name      AS sender_full_name,
         sm.business_name  AS sender_business_name,
         sm.avatar_url     AS sender_avatar_url,
         rm.full_name      AS receiver_full_name,
         rm.business_name  AS receiver_business_name,
         rm.avatar_url     AS receiver_avatar_url
       FROM transactions t
       LEFT JOIN merchants sm ON t.sender_merchant_id = sm.id
       LEFT JOIN merchants rm ON t.receiver_merchant_id = rm.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [merchantId]
    );

    const counts = { succeeded: 0, failed: 0, pending: 0 };
    statusCountsResult.rows.forEach(row => {
      counts[row.status] = parseInt(row.count, 10);
    });

    const totalTxns = counts.succeeded + counts.failed + counts.pending;
    const successRate = totalTxns > 0 ? ((counts.succeeded / totalTxns) * 100).toFixed(1) : 100;

    const recentTransactions = recentResult.rows.map(tx => {
      const mId = tx.merchant_id;
      const sId = tx.sender_merchant_id;
      const rId = tx.receiver_merchant_id;

      let direction;
      if (sId && rId && sId === rId) direction = 'self';        // top-up / internal
      else if (rId === merchantId) direction = 'incoming';      // credit — someone paid me
      else if (sId === merchantId) direction = 'outgoing';      // debit — I paid someone
      else if (mId === merchantId) direction = 'outgoing';
      else direction = 'unknown';

      let counterpartyHandle = null;
      let counterpartyName = null;
      let counterpartyAvatar = null;

      if (direction === 'incoming') {
        counterpartyHandle = tx.sender_pi_handle;
        counterpartyName = tx.sender_full_name || tx.sender_business_name || tx.customer_name || tx.customer_email || 'Unknown Sender';
        counterpartyAvatar = tx.sender_avatar_url;
      } else if (direction === 'outgoing') {
        counterpartyHandle = tx.receiver_pi_handle;
        counterpartyName = tx.receiver_full_name || tx.receiver_business_name || tx.customer_name || 'Unknown Recipient';
        counterpartyAvatar = tx.receiver_avatar_url;
      } else {
        counterpartyName = 'PI Wallet Top-Up';
      }

      const rawDesc = tx.description || '';
      const displayDescription = /bank|imps/i.test(rawDesc) ? 'PI Top-Up' : (rawDesc || 'PI Transfer');

      return {
        ...tx,
        direction,
        counterpartyHandle,
        counterpartyName,
        counterpartyAvatar,
        displayDescription,
      };
    });

    return {
      totalVolumeCents: parseInt(totalVolumeResult.rows[0].total_volume, 10),
      totalSuccessfulCount: parseInt(totalVolumeResult.rows[0].total_count, 10),
      totalCount: totalTxns,
      counts,
      successRate: parseFloat(successRate),
      recentTransactions,
    };
  }

  static async getTimeSeriesData(merchantId, days = 7) {
    const result = await db.query(
      `SELECT 
         TO_CHAR(t.created_at, 'YYYY-MM-DD') as date,
         COALESCE(SUM(CASE WHEN t.status = 'succeeded' THEN t.amount ELSE 0 END), 0) as volume,
         COUNT(CASE WHEN t.status = 'succeeded' THEN 1 END) as count
       FROM transactions t
       WHERE (t.merchant_id = $1 OR t.sender_merchant_id = $1 OR t.receiver_merchant_id = $1)
         AND t.created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY TO_CHAR(t.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      [merchantId, days]
    );

    return result.rows;
  }
}

module.exports = PaymentService;
