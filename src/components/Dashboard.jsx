// ============================================================
// DASHBOARD COMPONENT - MAIN APPLICATION INTERFACE
// ============================================================
// This component serves as the primary dashboard for managing
// documents, files, diary entries, and user management.
// Features: File upload/download, document portfolio, diary,
// logbook, user management (admin), and responsive design.
// ============================================================

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

// Firebase imports
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
  getBlob,
} from "firebase/storage";

// Component imports
import FileUpload from "./FileUpload";
import FileRecordsList from "./RecordsView";
import UserManagement from "./UserManagement";
import Sidebar from "./Sidebar";
import Dairy from "./Dairy";
import LogBook from "./LogBook";

// Animation library
import { motion, AnimatePresence } from "framer-motion";

// Icon imports
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
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
// Provides global toast notifications for success, error,
// warning, and info messages throughout the application
// ============================================================

const ToastContext = createContext();

/**
 * Custom hook to access toast notifications
 * @throws {Error} If used outside ToastProvider
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

/**
 * Toast Provider Component
 * Manages toast notification state and provides notification methods
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Remove a toast by ID
  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // Add a new toast notification
  const addToast = useCallback(
    (message, type = "info", duration = 3000) => {
      const id = Date.now();
      const newToast = { id, message, type, duration };
      setToasts((prevToasts) => [...prevToasts, newToast]);

      // Auto-remove toast after duration
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  // Memoized value to prevent unnecessary re-renders
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

/**
 * Toast Container Component
 * Renders all active toast notifications
 */
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-[420px]">
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

/**
 * Individual Toast Component
 * Displays a single notification with icon and message
 */
const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const gradientClasses = {
    success: "bg-gradient-to-br from-green-500 to-green-600",
    error: "bg-gradient-to-br from-red-500 to-red-600",
    warning: "bg-gradient-to-br from-yellow-500 to-orange-600",
    info: "bg-gradient-to-br from-blue-500 to-blue-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`flex items-center justify-between px-5 py-4 rounded-xl shadow-lg backdrop-blur-sm min-w-[320px] text-white font-medium ${gradientClasses[type]}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="flex-shrink-0 flex items-center justify-center">
          {icons[type]}
        </span>
        <span className="flex-1 text-[0.95rem] leading-snug">{message}</span>
      </div>
      <button
        className="bg-white/20 hover:bg-white/30 border-none text-white cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-150"
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

// ============================================================
// DIALOG COMPONENTS
// ============================================================

/**
 * Confirmation Dialog Component
 * Generic confirmation dialog for destructive actions
 */
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={24} className="text-orange-500" />
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          </div>
          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              className="px-6 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-md"
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Logout Confirmation Dialog
 * Specialized dialog for confirming logout action
 */
const LogoutConfirmDialog = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
              <LogOut size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Sign out</h3>
              <p className="text-gray-600 text-sm">
                Are you sure you want to logout?
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              className="px-6 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
              onClick={onConfirm}
            >
              Logout
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// UTILITY HELPER FUNCTIONS
// ============================================================

/**
 * Get file icon based on file extension
 * @param {string} fileName - Name of the file
 * @returns {string} Emoji icon representing file type
 */
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
    gif: "🖼️",
    bmp: "🖼️",
  };
  return iconMap[ext] || "📁";
};

/**
 * Format file size from bytes to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Determine file type category
 * @param {string} fileName - Name of the file
 * @returns {string} File type category
 */
const getFileType = (fileName) => {
  const ext = fileName?.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "bmp"].includes(ext)) return "image";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "document";
  if (["xls", "xlsx"].includes(ext)) return "spreadsheet";
  if (["txt"].includes(ext)) return "text";
  return "other";
};

/**
 * Validate file before upload
 * @param {File} file - File object to validate
 * @returns {Object} Validation result with valid flag and error message
 */
const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
  ];

  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 10MB" };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "File type not supported" };
  }

  return { valid: true };
};

