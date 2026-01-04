import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { monitoringAPI } from '../services/monitoringAPI';
import './MonitoringCowDetail.css';

function MonitoringCowDetail() {
  const { cowId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCowDetail();
  }, [cowId, selectedDate]);

  const fetchCowDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await monitoringAPI.getCowDetail(cowId, selectedDate);
      setData(result);
    } catch (err) {
      console.error('Error fetching cow detail:', err);
      setError(err.message || 'Failed to load cow details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="monitoring-cow-detail">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading cow details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="monitoring-cow-detail">
        <header className="cow-detail-header">
          <button 
            className="back-button" 
            onClick={() => navigate('/monitoring/cows')}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1>Cow Details</h1>
        </header>
        <div className="error-container">
          <p>{error || 'Cow not found'}</p>
          <button onClick={fetchCowDetail}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-cow-detail">
      <header className="cow-detail-header">
        <button 
          className="back-button" 
          onClick={() => navigate('/monitoring/cows')}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Cow Details</h1>
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

      <div className="cow-info-section">
        <div className="info-card">
          <h3>Cow Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Cow ID</span>
              <span className="info-value">{data.cowId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Tag ID</span>
              <span className="info-value">{data.tagId}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card today-stat">
          <h3>Today's Stats</h3>
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-label">Milk Yield</span>
              <span className="stat-value-large">{data.today.milk.toFixed(1)} L</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Feed Given</span>
              <span className="stat-value-large">{data.today.feed.toFixed(1)} kg</span>
            </div>
          </div>
        </div>

        <div className="stat-card average-stat">
          <h3>7-Day Average</h3>
          <div className="average-value">
            <span className="stat-value-large">{data.sevenDayAverage.toFixed(1)} L</span>
            <span className="stat-label">milk per day</span>
          </div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-card">
          <h3>Yield Trend (Last 14 Days)</h3>
          {data.yieldTrend && data.yieldTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.yieldTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#8b7355"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  stroke="#8b7355"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Milk (L)', angle: -90, position: 'insideLeft', style: { fill: '#6b5b2e' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff9e6', 
                    border: '1px solid #d4a574',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString();
                  }}
                  formatter={(value) => [`${parseFloat(value).toFixed(1)} L`, 'Milk']}
                />
                <Line 
                  type="monotone" 
                  dataKey="milk" 
                  stroke="#6b8e6b" 
                  strokeWidth={2}
                  dot={{ fill: '#d4a574', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <p>No yield data available for the selected period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonitoringCowDetail;

