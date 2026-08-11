const express = require('express');
const crypto = require('crypto');
const cache = require('../config/redis');
const { authenticateMerchant } = require('../middleware/auth');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { generatePiRefId, generatePiPaymentId, formatCurrency } = require('../utils/helpers');
const db = require('../config/database');
const eventBus = require('../services/eventBus');

const router = express.Router();

// Create Checkout Session
router.post('/session', async (req, res, next) => {
  try {
    const { merchantId, amount, currency = 'USD', description = 'Purchase', customerEmail, returnUrl } = req.body;

    let targetMerchantId = merchantId;

    // Fallback: If no merchantId, pick first merchant in DB for test checkout.
    if (!targetMerchantId) {
      const firstMerchant = await db.query('SELECT id FROM merchants LIMIT 1');
      if (firstMerchant.rows.length > 0) {
        targetMerchantId = firstMerchant.rows[0].id;
      } else {
        throw new BadRequestError('No merchant registered yet for checkout.');
      }
    }

    const sessionId = `cs_test_${crypto.randomBytes(16).toString('hex')}`;
    const piPaymentId = generatePiPaymentId();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10-minute QR / PI ID time limit

    const sessionData = {
      sessionId,
      piPaymentId,
      expiresAt,
      merchantId: targetMerchantId,
      amount: parseInt(amount, 10) || 4999, // default $49.99 (cents)
      currency: currency.toUpperCase(),
      description,
      customerEmail: customerEmail || 'customer@example.com',
      returnUrl: returnUrl || '/checkout/success',
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    await cache.set(`checkout:${sessionId}`, JSON.stringify(sessionData), 3600); // 1 hour TTL
    await cache.set(`checkout:pid:${piPaymentId}`, sessionId, 3600); // reverse index by PI Payment ID

    res.status(201).json({
      sessionId,
      piPaymentId,
      expiresAt,
      checkoutUrl: `/checkout/${sessionId}`,
      session: sessionData,
    });
  } catch (err) {
    next(err);
  }
});

// Shared: build public checkout-session payload
async function getSessionPayload(sessionId) {
  const sessionRaw = await cache.get(`checkout:${sessionId}`);
  if (!sessionRaw) {
    throw new NotFoundError('Checkout session expired or not found');
  }
  const session = JSON.parse(sessionRaw);

  const merchantResult = await db.query(
    'SELECT business_name, pi_handle FROM merchants WHERE id = $1',
    [session.merchantId]
  );
  const merchant =
    merchantResult.rows.length > 0 ? merchantResult.rows[0] : null;

  if (!merchant) {
    throw new NotFoundError('Merchant for this checkout no longer exists.');
  }
  if (!merchant.pi_handle) {
    throw new BadRequestError('This merchant has not set up a PI Handle yet.');
  }
  if (session.expiresAt && session.expiresAt < Date.now()) {
    throw new BadRequestError('Checkout session expired');
  }

  return {
    session: {
      ...session,
      businessName: merchant.business_name,
      merchantPiHandle: merchant.pi_handle,
      currency: session.currency || 'USD',
    },
  };
}

// Resolve checkout session by PI Payment ID
router.get('/lookup/:piPaymentId', async (req, res, next) => {
  try {
    const sessionId = await cache.get(`checkout:pid:${req.params.piPaymentId}`);
    if (!sessionId) {
      throw new NotFoundError('No checkout session for that PI Payment ID');
    }
    const payload = await getSessionPayload(sessionId);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Get Checkout Session Data (public — no auth; only non-sensitive fields)
router.get('/:sessionId', async (req, res, next) => {
  try {
    const payload = await getSessionPayload(req.params.sessionId);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Pay checkout session
router.post('/:sessionId/pay', authenticateMerchant, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const sessionRaw = await cache.get(`checkout:${req.params.sessionId}`);

    if (!sessionRaw) {
      throw new NotFoundError('Checkout session expired or not found');
    }

    const session = JSON.parse(sessionRaw);

    if (session.status === 'completed') {
      throw new BadRequestError('Checkout session has already been completed');
    }

    if (session.expiresAt && session.expiresAt < Date.now()) {
      throw new BadRequestError('Checkout session expired');
    }

    const amountPaise = parseInt(session.amount, 10);
    const currency = (session.currency || 'USD').toUpperCase();
    const note = session.description || 'Checkout payment';

    if (isNaN(amountPaise) || amountPaise <= 0) {
      throw new BadRequestError('Invalid checkout amount');
    }

    await client.query('BEGIN');

    // 1. Lock & check payer (sender) balance
    const senderRes = await client.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE id = $1 FOR UPDATE',
      [req.merchant.id]
    );
    const sender = senderRes.rows[0];
    const senderBalance = parseInt(sender.wallet_balance || 0, 10);

    if (sender.id === session.merchantId) {
      await client.query('ROLLBACK');
      throw new BadRequestError('You cannot pay your own checkout session');
    }

    if (senderBalance < amountPaise) {
      await client.query('ROLLBACK');
      throw new BadRequestError(
        `Insufficient paper-money balance! Your wallet has ${formatCurrency(senderBalance, 'USD')} but this order is ${formatCurrency(amountPaise, 'USD')}.`
      );
    }

    // 2. Receiver = session merchant
    const receiverRes = await client.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE id = $1 FOR UPDATE',
      [session.merchantId]
    );

    if (receiverRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Checkout merchant no longer exists');
    }
    const receiver = receiverRes.rows[0];

    // 3. Move funds
    const newSenderBalance = senderBalance - amountPaise;
    const receiverBalance = parseInt(receiver.wallet_balance || 0, 10);
    const newReceiverBalance = receiverBalance + amountPaise;

    await client.query(
      'UPDATE merchants SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
      [newSenderBalance, sender.id]
    );
    await client.query(
      'UPDATE merchants SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
      [newReceiverBalance, receiver.id]
    );

    // 4. Transaction record
    const piRefId = generatePiRefId();
    const senderPiHandle = sender.pi_handle;
    const receiverPiHandle = receiver.pi_handle;
    const receiverName = receiver.full_name || receiver.business_name;

    const txResult = await client.query(
      `INSERT INTO transactions (
        merchant_id, sender_merchant_id, receiver_merchant_id, sender_pi_handle, receiver_pi_handle,
        pi_ref_id, amount, currency, status, description, customer_email, customer_name,
        payment_method, mode, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'succeeded', $9, $10, $11, 'pi', 'live', $12)
      RETURNING *`,
      [
        sender.id,
        sender.id,
        receiver.id,
        senderPiHandle,
        receiverPiHandle,
        piRefId,
        amountPaise,
        currency,
        note,
        receiver.email,
        receiverName,
        JSON.stringify({ checkout_session_id: session.sessionId }),
      ]
    );

    await client.query('COMMIT');

    // Mark session completed
    session.status = 'completed';
    session.paymentId = piRefId;
    await cache.set(`checkout:${session.sessionId}`, JSON.stringify(session), 3600);

    const txId = txResult.rows[0].id;
    eventBus.publish(receiver.id, 'payment.received', {
      direction: 'incoming',
      amount: amountPaise,
      currency,
      formattedAmount: formatCurrency(amountPaise, currency),
      fromName: sender.full_name || sender.business_name,
      fromHandle: senderPiHandle,
      piRefId,
      txId,
      note,
      walletBalance: newReceiverBalance,
    });
    eventBus.publish(sender.id, 'payment.sent', {
      direction: 'outgoing',
      amount: amountPaise,
      currency,
      formattedAmount: formatCurrency(amountPaise, currency),
      toName: receiverName,
      toHandle: receiverPiHandle,
      piRefId,
      txId,
      note,
      walletBalance: newSenderBalance,
    });

    const payment = {
      id: piRefId,
      piRefId,
      amount: amountPaise,
      currency,
      status: 'succeeded',
      formattedAmount: formatCurrency(amountPaise, 'USD'),
      description: note,
      merchantName: receiverName,
      merchantPiHandle: receiverPiHandle,
      customerName: sender.full_name || sender.business_name,
      senderPiHandle,
      payment_method: 'pi',
    };

    res.json({
      message: 'Payment completed successfully!',
      payment,
      transaction: txResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Demo "pay as customer" endpoint
router.post('/:sessionId/pay-demo', authenticateMerchant, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const sessionRaw = await cache.get(`checkout:${req.params.sessionId}`);
    if (!sessionRaw) {
      throw new NotFoundError('Checkout session expired or not found');
    }
    const session = JSON.parse(sessionRaw);

    if (session.status === 'completed') {
      throw new BadRequestError('Checkout session has already been completed');
    }
    if (session.expiresAt && session.expiresAt < Date.now()) {
      throw new BadRequestError('Checkout session expired');
    }

    const amountPaise = parseInt(session.amount, 10);
    const currency = (session.currency || 'USD').toUpperCase();
    const note = session.description || 'Checkout payment';
    if (isNaN(amountPaise) || amountPaise <= 0) {
      throw new BadRequestError('Invalid checkout amount');
    }

    await client.query('BEGIN');

    // Ensure the seeded demo customer exists (real row, real wallet).
    const DEMO_EMAIL = 'demo-customer@paycraft';
    let customerRes = await client.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE email = $1 FOR UPDATE',
      [DEMO_EMAIL]
    );
    let customer;
    if (customerRes.rows.length === 0) {
      customerRes = await client.query(
        `INSERT INTO merchants (email, business_name, full_name, pi_handle, wallet_balance, google_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5, NULL, NULL) RETURNING id, email, business_name, full_name, pi_handle, wallet_balance`,
        [DEMO_EMAIL, 'PI Demo Customer', 'PI Demo Customer', DEMO_EMAIL, 100000]
      );
      customer = customerRes.rows[0];
    } else {
      customer = customerRes.rows[0];
      // Top up if low so the demo never fails on insufficient balance.
      if (parseInt(customer.wallet_balance || 0, 10) < amountPaise) {
        await client.query(
          'UPDATE merchants SET wallet_balance = GREATEST(wallet_balance, $1), updated_at = NOW() WHERE id = $2',
          [amountPaise, customer.id]
        );
        customer.wallet_balance = Math.max(parseInt(customer.wallet_balance || 0, 10), amountPaise);
      }
    }

    // 1. Lock & check payer (seeded demo customer)
    const senderRes = await client.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE id = $1 FOR UPDATE',
      [customer.id]
    );
    const sender = senderRes.rows[0];
    const senderBalance = parseInt(sender.wallet_balance || 0, 10);

    if (sender.id === session.merchantId) {
      await client.query('ROLLBACK');
      throw new BadRequestError('You cannot pay your own checkout session');
    }
    if (senderBalance < amountPaise) {
      await client.query('ROLLBACK');
      throw new BadRequestError(
        `Insufficient paper-money balance! The demo customer has ${formatCurrency(senderBalance, 'USD')} but this order is ${formatCurrency(amountPaise, 'USD')}.`
      );
    }

    // 2. Receiver = session merchant (the judge)
    const receiverRes = await client.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance FROM merchants WHERE id = $1 FOR UPDATE',
      [session.merchantId]
    );
    if (receiverRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Checkout merchant no longer exists');
    }
    const receiver = receiverRes.rows[0];

    // 3. Move funds (identical path to POST /:sessionId/pay)
    const newSenderBalance = senderBalance - amountPaise;
    const receiverBalance = parseInt(receiver.wallet_balance || 0, 10);
    const newReceiverBalance = receiverBalance + amountPaise;

    await client.query('UPDATE merchants SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [newSenderBalance, sender.id]);
    await client.query('UPDATE merchants SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [newReceiverBalance, receiver.id]);

    // 4. Transaction record
    const piRefId = generatePiRefId();
    const senderPiHandle = sender.pi_handle;
    const receiverPiHandle = receiver.pi_handle;
    const receiverName = receiver.full_name || receiver.business_name;

    const txResult = await client.query(
      `INSERT INTO transactions (
        merchant_id, sender_merchant_id, receiver_merchant_id, sender_pi_handle, receiver_pi_handle,
        pi_ref_id, amount, currency, status, description, customer_email, customer_name,
        payment_method, mode, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'succeeded', $9, $10, $11, 'pi', 'live', $12)
      RETURNING *`,
      [
        sender.id,
        sender.id,
        receiver.id,
        senderPiHandle,
        receiverPiHandle,
        piRefId,
        amountPaise,
        currency,
        note,
        receiver.email,
        receiverName,
        JSON.stringify({ checkout_session_id: session.sessionId, demo: true }),
      ]
    );

    await client.query('COMMIT');

    // Mark session completed
    session.status = 'completed';
    session.paymentId = piRefId;
    await cache.set(`checkout:${session.sessionId}`, JSON.stringify(session), 3600);

    // Real-time push: the merchant (receiver / judge) sees an incoming credit.
    const txId = txResult.rows[0].id;
    eventBus.publish(receiver.id, 'payment.received', {
      direction: 'incoming',
      amount: amountPaise,
      currency,
      formattedAmount: formatCurrency(amountPaise, currency),
      fromName: sender.full_name || sender.business_name,
      fromHandle: senderPiHandle,
      piRefId,
      txId,
      note,
      walletBalance: newReceiverBalance,
    });
    eventBus.publish(sender.id, 'payment.sent', {
      direction: 'outgoing',
      amount: amountPaise,
      currency,
      formattedAmount: formatCurrency(amountPaise, currency),
      toName: receiverName,
      toHandle: receiverPiHandle,
      piRefId,
      txId,
      note,
      walletBalance: newSenderBalance,
    });

    const payment = {
      id: piRefId,
      piRefId,
      amount: amountPaise,
      currency,
      status: 'succeeded',
      formattedAmount: formatCurrency(amountPaise, 'USD'),
      description: note,
      merchantName: receiverName,
      merchantPiHandle: receiverPiHandle,
      customerName: sender.full_name || sender.business_name,
      senderPiHandle,
      payment_method: 'pi',
    };

    res.json({
      message: 'Payment completed successfully!',
      payment,
      transaction: txResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
