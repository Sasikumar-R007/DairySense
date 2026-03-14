import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Calendar,
  Database,
  History,
  Milk,
  Settings,
  ShieldAlert,
  Users,
  Utensils,
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
      if (
        err.message.includes('Invalid or expired token') ||
        err.message.includes('403') ||
        err.message.includes('401')
      ) {
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
          <div className="loading-spinner">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="monitoring-dashboard">
        <header className="monitoring-header">
          <div className="header-left">
            <button
              className="back-button"
              onClick={() => navigate('/', { state: { allowLanding: true } })}
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h1>Monitoring Dashboard</h1>
          </div>
        </header>
        <div className="error-container">
          <p>{error || 'Dashboard not available'}</p>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  const totalCows = data.totalCows || 0;
  const totalMilk = data.totalMilk || 0;
  const totalFeed = data.totalFeed || 0;
  const lowYieldCount = data.lowYieldCount || 0;
  const yieldFeedRatio = data.yieldFeedRatio || 0;

  const actions = [
    {
      label: 'Cow Performance',
      icon: Activity,
      onClick: () => navigate('/monitoring/cows'),
    },
    {
      label: 'Daily Report',
      icon: Calendar,
      onClick: () => navigate('/monitoring/summary'),
    },
    {
      label: 'History',
      icon: History,
      onClick: () => navigate('/monitoring/history'),
    },
    {
      label: 'Record Management',
      icon: Database,
      onClick: () => navigate('/dashboard'),
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <div className="monitoring-dashboard">
      <header className="monitoring-header">
        <div className="header-left">
          <button
            className="back-button"
            onClick={() => navigate('/', { state: { allowLanding: true } })}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1>Monitoring Dashboard</h1>
        </div>

        <div className="header-right">
          <div className="date-selector">
            <Calendar size={18} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="monitoring-content">
        <div className="summary-date-banner">
          <Calendar size={20} />
          <span>
            {(() => {
              const [year, month, day] = selectedDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            })()}
          </span>
        </div>

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
              {actions.map(({ label, icon: Icon, onClick }) => (
                <button key={label} className="action-card" onClick={onClick}>
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MonitoringDashboard;
