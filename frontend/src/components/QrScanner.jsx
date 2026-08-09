import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, X, RefreshCw } from 'lucide-react';

/**
 * QrScanner — universal PayCraft QR scanner.
 *
 *  - On **mobile** (or any device with a usable rear camera): opens the
 *    rear camera via getUserMedia and decodes the first PI QR it sees.
 *  - On **desktop** (no camera / user denied camera): shows a clean file
 *    upload UI that decodes the QR from the chosen image.
 *
 * Both paths funnel into the same onScan(decodedText) callback, which is
 * what the caller uses to navigate the user to the payment screen.
 */
export default function QrScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [mode, setMode] = useState('idle'); // 'idle' | 'camera' | 'upload' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const stop = async () => {
    try {
      if (html5QrRef.current && html5QrRef.current.isScanning) {
        await html5QrRef.current.stop();
        await html5QrRef.current.clear();
      }
    } catch (_) {
      // ignore — scanner may already be stopped
    }
    html5QrRef.current = null;
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    setErrorMsg('');
    setMode('camera');
    try {
      // Wait a tick so the reader div mounts
      await new Promise((r) => setTimeout(r, 50));
      const html5Qr = new Html5Qrcode('qr-reader');
      html5QrRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          await stop();
          onScan(decodedText);
        },
        () => {
          /* ignore per-frame decode failures */
        }
      );
    } catch (err) {
      console.warn('Camera start failed:', err);
      setErrorMsg('Could not start camera. Try uploading a QR image instead.');
      setMode('upload');
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setMode('upload');
    try {
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode('qr-reader');
      }
      const decodedText = await html5QrRef.current.scanFile(file, false);
      await stop();
      onScan(decodedText);
    } catch (err) {
      console.error('File scan failed:', err);
      setErrorMsg('Could not read a QR from that image. Try a clearer photo.');
      setMode('idle');
    }
  };

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '10px 0',
      }}
    >
      {/* Camera viewport / file target — always rendered so Html5Qrcode can mount into it */}
      <div
        id="qr-reader"
        ref={scannerRef}
        style={{
          width: '100%',
          maxWidth: '320px',
          margin: '0 auto 16px auto',
          borderRadius: '14px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          minHeight: mode === 'camera' ? '320px' : '0px',
          display: mode === 'camera' ? 'block' : 'none',
        }}
      />

      {mode === 'idle' && (
        <>
          <div
            style={{
              border: '2px dashed var(--success)',
              borderRadius: '16px',
              padding: '28px 20px',
              backgroundColor: 'var(--success-bg)',
              marginBottom: '16px',
            }}
          >
            <Camera size={48} style={{ color: 'var(--success)', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>
              Scan a PayCraft PI QR
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              We'll open your camera on mobile, or you can upload an image on desktop.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={startCamera}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Camera size={16} /> Open Camera
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setMode('upload');
                setTimeout(() => fileInputRef.current?.click(), 0);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} /> Upload QR Image
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </>
      )}

      {mode === 'upload' && !errorMsg && (
        <div
          style={{
            border: '2px dashed var(--success)',
            borderRadius: '16px',
            padding: '28px 20px',
            backgroundColor: 'var(--success-bg)',
            marginBottom: '16px',
          }}
        >
          <Upload size={48} style={{ color: 'var(--success)', marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>
            Upload a QR image
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Pick a clear photo of the QR code you want to scan.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: 'none' }}
            id="qr-file-input"
            onClick={(e) => {
              // reset so the same file can be re-picked
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('qr-file-input')?.click()}
            style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={16} /> Choose Image
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-bd)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '12px',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '8px' }}>
        {(mode === 'camera' || mode === 'upload') && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              await stop();
              setMode('idle');
              setErrorMsg('');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} /> Try Another
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              await stop();
              onClose();
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}