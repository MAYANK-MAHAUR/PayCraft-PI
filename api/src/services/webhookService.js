const db = require('../config/database');

class WebhookService {
  static async createWebhookEvent(merchantId, transactionId, eventType, payload) {
    const result = await db.query(
      `INSERT INTO webhook_events (merchant_id, transaction_id, event_type, payload, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, event_type, status, created_at`,
      [merchantId, transactionId, eventType, payload]
    );

    return result.rows[0];
  }

  static async listEvents(merchantId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT e.id, e.event_type, e.status, e.attempts, e.max_attempts, e.last_error, e.delivered_at, e.created_at,
              t.amount, t.currency, t.customer_email
       FROM webhook_events e
       LEFT JOIN transactions t ON e.transaction_id = t.id
       WHERE e.merchant_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2 OFFSET $3`,
      [merchantId, limit, offset]
    );

    return result.rows;
  }

  static async retryWebhook(merchantId, eventId) {
    const result = await db.query(
      `UPDATE webhook_events
       SET status = 'pending', next_retry_at = NOW(), attempts = 0
       WHERE id = $1 AND merchant_id = $2
       RETURNING id`,
      [eventId, merchantId]
    );

    return result.rows.length > 0;
  }
}

module.exports = WebhookService;
