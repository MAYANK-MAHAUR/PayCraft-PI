import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'var(--primary)' }) {
  return (
    <div className="glass-card glass-card-interactive" style={{ padding: '20px 24px', flex: 1, minWidth: '220px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && (
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: `rgba(255, 255, 255, 0.05)`,
            border: `1px solid ${color}40`,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: color
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
        {value}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
