import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import QRCode from '../components/QRCode';
import { useAuth } from '../hooks/useAuth';
import {
  Code2,
  Smartphone,
  QrCode,
  Copy,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Play,
  Zap,
} from 'lucide-react';

const formatUSD = (cents) =>
  '$' + (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SAMPLE_PRODUCTS = [
  { id: 'coffee', name: 'Artisan Coffee', amount: 450 },
  { id: 'tshirt', name: 'PayCraft T-Shirt', amount: 2500 },
  { id: 'course', name: 'Pro Dev Course', amount: 9900 },
];

function fmtCountdown(ms) {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function CodeBlock({ children }) {
  return (
    <pre
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '14px 16px',
        fontSize: '0.78rem',
        lineHeight: 1.5,
        color: '#E5F9EC',
        overflowX: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        margin: '10px 0 0',
      }}
    >
      {children}
    </pre>
  );
}

export default function PIPayments() {
  const { merchant } = useAuth();

  // ---- Live demo state ----
  const [selectedAmount, setSelectedAmount] = useState(SAMPLE_PRODUCTS[1].amount);
  const [session, setSession] = useState(null); // { sessionId, piPaymentId, expiresAt, amount, description }
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  const pollRef = useRef(null);
  const countdownRef = useRef(null);
  const sessionRef = useRef(null);
  sessionRef.current = session;

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const startTimers = useCallback(
    (sess) => {
      stopTimers();
      countdownRef.current = setInterval(() => setNow(Date.now()), 1000);
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/checkout/${sess.sessionId}`);
          if (res.data?.session?.status === 'completed') {
            setPaid(true);
            stopTimers();
          }
        } catch (err) {
          // A 400 ("Checkout session expired") or cache miss means it's gone.
          if (err.response?.status === 400) {
            setExpired(true);
            stopTimers();
          }
        }
      }, 2000);
    },
    [stopTimers]
  );

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await api.post('/checkout/session', {
        merchantId: merchant?.id,
        amount: selectedAmount,
        currency: 'USD',
        description: 'PI Payments demo order',
      });
      const s = {
        sessionId: res.data.sessionId,
        piPaymentId: res.data.piPaymentId,
        expiresAt: res.data.expiresAt,
        amount: selectedAmount,
        description: 'PI Payments demo order',
      };
      setSession(s);
      setPaid(false);
      setExpired(false);
      setNow(Date.now());
      startTimers(s);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create a PI Payment request.');
    } finally {
      setCreating(false);
    }
  };

  const handlePayDemo = async () => {
    if (!session) return;
    setError('');
    setPaying(true);
    try {
      await api.post(`/checkout/${session.sessionId}/pay-demo`);
      setPaid(true);
      stopTimers();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Demo payment failed.');
    } finally {
      setPaying(false);
    }
  };

  const handleCopy = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.piPaymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  };

  const handleReset = () => {
    stopTimers();
    setSession(null);
    setPaid(false);
    setExpired(false);
    setError('');
    setCopied(false);
  };

  const payUrl = session ? `${window.location.origin}/pay?cs=${session.sessionId}` : '';
  const remaining = session ? session.expiresAt - now : 0;
  const isExpired = expired || (session && remaining <= 0);

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '28px 18px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#22C55E',
              color: '#0B0B0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Code2 size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
              PI Payments
            </h1>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Developer infrastructure &amp; live demo
            </span>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 720 }}>
          Accept payments on your own website the same way you pay with PayCraft. Create a checkout
          session, show your customer a QR or a <strong>PI Payment ID</strong>, and get notified the
          moment they pay — all powered by the real PI wallet (no mocks, real paper-money moves).
        </p>
      </div>

      {/* ============ TUTORIAL ============ */}
      <div className="glass-card" style={{ padding: '26px 28px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Zap size={18} style={{ color: '#22C55E' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            How to integrate (start &rarr; end)
          </h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 0, marginBottom: 18 }}>
          Four steps from zero to your first real PI payment.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}>
          {/* Step 1 */}
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, color: '#22C55E', fontSize: '0.9rem' }}>1.</span>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)' }}>Get your API keys</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '6px 0 0 22px' }}>
              Grab a test key from the{' '}
              <Link to="/dashboard/keys" style={{ color: '#22C55E', fontWeight: 600 }}>
                API Keys
              </Link>{' '}
              page. Send it as a Bearer token on every request.
            </p>
          </div>

          {/* Step 2 */}
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, color: '#22C55E', fontSize: '0.9rem' }}>2.</span>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                Create a payment session
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '6px 0 0 22px' }}>
              Amounts are integer cents. The response gives you a <code>sessionId</code> and a
              human-friendly <code>piPaymentId</code> (valid for 10 minutes).
            </p>
            <div style={{ marginLeft: 22 }}>
              <CodeBlock>{`curl -X POST https://your-app.paycraft.app/api/checkout/session \\
  -H "Authorization: Bearer $PAYCRAFT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 2500, "currency": "USD", "description": "Order #1042" }'`}</CodeBlock>
              <CodeBlock>{`const res = await fetch('/api/checkout/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${PAYCRAFT_API_KEY}\`,
  },
  body: JSON.stringify({ amount: 2500, currency: 'USD', description: 'Order #1042' }),
});
const { sessionId, piPaymentId, expiresAt } = await res.json();`}</CodeBlock>
            </div>
          </div>

          {/* Step 3 */}
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, color: '#22C55E', fontSize: '0.9rem' }}>3.</span>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                Show the PI Payment UI
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '6px 0 0 22px' }}>
              Render a QR of <code>{`${'<origin>'}/pay?cs=<sessionId>`}</code> and display the{' '}
              <code>piPaymentId</code>. Your customer scans the QR or types the ID on the Pi site.
            </p>
            <div style={{ marginLeft: 22 }}>
              <CodeBlock>{`const payUrl = \`\${window.location.origin}/pay?cs=\${sessionId}\`;
// <QRCode value={payUrl} />  +  show piPaymentId text`}</CodeBlock>
            </div>
          </div>

          {/* Step 4 */}
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, color: '#22C55E', fontSize: '0.9rem' }}>4.</span>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                Get paid &amp; notified
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '6px 0 0 22px' }}>
              Listen on the real-time stream (or your webhook) for <code>payment.received</code>. The
              moment the customer pays, you get the amount, sender, and a PI reference number.
            </p>
            <div style={{ marginLeft: 22 }}>
              <CodeBlock>{`const es = new EventSource('/api/events/stream', {
  // Bearer token is added by the PayCraft SDK / client
});
es.addEventListener('payment.received', (e) => {
  const data = JSON.parse(e.data);
  console.log('Paid!', data.formattedAmount, 'from', data.fromHandle);
});`}</CodeBlock>
            </div>
          </div>
        </div>
      </div>

      {/* ============ LIVE DEMO ============ */}
      <div className="glass-card" style={{ padding: '26px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Play size={18} style={{ color: '#22C55E' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Try it now buy a product with PI
          </h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 0, marginBottom: 20 }}>
          Create a real PI Payment request, then pay it yourself (a seeded demo customer sends real
          paper-money to your merchant account) to see the full loop light up.
        </p>

        {!session ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              {SAMPLE_PRODUCTS.map((p) => {
                const active = selectedAmount === p.amount;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedAmount(p.amount)}
                    className={active ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '12px 16px', fontWeight: 700, borderRadius: 12 }}
                  >
                    {p.name}
                    <span style={{ opacity: 0.8, fontWeight: 600, marginLeft: 6 }}>{formatUSD(p.amount)}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleCreate}
              className="btn btn-primary"
              disabled={creating}
              style={{ padding: '13px 22px', fontWeight: 700, fontSize: '0.95rem' }}
            >
              <Zap size={16} /> {creating ? 'Creating…' : `Create PI Payment Request · ${formatUSD(selectedAmount)}`}
            </button>
            {error && (
              <div
                style={{
                  marginTop: 14,
                  background: 'rgba(244,63,94,0.12)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  color: '#fb7185',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="pc-pay-grid">
            {/* QR + ID */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 14,
                  display: 'inline-block',
                  boxShadow: '0 10px 30px -12px rgba(0,0,0,0.5)',
                }}
              >
                <QRCode value={payUrl} size={208} />
              </div>
              <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Scan with the PayCraft wesbite or google lens6n
              </div>
            </div>

            {/* Details + actions */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Amount due
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {formatUSD(session.amount)}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.8rem',
                    color: isExpired ? '#fb7185' : remaining < 60000 ? '#FACC15' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {isExpired ? 'Expired' : `Expires in ${fmtCountdown(remaining)}`}
                </div>
              </div>

              {/* PI Payment ID */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  PI Payment ID
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <code style={{ fontSize: '1rem', fontWeight: 700, color: '#22C55E', fontFamily: 'ui-monospace, monospace', overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
                    {session.piPaymentId}
                  </code>
                  <button onClick={handleCopy} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }}>
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Status / success */}
              {paid ? (
                <div
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    color: '#86EFAC',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={20} /> Payment received by {merchant?.businessName || merchant?.fullName || 'your store'}!
                </div>
              ) : isExpired ? (
                <div
                  style={{
                    background: 'rgba(244,63,94,0.12)',
                    border: '1px solid rgba(244,63,94,0.3)',
                    color: '#fb7185',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  This PI Payment request expired. Create a new one to continue.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    onClick={handlePayDemo}
                    className="btn btn-primary"
                    disabled={paying}
                    style={{ padding: '12px 18px', fontWeight: 700 }}
                  >
                    <Smartphone size={16} /> {paying ? 'Processing…' : 'Pay as customer (demo)'}
                  </button>
                  <a
                    href={payUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '12px 18px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    <ExternalLink size={16} /> Open payment page
                  </a>
                </div>
              )}

              {error && !paid && (
                <div
                  style={{
                    marginTop: 12,
                    background: 'rgba(244,63,94,0.12)',
                    border: '1px solid rgba(244,63,94,0.3)',
                    color: '#fb7185',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleReset}
                className="btn btn-ghost btn-sm"
                style={{ padding: '8px 12px', marginTop: 16 }}
              >
                <RefreshCw size={14} /> New payment request
              </button>
            </div>
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: 22 }}>
        Built on the same PI infrastructure that powers in-app transfers — real wallet, real
        settlement, real-time notifications.
      </p>
    </div>
  );
}
