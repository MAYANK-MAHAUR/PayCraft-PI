import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { ArrowLeft, Clock, FileText, Shield, User, DollarSign } from 'lucide-react';

export default function TransactionDetail() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await api.get(`/transactions/${id}`);
        setTransaction(res.data.transaction);
      } catch (err) {
        console.error('Failed to load transaction:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading transaction details...</div>;
  }

  if (!transaction) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Transaction Not Found</h2>
        <Link to="/dashboard/transactions" className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Transactions
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/dashboard/transactions" className="btn btn-secondary btn-sm" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} /> Back to Transactions
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {transaction.id}
            </h1>
            <StatusBadge status={transaction.status} />
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Processed on {new Date(transaction.created_at).toLocaleString()}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            ${(transaction.amount / 100).toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{transaction.currency}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {/* Payment Details */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--primary-light)" /> Payment Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', uppercase: true }}>Description</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{transaction.description || 'No description provided'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Idempotency Key</div>
              <div style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{transaction.idempotency_key || 'None'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Failure Reason</div>
              <div style={{ color: transaction.failure_reason ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                {transaction.failure_reason || 'None (Success)'}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--accent-cyan)" /> Customer Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Customer Name</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{transaction.customer_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Email Address</div>
              <div style={{ color: 'var(--primary-light)' }}>{transaction.customer_email || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* JSON Metadata Payload */}
        <div className="glass-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
            Metadata JSON Object
          </h2>
          <div className="code-block">
            {JSON.stringify(transaction.metadata || {}, null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}
