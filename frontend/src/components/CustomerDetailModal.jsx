import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customerId,
  onPause,
  onResume,
  onBill,
  onEdit,
  onDelete
}) {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDetails = async () => {
    if (!customerId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/customers/${customerId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to load details');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadDetails();
    }
  }, [isOpen, customerId]);

  if (!isOpen || !customerId) return null;

  const customer = data?.customer;
  const pauses = data?.pauses || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            👤 Customer Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--clr-text-secondary)' }}
          >
            ×
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading profile...</div>}

        {!loading && customer && (
          <div>
            <div className="detail-header">
              <div className="detail-avatar">
                {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="detail-info">
                <h2>{customer.name}</h2>
                <p>📞 {customer.phone}</p>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className={`badge badge-${customer.status ? customer.status.toLowerCase() : 'active'}`}>
                    ● {customer.status || 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', background: 'var(--clr-surface-alt)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', display: 'block' }}>Monthly Plan</span>
                <strong style={{ fontSize: 'var(--fs-base)', color: 'var(--clr-primary)' }}>
                  ₹{Number(customer.monthly_price || 0).toLocaleString('en-IN')}/mo
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', display: 'block' }}>Subscription Started</span>
                <strong style={{ fontSize: 'var(--fs-base)' }}>{customer.start_date || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', display: 'block' }}>Registered Since</span>
                <strong style={{ fontSize: 'var(--fs-base)' }}>
                  {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', display: 'block' }}>Delivery Schedule</span>
                <strong style={{ fontSize: 'var(--fs-base)', color: 'var(--clr-success)' }}>All 7 Days (Mon–Sun)</strong>
              </div>
            </div>

            <div className="detail-actions">
              {customer.status === 'PAUSED' ? (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => { onClose(); onResume(customer); }}
                >
                  ▶️ Resume Service
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    style={{ background: '#f59e0b', color: '#fff' }}
                    onClick={() => { onClose(); onPause(customer); }}
                  >
                    ⏸️ Pause / Not Taken
                  </button>
                </>
              )}

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => { onClose(); onBill(customer); }}
              >
                🧾 View / Calculate Bill
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { onClose(); onEdit(customer); }}
              >
                ✏️ Edit Info
              </button>

              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => { onClose(); onDelete(customer); }}
              >
                🗑️ Delete
              </button>
            </div>

            <div className="pause-history">
              <h3 style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clr-text-secondary)', marginBottom: '0.75rem' }}>
                Service Pause Log ({pauses.length})
              </h3>
              {pauses.length === 0 ? (
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>
                  No pause records found for this customer.
                </p>
              ) : (
                pauses.map((p) => (
                  <div key={p.id} className="pause-item">
                    <span>⏸️ {p.start_date} → {p.end_date}</span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>
                      Logged {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
