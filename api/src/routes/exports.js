const express = require('express');
const { authenticateMerchant } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');
const storage = require('../config/storage');

const router = express.Router();

router.use(authenticateMerchant);

// Export Transactions as CSV
router.post('/csv', async (req, res, next) => {
  try {
    const result = await PaymentService.listPayments(req.merchant.id, { limit: 1000 });
    const transactions = result.data;

    let csvContent = 'ID,Amount (Cents),Currency,Status,Description,Customer Email,Customer Name,Created At\n';

    transactions.forEach(t => {
      csvContent += `"${t.id}",${t.amount},"${t.currency}","${t.status}","${(t.description || '').replace(/"/g, '""')}","${t.customer_email || ''}","${t.customer_name || ''}","${t.created_at}"\n`;
    });

    const fileKey = `exports/merchant_${req.merchant.id}_${Date.now()}.csv`;
    const fileUrl = await storage.uploadFile(fileKey, Buffer.from(csvContent, 'utf-8'), 'text/csv');

    res.json({
      message: 'Export generated successfully',
      fileUrl,
      csvContent: transactions.length < 50 ? csvContent : undefined,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
