import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Terminal, Monitor, Download, RefreshCw, Activity,
  Calendar, Database, History, Milk, ShieldAlert,
  Users, Utensils, BarChart3
} from 'lucide-react';
import ScanCow from '../components/ScanCow';
import RecordMilkYield from '../components/RecordMilkYield';
import LiveTable from '../components/LiveTable';
import { monitoringAPI } from '../services/monitoringAPI';
import { reportAPI } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import './MonitoringDashboard.css';

function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Terminal state
  const [activeTab, setActiveTab] = useState('scan');
  const [showAdvancedTracking, setShowAdvancedTracking] = useState(false);

  // Monitoring Dashboard state
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewScope, setViewScope] = useState('daily');
  const [error, setError] = useState('');
  const [ratioHistory, setRatioHistory] = useState([]);
  
  // Download state
  const [downloading, setDownloading] = useState(false);

  const getUserDisplayName = () => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    if (currentUser?.phoneNumber) return currentUser.phoneNumber;
    return 'User';
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, viewScope]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [result, ratioHistoryRes] = await Promise.all([
        monitoringAPI.getDashboard(viewScope === 'daily' ? selectedDate : null, viewScope),
        monitoringAPI.getRatioHistory(30)
      ]);
      setData(result);
      setRatioHistory(ratioHistoryRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const blob = await reportAPI.downloadDailyReport(selectedDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DairySense_Report_${selectedDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download PDF report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const totalCows = data?.totalCows || 0;
  const totalMilk = data?.totalMilk || 0;
  const totalFeed = data?.totalFeed || 0;
  const lowYieldCount = data?.lowYieldCount || 0;
  const yieldFeedRatio = data?.yieldFeedRatio || 0;

  return (
    <>
      <header className="content-header" style={{ marginBottom: '16px' }}>
        <div className="header-titles">
          <h1>Command Center</h1>
          <p>Welcome back, {getUserDisplayName()}. Here's your quick access to farm operations.</p>
        </div>
        <div className="header-widgets" style={{ display: 'flex', gap: '12px' }}>
          <div className="status-indicator">
            <span className="ping"></span>
            System Online
          </div>
          <button 
            onClick={handleDownloadReport} 
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {downloading ? <RefreshCw size={16} className="spinning" /> : <Download size={16} />}
            PDF Report
          </button>
        </div>
      </header>

      <div className="monitoring-content" style={{ marginTop: '0', maxWidth: '100%', padding: '0 40px' }}>
        {/* Scope and Date Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="scope-toggle" role="tablist">
            <button
              type="button"
              className={viewScope === 'daily' ? 'active' : ''}
              onClick={() => setViewScope('daily')}
            >
              Daily
            </button>
            <button
              type="button"
              className={viewScope === 'overall' ? 'active' : ''}
              onClick={() => setViewScope('overall')}
            >
              Overall
            </button>
          </div>
          {viewScope === 'daily' && (
            <div className="date-selector">
              <Calendar size={18} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>
          )}
        </div>

        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading Command Center metrics...</div>
        ) : (
          <>
            <div className="monitoring-stats-grid">
              <div className="monitoring-stat-card">
                <div className="stat-card-header">
                  <Users size={18} />
                  <h3>Total Cows</h3>
                </div>
                <p className="monitoring-stat-value">{totalCows}</p>
                <span className="monitoring-stat-unit">active cows</span>
              </div>

              <div className="monitoring-stat-card">
                <div className="stat-card-header">
                  <Milk size={18} />
                  <h3>Milk Output</h3>
                </div>
                <p className="monitoring-stat-value">{totalMilk.toFixed(1)}</p>
                <span className="monitoring-stat-unit">liters</span>
              </div>

              <div className="monitoring-stat-card">
                <div className="stat-card-header">
                  <Utensils size={18} />
                  <h3>Feed Used</h3>
                </div>
                <p className="monitoring-stat-value">{totalFeed.toFixed(1)}</p>
                <span className="monitoring-stat-unit">kg</span>
              </div>

              <div className="monitoring-stat-card highlight">
                <div className="stat-card-header">
                  <BarChart3 size={18} />
                  <h3>Yield-to-Feed Ratio</h3>
                </div>
                <p className="monitoring-stat-value">{Number(yieldFeedRatio).toFixed(2)}</p>
                <span className="monitoring-stat-unit">L/kg</span>
              </div>
            </div>

            <div className="monitoring-panels">
              <div className={`status-card-panel ${lowYieldCount > 0 ? 'alert' : ''}`}>
                <div className="status-card-icon">
                  <ShieldAlert size={22} />
                </div>
                <div className="status-card-content">
                  <h3>Alert Indication</h3>
                  <p className="status-card-value">{lowYieldCount}</p>
                  <span className="status-card-label">
                    {lowYieldCount === 1 ? 'cow needs attention' : 'cows need attention'}
                  </span>
                </div>
              </div>

              <div className="action-panel">
                <h3>Quick Actions</h3>
                <div className="action-grid">
                  <button className="action-card" onClick={() => navigate('/monitoring/cows')}>
                    <Activity size={18} /> <span>Cow Performance</span>
                  </button>
                  <button className="action-card" onClick={() => navigate('/monitoring/summary')}>
                    <Calendar size={18} /> <span>Daily Report</span>
                  </button>
                  <button className="action-card" onClick={() => navigate('/monitoring/history')}>
                    <History size={18} /> <span>History</span>
                  </button>
                  <button className="action-card" onClick={() => navigate('/master-report')}>
                    <Database size={18} /> <span>Master Archives</span>
                  </button>
                </div>
              </div>
            </div>
            
            {ratioHistory.length > 0 && (
              <div className="ratio-history-panel" style={{ marginTop: '24px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <BarChart3 size={20} /> Yield-to-Feed Ratio History (30 Days)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ratioHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ratio" stroke="#f59e0b" strokeWidth={3} name="Yield/Feed Ratio" dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      <div className="dashboard-grid" style={{ marginTop: '24px', paddingTop: '0' }}>
        {/* Terminal / Advanced Tracking */}
        <div className="advanced-terminal-panel">
          <div className="terminal-header">
            <div className="terminal-title">
              <Terminal size={18} />
              <h2>Farm Data Terminal</h2>
            </div>
            <button 
              className={`terminal-toggle ${showAdvancedTracking ? 'active' : ''}`}
              onClick={() => setShowAdvancedTracking(!showAdvancedTracking)}
            >
              {showAdvancedTracking ? 'Disconnect Terminal' : 'Initialize Terminal'}
            </button>
          </div>

          {showAdvancedTracking ? (
            <div className="terminal-workspace">
              <div className="terminal-tabs">
                <button 
                  className={`t-tab ${activeTab === 'scan' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scan')}
                >
                  RFID / Visual Scan
                </button>
                <button 
                  className={`t-tab ${activeTab === 'milk' ? 'active' : ''}`}
                  onClick={() => setActiveTab('milk')}
                >
                  Milk Entry System
                </button>
                <button 
                  className={`t-tab ${activeTab === 'table' ? 'active' : ''}`}
                  onClick={() => setActiveTab('table')}
                >
                  Live Data Stream
                </button>
              </div>
              <div className="terminal-body render-area">
                {activeTab === 'scan' && <ScanCow />}
                {activeTab === 'milk' && <RecordMilkYield />}
                {activeTab === 'table' && <LiveTable />}
              </div>
            </div>
          ) : (
            <div className="terminal-idle">
              <Monitor size={48} className="idle-icon" />
              <h3>Terminal Offline</h3>
              <p>Initialize the terminal to access real-time hardware scanning, entry overlays, and live monitoring streams.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
