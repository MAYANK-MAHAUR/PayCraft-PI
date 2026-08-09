const { Pool } = require('pg');
const { deliverWebhook } = require('./jobs/deliverWebhook');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paycraft';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

let isRunning = true;

async function pollAndProcessWebhooks() {
  while (isRunning) {
    try {
      // Find pending webhook events ready for delivery
      const result = await pool.query(
        `SELECT e.*, m.webhook_url
         FROM webhook_events e
         JOIN merchants m ON e.merchant_id = m.id
         WHERE e.status = 'pending' AND e.next_retry_at <= NOW()
         ORDER BY e.created_at ASC
         LIMIT 10`
      );

      if (result.rows.length > 0) {
        console.log(`[Worker] Found ${result.rows.length} pending webhook events to deliver...`);
        for (const event of result.rows) {
          await deliverWebhook(pool, event);
        }
      }
    } catch (err) {
      console.error('[Worker] Error in polling loop:', err.message);
    }

    // Poll interval: 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

console.log('⚙️ PayCraft Background Worker active and polling...');
pollAndProcessWebhooks().catch(console.error);

process.on('SIGTERM', () => {
  console.log('[Worker] Stopping worker gracefully...');
  isRunning = false;
});
