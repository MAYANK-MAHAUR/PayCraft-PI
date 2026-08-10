import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { playSuccessChime } from '../utils/sound';

const MIN_PROCESSING_MS = 200; // Snappy 200ms minimum wait so chime & checkmark pop together

export default function PaymentSuccessOverlay({ isProcessing = false, data = null, onClose }) {
  const [phase, setPhase] = useState('processing');
  const [minTimePassed, setMinTimePassed] = useState(false);
  const chimePlayed = useRef(false);
  const minTimer = useRef(null);
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Store persistent copy of data so exit animations never render null/blank data
  const dataRef = useRef(data);
  if (data) {
    dataRef.current = data;
  }
  const activeData = data || dataRef.current;

  // Minimum processing display time.
  useEffect(() => {
    minTimer.current = setTimeout(() => setMinTimePassed(true), MIN_PROCESSING_MS);
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => {
      if (minTimer.current) clearTimeout(minTimer.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Transition to success once processing is done AND data is ready
  useEffect(() => {
    if (!isProcessing && activeData && minTimePassed && phase !== 'success') {
      setPhase('success');
    }
  }, [isProcessing, activeData, minTimePassed, phase]);

  // Synchronized success chime via Web Audio when checkmark animates
  useEffect(() => {
    if (phase === 'success' && !chimePlayed.current) {
      chimePlayed.current = true;
      playSuccessChime();
    }
  }, [phase]);

  // Defensive data extraction
  const formattedAmount =
    activeData?.formattedAmount ||
    (activeData?.amount != null ? `$${(activeData.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '');
  const piRefId = activeData?.piRefId || activeData?.id || '';
  const receiverName = activeData?.receiver?.name || activeData?.merchantName || activeData?.name || 'Merchant';
  const piHandle = activeData?.receiver?.piHandle || activeData?.piHandle || '';

  const overlayJSX = (
    <AnimatePresence>
      <motion.div
        key="pc-success-backdrop"
        className="pc-overlay-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={phase === 'success' ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(11,11,11,0.85)',
          backdropFilter: 'blur(8px)',
          padding: 20,
        }}
      >
        {phase === 'success' && (
          <Confetti
            width={winSize.w}
            height={winSize.h}
            recycle={false}
            numberOfPieces={280}
            gravity={0.3}
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
              padding: '36px 24px',
              textAlign: 'center',
              color: '#0B0B0B',
              boxShadow: '0 24px 80px rgba(34,197,94,0.45)',
              maxWidth: 380,
              width: '100%',
            }}
          >
            <div className="pc-pulse-ring" style={{ margin: '0 auto 20px' }}>
              <div className="pc-pulse-dot" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>Processing payment…</div>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, marginTop: 6 }}>
              Securing your PI transfer
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            className="pc-overlay-card"
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: '#22C55E',
              borderRadius: 32,
              padding: '44px 28px',
              textAlign: 'center',
              color: '#0B0B0B',
              boxShadow: '0 30px 100px rgba(34,197,94,0.55)',
              maxWidth: 440,
              width: '100%',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 14 }}
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: '#0B0B0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </motion.div>

            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>
              Payment Successful
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.05, margin: '8px 0 16px', letterSpacing: -1 }}>
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
                marginTop: 22,
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
          width: 80px; height: 80px; border-radius: 50%;
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
          width: 30px; height: 30px; border-radius: 50%; background: #0B0B0B;
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

  // Portal directly to document.body to prevent backdrop stacking bugs with parent modals
  return ReactDOM.createPortal(overlayJSX, document.body);
}
