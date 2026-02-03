import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Heart, Activity, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
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

  /**
   * Calculate Health Monitoring Status (Rule-Based)
   * Uses feed intake and milk yield to indicate potential health risks
   */
  const calculateHealthStatus = () => {
    if (!data || !data.today || !data.sevenDayHistory || data.sevenDayHistory.length === 0) {
      return { status: 'Unknown', reason: 'Insufficient data', icon: Info };
    }

    const todayMilk = data.today.milk;
    const todayFeed = data.today.feed;
    const avgMilk7d = data.sevenDayAverage || 0;
    const avgFeed7d = data.sevenDayAverageFeed || 0;

    // Rule 1: Milk dropped significantly but feed is normal
    if (todayMilk < 0.8 * avgMilk7d && todayFeed >= avgFeed7d) {
      return {
        status: 'Attention Required',
        reason: 'Milk yield dropped below 80% of average while feed intake remains normal',
        icon: AlertTriangle,
        color: 'warning'
      };
    }

    // Rule 2: Both feed and milk dropped
    if (todayFeed < 0.8 * avgFeed7d && todayMilk < avgMilk7d) {
      return {
        status: 'Observation Needed',
        reason: 'Both feed intake and milk yield are below average',
        icon: AlertCircle,
        color: 'caution'
      };
    }

    // Normal status
    return {
      status: 'Normal',
      reason: 'Feed and milk patterns are within expected range',
      icon: CheckCircle,
      color: 'normal'
    };
  };

  /**
   * Calculate Digestive Efficiency (Feed Conversion Efficiency)
   * FCE = Milk Yield (L) / Feed Intake (kg)
   */
  const calculateDigestiveEfficiency = () => {
    if (!data || !data.today || !data.sevenDayHistory || data.sevenDayHistory.length === 0) {
      return { fce: 0, avgFce7d: 0, efficiency: 'Unknown', trend: 'stable', icon: Minus };
    }

    const todayMilk = data.today.milk;
    const todayFeed = data.today.feed;
    const fce = todayFeed > 0 ? todayMilk / todayFeed : 0;

    // Calculate 7-day average FCE
    const dailyFCEs = data.sevenDayHistory
      .filter(day => day.feed > 0)
      .map(day => day.milk / day.feed);
    const avgFce7d = dailyFCEs.length > 0
      ? dailyFCEs.reduce((sum, val) => sum + val, 0) / dailyFCEs.length
      : 0;

    // Determine efficiency status
    let efficiency = 'Good';
    let icon = TrendingUp;
    if (avgFce7d > 0 && fce < 0.85 * avgFce7d) {
      efficiency = 'Poor';
      icon = TrendingDown;
    } else if (fce >= avgFce7d) {
      efficiency = 'Good';
      icon = TrendingUp;
    } else {
      efficiency = 'Fair';
      icon = Minus;
    }

    // Determine trend
    let trend = 'stable';
    if (dailyFCEs.length >= 2) {
      const recent = dailyFCEs.slice(-3);
      const older = dailyFCEs.slice(0, -3);
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        if (recentAvg > olderAvg * 1.05) trend = 'up';
        else if (recentAvg < olderAvg * 0.95) trend = 'down';
      }
    }

    return { fce, avgFce7d, efficiency, trend, icon };
  };

  /**
   * Detect Heat Pattern (Low Confidence - Data-Based Only)
   * Uses milk yield and feed intake patterns
   */
  const detectHeatPattern = () => {
    if (!data || !data.today || !data.sevenDayHistory || data.sevenDayHistory.length < 3) {
      return { detected: false, confidence: 'low' };
    }

    const todayMilk = data.today.milk;
    const todayFeed = data.today.feed;
    const avgMilk7d = data.sevenDayAverage || 0;
    const avgFeed7d = data.sevenDayAverageFeed || 0;

    // Check if today shows a dip
    const milkDip = todayMilk < 0.85 * avgMilk7d;
    const feedDip = todayFeed < avgFeed7d;

    // Check if similar pattern occurred in previous days
    // Get last 3 days from history (excluding today if it's the last entry)
    const targetDate = new Date(selectedDate);
    const previousDays = data.sevenDayHistory.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate < targetDate;
    }).slice(-3); // Get up to 3 previous days
    
    const similarPatterns = previousDays.filter(day => {
      const dayMilkDip = day.milk < 0.85 * avgMilk7d;
      const dayFeedDip = day.feed < avgFeed7d;
      return dayMilkDip && dayFeedDip;
    }).length;

    if (milkDip && feedDip && similarPatterns >= 1) {
      return { detected: true, confidence: 'low' };
    }

    return { detected: false, confidence: 'low' };
  };

  if (loading) {
    return (
      <div className="monitoring-cow-detail">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
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
            onClick={() => navigate(-1)}
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
              <span className="info-label">RFID Tag ID</span>
              <span className="info-value">{data.tagId || 'N/A'}</span>
            </div>
            {data.name && (
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{data.name}</span>
              </div>
            )}
            {data.cowType && (
              <div className="info-item">
                <span className="info-label">Cow Type</span>
                <span className="info-value">{data.cowType}</span>
              </div>
            )}
            {data.status && (
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value" data-status={data.status.toLowerCase()}>{data.status}</span>
              </div>
            )}
            {data.breed && (
              <div className="info-item">
                <span className="info-label">Breed</span>
                <span className="info-value">{data.breed}</span>
              </div>
            )}
            {data.dateOfBirth && (
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">
                  {new Date(data.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
            )}
            {data.purchaseDate && (
              <div className="info-item">
                <span className="info-label">Purchase Date</span>
                <span className="info-value">
                  {new Date(data.purchaseDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {data.numberOfCalves !== undefined && data.numberOfCalves !== null && (
              <div className="info-item">
                <span className="info-label">Number of Calves</span>
                <span className="info-value">{data.numberOfCalves}</span>
              </div>
            )}
            {data.lastVaccinationDate && (
              <div className="info-item">
                <span className="info-label">Last Vaccination</span>
                <span className="info-value">
                  {new Date(data.lastVaccinationDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {data.nextVaccinationDate && (
              <div className="info-item">
                <span className="info-label">Next Vaccination</span>
                <span className="info-value">
                  {new Date(data.nextVaccinationDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {data.createdAt && (
              <div className="info-item">
                <span className="info-label">Registered On</span>
                <span className="info-value">
                  {new Date(data.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {data.updatedAt && (
              <div className="info-item">
                <span className="info-label">Last Updated</span>
                <span className="info-value">
                  {new Date(data.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {data.notes && (
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <span className="info-label">Notes</span>
                <span className="info-value">{data.notes}</span>
              </div>
            )}
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Milk (L)', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-primary)' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-light)',
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
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--primary)', r: 4 }}
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

      {/* NEW ANALYTICS SECTIONS */}
      <div className="analytics-section">
        {/* Health Monitoring Section */}
        <div className="analytics-card health-card">
          <div className="analytics-header">
            <Heart size={20} className="analytics-icon" />
            <h3>Health Indicators</h3>
          </div>
          {(() => {
            const health = calculateHealthStatus();
            const StatusIcon = health.icon;
            return (
              <div className="analytics-content">
                <div className={`health-status ${health.color}`}>
                  <StatusIcon size={24} />
                  <div className="status-info">
                    <span className="status-label">{health.status}</span>
                    <span className="status-reason">{health.reason}</span>
                  </div>
                </div>
                <div className="health-note">
                  <Info size={14} />
                  <span>Based on feed intake and milk yield patterns. Not a medical diagnosis.</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Digestive Efficiency Section */}
        <div className="analytics-card digestive-card">
          <div className="analytics-header">
            <Activity size={20} className="analytics-icon" />
            <h3>Digestive Efficiency</h3>
          </div>
          {(() => {
            const digestive = calculateDigestiveEfficiency();
            const TrendIcon = digestive.icon;
            return (
              <div className="analytics-content">
                <div className="fce-display">
                  <div className="fce-value">
                    <span className="fce-number">{digestive.fce.toFixed(2)}</span>
                    <span className="fce-unit">L/kg</span>
                  </div>
                  <div className="fce-label">Feed Conversion Efficiency</div>
                </div>
                <div className="fce-details">
                  <div className="fce-stat">
                    <span className="fce-stat-label">7-Day Average:</span>
                    <span className="fce-stat-value">{digestive.avgFce7d.toFixed(2)} L/kg</span>
                  </div>
                  <div className={`fce-efficiency ${digestive.efficiency.toLowerCase()}`}>
                    <TrendIcon size={18} />
                    <span>{digestive.efficiency} Efficiency</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Heat Signature Detection Section */}
        <div className="analytics-card heat-card">
          <div className="analytics-header">
            <Activity size={20} className="analytics-icon" />
            <h3>Heat Pattern Detection</h3>
          </div>
          {(() => {
            const heat = detectHeatPattern();
            return (
              <div className="analytics-content">
                {heat.detected ? (
                  <>
                    <div className="heat-detected">
                      <AlertCircle size={24} />
                      <div className="heat-info">
                        <span className="heat-label">Possible Heat Pattern Detected</span>
                        <span className="heat-confidence">(Data-based, Low Confidence)</span>
                      </div>
                    </div>
                    <div className="heat-note">
                      <Info size={14} />
                      <span>Milk and feed patterns suggest possible heat cycle. This is software-based detection only - no activity sensors available.</span>
                    </div>
                  </>
                ) : (
                  <div className="heat-normal">
                    <CheckCircle size={24} />
                    <span>No heat pattern detected in recent data</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Movement Tracking Section (Disabled) */}
        <div className="analytics-card movement-card disabled">
          <div className="analytics-header">
            <Activity size={20} className="analytics-icon" />
            <h3>Movement Tracking</h3>
          </div>
          <div className="analytics-content">
            <div className="movement-disabled">
              <Activity size={32} className="disabled-icon" />
              <p className="disabled-title">Movement tracking requires activity sensor</p>
              <p className="disabled-description">This feature will be available when activity sensors are installed on the farm.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MonitoringCowDetail;

