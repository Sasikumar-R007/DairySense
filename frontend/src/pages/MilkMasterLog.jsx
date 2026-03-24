import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Calendar, Search, Database } from 'lucide-react';
import { milkAPI } from '../services/api';
import './MilkMasterLog.css';

function MilkMasterLog({ isEmbedded = false }) {
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
      const result = await milkAPI.getAllMilkLogs(start, end);
      setData(result || []);
    } catch (err) {
      console.error('Failed to load master milk logs:', err);
      setError(err.message || 'Failed to load milk log data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleFetchOverall = () => {
    setFromDate('');
    setToDate('');
    fetchData('', '');
  };

  // Group data by Date + Cow ID
  const groupedData = useMemo(() => {
    const map = new Map();
    data.forEach(row => {
      const dateStr = new Date(row.date).toLocaleDateString();
      const key = `${dateStr}_${row.cow_id}`;
      
      if (!map.has(key)) {
        map.set(key, {
          id: row.id,
          date: dateStr,
          rawDate: row.date,
          cow_id: row.cow_id,
          name: row.name,
          breed: row.breed,
          morning_l: 0,
          evening_l: 0,
          total_l: 0
        });
      }
      
      const entry = map.get(key);
      const qty = Number(row.milk_qty_litre) || 0;
      
      if (row.session.toLowerCase() === 'morning') {
        entry.morning_l += qty;
      } else if (row.session.toLowerCase() === 'evening') {
        entry.evening_l += qty;
      }
      entry.total_l += qty;
    });
    
    // Sort by latest date first, then cow_id
    return Array.from(map.values()).sort((a,b) => {
      const dateDiff = new Date(b.rawDate) - new Date(a.rawDate);
      if (dateDiff !== 0) return dateDiff;
      return a.cow_id.localeCompare(b.cow_id);
    });
  }, [data]);

  const handleDownloadCSV = () => {
    if (!groupedData.length) return;
    
    // Confirmation before export
    if (!window.confirm(`Are you sure you want to download CSV with ${groupedData.length} records?`)) {
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Cow ID,Name,Breed,Morning Yield (L),Evening Yield (L),Total Yield (L)\n";
    
    groupedData.forEach(row => {
      const line = `${row.date},${row.cow_id},${row.name || ''},${row.breed || ''},${row.morning_l.toFixed(1)},${row.evening_l.toFixed(1)},${row.total_l.toFixed(1)}`;
      csvContent += line + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileNameDateStr = fromDate && toDate ? `${fromDate}_to_${toDate}` : 'Overall';
    link.setAttribute("download", `DairySense_MilkMaster_${fileNameDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="milk-master-page" style={isEmbedded ? { padding: 0, minHeight: 'auto', backgroundColor: 'transparent' } : {}}>
      {!isEmbedded && (
        <div className="dashboard-header-modern">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1>Master Milk Records</h1>
              <p>Comprehensive historical view of all milk yields</p>
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
          <button className="primary-button fetch-btn" onClick={() => fetchData(fromDate, toDate)} disabled={loading}>
            {loading ? <div className="spinner-small"></div> : <Search size={18} />}
            <span>Fetch Selected Data</span>
          </button>
          
          <button className="secondary-button fetch-btn" style={{ marginLeft: '10px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }} onClick={handleFetchOverall} disabled={loading}>
            {loading ? <div className="spinner-small"></div> : <Database size={18} />}
            <span>Fetch Overall Data</span>
          </button>
        </div>

        <button 
          className="export-csv-btn" 
          onClick={handleDownloadCSV}
          disabled={!groupedData.length || loading}
        >
          <FileSpreadsheet size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="report-table-container">
        {loading ? (
          <div className="loading-state">Loading milk records...</div>
        ) : groupedData.length === 0 ? (
          <div className="empty-state">No records found for the selected criteria.</div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cow ID</th>
                <th>Name</th>
                <th>Breed</th>
                <th>Morning (L)</th>
                <th>Evening (L)</th>
                <th>Total (L)</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((row) => (
                <tr key={`${row.id}_${row.cow_id}`}>
                  <td>{row.date}</td>
                  <td className="cow-id-cell">{row.cow_id}</td>
                  <td>{row.name || '-'}</td>
                  <td>{row.breed || '-'}</td>
                  <td className="highlight-blue">{row.morning_l > 0 ? row.morning_l.toFixed(1) : '-'}</td>
                  <td className="highlight-orange">{row.evening_l > 0 ? row.evening_l.toFixed(1) : '-'}</td>
                  <td className="highlight-green">{row.total_l.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default MilkMasterLog;
