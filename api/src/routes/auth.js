const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken, authenticateMerchant } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const KeyService = require('../services/keyService');
const { generatePiHandle } = require('../utils/helpers');
const { BadRequestError, UnauthorizedError, ConflictError } = require('../utils/errors');

const router = express.Router();
const authLimiter = rateLimiter({ windowSeconds: 60, maxRequests: 20 });

// Ensure merchant has a valid PI handle and starting balance
async function ensureMerchantPiHandle(merchant) {
  if (!merchant.pi_handle) {
    let candidatePiHandle = generatePiHandle(merchant.email, merchant.business_name);
    const existingPiHandle = await db.query('SELECT id FROM merchants WHERE pi_handle = $1', [candidatePiHandle]);
    if (existingPiHandle.rows.length > 0) {
      candidatePiHandle = `${candidatePiHandle.split('@')[0]}.${Math.floor(100 + Math.random() * 900)}@paycraft`;
    }
    const updated = await db.query(
      `UPDATE merchants SET pi_handle = $1, wallet_balance = COALESCE(wallet_balance, 100000) WHERE id = $2 RETURNING pi_handle, wallet_balance`,
      [candidatePiHandle, merchant.id]
    );
    merchant.pi_handle = updated.rows[0].pi_handle;
    merchant.wallet_balance = updated.rows[0].wallet_balance;
  }
  return merchant;
}

// Verify Google id_token with Google tokeninfo endpoint
async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new BadRequestError('Google Sign-In is not configured');
  }
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) {
    throw new BadRequestError('Google token verification failed');
  }
  const payload = await res.json();

  const audOk = payload.aud === clientId || (Array.isArray(payload.aud) && payload.aud.includes(clientId));
  if (!audOk) {
    throw new BadRequestError('Google token audience mismatch');
  }

  const issuerOk = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com';
  if (!issuerOk) {
    throw new BadRequestError('Invalid Google token issuer');
  }

  if (!payload.exp || Date.now() / 1000 > payload.exp) {
    throw new BadRequestError('Google token expired');
  }

  if (!payload.email) {
    throw new BadRequestError('Email address could not be retrieved from Google account');
  }

  return payload;
}

