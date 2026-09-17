import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ImportModal({ onClose, onSuccess, showToast }) {
  const { apiFetch } = useAuth();
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const fileInputRef = useRef(null);

  const sampleCsv = `name,phone,monthly_price,start_date
Rahul Sharma,9876543210,3000,2026-09-01
Rahul Sharma Duplicate,9876543210,3000,01/09/2026
Aman Verma,9876543211,2500,09-02-2026
,9876543212,3000,2026-09-03
Priya Patel,,2800,2026-09-04
Vikram Singh,9876543215,3200,15/09/2026`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tiffin_customers_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!useTextInput && !file) {
      showToast('Please select a CSV file to upload.', 'error');
      return;
    }

    if (useTextInput && !csvText.trim()) {
      showToast('Please paste CSV text to import.', 'error');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (useTextInput) {
        res = await apiFetch('/api/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: csvText
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        // Note: do not set Content-Type header manually for FormData so browser sets boundary
        const token = localStorage.getItem('token');
        res = await fetch('http://localhost:5000/api/customers/import', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import failed');

      setReport(data);
      showToast(`Import completed: ${data.imported} imported, ${data.deduped} deduped, ${data.rejected} rejected.`, 'success');
      onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📥 Bulk Import Customers (CSV)</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: '1rem' }}>
          Upload a CSV file containing customer records. Supports mixed date formats (<code>YYYY-MM-DD</code>, <code>DD/MM/YYYY</code>, <code>DD-MM-YYYY</code>), phone number cleaning, automatic deduplication, and row-level validation.
        </p>

        {report ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--clr-success)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--clr-success)' }}>{report.imported}</div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Imported</div>
              </div>
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--clr-warning)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--clr-warning)' }}>{report.deduped}</div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Deduped</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--clr-danger)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--clr-danger)' }}>{report.rejected}</div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Rejected</div>
              </div>
            </div>

            {report.errors && report.errors.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: 'var(--fs-sm)', marginBottom: '0.5rem', color: 'var(--clr-danger)' }}>
                  ⚠️ Validation Rejections ({report.errors.length}):
                </h4>
                <div style={{ maxHeight: '160px', overflowY: 'auto', background: 'var(--clr-bg)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', fontSize: 'var(--fs-xs)' }}>
                  {report.errors.map((err, idx) => (
                    <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid var(--clr-border)' }}>
                      <strong>Row {err.row}:</strong> {err.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setReport(null)}>Import Another</button>
              <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${!useTextInput ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUseTextInput(false)}
                >
                  📁 File Upload
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${useTextInput ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setUseTextInput(true);
                    if (!csvText) setCsvText(sampleCsv);
                  }}
                >
                  📝 Direct CSV Text
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadSample}
                title="Download standard template with sample messy rows"
              >
                📥 Download Sample CSV
              </button>
            </div>

            {!useTextInput ? (
              <div className="form-group">
                <div
                  style={{
                    border: '2px dashed var(--clr-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: file ? 'rgba(37, 99, 235, 0.05)' : 'var(--clr-bg)'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                  {file ? (
                    <div>
                      <strong style={{ color: 'var(--clr-primary)' }}>{file.name}</strong>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)' }}>
                        {(file.size / 1024).toFixed(1)} KB • Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <strong>Click to select CSV file</strong>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
                        Accepts .csv files (UTF-8)
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Paste Raw CSV Text</label>
                <textarea
                  rows={8}
                  className="search-input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="name,phone,monthly_price,start_date&#10;John Doe,9876543210,3000,2026-09-01"
                />
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Processing & Cleaning...' : 'Run CSV Ingestion'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
