const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Deliver a single webhook event to the merchant's endpoint
 */
async function deliverWebhook(pool, event) {
  const { id: eventId, merchant_id, webhook_url, payload, event_type, attempts, max_attempts } = event;

  if (!webhook_url) {
    // Merchant has no webhook URL set, mark as skipped/delivered
    await pool.query(
      `UPDATE webhook_events
       SET status = 'failed', last_error = 'No webhook URL configured for merchant'
       WHERE id = $1`,
      [eventId]
    );
    return;
  }

  const attemptNumber = attempts + 1;
  const startTime = Date.now();

  try {
    const urlObj = new URL(webhook_url);
    const postData = JSON.stringify({
      id: eventId,
      type: event_type,
      created_at: new Date().toISOString(),
      data: payload,
    });

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'PayCraft-Webhook/1.0',
        'X-PayCraft-Event': event_type,
      },
      timeout: 10000, // 10 second timeout
    };

    const client = urlObj.protocol === 'https:' ? https : http;

    const response = await new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Webhook request timed out'));
      });

      req.write(postData);
      req.end();
    });

    const duration = Date.now() - startTime;
    const isSuccess = response.statusCode >= 200 && response.statusCode < 300;

    // Log attempt
    await pool.query(
      `INSERT INTO webhook_logs (webhook_event_id, attempt_number, response_status, response_body, duration_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventId, attemptNumber, response.statusCode, response.body.slice(0, 1000), duration]
    );

    if (isSuccess) {
      await pool.query(
        `UPDATE webhook_events
         SET status = 'delivered', attempts = $1, delivered_at = NOW(), last_error = NULL
         WHERE id = $2`,
        [attemptNumber, eventId]
      );
      console.log(`[Worker] Webhook ${eventId} delivered successfully (Status ${response.statusCode})`);
    } else {
      throw new Error(`Merchant endpoint returned HTTP ${response.statusCode}`);
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    console.warn(`[Worker] Webhook ${eventId} attempt ${attemptNumber} failed: ${err.message}`);

    // Log failure attempt
    await pool.query(
      `INSERT INTO webhook_logs (webhook_event_id, attempt_number, error_message, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [eventId, attemptNumber, err.message, duration]
    );

    // Calculate exponential backoff retry interval
    // Retry delays: 30s, 2m, 10m, 30m
    const retryDelaysSeconds = [30, 120, 600, 1800];
    const isFinalAttempt = attemptNumber >= max_attempts;

    if (isFinalAttempt) {
      await pool.query(
        `UPDATE webhook_events
         SET status = 'failed', attempts = $1, last_error = $2
         WHERE id = $3`,
        [attemptNumber, err.message, eventId]
      );
    } else {
      const nextDelay = retryDelaysSeconds[attemptNumber - 1] || 1800;
      await pool.query(
        `UPDATE webhook_events
         SET status = 'pending', attempts = $1, last_error = $2, next_retry_at = NOW() + INTERVAL '1 second' * $3
         WHERE id = $4`,
        [attemptNumber, err.message, nextDelay, eventId]
      );
    }
  }
}

module.exports = { deliverWebhook };
