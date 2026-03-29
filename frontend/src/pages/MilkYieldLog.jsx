import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cowsAPI } from '../services/cowsAPI';
import { milkAPI } from '../services/api';
import './MilkYieldLog.css';

function MilkYieldLog() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeCows, setActiveCows] = useState([]);
  const [savedLogs, setSavedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [entriesByCow, setEntriesByCow] = useState({});

  const changeDate = (days) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    const newYear = d.getFullYear();
    const newMonth = String(d.getMonth() + 1).padStart(2, '0');
    const newDay = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  };

  useEffect(() => {
    loadActiveCows();
  }, []);

  useEffect(() => {
    loadMilkLog(selectedDate);
  }, [selectedDate]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const loadActiveCows = async () => {
    try {
      setLoading(true);
      const cows = await cowsAPI.getAllCows();
      const filteredCows = cows.filter((cow) => 
        cow.is_active !== false && 
        cow.status !== 'inactive' && 
        cow.cow_type === 'milking'
      );
      setActiveCows(filteredCows);

      const initialEntries = {};
      for (const cow of filteredCows) {
        initialEntries[cow.cow_id] = {
          morning: '',
          evening: ''
        };
      }
      setEntriesByCow(initialEntries);
    } catch (error) {
      console.error('Error loading cows for milk log:', error);
      showMessage('error', 'Failed to load active cows');
    } finally {
      setLoading(false);
    }
  };

  const loadMilkLog = async (date) => {
    try {
      const logs = await milkAPI.getMilkLogByDate(date);
      setSavedLogs(logs);

      setEntriesByCow((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = { morning: '', evening: '' };
        }

        for (const log of logs) {
          if (!next[log.cow_id]) {
            next[log.cow_id] = { morning: '', evening: '' };
          }

          if (log.session === 'Morning') {
            next[log.cow_id].morning = Number(log.milk_qty_kg).toFixed(2);
          }
          if (log.session === 'Evening') {
            next[log.cow_id].evening = Number(log.milk_qty_kg).toFixed(2);
          }
        }

        return next;
      });
    } catch (error) {
      console.error('Error loading milk logs:', error);
      setSavedLogs([]);
    }
  };

  const updateEntry = (cowId, sessionKey, value) => {
    setEntriesByCow((prev) => ({
      ...prev,
      [cowId]: {
        morning: prev[cowId]?.morning ?? '',
        evening: prev[cowId]?.evening ?? '',
        [sessionKey]: value
      }
    }));
  };

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Are you sure you want to delete this milk entry?')) {
      try {
        await milkAPI.deleteMilkLog(logId);
        showMessage('success', 'Entry deleted successfully');
        await loadMilkLog(selectedDate);
      } catch (error) {
        console.error('Error deleting milk log:', error);
        showMessage('error', 'Failed to delete entry');
      }
    }
  };

  const groupedSavedLogs = useMemo(() => {
    const grouped = new Map();
    for (const log of savedLogs) {
      if (!grouped.has(log.cow_id)) {
        grouped.set(log.cow_id, { morning: null, evening: null });
      }
      const current = grouped.get(log.cow_id);
      if (log.session === 'Morning') {
        current.morning = log;
      }
      if (log.session === 'Evening') {
        current.evening = log;
      }
    }
    return grouped;
  }, [savedLogs]);

  const handleSave = async () => {
    const payloadEntries = [];

    for (const cow of activeCows) {
      const entry = entriesByCow[cow.cow_id] || { morning: '', evening: '' };

      // Validation: If any session has an entry, both must be filled
      if (entry.morning !== '' || entry.evening !== '') {
        if (entry.morning === '' || entry.evening === '') {
          showMessage('error', `Both Morning and Evening entries are required for cow ${cow.cow_id}`);
          return;
        }

        payloadEntries.push({
          cow_id: cow.cow_id,
          session: 'Morning',
          milk_qty_kg: Number(entry.morning)
        });

        payloadEntries.push({
          cow_id: cow.cow_id,
          session: 'Evening',
          milk_qty_kg: Number(entry.evening)
        });
      }
    }

    if (payloadEntries.length === 0) {
      showMessage('error', 'Please enter milk values before saving');
      return;
    }

    setSaving(true);
    try {
      await milkAPI.createMilkLog(selectedDate, payloadEntries);
      showMessage('success', 'Milk log saved successfully');
      await loadMilkLog(selectedDate);
    } catch (error) {
      console.error('Error saving milk log:', error);
      showMessage('error', error.message || 'Failed to save milk log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="milk-yield-log-page">
      <div className="milk-yield-log-card">
        <div className="milk-yield-log-header">
          <div className="header-left">
            <button type="button" className="back-button" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <div className="title-section">
              <h1>Milk Yield Log</h1>
              <p>Entry for milking cows</p>
            </div>
          </div>
          
          <div className="header-right">
            <div className="date-controls">
              <button type="button" onClick={() => changeDate(-1)} className="nav-btn">
                <ChevronLeft size={18} />
              </button>
              <input
                id="milk-log-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
              <button type="button" onClick={() => changeDate(1)} className="nav-btn">
                <ChevronRight size={18} />
              </button>
            </div>
            <button 
              type="button" 
              className="save-log-btn" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}


        {loading ? (
          <div className="loading-state">Loading active cows...</div>
        ) : (
          <>
            <div className="milk-entry-container">
              {/* Desktop Table */}
              <div className="desktop-table-view">
                <table className="milk-yield-table">
                  <thead>
                    <tr>
                      <th>Cow Details</th>
                      <th>Morning (kg)</th>
                      <th>Evening (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCows.map((cow) => {
                      const entry = entriesByCow[cow.cow_id] || { morning: '', evening: '' };
                      return (
                        <tr key={cow.cow_id}>
                          <td className="cow-id-cell">
                            <div className="cow-tag-id">COW{String(cow.cow_tag || 0).padStart(3, '0')}</div>
                            <div className="cow-system-id">{cow.cow_id}</div>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.morning}
                              onChange={(e) => updateEntry(cow.cow_id, 'morning', e.target.value)}
                              placeholder="Morning yield"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.evening}
                              onChange={(e) => updateEntry(cow.cow_id, 'evening', e.target.value)}
                              placeholder="Evening yield"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-cards-view">
                {activeCows.map((cow) => {
                  const entry = entriesByCow[cow.cow_id] || { morning: '', evening: '' };
                  return (
                    <div key={cow.cow_id} className="milk-entry-card">
                      <div className="card-cow-info">
                        <span className="card-tag">COW{String(cow.cow_tag || 0).padStart(3, '0')}</span>
                        <span className="card-id">{cow.cow_id}</span>
                      </div>
                      <div className="card-inputs">
                        <div className="input-group">
                          <label>Morning</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.morning}
                            onChange={(e) => updateEntry(cow.cow_id, 'morning', e.target.value)}
                            placeholder="kg"
                          />
                        </div>
                        <div className="input-group">
                          <label>Evening</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.evening}
                            onChange={(e) => updateEntry(cow.cow_id, 'evening', e.target.value)}
                            placeholder="kg"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="saved-milk-section">
              <h2>Saved Milk Log</h2>
              {savedLogs.length === 0 ? (
                <div className="empty-state">No milk entries for this date yet.</div>
              ) : (
                <div className="saved-milk-table-wrapper">
                  <table className="saved-milk-table">
                    <thead>
                      <tr>
                        <th>Cow ID</th>
                        <th>Morning (kg)</th>
                        <th>Morning (L)</th>
                        <th>Evening (kg)</th>
                        <th>Evening (L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCows
                        .filter((cow) => groupedSavedLogs.has(cow.cow_id))
                        .map((cow) => {
                          const row = groupedSavedLogs.get(cow.cow_id);
                          return (
                            <tr key={cow.cow_id}>
                              <td>{cow.cow_id}</td>
                              <td>
                                {row.morning ? (
                                  <>
                                    {Number(row.morning.milk_qty_kg).toFixed(2)}
                                    <button 
                                      className="log-action-btn delete-log-btn" 
                                      onClick={() => handleDeleteLog(row.morning.id)}
                                      title="Delete Morning Entry"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : '-'}
                              </td>
                              <td>{row.morning ? Number(row.morning.milk_qty_litre).toFixed(2) : '-'}</td>
                              <td>
                                {row.evening ? (
                                  <>
                                    {Number(row.evening.milk_qty_kg).toFixed(2)}
                                    <button 
                                      className="log-action-btn delete-log-btn" 
                                      onClick={() => handleDeleteLog(row.evening.id)}
                                      title="Delete Evening Entry"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : '-'}
                              </td>
                              <td>{row.evening ? Number(row.evening.milk_qty_litre).toFixed(2) : '-'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MilkYieldLog;
