import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsAPI, userAPI, feedAPI, medicineAPI } from '../services/api';
import { 
  Save, Shield, User, Bell, Factory, DatabaseBackup, CheckCircle2, Edit3, XCircle, Wheat, Syringe, Plus, Edit2
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

  // Master Data states
  const [feedItems, setFeedItems] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);

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
        hardware
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

  const handleUpdateFeedItem = async (item) => {
    const newCost = window.prompt(`Enter default cost for ${item.item_name} (₹/kg):`, item.default_cost_per_unit);
    if (newCost !== null) {
      try {
        setSaving(true);
        await feedAPI.updateItem(item.id, { default_cost_per_unit: parseFloat(newCost) });
        showMessage('success', 'Feed item updated');
        loadMasterData();
      } catch (err) {
        showMessage('error', 'Failed to update item');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddMedicine = async () => {
    const name = window.prompt('Enter new medicine name:');
    if (!name) return;
    const cat = window.prompt('Enter category (Medicine, Supplement, Multivitamin, Treatment):', 'Medicine');
    if (!cat) return;
    
    try {
      setSaving(true);
      await medicineAPI.addMedicine({ medicine_name: name, category: cat });
      showMessage('success', 'Medicine added to master');
      loadMasterData();
    } catch (err) {
      showMessage('error', 'Failed to add medicine');
    } finally {
      setSaving(false);
    }
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
                              <button className="icon-btn" onClick={() => handleUpdateFeedItem(item)} title="Edit Cost">
                                <Edit2 size={14} />
                              </button>
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
                    <button className="add-master-btn" onClick={handleAddMedicine}>
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
                        </tr>
                      </thead>
                      <tbody>
                        {medicines.map(med => (
                          <tr key={med.id}>
                            <td>{med.medicine_name}</td>
                            <td className="med-cat-cell">{med.category}</td>
                            <td className="small-text">{med.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
    </div>
  );
}

export default Settings;
