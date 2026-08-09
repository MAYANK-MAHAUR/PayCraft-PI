import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Copy, Check, Key, Zap, CreditCard, ShoppingBag, Bell, 
  Download, ShieldCheck, Server, RefreshCw, ExternalLink, Code2 
} from 'lucide-react';

export default function Docs() {
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const API_BASE = 'https://api-2ba1-3000.prg1.zerops.app/api';
  const FRONTEND_BASE = 'https://frontend-2ba1.prg1.zerops.app';

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const navItems = [
    { id: 'overview', label: 'Overview & Base URL', icon: Server },
    { id: 'auth', label: 'Authentication & Profile', icon: ShieldCheck },
    { id: 'pi', label: 'PI Transfers & QR Payments', icon: Zap },
    { id: 'payments', label: 'Payments API', icon: CreditCard },
    { id: 'checkout', label: 'Hosted Checkout Sessions', icon: ShoppingBag },
    { id: 'keys', label: 'API Keys Management', icon: Key },
    { id: 'webhooks', label: 'Webhooks & SSE Stream', icon: Bell },
    { id: 'exports', label: 'Analytics & CSV Export', icon: Download },
  ];

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 0' }}>
      {/* Top Banner Header */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-succeeded" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                ● Production v1.0 Live
              </span>
              <span style={{ fontSize: '0.82rem', color: '#4ADE80', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {API_BASE}
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              PayCraft API Reference & Developer Hub
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '720px', lineHeight: 1.55 }}>
              Integrate instant PI paper money payments, camera QR code scanning, hosted checkout sessions, webhooks, and real-time Server-Sent Events into your app.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => copyCode(API_BASE, 'base_url')}
              className="btn btn-secondary btn-sm"
              style={{ whiteSpace: 'nowrap' }}
            >
              {copiedId === 'base_url' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'base_url' ? 'Base URL Copied' : 'Copy Base URL'}
            </button>
            <Link to="/dashboard" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '28px', borderBottom: '1px solid var(--border-subtle)' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="btn btn-sm"
              style={{
                background: isActive ? 'var(--primary)' : 'var(--surface-1)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                border: '1px solid ' + (isActive ? 'var(--primary)' : 'var(--border-subtle)'),
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: isActive ? 700 : 500,
                borderRadius: '8px',
                padding: '8px 14px'
              }}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Content Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* 1. OVERVIEW & BASE URL */}
        {activeTab === 'overview' && (
          <>
            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
                Production Infrastructure & Endpoints
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '20px' }}>
                All API requests are served over HTTPS. Responses use standard HTTP status codes and JSON payloads.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>API Server Base URL</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: '#4ADE80', fontWeight: 600, fontSize: '0.88rem' }}>{API_BASE}</div>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Hosted Checkout Domain</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: '#60A5FA', fontWeight: 600, fontSize: '0.88rem' }}>{FRONTEND_BASE}/checkout/:id</div>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Real-Time Stream</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: '#FACC15', fontWeight: 600, fontSize: '0.88rem' }}>{API_BASE}/events/stream</div>
                </div>
              </div>

              <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                ⚡ <strong>Idempotency Header:</strong> Pass an <code style={{ color: '#4ADE80' }}>Idempotency-Key: &lt;uuid&gt;</code> header on payment creation calls. Idempotency responses are cached in <strong>Valkey</strong> for 24 hours to prevent duplicate transactions during network retries.
              </div>
            </div>
          </>
        )}

        {/* 2. AUTHENTICATION & PROFILE */}
        {activeTab === 'auth' && (
          <>
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Authentication Methods</h2>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Authenticate requests using API Keys or JWT Bearer tokens.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge badge-test">pk_test_... Sandbox</span>
                  <span className="badge badge-live">pk_live_... Production</span>
                </div>
              </div>

              <div className="code-block" style={{ marginBottom: '20px' }}>
                {`# Option A: API Key Header\nX-API-Key: pk_live_a1b2c3d4e5f6g7h8...\n\n# Option B: JWT Bearer Token Header\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
              </div>
            </div>

            {/* Auth Endpoints */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>
                Authentication Endpoints
              </h3>

              {/* POST /auth/register */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-live" style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>POST</span>
                    <code style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>/auth/register</code>
                  </div>
                  <button
                    onClick={() => copyCode(`curl -X POST ${API_BASE}/auth/register \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "email": "dev@example.com",\n    "password": "Password123!",\n    "businessName": "Acme Store",\n    "fullName": "Alex Mercer",\n    "piHandle": "alexmercer@paycraft"\n  }'`, 'reg')}
                    className="btn btn-secondary btn-sm"
                  >
                    {copiedId === 'reg' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'reg' ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Create a merchant account with $5,000 USD starter balance & PI handle.</p>
                <pre className="code-block" style={{ marginBottom: '10px' }}>{`curl -X POST ${API_BASE}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "dev@example.com",
    "password": "Password123!",
    "businessName": "Acme Store",
    "fullName": "Alex Mercer",
    "piHandle": "alexmercer@paycraft"
  }'`}</pre>
              </div>

              {/* POST /auth/login */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-live" style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>POST</span>
                    <code style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>/auth/login</code>
                  </div>
                  <button
                    onClick={() => copyCode(`curl -X POST ${API_BASE}/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "email": "dev@example.com",\n    "password": "Password123!"\n  }'`, 'login')}
                    className="btn btn-secondary btn-sm"
                  >
                    {copiedId === 'login' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'login' ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
                <pre className="code-block">{`curl -X POST ${API_BASE}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "dev@example.com",
    "password": "Password123!"
  }'`}</pre>
              </div>

              {/* GET /auth/me */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-live" style={{ background: '#22C55E1A', color: '#4ADE80', border: '1px solid #22C55E33' }}>GET</span>
                    <code style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>/auth/me</code>
                  </div>
                  <button
                    onClick={() => copyCode(`curl -X GET ${API_BASE}/auth/me \\\n  -H "Authorization: Bearer <TOKEN>"`, 'me')}
                    className="btn btn-secondary btn-sm"
                  >
                    {copiedId === 'me' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'me' ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
                <pre className="code-block">{`curl -X GET ${API_BASE}/auth/me \\
  -H "Authorization: Bearer <TOKEN>"`}</pre>
              </div>
            </div>
          </>
        )}

        {/* 3. PI TRANSFERS & QR PAYMENTS */}
        {activeTab === 'pi' && (
          <>
            {/* POST /pi/transfer */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-live" style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>POST</span>
                  /pi/transfer — Instant P2P Payment
                </h2>
                <button
                  onClick={() => copyCode(`curl -X POST ${API_BASE}/pi/transfer \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Idempotency-Key: tx_${Date.now()}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "receiverHandle": "meghamahaur2@paycraft",\n    "amount": 1000,\n    "description": "Coffee Top-Up"\n  }'`, 'pi_tr')}
                  className="btn btn-secondary btn-sm"
                >
                  {copiedId === 'pi_tr' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'pi_tr' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
                Execute instant paper money transfer between PI handles (e.g. <code style={{ color: '#4ADE80' }}>meghamahaur2@paycraft</code>).
              </p>
              <pre className="code-block" style={{ marginBottom: '16px' }}>{`curl -X POST ${API_BASE}/pi/transfer \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Idempotency-Key: pi_tx_${Date.now()}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "receiverHandle": "meghamahaur2@paycraft",
    "amount": 1000,
    "description": "Instant PI Payment"
  }'`}</pre>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Response 201 Created:</h4>
              <pre className="code-block" style={{ color: '#4ADE80' }}>{`{
  "success": true,
  "transaction": {
    "id": "68708fd3-14f8-42ae-a4bb-c6dc4b303a0d",
    "pi_ref_id": "PI/260809/790590",
    "amount": 1000,
    "currency": "USD",
    "status": "succeeded",
    "description": "Instant PI Payment",
    "counterpartyName": "Megha Mahaur",
    "counterpartyHandle": "meghamahaur2@paycraft"
  }
}`}</pre>
            </div>

            {/* POST /pi/qr/generate */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-live" style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>POST</span>
                  /pi/qr/generate — Generate Scannable QR Code
                </h2>
                <button
                  onClick={() => copyCode(`curl -X POST ${API_BASE}/pi/qr/generate \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "amount": 2500,\n    "description": "Store Purchase"\n  }'`, 'qr_gen')}
                  className="btn btn-secondary btn-sm"
                >
                  {copiedId === 'qr_gen' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'qr_gen' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
                Generates a camera-scannable QR payload and Base64 QR Image Data URL for instant terminal checkouts.
              </p>
              <pre className="code-block" style={{ marginBottom: '16px' }}>{`curl -X POST ${API_BASE}/pi/qr/generate \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 2500,
    "description": "Store Purchase"
  }'`}</pre>
            </div>

            {/* POST /pi/qr/process */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-live" style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>POST</span>
                  /pi/qr/process — Process Scanned Camera QR
                </h2>
                <button
                  onClick={() => copyCode(`curl -X POST ${API_BASE}/pi/qr/process \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "qrPayload": "paycraft://pi?handle=store@paycraft&amount=2500"\n  }'`, 'qr_proc')}
                  className="btn btn-secondary btn-sm"
                >
                  {copiedId === 'qr_proc' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'qr_proc' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <pre className="code-block">{`curl -X POST ${API_BASE}/pi/qr/process \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "qrPayload": "paycraft://pi?handle=store@paycraft&amount=2500"
  }'`}</pre>
            </div>
          </>
        )}

        {/* 4. PAYMENTS API */}
        {activeTab === 'payments' && (
          <>
            {/* POST /payments */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-live" style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>POST</span>
                  /payments — Create Charge Transaction
                </h2>
                <button
                  onClick={() => copyCode(`curl -X POST ${API_BASE}/payments \\\n  -H "X-API-Key: pk_live_..." \\\n  -H "Idempotency-Key: ord_${Date.now()}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "amount": 5000,\n    "currency": "USD",\n    "description": "Order #1042",\n    "customer_email": "alex@example.com"\n  }'`, 'pay_c')}
                  className="btn btn-secondary btn-sm"
                >
                  {copiedId === 'pay_c' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'pay_c' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <pre className="code-block">{`curl -X POST ${API_BASE}/payments \\
  -H "X-API-Key: pk_live_a1b2c3d4e5f6..." \\
  -H "Idempotency-Key: ord_1042_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "currency": "USD",
    "description": "Order #1042",
    "customer_email": "alex@example.com"
  }'`}</pre>
            </div>

            {/* GET /payments */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-live" style={{ background: '#22C55E1A', color: '#4ADE80', border: '1px solid #22C55E33' }}>GET</span>
                  /payments — List Merchant Transactions
                </h2>
              </div>
              <pre className="code-block">{`curl -X GET "${API_BASE}/payments?page=1&limit=20&status=succeeded" \\
  -H "X-API-Key: pk_live_..."`}</pre>
            </div>
          </>
        )}

        {/* 5. HOSTED CHECKOUT */}
        {activeTab === 'checkout' && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-live" style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>POST</span>
                /checkout/sessions — Create Hosted Checkout
              </h2>
              <button
                onClick={() => copyCode(`curl -X POST ${API_BASE}/checkout/sessions \\\n  -H "X-API-Key: pk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "amount": 4999,\n    "currency": "USD",\n    "description": "Pro Tier Subscription",\n    "successUrl": "${FRONTEND_BASE}/dashboard",\n    "cancelUrl": "${FRONTEND_BASE}/dashboard"\n  }'`, 'chk')}
                className="btn btn-secondary btn-sm"
              >
                {copiedId === 'chk' ? <Check size={14} /> : <Copy size={14} />} {copiedId === 'chk' ? 'Copied' : 'Copy cURL'}
              </button>
            </div>
            <pre className="code-block" style={{ marginBottom: '16px' }}>{`curl -X POST ${API_BASE}/checkout/sessions \\
  -H "X-API-Key: pk_live_a1b2c3d4e5f6..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 4999,
    "currency": "USD",
    "description": "Pro Tier Subscription",
    "successUrl": "https://your-store.com/success",
    "cancelUrl": "https://your-store.com/cancel"
  }'`}</pre>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Hosted Payment Link Returned:</h4>
            <pre className="code-block" style={{ color: '#60A5FA' }}>{`{
  "id": "chk_8f12a39d4e56",
  "checkoutUrl": "${FRONTEND_BASE}/checkout/chk_8f12a39d4e56",
  "amount": 4999,
  "status": "pending"
}`}</pre>
          </div>
        )}

        {/* 6. API KEYS MANAGEMENT */}
        {activeTab === 'keys' && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              API Keys Management
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>1. List Active API Keys (GET /keys)</div>
                <pre className="code-block">{`curl -X GET ${API_BASE}/keys \\
  -H "Authorization: Bearer <TOKEN>"`}</pre>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>2. Generate New Key (POST /keys)</div>
                <pre className="code-block">{`curl -X POST ${API_BASE}/keys \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"mode": "live", "name": "Mobile App API Key"}'`}</pre>
              </div>
            </div>
          </div>
        )}

        {/* 7. WEBHOOKS & REAL-TIME SSE */}
        {activeTab === 'webhooks' && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              Real-Time Server-Sent Events (SSE) Stream
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '16px' }}>
              Connect via HTTP EventSource stream to receive real-time notifications for incoming payments and wallet balance updates.
            </p>
            <pre className="code-block" style={{ color: '#60A5FA', marginBottom: '20px' }}>{`// Browser / Node.js SSE Listener Example
const streamUrl = "${API_BASE}/events/stream?token=" + userToken;
const eventSource = new EventSource(streamUrl);

eventSource.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log("Real-Time Event:", payload.type, payload.data);
};`}</pre>
          </div>
        )}

        {/* 8. EXPORTS & ANALYTICS */}
        {activeTab === 'exports' && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              Analytics & CSV Exports
            </h2>
            <pre className="code-block" style={{ marginBottom: '16px' }}>{`# Download Transactions CSV
curl -X GET "${API_BASE}/exports/transactions.csv" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -o paycraft_transactions.csv`}</pre>
          </div>
        )}

      </div>
    </div>
  );
}
