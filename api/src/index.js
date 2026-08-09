// Load environment variables from api/.env. dotenv does NOT override variables
// already present in process.env, so platform-injected env (e.g. Zerops) wins.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const db = require('./config/database');
const { ApiError } = require('./utils/errors');

const authRoutes = require('./routes/auth');
const piRoutes = require('./routes/pi');
const keysRoutes = require('./routes/keys');
const paymentsRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const transactionsRoutes = require('./routes/transactions');
const webhooksRoutes = require('./routes/webhooks');
const checkoutRoutes = require('./routes/checkout');
const exportsRoutes = require('./routes/exports');
const eventsRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Hardening Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API & SPA embedding flexibility
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration - Allows credential cookies and authorization headers
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key', 'Cookie'],
}));

app.use(express.json({ limit: '1mb' })); // Limit body payload size to prevent DoS
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'paycraft-api',
    version: '1.2.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/pi', piRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/events', eventsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Prevent leaking stack trace details in production error responses
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected internal server error occurred' : err.message,
    },
  });
});

// Auto initialize database schema & migrations on startup
async function initDatabaseSchema() {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const localSchemaPath = path.join(__dirname, 'schema.sql');
    let sql = '';
    
    if (fs.existsSync(localSchemaPath)) {
      sql = fs.readFileSync(localSchemaPath, 'utf8');
    } else if (fs.existsSync(schemaPath)) {
      sql = fs.readFileSync(schemaPath, 'utf8');
    } else {
      // Production container schema & migration SQL fallback
      sql = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS merchants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            business_name VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            pi_handle VARCHAR(255) UNIQUE,
            wallet_balance BIGINT NOT NULL DEFAULT 100000, -- cents (100000 = $1,000.00 starter paper money)
            google_id VARCHAR(255),
            avatar_url TEXT,
            phone_number VARCHAR(20),
            webhook_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
            key_prefix VARCHAR(10) NOT NULL,
            key_hash VARCHAR(255) NOT NULL,
            mode VARCHAR(10) NOT NULL DEFAULT 'test',
            name VARCHAR(100) DEFAULT 'Secret Key',
            is_active BOOLEAN DEFAULT true,
            last_used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
            sender_merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
            receiver_merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
            sender_pi_handle VARCHAR(255),
            receiver_pi_handle VARCHAR(255),
            pi_ref_id VARCHAR(100),
            idempotency_key VARCHAR(255),
            amount INTEGER NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            status VARCHAR(20) DEFAULT 'pending',
            description VARCHAR(500),
            customer_email VARCHAR(255),
            customer_name VARCHAR(255),
            metadata JSONB DEFAULT '{}',
            failure_reason VARCHAR(500),
            receipt_url VARCHAR(500),
            qr_payload TEXT,
            qr_code_url TEXT,
            payment_method VARCHAR(20) DEFAULT 'pi',
            mode VARCHAR(10) DEFAULT 'test',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS webhook_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
            transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
            event_type VARCHAR(50) NOT NULL,
            payload JSONB NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 5,
            next_retry_at TIMESTAMP DEFAULT NOW(),
            last_error VARCHAR(500),
            delivered_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS webhook_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            webhook_event_id UUID REFERENCES webhook_events(id) ON DELETE CASCADE,
            attempt_number INTEGER NOT NULL,
            response_status INTEGER,
            response_body TEXT,
            error_message VARCHAR(500),
            duration_ms INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);
        CREATE INDEX IF NOT EXISTS idx_merchants_pi_handle ON merchants(pi_handle);
        CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
        CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id, created_at DESC);

        ALTER TABLE merchants ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
        ALTER TABLE merchants ADD COLUMN IF NOT EXISTS wallet_balance BIGINT NOT NULL DEFAULT 100000;
        ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
        ALTER TABLE merchants ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE merchants ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_merchant_id UUID;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_merchant_id UUID;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS qr_payload TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'vpa')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'pi_handle') THEN
            ALTER TABLE merchants RENAME COLUMN vpa TO pi_handle;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'upi_ref_id')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'pi_ref_id') THEN
            ALTER TABLE transactions RENAME COLUMN upi_ref_id TO pi_ref_id;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'sender_vpa')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'sender_pi_handle') THEN
            ALTER TABLE transactions RENAME COLUMN sender_vpa TO sender_pi_handle;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'receiver_vpa')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'receiver_pi_handle') THEN
            ALTER TABLE transactions RENAME COLUMN receiver_vpa TO receiver_pi_handle;
          END IF;
          BEGIN
            ALTER TABLE transactions ALTER COLUMN payment_method SET DEFAULT 'pi';
          EXCEPTION WHEN others THEN END;
        END $$;
      `;
    }
    await db.query(sql);
    console.log('Database schema & PI migrations verified successfully.');
  } catch (err) {
    console.warn('Database schema initialization notice:', err.message);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`⚡ PayCraft API Server (Security Hardened v1.2.0) listening on 0.0.0.0:${PORT} (process.env.PORT: ${process.env.PORT})`);
  await initDatabaseSchema();
});
