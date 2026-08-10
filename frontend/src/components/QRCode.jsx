import React, { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

/**
 * Real, scannable QR code rendered as inline SVG (no external image dependency).
 * Encodes any string (payment deep-link, receipt id, merchant pay link...).
 */
export default function QRCode({ value, size = 200, dark = false, className = '' }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value) return;
    QRCodeLib.toString(value, {
      type: 'svg',
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: dark ? '#FFFFFF' : '#0B0C16', light: dark ? '#0B0C16' : '#FFFFFF' },
    })
      .then(setSvg)
      .catch(() => setError(true));
  }, [value, size, dark]);

  if (error) {
    return <div className="qr-frame" style={{ width: '100%', maxWidth: size, aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>QR unavailable</div>;
  }

  return (
    <div
      className={`qr-frame ${dark ? 'dark' : ''} ${className}`}
      style={{ width: '100%', maxWidth: size, aspectRatio: '1 / 1' }}
      role="img"
      aria-label={`QR code for ${value}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
