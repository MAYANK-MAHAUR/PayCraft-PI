-- PayCraft PostgreSQL Database Schema (Enhanced Security, QR Processing & Full PI Support)
-- PI = Payment Interface (replaces legacy UPI naming)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Merchants / Users (Registered Users & Merchants with PI Handle & Wallet)
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    business_name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    pi_handle VARCHAR(255) UNIQUE,              -- Payment Interface Handle (e.g. "alex@paycraft")
    wallet_balance BIGINT NOT NULL DEFAULT 100000, -- Wallet balance in cents (e.g. 100000 = $1,000.00)
    google_id VARCHAR(255),                   -- Google OAuth Sub ID
    avatar_url TEXT,                          -- Profile picture / Google avatar
    phone_number VARCHAR(20),
    webhook_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- API Keys (Dual mode: test & live)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    key_prefix VARCHAR(10) NOT NULL,          -- "pk_test_" or "pk_live_"
    key_hash VARCHAR(255) NOT NULL,           -- SHA-256 hashed full key
    mode VARCHAR(10) NOT NULL DEFAULT 'test', -- 'test' or 'live'
    name VARCHAR(100) DEFAULT 'Secret Key',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions (Payment & PI P2P Records)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    sender_merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    receiver_merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    sender_pi_handle VARCHAR(255),
    receiver_pi_handle VARCHAR(255),
    pi_ref_id VARCHAR(100),
    idempotency_key VARCHAR(255),
    amount INTEGER NOT NULL,                   -- amount in cents (e.g. 1000 = $10.00)
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',      -- pending → processing → succeeded / failed
    description VARCHAR(500),
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    failure_reason VARCHAR(500),
    receipt_url VARCHAR(500),
    qr_payload TEXT,                            -- EMV/PI/PayCraft QR payload
    qr_code_url TEXT,                           -- Data URL / S3 link for QR code image
    payment_method VARCHAR(20) DEFAULT 'pi',    -- 'pi', 'card', 'qr_code', 'api'
    mode VARCHAR(10) DEFAULT 'test',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_merchant_idempotency UNIQUE (merchant_id, idempotency_key)
);

-- Webhook Events (Outbound Event Delivery Queue)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,           -- 'payment.succeeded', 'payment.failed', 'pi.transfer.succeeded'
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',      -- pending → delivered / failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP DEFAULT NOW(),
    last_error VARCHAR(500),
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook Delivery Logs
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

-- Indexes for optimal querying
CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);
CREATE INDEX IF NOT EXISTS idx_merchants_pi_handle ON merchants(pi_handle);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_pi_ref ON transactions(pi_ref_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_queue ON webhook_events(status, next_retry_at) WHERE status = 'pending';

-- Auto Migrations for existing database instances
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS wallet_balance BIGINT NOT NULL DEFAULT 100000;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_merchant_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_merchant_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS qr_payload TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Rename legacy UPI columns -> PI columns on databases created before the rename.
-- Safe to run repeatedly: each rename is a no-op if the new column already exists.
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

  -- Update the payment_method default for newly inserted rows.
  BEGIN
    ALTER TABLE transactions ALTER COLUMN payment_method SET DEFAULT 'pi';
  EXCEPTION WHEN others THEN END;
END $$;
