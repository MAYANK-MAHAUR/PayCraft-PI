import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Smartphone, Copy, Check, PlusCircle, Send, QrCode, Wallet } from 'lucide-react';

export default function PiHeaderBanner({ onOpenPiModal }) {
  const { merchant } = useAuth();
  const [copied, setCopied] = useState(false);

  const piHandle = merchant?.piHandle || '';
  const balanceCents = merchant?.walletBalance || 0;
  const balanceDollars = (balanceCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleCopyPiHandle = () => {
    navigator.clipboard.writeText(piHandle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="pi-header-banner"
      style={{
        width: '100%',
        padding: '20px 24px',
        borderRadius: '20px',
        background: 'var(--surface-2)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
        boxShadow: '0 10px 30px -10px rgba(34, 197, 94, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* User Info & PI Handle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <img
          src={merchant?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(merchant?.email || 'user')}`}
          alt={merchant?.fullName || merchant?.businessName}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '2px solid #22C55E',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {merchant?.fullName || merchant?.businessName || 'PI User'}
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '20px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              PI Active
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <Smartphone size={14} style={{ color: '#4ADE80' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#4ADE80', fontFamily: 'monospace' }}>
              {piHandle}
            </span>
            <button
              type="button"
              onClick={handleCopyPiHandle}
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? '#22c55e' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Copy PI Handle"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Balance & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Balance */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Wallet Balance
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22c55e', letterSpacing: '-0.02em' }}>
            ${balanceDollars}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenPiModal('pay')}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#22C55E',
            }}
          >
            <Send size={16} />
            Send PI
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onOpenPiModal('qr_scan')}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <QrCode size={16} />
            Scan QR
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onOpenPiModal('topup')}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#22c55e',
              borderColor: 'rgba(34, 197, 94, 0.3)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
            }}
          >
            <PlusCircle size={16} />
            Add Funds
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onOpenPiModal('my_qr')}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#22c55e',
              borderColor: 'rgba(34, 197, 94, 0.3)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
            }}
          >
            <QrCode size={16} />
            My QR
          </button>
        </div>
      </div>
    </div>
  );
}
