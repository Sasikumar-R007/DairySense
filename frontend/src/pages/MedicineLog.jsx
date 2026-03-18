import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cowsAPI } from '../services/cowsAPI';
import { medicineAPI } from '../services/api';
import './MedicineLog.css';

function MedicineLog() {
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    cow_id: '',
    medicine_id: '',
    dosage: '',
    administered_by: '',
    date_given: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [cowData, medicineData] = await Promise.all([
        cowsAPI.getAllCows(),
        medicineAPI.getMedicines()
      ]);

      const activeCows = cowData.filter((cow) => cow.is_active !== false && cow.status !== 'inactive');
      setCows(activeCows);
      setMedicines(medicineData);

      setFormData((prev) => ({
        ...prev,
        cow_id: activeCows[0]?.cow_id || '',
        medicine_id: medicineData[0]?.id ? String(medicineData[0].id) : ''
      }));
    } catch (error) {
      console.error('Error loading medicine log data:', error);
      showMessage('error', 'Failed to load cows and medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.cow_id || !formData.medicine_id || !formData.dosage || !formData.administered_by || !formData.date_given) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      await medicineAPI.logCowMedicine({
        ...formData,
        medicine_id: Number(formData.medicine_id)
      });
      showMessage('success', 'Medicine log saved successfully');
      setFormData((prev) => ({
        ...prev,
        dosage: '',
        administered_by: '',
        notes: '',
        date_given: new Date().toISOString().split('T')[0]
      }));
    } catch (error) {
      console.error('Error saving medicine log:', error);
      showMessage('error', error.message || 'Failed to save medicine log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="medicine-log-page">
      <div className="medicine-log-card">
        <div className="medicine-log-header">
          <button type="button" className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div>
            <h1>Medicine Log</h1>
            <p>Record medicines, supplements, and treatments given to cows.</p>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading form...</div>
        ) : (
          <form className="medicine-log-form" onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="cow_id">Cow</label>
                <select id="cow_id" name="cow_id" value={formData.cow_id} onChange={handleInputChange}>
                  <option value="">Select Cow</option>
                  {cows.map((cow) => (
                    <option key={cow.cow_id} value={cow.cow_id}>
                      {cow.cow_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="medicine_id">Medicine</label>
                <select id="medicine_id" name="medicine_id" value={formData.medicine_id} onChange={handleInputChange}>
                  <option value="">Select Medicine</option>
                  {medicines.map((medicine) => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.medicine_name} ({medicine.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="dosage">Dosage</label>
                <input
                  id="dosage"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleInputChange}
                  placeholder="e.g. 5 ml"
                />
              </div>

              <div className="form-group">
                <label htmlFor="administered_by">Administered By</label>
                <input
                  id="administered_by"
                  name="administered_by"
                  value={formData.administered_by}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr Ravi"
                />
              </div>

              <div className="form-group">
                <label htmlFor="date_given">Date</label>
                <input
                  id="date_given"
                  type="date"
                  name="date_given"
                  value={formData.date_given}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="4"
                placeholder="Optional notes"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="save-button" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default MedicineLog;
