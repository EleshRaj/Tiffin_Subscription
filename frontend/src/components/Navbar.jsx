import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onLogin, onRegister }) {
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
      <div className="navbar-brand">
        <span>🍱</span> Tif Tof
        <span className="navbar-tagline" style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', fontWeight: 500, marginLeft: '4px' }}>
          • Tiffin Subscription
        </span>
      </div>
      <div className="navbar-actions">
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
            <span className="navbar-user">👋 {user.name}</span>
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