// Google OAuth login / signup
router.post('/google', authLimiter, async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      throw new BadRequestError('Google credential (id_token) is required');
    }

    const payload = await verifyGoogleCredential(credential);
    const email = String(payload.email).toLowerCase().trim();
    const name = String(payload.name || payload.given_name || email.split('@')[0]).trim();
    const picture = payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
    const googleId = payload.sub;

    if (!email) {
      throw new BadRequestError('Email address could not be retrieved from Google account');
    }

    let merchantResult = await db.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance, avatar_url, google_id, created_at FROM merchants WHERE email = $1 OR google_id = $2',
      [email, googleId]
    );

    let merchant;
    if (merchantResult.rows.length === 0) {
      let candidatePiHandle = generatePiHandle(email, name);
      const piHandleCheck = await db.query('SELECT id FROM merchants WHERE pi_handle = $1', [candidatePiHandle]);
      if (piHandleCheck.rows.length > 0) {
        candidatePiHandle = `${candidatePiHandle.split('@')[0]}.${Math.floor(100 + Math.random() * 900)}@paycraft`;
      }

      const insertResult = await db.query(
        `INSERT INTO merchants (email, business_name, full_name, pi_handle, wallet_balance, google_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, business_name, full_name, pi_handle, wallet_balance, google_id, avatar_url, created_at`,
        [email, `${name}'s PayCraft`, name, candidatePiHandle, 100000, googleId, picture]
      );
      merchant = insertResult.rows[0];

      await KeyService.createKey(merchant.id, 'test', 'Default Test Key');
      await KeyService.createKey(merchant.id, 'live', 'Default Live Key');
    } else {
      merchant = merchantResult.rows[0];
      const updated = await db.query(
        `UPDATE merchants SET google_id = COALESCE(google_id, $1), avatar_url = COALESCE(avatar_url, $2), full_name = COALESCE(full_name, $3) WHERE id = $4 RETURNING *`,
        [googleId, picture, name, merchant.id]
      );
      merchant = updated.rows[0];
    }

    await ensureMerchantPiHandle(merchant);
    const token = generateToken(merchant.id);

    res.json({
      message: 'Google Sign-In successful',
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.business_name,
        fullName: merchant.full_name || name,
        piHandle: merchant.pi_handle,
        walletBalance: parseInt(merchant.wallet_balance || 100000, 10),
        avatarUrl: merchant.avatar_url || picture,
        createdAt: merchant.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Guest demo login
router.post('/guest', authLimiter, async (req, res, next) => {
  try {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const guestEmail = `guest_${Date.now()}_${randomId}@paycraft.app`;
    const guestName = `Guest #${randomId}`;
    const candidatePiHandle = `guest${randomId}@paycraft`;
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(guestEmail)}`;

    const result = await db.query(
      `INSERT INTO merchants (email, business_name, full_name, pi_handle, wallet_balance, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, business_name, full_name, pi_handle, wallet_balance, avatar_url, created_at`,
      [guestEmail, guestName, guestName, candidatePiHandle, 100000, defaultAvatar]
    );

    const merchant = result.rows[0];

    const testKey = await KeyService.createKey(merchant.id, 'test', 'Default Test Key');
    const liveKey = await KeyService.createKey(merchant.id, 'live', 'Default Live Key');

    const token = generateToken(merchant.id);

    res.status(201).json({
      message: 'Guest session created successfully',
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.business_name,
        fullName: merchant.full_name,
        piHandle: merchant.pi_handle,
        walletBalance: parseInt(merchant.wallet_balance || 100000, 10),
        avatarUrl: merchant.avatar_url,
        createdAt: merchant.created_at,
        isGuest: true,
      },
      keys: {
        testApiKey: testKey.apiKey,
        liveApiKey: liveKey.apiKey,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Email/password registration
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, businessName, fullName, webhookUrl } = req.body;

    if (!email || !password || !businessName) {
      throw new BadRequestError('Email, password, and business name are required');
    }

    const sanitizedEmail = String(email).toLowerCase().trim();
    const sanitizedBusinessName = String(businessName).trim();
    const sanitizedFullName = fullName ? String(fullName).trim() : sanitizedBusinessName;
    const sanitizedWebhookUrl = webhookUrl ? String(webhookUrl).trim() : null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new BadRequestError('Please provide a valid email address');
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }

    const existing = await db.query('SELECT id FROM merchants WHERE email = $1', [sanitizedEmail]);
    if (existing.rows.length > 0) {
      throw new ConflictError('Account with this email already exists');
    }

    let candidatePiHandle = generatePiHandle(sanitizedEmail, sanitizedFullName);
    const piHandleCheck = await db.query('SELECT id FROM merchants WHERE pi_handle = $1', [candidatePiHandle]);
    if (piHandleCheck.rows.length > 0) {
      candidatePiHandle = `${candidatePiHandle.split('@')[0]}.${Math.floor(100 + Math.random() * 900)}@paycraft`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sanitizedEmail)}`;

    const result = await db.query(
      `INSERT INTO merchants (email, password_hash, business_name, full_name, pi_handle, wallet_balance, avatar_url, webhook_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, business_name, full_name, pi_handle, wallet_balance, avatar_url, webhook_url, created_at`,
      [sanitizedEmail, passwordHash, sanitizedBusinessName, sanitizedFullName, candidatePiHandle, 100000, defaultAvatar, sanitizedWebhookUrl]
    );

    const merchant = result.rows[0];

    const testKey = await KeyService.createKey(merchant.id, 'test', 'Default Test Key');
    const liveKey = await KeyService.createKey(merchant.id, 'live', 'Default Live Key');

    const token = generateToken(merchant.id);

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.business_name,
        fullName: merchant.full_name,
        piHandle: merchant.pi_handle,
        walletBalance: parseInt(merchant.wallet_balance || 100000, 10),
        avatarUrl: merchant.avatar_url,
        webhookUrl: merchant.webhook_url,
        createdAt: merchant.created_at,
      },
      keys: {
        testApiKey: testKey.apiKey,
        liveApiKey: liveKey.apiKey,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Email/password login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const sanitizedEmail = String(email).toLowerCase().trim();

    const result = await db.query(
      'SELECT id, email, password_hash, business_name, full_name, pi_handle, wallet_balance, avatar_url, webhook_url, created_at FROM merchants WHERE email = $1',
      [sanitizedEmail]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    let merchant = result.rows[0];
    if (merchant.password_hash) {
      const isPasswordValid = await bcrypt.compare(password, merchant.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }
    }

    await ensureMerchantPiHandle(merchant);
    const token = generateToken(merchant.id);

    res.json({
      message: 'Login successful',
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.business_name,
        fullName: merchant.full_name || merchant.business_name,
        piHandle: merchant.pi_handle,
        walletBalance: parseInt(merchant.wallet_balance || 100000, 10),
        avatarUrl: merchant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(merchant.email)}`,
        webhookUrl: merchant.webhook_url,
        createdAt: merchant.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get current profile
router.get('/me', authenticateMerchant, async (req, res, next) => {
  try {
    let merchant = req.merchant;
    const fullResult = await db.query(
      'SELECT id, email, business_name, full_name, pi_handle, wallet_balance, avatar_url, webhook_url, created_at FROM merchants WHERE id = $1',
      [merchant.id]
    );
    merchant = fullResult.rows[0];
    await ensureMerchantPiHandle(merchant);

    res.json({
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.business_name,
        fullName: merchant.full_name || merchant.business_name,
        piHandle: merchant.pi_handle,
        walletBalance: parseInt(merchant.wallet_balance || 100000, 10),
        avatarUrl: merchant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(merchant.email)}`,
        webhookUrl: merchant.webhook_url,
        createdAt: merchant.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update settings
router.put('/settings', authenticateMerchant, async (req, res, next) => {
  try {
    const { businessName, fullName, webhookUrl, piHandle } = req.body;

    const sanitizedBusinessName = businessName ? String(businessName).trim() : null;
    const sanitizedFullName = fullName ? String(fullName).trim() : null;
    const sanitizedWebhookUrl = webhookUrl ? String(webhookUrl).trim() : null;
    let sanitizedPiHandle = piHandle ? String(piHandle).toLowerCase().trim() : null;

    if (sanitizedPiHandle) {
      if (!sanitizedPiHandle.includes('@')) {
        sanitizedPiHandle = `${sanitizedPiHandle}@paycraft`;
      }
      const checkPiHandle = await db.query('SELECT id FROM merchants WHERE pi_handle = $1 AND id != $2', [sanitizedPiHandle, req.merchant.id]);
      if (checkPiHandle.rows.length > 0) {
        throw new ConflictError('This PI Handle is already taken');
      }
    }

    const result = await db.query(
      `UPDATE merchants
       SET business_name = COALESCE($1, business_name),
           full_name = COALESCE($2, full_name),
           webhook_url = COALESCE($3, webhook_url),
           pi_handle = COALESCE($4, pi_handle),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, business_name, full_name, pi_handle, wallet_balance, avatar_url, webhook_url, created_at`,
      [sanitizedBusinessName, sanitizedFullName, sanitizedWebhookUrl, sanitizedPiHandle, req.merchant.id]
    );

    const updated = result.rows[0];

    res.json({
      message: 'Settings updated successfully',
      merchant: {
        id: updated.id,
        email: updated.email,
        businessName: updated.business_name,
        fullName: updated.full_name,
        piHandle: updated.pi_handle,
        walletBalance: parseInt(updated.wallet_balance || 100000, 10),
        avatarUrl: updated.avatar_url,
        webhookUrl: updated.webhook_url,
        createdAt: updated.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
