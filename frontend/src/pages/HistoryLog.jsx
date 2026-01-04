import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Search } from 'lucide-react';
import { monitoringAPI } from '../services/monitoringAPI';
import './HistoryLog.css';

function HistoryLog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistoryLog();
  }, [fromDate, toDate]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm]);

  const fetchHistoryLog = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!fromDate || !toDate) {
        setError('Please select both start and end dates');
        setLoading(false);
        return;
      }

      if (new Date(fromDate) > new Date(toDate)) {
        setError('Start date must be before end date');
        setLoading(false);
        return;
      }

      const result = await monitoringAPI.getHistoryLog(fromDate, toDate);
      setLogs(result);
    } catch (err) {
      console.error('Error fetching history log:', err);
      setError(err.message || 'Failed to load history log');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (!searchTerm) {
      setFilteredLogs(logs);
      return;
    }

    const filtered = logs.filter(log => 
      log.cowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.lane.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLogs(filtered);
  };

  if (loading) {
    return (
      <div className="history-log">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-log">
      <header className="history-header">
        <button 
          className="back-button" 
          onClick={() => navigate('/monitoring')}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>History Log</h1>
      </header>

      <div className="history-filters">
        <div className="date-range-section">
          <div className="date-input-group">
            <label>
              <Calendar size={16} />
              <span>From Date</span>
            </label>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="date-input-group">
            <label>
              <Calendar size={16} />
              <span>To Date</span>
            </label>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="date-input"
            />
          </div>

          <button 
            className="refresh-btn"
            onClick={fetchHistoryLog}
          >
            Load
          </button>
        </div>

        <div className="search-box">
          <Search size={20} />
          <input 
            type="text"
            placeholder="Search by Cow ID or Lane..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchHistoryLog}>Retry</button>
        </div>
      )}

      <div className="history-table-container">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <p>No history records found for the selected date range</p>
          </div>
        ) : (
          <>
            <div className="table-info">
              <span>Showing {filteredLogs.length} record(s)</span>
            </div>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Cow ID</th>
                    <th>Feed (kg)</th>
                    <th>Milk (L)</th>
                    <th>Lane</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr key={`${log.date}-${log.cowId}-${index}`}>
                      <td>{new Date(log.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</td>
                      <td className="cow-id-cell">{log.cowId}</td>
                      <td>{log.feed.toFixed(1)}</td>
                      <td>{log.milk.toFixed(1)}</td>
                      <td>{log.lane}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HistoryLog;

