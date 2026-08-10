import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import QRCode from '../components/QRCode';
import PiHeaderBanner from '../components/PiHeaderBanner';
import PiPayModal from '../components/PiPayModal';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import { DollarSign, ArrowLeftRight, Percent, Send, Copy, Check, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';

export default function Dashboard() {
  const { merchant } = useAuth();
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // PI Modal state
  const [piModalOpen, setPiModalOpen] = useState(false);
  const [piModalAction, setPiModalAction] = useState('pay');
  const [piInitialPayee, setPiInitialPayee] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, contactsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/pi/contacts').catch(() => ({ data: { contacts: [] } })),
      ]);
      setStats(statsRes.data);
      setContacts(contactsRes.data?.contacts || []);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live numbers: refetch stats whenever a real-time payment event arrives.
  useEffect(() => {
    const onRealtime = () => fetchDashboardData();
    window.addEventListener('paycraft:realtime', onRealtime);
    return () => window.removeEventListener('paycraft:realtime', onRealtime);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleOpenPiModal = (action = 'pay', payee = null) => {
    setPiModalAction(action);
    setPiInitialPayee(payee);
    setPiModalOpen(true);
  };

  // Build the per-account PI payment URL that the dashboard QR encodes.
  // This is the same URL the /pi/qr endpoint returns, but we build it
  // client-side so the dashboard works without an extra API round trip.
  const payUrl = merchant?.piHandle
    ? `${window.location.origin}/pay?pa=${encodeURIComponent(merchant.piHandle)}&pn=${encodeURIComponent(merchant.fullName || merchant.businessName || '')}&cu=USD`
    : '';

  const handleCopyLink = async () => {
    if (!payUrl) return;
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading PI Network & Analytics...</div>;
  }

  const totalVolumeFormatted = `$${((stats?.totalVolumeCents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      {/* PI Header & Live Wallet Banner */}
      <PiHeaderBanner onOpenPiModal={handleOpenPiModal} />

      {/* Interactive PI Payment Modal */}
      <PiPayModal
        isOpen={piModalOpen}
        action={piModalAction}
        onClose={() => setPiModalOpen(false)}
        initialPayee={piInitialPayee}
        onPaymentSuccess={() => {
          fetchDashboardData();
        }}
      />

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            Unified Payments Overview
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real-time P2P transfers, PI Handle lookups & transaction history
          </p>
        </div>


      </div>

      {/* Recent Payees / Contacts Carousel */}
      {contacts.length > 0 && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '28px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            Quick Transfer to Recent Payees
          </div>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '6px' }}>
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleOpenPiModal('pay', contact)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: '80px',
                }}
              >
                <img
                  src={contact.avatarUrl}
                  alt={contact.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '2px solid #22C55E',
                    boxShadow: '0 4px 10px rgba(34,197,94,0.2)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {contact.name.split(' ')[0]}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#4ADE80', fontFamily: 'monospace' }}>
                  {contact.piHandle}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <StatsCard
          title="Total Processed Volume"
          value={totalVolumeFormatted}
          subtitle={`${stats?.totalSuccessfulCount || 0} successful transfers`}
          icon={DollarSign}
          color="#22c55e"
        />
        <StatsCard
          title="Total Transactions"
          value={stats?.totalCount ?? 0}
          subtitle={`${stats?.counts?.failed || 0} failed`}
          icon={ArrowLeftRight}
          color="#4ADE80"
        />
        <StatsCard
          title="PI Network Health"
          value={`${stats?.successRate || 100}%`}
          subtitle="Instant settlement"
          icon={Percent}
          color="#FACC15"
        />

        <div className="glass-card glass-card-interactive" style={{ padding: '20px 24px', flex: '1 1 220px', minWidth: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px', alignSelf: 'flex-start' }}>
            Your PI QR
          </span>
          {payUrl ? (
            <QRCode value={payUrl} size={130} />
          ) : (
            <div style={{ width: 130, height: 130, background: 'var(--bg-tertiary)', borderRadius: 8 }} />
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!payUrl}
            className="btn btn-secondary"
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
          </button>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            Scan with any camera or Google Lens to pay via PI
          </span>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>Recent PI Transactions</h2>
          <Link to="/dashboard/transactions" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PI Reference ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Counterparty (Who did it)</th>
                <th>Description</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((tx) => {
                  const dir = tx.direction || 'unknown';
                  const isIncoming = dir === 'incoming';
                  const isSelf = dir === 'self';
                  const amountColor = isIncoming ? '#22c55e' : dir === 'outgoing' ? '#EF4444' : '#FACC15';
                  const amountPrefix = isIncoming || isSelf ? '+' : '-';
                  const DirIcon = isSelf ? Wallet : isIncoming ? ArrowDownLeft : ArrowUpRight;
                  const dirLabel = isSelf ? 'Top-Up' : isIncoming ? 'Incoming' : 'Outgoing';
                  const counterpartyInitial = (tx.counterpartyName || '?').charAt(0).toUpperCase();

                  return (
                    <tr key={tx.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#4ADE80', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <Link to={`/dashboard/transactions/${tx.id}`} title={tx.id} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {tx.pi_ref_id || (tx.id.length > 18 ? `${tx.id.slice(0, 8)}...${tx.id.slice(-6)}` : tx.id)}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 800, color: amountColor, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: `${amountColor}1A`, color: amountColor }}>
                            <DirIcon size={13} />
                          </span>
                          {amountPrefix}${(tx.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={tx.status} /></td>
                      <td style={{ color: 'var(--text-main)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isSelf ? (
                            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Wallet size={14} /></span>
                          ) : (
                            tx.counterpartyAvatar ? (
                              <img src={tx.counterpartyAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />
                            ) : (
                              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>{counterpartyInitial}</span>
                            )
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                            <span style={{ fontWeight: 600 }}>{dirLabel}: {tx.counterpartyName || 'Unknown'}</span>
                            {tx.counterpartyHandle && <span style={{ fontSize: '0.72rem', color: '#4ADE80', fontFamily: 'monospace' }}>{tx.counterpartyHandle}</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{tx.displayDescription || 'PI Transfer'}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    No PI transactions recorded yet. Click <strong>"Send PI"</strong> to send one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards (mirror the table above; shown only under 900px) */}
        <div className="pc-tx-cards">
          {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            stats.recentTransactions.map((tx) => {
              const dir = tx.direction || 'unknown';
              const isIncoming = dir === 'incoming';
              const isSelf = dir === 'self';
              const amountColor = isIncoming ? '#22c55e' : dir === 'outgoing' ? '#EF4444' : '#FACC15';
              const amountPrefix = isIncoming || isSelf ? '+' : '-';
              const DirIcon = isSelf ? Wallet : isIncoming ? ArrowDownLeft : ArrowUpRight;
              const dirLabel = isSelf ? 'Top-Up' : isIncoming ? 'Incoming' : 'Outgoing';
              const counterpartyInitial = (tx.counterpartyName || '?').charAt(0).toUpperCase();
              return (
                <div className="pc-tx-card" key={tx.id}>
                  <div className="pc-tx-card-head">
                    <span className="pc-tx-card-ref">{tx.pi_ref_id || (tx.id.length > 18 ? `${tx.id.slice(0, 8)}...${tx.id.slice(-6)}` : tx.id)}</span>
                    <StatusBadge status={tx.status} />
                    <span className="pc-tx-card-amount" style={{ color: amountColor }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: `${amountColor}1A`, color: amountColor }}><DirIcon size={13} /></span>
                      {amountPrefix}{(tx.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pc-tx-card-body">
                    {isSelf ? (
                      <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Wallet size={14} /></span>
                    ) : (
                      tx.counterpartyAvatar ? (
                        <img src={tx.counterpartyAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />
                      ) : (
                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>{counterpartyInitial}</span>
                      )
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                      <span className="pc-tx-card-name">{dirLabel}: {tx.counterpartyName || 'Unknown'}</span>
                      {tx.counterpartyHandle && <span className="pc-tx-card-handle">{tx.counterpartyHandle}</span>}
                    </div>
                  </div>
                  <div className="pc-tx-card-foot">
                    <span>{tx.displayDescription || 'PI Transfer'}</span>
                    <span>{new Date(tx.created_at).toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
              No PI transactions recorded yet. Click <strong>"Send PI"</strong> to send one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}