// src/components/FileRecordsList.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { database } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import FileUpload from "./FileUpload";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Pencil,
  Download,
  Trash2,
  X,
  Check,
  AlertCircle,
  FileText,
  Calendar,
  User,
  Building,
  Search,
  Clock,
  Mail,
  MessageSquare,
  Tag,
  CheckCircle2,
} from "lucide-react";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "linear-gradient(135deg, #10b981, #059669)";
      case "error":
        return "linear-gradient(135deg, #ef4444, #dc2626)";
      case "warning":
        return "linear-gradient(135deg, #f59e0b, #d97706)";
      case "info":
        return "linear-gradient(135deg, #3b82f6, #2563eb)";
      default:
        return "linear-gradient(135deg, #4f46e5, #9333ea)";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Check size={18} />;
      case "error":
        return <X size={18} />;
      case "warning":
        return <AlertCircle size={18} />;
      case "info":
        return <AlertCircle size={18} />;
      default:
        return "📢";
    }
  };

  return (
    <motion.div
      className="toast-notification"
      style={{ background: getBackgroundColor() }}
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        ✕
      </button>
    </motion.div>
  );
};

// Confirmation Dialog
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
            <button
              className="dialog-btn dialog-btn-confirm"
              onClick={onConfirm}
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact Record Viewer Modal
const CompactRecordViewerModal = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onDownload,
  onDelete,
  userRole,
}) => {
  if (!isOpen || !record) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    const s = (status || "Pending").toLowerCase();
    if (s.includes("pending")) return "s-pending";
    if (s.includes("progress")) return "s-progress";
    if (s.includes("review")) return "s-review";
    if (s.includes("completed")) return "s-completed";
    if (s.includes("hold")) return "s-hold";
    if (s.includes("reject")) return "s-rejected";
    if (s.includes("archive")) return "s-archived";
    return "s-pending";
  };

  return (
    <AnimatePresence>
      <motion.div
        className="compact-viewer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="compact-viewer-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Actions */}
          <div className="compact-viewer-header">
            <div className="header-title-section">
              <FileText size={22} />
              <h3>Record Details</h3>
            </div>
            <button className="compact-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="compact-action-buttons">
            <button
              className="compact-btn edit-compact-btn"
              onClick={() => {
                onEdit(record);
                onClose();
              }}
            >
              <Pencil size={16} />
              <span>Edit</span>
            </button>
            <button
              className="compact-btn download-compact-btn"
              onClick={() => {
                onDownload(record);
              }}
            >
              <Download size={16} />
              <span>Download</span>
            </button>
            {userRole === "admin" && (
              <button
                className="compact-btn delete-compact-btn"
                onClick={() => {
                  onDelete(record);
                  onClose();
                }}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Record Information */}
          <div className="compact-viewer-body">
            {/* File Preview */}
            <div className="compact-preview-section">
              <div className="compact-preview-container">
                {record.fileType?.startsWith("image/") ? (
                  <img
                    src={record.fileURL}
                    alt={record.fileName}
                    className="compact-preview-image"
                  />
                ) : record.fileType === "application/pdf" ? (
                  <iframe
                    src={record.fileURL}
                    title={record.fileName}
                    className="compact-preview-iframe"
                  />
                ) : (
                  <div className="compact-no-preview">
                    <FileText size={40} />
                    <p>{record.fileName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Information Grid */}
            <div className="compact-info-grid">
              <div className="compact-info-item">
                <div className="compact-info-label">
                  <Tag size={14} />
                  <span>Inward Number</span>
                </div>
                <div className="compact-info-value">
                  {record.inwardNumber || "N/A"}
                </div>
              </div>

              <div className="compact-info-item">
                <div className="compact-info-label">
                  <Building size={14} />
                  <span>Department</span>
                </div>
                <div className="compact-info-value">
                  {record.department || "N/A"}
                </div>
              </div>

              {record.publicRepType && (
                <div className="compact-info-item full-width-item">
                  <div className="compact-info-label">
                    <MessageSquare size={14} />
                    <span>Public Rep. Type</span>
                  </div>
                  <div className="compact-info-value">
                    {record.publicRepType}
                  </div>
                </div>
              )}

              <div className="compact-info-item">
                <div className="compact-info-label">
                  <Mail size={14} />
                  <span>Received From</span>
                </div>
                <div className="compact-info-value">
                  {record.receivedFrom || "N/A"}
                </div>
              </div>

              <div className="compact-info-item full-width-item">
                <div className="compact-info-label">
                  <FileText size={14} />
                  <span>Subject</span>
                </div>
                <div className="compact-info-value">
                  {record.subject || "N/A"}
                </div>
              </div>

              <div className="compact-info-item">
                <div className="compact-info-label">
                  <User size={14} />
                  <span>Allocated To</span>
                </div>
                <div className="compact-info-value">
                  {record.allocatedTo || "Unassigned"}
                </div>
              </div>

              <div className="compact-info-item">
                <div className="compact-info-label">
                  <CheckCircle2 size={14} />
                  <span>Status</span>
                </div>
                <div className="compact-info-value">
                  <span
                    className={`compact-status-badge ${getStatusClass(
                      record.status
                    )}`}
                  >
                    {record.status || "Pending"}
                  </span>
                </div>
              </div>

              <div className="compact-info-item">
                <div className="compact-info-label">
                  <Calendar size={14} />
                  <span>Inward Date</span>
                </div>
                <div className="compact-info-value">
                  {formatDate(record.inwardDate)}
                </div>
              </div>

              <div className="compact-info-item">
                <div className="compact-info-label">
                  <Calendar size={14} />
                  <span>Receiving Date</span>
                </div>
                <div className="compact-info-value">
                  {formatDate(record.receivingDate)}
                </div>
              </div>

              {record.description && (
                <div className="compact-info-item full-width-item">
                  <div className="compact-info-label">
                    <MessageSquare size={14} />
                    <span>Description</span>
                  </div>
                  <div className="compact-info-value compact-description">
                    {record.description}
                  </div>
                </div>
              )}

              <div className="compact-info-item">
                <div className="compact-info-label">
                  <Clock size={14} />
                  <span>Uploaded On</span>
                </div>
                <div className="compact-info-value">
                  {formatDate(record.createdAt)}
                </div>
              </div>

              {record.uploaderName && (
                <div className="compact-info-item">
                  <div className="compact-info-label">
                    <User size={14} />
                    <span>Uploaded By</span>
                  </div>
                  <div className="compact-info-value">
                    <span
                      className={`compact-uploader-tag ${
                        record.uploaderRole === "admin" ? "admin" : "user"
                      }`}
                    >
                      {record.uploaderRole === "admin" ? "👑" : "👤"}{" "}
                      {record.uploaderName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// MAIN COMPONENT WITH STATUS FILTER SUPPORT
const FileRecordsList = ({ stats, statusFilter }) => {
  const { currentUser, userRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [editRecordId, setEditRecordId] = useState(null);

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Fetch records from Firebase
  useEffect(() => {
    if (!currentUser) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const dbRef = ref(database, "data");
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        const data = snapshot.val();
        let allRecords = [];

        if (data) {
          allRecords = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
          }));
        }

        let filteredByRole = allRecords;
        if (userRole === "admin") {
          filteredByRole = allRecords;
        } else {
          filteredByRole = allRecords.filter(
            (record) => record.uploadedBy === currentUser.uid
          );
        }

        setRecords(filteredByRole);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching records:", error);
        setLoading(false);
        showToast("Error loading records", "error");
      }
    );

    return () => unsubscribe();
  }, [currentUser, userRole]);

  // Filter records by search term AND status filter
  useEffect(() => {
    let curr = [...records];

    // Apply status filter first
    if (statusFilter) {
      if (statusFilter === "pending") {
        curr = curr.filter((rec) => rec.status === "Pending" || !rec.status);
      } else if (statusFilter === "completed") {
        curr = curr.filter((rec) => rec.status === "Completed");
      }
      // If statusFilter === "all", show all records (no filtering needed)
    }

    // Then apply search filter
    if (searchTerm.trim() !== "") {
      const t = searchTerm.toLowerCase();
      curr = curr.filter(
        (rec) =>
          (rec.inwardNumber && rec.inwardNumber.toLowerCase().includes(t)) ||
          (rec.allocatedTo && rec.allocatedTo.toLowerCase().includes(t)) ||
          (rec.department && rec.department.toLowerCase().includes(t)) ||
          (rec.fileName && rec.fileName.toLowerCase().includes(t)) ||
          (rec.subject && rec.subject.toLowerCase().includes(t))
      );
    }

    // Sort by creation date
    setFilteredRecords(
      curr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    );
  }, [records, searchTerm, statusFilter]);

  const handleRecordClick = (record) => {
    setSelectedRecord(record);
    setShowViewerModal(true);
  };

  const handleEdit = (record) => {
    setEditRecordId(record.id);
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditRecordId(null);
    setSelectedRecord(null);
  };

  const handleDownload = async (record) => {
    try {
      showToast("⏳ Preparing download...", "info");

      const response = await fetch(record.fileURL, { mode: "cors" });
      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = record.fileName || "download";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      showToast("✅ Download completed!", "success");
    } catch (err) {
      console.error("Download error:", err);
      showToast("❌ Failed to download file", "error");
      try {
        window.open(record.fileURL, "_blank");
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
      }
    }
  };

  const handleDeleteClick = (record) => {
    setRecordToDelete(record.id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      remove(ref(database, `data/${recordToDelete}`))
        .then(() => {
          showToast("✅ Record deleted successfully", "success");
          setRecords(records.filter((record) => record.id !== recordToDelete));
        })
        .catch((error) => {
          console.error("Delete error:", error);
          showToast("❌ Failed to delete record", "error");
        });
    }
    setShowDeleteDialog(false);
    setRecordToDelete(null);
  };

  const getStatusClass = (status) => {
    const s = (status || "Pending").toLowerCase();
    if (s.includes("pending")) return "s-pending";
    if (s.includes("progress")) return "s-progress";
    if (s.includes("review")) return "s-review";
    if (s.includes("completed")) return "s-completed";
    if (s.includes("hold")) return "s-hold";
    if (s.includes("reject")) return "s-rejected";
    if (s.includes("archive")) return "s-archived";
    return "s-pending";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get filter display text
  const getFilterText = () => {
    if (!statusFilter) return null;
    if (statusFilter === "all") return "All Files";
    if (statusFilter === "pending") return "Pending Files";
    if (statusFilter === "completed") return "Completed Files";
    return null;
  };

  if (!currentUser) {
    return (
      <div className="records-container">
        <p>Please log in to view file records.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="records-container">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="records-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="records-header">
          <div className="header-left">
            <h2 className="records-title">
              <FileText size={24} />
              <span>
                {getFilterText() ||
                  (userRole === "admin" ? "All Files" : "My Files")}
              </span>
            </h2>
            <span className="records-count">
              {filteredRecords.length} record
              {filteredRecords.length !== 1 ? "s" : ""}
            </span>
            {statusFilter && (
              <span className={`filter-badge filter-${statusFilter}`}>
                {statusFilter === "all" && "📁"}
                {statusFilter === "pending" && "⏳"}
                {statusFilter === "completed" && "✅"} {getFilterText()}
              </span>
            )}
          </div>
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="search"
              className="records-search"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="table-container">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">
              <FileText size={64} />
              <h3>No Records Found</h3>
              <p>
                {statusFilter && searchTerm
                  ? `No ${getFilterText()?.toLowerCase()} matching "${searchTerm}"`
                  : statusFilter
                  ? `No ${getFilterText()?.toLowerCase()} available`
                  : searchTerm
                  ? "Try adjusting your search"
                  : "No files uploaded yet"}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th className="th-inward">Inward No.</th>
                    <th className="th-subject">Subject</th>
                    <th className="th-department">Department</th>
                    <th className="th-date">Inward Date</th>
                    <th className="th-allocated">Allocated To</th>
                    <th className="th-status">Status</th>
                    {userRole === "admin" && (
                      <th className="th-uploader">Uploaded By</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredRecords.map((record, index) => (
                      <motion.tr
                        key={record.id}
                        className={`record-row ${
                          record.department === "Public Representation"
                            ? "highlight-row"
                            : ""
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleRecordClick(record)}
                        whileHover={{ backgroundColor: "#f8fafc" }}
                      >
                        <td className="td-inward">
                          {record.department === "Public Representation" && (
                            <span className="star-icon">★</span>
                          )}
                          {record.inwardNumber || "N/A"}
                        </td>
                        <td className="td-subject" title={record.subject}>
                          {record.subject || "Untitled"}
                        </td>
                        <td className="td-department">
                          {record.department || "N/A"}
                        </td>
                        <td className="td-date">
                          {formatDate(record.inwardDate)}
                        </td>
                        <td className="td-allocated">
                          {record.allocatedTo || "Unassigned"}
                        </td>
                        <td className="td-status">
                          <span
                            className={`status-badge ${getStatusClass(
                              record.status
                            )}`}
                          >
                            {record.status || "Pending"}
                          </span>
                        </td>
                        {userRole === "admin" && (
                          <td className="td-uploader">
                            <span
                              className={`uploader-tag ${
                                record.uploaderRole === "admin"
                                  ? "admin"
                                  : "user"
                              }`}
                            >
                              {record.uploaderRole === "admin" ? "👑" : "👤"}{" "}
                              {record.uploaderName || "User"}
                            </span>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <CompactRecordViewerModal
        isOpen={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        record={selectedRecord}
        onEdit={handleEdit}
        onDownload={handleDownload}
        onDelete={handleDeleteClick}
        userRole={userRole}
      />

      {/* Edit Modal with Cancel Button */}
      {showEditModal && (
        <AnimatePresence>
          <motion.div
            className="edit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseEditModal}
          >
            <motion.div
              className="edit-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button in Top Right Corner */}
              <button
                className="edit-modal-close-btn"
                onClick={handleCloseEditModal}
                title="Close"
              >
                <X size={24} />
              </button>

              <FileUpload
                selectedId={editRecordId}
                recordData={selectedRecord}
                onClose={handleCloseEditModal}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete this record? This action cannot be undone."
      />

      {/* Toast Container */}
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

      <style>{`
        .records-section {
          max-width: 1400px;
          margin: 1.5rem auto;
          padding: 1rem;
          transition: all 0.3s ease;
        }

        /* Sidebar state adjustments */
        .main-content:not(.sidebar-collapsed) .records-section {
          max-width: calc(100vw - 280px - 4rem);
        }

        .main-content.sidebar-collapsed .records-section {
          max-width: calc(100vw - 80px - 4rem);
        }

        .records-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .records-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #0ea5e9, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .records-count {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid #93c5fd;
        }

        .filter-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 2px solid;
        }

        .filter-badge.filter-all {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
          border-color: #60a5fa;
        }

        .filter-badge.filter-pending {
          background: linear-gradient(135deg, #fff7ed, #fed7aa);
          color: #9a3412;
          border-color: #fb923c;
        }

        .filter-badge.filter-completed {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
          border-color: #34d399;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-wrapper svg {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          pointer-events: none;
        }

        .records-search {
          padding: 0.65rem 1rem 0.65rem 2.75rem;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          font-size: 0.95rem;
          width: 300px;
          transition: all 0.2s ease;
          background: #f8fafc;
        }

        .records-search:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          outline: none;
          background: #ffffff;
        }

        .table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .records-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 1000px;
        }

        .records-table thead {
          background: linear-gradient(135deg, #0ea5e9, #7c3aed);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .records-table th {
          padding: 1rem 0.75rem;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: white;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        }

        .records-table tbody tr {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .records-table tbody tr:hover {
          background-color: #f8fafc;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .records-table tbody tr.highlight-row {
          background: linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%);
        }

        .records-table tbody tr.highlight-row:hover {
          background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);
        }

        .records-table td {
          padding: 0.9rem 0.75rem;
          font-size: 0.9rem;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
        }

        .star-icon {
          color: #f59e0b;
          margin-right: 0.5rem;
          font-size: 1rem;
        }

        .td-inward {
          font-weight: 600;
          color: #0ea5e9;
        }

        .td-subject {
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .td-department {
          font-weight: 500;
        }

        .td-date {
          color: #64748b;
          font-size: 0.85rem;
        }

        .td-allocated {
          color: #64748b;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .status-badge.s-pending {
          background: #fff7ed;
          color: #9a3412;
          border-color: #fed7aa;
        }

        .status-badge.s-progress {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .status-badge.s-review {
          background: #ecfeff;
          color: #0e7490;
          border-color: #a5f3fc;
        }

        .status-badge.s-completed {
          background: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }

        .status-badge.s-hold {
          background: #fefce8;
          color: #854d0e;
          border-color: #fde68a;
        }

        .status-badge.s-rejected {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .status-badge.s-archived {
          background: #f1f5f9;
          color: #334155;
          border-color: #e2e8f0;
        }

        .uploader-tag {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          gap: 0.25rem;
          white-space: nowrap;
        }

        .uploader-tag.admin {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
          border: 1px solid #fbbf24;
        }

        .uploader-tag.user {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
          border: 1px solid #60a5fa;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: #94a3b8;
          text-align: center;
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem;
          color: #64748b;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .spinner-large {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Compact Viewer Modal */
        .compact-viewer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 4000;
          padding: 1rem;
        }

        .compact-viewer-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }

        .compact-viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 2px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          flex-shrink: 0;
        }

        .header-title-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-title-section h3 {
          margin: 0;
          font-size: 1.3rem;
          font-weight: 700;
          color: #1e293b;
        }

        .compact-close-btn {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 0.6rem;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .compact-close-btn:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .compact-action-buttons {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        .compact-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1.25rem;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
          min-width: 120px;
        }

        .edit-compact-btn {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
        }

        .edit-compact-btn:hover {
          background: linear-gradient(135deg, #fde68a, #fcd34d);
          transform: translateY(-1px);
        }

        .download-compact-btn {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
        }

        .download-compact-btn:hover {
          background: linear-gradient(135deg, #a7f3d0, #6ee7b7);
          transform: translateY(-1px);
        }

        .delete-compact-btn {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
        }

        .delete-compact-btn:hover {
          background: linear-gradient(135deg, #fecaca, #fca5a5);
          transform: translateY(-1px);
        }

        .compact-viewer-body {
          overflow-y: auto;
          flex: 1;
          padding: 1.5rem;
          background: #f8fafc;
        }

        .compact-preview-section {
          margin-bottom: 1.5rem;
        }

        .compact-preview-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .compact-preview-image {
          max-width: 100%;
          height: auto;
          max-height: 400px;
          object-fit: contain;
        }

        .compact-preview-iframe {
          width: 100%;
          height: 400px;
          border: none;
        }

        .compact-no-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #64748b;
        }

        .compact-no-preview svg {
          margin-bottom: 0.75rem;
          color: #94a3b8;
        }

        .compact-no-preview p {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
        }

        .compact-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .compact-info-item {
          background: white;
          border-radius: 10px;
          padding: 0.9rem 1rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .compact-info-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }

        .compact-info-item.full-width-item {
          grid-column: 1 / -1;
        }

        .compact-info-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.5rem;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .compact-info-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          word-wrap: break-word;
        }

        .compact-description {
          line-height: 1.6;
          font-weight: 400;
          color: #475569;
        }

        .compact-status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid transparent;
        }

        .compact-status-badge.s-pending {
          background: #fff7ed;
          color: #9a3412;
          border-color: #fed7aa;
        }

        .compact-status-badge.s-progress {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .compact-status-badge.s-review {
          background: #ecfeff;
          color: #0e7490;
          border-color: #a5f3fc;
        }

        .compact-status-badge.s-completed {
          background: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }

        .compact-status-badge.s-hold {
          background: #fefce8;
          color: #854d0e;
          border-color: #fde68a;
        }

        .compact-status-badge.s-rejected {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .compact-status-badge.s-archived {
          background: #f1f5f9;
          color: #334155;
          border-color: #e2e8f0;
        }

        .compact-uploader-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .compact-uploader-tag.admin {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
          border: 1px solid #fbbf24;
        }

        .compact-uploader-tag.user {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
          border: 1px solid #60a5fa;
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
          z-index: 5000;
        }

        .dialog-content {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .dialog-header {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }

        .dialog-icon {
          color: #f59e0b;
          margin-right: 0.75rem;
        }

        .dialog-header h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: #1e293b;
        }

        .dialog-body {
          margin-bottom: 1.5rem;
        }

        .dialog-body p {
          margin: 0;
          color: #64748b;
          line-height: 1.5;
        }

        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .dialog-btn {
          padding: 0.7rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dialog-btn-cancel {
          background: #f1f5f9;
          color: #64748b;
        }

        .dialog-btn-cancel:hover {
          background: #e2e8f0;
        }

        .dialog-btn-confirm {
          background: #ef4444;
          color: white;
        }

        .dialog-btn-confirm:hover {
          background: #dc2626;
        }

        /* Edit Modal */
        .edit-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 3500;
          padding: 1rem;
        }

        .edit-modal {
          background: white;
          border-radius: 16px;
          max-width: 95vw;
          max-height: 95vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          position: relative;
        }

        /* Edit Modal Close Button */
        .edit-modal-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 10;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #991b1b;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .edit-modal-close-btn:hover {
          background: linear-gradient(135deg, #fecaca, #fca5a5);
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .edit-modal-close-btn:active {
          transform: scale(0.95) rotate(90deg);
        }

        /* Toast Styles */
        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .toast-notification {
          padding: 12px 16px;
          border-radius: 10px;
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 280px;
          max-width: 350px;
        }

        .toast-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .toast-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Responsive Design */
        
        /* Desktop & Large Tablet (1024px+) - Sidebar-aware */
        @media (min-width: 1024px) {
          .main-content:not(.sidebar-collapsed) .records-section {
            max-width: calc(100vw - 280px - 4rem);
          }

          .main-content.sidebar-collapsed .records-section {
            max-width: calc(100vw - 80px - 4rem);
          }
        }

        /* Tablet adjustments */
        @media (max-width: 1024px) {
          .compact-info-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          }

          /* Sidebar-aware on tablets 768px+ */
          @media (min-width: 768px) {
            .main-content:not(.sidebar-collapsed) .records-section {
              max-width: calc(100vw - 280px - 3rem);
            }

            .main-content.sidebar-collapsed .records-section {
              max-width: calc(100vw - 80px - 3rem);
            }
          }
        }

        /* Mobile & Small Tablet (max-width: 767px) - No sidebar margin */
        @media (max-width: 768px) {
          /* Reset for mobile - ignore sidebar */
          .main-content .records-section,
          .main-content.sidebar-collapsed .records-section,
          .main-content:not(.sidebar-collapsed) .records-section {
            margin-left: 0 !important;
            max-width: 100% !important;
          }

          .records-header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .search-wrapper {
            width: 100%;
          }

          .records-search {
            width: 100%;
          }

          .table-wrapper {
            overflow-x: auto;
          }

          .compact-viewer-modal {
            width: 98%;
            max-height: 95vh;
          }

          .compact-viewer-header {
            padding: 1rem;
          }

          .header-title-section h3 {
            font-size: 1.1rem;
          }

          .compact-action-buttons {
            padding: 0.75rem 1rem;
            flex-direction: column;
          }

          .compact-btn {
            width: 100%;
            min-width: auto;
          }

          .compact-viewer-body {
            padding: 1rem;
          }

          .compact-info-grid {
            grid-template-columns: 1fr;
          }

          .compact-preview-iframe,
          .compact-preview-image {
            max-height: 300px;
          }

          .dialog-content {
            width: 95%;
          }

          .edit-modal {
            max-width: 98%;
          }

          .edit-modal-close-btn {
            top: 0.5rem;
            right: 0.5rem;
            width: 36px;
            height: 36px;
          }
        }

        @media (max-width: 480px) {
          .records-title {
            font-size: 1.2rem;
          }

          .records-count {
            font-size: 0.75rem;
            padding: 0.3rem 0.7rem;
          }

          .filter-badge {
            font-size: 0.75rem;
            padding: 0.3rem 0.7rem;
          }

          .compact-viewer-header {
            padding: 0.75rem 1rem;
          }

          .header-title-section h3 {
            font-size: 1rem;
          }

          .compact-action-buttons {
            gap: 0.5rem;
          }

          .compact-btn {
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
          }

          .compact-preview-container {
            min-height: 200px;
          }

          .edit-modal-close-btn {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </>
  );
};

export default FileRecordsList;
