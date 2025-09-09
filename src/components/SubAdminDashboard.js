import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import FileUpload from './FileUpload';
import RecordsView from './RecordsView';
import '../styles/SubAdminDashboard.css';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';

const LogoutConfirmDialog = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="sa-logout-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sa-logout-title"
        aria-describedby="sa-logout-desc"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="sa-logout-dialog"
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sa-logout-header">
            <div className="sa-logout-icon">
              <LogOut size={20} />
            </div>
            <div>
              <h3 id="sa-logout-title" className="sa-logout-title">Sign out</h3>
              <p id="sa-logout-desc" className="sa-logout-message">
                Are you sure you want to logout?
              </p>
            </div>
          </div>

          <div className="sa-logout-actions">
            <button className="sa-btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="sa-btn-logout" onClick={onConfirm}>
              Logout
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const SubAdminDashboard = () => {
  const { currentUser, userRole, userName, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    pendingFiles: 0,
    completedFiles: 0,
    inProgressFiles: 0
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: state for logout dialog
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (userRole === 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchUserStats();
  }, [currentUser, userRole]);

  const fetchUserStats = () => {
    if (!currentUser) return;
    setLoading(true);

    const dataRef = ref(database, 'data');
    onValue(
      dataRef,
      snapshot => {
        const data = snapshot.val();
        let files = [];
        if (data) {
          files = Object.entries(data).map(([id, value]) => ({
            id,
            ...value
          }));
        }

        const userFiles = files.filter(f => f.uploadedBy === currentUser.uid);
        const totalFiles = userFiles.length;
        const pendingFiles = userFiles.filter(f => f.status === 'Pending').length;
        const completedFiles = userFiles.filter(f => f.status === 'Completed').length;
        const inProgressFiles = userFiles.filter(f => f.status === 'In Progress').length;

        setStats({ totalFiles, pendingFiles, completedFiles, inProgressFiles });
        setRecentFiles(
          userFiles
            .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
            .slice(0, 5)
        );
        setLoading(false);
      },
      error => {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const confirmLogout = async () => {
    try {
      await handleLogout();
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'upload', label: 'Upload Files', icon: '📤' },
    { id: 'myfiles', label: 'My Files', icon: '📁' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewContent
            stats={stats}
            recentFiles={recentFiles}
            loading={loading}
            setActiveTab={setActiveTab}
          />
        );
      case 'upload':
        return <div className="dashboard-content-wrapper"><FileUpload /></div>;
      case 'myfiles':
        return <div className="dashboard-content-wrapper"><RecordsView /></div>;
      default:
        return (
          <OverviewContent
            stats={stats}
            recentFiles={recentFiles}
            loading={loading}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div className={`subadmin-dashboard ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🏢</span>
            {!sidebarCollapsed && <span className="logo-text">SubAdmin</span>}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setLogoutDialogOpen(true)}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-header">
          <h1>Welcome, {userName || currentUser?.email?.split('@')[0]} 👋</h1>
          <div className="header-actions">
            <button className="notification-btn">
              🔔 <span className="notification-count">{stats.pendingFiles}</span>
            </button>
          </div>
        </div>
        <div className="content-body">{renderContent()}</div>
      </main>

      {/* Logout confirmation dialog */}
      <LogoutConfirmDialog
        isOpen={logoutDialogOpen}
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

const OverviewContent = ({ stats, recentFiles, loading, setActiveTab }) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="overview-content">
      <div className="stats-grid">
        {[
          { label: 'Total Files', value: stats.totalFiles, icon: '📄', class: 'total' },
          { label: 'Pending', value: stats.pendingFiles, icon: '⏳', class: 'pending' },
          { label: 'In Progress', value: stats.inProgressFiles, icon: '🔄', class: 'progress' },
          { label: 'Completed', value: stats.completedFiles, icon: '✅', class: 'completed' },
        ].map((stat, index) => (
          <div key={index} className={`stat-card ${stat.class}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <div className="stat-number">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="recent-files-section">
        <h3>Recent Files</h3>
        {recentFiles.length === 0 ? (
          <div className="empty-state">
            <p>📄 No files uploaded yet</p>
            <p>Start by uploading your first file!</p>
          </div>
        ) : (
          <div className="recent-files-list">
            {recentFiles.map(file => (
              <div key={file.id} className="recent-file-item">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <div className="file-name">{file.fileName}</div>
                  <div className="file-subject">{file.subject}</div>
                  <div className="file-date">{new Date(file.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`file-status ${file.status?.toLowerCase().replace(' ', '-')}`}>
                  {file.status || 'Pending'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn upload" onClick={() => setActiveTab('upload')}>
            📤 Upload New File
          </button>
          <button className="action-btn view" onClick={() => setActiveTab('myfiles')}>
            👁️ View All Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubAdminDashboard;