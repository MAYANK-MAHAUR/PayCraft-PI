const express = require('express');
const { authenticateMerchant } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');

const router = express.Router();

router.use(authenticateMerchant);

// List Transactions for Dashboard
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status;
    const mode = req.query.mode;

    const result = await PaymentService.listPayments(req.merchant.id, {
      limit,
      offset,
      status,
      mode,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get Single Transaction Detail
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await PaymentService.getPayment(req.merchant.id, req.params.id);
    res.json({ transaction });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
