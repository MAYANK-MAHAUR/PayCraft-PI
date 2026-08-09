const express = require('express');
const { authenticateApiKey } = require('../middleware/apiKey');
const rateLimiter = require('../middleware/rateLimiter');
const idempotency = require('../middleware/idempotency');
const PaymentService = require('../services/paymentService');

const router = express.Router();

router.use(authenticateApiKey);
router.use(rateLimiter({ windowSeconds: 60, maxRequests: 100 }));

// Create Payment Transaction
router.post('/', idempotency, async (req, res, next) => {
  try {
    const { amount, currency, description, customer_email, customer_name, metadata, payment_method } = req.body;

    const payment = await PaymentService.createPayment({
      merchantId: req.merchant.id,
      amount,
      currency,
      description,
      customerEmail: customer_email,
      customerName: customer_name,
      metadata,
      idempotencyKey: req.idempotencyKey,
      paymentMethod: payment_method || 'card',
      mode: req.mode,
    });

    res.status(201).json({
      id: payment.id,
      object: 'payment',
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      customer_email: payment.customer_email,
      customer_name: payment.customer_name,
      metadata: payment.metadata,
      failure_reason: payment.failure_reason,
      receipt_url: payment.receipt_url,
      qr_payload: payment.qr_payload,
      qr_code_url: payment.qr_code_url,
      payment_method: payment.payment_method,
      mode: payment.mode,
      created_at: payment.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// Process QR Payment Scan
router.post('/qr-scan', async (req, res, next) => {
  try {
    const { qr_payload, customer_email, customer_name } = req.body;

    const payment = await PaymentService.processQrPayment({
      qrPayload: qr_payload,
      customerEmail: customer_email,
      customerName: customer_name,
    });

    res.json({
      message: 'QR Payment processed successfully',
      payment,
    });
  } catch (err) {
    next(err);
  }
});

// Get Payment Detail
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await PaymentService.getPayment(req.merchant.id, req.params.id);

    res.json({
      id: payment.id,
      object: 'payment',
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      customer_email: payment.customer_email,
      customer_name: payment.customer_name,
      metadata: payment.metadata,
      failure_reason: payment.failure_reason,
      receipt_url: payment.receipt_url,
      qr_payload: payment.qr_payload,
      qr_code_url: payment.qr_code_url,
      payment_method: payment.payment_method,
      mode: payment.mode,
      created_at: payment.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// List Payments
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status;

    const result = await PaymentService.listPayments(req.merchant.id, {
      limit,
      offset,
      status,
      mode: req.mode,
    });

    res.json({
      object: 'list',
      data: result.data.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        description: p.description,
        customer_email: p.customer_email,
        qr_code_url: p.qr_code_url,
        payment_method: p.payment_method,
        created_at: p.created_at,
      })),
      has_more: result.offset + result.data.length < result.total,
      total_count: result.total,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