// ============================================================
// DOCUMENT VIEWER MODAL
// ============================================================
// Displays document preview with zoom controls for images
// Supports: Images (JPG, PNG, GIF), PDFs, Text files
// ============================================================

const DocumentViewerModal = ({ isOpen, onClose, document }) => {
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);

  // Reset zoom and loading state when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setLoading(true);
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const fileType = getFileType(document.fileName);

  // Zoom control handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  /**
   * Render document content based on file type
   */
  const renderContent = () => {
    switch (fileType) {
      case "image":
        return (
          <div className="flex items-center justify-center min-h-[400px] p-4 overflow-auto">
            <motion.img
              src={document.fileURL}
              alt={document.title}
              style={{ width: `${zoom}%` }}
              className="max-w-full h-auto rounded-lg shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onLoad={() => setLoading(false)}
            />
          </div>
        );

      case "pdf":
        return (
          <div className="w-full h-[70vh]">
            <iframe
              src={`${document.fileURL}#view=FitH`}
              className="w-full h-full rounded-lg"
              title={document.title}
              onLoad={() => setLoading(false)}
            />
          </div>
        );

      case "text":
        return (
          <div className="p-6 max-h-[70vh] overflow-auto">
            <iframe
              src={document.fileURL}
              className="w-full h-[500px] border-2 border-gray-200 rounded-lg"
              title={document.title}
              onLoad={() => setLoading(false)}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
            <div className="text-6xl mb-4">{getFileIcon(document.fileName)}</div>
            <h3 className="text-xl font-bold text-gray-800 text-center">
              Preview not available
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              This file type cannot be previewed directly. Please download the
              file to view it.
            </p>
            <a
              href={document.fileURL}
              download={document.fileName}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
            >
              <Download size={20} />
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1001] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="text-3xl md:text-4xl flex-shrink-0">
                {getFileIcon(document.fileName)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                  {document.title}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {document.fileName}
                </p>
              </div>
            </div>

            {/* Zoom Controls - Desktop (only for images) */}
            {fileType === "image" && (
              <div className="hidden md:flex items-center gap-2 mx-4">
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Zoom Out"
                  disabled={zoom <= 50}
                >
                  <ZoomOut
                    size={20}
                    className={zoom <= 50 ? "text-gray-400" : "text-purple-600"}
                  />
                </button>
                <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Zoom In"
                  disabled={zoom >= 200}
                >
                  <ZoomIn
                    size={20}
                    className={zoom >= 200 ? "text-gray-400" : "text-purple-600"}
                  />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Reset Zoom"
                >
                  <Maximize2 size={20} className="text-purple-600" />
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <X size={24} className="text-gray-700" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-gray-50 relative">
            {loading && fileType !== "other" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600 font-medium">Loading preview...</p>
                  <p className="text-sm text-gray-500">{document.fileName}</p>
                </div>
              </div>
            )}
            {renderContent()}
          </div>

          {/* Footer - Mobile Zoom Controls */}
          {fileType === "image" && (
            <div className="md:hidden flex items-center justify-center gap-3 p-4 border-t border-gray-200 bg-white">
              <button
                onClick={handleZoomOut}
                className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                disabled={zoom <= 50}
              >
                <ZoomOut
                  size={20}
                  className={zoom <= 50 ? "text-gray-400" : "text-purple-600"}
                />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                disabled={zoom >= 200}
              >
                <ZoomIn
                  size={20}
                  className={zoom >= 200 ? "text-gray-400" : "text-purple-600"}
                />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
              >
                <Maximize2 size={20} className="text-purple-600" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// DOCUMENT UPLOAD MODAL
// ============================================================
// Modal for uploading new documents with validation
// ============================================================

const DocumentUploadModal = ({ isOpen, onClose, onUpload, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    file: null,
  });
  const [errors, setErrors] = useState({});

  /**
   * Handle input field changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  /**
   * Handle file selection with validation
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setErrors({ ...errors, file: validation.error });
        return;
      }

      setFormData({ ...formData, file });
      if (errors.file) {
        setErrors({ ...errors, file: "" });
      }
    }
  };

  /**
   * Validate form before submission
   */
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.file) newErrors.file = "Please select a file";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onUpload(formData);
      setFormData({ title: "", file: null });
      setErrors({});
    }
  };

  /**
   * Handle modal close and reset form
   */
  const handleClose = () => {
    setFormData({ title: "", file: null });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              📤 <span>Upload Document</span>
            </h3>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={handleClose}
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-5">
            {/* Title Input */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm md:text-base font-semibold text-gray-700 mb-2"
              >
                Document Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Q4 Financial Report"
                className={`
                  w-full px-3 md:px-4 py-2.5 md:py-3
                  rounded-lg md:rounded-xl
                  border-2 ${
                    errors.title
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 focus:border-purple-500"
                  }
                  outline-none transition-colors
                  text-sm md:text-base
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                `}
                disabled={isLoading}
              />
              {errors.title && (
                <span className="text-red-500 text-xs md:text-sm mt-1 block">
                  {errors.title}
                </span>
              )}
            </div>

            {/* File Input */}
            <div>
              <label
                htmlFor="file"
                className="block text-sm md:text-base font-semibold text-gray-700 mb-2"
              >
                Select File <span className="text-red-500">*</span>
              </label>
              <input
                id="file"
                name="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.bmp"
                className={`
                  w-full px-3 md:px-4 py-2.5 md:py-3
                  rounded-lg md:rounded-xl
                  border-2 ${
                    errors.file
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 focus:border-purple-500"
                  }
                  outline-none transition-colors
                  text-sm md:text-base
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-50 file:text-purple-700
                  hover:file:bg-purple-100
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                `}
                disabled={isLoading}
              />
              {formData.file && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm md:text-base text-green-700">
                  📎 {formData.file.name} ({formatFileSize(formData.file.size)})
                </div>
              )}
              {errors.file && (
                <span className="text-red-500 text-xs md:text-sm mt-1 block">
                  {errors.file}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <button
                type="button"
                className="
                  flex-1 px-4 md:px-6 py-2.5 md:py-3
                  rounded-lg md:rounded-xl
                  border-2 border-gray-300
                  text-gray-700 font-semibold
                  hover:bg-gray-50
                  transition-colors
                  text-sm md:text-base
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="
                  flex-1 flex items-center justify-center gap-2
                  px-4 md:px-6 py-2.5 md:py-3
                  rounded-lg md:rounded-xl
                  bg-gradient-to-r from-purple-600 to-pink-600
                  text-white font-semibold
                  hover:from-purple-700 hover:to-pink-700
                  shadow-lg hover:shadow-xl
                  transition-all
                  text-sm md:text-base
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
// Quick actions menu for document operations
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-md w-full"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <div className="text-4xl md:text-5xl">
              {getFileIcon(document.fileName)}
            </div>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          {/* Document Info */}
          <div className="p-4 md:p-6 space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 break-words">
              {document.title}
            </h3>
            <p className="text-sm md:text-base text-gray-600 break-all">
              {document.fileName}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs md:text-sm font-medium">
                <Calendar size={14} />
                {new Date(document.uploadedAt).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs md:text-sm font-medium">
                <HardDrive size={14} />
                {formatFileSize(document.size)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 p-4 md:p-6">
            <motion.button
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
              onClick={() => {
                onView(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye size={24} />
              <span className="text-sm md:text-base font-semibold">View</span>
            </motion.button>

            <motion.button
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
              onClick={() => {
                onDownload(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download size={24} />
              <span className="text-sm md:text-base font-semibold">Download</span>
            </motion.button>

            <motion.button
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
              onClick={() => {
                onEdit(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Edit2 size={24} />
              <span className="text-sm md:text-base font-semibold">Edit</span>
            </motion.button>

            <motion.button
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
              onClick={() => {
                onDelete(document);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 size={24} />
              <span className="text-sm md:text-base font-semibold">Delete</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// DOCUMENT EDIT MODAL
// ============================================================
// Modal for editing document title
// ============================================================

const DocumentEditModal = ({ isOpen, onClose, document, onUpdate, isLoading }) => {
  const [title, setTitle] = useState("");

  // Set title when document changes
  useEffect(() => {
    if (document) {
      setTitle(document.title || "");
    }
  }, [document]);

  /**
   * Handle form submission
   */
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-lg w-full"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              ✏️ <span>Edit Document</span>
            </h3>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            <div>
              <label
                htmlFor="edit-title"
                className="block text-sm md:text-base font-semibold text-gray-700 mb-2"
              >
                Document Title <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-title"
                name="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter document title"
                className="
                  w-full px-3 md:px-4 py-2.5 md:py-3
                  rounded-lg md:rounded-xl
                  border-2 border-gray-300 focus:border-purple-500
                  outline-none transition-colors
                  text-sm md:text-base
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                "
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <button
                type="button"
                className="
                  flex-1 px-4 md:px-6 py-2.5 md:py-3
                  rounded-lg md:rounded-xl
                  border-2 border-gray-300
                  text-gray-700 font-semibold
                  hover:bg-gray-50
                  transition-colors
                  text-sm md:text-base
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="
                  flex-1 flex items-center justify-center gap-2
                  px-4 md:px-6 py-2.5 md:py-3
                  rounded-lg md:rounded-xl
                  bg-gradient-to-r from-purple-600 to-pink-600
                  text-white font-semibold
                  hover:from-purple-700 hover:to-pink-700
                  shadow-lg hover:shadow-xl
                  transition-all
                  text-sm md:text-base
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Update Document
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
// PORTFOLIO CONTENT COMPONENT
// ============================================================
// Manages personal document portfolio with CRUD operations
// ============================================================

const PortfolioContent = ({ currentUser }) => {
  const { success, error } = useToast();
  
  // State management
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
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

  /**
   * Load portfolio files from Firebase
   */
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

  /**
   * Handle document upload
   */
  const handleUpload = async (formData) => {
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(
        storage,
        `personalFiles/${uid}/${Date.now()}_${formData.file.name}`
      );

      // Upload file to storage
      await uploadBytes(fileRef, formData.file);
      const url = await getDownloadURL(fileRef);

      // Save metadata to database
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

  /**
   * Handle document update (edit title)
   */
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

  /**
   * Show delete confirmation dialog
   */
  const handleDeleteClick = (document) => {
    setDeleteDialog({ isOpen: true, document });
  };

  /**
   * Confirm and execute document deletion
   */
  const handleDeleteConfirm = async () => {
    const doc = deleteDialog.document;
    if (!doc) return;

    try {
      // Delete from storage
      const storage = getStorage();
      const fileRef = storageRef(storage, doc.storagePath);
      await deleteObject(fileRef);

      // Delete from database
      const db = getDatabase();
      await remove(dbRef(db, `portfolioDocuments/${uid}/${doc.id}`));

      success("Document deleted successfully!");
      setDeleteDialog({ isOpen: false, document: null });
    } catch (err) {
      console.error("Delete error:", err);
      error("Failed to delete document: " + err.message);
    }
  };

  /**
   * Handle document card click - show actions modal
   */
  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setShowActionsModal(true);
  };

  /**
   * Open document viewer modal
   */
  const handleViewFile = (doc) => {
    setViewingDocument(doc);
    setShowViewerModal(true);
  };

  /**
   * Download file using Firebase Storage blob
   * FIXED: Uses getBlob to avoid CORS issues
   */
  const handleDownloadFile = async (doc) => {
    try {
      success("Starting download...");

      const storage = getStorage();
      const fileRef = storageRef(storage, doc.storagePath);

      // Get blob from Firebase Storage (bypasses CORS issues)
      const blob = await getBlob(fileRef);

      // Create blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL to prevent memory leaks
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      success("Download completed!");
    } catch (err) {
      console.error("Download error:", err);
      error("Failed to download file: " + err.message);
    }
  };

  /**
   * Filter documents based on search term
   */
  const filteredDocuments = useMemo(() => {
    return portfolioFiles.filter((doc) => {
      const searchLower = searchTerm.toLowerCase();
      return doc.title?.toLowerCase().includes(searchLower);
    });
  }, [portfolioFiles, searchTerm]);

  return (
    <>
      <motion.div
        className="space-y-4 md:space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-purple-100">
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
              💼 <span>Document Portfolio</span>
            </h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Organize and manage your professional documents
            </p>
          </div>
          <motion.button
            className="
              flex items-center justify-center gap-2
              px-4 md:px-6 py-2.5 md:py-3
              bg-gradient-to-r from-purple-600 to-pink-600
              text-white font-semibold
              rounded-xl md:rounded-2xl
              shadow-lg hover:shadow-xl
              transition-all duration-300
              text-sm md:text-base
              whitespace-nowrap
            "
            onClick={() => setShowUploadModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload size={20} />
            <span className="hidden sm:inline">Upload Document</span>
            <span className="sm:hidden">Upload</span>
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md border border-gray-200">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by document title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-sm md:text-base text-gray-700 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setSearchTerm("")}
              >
                <X size={18} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Documents Grid */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-lg border border-gray-100 min-h-[400px]">
          {loadingFiles ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-gray-600 text-base md:text-lg">
                Loading documents...
              </p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-4">
              <div className="text-6xl md:text-7xl lg:text-8xl">📁</div>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                {searchTerm ? "No documents found" : "No documents yet"}
              </h3>
              <p className="text-sm md:text-base text-gray-600 max-w-md">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Start by uploading your first document"}
              </p>
              {!searchTerm && (
                <motion.button
                  className="
                    mt-4 flex items-center gap-2
                    px-6 py-3 rounded-xl
                    bg-gradient-to-r from-purple-600 to-pink-600
                    text-white font-semibold
                    shadow-lg hover:shadow-xl
                    transition-all duration-300
                  "
                  onClick={() => setShowUploadModal(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Upload size={18} />
                  Upload Your First Document
                </motion.button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              <AnimatePresence>
                {filteredDocuments.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleDocumentClick(doc)}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="
                      group relative
                      bg-gradient-to-br from-white to-gray-50
                      rounded-xl md:rounded-2xl
                      p-4 md:p-5
                      border-2 border-gray-200
                      hover:border-purple-300
                      shadow-md hover:shadow-xl
                      transition-all duration-300
                      cursor-pointer
                    "
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl md:text-4xl flex-shrink-0">
                        {getFileIcon(doc.fileName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm md:text-base text-gray-800 truncate group-hover:text-purple-600 transition-colors">
                          {doc.title}
                        </h4>
                        <span className="text-xs md:text-sm text-gray-500">
                          {formatFileSize(doc.size)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm text-gray-500">
                      <span>
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                      <MoreVertical
                        size={16}
                        className="text-gray-400 group-hover:text-purple-600 transition-colors"
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
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

      <DocumentViewerModal
        isOpen={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        document={viewingDocument}
      />

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
// Central dashboard with navigation and content management
// ============================================================

const Dashboard = () => {
  const { currentUser, userRole, userName, logout } = useAuth();
  const navigate = useNavigate();
  const { error, info, success } = useToast();

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    pendingFiles: 0,
    completedFiles: 0,
  });

  /**
   * Load files from Firebase and calculate statistics
   */
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

        // Filter files for subadmin users
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

  /**
   * Calculate dashboard statistics
   */
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

  /**
   * Handle user logout
   */
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

  /**
   * Confirm logout action
   */
  const confirmLogout = async () => {
    try {
      await handleLogout();
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  /**
   * Handle stat card click to filter files
   */
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

  /**
   * Clear active filter
   */
  const handleClearFilter = () => {
    setStatusFilter(null);
    success("Filter cleared");
  };

  // Animation variants for stat cards
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

  /**
   * Overview Content Component
   * Dashboard home screen with statistics and quick actions
   */
  const OverviewContent = ({ stats, loading, setActiveTab, onStatCardClick }) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 text-lg">Loading dashboard data...</p>
        </div>
      );
    }

    // Stat card configuration
    const statCards = [
      {
        gradient: "from-blue-500 to-blue-600",
        bgGradient: "from-blue-50 to-blue-100",
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
        gradient: "from-orange-500 to-orange-600",
        bgGradient: "from-orange-50 to-orange-100",
        icon: "⏳",
        value: stats.pendingFiles,
        label: "Pending Files",
        desc: "Awaiting processing",
        filterType: "pending",
      },
      {
        gradient: "from-green-500 to-green-600",
        bgGradient: "from-green-50 to-green-100",
        icon: "✅",
        value: stats.completedFiles,
        label: "Completed Files",
        desc: "Processing finished",
        filterType: "completed",
      },
    ];

    return (
      <div className="space-y-6 md:space-y-8">
        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {statCards.map((item, i) => (
            <motion.div
              key={item.label}
              variants={cardVariants}
              custom={i}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              onClick={() => onStatCardClick(item.filterType)}
              className={`
                group relative overflow-hidden
                bg-gradient-to-br ${item.bgGradient}
                rounded-2xl md:rounded-3xl
                p-5 md:p-6 lg:p-8
                border-2 border-white/50
                shadow-lg hover:shadow-2xl
                transition-all duration-300
                cursor-pointer
              `}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-8 -top-8 w-32 h-32 md:w-40 md:h-40 bg-white rounded-full"></div>
                <div className="absolute -left-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 bg-white rounded-full"></div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div
                    className={`
                    text-4xl md:text-5xl lg:text-6xl
                    transform group-hover:scale-110 transition-transform duration-300
                  `}
                  >
                    {item.icon}
                  </div>
                  <div
                    className={`
                    px-3 py-1 rounded-full
                    bg-gradient-to-r ${item.gradient}
                    text-white text-xs md:text-sm font-bold
                    shadow-md
                  `}
                  >
                    {item.value}
                  </div>
                </div>

                <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-1 md:mb-2">
                  {item.label}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </p>

                {/* Click Hint */}
                <div
                  className="
                  mt-3 md:mt-4 flex items-center gap-2
                  text-xs md:text-sm font-semibold
                  text-purple-600 opacity-0 group-hover:opacity-100
                  transform translate-y-2 group-hover:translate-y-0
                  transition-all duration-300
                "
                >
                  <span>View Details</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 lg:p-8 shadow-lg border border-gray-100">
          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-center mb-4 md:mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <motion.button
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("files")}
              className="
                group flex items-center gap-4 md:gap-5
                p-4 md:p-6 rounded-xl md:rounded-2xl
                bg-gradient-to-br from-purple-50 to-pink-50
                hover:from-purple-100 hover:to-pink-100
                border-2 border-purple-200
                transition-all duration-300
                shadow-md hover:shadow-xl
              "
            >
              <div
                className="
                flex items-center justify-center
                w-12 h-12 md:w-16 md:h-16
                rounded-xl md:rounded-2xl
                bg-gradient-to-br from-purple-600 to-pink-600
                text-2xl md:text-3xl
                shadow-lg
                transform group-hover:scale-110 group-hover:rotate-3
                transition-all duration-300
              "
              >
                📤
              </div>
              <div className="text-left flex-1">
                <div className="text-base md:text-lg lg:text-xl font-bold text-gray-800 mb-1">
                  Upload Files
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  Add new documents
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("RecordsView")}
              className="
                group flex items-center gap-4 md:gap-5
                p-4 md:p-6 rounded-xl md:rounded-2xl
                bg-gradient-to-br from-blue-50 to-indigo-50
                hover:from-blue-100 hover:to-indigo-100
                border-2 border-blue-200
                transition-all duration-300
                shadow-md hover:shadow-xl
              "
            >
              <div
                className="
                flex items-center justify-center
                w-12 h-12 md:w-16 md:h-16
                rounded-xl md:rounded-2xl
                bg-gradient-to-br from-blue-600 to-indigo-600
                text-2xl md:text-3xl
                shadow-lg
                transform group-hover:scale-110 group-hover:rotate-3
                transition-all duration-300
              "
              >
                📋
              </div>
              <div className="text-left flex-1">
                <div className="text-base md:text-lg lg:text-xl font-bold text-gray-800 mb-1">
                  View Records
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  Browse all files
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * File Management Content Component
   */
  const FileManagementContent = () => {
    return (
      <div className="file-management-content">
        <FileUpload path="data" />
      </div>
    );
  };

  /**
   * Render appropriate content based on active tab
   */
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
          <div className="space-y-4">
            {statusFilter && (
              <div
                className="
                flex flex-col sm:flex-row sm:items-center sm:justify-between
                gap-3 sm:gap-4
                p-4 md:p-5
                bg-gradient-to-r from-purple-50 to-pink-50
                border-2 border-purple-200
                rounded-xl md:rounded-2xl
                shadow-md
              "
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl md:text-3xl">
                    {statusFilter === "all" && "📁"}
                    {statusFilter === "pending" && "⏳"}
                    {statusFilter === "completed" && "✅"}
                  </span>
                  <span className="text-sm md:text-base text-gray-700">
                    Showing{" "}
                    <strong className="text-purple-600 font-bold">
                      {statusFilter === "all"
                        ? "All Files"
                        : statusFilter === "pending"
                        ? "Pending Files"
                        : "Completed Files"}
                    </strong>
                  </span>
                </div>
                <button
                  className="
                    flex items-center justify-center gap-2
                    px-4 py-2 rounded-lg
                    bg-white border-2 border-purple-300
                    text-purple-600 font-semibold
                    hover:bg-purple-50 hover:border-purple-400
                    transition-all
                    text-sm md:text-base
                    shadow-sm hover:shadow
                  "
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
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="text-6xl">🔒</div>
            <h3 className="text-2xl font-bold text-gray-800">Access Denied</h3>
            <p className="text-gray-600">
              This feature is only available to administrators.
            </p>
          </div>
        );

      case "users":
        return userRole === "admin" ? (
          <UserManagement showToast={{ success, error, info }} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="text-6xl">🔒</div>
            <h3 className="text-2xl font-bold text-gray-800">Access Denied</h3>
            <p className="text-gray-600">
              This feature is only available to administrators.
            </p>
          </div>
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
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Sidebar Navigation */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== "RecordsView") {
            setStatusFilter(null);
          }
        }}
        onLogoutClick={() => setLogoutDialogOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 px-4 md:px-6 lg:px-8 py-3 md:py-4 sticky top-0 z-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="flex items-center gap-2 md:gap-3 text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <LayoutDashboard className="text-purple-600" size={24} />
              <span className="hidden sm:inline">Dashboard</span>
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Welcome back,{" "}
              <strong className="text-gray-800">
                {userName || currentUser?.email?.split("@")[0]}
              </strong>
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={logoutDialogOpen}
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

/**
 * Dashboard with Toast Provider Wrapper
 * Exports the dashboard wrapped in toast notification provider
 */
const DashboardWithToast = () => {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
};

export default DashboardWithToast;