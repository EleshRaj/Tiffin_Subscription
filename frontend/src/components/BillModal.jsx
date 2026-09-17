import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BillModal({ isOpen, onClose, customer }) {
  const { apiFetch } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBill = async (month) => {
    if (!customer) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/customers/${customer.id}/bill?month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to calculate bill');
      setBill(data);
    } catch (err) {
      setError(err.message);
      setBill(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      fetchBill(selectedMonth);
    }
  }, [isOpen, customer, selectedMonth]);

  if (!isOpen || !customer) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            🧾 Monthly Bill & Service Statement
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--clr-text-secondary)' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Select Billing Month</label>
            <input
              id="bill-month-picker"
              type="month"
              className="form-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '180px' }}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            disabled={!bill || loading}
          >
            🖨️ Print / Save PDF
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--clr-text-secondary)' }}>Calculating bill...</div>}

        {!loading && bill && (
          <div className="bill-breakdown">
            <div style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>{bill.customerName}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)' }}>Phone: {bill.customerPhone}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-primary)', fontWeight: 600 }}>
                Period: {selectedMonth} (7-Day Weekly Service)
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text)', fontWeight: 600, marginTop: '2px' }}>
                🍱 Tiffin Type: {bill.tiffinType || 'Standard Veg Thali'}
              </div>
            </div>

            <div className="bill-row">
              <span className="bill-label">Monthly Plan Rate</span>
              <span className="bill-value">₹{Number(bill.monthlyPrice).toLocaleString('en-IN')}</span>
            </div>

            <div className="bill-row">
              <span className="bill-label">Total Delivery Days in Month</span>
              <span className="bill-value">{bill.totalDays || bill.totalWeekdaysInMonth} days</span>
            </div>

            <div className="bill-row">
              <span className="bill-label">Per-Day Rate (Plan ÷ Total Days)</span>
              <span className="bill-value">₹{bill.perDayRate.toFixed(2)}</span>
            </div>

            <div className="bill-row" style={{ color: (bill.pausedDays || bill.pausedWeekdays) > 0 ? 'var(--clr-warning)' : 'inherit' }}>
              <span className="bill-label">Paused Days (Tiffin Not Taken)</span>
              <span className="bill-value">-{(bill.pausedDays !== undefined ? bill.pausedDays : bill.pausedWeekdays)} days</span>
            </div>

            <div className="bill-row" style={{ color: 'var(--clr-success)', fontWeight: 600 }}>
              <span className="bill-label">Actual Days Served</span>
              <span className="bill-value">{bill.daysServed} days</span>
            </div>

            <div className="bill-row total">
              <span className="bill-label">Total Payable Amount</span>
              <span className="bill-value" style={{ color: 'var(--clr-primary)', fontSize: 'var(--fs-2xl)' }}>
                ₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {bill.pauseDetails && bill.pauseDetails.length > 0 ? (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--clr-border)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clr-text-secondary)', marginBottom: '0.5rem' }}>
                  Recorded Pause Intervals in {selectedMonth}
                </div>
                {bill.pauseDetails.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', padding: '0.25rem 0', color: 'var(--clr-text-secondary)' }}>
                    <span>📅 {p.start} to {p.end}</span>
                    <span>{p.daysInMonth} weekdays paused</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: '1rem', fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', textAlign: 'center' }}>
                ✨ No service pauses recorded for this month. Full monthly service provided!
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
