import { useAuth } from '../context/AuthContext';

export default function Navbar({ onLogin, onRegister }) {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>🍱</span> Tif Tof
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', fontWeight: 500, marginLeft: '4px' }}>
          • Tiffin Subscription
        </span>
      </div>
      <div className="navbar-actions">
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
