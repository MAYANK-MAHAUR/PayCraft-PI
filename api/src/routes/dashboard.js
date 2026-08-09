const express = require('express');
const { authenticateMerchant } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');

const router = express.Router();

router.use(authenticateMerchant);

// Get Dashboard Overview Stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await PaymentService.getStats(req.merchant.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// Get Revenue Time Series Chart Data
router.get('/chart', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const chartData = await PaymentService.getTimeSeriesData(req.merchant.id, days);
    res.json({ chartData });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
