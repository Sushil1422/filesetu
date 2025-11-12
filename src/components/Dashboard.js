// ============================================================
// IMPORTS
// ============================================================
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  push,
  set,
  update,
  remove,
} from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import FileUpload from "./FileUpload";
import FileRecordsList from "./RecordsView";
import UserManagement from "./UserManagement";
import Sidebar from "./Sidebar";
import Dairy from "./Dairy";
import LogBook from "./LogBook";
import "../styles/Dashboard.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  Trash2,
  Eye,
  X,
  LayoutDashboard,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  LogOut,
  Search,
  Edit2,
  FileText,
  Calendar,
  HardDrive,
  MoreVertical,
  BookOpen,
  Plus,
  Save,
  ArrowLeft,
} from "lucide-react";

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "info", duration = 3000) => {
      const id = Date.now();
      const newToast = { id, message, type, duration };
      setToasts((prevToasts) => [...prevToasts, newToast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success: (message, duration) => addToast(message, "success", duration),
      error: (message, duration) => addToast(message, "error", duration),
      info: (message, duration) => addToast(message, "info", duration),
      warning: (message, duration) => addToast(message, "warning", duration),
    }),
    [toasts, addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

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

const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const backgroundColor = {
    success: "linear-gradient(135deg, #10b981, #059669)",
    error: "linear-gradient(135deg, #ef4444, #dc2626)",
    warning: "linear-gradient(135deg, #f59e0b, #d97706)",
    info: "linear-gradient(135deg, #3b82f6, #2563eb)",
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

// ============================================================
// DIALOG COMPONENTS
// ============================================================

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

const LogoutConfirmDialog = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="logout-dialog-backdrop"
        role="dialog"
        aria-modal="true"
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
              <h3 className="logout-dialog-title">Sign out</h3>
              <p className="logout-dialog-message">
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

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getFileIcon = (fileName) => {
  const ext = fileName?.split(".").pop().toLowerCase();
  const iconMap = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    txt: "📄",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
  };
  return iconMap[ext] || "📁";
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ============================================================
// UPLOAD MODAL (TITLE ONLY)
// ============================================================

const DocumentUploadModal = ({ isOpen, onClose, onUpload, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    file: null,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
      if (errors.file) {
        setErrors({ ...errors, file: "" });
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.file) newErrors.file = "Please select a file";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onUpload(formData);
      setFormData({ title: "", file: null });
      setErrors({});
    }
  };

  const handleClose = () => {
    setFormData({ title: "", file: null });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="upload-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="upload-modal-content"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="upload-modal-header">
            <h3>📤 Upload Document</h3>
            <button className="btn-close-modal" onClick={handleClose}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-field">
              <label htmlFor="title">
                Document Title <span className="required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Q4 Financial Report"
                className={errors.title ? "error" : ""}
                disabled={isLoading}
              />
              {errors.title && (
                <span className="error-text">{errors.title}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="file">
                Select File <span className="required">*</span>
              </label>
              <input
                id="file"
                name="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                className={errors.file ? "error" : ""}
                disabled={isLoading}
              />
              {formData.file && (
                <div className="file-info">
                  📎 {formData.file.name} (
                  {(formData.file.size / 1024).toFixed(2)} KB)
                </div>
              )}
              {errors.file && <span className="error-text">{errors.file}</span>}
            </div>

            <div className="upload-modal-footer">
              <button
                type="button"
                className="btn-cancel-upload"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit-upload"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner-small"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// DOCUMENT ACTIONS MODAL
// ============================================================

const DocumentActionsModal = ({
  isOpen,
  onClose,
  document,
  onView,
  onDownload,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !document) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="doc-actions-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="doc-actions-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="doc-actions-header">
            <div className="doc-actions-icon">
              {getFileIcon(document.fileName)}
            </div>
            <button className="btn-close-actions" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="doc-actions-info">
            <h3>{document.title}</h3>
            <p className="doc-filename">{document.fileName}</p>
            <div className="doc-meta">
              <span className="meta-badge">
                <Calendar size={14} />
                {new Date(document.uploadedAt).toLocaleDateString()}
              </span>
              <span className="meta-badge">
                <HardDrive size={14} />
                {formatFileSize(document.size)}
              </span>
            </div>
          </div>

          <div className="doc-actions-buttons">
            <motion.button
              className="action-btn view-action"
              onClick={() => {
                onView(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye size={20} />
              <span>View</span>
            </motion.button>

            <motion.button
              className="action-btn download-action"
              onClick={() => {
                onDownload(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download size={20} />
              <span>Download</span>
            </motion.button>

            <motion.button
              className="action-btn edit-action"
              onClick={() => {
                onEdit(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Edit2 size={20} />
              <span>Edit</span>
            </motion.button>

            <motion.button
              className="action-btn delete-action"
              onClick={() => {
                onDelete(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 size={20} />
              <span>Delete</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// EDIT MODAL
// ============================================================

const DocumentEditModal = ({
  isOpen,
  onClose,
  document,
  onUpdate,
  isLoading,
}) => {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (document) {
      setTitle(document.title || "");
    }
  }, [document]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onUpdate(document.id, { title });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="upload-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="upload-modal-content"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="upload-modal-header">
            <h3>✏️ Edit Document</h3>
            <button className="btn-close-modal" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-field">
              <label htmlFor="edit-title">Document Title *</label>
              <input
                id="edit-title"
                name="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter document title"
              />
            </div>

            <div className="upload-modal-footer">
              <button
                type="button"
                className="btn-cancel-upload"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit-upload"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Document"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// DAIRY CONTENT COMPONENT (MINIMIZED)
// ============================================================

const DairyContent = () => {
  const { success, error } = useToast();
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const dairyRef = dbRef(db, `dairy/${currentUser.uid}`);

    const unsubscribe = onValue(
      dairyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const entriesArray = Object.entries(data)
            .map(([id, entry]) => ({ id, ...entry }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          setEntries(entriesArray);
        } else {
          setEntries([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching dairy entries:", err);
        error("Failed to load dairy entries");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, error]);

  const handleAddEntry = async (e) => {
    e.preventDefault();

    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      error("Please fill in all fields");
      return;
    }

    try {
      const db = getDatabase();
      const dairyRef = dbRef(db, `dairy/${currentUser.uid}`);
      const newEntryRef = push(dairyRef);

      await set(newEntryRef, {
        ...newEntry,
        createdAt: new Date().toISOString(),
      });

      success("Dairy entry added successfully!");
      setShowAddModal(false);
      setNewEntry({
        title: "",
        content: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("Error adding entry:", err);
      error("Failed to add entry");
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const db = getDatabase();
      await remove(dbRef(db, `dairy/${currentUser.uid}/${id}`));
      success("Entry deleted successfully!");
    } catch (err) {
      console.error("Error deleting entry:", err);
      error("Failed to delete entry");
    }
  };

  return (
    <>
      <motion.div
        className="compact-dairy-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="compact-header">
          <div className="compact-header-left">
            <h2>
              <BookOpen size={22} />
              My Dairy
            </h2>
          </div>
          <motion.button
            className="btn-add-compact"
            onClick={() => setShowAddModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} />
            New Entry
          </motion.button>
        </div>

        {loading ? (
          <div className="loading-compact">
            <div className="spinner-small"></div>
            <p>Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-compact">
            <BookOpen size={48} color="#94a3b8" />
            <h3>No Entries Yet</h3>
            <button
              className="btn-empty-compact"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              Create First Entry
            </button>
          </div>
        ) : (
          <div className="compact-dairy-grid">
            <AnimatePresence>
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  className="compact-dairy-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="compact-entry-header">
                    <h4>{entry.title}</h4>
                    <button
                      className="btn-delete-compact"
                      onClick={() => handleDeleteEntry(entry.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="compact-entry-date">
                    <Calendar size={12} />
                    {new Date(entry.date).toLocaleDateString()}
                  </div>
                  <div className="compact-entry-content">{entry.content}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="modal-content compact-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>
                  <BookOpen size={20} />
                  New Dairy Entry
                </h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddEntry} className="compact-form">
                <div className="form-group-compact">
                  <label htmlFor="entry-date">Date</label>
                  <input
                    id="entry-date"
                    type="date"
                    value={newEntry.date}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group-compact">
                  <label htmlFor="entry-title">Title</label>
                  <input
                    id="entry-title"
                    type="text"
                    placeholder="Entry title"
                    value={newEntry.title}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group-compact">
                  <label htmlFor="entry-content">Content</label>
                  <textarea
                    id="entry-content"
                    rows="6"
                    placeholder="Write your thoughts..."
                    value={newEntry.content}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, content: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .compact-dairy-container {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .compact-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .compact-header-left h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1.5rem;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .btn-add-compact {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }

        .btn-add-compact:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        }

        .compact-dairy-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .compact-dairy-card {
          background: white;
          border-radius: 10px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .compact-dairy-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .compact-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .compact-entry-header h4 {
          margin: 0;
          font-size: 1.05rem;
          color: #1e293b;
          flex: 1;
        }

        .btn-delete-compact {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.2rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .btn-delete-compact:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .compact-entry-date {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #64748b;
          font-size: 0.8rem;
          margin-bottom: 0.75rem;
        }

        .compact-entry-content {
          color: #475569;
          line-height: 1.5;
          font-size: 0.9rem;
          white-space: pre-wrap;
          max-height: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .loading-compact,
        .empty-compact {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #64748b;
          text-align: center;
        }

        .empty-compact h3 {
          margin: 0.75rem 0 0.5rem 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        .btn-empty-compact {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 1rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .compact-modal {
          max-width: 550px;
          width: 90%;
        }

        .compact-form {
          padding: 1.25rem;
        }

        .form-group-compact {
          margin-bottom: 1rem;
        }

        .form-group-compact label {
          display: block;
          margin-bottom: 0.4rem;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }

        .form-group-compact input,
        .form-group-compact textarea {
          width: 100%;
          padding: 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .form-group-compact input:focus,
        .form-group-compact textarea:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }

        .form-group-compact textarea {
          resize: vertical;
          font-family: inherit;
        }

        @media (max-width: 768px) {
          .compact-dairy-grid {
            grid-template-columns: 1fr;
          }

          .compact-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
};

// ============================================================
// PORTFOLIO CONTENT (KEEP AS IS - ALREADY COMPACT)
// ============================================================

const PortfolioContent = ({ currentUser }) => {
  const { success, error } = useToast();
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    document: null,
  });

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setLoadingFiles(false);
      error("Please log in to access your files");
      return;
    }

    const db = getDatabase();
    const documentsRef = dbRef(db, `portfolioDocuments/${uid}`);

    const unsubscribe = onValue(
      documentsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const docsArray = Object.entries(data).map(([id, doc]) => ({
            id,
            ...doc,
          }));
          setPortfolioFiles(docsArray);
        } else {
          setPortfolioFiles([]);
        }
        setLoadingFiles(false);
      },
      (err) => {
        console.error("Error fetching documents:", err);
        error("Failed to load documents");
        setLoadingFiles(false);
      }
    );

    return () => unsubscribe();
  }, [uid, error]);

  const handleUpload = async (formData) => {
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(
        storage,
        `personalFiles/${uid}/${Date.now()}_${formData.file.name}`
      );

      await uploadBytes(fileRef, formData.file);
      const url = await getDownloadURL(fileRef);

      const db = getDatabase();
      const newDocRef = push(dbRef(db, `portfolioDocuments/${uid}`));

      await set(newDocRef, {
        title: formData.title,
        fileName: formData.file.name,
        fileURL: url,
        storagePath: fileRef.fullPath,
        uploadedAt: new Date().toISOString(),
        size: formData.file.size,
      });

      success("Document uploaded successfully!");
      setShowUploadModal(false);
    } catch (err) {
      console.error("Upload error:", err);
      error("Failed to upload document: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async (docId, formData) => {
    setIsUpdating(true);
    try {
      const db = getDatabase();
      const docRef = dbRef(db, `portfolioDocuments/${uid}/${docId}`);

      await update(docRef, {
        title: formData.title,
        updatedAt: new Date().toISOString(),
      });

      success("Document updated successfully!");
      setShowEditModal(false);
    } catch (err) {
      console.error("Update error:", err);
      error("Failed to update document: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (document) => {
    setDeleteDialog({ isOpen: true, document });
  };

  const handleDeleteConfirm = async () => {
    const doc = deleteDialog.document;
    if (!doc) return;

    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, doc.storagePath);
      await deleteObject(fileRef);

      const db = getDatabase();
      await remove(dbRef(db, `portfolioDocuments/${uid}/${doc.id}`));

      success("Document deleted successfully!");
      setDeleteDialog({ isOpen: false, document: null });
    } catch (err) {
      console.error("Delete error:", err);
      error("Failed to delete document: " + err.message);
    }
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setShowActionsModal(true);
  };

  const handleViewFile = (doc) => {
    const ext = doc.fileName.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png"].includes(ext)) {
      setSelectedImage(doc.fileURL);
    } else {
      window.open(doc.fileURL, "_blank");
    }
  };

  const handleDownloadFile = async (doc) => {
    try {
      success("Preparing download...");

      const response = await fetch(doc.fileURL, { mode: "cors" });
      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.fileName || "download";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      success("Download completed!");
    } catch (err) {
      console.error("Download error:", err);
      error("Failed to download file. Please try again.");
      try {
        window.open(doc.fileURL, "_blank");
      } catch (fallbackErr) {
        console.error("Fallback download error:", fallbackErr);
      }
    }
  };

  const filteredDocuments = portfolioFiles.filter((doc) => {
    const searchLower = searchTerm.toLowerCase();
    return doc.title?.toLowerCase().includes(searchLower);
  });

  return (
    <>
      <motion.div
        className="enhanced-portfolio-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="portfolio-header">
          <div className="portfolio-header-left">
            <h2>💼 Document Portfolio</h2>
            <p>Organize and manage your professional documents</p>
          </div>
          <motion.button
            className="btn-upload-primary"
            onClick={() => setShowUploadModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload size={20} />
            Upload Document
          </motion.button>
        </div>

        <div className="portfolio-search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by document title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="btn-clear-search"
              onClick={() => setSearchTerm("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="documents-container">
          {loadingFiles ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>{searchTerm ? "No documents found" : "No documents yet"}</h3>
              <p>
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Start by uploading your first document"}
              </p>
              {!searchTerm && (
                <button
                  className="btn-empty-upload"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload size={18} />
                  Upload Your First Document
                </button>
              )}
            </div>
          ) : (
            <div className="compact-documents-list">
              <AnimatePresence>
                {filteredDocuments.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    className="compact-doc-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleDocumentClick(doc)}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="compact-doc-icon">
                      {getFileIcon(doc.fileName)}
                    </div>
                    <div className="compact-doc-info">
                      <h4>{doc.title}</h4>
                      <span className="compact-doc-size">
                        {formatFileSize(doc.size)}
                      </span>
                    </div>
                    <div className="compact-doc-date">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                    <button className="compact-doc-menu">
                      <MoreVertical size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        isLoading={isUploading}
      />

      <DocumentActionsModal
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        document={selectedDocument}
        onView={handleViewFile}
        onDownload={handleDownloadFile}
        onEdit={(doc) => {
          setSelectedDocument(doc);
          setShowActionsModal(false);
          setShowEditModal(true);
        }}
        onDelete={handleDeleteClick}
      />

      <DocumentEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        document={selectedDocument}
        onUpdate={handleUpdate}
        isLoading={isUpdating}
      />

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="image-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              className="image-preview-container"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedImage} alt="Preview" />
              <button
                className="btn-close-preview"
                onClick={() => setSelectedImage(null)}
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, document: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDialog.document?.title}"? This action cannot be undone.`}
      />
    </>
  );
};

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

const Dashboard = () => {
  const { currentUser, userRole, userName, logout } = useAuth();
  const navigate = useNavigate();
  const { error, info, success } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState(null); // NEW: for filtering by status
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    pendingFiles: 0,
    completedFiles: 0,
  });

  useEffect(() => {
    if (!currentUser || !userRole) return;

    const db = getDatabase();
    const filesRef = dbRef(db, "data");

    const unsubscribe = onValue(
      filesRef,
      (snapshot) => {
        const data = snapshot.val();
        let filesData = data
          ? Object.entries(data).map(([id, file]) => ({ id, ...file }))
          : [];

        if (userRole === "subadmin") {
          filesData = filesData.filter(
            (file) => file.uploadedBy === currentUser.uid
          );
        }

        setFiles(filesData);
        updateStats(filesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching files:", err);
        error("Error fetching files. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userRole, error]);

  const updateStats = (filesArray) => {
    const totalFiles = filesArray.length;
    const pendingFiles = filesArray.filter(
      (f) => f.status === "Pending" || !f.status
    ).length;
    const completedFiles = filesArray.filter(
      (f) => f.status === "Completed"
    ).length;

    setStats({ totalFiles, pendingFiles, completedFiles });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      info("Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
      error("Error logging out. Please try again.");
    }
  };

  const confirmLogout = async () => {
    try {
      await handleLogout();
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  // NEW: Handler for clicking stat cards
  const handleStatCardClick = (filterType) => {
    setStatusFilter(filterType);
    setActiveTab("RecordsView");
    success(
      `Showing ${
        filterType === "all"
          ? "all files"
          : filterType === "pending"
          ? "pending files"
          : "completed files"
      }`
    );
  };

  // NEW: Handler to clear filter
  const handleClearFilter = () => {
    setStatusFilter(null);
    success("Filter cleared");
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.13 * i },
    }),
    hover: {
      scale: 1.04,
      boxShadow: "0 6px 24px 0 rgba(31, 38, 135, 0.2)",
      cursor: "pointer",
    },
  };

  const actionVariants = {
    hover: {
      scale: 1.03,
      backgroundColor: "#f5f7fa",
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.98, backgroundColor: "#eacdff" },
  };

  const OverviewContent = ({
    stats,
    loading,
    setActiveTab,
    onStatCardClick,
  }) => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      );
    }

    return (
      <motion.div
        className="overview-content"
        initial="hidden"
        animate="visible"
      >
        <div className="stats-grid">
          {[
            {
              color: "gradient-blue",
              icon: "📁",
              value: stats.totalFiles,
              label: "Total Files",
              desc:
                userRole === "admin"
                  ? "All uploaded documents"
                  : "Your uploaded documents",
              filterType: "all",
            },
            {
              color: "gradient-orange",
              icon: "⏳",
              value: stats.pendingFiles,
              label: "Pending Files",
              desc: "Awaiting processing",
              filterType: "pending",
            },
            {
              color: "gradient-green",
              icon: "✅",
              value: stats.completedFiles,
              label: "Completed Files",
              desc: "Processing finished",
              filterType: "completed",
            },
          ].map((item, i) => (
            <motion.div
              className={`stat-card ${item.color} clickable-stat-card`}
              key={item.label}
              variants={cardVariants}
              custom={i}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              onClick={() => onStatCardClick(item.filterType)}
            >
              <div className="stat-icon">{item.icon}</div>
              <div className="stat-info">
                <motion.div className="stat-number">{item.value}</motion.div>
                <div className="stat-label">{item.label}</div>
                <div className="stat-detail">{item.desc}</div>
              </div>
              <div className="stat-click-hint">Click to view →</div>
            </motion.div>
          ))}
        </div>

        <div className="quick-actions">
          <h3 style={{ textAlign: "center", marginBottom: "1rem" }}>
            Quick Actions
          </h3>
          <div className="action-grid">
            <motion.button
              className="action-card"
              whileHover="hover"
              whileTap="tap"
              variants={actionVariants}
              onClick={() => setActiveTab("files")}
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
              onClick={() => setActiveTab("RecordsView")}
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
        <FileUpload path="data" />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewContent
            stats={stats}
            files={files}
            loading={loading}
            setActiveTab={setActiveTab}
            onStatCardClick={handleStatCardClick}
          />
        );

      case "files":
        return <FileManagementContent />;

      case "RecordsView":
        return (
          <div className="records-view-wrapper">
            {statusFilter && (
              <div className="filter-banner">
                <div className="filter-info">
                  <span className="filter-icon">
                    {statusFilter === "all" && "📁"}
                    {statusFilter === "pending" && "⏳"}
                    {statusFilter === "completed" && "✅"}
                  </span>
                  <span className="filter-text">
                    Showing{" "}
                    <strong>
                      {statusFilter === "all"
                        ? "All Files"
                        : statusFilter === "pending"
                        ? "Pending Files"
                        : "Completed Files"}
                    </strong>
                  </span>
                </div>
                <button
                  className="btn-clear-filter"
                  onClick={handleClearFilter}
                >
                  <X size={16} />
                  Clear Filter
                </button>
              </div>
            )}
            <FileRecordsList stats={stats} statusFilter={statusFilter} />
          </div>
        );

      case "dairy":
        return <Dairy showToast={{ success, error, info }} />;

      case "logbook":
        return <LogBook showToast={{ success, error, info }} />;

      case "portfolio":
        return userRole === "admin" ? (
          <PortfolioContent currentUser={currentUser} />
        ) : (
          <div className="access-denied">Access Denied</div>
        );

      case "users":
        return userRole === "admin" ? (
          <UserManagement showToast={{ success, error, info }} />
        ) : (
          <div className="access-denied">Access Denied</div>
        );

      default:
        return (
          <OverviewContent
            stats={stats}
            files={files}
            loading={loading}
            setActiveTab={setActiveTab}
            onStatCardClick={handleStatCardClick}
          />
        );
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Component */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== "RecordsView") {
            setStatusFilter(null); // Clear filter when changing tabs
          }
        }}
        onLogoutClick={() => setLogoutDialogOpen(true)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <h1>
              <LayoutDashboard
                style={{
                  fontSize: "1.75rem",
                  background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                }}
              />
              Dashboard
            </h1>
            <p>
              Welcome back,{" "}
              <strong>{userName || currentUser?.email?.split("@")[0]}</strong>
            </p>
          </div>
        </header>

        <main className="dashboard-main">{renderContent()}</main>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={logoutDialogOpen}
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
      />

      {/* Additional Styles for New Features */}
      <style>{`
        .clickable-stat-card {
          position: relative;
          transition: all 0.3s ease;
        }

        .stat-click-hint {
          position: absolute;
          bottom: 0.75rem;
          right: 1rem;
          font-size: 0.75rem;
          color: var(--purple-400);
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .clickable-stat-card:hover .stat-click-hint {
          opacity: 1;
        }

        .records-view-wrapper {
          position: relative;
        }

        .filter-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, var(--purple-100), var(--pink-100));
          border: 2px solid var(--purple-200);
          border-radius: 12px;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.15);
        }

        .filter-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .filter-icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 2px 4px rgba(168, 85, 247, 0.3));
        }

        .filter-text {
          font-size: 0.95rem;
          color: var(--gray-700);
        }

        .filter-text strong {
          color: var(--purple-600);
          font-weight: 700;
        }

        .btn-clear-filter {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: white;
          border: 2px solid var(--purple-300);
          border-radius: 8px;
          color: var(--purple-600);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-clear-filter:hover {
          background: var(--purple-50);
          border-color: var(--purple-400);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.2);
        }

        @media (max-width: 768px) {
          .filter-banner {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .btn-clear-filter {
            width: 100%;
            justify-content: center;
          }

          .stat-click-hint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

const DashboardWithToast = () => {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
};

export default DashboardWithToast;
