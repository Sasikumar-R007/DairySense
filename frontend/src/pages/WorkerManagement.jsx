import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  UserPlus, 
  Trash2,
  Edit2,
  X,
  UserCog,
  ShieldAlert,
  CheckCircle2,
  Clock
} from 'lucide-react';
import './WorkerManagement.css';

function WorkerManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Form State
  const defaultFormData = {
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    permissions: {
      canViewReports: false,
      canManageMedicine: false,
      canManageSettings: false,
      canManageActivities: false
    }
  };
  const [formData, setFormData] = useState(defaultFormData);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePermissionChange = (permName) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permName]: !prev.permissions[permName]
      }
    }));
  };

  const openAddModal = () => {
    setFormData(defaultFormData);
    setShowAddModal(true);
  };

  const openEditModal = (worker) => {
    setFormData({
      ...worker,
      phoneNumber: worker.phone_number || worker.phoneNumber || '',
      password: '', // Blank unless they want to change it
    });
    setEditingWorker(worker.id);
  };

  const openAdminModal = () => {
    const adminData = users.find(u => u.id === currentUser.userId) || currentUser;
    setFormData({
      name: adminData.name || '',
      phoneNumber: adminData.phoneNumber || adminData.phone_number || '',
      email: adminData.email || '',
      password: '',
      permissions: adminData.permissions || defaultFormData.permissions
    });
    setShowAdminModal(true);
  };

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    try {
      if (editingWorker) {
        // Update existing worker
        const updateData = { ...formData, role: 'worker' };
        if (!updateData.password) delete updateData.password;
        await userAPI.updateUser(editingWorker, updateData);
        setEditingWorker(null);
      } else {
        // Create new worker
        await userAPI.createUser({
          ...formData,
          role: 'worker'
        });
        setShowAddModal(false);
      }
      setFormData(defaultFormData);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to save worker');
    }
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    try {
      // Check if they are modifying critical credentials
      const adminData = users.find(u => u.id === (currentUser.userId || currentUser.id)) || currentUser;
      const originalPhone = adminData.phoneNumber || adminData.phone_number || '';
      
      if (formData.phoneNumber !== originalPhone || formData.password !== '') {
        if (!window.confirm("You are changing your primary login credentials (mobile number or password). If you proceed, you will need to restart your session with these new credentials. Are you sure?")) {
          return;
        }
      }

      const updateData = { ...formData, role: currentUser.role || 'admin' };
      if (!updateData.password) delete updateData.password;
      
      const targetId = currentUser.userId || currentUser.id;
      if (!targetId) throw new Error("Could not determine user ID for update.");
      
      await userAPI.updateUser(targetId, updateData);
      setShowAdminModal(false);
      setFormData(defaultFormData);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update admin profile');
    }
  };

  const handleDeleteWorker = async (id) => {
    if (!window.confirm("Are you sure you want to delete this worker? This cannot be undone.")) return;
    try {
      await userAPI.deleteUser(id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete worker');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const isActive = (lastActive) => {
    if (!lastActive) return false;
    const minutes = (new Date() - new Date(lastActive)) / 1000 / 60;
    return minutes < 15; // Active meaning activity within last 15 minutes
  };

  const workers = users.filter(u => u.role === 'worker');

  const renderWorkerForm = (onSubmit, onCancel, isEditing, isAdmin = false) => (
    <form onSubmit={onSubmit}>
      <div className="modal-body">
        <div className="form-group">
          <label>Full Name</label>
          <input 
            type="text" 
            required 
            value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="e.g. John Doe"
          />
        </div>
        
        <div className="form-group">
          <label>Mobile Number (For Login)</label>
          <input 
            type="text" 
            required={!isAdmin} 
            value={formData.phoneNumber || ''}
            onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
            placeholder="e.g. 9876543210"
          />
        </div>

        {isAdmin && (
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={formData.email || ''}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="admin@example.com"
            />
          </div>
        )}

        <div className="form-group">
          <label>{isEditing ? 'New Password/PIN (leave blank to keep current)' : 'Initial Password/PIN'}</label>
          <input 
            type="password" 
            required={!isEditing} 
            value={formData.password || ''}
            onChange={e => setFormData({...formData, password: e.target.value})}
            placeholder={isEditing ? '******' : 'e.g. 1234'}
          />
        </div>

        {!isAdmin && (
          <div className="permissions-section">
            <h3>Worker Permissions</h3>
            <p className="permissions-sub">Feed & Milk tracking operations are permanently enabled for staff.</p>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.permissions?.canViewReports || false} onChange={() => handlePermissionChange('canViewReports')} />
                View advanced analytics
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.permissions?.canManageMedicine || false} onChange={() => handlePermissionChange('canManageMedicine')} />
                Manage medicine & health
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.permissions?.canManageActivities || false} onChange={() => handlePermissionChange('canManageActivities')} />
                Manage farm activities
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.permissions?.canManageSettings || false} onChange={() => handlePermissionChange('canManageSettings')} />
                Modify farm settings
              </label>
            </div>
          </div>
        )}
      </div>
      
      <div className="modal-footer">
        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="save-btn">{isEditing ? 'Save Changes' : 'Create Worker'}</button>
      </div>
    </form>
  );

  return (
    <div className="worker-management-page">
      <header className="page-header">
        <div className="header-breadcrumbs">
          <button className="back-btn-subtle" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>
        <div className="header-main-row">
          <div>
            <h1>Worker Management</h1>
            <p className="subtitle">Manage farm staff access, permissions, and status.</p>
          </div>
          <div className="header-actions">
            <button className="admin-profile-btn" onClick={openAdminModal}>
              <UserCog size={18} />
              <span>Admin Profile</span>
            </button>
            <button className="primary-action-btn" onClick={openAddModal}>
              <UserPlus size={18} />
              <span>Add Worker</span>
            </button>
          </div>
        </div>
      </header>

      {error && <div className="erp-alert error">{error}</div>}

      <div className="table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Worker Name</th>
              <th>Login Details</th>
              <th>Permissions</th>
              <th>Last Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center" style={{padding: '40px'}}>Loading workers...</td></tr>
            ) : workers.length === 0 ? (
              <tr><td colSpan="6" className="text-center empty-state" style={{padding: '40px'}}>No workers registered yet.</td></tr>
            ) : (
              workers.map(worker => {
                const active = isActive(worker.last_active_at);
                const hasPerms = worker.permissions && Object.values(worker.permissions).some(v => v);
                
                return (
                  <tr key={worker.id}>
                    <td>
                      {active ? (
                        <span className="status-badge active"><span className="dot"></span> Online</span>
                      ) : (
                        <span className="status-badge offline">Offline</span>
                      )}
                    </td>
                    <td className="font-medium text-dark">{worker.name || 'Unnamed Worker'}</td>
                    <td>
                      <div className="text-sm">Ph: {worker.phone_number || 'N/A'}</div>
                    </td>
                    <td>
                      {hasPerms ? (
                        <span className="role-tag privileged"><ShieldAlert size={14} /> Elevated</span>
                      ) : (
                        <span className="role-tag basic"><CheckCircle2 size={14} /> Basic Entry</span>
                      )}
                    </td>
                    <td>
                      <div className="timestamp-group">
                        <Clock size={14} />
                        <span>{formatDateTime(worker.last_login_at)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn edit-btn" onClick={() => openEditModal(worker)} title="Edit Worker">
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn delete-btn" onClick={() => handleDeleteWorker(worker.id)} title="Remove Worker">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="erp-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
                <h2>Add New Worker</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20}/></button>
             </div>
             {renderWorkerForm(handleSaveWorker, () => setShowAddModal(false), false)}
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {editingWorker && (
        <div className="erp-modal-overlay" onClick={() => setEditingWorker(null)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
                <h2>Edit Worker Details</h2>
                <button className="close-btn" onClick={() => setEditingWorker(null)}><X size={20}/></button>
             </div>
             {renderWorkerForm(handleSaveWorker, () => setEditingWorker(null), true)}
          </div>
        </div>
      )}

      {/* Admin Profile Modal */}
      {showAdminModal && (
        <div className="erp-modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
                <h2>Admin Profile Settings</h2>
                <button className="close-btn" onClick={() => setShowAdminModal(false)}><X size={20}/></button>
             </div>
             <div style={{padding: '0 20px', marginTop: '16px'}}>
               <div className="erp-alert info" style={{marginBottom: 0}}>
                 Updating these details will change your master login credentials.
               </div>
             </div>
             {renderWorkerForm(handleSaveAdmin, () => setShowAdminModal(false), true, true)}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerManagement;
