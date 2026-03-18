import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { cowsAPI } from '../services/cowsAPI';
import { activityAPI } from '../services/api';
import './FarmActivities.css';

function FarmActivities() {
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  const [selectedCowId, setSelectedCowId] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadPendingActivities(selectedCowId || null);
  }, [selectedCowId]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const cowData = await cowsAPI.getAllCows();
      const activeCows = cowData.filter((cow) => cow.is_active !== false && cow.status !== 'inactive');
      setCows(activeCows);
    } catch (error) {
      console.error('Error loading cows:', error);
      showMessage('error', 'Failed to load cows');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingActivities = async (cowId = null) => {
    try {
      setLoading(true);
      const data = await activityAPI.getPendingActivities(cowId);
      setActivities(data);
    } catch (error) {
      console.error('Error loading pending activities:', error);
      setActivities([]);
      showMessage('error', 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCowId) {
      showMessage('error', 'Please select a cow first');
      return;
    }

    setWorking(true);
    try {
      await activityAPI.generateActivities(selectedCowId);
      showMessage('success', 'Activities generated successfully');
      await loadPendingActivities(selectedCowId);
    } catch (error) {
      console.error('Error generating activities:', error);
      showMessage('error', error.message || 'Failed to generate activities');
    } finally {
      setWorking(false);
    }
  };

  const handleMarkCompleted = async (scheduleId) => {
    setWorking(true);
    try {
      await activityAPI.completeActivity(scheduleId, 'Completed');
      showMessage('success', 'Activity marked completed');
      await loadPendingActivities(selectedCowId || null);
    } catch (error) {
      console.error('Error completing activity:', error);
      showMessage('error', error.message || 'Failed to update activity');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="farm-activities-page">
      <div className="farm-activities-card">
        <div className="farm-activities-header">
          <button type="button" className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div>
            <h1>Farm Activities</h1>
            <p>Pending routine activities and alerts for cows.</p>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="activities-toolbar">
          <div className="toolbar-field">
            <label htmlFor="cow-filter">Filter by Cow</label>
            <select
              id="cow-filter"
              value={selectedCowId}
              onChange={(e) => setSelectedCowId(e.target.value)}
            >
              <option value="">All Cows</option>
              {cows.map((cow) => (
                <option key={cow.cow_id} value={cow.cow_id}>
                  {cow.cow_id}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-actions">
            <button type="button" className="secondary-button" onClick={() => loadPendingActivities(selectedCowId || null)} disabled={working}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button type="button" className="primary-button" onClick={handleGenerate} disabled={working || !selectedCowId}>
              {working ? 'Working...' : 'Generate Activities'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="empty-state">No pending activities found.</div>
        ) : (
          <div className="activities-table-wrapper">
            <table className="activities-table">
              <thead>
                <tr>
                  <th>Cow</th>
                  <th>Activity</th>
                  <th>Stage</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.cow_id}</td>
                    <td>{activity.activity_name}</td>
                    <td>{activity.stage_name}</td>
                    <td>{new Date(activity.due_date).toLocaleDateString()}</td>
                    <td>{activity.status}</td>
                    <td className="action-cell">
                      <button
                        type="button"
                        className="complete-button"
                        onClick={() => handleMarkCompleted(activity.id)}
                        disabled={working}
                      >
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        className="view-button"
                        onClick={() => navigate(`/cow-details/${activity.cow_id}`)}
                      >
                        View Cow
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default FarmActivities;
