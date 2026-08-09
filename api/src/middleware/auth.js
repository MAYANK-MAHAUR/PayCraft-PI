const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'paycraft_super_secret_jwt_key_2026';

async function authenticateMerchant(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      'SELECT id, email, business_name, webhook_url, created_at FROM merchants WHERE id = $1',
      [decoded.merchantId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Merchant account no longer exists');
    }

    req.merchant = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(err);
  }
}

function generateToken(merchantId) {
  return jwt.sign({ merchantId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  authenticateMerchant,
  generateToken,
};
