import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../firebase';
import { ref, onValue, remove } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Pencil, Download, Trash2, X, Check, AlertCircle } from 'lucide-react';

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'linear-gradient(90deg, #4CAF50, #2E7D32)';
      case 'error': return 'linear-gradient(90deg, #F44336, #D32F2F)';
      case 'warning': return 'linear-gradient(90deg, #FF9800, #EF6C00)';
      case 'info': return 'linear-gradient(90deg, #2196F3, #1565C0)';
      default: return 'linear-gradient(90deg, #4f46e5, #9333ea)';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <Check size={20} />;
      case 'error': return <X size={20} />;
      case 'warning': return <AlertCircle size={20} />;
      case 'info': return <AlertCircle size={20} />;
      default: return '📢';
    }
  };

  return (
    <motion.div
      className="toast-notification"
      style={{ background: getBackgroundColor() }}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
    >
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </motion.div>
  );
};

// Confirmation Dialog Component
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="dialog-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="dialog-content"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dialog-header">
            <AlertCircle size={24} className="dialog-icon" />
            <h3>{title}</h3>
          </div>
          <div className="dialog-body">
            <p>{message}</p>
          </div>
          <div className="dialog-actions">
            <button className="dialog-btn dialog-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="dialog-btn dialog-btn-confirm" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const FileRecordsList = () => {
  const { currentUser, userProfile } = useAuth();
  const [records, setRecords] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [viewRecord, setViewRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const navigate = useNavigate();
  const [editRecordId, setEditRecordId] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [editRecordData, setEditRecordData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Show toast notification
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Remove toast notification
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    if (!currentUser) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const dbRef = ref(database, 'data');
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        const data = snapshot.val();

        let all = [];
        if (data) {
          all = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
          }));
        }

        const isAdmin = (userProfile?.role || '').toLowerCase() === 'admin';

        // If records include uploaderRole, admin will see: own uploads + all subadmins' uploads.
        // If uploaderRole is missing, admin will see all records (fallback).
        let allowed = [];
        if (isAdmin) {
          const hasRoleField = all.some(r => typeof r.uploaderRole === 'string');
          if (hasRoleField) {
            allowed = all.filter(
              r =>
                r.uploadedBy === currentUser.uid ||
                (r.uploaderRole && r.uploaderRole.toLowerCase() === 'subadmin')
            );
          } else {
            // Fallback: admin sees all when role is not stored in records
            allowed = all;
          }
        } else {
          // Subadmin (or other roles) only see their own uploads
          allowed = all.filter(r => r.uploadedBy === currentUser.uid);
        }

        setRecords(allowed);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching records:', error);
        setLoading(false);
        showToast('Error loading records', 'error');
      }
    );

    return () => unsubscribe();
  }, [currentUser, userProfile]);

  useEffect(() => {
    let curr = [...records];
    if (searchTerm.trim() !== '') {
      const t = searchTerm.toLowerCase();
      curr = curr.filter(
        (rec) =>
          (rec.inwardNumber && rec.inwardNumber.toLowerCase().includes(t)) ||
          (rec.allocatedTo && rec.allocatedTo.toLowerCase().includes(t)) ||
          (rec.department && rec.department.toLowerCase().includes(t)) ||
          (rec.inwardDate && rec.inwardDate.toLowerCase().includes(t))
      );
    }
    setFilteredRecords(
      curr.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        if (sortBy === 'createdAt' || sortBy === 'inwardDate') {
          aVal = Number(aVal) || new Date(aVal).getTime();
          bVal = Number(bVal) || new Date(bVal).getTime();
        } else {
          aVal = (aVal || '').toString().toLowerCase();
          bVal = (bVal || '').toString().toLowerCase();
        }
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      })
    );
  }, [records, searchTerm, sortBy, sortOrder]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleView = (rec) => setViewRecord(rec);

  const handleEdit = (rec) => {
    setEditRecordId(rec.id);
    setEditRecordData(rec);
    setShowDashboard(true);
  };

  const handleDownload = (url) => window.open(url, '_blank');

  const handleDeleteClick = (id) => {
    setRecordToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      remove(ref(database, `data/${recordToDelete}`))
        .then(() => {
          showToast('Record deleted successfully', 'success');
          setRecords(records.filter(record => record.id !== recordToDelete));
        })
        .catch((error) => {
          console.error('Delete error:', error);
          showToast('Failed to delete record', 'error');
        });
    }
    setShowDeleteDialog(false);
    setRecordToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setRecordToDelete(null);
  };

  const getStatusClass = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s.includes('pending')) return 's-pending';
    if (s.includes('progress')) return 's-progress';
    if (s.includes('review')) return 's-review';
    if (s.includes('completed')) return 's-completed';
    if (s.includes('hold')) return 's-hold';
    if (s.includes('reject')) return 's-rejected';
    if (s.includes('archive')) return 's-archived';
    return 's-pending';
  };

  if (!currentUser) {
    return (
      <div className="records-container">
        <div className="records-header">
          <p>Please log in to view file records.</p>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="records-container">
        <div className="records-header">
          <p>Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="data-table-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="records-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="table-title">
            <span className="table-title-emoji" aria-hidden="true">📋</span>
            <span className="table-title-text">Uploaded Files</span>
          </h2>
          <div>
            <input
              type="search"
              className="records-search"
              placeholder="Search by Inward Number, Allocated To, Department, Inward Date..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Inward Number</th>
                <th>Inward Date</th>
                <th>Receiving Date</th>
                <th>Department</th>
                <th>Allocated To</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!filteredRecords.length ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.25rem' }}>
                    No records.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filteredRecords.map((rec) => (
                    <motion.tr
                      key={rec.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className={rec.department === 'Public Representation' ? 'highlight-public-rep' : ''}
                      whileHover={{ backgroundColor: '#f8fafc' }}
                    >
                      <td>
                        {rec.department === 'Public Representation' && (
                          <span title="Public Representation" style={{ color: '#f59e0b', marginRight: '6px' }}>
                            ★
                          </span>
                        )}
                        {rec.inwardNumber || '-'}
                      </td>
                      <td>{rec.inwardDate || '-'}</td>
                      <td>{rec.receivingDate || '-'}</td>
                      <td>{rec.department || '-'}</td>
                      <td>{rec.allocatedTo || '-'}</td>
                      <td>
                        <span className={`status-pill ${getStatusClass(rec.status)}`}>
                          {rec.status || 'Pending'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <motion.button
                          onClick={() => handleView(rec)}
                          title="View"
                          className="icon-btn"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleEdit(rec)}
                          title="Edit"
                          className="icon-btn"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Pencil size={16} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDownload(rec.fileURL)}
                          title="Download"
                          className="icon-btn"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Download size={16} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteClick(rec.id)}
                          title="Delete"
                          className="icon-btn danger"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {showDashboard && (
          <AnimatePresence>
            <motion.div
              className="overlay"
              onClick={() => setShowDashboard(false)}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <FileUpload
                  selectedId={editRecordId}
                  recordData={editRecordData}
                  onClose={() => setShowDashboard(false)}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Confirm Deletion"
          message="Are you sure you want to delete this record? This action cannot be undone."
        />

        {/* Toast Container */}
        <div className="toast-container">
          <AnimatePresence>
            {toasts.map(toast => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        <style jsx>{`
          .data-table-section {
            max-width: 1200px;
            margin: 2rem auto 0 auto;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(2, 6, 23, 0.08);
            padding: 1.5rem 1rem 2rem;
            position: relative;
          }

          /* Split emoji and gradient text */
          .table-title {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin: 0;
          }
          .table-title-emoji {
            font-size: 1.4rem;
            line-height: 1;
          }
          .table-title-text {
            font-size: 1.4rem;
            font-weight: 700;
            background: linear-gradient(90deg, #0ea5e9, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .records-search {
            padding: 0.55rem 1.2rem;
            border-radius: 10px;
            border: 1.5px solid #cbd5e1;
            font-size: 1rem;
            width: 340px;
            transition: border 0.18s, box-shadow 0.18s, background-color 0.18s;
            box-sizing: border-box;
            background: #f8fafc;
          }
          .records-search:focus {
            border: 1.5px solid #60a5fa;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
            outline: none;
            background: #ffffff;
          }

          .table-wrapper {
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 0 #f1f5f9 inset;
          }

          .data-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            background: #fff;
          }

          /* Modern, slick header */
          .data-table thead tr {
            background:
              linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(124, 58, 237, 0.15)),
              linear-gradient(135deg, #0ea5e9, #7c3aed);
          }

          .data-table th {
            color: #ffffff;
            font-weight: 700;
            letter-spacing: 0.04em;
            font-size: 0.92rem;
            text-transform: uppercase;
            padding: 1rem 0.9rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.25);
            position: relative;
          }

          .data-table th:not(:last-child)::after {
            content: '';
            position: absolute;
            right: 0;
            top: 25%;
            height: 50%;
            width: 1px;
            background: rgba(255, 255, 255, 0.25);
          }

          /* Body */
          .data-table td {
            border-bottom: 1px solid #eef2f7;
            padding: 0.9rem 0.7rem;
            font-size: 0.98rem;
            color: #293049;
            background: #ffffff;
            transition: background-color 0.2s ease;
          }

          .data-table tbody tr:nth-child(even) td {
            background: #fbfdff;
          }

          .data-table tr:last-child td {
            border-bottom: none;
          }

          .highlight-public-rep td {
            background-color: #fffbeb !important;
            font-weight: 600;
          }

          .actions-cell {
            white-space: nowrap;
          }

          .icon-btn {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            color: #334155;
            cursor: pointer;
            font-size: 1.05rem;
            padding: 6px 8px;
            margin-right: 6px;
            border-radius: 10px;
            transition: all 0.18s ease;
          }
          .icon-btn:hover {
            background: #eef2ff;
            color: #4f46e5;
            border-color: #e0e7ff;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
          }
          .icon-btn.danger {
            color: #ef4444;
            border-color: #fee2e2;
            background: #fff7f7;
          }
          .icon-btn.danger:hover {
            background: #fef2f2;
            color: #dc2626;
            border-color: #fecaca;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
          }

          /* Status pills */
          .status-pill {
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            border: 1px solid transparent;
          }
          .status-pill.s-pending {
            background: #fff7ed;
            color: #9a3412;
            border-color: #fed7aa;
          }
          .status-pill.s-progress {
            background: #eff6ff;
            color: #1d4ed8;
            border-color: #bfdbfe;
          }
          .status-pill.s-review {
            background: #ecfeff;
            color: #0e7490;
            border-color: #a5f3fc;
          }
          .status-pill.s-completed {
            background: #ecfdf5;
            color: #065f46;
            border-color: #a7f3d0;
          }
          .status-pill.s-hold {
            background: #fefce8;
            color: #854d0e;
            border-color: #fde68a;
          }
          .status-pill.s-rejected {
            background: #fef2f2;
            color: #991b1b;
            border-color: #fecaca;
          }
          .status-pill.s-archived {
            background: #f1f5f9;
            color: #334155;
            border-color: #e2e8f0;
          }

          /* Dialog Styles */
          .dialog-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 3000;
          }

          .dialog-content {
            background: white;
            border-radius: 16px;
            padding: 24px;
            width: 90%;
            max-width: 450px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          }

          .dialog-header {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            margin-bottom: 16px;
            gap: 0px;
          }

          .dialog-icon {
            color: #f59e0b;
            margin-right: 12px;
          }

          .dialog-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
          }

          .dialog-body {
            margin-bottom: 24px;
          }

          .dialog-body p {
            margin: 0;
            color: #6b7280;
            line-height: 1.5;
          }

          .dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }

          .dialog-btn {
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .dialog-btn-cancel {
            background-color: #f3f4f6;
            color: #4b5563;
          }

          .dialog-btn-cancel:hover {
            background-color: #e5e7eb;
          }

          .dialog-btn-confirm {
            background-color: #ef4444;
            color: white;
          }

          .dialog-btn-confirm:hover {
            background-color: #dc2626;
          }

          /* Toast Styles */
          .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .toast-notification {
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 350px;
          }

          .toast-icon {
            display: flex;
            align-items: center;
          }

          .toast-message {
            flex: 1;
            font-size: 14px;
            font-weight: 500;
          }

          .toast-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
          }

          /* Modal for editing/upload */
          .overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(6px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
          }
          .modal-content {
            background: white;
            border-radius: 14px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            padding: 1.5rem;
          }

          /* Modal for viewing file */
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
          }

          .modal {
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
            position: relative;
          }

          .modal h3 {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 0 16px 0;
          }

          .close-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #6b7280;
          }

          .download-btn {
            background: #4f46e5;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          }
        `}</style>
      </motion.div>

      {/* Modal for viewing file */}
      <AnimatePresence>
        {viewRecord && (
          <motion.div
            className="modal-overlay"
            onClick={() => setViewRecord(null)}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <h3>
                {viewRecord.fileName || 'File'}{' '}
                <button
                  className="close-btn"
                  onClick={() => setViewRecord(null)}
                  title="Close"
                  aria-label="Close viewer"
                >
                  <X size={20} />
                </button>
              </h3>
              <div className="modal-content">
                {viewRecord.fileType?.startsWith('image/') ? (
                  <img
                    src={viewRecord.fileURL}
                    alt={viewRecord.fileName}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      borderRadius: '8px',
                    }}
                  />
                ) : viewRecord.fileType === 'application/pdf' ? (
                  <iframe
                    src={viewRecord.fileURL}
                    title={viewRecord.fileName}
                    style={{
                      width: '100%',
                      height: '70vh',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  <div>
                    <p style={{ margin: '1em 0', color: '#4b5563' }}>
                      Preview not supported for this file type.
                    </p>
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(viewRecord.fileURL)}
                    >
                      ⬇️ Download File
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FileRecordsList;