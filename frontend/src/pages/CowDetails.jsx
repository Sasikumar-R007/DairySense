import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { cowsAPI } from '../services/cowsAPI';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './CowDetails.css';

function CowDetails() {
  const { cowId } = useParams();
  const navigate = useNavigate();
  const [cow, setCow] = useState(null);
  const [feedHistory, setFeedHistory] = useState([]);
  const [milkHistory, setMilkHistory] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [daysRange, setDaysRange] = useState(30);
  
  const [editForm, setEditForm] = useState({
    name: '',
    cow_type: 'normal',
    breed: '',
    date_of_birth: '',
    purchase_date: '',
    last_vaccination_date: '',
    next_vaccination_date: '',
    number_of_calves: 0,
    notes: ''
  });

  useEffect(() => {
    loadCowData();
  }, [cowId, daysRange]);

  const loadCowData = async () => {
    try {
      setLoading(true);
      const [cowData, feedData, milkData, medsData] = await Promise.all([
        cowsAPI.getCowById(cowId),
        cowsAPI.getFeedHistory(cowId, daysRange),
        cowsAPI.getMilkHistory(cowId, daysRange),
        cowsAPI.getMedications(cowId)
      ]);

      if (!cowData) {
        showMessage('error', 'Cow not found');
        navigate('/cows');
        return;
      }

      setCow(cowData);
      setEditForm({
        name: cowData.name || '',
        cow_type: cowData.cow_type || 'normal',
        breed: cowData.breed || '',
        date_of_birth: cowData.date_of_birth || '',
        purchase_date: cowData.purchase_date || '',
        last_vaccination_date: cowData.last_vaccination_date || '',
        next_vaccination_date: cowData.next_vaccination_date || '',
        number_of_calves: cowData.number_of_calves || 0,
        notes: cowData.notes || ''
      });

      // Process feed history for chart
      const processedFeed = feedData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        feed: parseFloat(item.total_feed) || 0
      })).reverse();

      // Process milk history for chart
      const processedMilk = milkData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        morning: parseFloat(item.morning_yield) || 0,
        evening: parseFloat(item.evening_yield) || 0,
        total: parseFloat(item.total_yield) || 0
      })).reverse();

      setFeedHistory(processedFeed);
      setMilkHistory(processedMilk);
      setMedications(medsData);
    } catch (error) {
      console.error('Error loading cow data:', error);
      showMessage('error', 'Failed to load cow details');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    if (cow) {
      setEditForm({
        name: cow.name || '',
        cow_type: cow.cow_type || 'normal',
        breed: cow.breed || '',
        date_of_birth: cow.date_of_birth || '',
        purchase_date: cow.purchase_date || '',
        last_vaccination_date: cow.last_vaccination_date || '',
        next_vaccination_date: cow.next_vaccination_date || '',
        number_of_calves: cow.number_of_calves || 0,
        notes: cow.notes || ''
      });
    }
  };

  const handleSave = async () => {
    try {
      const updatedCow = await cowsAPI.updateCow(cowId, editForm);
      setCow(updatedCow);
      setEditing(false);
      showMessage('success', 'Cow details updated successfully');
    } catch (error) {
      console.error('Error updating cow:', error);
      showMessage('error', `Error: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'number_of_calves' ? parseInt(value) || 0 : value
    }));
  };

  // Calculate statistics
  const totalFeed = feedHistory.reduce((sum, item) => sum + item.feed, 0);
  const totalMilk = milkHistory.reduce((sum, item) => sum + item.total, 0);
  const avgDailyMilk = milkHistory.length > 0 ? totalMilk / milkHistory.length : 0;

  if (loading) {
    return (
      <div className="cow-details">
        <div className="loading-state">Loading cow details...</div>
      </div>
    );
  }

  if (!cow) {
    return null;
  }

  return (
    <div className="cow-details">
      <div className="cow-details-card">
        <div className="page-header">
          <div>
            <button onClick={() => navigate(-1)} className="back-button">
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2>Cow Details: {cow.cow_id}</h2>
          </div>
          {!editing && (
            <button onClick={handleEdit} className="edit-button">
              <Edit size={18} />
              <span>Edit Details</span>
            </button>
          )}
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Basic Information */}
        <section className="details-section">
          <h3>Basic Information</h3>
          {editing ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Cow Type</label>
                  <select
                    name="cow_type"
                    value={editForm.cow_type}
                    onChange={handleInputChange}
                  >
                    <option value="normal">Normal</option>
                    <option value="pregnant">Pregnant</option>
                    <option value="dry">Dry</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Breed</label>
                  <input
                    type="text"
                    name="breed"
                    value={editForm.breed}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Number of Calves</label>
                  <input
                    type="number"
                    name="number_of_calves"
                    value={editForm.number_of_calves}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={editForm.date_of_birth}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={editForm.purchase_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Last Vaccination Date</label>
                  <input
                    type="date"
                    name="last_vaccination_date"
                    value={editForm.last_vaccination_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Next Vaccination Date</label>
                  <input
                    type="date"
                    name="next_vaccination_date"
                    value={editForm.next_vaccination_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleInputChange}
                  rows="4"
                />
              </div>

              <div className="edit-actions">
                <button onClick={handleCancelEdit} className="cancel-button">
                  Cancel
                </button>
                <button onClick={handleSave} className="save-button">
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-item">
                <label>Cow ID:</label>
                <span className="cow-id-value">{cow.cow_id}</span>
              </div>
              <div className="info-item">
                <label>Name:</label>
                <span>{cow.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Type:</label>
                <span className={`cow-type-badge ${cow.cow_type}`}>
                  {cow.cow_type || 'normal'}
                </span>
              </div>
              <div className="info-item">
                <label>Breed:</label>
                <span>{cow.breed || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Date of Birth:</label>
                <span>{cow.date_of_birth ? new Date(cow.date_of_birth).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Purchase Date:</label>
                <span>{cow.purchase_date ? new Date(cow.purchase_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Number of Calves:</label>
                <span>{cow.number_of_calves || 0}</span>
              </div>
              <div className="info-item">
                <label>Last Vaccination:</label>
                <span>{cow.last_vaccination_date ? new Date(cow.last_vaccination_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Next Vaccination:</label>
                <span className={cow.next_vaccination_date && new Date(cow.next_vaccination_date) < new Date() ? 'warning' : ''}>
                  {cow.next_vaccination_date ? new Date(cow.next_vaccination_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {cow.notes && (
                <div className="info-item full-width">
                  <label>Notes:</label>
                  <span>{cow.notes}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Statistics */}
        <section className="details-section">
          <h3>Statistics (Last {daysRange} Days)</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Feed</div>
              <div className="stat-value">{totalFeed.toFixed(1)} kg</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Milk Yield</div>
              <div className="stat-value">{totalMilk.toFixed(1)} L</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Daily Milk</div>
              <div className="stat-value">{avgDailyMilk.toFixed(1)} L</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Feed Records</div>
              <div className="stat-value">{feedHistory.length}</div>
            </div>
          </div>
          
          <div className="range-selector">
            <label>Show data for:</label>
            <select value={daysRange} onChange={(e) => setDaysRange(parseInt(e.target.value))}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </section>

        {/* Feed History Graph */}
        {feedHistory.length > 0 && (
          <section className="details-section">
            <h3>Feed History</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="feed" stroke="#2196f3" strokeWidth={2} name="Feed (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Milk Yield Graph */}
        {milkHistory.length > 0 && (
          <section className="details-section">
            <h3>Milk Yield History</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={milkHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="morning" fill="#4caf50" name="Morning (L)" />
                <Bar dataKey="evening" fill="#2196f3" name="Evening (L)" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Medications */}
        <section className="details-section">
          <h3>Medications</h3>
          {medications.length === 0 ? (
            <div className="empty-state">No medications recorded</div>
          ) : (
            <div className="medications-list">
              {medications.map((med) => (
                <div key={med.id} className="medication-item">
                  <div className="med-header">
                    <strong>{med.medication_name}</strong>
                    <span className="med-date">
                      {new Date(med.date_given).toLocaleDateString()}
                    </span>
                  </div>
                  {med.dosage && <div className="med-dosage">Dosage: {med.dosage}</div>}
                  {med.notes && <div className="med-notes">{med.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CowDetails;

