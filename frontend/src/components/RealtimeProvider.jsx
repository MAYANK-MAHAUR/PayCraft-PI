import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Wallet, X, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createSSE } from '../realtime/sseClient';
import { playSuccessChime } from '../utils/sound';

const RealtimeContext = createContext(null);
export const useRealtime = () => useContext(RealtimeContext);

const KIND_META = {
  incoming: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', Icon: ArrowDownLeft, label: 'Received' },
  outgoing: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', Icon: ArrowUpRight, label: 'Sent' },
  topup: { color: '#FACC15', bg: 'rgba(250,204,21,0.14)', Icon: Wallet, label: 'Top-Up' },
};

function ToastCard({ toast, onDismiss }) {
  const meta = KIND_META[toast.kind] || KIND_META.incoming;
  const Icon = meta.Icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        width: '340px',
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: '16px',
        boxShadow: '0 18px 40px -16px rgba(0,0,0,0.5)',
        padding: '14px 16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        color: 'var(--text-main)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: meta.bg,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.25 }}>{toast.title}</div>
        {toast.message && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{toast.message}</div>
        )}
        {toast.sub && (
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.sub}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function RealtimeProvider({ children }) {
  const { token, refreshProfile } = useAuth();
  const [toasts, setToasts] = useState([]);
  const sseRef = useRef(null);
  const retryRef = useRef(0);
  const timerRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const full = { id, duration: 6000, ...toast };
    setToasts((prev) => [...prev.slice(-3), full]); // keep at most 4 visible
    if (full.duration > 0) {
      setTimeout(() => dismissToast(id), full.duration);
    }
    return id;
  }, [dismissToast]);

  // Keep the latest handler without re-subscribing the SSE connection.
  const handleEventRef = useRef();
  handleEventRef.current = (type, data) => {
    if (typeof data?.walletBalance === 'number') {
      refreshProfile();
    }
    // Let any open page (e.g. Dashboard) refresh its numbers live.
    window.dispatchEvent(new CustomEvent('paycraft:realtime', { detail: { type, data } }));

    if (type === 'payment.received' || type === 'payment.succeeded') {
      // Play payment confirm chime on incoming transaction!
      playSuccessChime();
      pushToast({
        kind: 'incoming',
        title: `${data.fromName || data.fromHandle || 'Someone'} sent you`,
        message: `${data.formattedAmount || ''} via PI`,
        sub: data.note,
      });
    } else if (type === 'payment.sent') {
      playSuccessChime();
      pushToast({
        kind: 'outgoing',
        title: `Sent ${data.formattedAmount || ''} to ${data.toName || data.toHandle || 'recipient'}`,
        message: 'PI transfer completed',
        sub: data.note,
      });
    } else if (type === 'wallet.topup') {
      playSuccessChime();
      pushToast({
        kind: 'topup',
        title: `Added ${data.formattedAmount || ''} to PI Wallet`,
        message: 'Top-up successful',
      });
    }
  };

  useEffect(() => {
    if (!token) return;
    let closedByUs = false;

    const start = () => {
      const base = import.meta.env.VITE_API_URL || '/api';
      const url = `${base}/events/stream`;
      const conn = createSSE(url, {
        token,
        onOpen: () => {
          retryRef.current = 0;
        },
        onEvent: (type, data) => handleEventRef.current?.(type, data),
        onError: () => {
          if (closedByUs) return;
          retryRef.current = Math.min(retryRef.current + 1, 8);
          const delay = Math.min(1000 * 2 ** retryRef.current, 15000);
          timerRef.current = setTimeout(start, delay);
        },
      });
      sseRef.current = conn;
    };

    start();

    return () => {
      closedByUs = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      sseRef.current?.close();
    };
  }, [token]);

  return (
    <RealtimeContext.Provider value={{ pushToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastCard toast={t} onDismiss={dismissToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </RealtimeContext.Provider>
  );
}
