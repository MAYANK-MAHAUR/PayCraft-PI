import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import PaymentSuccessOverlay from '../components/PaymentSuccessOverlay';
import { useAuth } from '../hooks/useAuth';
import { Smartphone, QrCode, Send, CheckCircle2, Lock, ArrowLeft, UserCheck } from 'lucide-react';

const formatUSD = (cents) =>
  '$' + (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, merchant, login } = useAuth();

  const handleGuestPay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/guest');
      login(res.data.token, res.data.merchant);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Guest sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const cs = params.get('cs'); // checkout session id
  const pa = params.get('pa'); // merchant PI handle
  const pn = params.get('pn'); // payee display name (optional)
  const am = params.get('am'); // amount in major units (optional)

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [merchantInfo, setMerchantInfo] = useState(null); // {name, piHandle, fixedAmount, description}
  const [amountDollars, setAmountDollars] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (location.pathname && (pa || cs)) {
      const fullTarget = location.pathname + location.search;
      try {
        sessionStorage.setItem('paycraft_pending_pay_target', fullTarget);
      } catch (e) {}
    }
    loadTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs, pa]);

  const loginRedirectUrl = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  const loadTarget = async () => {
    setLoading(true);
    setError('');
    try {
      if (cs) {
        const res = await api.get(`/checkout/${cs}`);
        const s = res.data.session;
        setMerchantInfo({
          name: s.businessName || 'Merchant',
          piHandle: s.merchantPiHandle || '',
          fixedAmount: Number(s.amount),
          description: s.description,
        });
        setAmountDollars((Number(s.amount) / 100).toString());
      } else if (pa) {
        const res = await api.get(`/pi/public/${encodeURIComponent(pa)}`);
        if (!res.data.exists) {
          setError(`No PayCraft merchant found for "${pa}".`);
          setMerchantInfo(null);
        } else {
          // If the QR included a pre-filled name/amount, honour them.
          setMerchantInfo({
            name: pn || res.data.name,
            piHandle: res.data.piHandle,
            fixedAmount: null,
          });
          if (am) setAmountDollars(am);
        }
      } else {
        setError('Invalid payment link. Missing checkout or merchant reference.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load the payment request.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      let result;
      if (cs && merchantInfo.fixedAmount != null) {
        const res = await api.post(`/checkout/${cs}/pay`);
        const p = res.data.payment;
        result = {
          formattedAmount: p.formattedAmount,
          piRefId: p.piRefId,
          receiver: { name: p.merchantName, piHandle: p.merchantPiHandle },
        };
      } else {
        const parsed = parseFloat(amountDollars);
        if (isNaN(parsed) || parsed <= 0) {
          setError('Please enter a valid amount.');
          setProcessing(false);
          return;
        }
        const amountCents = Math.round(parsed * 100);
        const res = await api.post('/pi/transfer', {
          recipient: merchantInfo.piHandle,
          amount: amountCents,
          note: `Payment to ${merchantInfo.name}`,
        });
        result = {
          formattedAmount: res.data.formattedAmount,
          piRefId: res.data.piRefId,
          receiver: { name: res.data.receiver.name, piHandle: res.data.receiver.piHandle },
        };
      }
      setSuccessData(result);
      setShowOverlay(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const amountCents = merchantInfo && merchantInfo.fixedAmount != null
    ? merchantInfo.fixedAmount
    : Math.round((parseFloat(amountDollars) || 0) * 100);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 16, paddingLeft: 0 }}>
          <ArrowLeft size={16} /> PayCraft
        </Link>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>Loading payment request...</div>
        ) : !token ? (
          <div style={{ textAlign: 'center', padding: '18px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--brand-500)', color: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              <Lock size={26} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--text-main)' }}>Sign in to pay</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Log in with your PayCraft account or continue as Guest to send paper-money from your wallet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleGuestPay}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'rgba(34,197,94,0.14)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  color: 'var(--accent-emerald)',
                }}
              >
                <UserCheck size={18} /> Instant Guest Pay ($1,000 Balance)
              </button>
              <Link to={loginRedirectUrl} className="btn btn-primary" style={{ width: '100%' }}>Sign In to Pay</Link>
            </div>
          </div>
        ) : merchantInfo ? (
          <form onSubmit={handlePay}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--brand-500)', color: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Smartphone size={28} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pay to</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 2px' }}>{merchantInfo.name}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>{merchantInfo.piHandle}</div>
            </div>

            {error && (
              <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Paying as</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{merchant?.piHandle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Wallet balance</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatUSD(merchant?.walletBalance || 0)}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (USD Paper Money)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-500)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  style={{ paddingLeft: 34, fontSize: '1.1rem', fontWeight: 700 }}
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  disabled={merchantInfo.fixedAmount != null}
                  required
                />
              </div>
              {merchantInfo.fixedAmount != null && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6 }}>Amount is set by the merchant for this checkout.</div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontWeight: 700 }} disabled={processing}>
              <Send size={16} /> {processing ? 'Processing...' : `Pay ${formatUSD(amountCents || 0)}`}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
            <QrCode size={40} style={{ color: 'var(--accent-emerald)', marginBottom: 10 }} />
            <p>{error || 'This payment link is not valid.'}</p>
            <Link to="/" className="btn btn-secondary" style={{ marginTop: 12 }}>Back to home</Link>
          </div>
        )}
      </div>

      {showOverlay && (
        <PaymentSuccessOverlay
          isProcessing={processing}
          data={successData}
          onClose={() => {
            setShowOverlay(false);
            navigate('/dashboard');
          }}
        />
      )}
    </div>
  );
}