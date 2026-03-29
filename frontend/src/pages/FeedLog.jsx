import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { feedAPI, activityAPI, milkAPI } from '../services/api';
import { cowsAPI } from '../services/cowsAPI';
import './FeedLog.css';

function createEmptyRow() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category_id: '',
    feed_item_id: '',
    quantity_kg: ''
  };
}

function FeedLog() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState([createEmptyRow()]);
  const [savedLogs, setSavedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeMode, setActiveMode] = useState('bulk'); // 'bulk' or 'individual'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stagedEntries, setStagedEntries] = useState([]);
  const [allCows, setAllCows] = useState([]);
  const [individualForm, setIndividualForm] = useState({
    cow_id: '',
    category_id: '',
    feed_item_id: '',
    custom_category: '',
    custom_item: '',
    quantity_kg: '',
    session: 'morning'
  });
  
  // Bulk Distribution state
  const [distForm, setDistForm] = useState({
    mode: 'weight', // 'weight' or 'count'
    minWeight: '',
    maxWeight: '',
    cowCount: '',
    category_id: '',
    feed_item_id: '',
    custom_category: '',
    custom_item: '',
    total_quantity: '',
    qty_per_cow: '',
    session: 'morning'
  });
  const [targetCows, setTargetCows] = useState([]);
  const [isFetchingCows, setIsFetchingCows] = useState(false);

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
    loadMasterData();
    loadAllCows();
  }, []);

  useEffect(() => {
    loadFeedLog(selectedDate);
  }, [selectedDate, distForm.session, individualForm.session]);

  const loadAllCows = async () => {
    try {
      const cows = await cowsAPI.getAllCows();
      setAllCows(cows || []);
    } catch (error) {
      console.error('Error loading cows:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const [categoryData, itemData] = await Promise.all([
        feedAPI.getCategories(),
        feedAPI.getItems()
      ]);
      setCategories(categoryData);
      setItems(itemData);
    } catch (error) {
      console.error('Error loading feed master data:', error);
      showMessage('error', 'Failed to load feed categories and items');
    } finally {
      setLoading(false);
    }
  };

  const loadFeedLog = async (date) => {
    try {
      const session = activeMode === 'individual' ? individualForm.session : distForm.session;
      const logs = await feedAPI.getFeedLogByDate(date, session);
      setSavedLogs(logs);
    } catch (error) {
      console.error('Error loading feed log:', error);
      setSavedLogs([]);
    }
  };

  const feedStats = useMemo(() => {
    const total = allCows.filter(c => c.is_active !== false).length;
    // Count unique cows in savedLogs for THE CURRENT SESSION
    const enteredIds = new Set(savedLogs.filter(l => l.cow_id).map(l => l.cow_id));
    const entered = enteredIds.size;
    return {
      total,
      entered,
      remaining: Math.max(0, total - entered)
    };
  }, [allCows, savedLogs]);

  const missingFeedbackCows = useMemo(() => {
    const enteredIds = new Set(savedLogs.filter(l => l.cow_id).map(l => l.cow_id));
    return allCows.filter(c => c.is_active !== false && !enteredIds.has(c.cow_id));
  }, [allCows, savedLogs]);

  const itemMap = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  const updateRow = (rowId, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const nextRow = { ...row, [field]: value };

        if (field === 'category_id') {
          nextRow.feed_item_id = '';
        }

        if (field === 'feed_item_id') {
          const selectedItem = itemMap.get(Number(value));
          if (selectedItem) {
            nextRow.category_id = String(selectedItem.category_id);
          }
        }

        return nextRow;
      })
    );
  };

  const addRow = () => {
    setRows((prevRows) => [...prevRows, createEmptyRow()]);
  };

  const removeRow = (rowId) => {
    setRows((prevRows) => {
      if (prevRows.length === 1) {
        return prevRows;
      }
      return prevRows.filter((row) => row.id !== rowId);
    });
  };

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Are you sure you want to delete this log entry?')) {
      try {
        await feedAPI.deleteFeedLog(logId);
        showMessage('success', 'Entry deleted successfully');
        await loadFeedLog(selectedDate);
      } catch (error) {
        console.error('Error deleting log:', error);
        showMessage('error', 'Failed to delete entry');
      }
    }
  };

  const handleEditLog = async (log) => {
    const newQuantity = window.prompt(`Enter new quantity for ${log.item_name} (kg):`, log.quantity_kg);
    if (newQuantity !== null) {
      const quantity = parseFloat(newQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        return showMessage('error', 'Please enter a valid quantity');
      }
      
      try {
        setSaving(true);
        await feedAPI.updateFeedLog(log.id, quantity);
        showMessage('success', 'Quantity updated successfully');
        await loadFeedLog(selectedDate);
      } catch (error) {
        console.error('Error updating log:', error);
        showMessage('error', 'Failed to update quantity');
      } finally {
        setSaving(false);
      }
    }
  };

  const getItemsForCategory = (categoryId) =>
    items.filter((item) => String(item.category_id) === String(categoryId));

  const handleSaveIndividual = () => {
    const isOtherCat = individualForm.category_id === 'other';
    const isOtherItem = individualForm.feed_item_id === 'other';

    if (!individualForm.cow_id || (!isOtherItem && !individualForm.feed_item_id) || (isOtherItem && !individualForm.custom_item) || !individualForm.quantity_kg) {
      return showMessage('error', 'Please complete all required fields');
    }
    
    const selectedItem = !isOtherItem ? itemMap.get(Number(individualForm.feed_item_id)) : null;
    const selectedCat = !isOtherCat && individualForm.category_id ? categories.find(c => String(c.id) === String(individualForm.category_id)) : null;

    const entry = {
      cow_id: individualForm.cow_id,
      date: selectedDate,
      session: individualForm.session,
      category: isOtherCat ? individualForm.custom_category : (selectedCat?.category_name || selectedItem?.category_name || 'Uncategorized'),
      type: isOtherItem ? individualForm.custom_item : selectedItem?.item_name,
      quantity_kg: parseFloat(individualForm.quantity_kg),
      feed_item_id: isOtherItem ? null : individualForm.feed_item_id
    };

    setStagedEntries([entry]);
    setShowConfirmModal(true);
  };

  const handleStagedBulkSave = () => {
    const isOtherCat = distForm.category_id === 'other';
    const isOtherItem = distForm.feed_item_id === 'other';

    if (distForm.mode === 'weight' && targetCows.length === 0) {
      return showMessage('error', 'Please fetch target cows first');
    }
    if ((!isOtherItem && !distForm.feed_item_id) || (isOtherItem && !distForm.custom_item) || !distForm.qty_per_cow) {
      return showMessage('error', 'Please select feed and specify quantity');
    }

    const selectedItem = !isOtherItem ? itemMap.get(Number(distForm.feed_item_id)) : null;
    const selectedCat = !isOtherCat && distForm.category_id ? categories.find(c => String(c.id) === String(distForm.category_id)) : null;

    const entries = targetCows.map(cow => ({
      cow_id: cow.cow_id,
      date: selectedDate,
      session: distForm.session,
      category: isOtherCat ? distForm.custom_category : (selectedCat?.category_name || selectedItem?.category_name || 'Uncategorized'),
      type: isOtherItem ? distForm.custom_item : selectedItem?.item_name,
      quantity_kg: parseFloat(distForm.qty_per_cow),
      feed_item_id: isOtherItem ? null : distForm.feed_item_id
    }));

    setStagedEntries(entries);
    setShowConfirmModal(true);
  };

  const confirmAndSave = async () => {
    setSaving(true);
    try {
      if (activeMode === 'individual') {
        const entry = stagedEntries[0];
        await feedAPI.logBulkFeed({
          cows: [entry.cow_id],
          date: entry.date,
          session: entry.session,
          category: entry.category,
          type: entry.type,
          quantity_per_cow: entry.quantity_kg
        });
        showMessage('success', `Feed logged for ${entry.cow_id}`);
        setIndividualForm(prev => ({ ...prev, cow_id: '', quantity_kg: '' }));
      } else {
        await feedAPI.logBulkFeed({
          cows: stagedEntries.map(e => e.cow_id),
          date: stagedEntries[0].date,
          session: stagedEntries[0].session,
          category: stagedEntries[0].category,
          type: stagedEntries[0].type,
          quantity_per_cow: stagedEntries[0].quantity_kg
        });
        showMessage('success', `Bulk feed logged for ${stagedEntries.length} cows`);
        setTargetCows([]);
      }
      
      setShowConfirmModal(false);
      await loadFeedLog(selectedDate);
    } catch (error) {
      showMessage('error', error.message || 'Failed to save feed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="feed-log-page">
      <div className="feed-log-card">
        <div className="feed-log-header">
          <div className="header-top">
            <button type="button" className="back-button" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <div className="date-controls-wrapper">
              <div className="date-stepper">
                <button type="button" onClick={() => changeDate(-1)} aria-label="Previous Day">
                  <ChevronLeft size={18} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="header-date-input"
                />
                <button type="button" onClick={() => changeDate(1)} aria-label="Next Day">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="farm-feeding-stats">
            <div className="stat-pill total">
              <span className="label">Total Cows</span>
              <span className="value">{feedStats.total}</span>
            </div>
            <div className="stat-pill entered">
              <span className="label">Feed Entered</span>
              <span className="value">{feedStats.entered}</span>
            </div>
            <div className="stat-pill pending">
              <span className="label">Remaining</span>
              <span className="value">{feedStats.remaining}</span>
            </div>
          </div>

          <div className="entry-mode-bar">
            <h1>Feed Entry Mode</h1>
            <div className="mode-selector">
              <button 
                className={activeMode === 'individual' ? 'active' : ''} 
                onClick={() => setActiveMode('individual')}
              >
                Individual Cow
              </button>
              <button 
                className={activeMode === 'bulk' ? 'active' : ''} 
                onClick={() => setActiveMode('bulk')}
              >
                Bulk Distribution
              </button>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Header toolbar removed as controls moved to top header */}

        {loading ? (
          <div className="loading-state">Loading feed setup...</div>
        ) : activeMode === 'individual' ? (
          <div className="individual-entry-container">
            <div className="mode-card">
              <h3>Individual Feed Entry</h3>
              
              <div className="form-grid-three">
                <div className="form-group">
                  <label>Cow ID (Missing Feed)</label>
                  <select 
                    value={individualForm.cow_id} 
                    onChange={e => setIndividualForm({...individualForm, cow_id: e.target.value})}
                  >
                    <option value="">Select Cow</option>
                    {missingFeedbackCows.map(cow => (
                      <option key={cow.cow_id} value={cow.cow_id}>
                        {cow.cow_id} ({cow.breed})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Session</label>
                  <select 
                    value={individualForm.session} 
                    onChange={e => setIndividualForm({...individualForm, session: e.target.value})}
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Feed Category</label>
                  <select 
                    value={individualForm.category_id} 
                    onChange={e => setIndividualForm({...individualForm, category_id: e.target.value, feed_item_id: e.target.value === 'other' ? 'other' : ''})}
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                    <option value="other">Other</option>
                  </select>
                  {individualForm.category_id === 'other' && (
                    <input 
                      type="text" 
                      placeholder="Custom category name" 
                      value={individualForm.custom_category}
                      onChange={e => setIndividualForm({...individualForm, custom_category: e.target.value})}
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label>Feed Item</label>
                  <select 
                    value={individualForm.feed_item_id} 
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'other') {
                        setIndividualForm({...individualForm, feed_item_id: 'other'});
                      } else {
                        const item = itemMap.get(Number(val));
                        setIndividualForm({
                          ...individualForm, 
                          feed_item_id: val,
                          category_id: item?.category_id ? String(item.category_id) : individualForm.category_id
                        });
                      }
                    }}
                  >
                    <option value="">Select Feed</option>
                    {(individualForm.category_id && individualForm.category_id !== 'other' ? getItemsForCategory(individualForm.category_id) : items).map(item => (
                      <option key={item.id} value={item.id}>{item.item_name}</option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                  {individualForm.feed_item_id === 'other' && (
                    <input 
                      type="text" 
                      placeholder="Custom feed name" 
                      value={individualForm.custom_item}
                      onChange={e => setIndividualForm({...individualForm, custom_item: e.target.value})}
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label>Quantity (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={individualForm.quantity_kg} 
                    onChange={e => setIndividualForm({...individualForm, quantity_kg: e.target.value})}
                    placeholder="e.g. 3.5"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="save-btn individual" 
                  onClick={handleSaveIndividual}
                  disabled={saving}
                >
                  {saving ? 'Processing...' : 'Queue Feed Entry'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="distribution-container">
            <div className="distribution-config-card">
              <h3>Bulk Distribution Setup</h3>
              <div className="dist-row">
                <div className="dist-group">
                  <label>Target Group</label>
                  <select value={distForm.mode} onChange={e => setDistForm({...distForm, mode: e.target.value})}>
                    <option value="weight">By Weight Range</option>
                    <option value="all">All Available Cows</option>
                  </select>
                </div>
                <div className="dist-group">
                  <label>Session</label>
                  <select value={distForm.session} onChange={e => setDistForm({...distForm, session: e.target.value})}>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              </div>

              {distForm.mode === 'weight' && (
                <div className="dist-row">
                  <div className="dist-group">
                    <label>Min Weight (kg)</label>
                    <input type="number" value={distForm.minWeight} onChange={e => setDistForm({...distForm, minWeight: e.target.value})} placeholder="e.g. 250" />
                  </div>
                  <div className="dist-group">
                    <label>Max Weight (kg)</label>
                    <input type="number" value={distForm.maxWeight} onChange={e => setDistForm({...distForm, maxWeight: e.target.value})} placeholder="e.g. 350" />
                  </div>
                  <button className="fetch-btn" onClick={async () => {
                    setIsFetchingCows(true);
                    try {
                      const cows = await feedAPI.getCowsByWeight(distForm.minWeight, distForm.maxWeight);
                      // Filter by missing entries
                      const enteredIds = new Set(savedLogs.filter(l => l.cow_id).map(l => l.cow_id));
                      setTargetCows(cows.filter(c => !enteredIds.has(c.cow_id)));
                    } finally { setIsFetchingCows(false); }
                  }} disabled={isFetchingCows}>
                    {isFetchingCows ? 'Searching...' : 'Fetch Missing Cows'}
                  </button>
                </div>
              )}

              {distForm.mode === 'all' && (
                <div className="dist-row">
                  <button className="fetch-btn full-width" onClick={() => setTargetCows(missingFeedbackCows)}>
                    Select All {missingFeedbackCows.length} Pending Cows
                  </button>
                </div>
              )}

              <hr />

              <div className="dist-row">
                <div className="dist-group">
                  <label>Feed Category</label>
                  <select 
                    value={distForm.category_id} 
                    onChange={e => setDistForm({...distForm, category_id: e.target.value, feed_item_id: e.target.value === 'other' ? 'other' : ''})}
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                    <option value="other">Other</option>
                  </select>
                  {distForm.category_id === 'other' && (
                    <input 
                      type="text" 
                      placeholder="Custom category name" 
                      value={distForm.custom_category}
                      onChange={e => setDistForm({...distForm, custom_category: e.target.value})}
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </div>
                <div className="dist-group">
                  <label>Feed Item</label>
                  <select 
                    value={distForm.feed_item_id} 
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'other') {
                        setDistForm({...distForm, feed_item_id: 'other'});
                      } else {
                        const item = itemMap.get(Number(val));
                        setDistForm({
                          ...distForm, 
                          feed_item_id: val, 
                          category_id: item?.category_id ? String(item.category_id) : distForm.category_id
                        });
                      }
                    }}
                  >
                    <option value="">Select Feed</option>
                    {(distForm.category_id && distForm.category_id !== 'other' ? getItemsForCategory(distForm.category_id) : items).map(item => (
                      <option key={item.id} value={item.id}>{item.item_name}</option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                  {distForm.feed_item_id === 'other' && (
                    <input 
                      type="text" 
                      placeholder="Custom feed name" 
                      value={distForm.custom_item}
                      onChange={e => setDistForm({...distForm, custom_item: e.target.value})}
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </div>
                <div className="dist-group">
                  <label>Quantity per Cow (kg)</label>
                  <input 
                    type="number" 
                    value={distForm.qty_per_cow} 
                    onChange={e => setDistForm({...distForm, qty_per_cow: e.target.value})} 
                    placeholder="e.g. 2.5"
                  />
                </div>
              </div>

              <div className="dist-summary">
                <span>Targeting: <strong>{targetCows.length} cows</strong></span>
                <span>|</span>
                <span>Total Feed: <strong>{(targetCows.length * (parseFloat(distForm.qty_per_cow) || 0)).toFixed(2)} kg</strong></span>
              </div>

              <button className="bulk-save-btn" onClick={handleStagedBulkSave} disabled={saving || targetCows.length === 0}>
                Queue Bulk Distribution
              </button>
            </div>

            {targetCows.length > 0 && (
              <div className="target-preview">
                <h4>Targeted Cows Preview</h4>
                <div className="preview-grid">
                  {targetCows.map(cow => (
                    <div key={cow.cow_id} className="preview-chip">
                      <span className="chip-id">{cow.cow_id}</span>
                      <span className="chip-info">{cow.breed} | {cow.weight_kg}kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="saved-log-section">
          <h2>Saved Feed Log ({activeMode === 'individual' ? individualForm.session : distForm.session})</h2>
          {savedLogs.length === 0 ? (
            <div className="empty-state">No feed records for this session yet.</div>
          ) : (
            <div className="saved-log-table-wrapper">
              <table className="saved-log-table">
                <thead>
                  <tr>
                    <th>Cow ID</th>
                    <th>Category</th>
                    <th>Item</th>
                    <th>Qty (kg)</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedLogs.map((log) => (
                    <tr key={log.id}>
                      <td><strong>{log.cow_id || 'Global'}</strong></td>
                      <td>{log.category_name}</td>
                      <td>{log.item_name}</td>
                      <td>{Number(log.quantity_kg).toFixed(2)}</td>
                      <td>
                        <span className={`source-badge ${log.input_source}`}>
                          {log.input_source}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="log-action-btn delete-log-btn" onClick={() => handleDeleteLog(log.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="modal-overlay">
            <div className="confirm-modal">
              <h3>Confirm Feed Entries</h3>
              <p>Please review the following entries before saving to the log.</p>
              
              <div className="modal-table-wrapper">
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Cow ID</th>
                      <th>Feed Item</th>
                      <th>Quantity (kg)</th>
                      <th>Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedEntries.slice(0, 50).map((entry, idx) => (
                      <tr key={idx}>
                        <td>{entry.cow_id}</td>
                        <td>{entry.type}</td>
                        <td>{entry.quantity_kg}</td>
                        <td style={{ textTransform: 'capitalize' }}>{entry.session}</td>
                      </tr>
                    ))}
                    {stagedEntries.length > 50 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>
                          ... and {stagedEntries.length - 50} more entries
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button className="modal-btn cancel" onClick={() => setShowConfirmModal(false)}>
                  Cancel & Edit
                </button>
                <button className="modal-btn confirm" onClick={confirmAndSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Confirm & Save All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedLog;
