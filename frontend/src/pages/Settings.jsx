import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsAPI, userAPI } from '../services/api';
import { 
  Save, Shield, User, Bell, Factory, DatabaseBackup, CheckCircle2, Edit3, XCircle
} from 'lucide-react';
import './Settings.css';

function Settings() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'farm' : 'profile');
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Admin states
  const [farmProfile, setFarmProfile] = useState({ name: '', email: '', phone: '' });
  const [alerts, setAlerts] = useState({ milk_drop_threshold: 2.0, low_feed_threshold: 50, low_medicine_threshold: 10 });
  const [hardware, setHardware] = useState({ rfid_enabled: true, qr_enabled: true });

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
      if (isAdmin) loadSettings();
    }
  }, [currentUser, isAdmin]);

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
      showMessage('success', 'Personal profile updated! (Relogin to see header changes)');
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
      showMessage('success', `Backup generated! Reference ID: ${resp.backup_id} at ${new Date(resp.timestamp).toLocaleString()}`);
    } catch (err) {
      showMessage('error', 'Failed to generate backup');
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
          if (window.confirm('Are you absolutely sure you want to apply these configuration changes?')) {
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
          {isAdmin && (
            <div className="settings-sidebar-section">
              <h4>Global Admin</h4>
              <button 
                className={`tab-btn ${activeTab === 'farm' ? 'active' : ''}`}
                onClick={() => handleTabChange('farm')}
              >
                <Factory size={16} /> Farm Profile
              </button>
              <button 
                className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
                onClick={() => handleTabChange('alerts')}
              >
                <Bell size={16} /> Alert Thresholds
              </button>
              <button 
                className={`tab-btn ${activeTab === 'hardware' ? 'active' : ''}`}
                onClick={() => handleTabChange('hardware')}
              >
                <Shield size={16} /> Hardware Toggles
              </button>
              <button 
                className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
                onClick={() => handleTabChange('backup')}
              >
                <DatabaseBackup size={16} /> Database
              </button>
            </div>
          )}

          <div className="settings-sidebar-section">
            <h4>Personal Account</h4>
            <button 
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              <User size={16} /> My Profile
            </button>
            <button 
              className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => handleTabChange('security')}
            >
              <Shield size={16} /> Security
            </button>
          </div>
        </div>

        <div className="settings-content">
          {loading ? (
            <div className="settings-loading" style={{ padding: '32px' }}>Loading configuration data from server...</div>
          ) : (
            <>
              {/* ADMIN: Farm Profile */}
              {activeTab === 'farm' && isAdmin && (
                <div className="settings-form-panel">
                  <h2>Farm Profile</h2>
                  <p className="panel-desc">Official configuration for PDF reports and system headers.</p>
                  
                  <div className="settings-form-group">
                    <label>Farm Name</label>
                    <input type="text" value={farmProfile.name} disabled={!isEditing} onChange={e => setFarmProfile({...farmProfile, name: e.target.value})} placeholder="e.g. DairySense Master Farm" />
                  </div>
                  <div className="settings-form-group">
                    <label>Contact Email</label>
                    <input type="email" value={farmProfile.email} disabled={!isEditing} onChange={e => setFarmProfile({...farmProfile, email: e.target.value})} placeholder="Official email address" />
                  </div>
                  <div className="settings-form-group">
                    <label>Phone Number</label>
                    <input type="text" value={farmProfile.phone} disabled={!isEditing} onChange={e => setFarmProfile({...farmProfile, phone: e.target.value})} placeholder="Primary contact number" />
                  </div>

                  {renderActionButtons(handleAdminSave)}
                </div>
              )}

              {/* ADMIN: Alerts */}
              {activeTab === 'alerts' && isAdmin && (
                <div className="settings-form-panel">
                  <h2>Alert Thresholds</h2>
                  <p className="panel-desc">Configure the trigger limits for automated system warnings on monitoring pages.</p>
                  
                  <div className="settings-form-group">
                    <label>Milk Drop Alert Limit (Liters)</label>
                    <input type="number" step="0.5" disabled={!isEditing} value={alerts.milk_drop_threshold} onChange={e => setAlerts({...alerts, milk_drop_threshold: Number(e.target.value)})} />
                    <span className="help-text">System alerts if a cow's yield drops by this metric compared to yesterday.</span>
                  </div>
                  <div className="settings-form-group">
                    <label>Low Feed Warning (kg)</label>
                    <input type="number" disabled={!isEditing} value={alerts.low_feed_threshold} onChange={e => setAlerts({...alerts, low_feed_threshold: Number(e.target.value)})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Low Medicine Stock (Units)</label>
                    <input type="number" disabled={!isEditing} value={alerts.low_medicine_threshold} onChange={e => setAlerts({...alerts, low_medicine_threshold: Number(e.target.value)})} />
                  </div>

                  {renderActionButtons(handleAdminSave)}
                </div>
              )}

              {/* ADMIN: Hardware */}
              {activeTab === 'hardware' && isAdmin && (
                <div className="settings-form-panel">
                  <h2>Hardware Toggles</h2>
                  <p className="panel-desc">Enable or suppress hardware scanning flows globally.</p>
                  
                  <div className="toggle-group" style={{ opacity: isEditing ? 1 : 0.6 }}>
                    <label className="toggle-label" style={{ cursor: isEditing ? 'pointer' : 'not-allowed' }}>
                      <div>
                        <strong>RFID Integration</strong>
                        <p>Allow RFID tag mapping on the Add Cow setup phase.</p>
                      </div>
                      <input type="checkbox" disabled={!isEditing} checked={hardware.rfid_enabled} onChange={e => setHardware({...hardware, rfid_enabled: e.target.checked})} />
                    </label>
                  </div>
                  <div className="toggle-group" style={{ opacity: isEditing ? 1 : 0.6 }}>
                    <label className="toggle-label" style={{ cursor: isEditing ? 'pointer' : 'not-allowed' }}>
                      <div>
                        <strong>QR Code Scanning</strong>
                        <p>Allow QR scanning generation and reading.</p>
                      </div>
                      <input type="checkbox" disabled={!isEditing} checked={hardware.qr_enabled} onChange={e => setHardware({...hardware, qr_enabled: e.target.checked})} />
                    </label>
                  </div>

                  {renderActionButtons(handleAdminSave)}
                </div>
              )}

              {/* ADMIN: Backup */}
              {activeTab === 'backup' && isAdmin && (
                <div className="settings-form-panel">
                  <h2>Database Controls</h2>
                  <p className="panel-desc">Extract raw snapshots of the PostgreSQL database natively to JSON.</p>
                  
                  <div className="danger-zone">
                    <h3>Generate Data Backup</h3>
                    <p>This action computes a unified ledger block across cows, milk, and feed logs returning a traceable backup ID.</p>
                    <button type="button" className="settings-backup-btn" onClick={() => {
                      if(window.confirm('Execute raw database snapshot pull?')) {
                        handleBackup();
                      }
                    }} disabled={saving}>
                      <DatabaseBackup size={16} /> {saving ? 'Generating...' : 'Run Backup Sequence'}
                    </button>
                  </div>
                </div>
              )}

              {/* USER: Profile */}
              {activeTab === 'profile' && (
                <form className="settings-form-panel" onSubmit={(e) => e.preventDefault()}>
                  <h2>Personal Profile</h2>
                  <p className="panel-desc">Change your localized identity settings.</p>
                  
                  <div className="settings-form-group">
                    <label>Full Display Name</label>
                    <input type="text" disabled={!isEditing} value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Mobile Number</label>
                    <input type="text" disabled={!isEditing} value={profileForm.phoneNumber} onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})} />
                  </div>
                  <div className="settings-form-group">
                    <label>Email Address</label>
                    <input type="email" disabled={!isEditing} value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                  </div>

                  {renderActionButtons(handleProfileSave)}
                </form>
              )}

              {/* USER: Security */}
              {activeTab === 'security' && (
                <form className="settings-form-panel" onSubmit={(e) => e.preventDefault()}>
                  <h2>Security Credentials</h2>
                  <p className="panel-desc">Change your master login password.</p>
                  
                  <div className="settings-form-group">
                    <label>New Password</label>
                    <input type="password" disabled={!isEditing} value={passwordForm.password} onChange={e => setPasswordForm({...passwordForm, password: e.target.value})} placeholder="Minimum 6 characters" required />
                  </div>
                  <div className="settings-form-group">
                    <label>Confirm New Password</label>
                    <input type="password" disabled={!isEditing} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} placeholder="Repeat the precise password above" required />
                  </div>

                  {renderActionButtons(handlePasswordSave)}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
