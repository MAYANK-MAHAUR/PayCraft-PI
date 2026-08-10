import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export default function GoogleLoginButton({ onSuccess, onError }) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [scriptError, setScriptError] = useState(false);
  const googleBtnRef = useRef(null);
  const initialized = useRef(false);

  const configured = Boolean(GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGis = () => {
      if (initialized.current) return;
      if (!window.google || !window.google?.accounts?.id) {
        setScriptError(true);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          ux_mode: 'popup',
        });

        if (googleBtnRef.current) {
          const cw = googleBtnRef.current.clientWidth || 360;
          const btnWidth = Math.min(400, Math.max(200, cw));
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: btnWidth,
          });
        }
        initialized.current = true;
      } catch (e) {
        console.error('[GoogleLoginButton] GIS initialization failed', e);
        setScriptError(true);
      }
    };

    if (window.google && window.google.accounts && window.google.accounts.id) {
      initGis();
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initGis;
    script.onerror = () => setScriptError(true);
    document.body.appendChild(script);
  }, []);

  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setStatusMsg('');
      if (onError) onError('Google sign-in did not return a credential.');
      return;
    }

    setLoading(true);
    setStatusMsg('Verifying with Google…');
    try {
      await loginWithGoogle({ credential: response.credential });
      setStatusMsg('Signed in! Opening your dashboard…');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      setStatusMsg('');
      const msg = err.response?.data?.error?.message || err.message || 'Google login failed';
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-auth-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {loading && (
        <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
          Authenticating with Google…
        </div>
      )}

      {/* Official Google Identity Button rendered by GIS SDK */}
      <div 
        ref={googleBtnRef} 
        style={{ 
          minHeight: '44px', 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center',
          overflow: 'hidden'
        }} 
      />

      {statusMsg && (
        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {statusMsg}
        </div>
      )}

      {scriptError && (
        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#ef4444', textAlign: 'center' }}>
          Google Sign-In library could not load.
        </div>
      )}
    </div>
  );
}
