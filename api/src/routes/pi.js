const express = require('express');
const db = require('../config/database');
const { authenticateMerchant } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const QRService = require('../services/qrService');
const { generatePiRefId, formatCurrency } = require('../utils/helpers');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const eventBus = require('../services/eventBus');

const router = express.Router();
const piLimiter = rateLimiter({ windowSeconds: 60, maxRequests: 30 });

// Autocomplete search for payees by handle, email, or name
router.get('/search', authenticateMerchant, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json({ results: [] });
    }

    const searchTerm = `%${String(q).trim().toLowerCase()}%`;
    const result = await db.query(
      `SELECT id, email, business_name, full_name, pi_handle, avatar_url
       FROM merchants
       WHERE (LOWER(pi_handle) LIKE $1 OR LOWER(email) LIKE $1 OR LOWER(full_name) LIKE $1 OR LOWER(business_name) LIKE $1)
         AND id != $2
       LIMIT 8`,
      [searchTerm, req.merchant.id]
    );

    const results = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.full_name || row.business_name,
      piHandle: row.pi_handle,
      avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.email)}`,
    }));

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// Recent contacts
router.get('/contacts', authenticateMerchant, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (m.id) m.id, m.email, m.business_name, m.full_name, m.pi_handle, m.avatar_url, t.created_at as last_paid_at
       FROM transactions t
       JOIN merchants m ON (m.id = t.receiver_merchant_id)
       WHERE t.sender_merchant_id = $1 AND t.status = 'succeeded'
       ORDER BY m.id, t.created_at DESC
       LIMIT 10`,
      [req.merchant.id]
    );

    const contacts = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.full_name || row.business_name,
      piHandle: row.pi_handle,
      avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.email)}`,
      lastPaidAt: row.last_paid_at,
    }));

    res.json({ contacts });
  } catch (err) {
    next(err);
  }
});

// Public payee lookup for QR pay screen
router.get('/public/:handle', async (req, res, next) => {
  try {
    const handle = String(req.params.handle || '').trim().toLowerCase();
    if (!handle) return res.json({ exists: false });
    const result = await db.query(
      'SELECT id, email, business_name, full_name, pi_handle, avatar_url FROM merchants WHERE LOWER(pi_handle) = $1 OR LOWER(email) = $1',
      [handle]
    );
    if (result.rows.length === 0) return res.json({ exists: false });
    const m = result.rows[0];
    res.json({
      exists: true,
      piHandle: m.pi_handle,
      name: m.full_name || m.business_name,
      email: m.email,
      avatarUrl: m.avatar_url,
    });
  } catch (err) {
    next(err);
  }
});

// Generate merchant PI QR code
router.get('/qr', authenticateMerchant, async (req, res, next) => {
  try {
    const amount = req.query.amount ? parseInt(req.query.amount, 10) : null;
    const note = req.query.note ? String(req.query.note).trim() : 'PI Payment';

    const merchantRes = await db.query(
      'SELECT id, email, business_name, full_name, pi_handle FROM merchants WHERE id = $1',
      [req.merchant.id]
    );

    const merchant = merchantRes.rows[0];
    const piHandle = merchant.pi_handle;
    const name = merchant.full_name || merchant.business_name;

    if (!piHandle) {
      return res.status(400).json({
        error: { message: 'Your account has no PI Handle set up yet.' },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://paycraft.app';
    let piString = `${frontendUrl}/pay?pa=${encodeURIComponent(piHandle)}&pn=${encodeURIComponent(name)}&cu=USD`;
    if (amount && amount > 0) {
      piString += `&am=${(amount / 100).toFixed(2)}`;
    }
    piString += `&tn=${encodeURIComponent(note)}`;

    const qrDataUrl = await QRService.generateQR(piString);

    res.json({
      piHandle,
      name,
      piString,
      qrDataUrl,
      amount,
      note,
    });
  } catch (err) {
    next(err);
  }
});

// Instant P2P PI transfer
router.post('/transfer', piLimiter, authenticateMerchant, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { recipient, amount, note } = req.body;

    if (!recipient || !amount) {
      throw new BadRequestError('Recipient and amount are required');
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestError('Amount must be a positive number');
    }

    if (parsedAmount > 10000000) {
      throw new BadRequestError('Single transaction limit is $100,000');
    }

    const cleanRecipient = String(recipient).trim().toLowerCase();
    const sanitizedNote = note ? String(note).trim() : 'Instant PI Transfer';

    await client.query('BEGIN');

    const senderRes = await client.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE id = $1 FOR UPDATE',
      [req.merchant.id]
    );

    const sender = senderRes.rows[0];
    const senderBalance = parseInt(sender.wallet_balance || 0, 10);

    if (senderBalance < parsedAmount) {
      await client.query('ROLLBACK');
      throw new BadRequestError(`Insufficient balance! Current wallet balance is ${formatCurrency(senderBalance, 'USD')}`);
    }

    let receiverRes = await client.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE LOWER(pi_handle) = $1 OR LOWER(email) = $1 FOR UPDATE',
      [cleanRecipient]
    );

    if (receiverRes.rows.length === 0) {
      const searchPiHandle = cleanRecipient.includes('@') ? cleanRecipient : `${cleanRecipient}@paycraft`;
      receiverRes = await client.query(
        'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE LOWER(pi_handle) = $1 OR LOWER(email) = $1 FOR UPDATE',
        [searchPiHandle]
      );
    }

    if (receiverRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError(`Recipient '${recipient}' not found`);
    }

    const receiver = receiverRes.rows[0];

    if (!receiver.pi_handle) {
      await client.query('ROLLBACK');
      throw new BadRequestError(`Recipient '${recipient}' has no PI Handle set up.`);
    }

    if (receiver.id === sender.id) {
      await client.query('ROLLBACK');
      throw new BadRequestError('Cannot transfer funds to your own address');
    }

    const newSenderBalance = senderBalance - parsedAmount;
    const receiverBalance = parseInt(receiver.wallet_balance || 0, 10);
    const newReceiverBalance = receiverBalance + parsedAmount;

    await client.query(
      'UPDATE merchants SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
      [newSenderBalance, sender.id]
    );

    await client.query(
      'UPDATE merchants SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
      [newReceiverBalance, receiver.id]
    );

    const piRefId = generatePiRefId();
    const senderPiHandle = sender.pi_handle;
    const receiverPiHandle = receiver.pi_handle;
    const receiverName = receiver.full_name || receiver.business_name;

    const txResult = await client.query(
      `INSERT INTO transactions (
        merchant_id, sender_merchant_id, receiver_merchant_id, sender_pi_handle, receiver_pi_handle,
        pi_ref_id, amount, currency, status, description, customer_email, customer_name,
        payment_method, mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'USD', 'succeeded', $8, $9, $10, 'pi', 'live')
      RETURNING *`,
      [
        sender.id,
        sender.id,
        receiver.id,
        senderPiHandle,
        receiverPiHandle,
        piRefId,
        parsedAmount,
        sanitizedNote,
        receiver.email,
        receiverName,
      ]
    );

    await client.query('COMMIT');

    const txId = txResult.rows[0].id;
    eventBus.publish(receiver.id, 'payment.received', {
      direction: 'incoming',
      amount: parsedAmount,
      currency: 'USD',
      formattedAmount: formatCurrency(parsedAmount, 'USD'),
      fromName: sender.full_name || sender.business_name,
      fromHandle: senderPiHandle,
      piRefId,
      txId,
      note: sanitizedNote,
      walletBalance: newReceiverBalance,
    });
    eventBus.publish(sender.id, 'payment.sent', {
      direction: 'outgoing',
      amount: parsedAmount,
      currency: 'USD',
      formattedAmount: formatCurrency(parsedAmount, 'USD'),
      toName: receiverName,
      toHandle: receiverPiHandle,
      piRefId,
      txId,
      note: sanitizedNote,
      walletBalance: newSenderBalance,
    });

    res.json({
      message: 'PI Transfer Succeeded',
      piRefId,
      status: 'succeeded',
      amount: parsedAmount,
      currency: 'USD',
      formattedAmount: formatCurrency(parsedAmount, 'USD'),
      sender: {
        piHandle: senderPiHandle,
        newBalance: newSenderBalance,
        formattedBalance: formatCurrency(newSenderBalance, 'USD'),
      },
      receiver: {
        name: receiverName,
        piHandle: receiverPiHandle,
        email: receiver.email,
      },
      transaction: txResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Wallet top-up
router.post('/topup', authenticateMerchant, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const parsedAmount = parseInt(amount, 10);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestError('Please specify a valid top-up amount');
    }

    const result = await db.query(
      `UPDATE merchants
       SET wallet_balance = wallet_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING wallet_balance, pi_handle, email, full_name, business_name`,
      [parsedAmount, req.merchant.id]
    );

    const updated = result.rows[0];
    const piRefId = generatePiRefId();

    const senderPiHandle = updated.pi_handle;
    await db.query(
      `INSERT INTO transactions (
        merchant_id, sender_merchant_id, receiver_merchant_id, sender_pi_handle, receiver_pi_handle,
        pi_ref_id, amount, currency, status, description, customer_email, customer_name, payment_method, mode
      ) VALUES ($1, $1, $1, $2, $2, $3, $4, 'USD', 'succeeded', 'PI Wallet Top-Up', $5, $6, 'pi', 'live')`,
      [req.merchant.id, senderPiHandle, piRefId, parsedAmount, updated.email, updated.full_name || updated.business_name]
    );

    eventBus.publish(req.merchant.id, 'wallet.topup', {
      direction: 'self',
      amount: parsedAmount,
      currency: 'USD',
      formattedAmount: formatCurrency(parsedAmount, 'USD'),
      walletBalance: parseInt(updated.wallet_balance, 10),
      piRefId,
    });

    res.json({
      message: 'Wallet topped up successfully',
      piRefId,
      walletBalance: parseInt(updated.wallet_balance, 10),
      formattedBalance: formatCurrency(parseInt(updated.wallet_balance, 10), 'USD'),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
