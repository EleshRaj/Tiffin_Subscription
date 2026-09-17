import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function TransferModal({ customer, onClose, onSuccess, showToast }) {
  const { apiFetch } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [transferDate, setTransferDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    // Fetch customer list to select target transfer customer
    async function loadCustomers() {
      try {
        const res = await apiFetch('/api/customers?limit=100');
        const data = await res.json();
        if (res.ok) {
          // Filter out current customer
          const list = (data.customers || []).filter(c => c.id !== customer.id);
          setCandidates(list);
          if (list.length > 0) {
            setTargetCustomerId(String(list[0].id));
          }
        }
      } catch (e) {
        console.error('Failed to load customers for transfer:', e);
      } finally {
        setFetchLoading(false);
      }
    }
    loadCustomers();
  }, [customer.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetCustomerId) {
      showToast('Please select a target customer to transfer subscription to.', 'error');
      return;
    }
    if (!transferDate) {
      showToast('Please pick a valid transfer effective date.', 'error');
      return;
    }

    const targetCustomer = candidates.find(c => String(c.id) === String(targetCustomerId));
    const confirmMsg = `Transfer subscription from ${customer.name} to ${targetCustomer ? targetCustomer.name : 'selected customer'} starting on ${transferDate}?\n\n• The subscription plan & billing cycle carry over.\n• Days before ${transferDate} will be billed to ${customer.name}.\n• Days from ${transferDate} onward will be billed to the new customer.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);
    try {
      const subId = customer.subscription_id || customer.id;
      const res = await apiFetch(`/api/subscriptions/${subId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newCustomerId: parseInt(targetCustomerId, 10),
          transferDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to transfer subscription');

      showToast(data.message || 'Subscription transferred successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🔀 Mid-Cycle Subscription Transfer</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'var(--clr-bg)', padding: '0.875rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--clr-border)', fontSize: 'var(--fs-sm)' }}>
          <div><strong>Current Owner:</strong> {customer.name} ({customer.phone})</div>
          <div><strong>Subscription Plan:</strong> ₹{customer.monthly_price}/mo ({customer.tiffin_type || 'Standard Veg Thali'})</div>
          <div style={{ color: 'var(--clr-text-secondary)', fontSize: 'var(--fs-xs)', marginTop: '4px' }}>
            Transferring will split the monthly invoice pro-rata between both customers according to weekdays served.
          </div>
        </div>

        {fetchLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading eligible customers...</div>
        ) : candidates.length === 0 ? (
          <div>
            <p style={{ color: 'var(--clr-warning)', marginBottom: '1rem' }}>
              ⚠️ No other registered customers found. Please add the new customer first before transferring.
            </p>
            <button type="button" className="btn btn-secondary w-full" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="target-customer-select">Transfer To New Customer *</label>
              <select
                id="target-customer-select"
                value={targetCustomerId}
                onChange={(e) => setTargetCustomerId(e.target.value)}
                required
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone} {c.status === 'ACTIVE' ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="transfer-date-input">Transfer Effective Date *</label>
              <input
                id="transfer-date-input"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', marginTop: '4px', display: 'block' }}>
                Note: This date becomes the <strong>first service date</strong> of the new customer.
              </span>
            </div>

            <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
