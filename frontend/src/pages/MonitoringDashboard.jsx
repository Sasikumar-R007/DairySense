import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Milk, 
  Utensils, 
  AlertTriangle, 
  BarChart3,
  Calendar,
  History,
  Settings,
  Database,
  Users
} from 'lucide-react';
import { monitoringAPI } from '../services/monitoringAPI';
import { useAuth } from '../context/AuthContext';
import './MonitoringDashboard.css';

function MonitoringDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await monitoringAPI.getDashboard(selectedDate);
      setData(result);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      // If unauthorized/forbidden, redirect to login
      if (err.message.includes('Invalid or expired token') || err.message.includes('403') || err.message.includes('401')) {
        // Clear any remaining auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        navigate('/', { replace: true });
        return;
      }
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="monitoring-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monitoring-dashboard">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-dashboard">
      {/* Header */}
      <header className="monitoring-header">
        <div className="header-left">
          <h1>Monitoring Dashboard</h1>
          <p className="header-subtitle">Track your dairy operations in real-time</p>
        </div>
        <div className="header-right">
          <button 
            className="settings-btn"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
          <button 
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Date Filter Section with Action Buttons */}
      <div className="date-filter-section">
        <div className="action-buttons-row">
          <button 
            className="action-btn-modern"
            onClick={() => navigate('/monitoring/cows')}
          >
            <BarChart3 size={18} />
            <span>View Cow Performance</span>
          </button>

          <button 
            className="action-btn-modern"
            onClick={() => navigate('/monitoring/summary')}
          >
            <Calendar size={18} />
            <span>Daily Report</span>
          </button>

          <button 
            className="action-btn-modern"
            onClick={() => navigate('/monitoring/history')}
          >
            <History size={18} />
            <span>History</span>
          </button>
        </div>
        <div className="date-input-wrapper">
          <Calendar size={18} className="date-icon" />
          <input 
            id="date-input"
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input-modern"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-cards-modern">
        <div className="stat-card-modern">
          <div className="card-icon-modern users-icon-modern">
            <Users size={22} />
          </div>
          <div className="card-content-modern">
            <h3>Total Cows</h3>
            <p className="stat-value-modern">{data?.totalCows || 0}</p>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="card-icon-modern milk-icon-modern">
            <Milk size={22} />
          </div>
          <div className="card-content-modern">
            <h3>Today's Milk Yield</h3>
            <p className="stat-value-modern">{data?.totalMilk?.toFixed(1) || '0.0'} L</p>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="card-icon-modern feed-icon-modern">
            <Utensils size={22} />
          </div>
          <div className="card-content-modern">
            <h3>Today's Feed</h3>
            <p className="stat-value-modern">{data?.totalFeed?.toFixed(1) || '0.0'} kg</p>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="card-icon-modern ratio-icon-modern">
            <TrendingUp size={22} />
          </div>
          <div className="card-content-modern">
            <h3>Yield-to-Feed Ratio</h3>
            <p className="stat-value-modern">{data?.yieldFeedRatio || '0.00'}</p>
          </div>
        </div>

        <div className="stat-card-modern alert-card-modern">
          <div className="card-icon-modern alert-icon-modern">
            <AlertTriangle size={22} />
          </div>
          <div className="card-content-modern">
            <h3>Low Yield Cows</h3>
            <p className="stat-value-modern">{data?.lowYieldCount || 0}</p>
            <span className="stat-label-modern">Need attention</span>
          </div>
        </div>
      </div>

      {/* Record Management Button */}
      <div className="record-management-section">
        <button 
          className="record-mgmt-btn"
          onClick={() => navigate('/dashboard')}
        >
          <Database size={18} />
          <span>Open Record Management</span>
        </button>
      </div>
    </div>
  );
}

export default MonitoringDashboard;
