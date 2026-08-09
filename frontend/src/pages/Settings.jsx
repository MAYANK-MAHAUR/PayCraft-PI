import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import { Save, Check } from 'lucide-react';

export default function Settings() {
  const { merchant, login, token } = useAuth();
  const [businessName, setBusinessName] = useState(merchant?.businessName || '');
  const [webhookUrl, setWebhookUrl] = useState(merchant?.webhookUrl || '');
  const [piHandle, setPiHandle] = useState(merchant?.piHandle || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await api.put('/auth/settings', { businessName, webhookUrl, piHandle });
      login(token, res.data.merchant);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>Merchant Settings</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Configure business profile and webhook destination</p>
      </div>

      <div className="glass-card" style={{ padding: '28px', maxWidth: '600px' }}>
        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={16} /> Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Merchant Account Email</label>
            <input type="email" className="form-input" value={merchant?.email || ''} disabled style={{ opacity: 0.6 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Business / Application Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">PI Handle</label>
            <input
              type="text"
              className="form-input"
              placeholder="yourname@paycraft"
              value={piHandle}
              onChange={(e) => setPiHandle(e.target.value)}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Your unique PayCraft Payment Interface address. Customers use it to pay you.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Webhook Destination URL</label>
            <input 
              type="url" 
              className="form-input" 
              placeholder="https://your-domain.com/api/paycraft-webhook"
              value={webhookUrl} 
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Zerops Worker will POST payment events (<code style={{ color: 'var(--accent-cyan)' }}>payment.succeeded</code>, <code style={{ color: 'var(--accent-rose)' }}>payment.failed</code>) to this URL.
            </span>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
