import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({
  onAddCustomer,
  onEditCustomer,
  onPauseCustomer,
  onViewBill,
  onViewDetails,
  showToast
}) {
  const { apiFetch, user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    pausedCustomers: 0,
    estimatedRevenue: 0
  });

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtering & Pagination State
  const [phoneSearch, setPhoneSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch Dashboard aggregate stats
  const fetchStats = async () => {
    try {
      const res = await apiFetch('/api/stats/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  // Fetch Customer list with search & pagination
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        order
      });
      if (phoneSearch.trim()) {
        params.append('phone', phoneSearch.trim());
      }

      const res = await apiFetch(`/api/customers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to load customers');

      setCustomers(data.customers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, limit, sortBy, order, phoneSearch]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle direct Resume action
  const handleResume = async (customer) => {
    if (!window.confirm(`Resume service for ${customer.name}? Daily billing will resume from today.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/customers/${customer.id}/resume`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resume service');
      showToast(`Service resumed for ${customer.name}!`, 'success');
      fetchStats();
      fetchCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle direct Delete action
  const handleDelete = async (customer) => {
    if (!window.confirm(`Are you sure you want to remove customer ${customer.name}? This will delete all their subscription and pause history.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete customer');
      showToast(`Customer ${customer.name} removed.`, 'success');
      fetchStats();
      fetchCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSortChange = (newSort) => {
    if (sortBy === newSort) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSort);
      setOrder('asc');
    }
    setPage(1);
  };

  return (
    <div className="dashboard">
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title">Tif Tof Operations Dashboard</h1>
          <p className="dashboard-subtitle">
            Tiffin Subscription Management • Welcome, <strong>{user?.name}</strong>. Monitor customer deliveries, handle pauses, and compute pro-rated bills.
          </p>
        </div>
        <button
          id="btn-add-customer"
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onAddCustomer}
        >
          ➕ Add Customer
        </button>
      </div>

      {/* ── Key Metrics Cards ─────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card-icon">👥</div>
          <div className="stat-card-value">{stats.totalCustomers}</div>
          <div className="stat-card-label">Total Registered Customers</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--clr-success)' }}>
          <div className="stat-card-icon">🟢</div>
          <div className="stat-card-value" style={{ color: 'var(--clr-success)' }}>{stats.activeCustomers}</div>
          <div className="stat-card-label">Active Delivering Subscriptions</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--clr-warning)' }}>
          <div className="stat-card-icon">⏸️</div>
          <div className="stat-card-value" style={{ color: 'var(--clr-warning)' }}>{stats.pausedCustomers}</div>
          <div className="stat-card-label">Currently Paused Services</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--clr-primary)' }}>
          <div className="stat-card-icon">💰</div>
          <div className="stat-card-value" style={{ color: 'var(--clr-primary)' }}>
            ₹{Number(stats.estimatedRevenue).toLocaleString('en-IN')}
          </div>
          <div className="stat-card-label">Monthly Active Run-Rate</div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ───────────────────────── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <input
            id="search-phone-input"
            type="text"
            className="search-input"
            placeholder="🔍 Search customer by phone number..."
            value={phoneSearch}
            onChange={(e) => {
              setPhoneSearch(e.target.value);
              setPage(1);
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', fontWeight: 600 }}>Sort by:</span>
            <select
              id="sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="created_at">Date Added</option>
              <option value="name">Customer Name</option>
              <option value="phone">Phone Number</option>
              <option value="monthly_price">Plan Price</option>
              <option value="status">Subscription Status</option>
            </select>

            <button
              id="sort-order-btn"
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
              title={`Toggle sort order (current: ${order.toUpperCase()})`}
            >
              {order === 'asc' ? '⬆️ Ascending' : '⬇️ Descending'}
            </button>

            {phoneSearch && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setPhoneSearch(''); setPage(1); }}
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────── */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Customer List Table ───────────────────────────── */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSortChange('name')}>
                Customer Name {sortBy === 'name' ? (order === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSortChange('phone')}>
                Phone Number {sortBy === 'phone' ? (order === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSortChange('monthly_price')}>
                Monthly Plan {sortBy === 'monthly_price' ? (order === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSortChange('status')}>
                Status {sortBy === 'status' ? (order === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Subscription Start</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--clr-text-secondary)' }}>
                  Loading customer records...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <div className="empty-state-icon">🍱</div>
                    <div className="empty-state-text" style={{ fontWeight: 600, color: 'var(--clr-text)' }}>
                      {phoneSearch ? `No customers found matching "${phoneSearch}"` : 'No customers added yet'}
                    </div>
                    <p style={{ fontSize: 'var(--fs-sm)', marginTop: '0.25rem' }}>
                      {phoneSearch ? 'Try searching another phone number or clear the search filter.' : 'Click "Add Customer" to start managing your tiffin subscriptions.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', textAlign: 'left', fontWeight: 700, color: 'var(--clr-text)', cursor: 'pointer', padding: 0 }}
                      onClick={() => onViewDetails(c.id)}
                    >
                      {c.name}
                    </button>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-sm)' }}>{c.phone}</span>
                  </td>
                  <td>
                    <strong>₹{Number(c.monthly_price || 0).toLocaleString('en-IN')}</strong>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', marginLeft: '4px' }}>/mo</span>
                  </td>
                  <td>
                    <span className={`badge badge-${(c.status || 'ACTIVE').toLowerCase()}`}>
                      ● {c.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)' }}>
                      {c.start_date || 'N/A'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {c.status === 'PAUSED' ? (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleResume(c)}
                          title="Resume daily tiffin service"
                        >
                          ▶️ Resume
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-warning btn-sm"
                          onClick={() => onPauseCustomer(c)}
                          title="Pause service for specified dates"
                        >
                          ⏸️ Pause
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onViewBill(c)}
                        title="Calculate monthly pro-rated bill"
                      >
                        🧾 Bill
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewDetails(c.id)}
                        title="View profile and pause history"
                      >
                        Profile
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEditCustomer(c)}
                        title="Edit customer name and phone"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--clr-danger)' }}
                        onClick={() => handleDelete(c)}
                        title="Delete customer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Controls ───────────────────────────── */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ◀
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            ▶
          </button>

          <span className="pagination-info">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
          </span>
        </div>
      )}
    </div>
  );
}
