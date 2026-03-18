import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cowsAPI } from '../services/cowsAPI';
import { feedAPI } from '../services/api';
import './FeedRecommendation.css';

function FeedRecommendation() {
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  const [selectedCowId, setSelectedCowId] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadCows();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const loadCows = async () => {
    try {
      setLoading(true);
      const data = await cowsAPI.getAllCows();
      const activeCows = data.filter((cow) => cow.is_active !== false && cow.status !== 'inactive');
      setCows(activeCows);
      if (activeCows.length > 0) {
        setSelectedCowId(activeCows[0].cow_id);
      }
    } catch (error) {
      console.error('Error loading cows:', error);
      showMessage('error', 'Failed to load cows');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRecommendation = async () => {
    if (!selectedCowId) {
      showMessage('error', 'Please select a cow');
      return;
    }

    setLoadingRecommendation(true);
    try {
      const data = await feedAPI.getFeedRecommendation(selectedCowId);
      setRecommendation(data);
    } catch (error) {
      console.error('Error loading feed recommendation:', error);
      setRecommendation(null);
      showMessage('error', error.message || 'Failed to load feed recommendation');
    } finally {
      setLoadingRecommendation(false);
    }
  };

  return (
    <div className="feed-recommendation-page">
      <div className="feed-recommendation-card">
        <div className="feed-recommendation-header">
          <button type="button" className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div>
            <h1>Feed Recommendation</h1>
            <p>Advisory daily feed recommendation based on cow weight group.</p>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading cows...</div>
        ) : (
          <>
            <div className="recommendation-toolbar">
              <div className="recommendation-field">
                <label htmlFor="cow-selector">Select Cow</label>
                <select
                  id="cow-selector"
                  value={selectedCowId}
                  onChange={(e) => setSelectedCowId(e.target.value)}
                >
                  <option value="">Select Cow</option>
                  {cows.map((cow) => (
                    <option key={cow.cow_id} value={cow.cow_id}>
                      {cow.cow_id} {cow.weight_kg ? `(${cow.weight_kg} kg)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="load-recommendation-button"
                onClick={handleLoadRecommendation}
                disabled={loadingRecommendation || !selectedCowId}
              >
                {loadingRecommendation ? 'Loading...' : 'Show Recommendation'}
              </button>
            </div>

            {recommendation && (
              <div className="recommendation-result">
                <div className="recommendation-summary">
                  <div className="summary-item">
                    <span className="summary-label">Cow</span>
                    <span className="summary-value">{recommendation.cow_id}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Weight</span>
                    <span className="summary-value">{recommendation.weight} kg</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Group</span>
                    <span className="summary-value">{recommendation.group}</span>
                  </div>
                </div>

                <div className="recommendation-list">
                  <h2>Recommended Feed</h2>
                  {recommendation.recommendations.length === 0 ? (
                    <div className="empty-state">No feed rules configured for this weight group.</div>
                  ) : (
                    <div className="recommendation-items">
                      {recommendation.recommendations.map((item) => (
                        <div key={`${recommendation.cow_id}-${item.feed}`} className="recommendation-item">
                          <div>
                            <div className="feed-name">{item.feed}</div>
                            <div className="feed-category">{item.category}</div>
                          </div>
                          <div className="feed-qty">{item.qty_kg} kg</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FeedRecommendation;
