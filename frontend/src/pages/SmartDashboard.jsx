import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Milk, Wheat, Users, Activity, TrendingUp, TrendingDown, Bell, Filter, Download, Database } from 'lucide-react';
import { dashboardAPI, reportAPI } from '../services/api';
import './SmartDashboard.css';

function SmartDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [downloading, setDownloading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchDashboardData = async (dateStr) => {
    try {
      setLoading(true);
      setError('');
      const data = await dashboardAPI.getDashboardData(dateStr);
      setData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // apiRequest throws an error object directly if response is not ok
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(date);
  }, [date]);

  const handleRefresh = () => {
    fetchDashboardData(date);
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const blob = await reportAPI.downloadDailyReport(date);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DairySense_Report_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download PDF report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="smart-dashboard-page">
      <div className="dashboard-header-modern">
        <button type="button" className="modern-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="title-section">
          <h1>Smart Farm Monitoring</h1>
          <p>Combined insights for today's performance</p>
        </div>
        <div className="controls-section">
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="modern-date-picker"
          />
          <button type="button" className="modern-refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
          <button type="button" className="modern-download-btn secondary" onClick={() => navigate('/record-management')}>
            <Activity size={18} />
            <span className="hide-mobile">Record Mgmt</span>
          </button>
          <button type="button" className="modern-download-btn secondary" onClick={() => navigate('/master-report')}>
            <Database size={18} />
            <span className="hide-mobile">Master Report</span>
          </button>
          <button type="button" className="modern-download-btn" onClick={() => setShowConfirmModal(true)} disabled={downloading}>
            {downloading ? <div className="spinner-small"></div> : <Download size={18} />}
            <span className="hide-mobile">PDF Report</span>
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && !data ? (
        <div className="loading-state-modern">
          <div className="spinner"></div>
          <p>Loading farm insights...</p>
        </div>
      ) : (
        data && (
          <div className="dashboard-grid">
            
            {/* Milk Summary Card */}
            <div className="kpi-card milk-card">
              <div className="card-header">
                <Milk size={28} className="icon" />
                <h2>Milk Summary</h2>
              </div>
              <div className="card-content">
                <div className="big-metric">
                  <span className="value">{data.milk.total}</span>
                  <span className="unit">Litres Total</span>
                </div>
                <div className="sub-metrics">
                  <div className="sub-metric">
                    <span className="label">Average/Cow</span>
                    <span className="val">{data.milk.average} L</span>
                  </div>
                  <div className="sub-metric tooltip-container">
                    <span className="label">Top Performer</span>
                    <span className="val highlight">{data.milk.top_cow || 'N/A'}</span>
                  </div>
                  <div className="sub-metric">
                    <span className="label">Low Performer</span>
                    <span className="val warning">{data.milk.low_cow || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed Summary Card */}
            <div className="kpi-card feed-card">
              <div className="card-header">
                <Wheat size={28} className="icon" />
                <h2>Feed Summary</h2>
              </div>
              <div className="card-content">
                <div className="big-metric">
                  <span className="value">{data.feed.total_kg}</span>
                  <span className="unit">kg Total Feed</span>
                </div>
                <div className="sub-metrics single-col">
                  <div className="sub-metric banner-style">
                    <span className="label">Total Estimated Cost</span>
                    <span className="val cost">₹{data.feed.total_cost}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cow Status Card */}
            <div className="kpi-card cows-card">
              <div className="card-header">
                <Users size={28} className="icon" />
                <h2>Cow Status</h2>
              </div>
              <div className="card-content">
                <div className="big-metric mini">
                  <div>
                    <span className="value">{data.cows.total}</span>
                    <span className="unit">Total Cows</span>
                  </div>
                  <div>
                    <span className="value accent">{data.cows.active}</span>
                    <span className="unit">Active</span>
                  </div>
                </div>
                <div className="status-bars">
                  <div className="status-row">
                    <span>Milking ({data.cows.milking})</span>
                    <div className="bar-bg"><div className="bar-fill blue" style={{ width: `${(data.cows.milking / Math.max(1, data.cows.active)) * 100}%` }}></div></div>
                  </div>
                  <div className="status-row">
                    <span>Pregnant ({data.cows.pregnant})</span>
                    <div className="bar-bg"><div className="bar-fill purple" style={{ width: `${(data.cows.pregnant / Math.max(1, data.cows.active)) * 100}%` }}></div></div>
                  </div>
                  <div className="status-row">
                    <span>Sick/Recovering ({data.cows.sick})</span>
                    <div className="bar-bg"><div className="bar-fill red" style={{ width: `${(data.cows.sick / Math.max(1, data.cows.active)) * 100}%` }}></div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Alerts Card */}
            <div className="kpi-card alerts-card">
              <div className="card-header">
                <Bell size={28} className="icon" />
                <h2>Activity Alerts</h2>
              </div>
              <div className="card-content centered">
                <div className="alert-circles">
                  <div className="alert-circle pending">
                    <span className="number">{data.activities.pending}</span>
                    <span className="lbl">Pending</span>
                  </div>
                  <div className="alert-circle completed">
                    <span className="number">{data.activities.completed}</span>
                    <span className="lbl">Completed</span>
                  </div>
                </div>
                <button className="goto-btn" onClick={() => navigate('/farm-activities')}>
                  Manage Activities &rarr;
                </button>
              </div>
            </div>

            {/* Performance Metrics Card */}
            <div className="kpi-card performance-card">
              <div className="card-header">
                <Activity size={28} className="icon" />
                <h2>Performance Metrics</h2>
              </div>
              <div className="card-content">
                <div className="performance-item up">
                  <TrendingUp size={36} className="trend-icon" />
                  <div className="details">
                    <span className="value">{data.performance.improved}%</span>
                    <span className="label">Cows Improved (vs Yesterday)</span>
                  </div>
                </div>
                <div className="performance-item down">
                  <TrendingDown size={36} className="trend-icon" />
                  <div className="details">
                    <span className="value">{data.performance.reduced}%</span>
                    <span className="label">Cows Reduced (vs Yesterday)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )
      )}
    </div>
  );
}

export default SmartDashboard;
