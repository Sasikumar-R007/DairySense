import { useAuth } from '../context/AuthContext';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Plus, 
  Wheat, 
  Milk, 
  Syringe, 
  ClipboardList, 
  Monitor, 
  UserCog, 
  LogOut, 
  Database
} from 'lucide-react';
import '../pages/Dashboard.css'; // Contains the sidebar styles

function Layout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isWorker = currentUser?.role === 'worker';
  const perms = currentUser?.permissions || {};

  const canManageMedicine = !isWorker || perms.canManageMedicine;
  const canManageActivities = !isWorker || perms.canManageActivities;
  const canViewReports = !isWorker || perms.canViewReports;
  const canManageSettings = !isWorker || perms.canManageSettings;

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      await logout();
      navigate('/');
    }
  };

  const getUserDisplayName = () => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    if (currentUser?.phoneNumber) return currentUser.phoneNumber;
    return 'User';
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="erp-dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="erp-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">DS</div>
          <div className="brand-text">
            <h2>DairySense</h2>
            <span>ERP System</span>
          </div>
        </div>

        <div className="sidebar-scrollable">
          <nav className="erp-nav-menu">
            <div className="nav-section">
              <h3 className="nav-heading">Main Menu</h3>
              <button className={`nav-item ${isActive('/dashboard')}`} onClick={() => navigate('/dashboard')}>
                <LayoutDashboard size={18} />
                <span>Command Center</span>
              </button>
            </div>

            <div className="nav-section">
              <h3 className="nav-heading">Livestock Management</h3>
              <button className={`nav-item ${isActive('/cows')}`} onClick={() => navigate('/cows')}>
                <Users size={18} />
                <span>Cow Directory</span>
              </button>
              {canManageSettings && (
                <button className={`nav-item ${isActive('/add-cow')}`} onClick={() => navigate('/add-cow')}>
                  <Plus size={18} />
                  <span>Register Animal</span>
                </button>
              )}
            </div>

            <div className="nav-section">
              <h3 className="nav-heading">Daily Operations</h3>
              <button className={`nav-item ${isActive('/milk-log')}`} onClick={() => navigate('/milk-log')}>
                <Milk size={18} />
                <span>Milk Production</span>
              </button>
              <button className={`nav-item ${isActive('/feed-log')}`} onClick={() => navigate('/feed-log')}>
                <Wheat size={18} />
                <span>Feed Inventory</span>
              </button>
              {canManageMedicine && (
                <button className={`nav-item ${isActive('/medicine-log')}`} onClick={() => navigate('/medicine-log')}>
                  <Syringe size={18} />
                  <span>Health & Medicine</span>
                </button>
              )}
              {canManageActivities && (
                <button className={`nav-item ${isActive('/farm-activities')}`} onClick={() => navigate('/farm-activities')}>
                  <ClipboardList size={18} />
                  <span>Farm Activities</span>
                </button>
              )}
            </div>

            <div className="nav-section">
              <h3 className="nav-heading">System Admin</h3>
              {!isWorker && (
                <button className={`nav-item ${isActive('/worker-management')}`} onClick={() => navigate('/worker-management')}>
                  <UserCog size={18} />
                  <span>Staff & Access</span>
                </button>
              )}
              {canViewReports && (
                <button className={`nav-item ${isActive('/master-report')}`} onClick={() => navigate('/master-report')}>
                  <Database size={18} />
                  <span>Master Reports</span>
                </button>
              )}
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <div className="avatar">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name" title={getUserDisplayName()}>
                {getUserDisplayName()}
              </span>
              <span className="user-role">{currentUser?.role?.toUpperCase() || 'STAFF'}</span>
            </div>
            <button className="logout-action" onClick={handleLogout} title="Secure Logout" style={{width: 'auto', padding: '0 12px'}}>
              <LogOut size={16} /> <span style={{fontSize: '13px', fontWeight: 'bold', marginLeft: '6px'}}>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="erp-main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
