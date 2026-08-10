import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Cpu, Server, QrCode, Play, X, HelpCircle, Sparkles, CheckCircle2, Video, UserCheck } from 'lucide-react';
import QRCode from '../components/QRCode';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function Landing() {
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      const res = await api.post('/auth/guest');
      login(res.data.token, res.data.merchant);
      navigate('/dashboard');
    } catch (err) {
      console.error('Guest login failed:', err);
    } finally {
      setGuestLoading(false);
    }
  };

  // First visit check: open the tutorial popup.
  useEffect(() => {
    try {
      const seen = localStorage.getItem('paycraft_tutorial_seen');
      if (!seen) setShowTutorialModal(true);
    } catch (e) {}
  }, []);

  // Scroll reveal
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll('.pc-reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('pc-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('pc-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const closeTutorial = () => {
    setShowTutorialModal(false);
    try {
      localStorage.setItem('paycraft_tutorial_seen', 'true');
    } catch (e) {}
  };

  const stack = [
    { title: 'Frontend', desc: 'React SPA served via Static Nginx', badge: 'static' },
    { title: 'API Server', desc: 'Express REST API on Node.js 22', badge: 'nodejs@22' },
    { title: 'Database', desc: 'PostgreSQL 16 relational store', badge: 'postgres' },
    { title: 'Cache Layer', desc: 'Valkey key-value store for rate limits', badge: 'valkey' },
    { title: 'Background Worker', desc: 'Async webhook delivery queue', badge: 'nodejs@22' },
    { title: 'Object Storage', desc: 'S3-compatible bucket for invoices', badge: 'object-storage' },
  ];

  const features = [
    { icon: Zap, tint: 'rgba(34,197,94,.16)', color: '#22C55E', title: 'REST API & Idempotency', body: 'Clean JSON endpoints with strict idempotency key protection via Valkey cache to prevent duplicate payment charges.' },
    { icon: ShieldCheck, tint: 'rgba(250,204,21,.14)', color: '#FACC15', title: 'Dual-Mode API Keys', body: 'Separate pk_test_ and pk_live_ key scopes with Valkey-backed sliding window rate limiting.' },
    { icon: Cpu, tint: 'rgba(34,197,94,.16)', color: '#22C55E', title: 'Async Webhook Worker', body: 'Dedicated background worker that delivers webhooks with exponential backoff retries and detailed logs.' },
  ];

  return (
    <div className={`pc-landing ${isDark ? 'pc-theme-dark' : 'pc-theme-light'}`} ref={rootRef}>
      {/* ---------- scoped styles ---------- */}
      <style>{`
        .pc-landing.pc-theme-dark {
          --pc-black:#0B0B0B; --pc-surface:#161616; --pc-surface-2:#1E1E1E;
          --pc-green:#22C55E; --pc-yellow:#FACC15;
          --pc-text:#F5F5F5; --pc-muted:#A3A3A3;
          --pc-border: rgba(245,245,245,.12);
          --pc-nav-bg: rgba(11,11,11,.85);
        }
        .pc-landing.pc-theme-light {
          --pc-black:#FFFFFF; --pc-surface:#F5F5F5; --pc-surface-2:#ECECEC;
          --pc-green:#16A34A; --pc-yellow:#CA8A04;
          --pc-text:#0B0B0B; --pc-muted:#525252;
          --pc-border: rgba(11,11,11,.12);
          --pc-nav-bg: rgba(255,255,255,.85);
        }
        .pc-landing {
          font-family: var(--font-sans); color: var(--pc-text);
          background: var(--pc-black); overflow-x: hidden;
        }
        .pc-landing h1, .pc-landing h2, .pc-landing h3 { font-family: var(--font-display); letter-spacing: -0.02em; color: var(--pc-text); }

        .pc-btn { background: var(--pc-green); color: var(--pc-black); box-shadow: 5px 5px 0 #000; font-weight: 700; }
        .pc-btn:hover { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 #000; }

        .pc-hero { max-width: 920px; margin: 0 auto; padding: clamp(50px,7vw,90px) 24px 40px; text-align: center; }
        .pc-pill { display:inline-flex; align-items:center; gap:8px; padding:7px 16px; border-radius:999px; background:rgba(34,197,94,.14); border:1px solid rgba(34,197,94,.5); color:var(--pc-green); font-weight:600; font-size:13px; letter-spacing:.04em; animation: pcDrop .7s ease both; }
        .pc-pill .dot { width:9px; height:9px; border-radius:50%; background:var(--pc-green); animation: pcBlink 1.4s infinite; }
        .pc-title { font-size: clamp(38px,6vw,72px); font-weight:800; line-height:1.05; margin:22px 0 18px; animation: pcDrop .8s ease .05s both; }
        .pc-title .hl { color: var(--pc-green); }
        .pc-sub { font-size: clamp(16px,2vw,20px); color:var(--pc-muted); max-width:660px; margin:0 auto 32px; line-height:1.6; animation: pcUp .8s ease .2s both; }
        .pc-cta { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; animation: pcUp .8s ease .32s both; }

        /* Video Demo Card */
        .pc-demo-container { max-width: 860px; margin: 20px auto 40px; padding: 0 24px; animation: pcUp .8s ease .4s both; }
        .pc-demo-card {
          position: relative; border-radius: var(--radius-lg); overflow: hidden;
          background: #000; border: 2px solid var(--pc-green);
          box-shadow: 0 20px 50px -15px rgba(0,0,0,0.5); cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .pc-demo-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 30px 60px -10px rgba(34,197,94,0.3); }
        .pc-demo-thumb { width: 100%; height: 260px; object-fit: cover; opacity: 0.85; filter: brightness(0.9); }
        .pc-demo-overlay {
          position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #fff;
        }
        .pc-play-btn {
          width: 64px; height: 64px; border-radius: 50%; background: var(--pc-green); color: #000;
          display: flex; alignItems: center; justifyContent: center; padding-left: 4px;
          box-shadow: 0 0 25px rgba(34,197,94,0.7); transition: transform 0.2s ease;
        }
        .pc-demo-card:hover .pc-play-btn { transform: scale(1.15); }

        /* Modal Overlay */
        .pc-modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
          animation: pcFadeIn 0.25s ease;
        }
        .pc-modal-content {
          background: var(--pc-surface); border: 1px solid var(--pc-border);
          border-radius: var(--radius-lg); width: 100%; max-width: 640px;
          padding: 32px; position: relative; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.7);
        }

        /* Marquee */
        .pc-marquee { background: var(--pc-black); border-top:1px solid rgba(34,197,94,.25); border-bottom:1px solid rgba(34,197,94,.25); overflow:hidden; padding:16px 0; }
        .pc-marquee-track { display:flex; gap:44px; white-space:nowrap; width:max-content; animation: pcScroll 24s linear infinite; }
        .pc-marquee-track span { font-weight:800; font-size:22px; letter-spacing:.02em; display:inline-flex; align-items:center; gap:44px; color:var(--pc-green); }
        .pc-marquee-track .star { color:var(--pc-yellow); }

        /* Sections */
        .pc-section { max-width:1180px; margin:0 auto; padding: clamp(50px,7vw,86px) 24px; }
        .pc-sec-head { max-width:760px; margin:0 auto 46px; text-align:center; }
        .pc-sec-tag { font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--pc-green); font-size:13px; }
        .pc-sec-head h2 { font-size: clamp(30px,5vw,52px); font-weight:800; margin:12px 0 12px; }
        .pc-sec-head p { color:var(--pc-muted); font-size:17px; line-height:1.6; }

        /* Feature Grid */
        .pc-feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
        .pc-feat { border:1px solid var(--pc-border); border-radius:var(--radius-md); padding:28px 24px; background:var(--pc-surface); box-shadow: var(--shadow-md); transition: transform var(--speed-base) var(--ease), border-color var(--speed-base) var(--ease); }
        .pc-feat:hover { transform: translateY(-6px); border-color: var(--pc-green); }
        .pc-feat .ico { width:52px; height:52px; border-radius:14px; display:grid; place-items:center; margin-bottom:16px; border:1px solid var(--pc-border); }
        .pc-feat h3 { font-size:19px; font-weight:700; margin-bottom:8px; }
        .pc-feat p { color:var(--pc-muted); font-size:14.5px; line-height:1.6; }

        /* Keyframes */
        @keyframes pcDrop { from { opacity:0; transform: translateY(-14px); } to { opacity:1; transform:none; } }
        @keyframes pcUp { from { opacity:0; transform: translateY(22px); } to { opacity:1; transform:none; } }
        @keyframes pcBlink { 0%,100% { opacity:1; } 50% { opacity:.25; } }
        @keyframes pcScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pcFadeIn { from { opacity: 0; } to { opacity: 1; } }


        @media (max-width:880px){
          .pc-feat-grid { grid-template-columns:1fr; }
        }
        @media (max-width:640px){
          .pc-cta { flex-direction: column; align-items: stretch; }
          .pc-cta .btn { width: 100%; text-align: center; justify-content: center; }
          .pc-demo-overlay { padding: 16px; gap: 8px; text-align: center; }
          .pc-modal-content { padding: 20px 16px; width: 94%; margin: 0 auto; }
        }

        .pc-theme-btn {
          padding: 7px 14px; border-radius: 999px; cursor: pointer;
          border: 1px solid var(--pc-green); background: transparent;
          color: var(--pc-green); font-family: var(--font-sans);
          font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;
          transition: transform .15s var(--ease), background-color .15s var(--ease);
        }
        .pc-theme-btn:hover { transform: translateY(-1px); background: rgba(34,197,94,.12); }
      `}</style>

      {/* ---------- NAV ---------- */}
      <header style={{
        padding: '18px clamp(18px,5vw,40px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--pc-border)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50, background: 'var(--pc-nav-bg)',
      }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--pc-green)', whiteSpace: 'nowrap' }}>PayCraft</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" onClick={handleGuestLogin} disabled={guestLoading} className="btn pc-btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={14} /> Guest Demo
          </button>
          <button type="button" className="pc-theme-btn" onClick={() => setShowTutorialModal(true)}>
            <HelpCircle size={14} /> Tutorial Guide
          </button>
          <button type="button" className="pc-theme-btn" onClick={() => setIsDark((v) => !v)}>
            {isDark ? 'White theme' : 'Black theme'}
          </button>
          <Link to="/docs" className="btn btn-secondary btn-sm">API Docs</Link>
          <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="pc-hero">
        <span className="pc-pill"><span className="dot" /> Developer-first payment infra</span>
        <h1 className="pc-title">Payment Infrastructure<br /><span className="hl">Built for Developers</span></h1>
        <p className="pc-sub">Accept payments, manage dual-mode API keys, deliver webhooks with retries, and track transactions in real time powered by 6 native services on Zerops.</p>
        
        <div className="pc-cta" style={{ marginBottom: 30 }}>
          <button type="button" onClick={handleGuestLogin} disabled={guestLoading} className="btn pc-btn btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <UserCheck size={18} /> Continue as Guest <ArrowRight size={18} />
          </button>
          <Link to="/register" className="btn btn-secondary btn-lg">Create Account</Link>
          <button type="button" onClick={() => setShowTutorialModal(true)} className="btn btn-secondary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} /> How to Test
          </button>
        </div>
      </section>

      {/* ---------- INTERACTIVE DEMO CARD ---------- */}
      <section className="pc-demo-container">
        <div className="pc-demo-card" onClick={() => setShowVideoModal(true)}>
          <video className="pc-demo-thumb" muted loop autoPlay playsInline preload="metadata">
            <source src="/demo.mp4" type="video/mp4" />
            <source src="https://raw.githubusercontent.com/MAYANK-MAHAUR/PayCraft-PI/main/demo.mp4" type="video/mp4" />
          </video>
          <div className="pc-demo-overlay">
            <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em', textAlign: 'center' }}>Watch 1-Minute PayCraft Demo Video</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
              Click to expand full screen video
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MARQUEE ---------- */}
      <div className="pc-marquee" aria-hidden="true">
        <div className="pc-marquee-track">
          <span>INSTANT <span className="star">★</span> SECURE <span className="star">★</span> PI <span className="star">★</span> QR PAY <span className="star">★</span> WEBHOOKS <span className="star">★</span> IDEMPOTENT <span className="star">★</span> INSTANT <span className="star">★</span> SECURE <span className="star">★</span> PI <span className="star">★</span> QR PAY <span className="star">★</span> WEBHOOKS <span className="star">★</span> IDEMPOTENT <span className="star">★</span></span>
        </div>
      </div>

      {/* ---------- FEATURES ---------- */}
      <section className="pc-section">
        <div className="pc-sec-head pc-reveal">
          <span className="pc-sec-tag">Why PayCraft</span>
          <h2>Everything you need to get paid</h2>
          <p>A payments stack that's simple to integrate, scales anywhere, and still looks right in five years.</p>
        </div>
        <div className="pc-feat-grid">
          {features.map((f, i) => (
            <div className="pc-feat pc-reveal" key={i}>
              <div className="ico" style={{ background: f.tint, color: f.color }}><f.icon size={24} /></div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
          {/* QR showcase card */}
          <div className="pc-feat pc-reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="ico" style={{ background: 'rgba(250,204,21,.14)', color: 'var(--pc-yellow)' }}><QrCode size={24} /></div>
            <h3>QR &amp; Scan-to-Pay</h3>
            <p style={{ marginBottom: 14 }}>Generate real, scannable payment QR codes for instant mobile checkout - openable with any camera or Google Lens.</p>
            <QRCode value="https://paycraft.app/pay" size={120} />
          </div>
        </div>
      </section>

      {/* ---------- ZEROPS STACK ---------- */}
      <section className="pc-section" style={{ paddingTop: 0 }}>
        <div className="glass-card pc-reveal" style={{ padding: 'clamp(28px,4vw,44px)', background: 'var(--pc-surface)', borderColor: 'var(--pc-border)' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 10, color: 'var(--pc-text)' }}>
            <Server size={24} color="var(--pc-green)" /> Native Zerops Architecture (6 Services)
          </h2>
          <p style={{ color: 'var(--pc-muted)', marginBottom: 24, fontSize: '0.95rem' }}>
            PayCraft is built from the ground up to leverage Zerops's containerized infrastructure and private networking.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {stack.map((srv, idx) => (
              <div key={idx} className="pc-srv-card" style={{ background: 'var(--pc-surface-2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--pc-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: 'var(--pc-text)', fontSize: '0.95rem' }}>{srv.title}</span>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(34,197,94,.16)', color: 'var(--pc-green)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>{srv.badge}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--pc-muted)' }}>{srv.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="pc-section">
        <div className="pc-cta-band pc-reveal">
          <h2>Ready to start accepting payments?</h2>
          <p>Spin up a free account and ship your first charge in minutes. Every account starts with $1,000 paper money.</p>
          <Link to="/register" className="btn btn-lg">Start Building <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer style={{ borderTop: '1px solid var(--pc-border)', padding: '34px clamp(18px,5vw,40px)', textAlign: 'center', color: 'var(--pc-muted)', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 800, color: 'var(--pc-green)', marginBottom: 8 }}>PayCraft</div>
        PayCraft &copy; 2026  Developer Payment Infrastructure, deployed on Zerops.
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => setShowTutorialModal(true)} style={{ background: 'none', border: 'none', color: 'var(--pc-green)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
            Re-open Welcome Tutorial Guide
          </button>
        </div>
      </footer>

      {/* ---------- EXPANDED VIDEO MODAL ---------- */}
      {showVideoModal && (
        <div className="pc-modal-backdrop" onClick={() => setShowVideoModal(false)}>
          <div className="pc-modal-content" style={{ maxWidth: '840px', padding: '20px', background: '#0B0B0B', border: '2px solid var(--pc-green)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Video size={20} color="var(--pc-green)" /> PayCraft Product Walkthrough Demo
              </div>
              <button type="button" onClick={() => setShowVideoModal(false)} className="btn btn-ghost btn-sm" style={{ color: '#fff', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <video controls autoPlay width="100%" style={{ borderRadius: 'var(--radius-md)', outline: 'none', maxHeight: '75vh' }} preload="metadata">
              <source src="/demo.mp4" type="video/mp4" />
              <source src="https://raw.githubusercontent.com/MAYANK-MAHAUR/PayCraft-PI/main/demo.mp4" type="video/mp4" />
              Your browser does not support HTML5 video.
            </video>
          </div>
        </div>
      )}

      {/* ---------- FIRST VISIT TUTORIAL POPUP MODAL ---------- */}
      {showTutorialModal && (
        <div className="pc-modal-backdrop" onClick={closeTutorial}>
          <div className="pc-modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={closeTutorial} className="btn btn-ghost btn-sm" style={{ position: 'absolute', right: 16, top: 16, color: 'var(--pc-muted)' }}>
              <X size={20} />
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', color: 'var(--pc-green)', border: '1px solid rgba(34,197,94,0.4)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              <Sparkles size={14} /> Welcome Tutorial Guide
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 10, color: 'var(--pc-text)' }}>
              Welcome to PayCraft PI
            </h2>

            <p style={{ fontSize: '0.92rem', color: 'var(--pc-muted)', lineHeight: 1.6, marginBottom: 18 }}>
              We built <strong>PayCraft</strong> as a developer-first payment platform around a UPI-style Payment Interface (PI) for instant money movement, real-time analytics, and camera QR checkout.
            </p>

            <div className="glass-card" style={{ padding: '16px', background: 'var(--pc-surface-2)', border: '1px solid var(--pc-border)', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--pc-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={18} color="var(--pc-green)" /> How to Test the System:
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.87rem', color: 'var(--pc-muted)', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.5 }}>
                <li>
                  <strong style={{ color: 'var(--pc-text)' }}>$1,000 Starter Paper Money:</strong> Every new account receives a real starter wallet balance to test live transfers.
                </li>
                <li>
                  <strong style={{ color: 'var(--pc-text)' }}>Two Accounts or Direct Pay:</strong> Create two accounts to send money between handles, or send a payment to <strong style={{ color: 'var(--pc-green)' }}>mayankgaming179@paycraft</strong>.
                </li>
                <li>
                  <strong style={{ color: 'var(--pc-text)' }}>Underlying Infrastructure:</strong> While we built a complete web app for testing, our main focus is the underlying infrastructure (API server, Valkey idempotency, SSE stream, &amp; webhook worker).
                </li>
                <li>
                  <strong style={{ color: 'var(--pc-text)' }}>6 Native Zerops Services:</strong> Deployed natively across Static Nginx, Express API, Worker, PostgreSQL, Valkey Cache, and Object Storage.
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { closeTutorial(); setShowVideoModal(true); }} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Video size={16} /> Watch Demo Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
