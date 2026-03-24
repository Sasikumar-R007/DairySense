import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { feedAPI } from '../services/api';
import './FeedLog.css';

function createEmptyRow() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category_id: '',
    feed_item_id: '',
    quantity_kg: '',
    cost_per_unit: '',
    total_amount: '',
    input_source: 'Purchased'
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
            if (selectedItem.default_cost_per_unit) {
               nextRow.cost_per_unit = selectedItem.default_cost_per_unit;
            }
            if (selectedItem.default_source) {
               nextRow.input_source = selectedItem.default_source;
            }
          }
        }

        // Auto-calculate Total Amount
        if (field === 'quantity_kg' || field === 'cost_per_unit' || field === 'feed_item_id') {
          const qty = field === 'quantity_kg' ? value : nextRow.quantity_kg;
          const cost = field === 'cost_per_unit' ? value : nextRow.cost_per_unit;
          if (qty !== '' && cost !== '' && !isNaN(qty) && !isNaN(cost)) {
             nextRow.total_amount = (parseFloat(qty) * parseFloat(cost)).toFixed(2);
          } else {
             nextRow.total_amount = '';
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

  const getItemsForCategory = (categoryId) =>
    items.filter((item) => String(item.category_id) === String(categoryId));

  const handleSave = async () => {
    const preparedItems = rows
      .filter((row) => row.feed_item_id && row.quantity_kg !== '' && row.cost_per_unit !== '')
      .map((row) => ({
        feed_item_id: Number(row.feed_item_id),
        quantity_kg: Number(row.quantity_kg),
        cost_per_unit: Number(row.cost_per_unit),
        input_source: row.input_source
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
            <input
              id="feed-log-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
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
                    <th>Cost Per Unit</th>
                    <th>Total Amount</th>
                    <th>Source</th>
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
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.cost_per_unit}
                          onChange={(e) => updateRow(row.id, 'cost_per_unit', e.target.value)}
                          placeholder="Cost/Unit"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.total_amount || ''}
                          readOnly
                          style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                          placeholder="Auto Calc"
                        />
                      </td>
                      <td>
                        <select
                          value={row.input_source}
                          onChange={(e) => updateRow(row.id, 'input_source', e.target.value)}
                        >
                          <option value="Purchased">Purchased</option>
                          <option value="Farm Produced">Farm Produced</option>
                        </select>
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
