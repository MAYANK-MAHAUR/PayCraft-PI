const db = require('../config/database');
const { hashApiKey } = require('../utils/helpers');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.startsWith('Bearer pk_') ? req.headers.authorization.substring(7) : null);

    if (!apiKey) {
      throw new UnauthorizedError('Missing X-API-Key header or Bearer API token');
    }

    if (!apiKey.startsWith('pk_test_') && !apiKey.startsWith('pk_live_')) {
      throw new UnauthorizedError('Invalid API key format');
    }

    const keyHash = hashApiKey(apiKey);

    const result = await db.query(
      `SELECT k.id, k.merchant_id, k.mode, k.is_active, m.email, m.business_name, m.webhook_url
       FROM api_keys k
       JOIN merchants m ON k.merchant_id = m.id
       WHERE k.key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid API Key');
    }

    const keyRecord = result.rows[0];

    if (!keyRecord.is_active) {
      throw new ForbiddenError('API Key has been revoked');
    }

    // Update last_used_at asynchronously
    db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyRecord.id]).catch(() => {});

    req.apiKey = keyRecord;
    req.merchant = {
      id: keyRecord.merchant_id,
      email: keyRecord.email,
      business_name: keyRecord.business_name,
      webhook_url: keyRecord.webhook_url,
    };
    req.mode = keyRecord.mode;

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticateApiKey,
};
