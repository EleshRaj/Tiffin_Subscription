import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  onLogin,
  onRegister,
  simDate,
  onAdvanceClock,
  onOpenOutbox,
  onOpenImport
}) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tiffinsubs_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tiffinsubs_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🍱</span> <strong>Tif Tof</strong>
        <span className="navbar-tagline" style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', fontWeight: 500 }}>
          • Tiffin Subscription
        </span>
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--clr-bg)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--clr-border)', fontSize: 'var(--fs-xs)' }}>
          <span style={{ fontWeight: 600, color: 'var(--clr-primary)' }}>
            🕒 Sim Date: {simDate || '2026-09-17'}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
            onClick={onAdvanceClock}
            title="Advance simulated clock by 1 day & trigger notifications"
          >
            ⏩ Next Day
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
            onClick={onOpenOutbox}
            title="Inspect generated notification events (/outbox)"
          >
            📬 Outbox
          </button>
        </div>
      )}

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {user && onOpenImport && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenImport}
            title="Import messy CSV customer list"
          >
            📥 Import CSV
          </button>
        )}

        <button
          id="theme-toggle-btn"
          type="button"
          className="btn btn-secondary btn-sm theme-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        {user ? (
          <>
            <span className="navbar-user" style={{ fontSize: 'var(--fs-xs)' }}>👋 {user.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" id="nav-login" onClick={onLogin}>Login</button>
            <button className="btn btn-primary btn-sm" id="nav-register" onClick={onRegister}>Register</button>
          </>
        )}
      </div>
    </nav>
  );
}
