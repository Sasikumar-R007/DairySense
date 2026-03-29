import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Calendar, Search, Database } from 'lucide-react';
import { feedAPI } from '../services/api';
import './FeedMasterLog.css';

function FeedMasterLog({ isEmbedded = false }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  
  // Default to last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);

  const fetchData = async (start = fromDate, end = toDate) => {
    try {
      setLoading(true);
      setError('');
      const result = await feedAPI.getAllFeedLogs(start, end);
      setData(result || []);
    } catch (err) {
      console.error('Failed to load master feed logs:', err);
      setError(err.message || 'Failed to load feed log data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchOverall = () => {
    setFromDate('');
    setToDate('');
    fetchData('', '');
  };

  const handleDownloadCSV = () => {
    if (!data.length) return;
    
    // Confirmation before export
    if (!window.confirm(`Are you sure you want to download CSV with ${data.length} records?`)) {
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Cow ID,Session,Category,Feed Type,Quantity (kg)\n";
    
    data.forEach(row => {
      const line = `${new Date(row.date).toLocaleDateString()},${row.cow_id || 'Global Bulk'},${row.session},${row.category_name},${row.item_name},${row.quantity_kg}`;
      csvContent += line + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileNameDateStr = fromDate && toDate ? `${fromDate}_to_${toDate}` : 'Overall';
    link.setAttribute("download", `DairySense_FeedMaster_${fileNameDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="feed-master-page" style={isEmbedded ? { padding: 0, minHeight: 'auto', backgroundColor: 'transparent' } : {}}>
      {!isEmbedded && (
        <div className="dashboard-header-modern">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1>Master Feed Records</h1>
              <p>Comprehensive historical view of farm bulk feed usage</p>
            </div>
          </div>
        </div>
      )}

      <div className="report-controls-card">
        <div className="date-range-selector">
          <div className="date-field">
            <label>From Date</label>
            <div className="input-with-icon">
              <Calendar size={18} className="field-icon" />
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>
          <div className="date-field">
            <label>To Date</label>
            <div className="input-with-icon">
              <Calendar size={18} className="field-icon" />
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <button className="primary-button" onClick={() => fetchData(fromDate, toDate)} disabled={loading}>
            {loading ? <div className="spinner-small"></div> : <Search size={18} />}
            <span>Fetch Selected</span>
          </button>
          
          <button className="secondary-button" style={{ marginLeft: '10px' }} onClick={handleFetchOverall} disabled={loading}>
            {loading ? <div className="spinner-small"></div> : <Database size={18} />}
            <span>Fetch Overall</span>
          </button>
        </div>

        <button 
          className="export-csv-btn" 
          onClick={handleDownloadCSV}
          disabled={!data.length || loading}
        >
          <FileSpreadsheet size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="report-table-container">
        {loading ? (
          <div className="loading-state">Loading feed records...</div>
        ) : data.length === 0 ? (
          <div className="empty-state">No feed records found for the selected criteria.</div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cow ID</th>
                <th>Session</th>
                <th>Category</th>
                <th>Feed Type</th>
                <th>Quantity (kg)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.date).toLocaleDateString()}</td>
                    <td><strong>{row.cow_id || 'Global'}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{row.session || '-'}</td>
                    <td>
                      <span className="category-badge">{row.category_name}</span>
                    </td>
                    <td>{row.item_name}</td>
                    <td className="highlight-green">{Number(row.quantity_kg).toFixed(1)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default FeedMasterLog;
