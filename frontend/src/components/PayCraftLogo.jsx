import React from 'react';

/**
 * PayCraft brand mark — a green→yellow gradient tile with a bold "P" glyph.
 * Theme-agnostic: the gradient is always brand green/yellow and the glyph is
 * always near-black, so it reads on both light and dark surfaces.
 */
export function PayCraftMark({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', borderRadius: 11 }}
    >
      <defs>
        <linearGradient id="pc-grad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#FACC15" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#pc-grad)" />
      <path
        d="M13 29 V11 H20 a6 6 0 0 1 0 12 H13"
        stroke="#0B0B0B"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Full PayCraft logo (mark + optional wordmark).
 * @param {number} size     mark size in px
 * @param {boolean} wordmark show "PayCraft" text
 * @param {string} wordColor color of the "Pay" portion (inherits context by default)
 * @param {string} craftColor color of the "Craft" portion
 */
export default function PayCraftLogo({
  size = 36,
  wordmark = true,
  wordColor = 'var(--text-main)',
  craftColor = '#22C55E',
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <PayCraftMark size={size} />
      {wordmark && (
        <span
          style={{
            fontSize: size * 0.5,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: wordColor,
            display: 'inline-flex',
            alignItems: 'baseline',
            lineHeight: 1,
          }}
        >
          Pay<span style={{ color: craftColor }}>Craft</span>
        </span>
      )}
    </div>
  );
}
