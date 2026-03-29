import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Calendar,
  Database,
  Milk,
  Settings,
  ShieldAlert,
  Users,
  Utensils,
} from 'lucide-react';
import { monitoringAPI } from '../services/monitoringAPI';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './MonitoringDashboard.css';

function MonitoringDashboard() {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewScope, setViewScope] = useState('daily');
  const [error, setError] = useState('');
  const [ratioHistory, setRatioHistory] = useState([]);
  const [performanceHistory, setPerformanceHistory] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, viewScope]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [result, ratioHistoryRes, performanceRes] = await Promise.all([
        monitoringAPI.getDashboard(viewScope === 'daily' ? selectedDate : null, viewScope),
        monitoringAPI.getRatioHistory(30),
        monitoringAPI.getPerformanceHistory(30)
      ]);
      
      setData(result);
      setRatioHistory(ratioHistoryRes.data || []);
      setPerformanceHistory(performanceRes.data || []);
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
  const totalRecordedDays = data.totalRecordedDays || 0;
  const firstRecordedDate = data.firstRecordedDate || null;
  const lastRecordedDate = data.lastRecordedDate || null;

  const isWorker = currentUser?.role === 'worker';
  const perms = currentUser?.permissions || {};
  const canManageSettings = !isWorker || perms.canManageSettings;

  const actions = [
    {
      label: 'Add New Cow',
      icon: Users,
      onClick: () => navigate('/cows/add'),
      color: '#2563eb'
    },
    {
      label: 'Milk Entry',
      icon: Milk,
      onClick: () => navigate('/milk-log'),
      color: '#10b981'
    },
    {
      label: 'Feed Entry',
      icon: Utensils,
      onClick: () => navigate('/feed-log'),
      color: '#f59e0b'
    },
    {
      label: 'Overall Reports',
      icon: BarChart3,
      onClick: () => navigate('/monitoring/summary'),
      color: '#6366f1'
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
          <h1>Command Center</h1>
        </div>

        <div className="header-right">
          <div className="scope-toggle" role="tablist" aria-label="Dashboard data scope">
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
          {canManageSettings && (
            <button
              className="settings-icon-button"
              onClick={() => navigate('/settings')}
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          )}
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="monitoring-content">
        <div className="summary-date-banner">
          <Calendar size={20} />
          <span>
            {viewScope === 'overall'
              ? totalRecordedDays > 0
                ? `Overall farm data from ${firstRecordedDate} to ${lastRecordedDate}`
                : 'Overall farm data across all recorded dates'
              : (() => {
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

        {viewScope === 'overall' && (
          <div className="overall-info-banner">
            <History size={18} />
            <span>
              {totalRecordedDays > 0
                ? `Showing all recorded farm data across ${totalRecordedDays} day${totalRecordedDays === 1 ? '' : 's'}.`
                : 'No historical farm records are available yet.'}
            </span>
          </div>
        )}

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
            <p className="monitoring-stat-value">{Number(yieldFeedRatio || 0).toFixed(2)} : 1</p>
            <span className="monitoring-stat-unit">L yield per kg feed</span>
          </div>
        </div>

        <div className="monitoring-panels">
          <div className={`status-card-panel ${lowYieldCount > 0 ? 'alert' : ''}`}>
            <div className="status-card-icon">
              <ShieldAlert size={28} />
            </div>
            <div className="status-card-content">
              <h3>Health & Yield Alerts</h3>
              <p className="status-card-value">{lowYieldCount}</p>
              <span className="status-card-label">
                {lowYieldCount === 0 ? 'All cows performing normally' : (lowYieldCount === 1 ? 'cow needs immediate attention' : 'cows showing yield drop')}
              </span>
            </div>
            {lowYieldCount > 0 && (
              <button className="view-alerts-btn" onClick={() => navigate('/monitoring/cows')}>
                View List
              </button>
            )}
          </div>

          <div className="action-panel">
            <h3>Quick Actions</h3>
            <div className="action-grid">
              {actions.map(({ label, icon: Icon, onClick, color }) => (
                <button key={label} className="action-card" onClick={onClick} style={{ borderColor: color }}>
                  <div className="action-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
                    <Icon size={20} />
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="dashboard-charts-row">
          {performanceHistory.length > 0 && (
            <div className="chart-panel main-performance">
              <div className="chart-header">
                <Activity size={20} />
                <h3>Farm Performance (Feed vs Milk)</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" />
                  <Line yAxisId="left" type="monotone" dataKey="milk" stroke="#10b981" strokeWidth={4} name="Total Milk (L)" dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="feed" stroke="#3b82f6" strokeWidth={4} name="Total Feed (kg)" dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {ratioHistory.length > 0 && (
            <div className="chart-panel ratio-trend">
              <div className="chart-header">
                <BarChart3 size={20} />
                <h3>Efficiency Trend (L/kg)</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ratioHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="ratio" stroke="#f59e0b" strokeWidth={3} name="Feed Efficiency" dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonitoringDashboard;
