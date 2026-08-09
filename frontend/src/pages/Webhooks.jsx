import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { Webhook, RefreshCw, AlertCircle } from 'lucide-react';

export default function Webhooks() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const fetchWebhooks = async () => {
    try {
      const res = await api.get('/webhooks');
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Failed to load webhook events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleRetry = async (eventId) => {
    setRetryingId(eventId);
    try {
      await api.post(`/webhooks/${eventId}/retry`);
      fetchWebhooks();
    } catch (err) {
      alert('Failed to retry webhook delivery');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>Webhook Delivery Log</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Real-time outbound webhook event queue processed by Zerops Worker
          </p>
        </div>

        <button onClick={fetchWebhooks} className="btn btn-secondary">
          <RefreshCw size={16} /> Refresh Queue
        </button>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading webhook queue...</div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Event Type</th>
                  <th>Delivery Status</th>
                  <th>Attempts</th>
                  <th>Last Error</th>
                  <th>Delivered / Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.length > 0 ? (
                  events.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--primary-light)' }}>
                        {e.id.slice(0, 18)}...
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px' }}>
                          {e.event_type}
                        </span>
                      </td>
                      <td><StatusBadge status={e.status} /></td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {e.attempts} / {e.max_attempts}
                      </td>
                      <td style={{ color: e.last_error ? 'var(--accent-rose)' : 'var(--text-dim)', fontSize: '0.82rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.last_error || 'None'}
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                        {e.delivered_at ? new Date(e.delivered_at).toLocaleString() : new Date(e.created_at).toLocaleString()}
                      </td>
                      <td>
                        {e.status !== 'delivered' && (
                          <button 
                            onClick={() => handleRetry(e.id)} 
                            className="btn btn-secondary btn-sm"
                            disabled={retryingId === e.id}
                          >
                            <RefreshCw size={12} /> {retryingId === e.id ? 'Queuing...' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      No webhook events logged yet. Process a payment transaction to trigger a webhook!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
