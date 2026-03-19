import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Calendar, Search } from 'lucide-react';
import { reportAPI } from '../services/api';
import './MasterReport.css';

function MasterReport() {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await reportAPI.getMasterReport(fromDate, toDate);
      setData(result);
    } catch (err) {
      console.error('Failed to load master report:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadCSV = () => {
    if (!data.length) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Total Milk (L),Total Feed (kg),Feed Cost (Rs),Active Cows\n";
    
    data.forEach(row => {
      const line = `${row.date},${row.total_milk},${row.total_feed},${row.feed_cost},${row.active_cows}`;
      csvContent += line + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DairySense_MasterReport_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="master-report-page">
      <div className="dashboard-header-modern">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Farm Master Report</h1>
            <p>Historical aggregated data analysis</p>
          </div>
        </div>
      </div>

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
          <button className="primary-button fetch-btn" onClick={fetchData} disabled={loading}>
            {loading ? <div className="spinner-small"></div> : <Search size={18} />}
            <span>Fetch Data</span>
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
          <div className="loading-state">Loading report data...</div>
        ) : data.length === 0 ? (
          <div className="empty-state">No data found for the selected date range.</div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Milk (L)</th>
                <th>Total Feed (kg)</th>
                <th>Feed Cost (Rs)</th>
                <th>Active Cows</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="date-cell">{row.date}</td>
                  <td className="highlight-green">{Number(row.total_milk).toFixed(1)} L</td>
                  <td className="highlight-orange">{Number(row.total_feed).toFixed(1)} kg</td>
                  <td>₹ {Number(row.feed_cost).toFixed(2)}</td>
                  <td>{row.active_cows}</td>
                  <td>
                    {/* Reuses SmartDashboard state via URL param if you want detailed views */}
                    <button 
                      className="view-detail-link"
                      onClick={() => navigate(`/smart-dashboard?date=${row.date}`)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default MasterReport;
