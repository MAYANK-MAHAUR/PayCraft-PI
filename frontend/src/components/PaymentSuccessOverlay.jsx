import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

const MIN_PROCESSING_MS = 1400;

export default function PaymentSuccessOverlay({ isProcessing = false, data = null, onClose }) {
  const [phase, setPhase] = useState('processing');
  const [minTimePassed, setMinTimePassed] = useState(false);
  const chimePlayed = useRef(false);
  const minTimer = useRef(null);
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Minimum processing display time.
  useEffect(() => {
    minTimer.current = setTimeout(() => setMinTimePassed(true), MIN_PROCESSING_MS);
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(minTimer.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Transition to success once processing is done AND data is ready AND
  // the minimum display time has elapsed.
  useEffect(() => {
    if (!isProcessing && data && minTimePassed && phase !== 'success') {
      setPhase('success');
    }
  }, [isProcessing, data, minTimePassed, phase]);

  // Success chime via Web Audio (no asset dependency).
  useEffect(() => {
    if (phase !== 'success' || chimePlayed.current) return;
    chimePlayed.current = true;
    playSuccessChime();
  }, [phase]);

  // Defensive data extraction.
  const formattedAmount =
    data?.formattedAmount ||
    (data?.amount != null ? `$${(data.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '');
  const piRefId = data?.piRefId || data?.id || '';
  const receiverName = data?.receiver?.name || data?.merchantName || data?.name || 'Merchant';
  const piHandle = data?.receiver?.piHandle || data?.piHandle || '';

  return (
    <AnimatePresence>
      <motion.div
        className="pc-overlay-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={phase === 'success' ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(11,11,11,0.72)',
          backdropFilter: 'blur(6px)',
          padding: 20,
        }}
      >
        {phase === 'success' && (
          <Confetti
            width={winSize.w}
            height={winSize.h}
            recycle={false}
            numberOfPieces={320}
            gravity={0.32}
            colors={['#22C55E', '#16A34A', '#FACC15', '#ffffff']}
          />
        )}

        {phase === 'processing' ? (
          <motion.div
            key="processing"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              background: '#22C55E',
              borderRadius: 28,
              padding: '56px 64px',
              textAlign: 'center',
              color: '#0B0B0B',
              boxShadow: '0 24px 80px rgba(34,197,94,0.45)',
              minWidth: 320,
            }}
          >
            <div className="pc-pulse-ring" style={{ margin: '0 auto 26px' }}>
              <div className="pc-pulse-dot" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>Processing payment…</div>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, marginTop: 8 }}>
              Securing your PI transfer
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            style={{
              position: 'relative',
              background: '#22C55E',
              borderRadius: 32,
              padding: '64px 56px',
              textAlign: 'center',
              color: '#0B0B0B',
              boxShadow: '0 30px 100px rgba(34,197,94,0.55)',
              maxWidth: 460,
              width: '100%',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 260, damping: 14 }}
              style={{
                width: 104,
                height: 104,
                borderRadius: '50%',
                background: '#0B0B0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </motion.div>

            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>
              Payment Successful
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.05, margin: '10px 0 18px', letterSpacing: -1 }}>
              {formattedAmount || '$0.00'}
            </div>

            <div
              style={{
                background: 'rgba(11,11,11,0.12)',
                borderRadius: 16,
                padding: '16px 18px',
                fontSize: 15,
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ opacity: 0.7 }}>To</span>
                <span style={{ textAlign: 'right' }}>
                  {receiverName}
                  {piHandle && <span style={{ display: 'block', fontSize: 13, fontWeight: 600, opacity: 0.75 }}>{piHandle}</span>}
                </span>
              </div>
              {piRefId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 10 }}>
                  <span style={{ opacity: 0.7 }}>PI Ref ID</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{piRefId}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: 26,
                width: '100%',
                border: 'none',
                borderRadius: 14,
                background: '#0B0B0B',
                color: '#22C55E',
                fontSize: 17,
                fontWeight: 800,
                padding: '16px 0',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </motion.div>
        )}
      </motion.div>

      <style>{`
        .pc-pulse-ring {
          width: 88px; height: 88px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(11,11,11,0.12);
          position: relative;
        }
        .pc-pulse-ring::before, .pc-pulse-ring::after {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          border: 4px solid #0B0B0B; opacity: 0.35;
          animation: pcPulse 1.4s ease-out infinite;
        }
        .pc-pulse-ring::after { animation-delay: 0.7s; }
        .pc-pulse-dot {
          width: 34px; height: 34px; border-radius: 50%; background: #0B0B0B;
          animation: pcBreathe 1.4s ease-in-out infinite;
        }
        @keyframes pcPulse {
          0% { transform: scale(0.6); opacity: 0.5; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes pcBreathe {
          0%, 100% { transform: scale(0.85); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </AnimatePresence>
  );
}
