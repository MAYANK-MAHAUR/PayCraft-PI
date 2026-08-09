import React from 'react';

export default function CreditCard({ cardNumber = '•••• •••• •••• 4242', cardName = 'YOUR NAME', expiry = '12/28', cvc = '•••' }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: '380px',
      height: '215px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--brand-500)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 22px 46px -16px var(--primary-glow), inset 0 1px 1px rgba(255,255,255,0.25)',
      border: '1px solid rgba(255,255,255,0.18)',
      position: 'relative',
      overflow: 'hidden',
      margin: '0 auto 24px auto',
    }}>
      {/* Decorative Glow Circle */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '170px',
        height: '170px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(250,204,21,0.30) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-60px',
        left: '-30px',
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.32) 0%, transparent 70%)',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
          ⚡ PayCraft <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.22)', padding: '2px 6px', borderRadius: '4px' }}>TEST</span>
        </div>
        <div style={{ width: '42px', height: '28px', background: 'linear-gradient(135deg, #FACC15, #16A34A)', borderRadius: '6px', opacity: 0.95, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)' }} />
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', letterSpacing: '0.18em', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.4)', marginBottom: '16px' }}>
          {cardNumber || '•••• •••• •••• 4242'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em' }}>Cardholder</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', textTransform: 'uppercase', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              {cardName || 'Valued Customer'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em' }}>Expires</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {expiry || '12/28'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
