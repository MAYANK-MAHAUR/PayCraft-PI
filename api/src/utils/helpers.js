const crypto = require('crypto');

/**
 * Generate secure API Key
 * Returns { rawKey, prefix, keyHash }
 */
function generateApiKey(mode = 'test') {
  const prefix = mode === 'live' ? 'pk_live_' : 'pk_test_';
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `${prefix}${randomBytes}`;
  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,
    prefix,
    keyHash,
    mode,
  };
}

/**
 * Hash API Key using SHA-256
 */
function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Mask API Key for display (e.g. pk_test_...a1b2)
 */
function maskApiKey(prefix, keyHash) {
  const lastFour = keyHash.slice(-4);
  return `${prefix}${'•'.repeat(16)}${lastFour}`;
}

/**
 * Format currency amount (cents to string)
 * Default currency is USD — PayCraft is a USD-denominated payment protocol.
 */
function formatCurrency(amountCents, currency = 'USD') {
  const code = String(currency || 'USD').toUpperCase();
  const symbol = code === 'USD' ? '$' : code;
  const formatted = (amountCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/**
 * Generate Payment Interface Handle (PI Handle) from email or name
 * e.g. "alex.smith@paycraft"
 */
function generatePiHandle(email, name) {
  let handle = '';
  if (email && email.includes('@')) {
    handle = email.split('@')[0];
  } else if (name) {
    handle = name;
  } else {
    handle = 'user' + Math.floor(1000 + Math.random() * 9000);
  }
  
  // Sanitize handle
  handle = handle.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!handle) handle = 'user' + Math.floor(1000 + Math.random() * 9000);
  
  return `${handle}@paycraft`;
}

/**
 * Generate standard PI Reference Number
 * e.g. "PI/2026/9842103847"
 */
function generatePiRefId() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `PI/${dateStr}/${randomDigits}`;
}

/**
 * Generate a human-friendly PI Payment ID for checkout sessions.
 * e.g. "PI-4F9A-2B7C" — two groups of 4 uppercase alphanumerics.
 * Used by the developer-facing PI Payments infra (Razorpay-style) so a
 * customer can paste the id on the Pi site instead of scanning the QR.
 */
function generatePiPaymentId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  const group = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
  return `PI-${group()}-${group()}`;
}

module.exports = {
  generateApiKey,
  hashApiKey,
  maskApiKey,
  formatCurrency,
  generatePiHandle,
  generatePiRefId,
  generatePiPaymentId,
};

