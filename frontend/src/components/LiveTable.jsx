import { useState, useEffect } from 'react';
import { dailyLaneLogAPI } from '../services/api';
import './LiveTable.css';

function LiveTable() {
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial data
    const loadLogs = async () => {
      try {
        const logs = await dailyLaneLogAPI.getTodayLogs();
        setTodayLogs(logs);
        setLoading(false);
      } catch (error) {
        console.error('Error loading logs:', error);
        setLoading(false);
      }
    };

    loadLogs();

    // Poll for updates every 5 seconds (simulating real-time)
    const interval = setInterval(loadLogs, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="live-table">
      <div className="live-table-card">
        <div className="table-header">
          <h2>Today's Daily Lane Log</h2>
          <span className="live-badge">LIVE</span>
        </div>
        <p className="section-description">
          Real-time view of all cows, feed, and milk yield data for today.
        </p>

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : todayLogs.length === 0 ? (
          <div className="empty-state">No entries for today yet.</div>
        ) : (
          <div className="table-wrapper">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Lane No</th>
                  <th>Cow ID</th>
                  <th>Cow Type</th>
                  <th>Feed Given (kg)</th>
                  <th>Morning Yield (L)</th>
                  <th>Evening Yield (L)</th>
                  <th>Total Yield (L)</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.lane_no}</td>
                    <td className="cow-id">{log.cow_id}</td>
                    <td>
                      <span className={`cow-type ${log.cow_type || 'unknown'}`}>
                        {log.cow_type || '-'}
                      </span>
                    </td>
                    <td>{log.feed_given_kg !== null && log.feed_given_kg !== undefined 
                      ? Number(log.feed_given_kg).toFixed(1) 
                      : '-'}</td>
                    <td>{log.morning_yield_l !== null && log.morning_yield_l !== undefined 
                      ? Number(log.morning_yield_l).toFixed(1) 
                      : '-'}</td>
                    <td>{log.evening_yield_l !== null && log.evening_yield_l !== undefined 
                      ? Number(log.evening_yield_l).toFixed(1) 
                      : '-'}</td>
                    <td className="total-yield">
                      {log.total_yield_l !== null && log.total_yield_l !== undefined 
                        ? Number(log.total_yield_l).toFixed(1) 
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {todayLogs.length > 0 && (
          <div className="table-stats">
            <div className="stat-item">
              <span className="stat-label">Total Cows:</span>
              <span className="stat-value">{todayLogs.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Feed:</span>
              <span className="stat-value">
                {todayLogs.reduce((sum, log) => sum + (Number(log.feed_given_kg) || 0), 0).toFixed(1)} kg
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Milk:</span>
              <span className="stat-value">
                {todayLogs.reduce((sum, log) => sum + (Number(log.total_yield_l) || 0), 0).toFixed(1)} L
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTable;

