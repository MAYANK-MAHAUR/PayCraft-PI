import React from 'react';

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  const label = (status || 'pending').toUpperCase();
  
  let badgeClass = 'badge-pending';
  if (normalized === 'succeeded' || normalized === 'delivered') badgeClass = 'badge-succeeded';
  else if (normalized === 'failed') badgeClass = 'badge-failed';

  return (
    <span 
      className={`badge ${badgeClass}`} 
      style={{ 
        whiteSpace: 'nowrap', 
        wordBreak: 'keep-all', 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '6px', 
        flexShrink: 0,
        width: 'fit-content'
      }}
    >
      <span style={{ fontSize: '0.6rem', lineHeight: 1, display: 'inline-block', flexShrink: 0 }}>●</span>
      <span style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>{label}</span>
    </span>
  );
}
