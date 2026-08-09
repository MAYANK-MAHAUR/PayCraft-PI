import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handlePostAuthNavigate = () => {
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get('redirect');
    const pendingPayTarget = sessionStorage.getItem('paycraft_pending_pay_target');
    const targetUrl = redirectParam || pendingPayTarget || '/dashboard';
    try {
      sessionStorage.removeItem('paycraft_pending_pay_target');
    } catch (e) {}
    navigate(targetUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.merchant);
      handlePostAuthNavigate();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>PayCraft PI Network</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>Sign in to manage your PI payments & balance</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '20px' }}>
            {error}
          </div>
        )}

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
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="merchant@example.com"
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In with Email'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-dim)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}

