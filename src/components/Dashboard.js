import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref as dbRef, onValue } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import FileUpload from './FileUpload';
import FileRecordsList from './RecordsView';
import '../styles/Dashboard.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, Trash2, Eye, X, LayoutDashboard, CheckCircle, AlertCircle, Info, XCircle, LogOut } from 'lucide-react';

// Toast Context
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Default duration: 3000ms (3 sec)
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToasts(prevToasts => [...prevToasts, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const value = useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    info: (message, duration) => addToast(message, 'info', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
  }), [toasts, addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast Container Component
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast Component
const Toast = ({ message, type, onClose }) => {
  // Auto-dismiss is handled by ToastProvider (based on duration passed to addToast)

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const backgroundColor = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className="toast"
      style={{ background: backgroundColor[type] }}
    >
      <div className="toast-content">
        <span className="toast-icon">{icons[type]}</span>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </motion.div>
  );
};

// Confirmation Dialog Component (existing for delete)
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dialog-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="dialog-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dialog-header">
            <AlertCircle size={24} className="dialog-icon" />
            <h3>{title}</h3>
          </div>
          <div className="dialog-body">
            <p>{message}</p>
          </div>
          <div className="dialog-footer">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-danger" onClick={onConfirm}>
              Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// NEW: Modern Logout Confirmation Dialog
const LogoutConfirmDialog = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="logout-dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-desc"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="logout-dialog"
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="logout-dialog-header">
            <div className="logout-icon-wrap">
              <LogOut size={20} />
            </div>
            <div>
              <h3 id="logout-dialog-title" className="logout-dialog-title">Sign out</h3>
              <p id="logout-dialog-desc" className="logout-dialog-message">
                Are you sure you want to logout?
              </p>
            </div>
          </div>
          <div className="logout-dialog-actions">
            <button className="btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-logout" onClick={onConfirm}>
              Logout
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * PortfolioContent moved out of Dashboard to avoid remounts on Dashboard re-renders.
 * Effect depends only on uid to prevent unnecessary refetches.
 */
const PortfolioContent = ({ currentUser }) => {
  const { success, error } = useToast();
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [portfolioError, setPortfolioError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setLoadingFiles(false);
      setPortfolioError('User not authenticated');
      error('Please log in to access your files');
      return;
    }

    let isMounted = true;

    const fetchFiles = async () => {
      setLoadingFiles(true);
      try {
        const storage = getStorage();
        const folderRef = storageRef(storage, `personalFiles/${uid}`);
        const fileList = await listAll(folderRef);
        const filesData = await Promise.all(
          fileList.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return { name: itemRef.name, url, ref: itemRef };
          })
        );
        if (isMounted) {
          setPortfolioFiles(filesData);
          setPortfolioError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching portfolio files:', err);
          setPortfolioError('Failed to load files');
          error('Failed to load your files. Please try again.');
        }
      } finally {
        if (isMounted) setLoadingFiles(false);
      }
    };

    fetchFiles();
    return () => { isMounted = false; };
  }, [uid]); // only rerun when user changes

  const handleAddFilesClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png';
    fileInput.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (file && uid) {
        try {
          const storage = getStorage();
          const fileRef = storageRef(storage, `personalFiles/${uid}/${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          setPortfolioFiles((prev) => [...prev, { name: file.name, url, ref: fileRef }]);
          success('File uploaded successfully!');
        } catch (err) {
          console.error('Error uploading file:', err);
          error('Error uploading file: ' + err.message);
          setPortfolioError('Failed to upload file');
        }
      }
    };
    fileInput.click();
  };

  const handleDeleteClick = (fileRef, fileName) => {
    setFileToDelete({ ref: fileRef, name: fileName });
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (fileToDelete) {
      try {
        await deleteObject(fileToDelete.ref);
        setPortfolioFiles((prev) => prev.filter((file) => file.name !== fileToDelete.name));
        success('File deleted successfully!');
      } catch (err) {
        console.error('Error deleting file:', err);
        error('Error deleting file: ' + err.message);
        setPortfolioError('Failed to delete file');
      } finally {
        setDialogOpen(false);
        setFileToDelete(null);
      }
    }
  };

  const handleViewFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      setSelectedImage(file.url);
    } else {
      window.open(file.url, '_blank');
    }
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'txt':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      default:
        return '📁';
    }
  };

  return (
    <>
      <motion.div
        className="portfolio-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: '900px',
          margin: '40px auto',
          padding: '30px',
          background: 'linear-gradient(135deg, #ffffff, #f9fafb)',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="content-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
          <motion.h2
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            style={{ fontSize: '28px', fontWeight: '700', color: '#1a202c' }}
          >
            💼 Your Portfolio
          </motion.h2>
          <p style={{ fontSize: '16px', color: '#4a5568', marginTop: '8px' }}>
            Organize and showcase your professional files with ease
          </p>
        </div>

        <div className="file-upload-section" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <motion.button
            className="add-files-button"
            onClick={handleAddFilesClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(to right, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Upload size={20} /> Upload New File
          </motion.button>
        </div>

        <div className="portfolio-files-list">
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1a202c', marginBottom: '20px' }}>
            Your Files
          </h3>
          {portfolioError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: '#e53e3e', textAlign: 'center', marginBottom: '20px' }}
            >
              {portfolioError}
            </motion.p>
          )}
          {loadingFiles ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', color: '#4a5568' }}
            >
              Loading files...
            </motion.p>
          ) : portfolioFiles.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', color: '#4a5568', fontStyle: 'italic' }}
            >
              No files uploaded yet. Start by adding some files!
            </motion.p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <AnimatePresence>
                {portfolioFiles.map((file, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      padding: '16px',
                      marginBottom: '12px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'transform 0.2s',
                    }}
                    whileHover={{ transform: 'translateY(-2px)' }}
                  >
                    <span style={{ fontSize: '16px', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getFileIcon(file.name)} {file.name}
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <motion.button
                        onClick={() => handleViewFile(file)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(to right, #10b981, #059669)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Eye size={16} /> View
                      </motion.button>
                      <motion.a
                        href={file.url}
                        download
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Download size={16} /> Download
                      </motion.a>
                      <motion.button
                        onClick={() => handleDeleteClick(file.ref, file.name)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(to right, #ef4444, #dc2626)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Trash2 size={16} /> Delete
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
              }}
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                style={{
                  position: 'relative',
                  maxWidth: '90%',
                  maxHeight: '90%',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedImage}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain',
                    borderRadius: '10px',
                  }}
                />
                <motion.button
                  onClick={closeModal}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ConfirmationDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${fileToDelete?.name}? This action cannot be undone.`}
      />
    </>
  );
};

