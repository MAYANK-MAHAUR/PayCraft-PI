const express = require('express');
const { authenticateMerchant } = require('../middleware/auth');
const WebhookService = require('../services/webhookService');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

router.use(authenticateMerchant);

// List Webhook Events
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const events = await WebhookService.listEvents(req.merchant.id, limit, offset);
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// Manual Retry Webhook Event
router.post('/:id/retry', async (req, res, next) => {
  try {
    const success = await WebhookService.retryWebhook(req.merchant.id, req.params.id);
    if (!success) {
      throw new NotFoundError('Webhook event not found or unauthorized');
    }
    res.json({ message: 'Webhook event queued for retry' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
