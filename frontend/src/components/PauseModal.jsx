import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Helper to count calendar days between two dates (inclusive) for 7-day service
function countDays(startStr, endStr) {
  if (!startStr || !endStr || endStr < startStr) return 0;
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export default function PauseModal({ isOpen, onClose, customer, onSuccess }) {
  const { apiFetch } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(() => todayStr);
  const [endDate, setEndDate] = useState(() => todayStr);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const daysPaused = useMemo(() => {
    return countDays(startDate, endDate);
  }, [startDate, endDate]);

  if (!isOpen || !customer) return null;

  const handleSetTodayOnly = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleSetNextDays = (numDays) => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + numDays - 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (endDate < startDate) {
      setError('Pause End Date cannot be before Start Date.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch(`/api/customers/${customer.id}/pause`, {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to pause subscription');
      }

      onSuccess(`Service paused for ${customer.name} from ${startDate} to ${endDate} (${daysPaused} day${daysPaused > 1 ? 's' : ''} deducted).`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            ⏸️ Pause Service / Tiffin Not Taken
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--clr-text-secondary)' }}
          >
            ×
          </button>
        </div>

        <div style={{ background: 'var(--clr-surface-alt)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--clr-text)' }}>{customer.name}</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-secondary)' }}>📞 {customer.phone}</div>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSetTodayOnly}
            style={{ borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}
          >
            ⚡ Today Only (Not Taken)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleSetNextDays(3)}
          >
            3 Days
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleSetNextDays(7)}
          >
            1 Week (7 Days)
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Pause Start Date</label>
            <input
              id="pause-start"
              className="form-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pause End Date</label>
            <input
              id="pause-end"
              className="form-input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div style={{
            background: 'var(--clr-warning-bg)',
            border: '1px solid var(--clr-warning)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--fs-sm)',
            color: '#92400e'
          }}>
            <strong>7-Day Service Impact Preview:</strong>
            <div>• <strong>{daysPaused} day{daysPaused > 1 ? 's' : ''}</strong> will be deducted from customer's monthly bill.</div>
            <div>• Service runs all 7 days (Monday–Sunday); each paused day reduces the final bill proportionally.</div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button id="pause-submit-btn" type="submit" className="btn btn-warning" disabled={loading}>
              {loading ? 'Processing...' : `Confirm Pause (${daysPaused} Day${daysPaused > 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