// Updated Dashboard Component
const Dashboard = () => {
  const { currentUser, userRole, userName, logout } = useAuth();
  const navigate = useNavigate();
  const { error, info } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    pendingFiles: 0,
    completedFiles: 0,
  });

  // NEW: state for logout dialog
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/subadmin-dashboard');
      return;
    }

    const db = getDatabase();
    const filesRef = dbRef(db, 'data');

    const unsubscribe = onValue(
      filesRef,
      (snapshot) => {
        const data = snapshot.val();
        const filesData = data
          ? Object.entries(data).map(([id, file]) => ({ id, ...file }))
          : [];
        setFiles(filesData);
        updateStats(filesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching files:', err);
        error('Error fetching files. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userRole, navigate, error]);

  const updateStats = (filesArray) => {
    const totalFiles = filesArray.length;
    const pendingFiles = filesArray.filter(
      (f) => f.status === 'Pending' || !f.status
    ).length;
    const completedFiles = filesArray.filter(
      (f) => f.status === 'Completed'
    ).length;

    setStats({
      totalFiles,
      pendingFiles,
      completedFiles,
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      info('Logged out successfully');
    } catch (err) {
      console.error('Logout error:', err);
      error('Error logging out. Please try again.');
    }
  };

  const confirmLogout = async () => {
    // Call existing logout logic, then close dialog
    try {
      await handleLogout();
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'files', label: 'File Uploads', icon: '📤' },
    { id: 'RecordsView', label: 'File Records', icon: '📋' },
    { id: 'portfolio', label: 'My Files', icon: '💼' },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: i => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.13 * i }
    }),
    hover: { scale: 1.06, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.25)" }
  };

  const actionVariants = {
    hover: { scale: 1.04, backgroundColor: "#f5f7fa", transition: { duration: 0.2 } },
    tap: { scale: 0.98, backgroundColor: "#eacdff" }
  };

  const OverviewContent = ({ stats, loading, setActiveTab }) => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      );
    }

    return (
      <motion.div className="overview-content" initial="hidden" animate="visible">
        <div className="stats-grid">
          {[
            { color: "gradient-blue", icon: "📁", value: stats.totalFiles, label: "Total Files", desc: "All uploaded documents" },
            { color: "gradient-orange", icon: "⏳", value: stats.pendingFiles, label: "Pending Files", desc: "Awaiting processing" },
            { color: "gradient-green", icon: "✅", value: stats.completedFiles, label: "Processing finished" }
          ].map((item, i) => (
            <motion.div
              className={`stat-card ${item.color}`}
              key={item.label}
              variants={cardVariants}
              custom={i}
              initial="hidden"
              animate="visible"
              whileHover="hover"
            >
              <div className="stat-icon">{item.icon}</div>
              <div className="stat-info">
                <motion.div className="stat-number">{item.value}</motion.div>
                <div className="stat-label">{item.label}</div>
                <div className="stat-detail">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="quick-actions">
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Quick Actions</h3>
          <div className="action-grid">
            <motion.button
              className="action-card"
              whileHover="hover"
              whileTap="tap"
              variants={actionVariants}
              onClick={() => setActiveTab('files')}
            >
              <div className="action-icon">📤</div>
              <div className="action-content">
                <div className="action-title">Upload Files</div>
                <div className="action-desc">Add new documents</div>
              </div>
            </motion.button>
            <motion.button
              className="action-card"
              whileHover="hover"
              whileTap="tap"
              variants={actionVariants}
              onClick={() => setActiveTab('RecordsView')}
            >
              <div className="action-icon">📋</div>
              <div className="action-content">
                <div className="action-title">View Records</div>
                <div className="action-desc">Browse all files</div>
              </div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  };

  const FileManagementContent = () => {
    return (
      <div className="file-management-content">
        <FileUpload path={`data`} />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewContent
            stats={stats}
            files={files}
            loading={loading}
            setActiveTab={setActiveTab}
          />
        );
      case 'files':
        return <FileManagementContent />;
      case 'RecordsView':
        return <FileRecordsList stats={stats} />;
      case 'portfolio':
        return <PortfolioContent currentUser={currentUser} />;
      default:
        return (
          <OverviewContent
            stats={stats}
            files={files}
            loading={loading}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <LayoutDashboard className="logo-icon" />
            {!sidebarCollapsed && <span className="logo-text">Admin Panel</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="nav-label">{item.label}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="profile-avatar">
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="profile-info">
                <span className="profile-name">
                  {currentUser?.email?.split('@')[0]}
                </span>
                <span className="profile-role">Administrator</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setLogoutDialogOpen(true)}
            className="logout-button"
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <h1>
              <LayoutDashboard
                style={{
                  fontSize: "2rem",
                  background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
              Dashboard
            </h1>
            <p>
              Welcome back, <strong>{userName || currentUser?.email?.split('@')[0]}</strong>
            </p>
          </div>
        </header>
        <main className="dashboard-main">{renderContent()}</main>
      </div>

      {/* NEW: Logout confirmation dialog */}
      <LogoutConfirmDialog
        isOpen={logoutDialogOpen}
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

// Wrap the Dashboard with ToastProvider
const DashboardWithToast = () => {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
};

export default DashboardWithToast;