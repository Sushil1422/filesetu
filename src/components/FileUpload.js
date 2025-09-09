import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, database } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { useParams } from 'react-router-dom';
import { get, child, set } from 'firebase/database';

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
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div className="toast-notification" style={{ background: getBackgroundColor() }}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  );
};

const FileUpload = ({ selectedId }) => {
  console.log("selectedId", selectedId);

  const { currentUser } = useAuth();
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [initialFileInfo, setInitialFileInfo] = useState(null);
  const hasLoadedData = useRef(false);
  const hasShownToast = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    department: '',
    publicRepType: '',
    receivedFrom: '',
    subject: '',
    allocatedTo: '',
    status: 'Pending',
    inwardNumber: '',
    inwardDate: '',
    receivingDate: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Supported file types mapping
  const supportedFileTypes = {
    'application/pdf': { icon: '📄', category: 'document' },
    'application/msword': { icon: '📝', category: 'document' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', category: 'document' },
    'application/vnd.ms-excel': { icon: '📊', category: 'spreadsheet' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', category: 'spreadsheet' },
    'text/csv': { icon: '📈', category: 'spreadsheet' },
    'image/jpeg': { icon: '🖼️', category: 'image' },
    'image/jpg': { icon: '🖼️', category: 'image' },
    'image/png': { icon: '🖼️', category: 'image' },
    'image/gif': { icon: '🖼️', category: 'image' },
    'image/bmp': { icon: '🖼️', category: 'image' },
    'image/webp': { icon: '🖼️', category: 'image' },
    'text/plain': { icon: '📃', category: 'text' },
    'text/rtf': { icon: '📃', category: 'text' },
    'application/vnd.ms-powerpoint': { icon: '📊', category: 'presentation' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: '📊', category: 'presentation' },
    'application/zip': { icon: '🗂️', category: 'archive' },
    'application/x-rar-compressed': { icon: '🗂️', category: 'archive' }
  };

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
    // Reset the loaded data flag when selectedId changes
    hasLoadedData.current = false;
    hasShownToast.current = false;
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !hasLoadedData.current) {
      const fetchData = async () => {
        try {
          const dbRefInstance = dbRef(database);
          const snapshot = await get(child(dbRefInstance, `data/${selectedId}`));
          if (snapshot.exists()) {
            const data = snapshot.val();

            setFormData({
              department: data.department || '',
              publicRepType: data.publicRepType || '',
              receivedFrom: data.receivedFrom || '',
              subject: data.subject || '',
              allocatedTo: data.allocatedTo || '',
              status: data.status || 'Pending',
              inwardNumber: data.inwardNumber || '',
              inwardDate: data.inwardDate || '',
              receivingDate: data.receivingDate || '',
              description: data.description || ''
            });

            setInitialFileInfo(data);

            if (data.fileType?.startsWith('image/')) {
              setFilePreview(data.fileURL);
            }

            setIsEditing(true);
            hasLoadedData.current = true;
            
            // Only show toast if we haven't shown one for this record
            if (!hasShownToast.current) {
              showToast('File data loaded successfully', 'success');
              hasShownToast.current = true;
            }
          } else {
            console.warn(`No data found for id: ${selectedId}`);
            showToast('No file data found for editing', 'warning');
          }
        } catch (error) {
          console.error('Error fetching record for edit:', error);
          showToast('Error loading file data', 'error');
        }
      };

      fetchData();
    }
  }, [selectedId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getFileIcon = (fileType) => {
    return supportedFileTypes[fileType]?.icon || '📎';
  };

  const getFileCategory = (fileType) => {
    return supportedFileTypes[fileType]?.category || 'other';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const createImagePreview = (file) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        showToast('File size must be less than 50MB', 'warning');
        e.target.value = '';
        return;
      }

      console.log('File selected:', {
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size)
      });

      setSelectedFile(file);
      createImagePreview(file);
      showToast(`"${file.name}" selected for upload`, 'info');
    }
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.department || !formData.subject) {
      showToast('Please fill in all required fields (Department and Subject)', 'error');
      return false;
    }
    
    // If department is Public Representation, publicRepType is required
    if (formData.department === 'Public Representation' && !formData.publicRepType) {
      showToast('Please select MLA or MP for Public Representation', 'error');
      return false;
    }
    
    // For new uploads, file is required
    if (!isEditing && !selectedFile) {
      showToast('Please select a file to upload', 'error');
      return false;
    }
    
    return true;
  };

  const uploadFile = async (file) => {
    if (!currentUser) {
      throw new Error('User must be authenticated to upload files');
    }
    console.log('🚀 Starting upload for:', file.name);

    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}_${uuidv4()}.${fileExtension}`;
      const category = getFileCategory(file.type);
      const filePath = `files/${currentUser.uid}/${category}/${fileName}`;

      console.log('📁 Upload path:', filePath);

      const storageRef = ref(storage, filePath);

      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: currentUser.uid,
          uploaderEmail: currentUser.email || '',
          originalName: file.name,
          category: category
        }
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
            console.log('📊 Progress:', Math.round(progress) + '%');
          },
          (error) => {
            console.error('❌ Upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              console.log('✅ Upload complete, getting download URL...');
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ Download URL obtained');

              resolve({
                fileName: file.name,
                fileURL: downloadURL,
                fileSize: file.size,
                fileType: file.type,
                fileCategory: category,
                storagePath: filePath
              });
            } catch (error) {
              console.error('❌ Error getting download URL:', error);
              reject(new Error(`Failed to get download URL: ${error.message}`));
            }
          }
        );
      });
    } catch (error) {
      console.error('❌ Upload setup failed:', error);
      throw new Error(`Upload setup failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('Please log in to upload files', 'error');
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Check if formData changed for edits
    const hasFormChanged = isEditing && JSON.stringify(formData) !== JSON.stringify({
      department: initialFileInfo?.department || '',
      publicRepType: initialFileInfo?.publicRepType || '',
      receivedFrom: initialFileInfo?.receivedFrom || '',
      subject: initialFileInfo?.subject || '',
      allocatedTo: initialFileInfo?.allocatedTo || '',
      status: initialFileInfo?.status || 'Pending',
      inwardNumber: initialFileInfo?.inwardNumber || '',
      inwardDate: initialFileInfo?.inwardDate || '',
      receivingDate: initialFileInfo?.receivingDate || '',
      description: initialFileInfo?.description || ''
    });

    // Check if new file was selected
    const hasNewFile = !!selectedFile;

    if (isEditing && !hasFormChanged && !hasNewFile) {
      showToast('No changes detected to update', 'info');
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
        uploaderEmail: currentUser.email || '',
        updatedAt: Date.now(),
      };

      const dataRef = dbRef(database, `data/${selectedId || ''}`);
      if (isEditing) {
        await set(dataRef, recordData);
      } else {
        await push(dbRef(database, 'data'), recordData);
      }

      // Show success message after everything is complete
      if (isEditing) {
        showToast('File updated successfully!', 'success');
      } else {
        showToast('File submitted successfully!', 'success');
      }

      // Reset form
      setFormData({
        department: '',
        publicRepType: '',
        receivedFrom: '',
        subject: '',
        allocatedTo: '',
        status: 'Pending',
        inwardNumber: '',
        inwardDate: '',
        receivingDate: '',
        description: '',
      });
      setSelectedFile(null);
      setFilePreview(null);
    } catch (error) {
      console.error(error);
      showToast(`Failed to upload: ${error.message}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.value = '';
    }
    showToast('File selection cleared', 'info');
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>📤 Upload Files</h2>
        <p>Support for PDF, Word, Excel, Images, Text files and more</p>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        {/* File Upload Section */}
        <div className="file-upload-section">
          <label htmlFor="file-input" className="file-upload-label">
            📎 {isEditing ? 'Replace File (Optional)' : 'Select File *'}
            <input
              type="file"
              id="file-input"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt,.rtf,.ppt,.pptx,.zip,.rar"
              required={!isEditing}
              disabled={uploading}
            />
          </label>

          {/* If a new file is selected */}
          {selectedFile && (
            <div className="selected-file-info">
              <div className="file-details">
                <span className="file-icon">{getFileIcon(selectedFile.type)}</span>
                <div className="file-meta">
                  <strong>{selectedFile.name}</strong>
                  <div className="file-stats">
                    <span>Size: {formatFileSize(selectedFile.size)}</span>
                    <span>Type: {getFileCategory(selectedFile.type)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="clear-file-btn"
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>
              {filePreview && (
                <div className="image-preview">
                  <img src={filePreview} alt="Preview" />
                </div>
              )}
            </div>
          )}

          {/* If editing and no new file is selected */}
          {!selectedFile && isEditing && initialFileInfo?.fileURL && (
            <div className="selected-file-info">
              <div className="file-details">
                <span className="file-icon">{getFileIcon(initialFileInfo.fileType)}</span>
                <div className="file-meta">
                  <strong>{initialFileInfo.fileName}</strong>
                  <div className="file-stats">
                    <span>Size: {formatFileSize(initialFileInfo.fileSize)}</span>
                    <span>Type: {getFileCategory(initialFileInfo.fileType)}</span>
                  </div>
                </div>
                <a
                  href={initialFileInfo.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4f46e5', textDecoration: 'underline' }}
                >
                  View File
                </a>
              </div>
            </div>
          )}
        </div>
        {/* Form Fields */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="department">Department *</label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              disabled={uploading}
            >
              <option value="">Select Department</option>
              <option value="Public Representation">Public Representative</option>
              <option value="Executive Engineer">Executive Engineer</option>
              <option value="Contractor">Contractor</option>
              <option value="Farmer">Farmer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Conditional spinner for MLA or MP when Public Representation selected */}
          {formData.department === 'Public Representation' && (
            <div className="form-group">
              <label htmlFor="publicRepType">Select Type *</label>
              <select
                id="publicRepType"
                name="publicRepType"
                value={formData.publicRepType}
                onChange={handleInputChange}
                required={formData.department === 'Public Representation'}
                disabled={uploading}
              >
                <option value="">Select</option>
                <option value="MLA">MLA</option>
                <option value="MP">MP</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="subject">Subject *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Enter document subject"
              required
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="receivedFrom">Received From</label>
            <input
              type="text"
              id="receivedFrom"
              name="receivedFrom"
              value={formData.receivedFrom}
              onChange={handleInputChange}
              placeholder="Enter sender name"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="allocatedTo">Allocated To</label>
            <input
              type="text"
              id="allocatedTo"
              name="allocatedTo"
              value={formData.allocatedTo}
              onChange={handleInputChange}
              placeholder="Enter assignee name"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={uploading}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value='Rejected'>Rejected</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="inwardNumber">Inward Number</label>
            <input
              type="text"
              id="inwardNumber"
              name="inwardNumber"
              value={formData.inwardNumber}
              onChange={handleInputChange}
              placeholder="Enter inward number"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="inwardDate">Inward Date</label>
            <input
              type="date"
              id="inwardDate"
              name="inwardDate"
              value={formData.inwardDate}
              onChange={handleInputChange}
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="receivingDate">Receiving Date</label>
            <input
              type="date"
              id="receivingDate"
              name="receivingDate"
              value={formData.receivingDate}
              onChange={handleInputChange}
              disabled={uploading}
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter additional description or notes"
            rows={3}
            disabled={uploading}
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-info">
              <span>📤 Uploading {selectedFile?.name}...</span>
              <span className="progress-percentage">{uploadProgress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="upload-status">
              {uploadProgress === 100 ? 'Processing...' : 'Uploading...'}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className={`upload-btn ${uploading ? 'uploading' : ''}`}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="spinner"></span>
                Uploading...
              </>
            ) : isEditing ? (
              '💾 Update File'
            ) : (
              '📤 Upload File'
            )}
          </button>
        </div>
      </form>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <style jsx>{`
        .upload-container {
          width: 95%;
          max-width: 950px;
          margin: 2rem auto;
          padding: 2.5rem;
          background: linear-gradient(to top left, #ffffff, #f8fafc);
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
          font-family: 'Inter', sans-serif;
          position: relative;
        }
        .upload-header {
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .upload-header h2 {
          font-size: 2.2rem;
          font-weight: 800;
          background: linear-gradient(90deg, #4f46e5, #9333ea);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.4rem;
        }
        .upload-header p {
          color: #64748b;
          font-size: 1rem;
          font-weight: 500;
        }
        .file-upload-section {
          border: 2.5px dashed #cbd5e1;
          border-radius: 14px;
          padding: 1.8rem;
          background: #f9fafb;
          text-align: center;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        .file-upload-section:hover {
          background-color: #eef2ff;
          border-color: #6366f1;
        }
        .file-upload-label {
          font-size: 1.05rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }
        .file-upload-label input {
          display: none;
        }
        .selected-file-info {
          margin-top: 1rem;
          padding: 1rem 1.2rem;
          background-color: 'f8fafc';
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid #e5e7eb;
        }
        .file-details {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .file-icon {
          font-size: 2rem;
        }
        .file-meta strong {
          display: block;
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
        }
        .file-stats {
          font-size: 0.9rem;
          color: #475569;
        }
        .clear-file-btn {
          background: none;
          border: none;
          color: #ef4444;
          font-weight: bold;
          font-size: 1.4rem;
          cursor: pointer;
        }
        .image-preview {
          margin-top: 1rem;
          max-width: 300px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.07);
        }
        .image-preview img {
          width: 100%;
          height: auto;
          display: block;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem 2rem;
          margin-top: 2rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          font-weight: 600;
          color: #334155;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1.4px solid #cbd5e1;
          font-size: 1rem;
          background: #ffffff;
          transition: all 0.25s ease;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 6px rgba(99, 102, 241, 0.4);
        }
        .upload-progress {
          margin-top: 1rem;
          padding: 1.2rem;
          background: #f1f5f9;
          border-radius: 10px;
        }
        .progress-bar {
          width: 100%;
          height: 10px;
          background: #e0e7ff;
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #9333ea);
          transition: width 0.35s ease;
        }
        .form-actions {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
        }
        .upload-btn {
          padding: 0.9rem 2.5rem;
          background: linear-gradient(90deg, #4f46e5, #9333ea);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
        }
        .upload-btn:hover:not(:disabled) {
          background: linear-gradient(90deg, #4338ca, #7e22ce);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(147, 51, 234, 0.5);
        }
        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          animation: slideIn 0.3s ease-out;
          max-width: 350px;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-icon {
          font-size: 18px;
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
          font-size: 16px;
          padding: 0;
          margin-left: 10px;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default FileUpload;