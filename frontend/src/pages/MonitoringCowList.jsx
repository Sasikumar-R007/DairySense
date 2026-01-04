import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { monitoringAPI } from '../services/monitoringAPI';
import './MonitoringCowList.css';

function MonitoringCowList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cows, setCows] = useState([]);
  const [filteredCows, setFilteredCows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCowsList();
  }, [selectedDate]);

  useEffect(() => {
    filterCows();
  }, [cows, searchTerm, statusFilter]);

  const fetchCowsList = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await monitoringAPI.getCowsList(selectedDate);
      setCows(result);
    } catch (err) {
      console.error('Error fetching cows list:', err);
      setError('Failed to load cows list');
    } finally {
      setLoading(false);
    }
  };

  const filterCows = () => {
    let filtered = [...cows];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cow => 
        cow.cowId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(cow => cow.status === statusFilter);
    }

    setFilteredCows(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'NORMAL':
        return <CheckCircle size={20} className="status-icon normal" />;
      case 'SLIGHT_DROP':
        return <AlertCircle size={20} className="status-icon slight-drop" />;
      case 'ATTENTION':
        return <AlertTriangle size={20} className="status-icon attention" />;
      default:
        return <AlertCircle size={20} className="status-icon" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'NORMAL':
        return 'Normal';
      case 'SLIGHT_DROP':
        return 'Slight Drop';
      case 'ATTENTION':
        return 'Attention Needed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="monitoring-cow-list">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading cows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-cow-list">
      <header className="cow-list-header">
        <button 
          className="back-button" 
          onClick={() => navigate('/monitoring')}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Cow Performance</h1>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="date-input-small"
        />
      </header>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input 
            type="text"
            placeholder="Search by Cow ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="status-filters">
          <button 
            className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'NORMAL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('NORMAL')}
          >
            Normal
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'SLIGHT_DROP' ? 'active' : ''}`}
            onClick={() => setStatusFilter('SLIGHT_DROP')}
          >
            Slight Drop
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'ATTENTION' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ATTENTION')}
          >
            Attention
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchCowsList}>Retry</button>
        </div>
      )}

      <div className="cows-grid">
        {filteredCows.length === 0 ? (
          <div className="empty-state">
            <p>No cows found</p>
          </div>
        ) : (
          filteredCows.map(cow => (
            <div 
              key={cow.cowId} 
              className="cow-card"
              onClick={() => navigate(`/monitoring/cows/${cow.cowId}`)}
            >
              <div className="cow-card-header">
                <h3>{cow.cowId}</h3>
                {getStatusIcon(cow.status)}
              </div>
              
              <div className="cow-stats">
                <div className="cow-stat">
                  <span className="stat-label">Today's Milk</span>
                  <span className="stat-value">{cow.todayMilk.toFixed(1)} L</span>
                </div>
                <div className="cow-stat">
                  <span className="stat-label">Today's Feed</span>
                  <span className="stat-value">{cow.todayFeed.toFixed(1)} kg</span>
                </div>
              </div>

              <div className="cow-status-badge">
                <span className={`status-badge ${cow.status.toLowerCase().replace('_', '-')}`}>
                  {getStatusLabel(cow.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MonitoringCowList;

