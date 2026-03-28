import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { feedAPI } from '../services/api';
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
  }, []);

  useEffect(() => {
    loadFeedLog(selectedDate);
  }, [selectedDate]);

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
      const logs = await feedAPI.getFeedLogByDate(date);
      setSavedLogs(logs);
    } catch (error) {
      console.error('Error loading feed log:', error);
      setSavedLogs([]);
    }
  };

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

  const handleSave = async () => {
    const preparedItems = rows
      .filter((row) => row.feed_item_id && row.quantity_kg !== '')
      .map((row) => ({
        feed_item_id: Number(row.feed_item_id),
        quantity_kg: Number(row.quantity_kg)
      }));

    if (preparedItems.length === 0) {
      showMessage('error', 'Please add at least one complete feed log row');
      return;
    }

    setSaving(true);
    try {
      await feedAPI.createFeedLog(selectedDate, preparedItems);
      showMessage('success', 'Feed log saved successfully');
      setRows([createEmptyRow()]);
      await loadFeedLog(selectedDate);
    } catch (error) {
      console.error('Error saving feed log:', error);
      showMessage('error', error.message || 'Failed to save feed log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="feed-log-page">
      <div className="feed-log-card">
        <div className="feed-log-header">
          <button type="button" className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div>
            <h1>Farm Feed Log</h1>
            <p>Daily farm-level feed entry based on the feed log sheet.</p>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="feed-log-toolbar">
          <div className="feed-log-field">
            <label htmlFor="feed-log-date">Select Date</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button type="button" onClick={() => changeDate(-1)} style={{ padding: '8px', cursor: 'pointer', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', color: '#4475569' }}>
                <ChevronLeft size={16} />
              </button>
              <input
                id="feed-log-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', flex: 1 }}
              />
              <button type="button" onClick={() => changeDate(1)} style={{ padding: '8px', cursor: 'pointer', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', color: '#475569' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading feed setup...</div>
        ) : (
          <>
            <div className="feed-log-table-wrapper">
              <table className="feed-log-table">
                <thead>
                  <tr>
                    <th>Feed Category</th>
                    <th>Feed Item</th>
                    <th>Quantity (kg)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <select
                          value={row.category_id}
                          onChange={(e) => updateRow(row.id, 'category_id', e.target.value)}
                        >
                          <option value="">Select Category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.category_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.feed_item_id}
                          onChange={(e) => updateRow(row.id, 'feed_item_id', e.target.value)}
                          disabled={!row.category_id}
                        >
                          <option value="">Select Item</option>
                          {getItemsForCategory(row.category_id).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.item_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity_kg}
                          onChange={(e) => updateRow(row.id, 'quantity_kg', e.target.value)}
                          placeholder="Quantity"
                        />
                      </td>
                      <td className="row-action-cell">
                        <button
                          type="button"
                          className="remove-row-button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          aria-label="Remove row"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="feed-log-actions">
              <button type="button" className="add-row-button" onClick={addRow}>
                <Plus size={18} />
                <span>Add Row</span>
              </button>
              <button type="button" className="save-feed-log-button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Feed Log'}
              </button>
            </div>

            <div className="saved-log-section">
              <h2>Saved Feed Log</h2>
              {savedLogs.length === 0 ? (
                <div className="empty-state">No farm feed entries for this date yet.</div>
              ) : (
                <div className="saved-log-table-wrapper">
                  <table className="saved-log-table">
                    <thead>
                      <tr>
                        <th>Feed Category</th>
                        <th>Feed Item</th>
                        <th>Quantity (kg)</th>
                        <th>Cost</th>
                        <th>Total Amount</th>
                        <th>Source</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{log.category_name}</td>
                          <td>{log.item_name}</td>
                          <td>{Number(log.quantity_kg).toFixed(2)}</td>
                          <td>{Number(log.cost_per_unit).toFixed(2)}</td>
                          <td>{Number(log.total_amount).toFixed(2)}</td>
                          <td>{log.input_source}</td>
                          <td className="actions-cell">
                            <button 
                              className="log-action-btn edit-log-btn" 
                              onClick={() => handleEditLog(log)}
                              title="Edit Quantity"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="log-action-btn delete-log-btn" 
                              onClick={() => handleDeleteLog(log.id)}
                              title="Delete Entry"
                            >
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
          </>
        )}
      </div>
    </div>
  );
}

export default FeedLog;
