import { useState, useEffect } from 'react';

export default function OutboxModal({ onClose, showToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/outbox';
      if (filterDate) {
        url += `?date=${filterDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to fetch outbox:', e);
      showToast('Could not fetch outbox events.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbox();
  }, [filterDate]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📬 Delivery Notification Outbox</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: '1rem' }}>
          Inspects internal notification events produced by <code>POST /clock</code>. The Notification Service writes <code>DELIVERY_DUE</code> events here deterministically for all active, non-paused weekday subscribers.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Filter by Date:</label>
          <input
            type="date"
            className="search-input"
            style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>
              Clear Filter
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchOutbox} style={{ marginLeft: 'auto' }}>
            🔄 Refresh Outbox
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading outbox events...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--clr-bg)', borderRadius: 'var(--radius-md)', color: 'var(--clr-text-secondary)' }}>
            📭 No notification events in outbox for this date.
          </div>
        ) : (
          <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-md)' }}>
            <table className="customers-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Event Date</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Payload Message</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <strong>{ev.eventDate}</strong>
                    </td>
                    <td>{ev.payload?.customerName || `ID #${ev.customerId}`}</td>
                    <td>
                      <code>{ev.phone}</code>
                    </td>
                    <td>
                      <span className="status-badge active" style={{ fontSize: '0.7rem' }}>
                        {ev.eventType}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)' }}>
                      {ev.payload?.message || JSON.stringify(ev.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
