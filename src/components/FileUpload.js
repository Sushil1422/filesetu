import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, storage, database } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { ref as dbRef, push } from "firebase/database";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "react-router-dom";
import { get, child, set } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "linear-gradient(135deg, #a7f3d0, #6ee7b7)";
      case "error":
        return "linear-gradient(135deg, #fca5a5, #f87171)";
      case "warning":
        return "linear-gradient(135deg, #fcd34d, #fbbf24)";
      case "info":
        return "linear-gradient(135deg, #93c5fd, #60a5fa)";
      default:
        return "linear-gradient(135deg, #c4b5fd, #a78bfa)";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📢";
    }
  };

  return (
    <motion.div
      className="toast-notification"
      style={{ background: getBackgroundColor() }}
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    >
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        ✕
      </button>
    </motion.div>
  );
};

const FileUpload = ({ selectedId }) => {
  const { currentUser, userRole, userName } = useAuth();
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [initialFileInfo, setInitialFileInfo] = useState(null);
  const hasLoadedData = useRef(false);
  const hasShownToast = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validatingInward, setValidatingInward] = useState(false);
  const [inwardNumberExists, setInwardNumberExists] = useState(false);

  const [formData, setFormData] = useState({
    department: "",
    publicRepType: "",
    receivedFrom: "",
    subject: "",
    allocatedTo: "",
    status: "Pending",
    inwardNumber: "",
    inwardDate: "",
    receivingDate: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [toasts, setToasts] = useState([]);

  // File types mapping
  const supportedFileTypes = {
    "application/pdf": { icon: "📄", category: "document", label: "PDF" },
    "application/msword": { icon: "📝", category: "document", label: "DOC" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      icon: "📝",
      category: "document",
      label: "DOCX",
    },
    "application/vnd.ms-excel": {
      icon: "📊",
      category: "spreadsheet",
      label: "XLS",
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      icon: "📊",
      category: "spreadsheet",
      label: "XLSX",
    },
    "text/csv": { icon: "📈", category: "spreadsheet", label: "CSV" },
    "image/jpeg": { icon: "🖼️", category: "image", label: "JPG" },
    "image/jpg": { icon: "🖼️", category: "image", label: "JPG" },
    "image/png": { icon: "🖼️", category: "image", label: "PNG" },
    "image/gif": { icon: "🖼️", category: "image", label: "GIF" },
    "image/bmp": { icon: "🖼️", category: "image", label: "BMP" },
    "image/webp": { icon: "🖼️", category: "image", label: "WebP" },
    "text/plain": { icon: "📃", category: "text", label: "TXT" },
    "text/rtf": { icon: "📃", category: "text", label: "RTF" },
    "application/vnd.ms-powerpoint": {
      icon: "📊",
      category: "presentation",
      label: "PPT",
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      {
        icon: "📊",
        category: "presentation",
        label: "PPTX",
      },
    "application/zip": { icon: "🗂️", category: "archive", label: "ZIP" },
    "application/x-rar-compressed": {
      icon: "🗂️",
      category: "archive",
      label: "RAR",
    },
  };

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Check if inward number exists
  const checkInwardNumberExists = async (inwardNumber) => {
    if (!inwardNumber.trim()) {
      setInwardNumberExists(false);
      return false;
    }

    setValidatingInward(true);
    try {
      const dbRefInstance = dbRef(database);
      const snapshot = await get(child(dbRefInstance, "data"));

      if (snapshot.exists()) {
        const data = snapshot.val();
        const exists = Object.entries(data).some(([key, value]) => {
          if (isEditing && key === selectedId) return false;
          return value.inwardNumber === inwardNumber;
        });

        setInwardNumberExists(exists);
        if (exists) {
          showToast("⚠️ Inward Number already exists!", "warning");
        }
        return exists;
      }

      setInwardNumberExists(false);
      return false;
    } catch (error) {
      console.error("Error checking inward number:", error);
      return false;
    } finally {
      setValidatingInward(false);
    }
  };

  // Debounce inward number validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.inwardNumber) {
        checkInwardNumberExists(formData.inwardNumber);
      } else {
        setInwardNumberExists(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.inwardNumber]);

  useEffect(() => {
    hasLoadedData.current = false;
    hasShownToast.current = false;
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !hasLoadedData.current) {
      const fetchData = async () => {
        try {
          const dbRefInstance = dbRef(database);
          const snapshot = await get(
            child(dbRefInstance, `data/${selectedId}`)
          );

          if (snapshot.exists()) {
            const data = snapshot.val();
            setFormData({
              department: data.department || "",
              publicRepType: data.publicRepType || "",
              receivedFrom: data.receivedFrom || "",
              subject: data.subject || "",
              allocatedTo: data.allocatedTo || "",
              status: data.status || "Pending",
              inwardNumber: data.inwardNumber || "",
              inwardDate: data.inwardDate || "",
              receivingDate: data.receivingDate || "",
              description: data.description || "",
            });
            setInitialFileInfo(data);
            setIsEditing(true);
            hasLoadedData.current = true;

            if (!hasShownToast.current) {
              showToast("📂 File loaded successfully", "success");
              hasShownToast.current = true;
            }
          } else {
            showToast("⚠️ No file data found", "warning");
          }
        } catch (error) {
          console.error("Error fetching record:", error);
          showToast("❌ Error loading file", "error");
        }
      };
      fetchData();
    }
  }, [selectedId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getFileIcon = (fileType) => supportedFileTypes[fileType]?.icon || "📎";
  const getFileCategory = (fileType) =>
    supportedFileTypes[fileType]?.category || "other";
  const getFileLabel = (fileType) =>
    supportedFileTypes[fileType]?.label || "Unknown";

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFileType = (file) => {
    const allowedTypes = Object.keys(supportedFileTypes);
    if (!allowedTypes.includes(file.type)) {
      showToast(
        `❌ Unsupported file format: ${file.type.split("/")[1].toUpperCase()}`,
        "error"
      );
      return false;
    }
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!validateFileType(file)) {
        e.target.value = "";
        return;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        showToast("⚠️ File size must be less than 50MB", "warning");
        e.target.value = "";
        return;
      }

      setSelectedFile(file);
      showToast(`✅ "${file.name}" selected`, "success");
    }
  };

  const validateForm = async () => {
    if (!formData.department || !formData.subject) {
      showToast("❌ Department and Subject are required", "error");
      return false;
    }

    if (
      formData.department === "Public Representation" &&
      !formData.publicRepType
    ) {
      showToast("❌ Select MLA or MP", "error");
      return false;
    }

    if (!isEditing && !selectedFile) {
      showToast("❌ Please select a file", "error");
      return false;
    }

    if (formData.inwardNumber) {
      const exists = await checkInwardNumberExists(formData.inwardNumber);
      if (exists) {
        showToast("❌ Inward Number already exists", "error");
        return false;
      }
    }

    return true;
  };

  const uploadFile = async (file) => {
    if (!currentUser) throw new Error("User not authenticated");

    try {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const fileName = `${Date.now()}_${uuidv4()}.${fileExtension}`;
      const category = getFileCategory(file.type);
      const filePath = `files/${currentUser.uid}/${category}/${fileName}`;

      const storageRef = ref(storage, filePath);
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: currentUser.uid,
          uploaderEmail: currentUser.email || "",
          uploaderRole: userRole || "subadmin",
          uploaderName: userName || "Unknown",
          originalName: file.name,
          category: category,
        },
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => reject(new Error(`Upload failed: ${error.message}`)),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                fileName: file.name,
                fileURL: downloadURL,
                fileSize: file.size,
                fileType: file.type,
                fileCategory: category,
                storagePath: filePath,
              });
            } catch (error) {
              reject(new Error(`Failed to get download URL: ${error.message}`));
            }
          }
        );
      });
    } catch (error) {
      throw new Error(`Upload setup failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast("❌ Please log in", "error");
      return;
    }

    const isValid = await validateForm();
    if (!isValid) return;

    const hasFormChanged =
      isEditing &&
      JSON.stringify(formData) !==
        JSON.stringify({
          department: initialFileInfo?.department || "",
          publicRepType: initialFileInfo?.publicRepType || "",
          receivedFrom: initialFileInfo?.receivedFrom || "",
          subject: initialFileInfo?.subject || "",
          allocatedTo: initialFileInfo?.allocatedTo || "",
          status: initialFileInfo?.status || "Pending",
          inwardNumber: initialFileInfo?.inwardNumber || "",
          inwardDate: initialFileInfo?.inwardDate || "",
          receivingDate: initialFileInfo?.receivingDate || "",
          description: initialFileInfo?.description || "",
        });

    const hasNewFile = !!selectedFile;

    if (isEditing && !hasFormChanged && !hasNewFile) {
      showToast("ℹ️ No changes detected", "info");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let uploadResult = null;
      if (selectedFile) {
        uploadResult = await uploadFile(selectedFile);
      }

      const recordData = {
        ...formData,
        ...(uploadResult || {
          fileName: initialFileInfo.fileName,
          fileURL: initialFileInfo.fileURL,
          fileSize: initialFileInfo.fileSize,
          fileType: initialFileInfo.fileType,
          fileCategory: initialFileInfo.fileCategory,
          storagePath: initialFileInfo.storagePath,
        }),
        uploadedBy: currentUser.uid,
        uploaderEmail: currentUser.email || "",
        uploaderRole: userRole || "subadmin",
        uploaderName: userName || "Unknown",
        updatedAt: Date.now(),
        createdAt: initialFileInfo?.createdAt || Date.now(),
      };

      const dataRef = dbRef(database, `data/${selectedId || ""}`);
      if (isEditing) {
        await set(dataRef, recordData);
        showToast("✅ File updated successfully!", "success");
      } else {
        await push(dbRef(database, "data"), recordData);
        showToast("🎉 File uploaded successfully!", "success");
      }

      // Reset form
      setFormData({
        department: "",
        publicRepType: "",
        receivedFrom: "",
        subject: "",
        allocatedTo: "",
        status: "Pending",
        inwardNumber: "",
        inwardDate: "",
        receivingDate: "",
        description: "",
      });
      setSelectedFile(null);
      setInwardNumberExists(false);

      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error(error);
      showToast(`❌ Failed: ${error.message}`, "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
    showToast("🗑️ File cleared", "info");
  };

  return (
    <div className="upload-wrapper">
      <div className="upload-container">
        <div className="upload-header">
          <div className="header-content">
            <span className="header-icon">📤</span>
            <h2 className="header-title">Upload Files</h2>
          </div>
          <p className="header-subtitle">Upload and manage your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* File Upload Section */}
          <div className="file-upload-section">
            <label htmlFor="file-input" className="file-upload-label">
              {selectedFile ? (
                <div className="file-selected">
                  <div className="file-icon-wrapper">
                    <span className="file-icon">
                      {getFileIcon(selectedFile.type)}
                    </span>
                  </div>
                  <div className="file-info">
                    <strong className="file-name">{selectedFile.name}</strong>
                    <span className="file-meta">
                      {formatFileSize(selectedFile.size)} •{" "}
                      {getFileLabel(selectedFile.type)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClearFile();
                    }}
                    className="clear-btn"
                    disabled={uploading}
                    aria-label="Clear file"
                  >
                    ✕
                  </button>
                </div>
              ) : !isEditing || !initialFileInfo ? (
                <div className="file-placeholder">
                  <div className="upload-icon-wrapper">
                    <span className="upload-icon">📎</span>
                  </div>
                  <div className="upload-text">
                    <span className="upload-title">
                      Click to browse or drag & drop
                    </span>
                    <span className="upload-subtitle">
                      PDF, DOC, Excel, Images • Max 50MB
                    </span>
                  </div>
                </div>
              ) : (
                <div className="file-selected">
                  <div className="file-icon-wrapper">
                    <span className="file-icon">
                      {getFileIcon(initialFileInfo.fileType)}
                    </span>
                  </div>
                  <div className="file-info">
                    <strong className="file-name">
                      {initialFileInfo.fileName}
                    </strong>
                    <span className="file-meta">
                      {formatFileSize(initialFileInfo.fileSize)} •{" "}
                      {getFileLabel(initialFileInfo.fileType)}
                    </span>
                  </div>
                  <a
                    href={initialFileInfo.fileURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    👁️ View
                  </a>
                </div>
              )}
              <input
                type="file"
                id="file-input"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt,.rtf,.ppt,.pptx,.zip,.rar"
                required={!isEditing}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Form Fields */}
          <div className="form-grid">
            {/* Department */}
            <div className="form-group">
              <label className="form-label">
                Department <span className="req">*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
                disabled={uploading}
                className="form-input"
              >
                <option value="">Select Department</option>
                <option value="Public Representation">
                  Public Representative
                </option>
                <option value="Executive Engineer">Executive Engineer</option>
                <option value="Contractor">Contractor</option>
                <option value="Farmer">Farmer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Public Rep Type - Conditional */}
            {formData.department === "Public Representation" && (
              <div className="form-group">
                <label className="form-label">
                  Type <span className="req">*</span>
                </label>
                <select
                  name="publicRepType"
                  value={formData.publicRepType}
                  onChange={handleInputChange}
                  required
                  disabled={uploading}
                  className="form-input"
                >
                  <option value="">Select Type</option>
                  <option value="MLA">MLA</option>
                  <option value="MP">MP</option>
                </select>
              </div>
            )}

            {/* Subject */}
            <div className="form-group">
              <label className="form-label">
                Subject <span className="req">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Enter subject"
                required
                disabled={uploading}
                className="form-input"
              />
            </div>

            {/* Received From */}
            <div className="form-group">
              <label className="form-label">Received From</label>
              <input
                type="text"
                name="receivedFrom"
                value={formData.receivedFrom}
                onChange={handleInputChange}
                placeholder="Sender name"
                disabled={uploading}
                className="form-input"
              />
            </div>

            {/* Allocated To */}
            <div className="form-group">
              <label className="form-label">Allocated To</label>
              <input
                type="text"
                name="allocatedTo"
                value={formData.allocatedTo}
                onChange={handleInputChange}
                placeholder="Assignee name"
                disabled={uploading}
                className="form-input"
              />
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={uploading}
                className="form-input"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Under Review">Under Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Rejected">Rejected</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {/* Inward Number */}
            <div className="form-group">
              <label className="form-label">
                Inward Number
                {validatingInward && <span className="validating">⏳</span>}
                {inwardNumberExists && <span className="error-txt">⚠️</span>}
              </label>
              <input
                type="text"
                name="inwardNumber"
                value={formData.inwardNumber}
                onChange={handleInputChange}
                placeholder="Enter unique number"
                disabled={uploading}
                className={`form-input ${
                  inwardNumberExists ? "error-input" : ""
                }`}
              />
            </div>

            {/* Inward Date */}
            <div className="form-group">
              <label className="form-label">Inward Date</label>
              <input
                type="date"
                name="inwardDate"
                value={formData.inwardDate}
                onChange={handleInputChange}
                disabled={uploading}
                className="form-input"
              />
            </div>

            {/* Receiving Date */}
            <div className="form-group">
              <label className="form-label">Receiving Date</label>
              <input
                type="date"
                name="receivingDate"
                value={formData.receivingDate}
                onChange={handleInputChange}
                disabled={uploading}
                className="form-input"
              />
            </div>

            {/* Description - Full Width */}
            <div className="form-group full-width">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add additional notes or comments..."
                rows={3}
                disabled={uploading}
                className="form-input"
              />
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <motion.div
              className="upload-progress"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="progress-content">
                <div className="progress-header">
                  <span className="progress-label">
                    <span className="spinner-icon">⏳</span>
                    {uploadProgress < 100
                      ? "Uploading file..."
                      : "Finalizing..."}
                  </span>
                  <span className="progress-percent">{uploadProgress}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={uploading || inwardNumberExists}
            >
              {uploading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>
                    {uploadProgress < 100 ? "Uploading..." : "Processing..."}
                  </span>
                </>
              ) : isEditing ? (
                <>
                  <span>💾</span>
                  <span>Update File</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>Upload File</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

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
        * {
          box-sizing: border-box;
        }

        .upload-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #fef3c7 0%, #ddd6fe 50%, #fce7f3 100%);
          padding: 1rem;
        }

        .upload-container {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        /* Sidebar state adjustments */
        .main-content:not(.sidebar-collapsed) .upload-container {
          max-width: calc(100vw - 280px - 4rem);
        }

        .main-content.sidebar-collapsed .upload-container {
          max-width: calc(100vw - 80px - 4rem);
        }

        /* Header */
        .upload-header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .header-icon {
          font-size: 2rem;
          filter: drop-shadow(0 2px 8px rgba(168, 85, 247, 0.3));
        }

        .header-title {
          font-size: clamp(1.75rem, 5vw, 2.25rem);
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-subtitle {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0;
        }

        /* Form */
        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* File Upload Section */
        .file-upload-section {
          width: 100%;
        }

        .file-upload-label {
          display: block;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .file-upload-label:active {
          transform: scale(0.98);
        }

        .file-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          padding: 2.5rem 1.5rem;
          border: 3px dashed #d8b4fe;
          border-radius: 20px;
          background: linear-gradient(135deg, #faf5ff 0%, #fef3c7 100%);
          transition: all 0.3s ease;
          min-height: 180px;
        }

        .file-placeholder:hover {
          border-color: #c084fc;
          background: linear-gradient(135deg, #f5f3ff 0%, #fef3c7 100%);
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(168, 85, 247, 0.15);
        }

        .upload-icon-wrapper {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #fae8ff, #fef3c7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(168, 85, 247, 0.2);
        }

        .upload-icon {
          font-size: 2.5rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .upload-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
        }

        .upload-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #581c87;
        }

        .upload-subtitle {
          font-size: 0.9rem;
          color: #9333ea;
        }

        .file-selected {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border: 2px solid #e9d5ff;
          border-radius: 16px;
          background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.1);
        }

        .file-selected:hover {
          border-color: #d8b4fe;
          box-shadow: 0 8px 20px rgba(168, 85, 247, 0.15);
        }

        .file-icon-wrapper {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #fae8ff, #fef3c7);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .file-icon {
          font-size: 2rem;
        }

        .file-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .file-name {
          font-size: 1rem;
          font-weight: 600;
          color: #581c87;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .file-meta {
          font-size: 0.85rem;
          color: #9333ea;
        }

        .clear-btn,
        .view-link {
          flex-shrink: 0;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s ease;
          text-decoration: none;
          border: none;
          cursor: pointer;
          white-space: nowrap;
        }

        .clear-btn {
          background: linear-gradient(135deg, #fecaca, #fca5a5);
          color: #991b1b;
        }

        .clear-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #fca5a5, #f87171);
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .clear-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .view-link {
          background: linear-gradient(135deg, #bfdbfe, #93c5fd);
          color: #1e3a8a;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .view-link:hover {
          background: linear-gradient(135deg, #93c5fd, #60a5fa);
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* Form Grid */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #581c87;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .req {
          color: #f43f5e;
        }

        .validating,
        .error-txt {
          font-size: 0.8rem;
          margin-left: auto;
        }

        .validating {
          color: #f59e0b;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .error-txt {
          color: #f43f5e;
        }

        .form-input {
          width: 100%;
          padding: 0.85rem 1.1rem;
          border: 2px solid #e9d5ff;
          border-radius: 12px;
          font-size: 1rem;
          background: #ffffff;
          transition: all 0.3s ease;
          font-family: inherit;
          color: #581c87;
        }

        .form-input::placeholder {
          color: #c084fc;
        }

        .form-input:focus {
          border-color: #c084fc;
          outline: none;
          box-shadow: 0 0 0 4px rgba(192, 132, 252, 0.1);
          background: #fefeff;
        }

        .form-input:disabled {
          background: #faf5ff;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .error-input {
          border-color: #fca5a5 !important;
        }

        .error-input:focus {
          box-shadow: 0 0 0 4px rgba(252, 165, 165, 0.15) !important;
        }

        textarea.form-input {
          resize: vertical;
          min-height: 90px;
        }

        /* Upload Progress */
        .upload-progress {
          background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%);
          border-radius: 16px;
          border: 2px solid #fbcfe8;
          overflow: hidden;
        }

        .progress-content {
          padding: 1.25rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.85rem;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .progress-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #831843;
        }

        .spinner-icon {
          animation: spin 1.5s linear infinite;
        }

        .progress-percent {
          color: #be185d;
          font-size: 1.15rem;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: #fdf4ff;
          border-radius: 999px;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #f9a8d4, #c084fc, #a78bfa);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
          border-radius: 999px;
          box-shadow: 0 0 12px rgba(192, 132, 252, 0.5);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          justify-content: stretch;
          margin-top: 0.5rem;
        }

        .submit-btn {
          width: 100%;
          padding: 1.1rem 2rem;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border: none;
          border-radius: 14px;
          color: white;
          font-weight: 700;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.35);
          letter-spacing: 0.3px;
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #9333ea, #db2777);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(168, 85, 247, 0.45);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Toast Container */
        .toast-container {
          position: fixed;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: calc(100% - 2rem);
          max-width: 400px;
          pointer-events: none;
        }

        .toast-notification {
          padding: 1rem 1.25rem;
          border-radius: 14px;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          pointer-events: auto;
          font-weight: 600;
        }

        .toast-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .toast-close {
          background: rgba(0, 0, 0, 0.1);
          border: none;
          color: #1e293b;
          cursor: pointer;
          padding: 0.35rem 0.6rem;
          border-radius: 8px;
          font-size: 1rem;
          flex-shrink: 0;
          transition: background 0.2s ease;
          font-weight: bold;
        }

        .toast-close:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* Tablet Styles (640px+) - Sidebar-aware on larger tablets */
        @media (min-width: 640px) {
          .upload-wrapper {
            padding: 2rem;
          }

          .upload-container {
            padding: 2rem;
            border-radius: 28px;
          }

          /* On tablets 768px+, adjust for sidebar states */
          @media (min-width: 768px) {
            .main-content:not(.sidebar-collapsed) .upload-container {
              max-width: calc(100vw - 280px - 4rem);
            }

            .main-content.sidebar-collapsed .upload-container {
              max-width: calc(100vw - 80px - 4rem);
            }
          }

          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .full-width {
            grid-column: 1 / -1;
          }

          .file-placeholder {
            flex-direction: row;
            padding: 2rem;
          }

          .upload-icon-wrapper {
            width: 90px;
            height: 90px;
          }

          .upload-icon {
            font-size: 3rem;
          }

          .upload-text {
            align-items: flex-start;
            text-align: left;
          }

          .toast-container {
            bottom: 1.5rem;
            right: 1.5rem;
            left: auto;
            transform: none;
            width: auto;
          }
        }

        /* Mobile (max-width: 767px) - No sidebar margin */
        @media (max-width: 767px) {
          .main-content .upload-container,
          .main-content.sidebar-collapsed .upload-container,
          .main-content:not(.sidebar-collapsed) .upload-container {
            margin-left: 0 !important;
            max-width: 100% !important;
          }
        }

        /* Desktop Styles (1024px+) - Sidebar-aware */
        @media (min-width: 1024px) {
          .upload-wrapper {
            padding: 3rem;
          }

          .upload-container {
            padding: 2.5rem;
          }

          /* Adjust for sidebar expanded state */
          .main-content:not(.sidebar-collapsed) .upload-container {
            max-width: calc(100vw - 280px - 6rem);
          }

          /* Adjust for sidebar collapsed state */
          .main-content.sidebar-collapsed .upload-container {
            max-width: calc(100vw - 80px - 6rem);
          }

          .upload-header {
            margin-bottom: 2.5rem;
          }

          .form-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.75rem;
          }

          .upload-form {
            gap: 2rem;
          }

          .submit-btn {
            width: auto;
            min-width: 220px;
          }

          .form-actions {
            justify-content: flex-end;
          }
        }

        /* Large Desktop */
        @media (min-width: 1280px) {
          .upload-container {
            padding: 3rem;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Focus visible for keyboard navigation */
        .submit-btn:focus-visible,
        .form-input:focus-visible,
        .file-upload-label:focus-visible {
          outline: 3px solid #c084fc;
          outline-offset: 3px;
        }

        /* Print styles */
        @media print {
          .toast-container,
          .submit-btn,
          .clear-btn {
            display: none;
          }

          .upload-wrapper {
            background: white;
          }
        }
      `}</style>
    </div>
  );
};

export default FileUpload;
