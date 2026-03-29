import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsAPI, userAPI, feedAPI, medicineAPI } from '../services/api';
import { 
  Save, Shield, User, Bell, Factory, DatabaseBackup, CheckCircle2, Edit3, XCircle, Wheat, Syringe, Plus, Edit2, Trash2, Settings as CogIcon
} from 'lucide-react';
import './Settings.css';

function Settings() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isWorker = currentUser?.role === 'worker';
  const canManageMasterData = isAdmin || isWorker; 
  
  const [activeTab, setActiveTab] = useState(canManageMasterData ? 'farm' : 'profile');
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Admin / Global states
  const [farmProfile, setFarmProfile] = useState({ name: '', email: '', phone: '' });
  const [alerts, setAlerts] = useState({ milk_drop_threshold: 2.0, low_feed_threshold: 50, low_medicine_threshold: 10 });
  const [hardware, setHardware] = useState({ rfid_enabled: true, qr_enabled: true });
  const [cowFormSettings, setCowFormSettings] = useState({ breeds: ['HF', 'Jersey', 'Gir', 'Other'], cow_types: ['normal', 'milking', 'pregnant', 'dry', 'calf', 'Other'] });

  // Master Data states & Modals
  const [feedItems, setFeedItems] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [feedModal, setFeedModal] = useState({ show: false, mode: 'add', data: { item_name: '', category_id: '', default_cost_per_unit: '', default_source: 'Purchased' } });
  const [medModal, setMedModal] = useState({ show: false, mode: 'add', data: { medicine_name: '', category: 'Medicine', description: '' } });
  const [cowTypeModal, setCowTypeModal] = useState({ show: false, field: '', label: '', val: '' });

  // User states
  const [profileForm, setProfileForm] = useState({ name: '', phoneNumber: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        phoneNumber: currentUser.phoneNumber || '',
        email: currentUser.email || ''
      });
      if (canManageMasterData) {
        loadSettings();
        loadMasterData();
      }
    }
  }, [currentUser, canManageMasterData]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsEditing(false);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsAPI.getSettings();
      if (data.farm_profile) setFarmProfile(data.farm_profile);
      if (data.alerts) setAlerts(data.alerts);
      if (data.hardware) setHardware(data.hardware);
      if (data.cow_form_options) setCowFormSettings(data.cow_form_options);
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [items, meds, cats] = await Promise.all([
        feedAPI.getItems(),
        medicineAPI.getMedicines(),
        feedAPI.getCategories()
      ]);
      setFeedItems(items);
      setMedicines(meds);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  const handleAdminSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings({
        farm_profile: farmProfile,
        alerts,
        hardware,
        cow_form_options: cowFormSettings
      });
      showMessage('success', 'System settings updated successfully!');
      setIsEditing(false);
    } catch (err) {
      showMessage('error', err.response?.data?.error || err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile(profileForm);
      showMessage('success', 'Personal profile updated!');
      setIsEditing(false);
    } catch (err) {
      showMessage('error', err.response?.data?.error || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (passwordForm.password !== passwordForm.confirmPassword) {
      return showMessage('error', 'Passwords do not match');
    }
    if (passwordForm.password.length < 6) {
      return showMessage('error', 'Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await userAPI.updatePassword(passwordForm.password);
      showMessage('success', 'Security password successfully updated!');
      setPasswordForm({ password: '', confirmPassword: '' });
      setIsEditing(false);
    } catch (err) {
      showMessage('error', err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setSaving(true);
    try {
      const resp = await settingsAPI.backupDatabase();
      showMessage('success', `Backup generated! Reference ID: ${resp.backup_id}`);
    } catch (err) {
      showMessage('error', 'Failed to generate backup');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeedItem = async () => {
    if (!feedModal.data.item_name || !feedModal.data.category_id) return showMessage('error', 'Item name and category required');
    try {
      setSaving(true);
      if (feedModal.mode === 'add') {
        await feedAPI.createItem(feedModal.data);
        showMessage('success', 'Feed item created');
      } else {
        await feedAPI.updateItem(feedModal.data.id, feedModal.data);
        showMessage('success', 'Feed item updated');
      }
      setFeedModal({ show: false, mode: 'add', data: {} });
      loadMasterData();
    } catch (err) {
      showMessage('error', 'Failed to save feed item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFeedItem = async (id) => {
    if (!window.confirm("Delete this Feed Item? Historical logs will be preserved but it won't be available for new logs.")) return;
    try {
      setSaving(true);
      await feedAPI.deleteItem(id);
      loadMasterData();
      showMessage('success', 'Feed item deleted');
    } catch (err) {
      showMessage('error', 'Failed to delete feed item');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMedicine = async () => {
    if (!medModal.data.medicine_name || !medModal.data.category) return showMessage('error', 'Name and category required');
    try {
      setSaving(true);
      if (medModal.mode === 'add') {
        await medicineAPI.addMedicine(medModal.data);
        showMessage('success', 'Medicine added');
      } else {
        await medicineAPI.updateMedicine(medModal.data.id, medModal.data);
        showMessage('success', 'Medicine updated');
      }
      setMedModal({ show: false, mode: 'add', data: {} });
      loadMasterData();
    } catch (err) {
      showMessage('error', 'Failed to save medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedicine = async (id) => {
    if (!window.confirm("Delete this Medicine? Historical logs will be preserved.")) return;
    try {
      setSaving(true);
      await medicineAPI.deleteMedicine(id);
      loadMasterData();
      showMessage('success', 'Medicine deleted');
    } catch (err) {
      showMessage('error', 'Failed to delete medicine');
    } finally {
      setSaving(false);
    }
  };

  const addCowFormOption = (field, label) => {
    setCowTypeModal({ show: true, field, label, val: '' });
  };

  const handleSaveCowOption = () => {
    const val = cowTypeModal.val.trim();
    if (val && !cowFormSettings[cowTypeModal.field].includes(val)) {
      setCowFormSettings(prev => ({ ...prev, [cowTypeModal.field]: [...prev[cowTypeModal.field], val] }));
    }
    setCowTypeModal({ show: false, field: '', label: '', val: '' });
  };

  const removeCowFormOption = (field, val) => {
    if (val === 'Other') return showMessage('error', "'Other' is a protected required field.");
    setCowFormSettings(prev => ({ ...prev, [field]: prev[field].filter(v => v !== val) }));
  };

  const renderActionButtons = (saveHandler) => {
    if (!isEditing) {
      return (
        <button type="button" className="settings-edit-btn" onClick={() => setIsEditing(true)}>
          <Edit3 size={16} /> Enable Quick Edit
        </button>
      );
    }
    return (
      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="button" className="settings-cancel-btn" onClick={() => {
          setIsEditing(false);
          if (activeTab === 'profile' && currentUser) {
            setProfileForm({ name: currentUser.name || '', phoneNumber: currentUser.phoneNumber || '', email: currentUser.email || '' });
          } else if (['farm', 'alerts', 'hardware'].includes(activeTab)) {
            loadSettings();
          }
        }}>
          <XCircle size={16} /> Cancel
        </button>
        <button type="button" className="settings-save-btn" onClick={() => {
          if (window.confirm('Apply these configuration changes?')) {
            saveHandler();
          }
        }} disabled={saving}>
          <Save size={16} /> {saving ? 'Writing...' : 'Confirm & Apply'}
        </button>
      </div>
    );
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Platform Settings</h1>
        <p>Manage your account configuration and system-level rules.</p>
      </div>

      {message.text && (
        <div className={`settings-alert ${message.type}`}>
          <div className="alert-content">
            {message.type === 'success' ? <CheckCircle2 size={18} /> : null}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="settings-container">
        <div className="settings-sidebar">
          {canManageMasterData && (
            <div className="settings-sidebar-section">
              <h4>System Master</h4>
              <button className={`tab-btn ${activeTab === 'farm' ? 'active' : ''}`} onClick={() => handleTabChange('farm')}>
                <Factory size={16} /> Farm Profile
              </button>
              <button className={`tab-btn ${activeTab === 'cow-master' ? 'active' : ''}`} onClick={() => handleTabChange('cow-master')}>
                <CogIcon size={16} /> Cow Master
              </button>
              <button className={`tab-btn ${activeTab === 'feed-master' ? 'active' : ''}`} onClick={() => handleTabChange('feed-master')}>
                <Wheat size={16} /> Feed Items
              </button>
              <button className={`tab-btn ${activeTab === 'med-master' ? 'active' : ''}`} onClick={() => handleTabChange('med-master')}>
                <Syringe size={16} /> Medicines
              </button>
              {isAdmin && (
                <>
                  <button className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => handleTabChange('alerts')}>
                    <Bell size={16} /> Alert Thresholds
                  </button>
                  <button className={`tab-btn ${activeTab === 'hardware' ? 'active' : ''}`} onClick={() => handleTabChange('hardware')}>
                    <Shield size={16} /> Hardware
                  </button>
                  <button className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => handleTabChange('backup')}>
                    <DatabaseBackup size={16} /> Database
                  </button>
                </>
              )}
            </div>
          )}

          <div className="settings-sidebar-section">
            <h4>Personal Account</h4>
            <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
              <User size={16} /> My Profile
            </button>
            <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => handleTabChange('security')}>
              <Shield size={16} /> Security
            </button>
          </div>
        </div>

        <div className="settings-content">
          {loading ? (
            <div className="settings-loading" style={{ padding: '32px' }}>Loading data...</div>
          ) : (
            <div className="settings-form-panel">
              {/* Farm Profile */}
              {activeTab === 'farm' && (
                <>
                  <h2>Farm Profile</h2>
                  <p className="panel-desc">Official configuration for PDF reports and system headers.</p>
                  <div className="settings-form-group">
                    <label>Farm Name</label>
                    <input type="text" value={farmProfile.name} disabled={!isEditing} onChange={e => setFarmProfile({...farmProfile, name: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Contact Email</label>
                    <input type="email" value={farmProfile.email} disabled={!isEditing} onChange={e => setFarmProfile({...farmProfile, email: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Phone Number</label>
                    <input type="text" value={farmProfile.phone} disabled={!isEditing} onChange={e => setFarmProfile({...farmProfile, phone: e.target.value})} />
                  </div>
                  {renderActionButtons(handleAdminSave)}
                </>
              )}

              {/* Feed Master */}
              {activeTab === 'feed-master' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2>Feed Item Master</h2>
                    <button className="add-master-btn" onClick={() => setFeedModal({ show: true, mode: 'add', data: { item_name: '', category_id: '', default_cost_per_unit: '', default_source: 'Purchased' } })}>
                      <Plus size={14} /> Add New
                    </button>
                  </div>
                  <p className="panel-desc">Configure standard costs and sources for feed logs.</p>
                  <div className="master-table-wrapper">
                    <table className="settings-table">
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>Category</th>
                          <th>Default Cost (₹)</th>
                          <th>Default Source</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedItems.map(item => (
                          <tr key={item.id}>
                            <td>{item.item_name}</td>
                            <td>{item.category_name}</td>
                            <td>₹{item.default_cost_per_unit}</td>
                            <td>{item.default_source}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="icon-btn" onClick={() => setFeedModal({ show: true, mode: 'edit', data: item })} title="Edit Item">
                                  <Edit2 size={14} />
                                </button>
                                <button className="icon-btn" style={{ color: '#ef4444' }} onClick={() => handleDeleteFeedItem(item.id)} title="Delete Item">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Medicine Master */}
              {activeTab === 'med-master' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2>Medicine Master</h2>
                    <button className="add-master-btn" onClick={() => setMedModal({ show: true, mode: 'add', data: { medicine_name: '', category: 'Medicine', description: '' } })}>
                      <Plus size={14} /> Add New
                    </button>
                  </div>
                  <p className="panel-desc">Manage the registry of available medicines and treatments.</p>
                  <div className="master-table-wrapper">
                    <table className="settings-table">
                      <thead>
                        <tr>
                          <th>Medicine Name</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicines.map(med => (
                          <tr key={med.id}>
                            <td>{med.medicine_name}</td>
                            <td className="med-cat-cell">{med.category}</td>
                            <td className="small-text">{med.description || '-'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="icon-btn" onClick={() => setMedModal({ show: true, mode: 'edit', data: med })} title="Edit Medicine">
                                  <Edit2 size={14} />
                                </button>
                                <button className="icon-btn" style={{ color: '#ef4444' }} onClick={() => handleDeleteMedicine(med.id)} title="Delete Medicine">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Cow Master */}
              {activeTab === 'cow-master' && (
                <>
                  <h2>Cow Master Configuration</h2>
                  <p className="panel-desc">Manage standard dropdown options globally.</p>
                  
                  <div className="settings-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ margin: 0 }}>Available Breeds</label>
                      <button type="button" className="add-master-btn" disabled={!isEditing} style={{ opacity: isEditing ? 1 : 0.5, cursor: isEditing ? 'pointer' : 'not-allowed' }} onClick={() => addCowFormOption('breeds', 'Breed')}>
                        <Plus size={14} /> Add Breed
                      </button>
                    </div>
                    <div className="cow-options-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      {cowFormSettings.breeds.map(breed => (
                        <div key={breed} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '16px', fontSize: '13px' }}>
                          <span>{breed}</span>
                          {isEditing && breed !== 'Other' && (
                            <button type="button" onClick={() => removeCowFormOption('breeds', breed)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}>
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="settings-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ margin: 0 }}>Available Cow Types</label>
                      <button type="button" className="add-master-btn" disabled={!isEditing} style={{ opacity: isEditing ? 1 : 0.5, cursor: isEditing ? 'pointer' : 'not-allowed' }} onClick={() => addCowFormOption('cow_types', 'Cow Type')}>
                        <Plus size={14} /> Add Type
                      </button>
                    </div>
                    <div className="cow-options-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      {cowFormSettings.cow_types.map(type => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '16px', fontSize: '13px' }}>
                          <span>{type}</span>
                          {isEditing && type !== 'Other' && (
                            <button type="button" onClick={() => removeCowFormOption('cow_types', type)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}>
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {renderActionButtons(handleAdminSave)}
                </>
              )}

              {/* Alerts (Admin) */}
              {activeTab === 'alerts' && isAdmin && (
                <>
                  <h2>Alert Thresholds</h2>
                  <p className="panel-desc">Configure automated system warnings.</p>
                  <div className="settings-form-group">
                    <label>Milk Drop Alert Limit (Liters)</label>
                    <input type="number" step="0.5" disabled={!isEditing} value={alerts.milk_drop_threshold} onChange={e => setAlerts({...alerts, milk_drop_threshold: Number(e.target.value)})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Low Feed Warning (kg)</label>
                    <input type="number" disabled={!isEditing} value={alerts.low_feed_threshold} onChange={e => setAlerts({...alerts, low_feed_threshold: Number(e.target.value)})} />
                  </div>
                  {renderActionButtons(handleAdminSave)}
                </>
              )}

              {/* Profile */}
              {activeTab === 'profile' && (
                <>
                  <h2>Personal Profile</h2>
                  <p className="panel-desc">Change your localized identity settings.</p>
                  <div className="settings-form-group">
                    <label>Display Name</label>
                    <input type="text" disabled={!isEditing} value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Email Address</label>
                    <input type="email" disabled={!isEditing} value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                  </div>
                  {renderActionButtons(handleProfileSave)}
                </>
              )}

              {/* Security */}
              {activeTab === 'security' && (
                <>
                  <h2>Security Credentials</h2>
                  <p className="panel-desc">Change your master login password.</p>
                  <div className="settings-form-group">
                    <label>New Password</label>
                    <input type="password" disabled={!isEditing} value={passwordForm.password} onChange={e => setPasswordForm({...passwordForm, password: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Confirm Password</label>
                    <input type="password" disabled={!isEditing} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                  </div>
                  {renderActionButtons(handlePasswordSave)}
                </>
              )}

              {/* Backup */}
              {activeTab === 'backup' && isAdmin && (
                <>
                  <h2>Database Controls</h2>
                  <p className="panel-desc">Extract raw snapshots of the database.</p>
                  <div className="danger-zone">
                    <h3>Generate Data Backup</h3>
                    <p>Computes a unified ledger block across cows, milk, and feed logs.</p>
                    <button type="button" className="settings-backup-btn" onClick={handleBackup} disabled={saving}>
                      <DatabaseBackup size={16} /> Run Backup Sequence
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {feedModal.show && (
        <div className="modal-overlay">
          <div className="settings-modal" style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>{feedModal.mode === 'add' ? 'Add Feed Item' : 'Edit Feed Item'}</h3>
            <div className="settings-form-group">
              <label>Item Name</label>
              <input type="text" value={feedModal.data.item_name} onChange={e => setFeedModal(p => ({...p, data: {...p.data, item_name: e.target.value}}))} />
            </div>
            <div className="settings-form-group">
              <label>Category</label>
              <select value={feedModal.data.category_id} onChange={e => setFeedModal(p => ({...p, data: {...p.data, category_id: e.target.value}}))}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </div>
            <div className="settings-form-group">
              <label>Cost per unit (₹)</label>
              <input type="number" step="0.5" value={feedModal.data.default_cost_per_unit} onChange={e => setFeedModal(p => ({...p, data: {...p.data, default_cost_per_unit: e.target.value}}))} />
            </div>
            <div className="settings-form-group">
              <label>Default Source</label>
              <select value={feedModal.data.default_source} onChange={e => setFeedModal(p => ({...p, data: {...p.data, default_source: e.target.value}}))}>
                <option value="Purchased">Purchased</option>
                <option value="Farm Produced">Farm Produced</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="settings-cancel-btn" style={{ flex: 1 }} onClick={() => setFeedModal({ show: false, mode: 'add', data: {} })}>Cancel</button>
              <button className="settings-save-btn" style={{ flex: 1 }} onClick={handleSaveFeedItem}>Save</button>
            </div>
          </div>
        </div>
      )}

      {medModal.show && (
        <div className="modal-overlay">
          <div className="settings-modal" style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>{medModal.mode === 'add' ? 'Add Medicine' : 'Edit Medicine'}</h3>
            <div className="settings-form-group">
              <label>Medicine Name</label>
              <input type="text" value={medModal.data.medicine_name} onChange={e => setMedModal(p => ({...p, data: {...p.data, medicine_name: e.target.value}}))} />
            </div>
            <div className="settings-form-group">
              <label>Category</label>
              <select value={medModal.data.category} onChange={e => setMedModal(p => ({...p, data: {...p.data, category: e.target.value}}))}>
                <option value="Medicine">Medicine</option>
                <option value="Supplement">Supplement</option>
                <option value="Multivitamin">Multivitamin</option>
                <option value="Treatment">Treatment</option>
              </select>
            </div>
            <div className="settings-form-group">
              <label>Description (Optional)</label>
              <textarea value={medModal.data.description || ''} onChange={e => setMedModal(p => ({...p, data: {...p.data, description: e.target.value}}))} rows="3" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}></textarea>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="settings-cancel-btn" style={{ flex: 1 }} onClick={() => setMedModal({ show: false, mode: 'add', data: {} })}>Cancel</button>
              <button className="settings-save-btn" style={{ flex: 1 }} onClick={handleSaveMedicine}>Save</button>
            </div>
          </div>
        </div>
      )}

      {cowTypeModal.show && (
        <div className="modal-overlay">
          <div className="settings-modal" style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '350px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Add {cowTypeModal.label}</h3>
            <div className="settings-form-group">
              <label>Name</label>
              <input type="text" autoFocus value={cowTypeModal.val} onChange={e => setCowTypeModal(p => ({...p, val: e.target.value}))} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="settings-cancel-btn" style={{ flex: 1 }} onClick={() => setCowTypeModal({ show: false, field: '', label: '', val: '' })}>Cancel</button>
              <button className="settings-save-btn" style={{ flex: 1 }} onClick={handleSaveCowOption}>Add</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Settings;
