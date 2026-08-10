import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Key, Plus, Trash2, Copy, Check, ShieldAlert } from 'lucide-react';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyResult, setNewKeyResult] = useState(null);
  const [keyMode, setKeyMode] = useState('test');
  const [keyName, setKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await api.get('/keys');
      setKeys(res.data.keys || []);
    } catch (err) {
      console.error('Failed to load keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/keys', { mode: keyMode, name: keyName });
      setNewKeyResult(res.data.key);
      setKeyName('');
      fetchKeys();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to generate key');
    }
  };

  const handleRevokeKey = async (id) => {
    if (!confirm('Are you sure you want to revoke this API Key? Any application using it will fail immediately.')) return;

    try {
      await api.delete(`/keys/${id}`);
      fetchKeys();
    } catch (err) {
      alert('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>API Key Management</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Manage your secret API keys for authenticating REST API requests
        </p>
      </div>

      {/* Generated New Key Alert Banner */}
      {newKeyResult && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
            <ShieldAlert size={20} /> Copy your secret API key now!
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            This key will <strong>NEVER</strong> be displayed again. Store it securely.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div className="code-block" style={{ flex: 1, margin: 0, color: '#38bdf8' }}>
              {newKeyResult.apiKey}
            </div>
            <button onClick={() => copyToClipboard(newKeyResult.apiKey)} className="btn btn-primary btn-sm">
              {copiedKey ? <Check size={16} /> : <Copy size={16} />} {copiedKey ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setNewKeyResult(null)} className="btn btn-secondary btn-sm">Done</button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} color="var(--primary-light)" /> Generate New Secret Key
        </h2>

        <form onSubmit={handleGenerateKey} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label className="form-label">Key Name / Description</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Backend Production Server"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
            />
          </div>

          <div style={{ width: '160px' }}>
            <label className="form-label">Key Scope Mode</label>
            <select className="form-input" value={keyMode} onChange={(e) => setKeyMode(e.target.value)}>
              <option value="test">Test Mode (pk_test_)</option>
              <option value="live">Live Mode (pk_live_)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            <Key size={16} /> Generate Key
          </button>
        </form>
      </div>

      {/* Keys List */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>Active API Keys</h2>

        {loading ? (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading API keys...</div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Masked Secret Key</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{k.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {k.maskedKey}
                    </td>
                    <td>
                      <span className={`badge badge-${k.mode}`}>{k.mode}</span>
                    </td>
                    <td>
                      <span style={{ color: k.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600, fontSize: '0.85rem' }}>
                        {k.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      {k.isActive && (
                        <button onClick={() => handleRevokeKey(k.id)} className="btn btn-danger btn-sm">
                          <Trash2 size={14} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
