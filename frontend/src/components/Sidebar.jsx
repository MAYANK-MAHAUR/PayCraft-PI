import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Key,
  Webhook,
  Settings,
  BookOpen,
  LogOut,
  Code2,
  Menu,
  X,
} from 'lucide-react';

export default function Sidebar() {
  const { merchant, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/dashboard/keys', label: 'API Keys', icon: Key },
    { to: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
    { to: '/dashboard/PIPAYMENTS', label: 'PI Payments', icon: Code2 },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
    { to: '/docs', label: 'API Docs', icon: BookOpen },
  ];

  return (
    <>
      {/* Mobile Top Header (Visible on <= 900px) */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '8px',
              minWidth: '40px',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22C55E', letterSpacing: '-0.02em' }}>
            PayCraft
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {merchant && (
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ADE80', fontFamily: 'monospace' }}>
              {merchant.piHandle || merchant.email?.split('@')[0]}
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                      background: isActive ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                      borderLeft: isActive ? '3px solid #22C55E' : '3px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.95rem',
                      textDecoration: 'none',
                    })}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            {merchant && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '12px' }}
              >
                <LogOut size={16} /> Logout
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Visible on > 900px) */}
      <aside className="sidebar">
        <div style={{ padding: '22px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#22C55E', margin: 0 }}>
              PayCraft
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              On Zerops
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
          <div style={{ marginBottom: '12px' }}>
            <ThemeToggle />
          </div>
          {merchant && (
            <>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={merchant.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(merchant.email)}`}
                  alt={merchant.fullName || merchant.businessName}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #22C55E' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {merchant.fullName || merchant.businessName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#4ADE80', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {merchant.piHandle || merchant.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
