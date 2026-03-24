import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Calendar, Search } from 'lucide-react';
import { reportAPI } from '../services/api';
import MilkMasterLog from './MilkMasterLog';
import FeedMasterLog from './FeedMasterLog';
import './MasterReport.css';

function MasterReport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
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
    csvContent += "Cow ID,Name,Type,Status,Total Milk (L),Avg Milk/Day(L),Total Feed (kg)\n";
    
    data.forEach(row => {
      const line = `${row.cow_id},${row.name},${row.cow_type},${row.status},${row.total_milk},${row.avg_milk_per_day},${row.total_feed}`;
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

  const renderGeneralReport = () => (
    <>
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
                <th>Cow ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Total Milk (L)</th>
                <th>Avg Milk/Day</th>
                <th>Total Feed (kg)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="cow-id-cell">{row.cow_id}</td>
                  <td>{row.name}</td>
                  <td>
                    <span className={`status-badge ${row.status === 'active' ? 'active' : 'inactive'}`}>
                      {row.cow_type} ({row.status})
                    </span>
                  </td>
                  <td className="highlight-green">{Number(row.total_milk).toFixed(1)} L</td>
                  <td className="highlight-blue">{Number(row.avg_milk_per_day).toFixed(1)} L/d</td>
                  <td className="highlight-orange">{Number(row.total_feed).toFixed(1)} kg</td>
                  <td>
                    <button 
                      className="view-detail-link"
                      onClick={() => navigate(`/cow-details/${row.cow_id}`)}
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
    </>
  );

  return (
    <div className="master-report-page">
      <div className="dashboard-header-modern" style={{ paddingBottom: '0', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div className="header-left" style={{ marginBottom: '16px' }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Master Reports Hub</h1>
            <p>Unified historical data viewer</p>
          </div>
        </div>
        <div className="erp-tabs-container">
          <button className={`erp-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General Aggregated</button>
          <button className={`erp-tab ${activeTab === 'milk' ? 'active' : ''}`} onClick={() => setActiveTab('milk')}>Milk Yield Log</button>
          <button className={`erp-tab ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}>Farm Feed Log</button>
        </div>
      </div>

      <div className="tab-content" style={{ paddingBottom: '40px' }}>
        {activeTab === 'general' && renderGeneralReport()}
        {activeTab === 'milk' && <MilkMasterLog isEmbedded={true} />}
        {activeTab === 'feed' && <FeedMasterLog isEmbedded={true} />}
      </div>
    </div>
  );
}

export default MasterReport;
