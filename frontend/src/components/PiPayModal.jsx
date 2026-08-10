import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { QrCode, Send, Wallet, X, Search, Copy, Check } from 'lucide-react';
import QrScanner from './QrScanner';
import PaymentSuccessOverlay from './PaymentSuccessOverlay';
import PayCraftMark from './PayCraftLogo';

// Each action is its own distinct, simplified popup (no tab switcher).
const META = {
  pay: {
    title: 'Send PI',
    sub: 'Transfer to a PI Handle, email, or name',
    Icon: Send,
  },
  qr_scan: {
    title: 'Scan QR to Pay',
    sub: 'Scan a PayCraft PI payment QR code',
    Icon: QrCode,
  },
  my_qr: {
    title: 'My Receive QR',
    sub: 'Share your QR to get paid instantly',
    Icon: QrCode,
  },
  topup: {
    title: 'Top Up Wallet',
    sub: 'Add funds to your PayCraft balance',
    Icon: Wallet,
  },
};

const spring = { type: 'spring', stiffness: 320, damping: 30 };

export default function PiPayModal({ isOpen, onClose, action = 'pay', initialPayee = null, onPaymentSuccess }) {
  const { merchant, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState(action);

  // Pay form state
  const [payeeQuery, setPayeeQuery] = useState('');
  const [selectedPayee, setSelectedPayee] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [amountDollars, setAmountDollars] = useState('');
  const [note, setNote] = useState('');

  // TopUp state
  const [topUpAmount, setTopUpAmount] = useState('5000');

  // My QR state
  const [myQrAmount, setMyQrAmount] = useState('');
  const [myQrUrl, setMyQrUrl] = useState('');
  const [myQrPayloadUrl, setMyQrPayloadUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [copied, setCopied] = useState(false);

  // Status & Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);

  // Reset to the requested action each time the modal opens
  useEffect(() => {
    if (isOpen) setActiveTab(action);
  }, [isOpen, action]);

  useEffect(() => {
    if (initialPayee) {
      if (typeof initialPayee === 'string') {
        setPayeeQuery(initialPayee);
        setSelectedPayee({ piHandle: initialPayee, name: initialPayee });
      } else {
        setSelectedPayee(initialPayee);
        setPayeeQuery(initialPayee.piHandle || initialPayee.email || initialPayee.name);
      }
    }
  }, [initialPayee]);

  // Autocomplete payee search
  useEffect(() => {
    if (!payeeQuery || selectedPayee || payeeQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/pi/search?q=${encodeURIComponent(payeeQuery)}`);
        setSearchResults(res.data.results || []);
      } catch (err) {
        console.error('PI Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [payeeQuery, selectedPayee]);

  // Fetch My QR code
  useEffect(() => {
    if (isOpen && activeTab === 'my_qr') {
      fetchMyQr();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, myQrAmount]);

  const fetchMyQr = async () => {
    setLoadingQr(true);
    try {
      const amountCents = myQrAmount ? Math.round(parseFloat(myQrAmount) * 100) : '';
      const res = await api.get(`/pi/qr?amount=${amountCents}&note=PI Payment`);
      setMyQrUrl(res.data.qrDataUrl);
      setMyQrPayloadUrl(res.data.piString || '');
    } catch (err) {
      console.error('Failed to load PI QR:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const targetRecipient = selectedPayee ? selectedPayee.piHandle : payeeQuery;

    if (!targetRecipient) {
      setErrorMessage('Please enter a recipient PI Handle or select a user');
      return;
    }

    const parsedDollars = parseFloat(amountDollars);
    if (isNaN(parsedDollars) || parsedDollars <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    const amountCents = Math.round(parsedDollars * 100);

    setSubmitting(true);
    try {
      const res = await api.post('/pi/transfer', {
        recipient: targetRecipient,
        amount: amountCents,
        note: note || 'Instant PI Payment',
      });

      setSuccessData({
        ...res.data,
        message: 'PI Transfer Sent',
        receiver: { name: selectedPayee?.name || targetRecipient, piHandle: targetRecipient },
      });
      setShowOverlay(true);
      await refreshProfile();
      if (onPaymentSuccess) onPaymentSuccess(res.data);
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'PI transfer failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const parsedDollars = parseFloat(topUpAmount);
    if (isNaN(parsedDollars) || parsedDollars <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    const amountCents = Math.round(parsedDollars * 100);
    setSubmitting(true);
    try {
      const res = await api.post('/pi/topup', { amount: amountCents });
      setSuccessData({
        message: 'Wallet Top-Up Complete',
        piRefId: res.data.piRefId,
        amount: amountCents,
        formattedAmount: `$${parsedDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        receiver: { name: 'Your PayCraft Wallet', piHandle: merchant?.piHandle },
      });
      setShowOverlay(true);
      await refreshProfile();
      if (onPaymentSuccess) onPaymentSuccess(res.data);
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Top up failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle a QR scan result: parse ?pa=&pn=&am= from the URL, or accept a
  // bare PI Handle, and jump straight into the Send PI view with the payee
  // pre-filled. Also handles scannable URLs from Google Lens.
  const handleQrScanResult = (qrPayloadStr) => {
    try {
      let piHandle = '';
      let payeeName = '';
      let amount = '';

      // 1) Full https://.../pay?pa=...&pn=...&am=... URL (most common scan)
      if (/^https?:\/\//i.test(qrPayloadStr) && qrPayloadStr.includes('pa=')) {
        const url = new URL(qrPayloadStr);
        piHandle = url.searchParams.get('pa') || '';
        payeeName = url.searchParams.get('pn') || '';
        amount = url.searchParams.get('am') || '';
      }
      // 2) Bare key=value string (in case the QR encodes just params)
      else if (qrPayloadStr.includes('pa=')) {
        const urlParams = new URLSearchParams(qrPayloadStr.split('?')[1] || qrPayloadStr);
        piHandle = urlParams.get('pa') || '';
        payeeName = urlParams.get('pn') || '';
        amount = urlParams.get('am') || '';
      }
      // 3) Bare PI Handle (just "alex@paycraft")
      else if (qrPayloadStr.includes('@')) {
        piHandle = qrPayloadStr.trim();
      }

      if (!piHandle) {
        setErrorMessage('That QR is not a PayCraft PI payment code.');
        return;
      }

      setSelectedPayee({ piHandle, name: payeeName || piHandle });
      setPayeeQuery(piHandle);
      if (amount) setAmountDollars(amount);
      setActiveTab('pay');
      setErrorMessage('');
    } catch (e) {
      console.error('Invalid QR data', e);
      setErrorMessage('Could not read that QR code.');
    }
  };

  const handleCopyLink = async () => {
    if (!myQrPayloadUrl) return;
    try {
      await navigator.clipboard.writeText(myQrPayloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setShowOverlay(false);
    setErrorMessage('');
    setPayeeQuery('');
    setSelectedPayee(null);
    setAmountDollars('');
    setNote('');
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const meta = META[activeTab] || META.pay;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 11, 11, 0.62)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            className="pi-modal-card"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Header — brand mark + action title */}
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--success-bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PayCraftMark size={38} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                    {meta.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {meta.sub}
                  </p>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={handleClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '10px',
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{
                        backgroundColor: 'var(--danger-bg)',
                        border: '1px solid var(--danger-bd)',
                        color: 'var(--danger)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        marginBottom: '16px',
                      }}
                    >
                      {errorMessage}
                    </motion.div>
                  )}

                  {/* SEND PI */}
                  {activeTab === 'pay' && (
                    <form onSubmit={handlePaySubmit}>
                      <div style={{ marginBottom: '16px', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Payee PI Handle, Email.
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="e.g. mayankgaming179@paycraft"
                            value={payeeQuery}
                            onChange={(e) => {
                              setPayeeQuery(e.target.value);
                              setSelectedPayee(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 14px 12px 38px',
                              borderRadius: '12px',
                              border: selectedPayee ? '2px solid var(--success)' : '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-main)',
                              fontSize: '0.95rem',
                              outline: 'none',
                            }}
                            required
                          />
                          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>

                        {searchResults.length > 0 && !selectedPayee && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: '6px',
                              backgroundColor: 'var(--surface-raised)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '12px',
                              boxShadow: 'var(--shadow-lg)',
                              zIndex: 10,
                              maxHeight: '200px',
                              overflowY: 'auto',
                            }}
                          >
                            {searchResults.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => {
                                  setSelectedPayee(user);
                                  setPayeeQuery(user.piHandle);
                                  setSearchResults([]);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border-subtle)',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <img src={user.avatarUrl} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                <div>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--success)' }}>{user.piHandle}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {selectedPayee && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            backgroundColor: 'var(--success-bg)',
                            border: '1px solid var(--success-bd)',
                            borderRadius: '12px',
                            marginBottom: '16px',
                          }}
                        >
                          <img src={selectedPayee.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPayee.piHandle}`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{selectedPayee.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--success)' }}>Verified Handle: {selectedPayee.piHandle}</div>
                          </div>
                        </div>
                      )}

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Amount (USD)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>$</span>
                          <input
                            type="number"
                            step="1"
                            placeholder="1000"
                            value={amountDollars}
                            onChange={(e) => setAmountDollars(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 14px 12px 34px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-main)',
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              outline: 'none',
                            }}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Add Note (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Lunch split, Project fee"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <motion.button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                        whileHover={{ scale: submitting ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '14px',
                          fontSize: '1rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <Send size={18} />
                        {submitting ? 'Processing PI Transfer...' : `Pay $${amountDollars ? parseFloat(amountDollars).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} Instantly`}
                      </motion.button>
                    </form>
                  )}

                  {/* SCAN QR — live camera on mobile, file upload on desktop */}
                  {activeTab === 'qr_scan' && (
                    <QrScanner
                      onScan={handleQrScanResult}
                      onClose={handleClose}
                    />
                  )}

                  {/* MY QR */}
                  {activeTab === 'my_qr' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Request Specific Amount (Optional)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={myQrAmount}
                          onChange={(e) => setMyQrAmount(e.target.value)}
                          style={{
                            width: '180px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            outline: 'none',
                          }}
                        />
                      </div>

                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring}
                        style={{
                          padding: '16px',
                          backgroundColor: '#ffffff',
                          borderRadius: '16px',
                          display: 'inline-block',
                          boxShadow: 'var(--shadow-md)',
                        }}
                      >
                        {loadingQr ? (
                          <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                            Loading QR...
                          </div>
                        ) : (
                          <img src={myQrUrl} alt="My PI QR" style={{ width: '180px', height: '180px', display: 'block' }} />
                        )}
                      </motion.div>

                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {merchant?.fullName || merchant?.businessName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                          {merchant?.piHandle}
                        </div>
                      </div>

                      {/* Copy Link button — backup when QR can't be scanned */}
                      <motion.button
                        type="button"
                        onClick={handleCopyLink}
                        disabled={!myQrPayloadUrl}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn btn-secondary"
                        style={{
                          marginTop: '14px',
                          padding: '10px 16px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {copied ? <><Check size={14} /> Link Copied!</> : <><Copy size={14} /> Copy Payment Link</>}
                      </motion.button>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                        Share this link if the QR can't be scanned
                      </div>
                    </div>
                  )}

                  {/* TOP UP */}
                  {activeTab === 'topup' && (
                    <form onSubmit={handleTopUpSubmit}>
                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: 'var(--success-bg)',
                          borderRadius: '14px',
                          border: '1px solid var(--success-bd)',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <Wallet size={28} style={{ color: 'var(--success)' }} />
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Wallet Balance</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                            ${((merchant?.walletBalance || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Top-Up Amount (USD)
                        </label>
                        <input
                          type="number"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-main)',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            outline: 'none',
                          }}
                          required
                        />
                      </div>

                      <motion.button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                        whileHover={{ scale: submitting ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '14px',
                          fontSize: '1rem',
                          fontWeight: 700,
                        }}
                      >
                        {submitting ? 'Adding Funds...' : `Add $${(parseFloat(topUpAmount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to PI Wallet`}
                      </motion.button>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {showOverlay && (
                <PaymentSuccessOverlay
                  isProcessing={submitting}
                  data={successData}
                  onClose={handleClose}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
