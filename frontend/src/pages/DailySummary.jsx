import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, Trophy, TrendingDown } from 'lucide-react';
import { monitoringAPI } from '../services/monitoringAPI';
import './DailySummary.css';

function DailySummary() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await monitoringAPI.getDailySummary(selectedDate);
      setData(result);
    } catch (err) {
      console.error('Error fetching daily summary:', err);
      setError(err.message || 'Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    
    const summaryText = `
Daily Farm Summary - ${data.date}
================================

Total Feed: ${data.totalFeed.toFixed(1)} kg
Total Milk: ${data.totalMilk.toFixed(1)} L
Yield-to-Feed Ratio: ${data.totalFeed > 0 ? (data.totalMilk / data.totalFeed).toFixed(2) : '0.00'}

Best Performing Cow: ${data.bestCowId || 'N/A'}
Lowest Performing Cow: ${data.lowestCowId || 'N/A'}
`;

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-summary-${data.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="daily-summary">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading summary...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="daily-summary">
        <header className="summary-header">
          <button 
            className="back-button" 
            onClick={() => navigate('/monitoring')}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1>Daily Report</h1>
        </header>
        <div className="error-container">
          <p>{error || 'Summary not available'}</p>
          <button onClick={fetchSummary}>Retry</button>
        </div>
      </div>
    );
  }

  const yieldFeedRatio = data.totalFeed > 0 
    ? (data.totalMilk / data.totalFeed).toFixed(2)
    : '0.00';

  return (
    <div className="daily-summary">
      <header className="summary-header">
        <button 
          className="back-button" 
          onClick={() => navigate('/monitoring')}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Daily Report</h1>
        <div className="date-selector">
          <Calendar size={18} />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </header>

      <div className="summary-content">
        <div className="summary-date-banner">
          <Calendar size={20} />
          <span>{new Date(data.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>

        <div className="summary-stats-grid">
          <div className="summary-stat-card">
            <h3>Total Feed</h3>
            <p className="summary-stat-value">{data.totalFeed.toFixed(1)}</p>
            <span className="summary-stat-unit">kg</span>
          </div>

          <div className="summary-stat-card">
            <h3>Total Milk</h3>
            <p className="summary-stat-value">{data.totalMilk.toFixed(1)}</p>
            <span className="summary-stat-unit">liters</span>
          </div>

          <div className="summary-stat-card highlight">
            <h3>Yield-to-Feed Ratio</h3>
            <p className="summary-stat-value">{yieldFeedRatio}</p>
            <span className="summary-stat-unit">L/kg</span>
          </div>
        </div>

        <div className="performance-section">
          <div className="performance-card best">
            <div className="performance-icon">
              <Trophy size={24} />
            </div>
            <div className="performance-content">
              <h3>Best Performing Cow</h3>
              <p className="performance-id">{data.bestCowId || 'N/A'}</p>
            </div>
          </div>

          <div className="performance-card lowest">
            <div className="performance-icon">
              <TrendingDown size={24} />
            </div>
            <div className="performance-content">
              <h3>Lowest Performing Cow</h3>
              <p className="performance-id">{data.lowestCowId || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="download-section">
          <button className="download-btn" onClick={handleDownload}>
            <Download size={20} />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DailySummary;

