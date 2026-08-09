import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { Download, Filter, Search } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions', {
        params: { status: filterStatus || undefined }
      });
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterStatus]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.post('/exports/csv');
      if (res.data.csvContent) {
        const blob = new Blob([res.data.csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paycraft_transactions_${Date.now()}.csv`;
        a.click();
      } else {
        alert('CSV Export generated at: ' + res.data.fileUrl);
      }
    } catch (err) {
      alert('Failed to generate export');
    } finally {
      setExporting(false);
    }
  };

  const filtered = transactions.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.customer_email && t.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>Transactions Ledger</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Complete audit log of all merchant payments</p>
        </div>

        <button onClick={handleExportCsv} className="btn btn-secondary" disabled={exporting}>
          <Download size={16} /> {exporting ? 'Generating CSV...' : 'Export CSV'}
        </button>
      </div>

      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by ID, email, description..."
            style={{ paddingLeft: '40px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ width: '180px' }}>
          <select 
            className="form-input" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Customer Email</th>
                  <th>Description</th>
                  <th>Mode</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--primary-light)', whiteSpace: 'nowrap' }}>
                        <Link to={`/dashboard/transactions/${tx.id}`} title={tx.id} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {tx.id.length > 18 ? `${tx.id.slice(0, 8)}...${tx.id.slice(-6)}` : tx.id}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        ${(tx.amount / 100).toFixed(2)} {tx.currency || 'USD'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={tx.status} /></td>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{tx.customer_email || '-'}</td>
                      <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{tx.description || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge badge-${tx.mode || 'test'}`} style={{ whiteSpace: 'nowrap' }}>{tx.mode || 'test'}</span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      No matching transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
