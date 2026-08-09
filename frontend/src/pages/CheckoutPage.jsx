import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import QRCode from '../components/QRCode';
import PaymentSuccessOverlay from '../components/PaymentSuccessOverlay';
import { useAuth } from '../hooks/useAuth';
import { Smartphone, QrCode, Send, CheckCircle2, Lock } from 'lucide-react';

const formatUSD = (cents) =>
  '$' + (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CheckoutPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, merchant } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentTab, setPaymentTab] = useState('pi'); // 'pi' | 'qr'
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    setError('');
    const id = sessionId || null;
    try {
      let data;
      if (id) {
        try {
          const res = await api.get(`/checkout/${id}`);
          data = res.data.session;
        } catch (err) {
          if (err.response && err.response.status === 404) {
            const created = await api.post('/checkout/session', {
              amount: 4999,
              currency: 'USD',
              description: 'PayCraft Dev Suite Subscription',
            });
            const enriched = await api.get(`/checkout/${created.data.sessionId}`);
            data = enriched.data.session;
          } else {
            throw err;
          }
        }
      } else {
        const created = await api.post('/checkout/session', {
          amount: 4999,
          currency: 'USD',
          description: 'PayCraft Dev Suite Subscription',
        });
        const enriched = await api.get(`/checkout/${created.data.sessionId}`);
        data = enriched.data.session;
      }
      setSession(data);
    } catch (err) {
      setError('Checkout session expired or not found.');
    } finally {
      setLoading(false);
    }
  };

  const handlePiCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;
    if (!token) {
      navigate('/login');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const res = await api.post(`/checkout/${session.sessionId}/pay`);
      const p = res.data.payment;
      setPaymentResult({
        id: p.piRefId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        payment_method: 'pi',
        formattedAmount: p.formattedAmount,
        merchantName: p.merchantName,
        merchantPiHandle: p.merchantPiHandle,
        senderPiHandle: p.senderPiHandle,
      });
      if (p.status === 'succeeded') setShowOverlay(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Payment submission failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading secure checkout...
      </div>
    );
  }

  const amountCents = session ? Number(session.amount) : 4999;
  const payUrl = session ? `${window.location.origin}/pay?cs=${session.sessionId}` : `${window.location.origin}/pay`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {session?.businessName || 'Merchant Checkout'}
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {session?.description || 'Payment'}
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{formatUSD(amountCents)}</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Paper Money</span>
          </div>
        </div>

        {/* Payment Method Tabs */}
        {!paymentResult && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: 'var(--surface-2)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
            <button
              type="button"
              className={`btn btn-sm ${paymentTab === 'pi' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setPaymentTab('pi')}
            >
              <Smartphone size={16} /> PI Pay
            </button>
            <button
              type="button"
              className={`btn btn-sm ${paymentTab === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setPaymentTab('qr')}
            >
              <QrCode size={16} /> Scan QR
            </button>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {paymentResult ? (
          /* ---- Success (in-page, shown after overlay closes) ---- */
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <CheckCircle2 size={56} color="var(--accent-emerald)" style={{ margin: '0 auto 16px auto' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              Payment Successful!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>
              Paid {paymentResult.formattedAmount} to {paymentResult.merchantName}
            </p>
            <div className="glass-card" style={{ padding: '16px', textAlign: 'left', marginBottom: '24px', fontSize: '0.85rem' }}>
              <div><strong>Amount:</strong> {paymentResult.formattedAmount}</div>
              <div><strong>Merchant:</strong> {paymentResult.merchantName} ({paymentResult.merchantPiHandle})</div>
              <div><strong>PI Ref ID:</strong> <code style={{ color: 'var(--primary-light)' }}>{paymentResult.id}</code></div>
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: '100%' }}>
              Go to Dashboard
            </button>
          </div>
        ) : paymentTab === 'pi' ? (
          /* ---- PI Pay (real paper-money wallet transfer) ---- */
          token ? (
            <form onSubmit={handlePiCheckoutSubmit} style={{ padding: '6px 0' }}>
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'var(--brand-500)', color: '#0B0B0B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px auto',
                  }}
                >
                  <Smartphone size={28} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Pay with your PI wallet
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Instant settlement from your PayCraft paper-money balance.
                </p>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '20px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Paying as</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{merchant?.piHandle}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Wallet balance</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {formatUSD(merchant?.walletBalance || 0)}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontWeight: 700 }} disabled={processing}>
                <Send size={16} /> {processing ? 'Authorizing PI Transfer...' : `Pay ${formatUSD(amountCents)} with PI`}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'var(--brand-500)', color: '#0B0B0B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px auto',
                }}
              >
                <Lock size={26} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--text-main)' }}>Sign in to pay</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Log in with your PayCraft account to pay {formatUSD(amountCents)} from your paper-money wallet.
              </p>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>Sign In to Pay</Link>
            </div>
          )
        ) : (
          /* ---- Scan QR (real, Google-Lens-scannable) ---- */
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <div style={{ marginBottom: '18px', display: 'inline-block', background: '#fff', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <QRCode value={payUrl} size={208} />
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Scan this QR with any camera or <strong>Google Lens</strong> to open the payment screen.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '18px', wordBreak: 'break-all' }}>
              {payUrl}
            </p>
            <Link to={payUrl} className="btn btn-secondary" style={{ width: '100%' }}>Open payment screen</Link>
          </div>
        )}
      </div>

      {showOverlay && (
        <PaymentSuccessOverlay
          isProcessing={processing}
          data={paymentResult}
          onClose={() => setShowOverlay(false)}
        />
      )}
    </div>
  );
}