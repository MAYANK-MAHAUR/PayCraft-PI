import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredKeys, setRegisteredKeys] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTargetUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get('redirect');
    const pendingPayTarget = sessionStorage.getItem('paycraft_pending_pay_target');
    return redirectParam || pendingPayTarget || '/dashboard';
  };

  const handlePostAuthNavigate = () => {
    const targetUrl = getTargetUrl();
    try {
      sessionStorage.removeItem('paycraft_pending_pay_target');
    } catch (e) {}
    navigate(targetUrl);
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/guest');
      login(res.data.token, res.data.merchant);
      handlePostAuthNavigate();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create guest session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        businessName,
        webhookUrl,
      });

      login(res.data.token, res.data.merchant);
      setRegisteredKeys(res.data.keys);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed.');
      setLoading(false);
    }
  };

  if (registeredKeys) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <CheckCircle2 size={48} color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>PI Account & Handle Created!</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Your account has been allocated $1,000 paper-money balance and API keys!
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Test Secret API Key (pk_test_...)</label>
            <div className="code-block" style={{ marginTop: '4px', wordBreak: 'break-all', color: 'var(--accent-cyan)' }}>
              {registeredKeys.testApiKey}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Live Secret API Key (pk_live_...)</label>
            <div className="code-block" style={{ marginTop: '4px', wordBreak: 'break-all', color: 'var(--accent-emerald)' }}>
              {registeredKeys.liveApiKey}
            </div>
          </div>

          <button onClick={handlePostAuthNavigate} className="btn btn-primary" style={{ width: '100%' }}>
            Continue to Payment <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Create PI Account</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>Get your unique PI Handle & instant wallet</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* One-Click Guest / Judge Sign In */}
        <div style={{ marginBottom: '14px' }}>
          <button
            type="button"
            onClick={handleGuestLogin}
            className="btn btn-secondary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(34,197,94,0.14)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: 'var(--accent-emerald)',
            }}
          >
            <UserCheck size={18} /> Continue as Guest / Demo Judge
          </button>
        </div>

        {/* Google OAuth Login Button */}
        <div style={{ marginBottom: '20px' }}>
          <GoogleLoginButton
            onSuccess={handlePostAuthNavigate}
            onError={(msg) => setError(msg)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color, rgba(255,255,255,0.1))' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>OR WITH EMAIL</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color, rgba(255,255,255,0.1))' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name / Business Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="John Doe or Acme Corp"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Webhook URL (Optional)</label>
            <input 
              type="url" 
              className="form-input" 
              placeholder="https://api.acme.com/webhooks/paycraft"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Register PI Account'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-dim)' }}>
          Already registered? <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

