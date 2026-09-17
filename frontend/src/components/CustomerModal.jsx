import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_TIFFIN_TYPES = [
  '🥗 Standard Veg Thali (4 Roti, Sabzi, Dal, Rice)',
  '🍗 Special Non-Veg Thali (Curry, Rice, Roti)',
  '🌿 Jain Special (Satvik, No Onion/Garlic)',
  '🍱 Mini Lunch Box (3 Roti, Sabzi, Dal)',
  '🥑 High-Protein / Diet Box (Sprouts, Paneer, Salad)',
  '🍱 Both Lunch & Dinner Double Dabba',
  'Custom'
];

export default function CustomerModal({ isOpen, onClose, customerToEdit, onSuccess }) {
  const { apiFetch } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('3000');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tiffinTypeChoice, setTiffinTypeChoice] = useState(DEFAULT_TIFFIN_TYPES[0]);
  const [customTiffinType, setCustomTiffinType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(customerToEdit);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setPhone(customerToEdit.phone || '');
      const existingType = customerToEdit.tiffin_type || customerToEdit.tiffinType || '';
      if (DEFAULT_TIFFIN_TYPES.includes(existingType)) {
        setTiffinTypeChoice(existingType);
        setCustomTiffinType('');
      } else if (existingType) {
        setTiffinTypeChoice('Custom');
        setCustomTiffinType(existingType);
      } else {
        setTiffinTypeChoice(DEFAULT_TIFFIN_TYPES[0]);
        setCustomTiffinType('');
      }
    } else {
      setName('');
      setPhone('');
      setMonthlyPrice('3000');
      setStartDate(new Date().toISOString().split('T')[0]);
      setTiffinTypeChoice(DEFAULT_TIFFIN_TYPES[0]);
      setCustomTiffinType('');
    }
    setError('');
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const getEffectiveTiffinType = () => {
    if (tiffinTypeChoice === 'Custom') {
      return customTiffinType.trim() || 'Custom Meal Plan';
    }
    return tiffinTypeChoice;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const effectiveTiffinType = getEffectiveTiffinType();

    try {
      let res;
      if (isEdit) {
        res = await apiFetch(`/api/customers/${customerToEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            phone,
            tiffinType: effectiveTiffinType
          })
        });
      } else {
        res = await apiFetch('/api/customers', {
          method: 'POST',
          body: JSON.stringify({
            name,
            phone,
            monthlyPrice: parseFloat(monthlyPrice),
            startDate,
            tiffinType: effectiveTiffinType
          })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Action failed');
      }

      onSuccess(isEdit ? 'Customer updated successfully!' : 'Customer added with active subscription!');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            {isEdit ? '✏️ Edit Customer & Tiffin Plan' : '👤 Add New Customer'}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input
              id="cust-name"
              className="form-input"
              type="text"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              id="cust-phone"
              className="form-input"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* ── Tiffin Type / Meal Description ──────────────── */}
          <div className="form-group">
            <label className="form-label">🍱 Tiffin Service Type / Meal Plan</label>
            <select
              id="cust-tiffin-type"
              className="form-input"
              value={tiffinTypeChoice}
              onChange={(e) => setTiffinTypeChoice(e.target.value)}
            >
              {DEFAULT_TIFFIN_TYPES.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {tiffinTypeChoice === 'Custom' && (
            <div className="form-group">
              <label className="form-label">Describe Custom Tiffin Service</label>
              <input
                id="cust-custom-tiffin"
                className="form-input"
                type="text"
                placeholder="e.g. 2 Roti, Brown Rice, Special Salad, Low Oil"
                value={customTiffinType}
                onChange={(e) => setCustomTiffinType(e.target.value)}
                required
              />
            </div>
          )}

          {!isEdit && (
            <>
              <div className="form-group">
                <label className="form-label">Monthly Subscription Price (₹)</label>
                <input
                  id="cust-price"
                  className="form-input"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="3000"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  required
                />
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>
                  Standard monthly rate. 7-day daily billing pro-rates based on days served.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Subscription Start Date</label>
                <input
                  id="cust-startdate"
                  className="form-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button id="cust-submit-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
