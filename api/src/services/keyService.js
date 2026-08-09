const db = require('../config/database');
const { generateApiKey, maskApiKey } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');

class KeyService {
  static async createKey(merchantId, mode = 'test', name = 'Secret Key') {
    const { rawKey, prefix, keyHash } = generateApiKey(mode);

    const result = await db.query(
      `INSERT INTO api_keys (merchant_id, key_prefix, key_hash, mode, name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, key_prefix, mode, name, is_active, created_at`,
      [merchantId, prefix, keyHash, mode, name]
    );

    const created = result.rows[0];
    return {
      ...created,
      apiKey: rawKey, // Raw key returned ONCE upon creation
      maskedKey: maskApiKey(prefix, keyHash),
    };
  }

  static async listKeys(merchantId) {
    const result = await db.query(
      `SELECT id, key_prefix, key_hash, mode, name, is_active, last_used_at, created_at
       FROM api_keys
       WHERE merchant_id = $1
       ORDER BY created_at DESC`,
      [merchantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      mode: row.mode,
      prefix: row.key_prefix,
      maskedKey: maskApiKey(row.key_prefix, row.key_hash),
      isActive: row.is_active,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
    }));
  }

  static async revokeKey(merchantId, keyId) {
    const result = await db.query(
      `UPDATE api_keys
       SET is_active = false
       WHERE id = $1 AND merchant_id = $2
       RETURNING id`,
      [keyId, merchantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('API Key not found or unauthorized');
    }

    return { success: true };
  }
}

module.exports = KeyService;
