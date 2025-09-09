// src/components/AdminFileRecordsList.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../firebase';
import { ref, onValue, remove } from 'firebase/database';
import '../styles/AdminFileRecordsList.css';

const AdminFileRecordsList = () => {
  const { currentUser, userProfile } = useAuth();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    // Only allow admin users
    if (!currentUser || userProfile?.role !== 'admin') {
      setLoading(false);
      return;
    }

    const dbRef = ref(database, 'data');

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedRecords = Object.entries(data).map(([id, value]) => ({
          id,
          ...value
        }));
        setRecords(formattedRecords);
        setFilteredRecords(formattedRecords);
      } else {
        setRecords([]);
        setFilteredRecords([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching records:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userProfile]);

  // Filter and search functionality
  useEffect(() => {
    let filtered = [...records];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.uploaderEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(record => record.department === filterDepartment);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'createdAt') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortBy === 'fileSize') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    setFilteredRecords(filtered);
  }, [records, searchTerm, filterDepartment, sortBy, sortOrder]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteRecord = async (recordId, fileName) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        const recordRef = ref(database, `data/${recordId}`);
        await remove(recordRef);
        alert('Record deleted successfully!');
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
      }
    }
  };

  const getUniqueValues = (key) => {
    return [...new Set(records.map(record => record[key]).filter(Boolean))];
  };

  // Access control
  if (!currentUser) {
    return (
      <div className="admin-files-container">
        <div className="access-denied">
          <h3>Access Denied</h3>
          <p>Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
    return (
      <div className="admin-files-container">
        <div className="access-denied">
          <h3>Access Denied</h3>
          <p>You must be an administrator to view all files.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-files-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading all file records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-files-container">
      <div className="admin-files-header">
        <h2>🗂️ All File Records (Admin View)</h2>
        <div className="stats-summary">
          <span className="stat-item">
            <strong>{records.length}</strong> Total Files
          </span>
          <span className="stat-item">
            <strong>{getUniqueValues('department').length}</strong> Departments
          </span>
          <span className="stat-item">
            <strong>{getUniqueValues('uploaderEmail').length}</strong> Users
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="admin-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search files, subjects, or users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="">All Departments</option>
            {getUniqueValues('department').map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="createdAt">Sort by Date</option>
            <option value="fileName">Sort by File Name</option>
            <option value="uploaderEmail">Sort by User</option>
            <option value="department">Sort by Department</option>
            <option value="fileSize">Sort by Size</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-order-btn"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        Showing {filteredRecords.length} of {records.length} files
      </div>

      {/* Files Table */}
      <div className="admin-table-container">
        {filteredRecords.length === 0 ? (
          <div className="no-files">
            <h3>No files found</h3>
            <p>
              {records.length === 0 
                ? 'No files have been uploaded to the system yet.' 
                : 'No files match your current search criteria.'
              }
            </p>
          </div>
        ) : (
          <table className="admin-files-table">
            <thead>
              <tr>
                <th>File Info</th>
                <th>Department</th>
                <th>Subject</th>
                <th>Uploaded By</th>
                <th>Upload Date</th>
                <th>File Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record.id}>
                  <td>
                    <div className="file-info">
                      <span className="file-icon">
                        {getFileIcon(record.fileName)}
                      </span>
                      <div className="file-details">
                        <div className="file-name">{record.fileName}</div>
                        <div className="file-type">
                          {getFileExtension(record.fileName)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="department-badge">
                      {record.department}
                    </span>
                  </td>
                  <td>{record.subject}</td>
                  <td>
                    <div className="user-info">
                      <div className="user-email">{record.uploaderEmail}</div>
                      <div className="user-id">ID: {record.uploadedBy}</div>
                    </div>
                  </td>
                  <td>
                    <div className="date-info">
                      <div className="date">
                        {new Date(Number(record.createdAt)).toLocaleDateString()}
                      </div>
                      <div className="time">
                        {new Date(Number(record.createdAt)).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  <td>{formatFileSize(record.fileSize)}</td>
                  <td>
                    <div className="action-buttons">
                      <a
                        href={record.fileURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-btn"
                        title="Download file"
                      >
                        📥 Download
                      </a>
                      <button
                        onClick={() => handleDeleteRecord(record.id, record.fileName)}
                        className="delete-btn"
                        title="Delete file record"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  function getFileIcon(fileName) {
    if (!fileName) return '📎';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      ppt: '📽️',
      pptx: '📽️',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      mp4: '🎥',
      mp3: '🎵',
      zip: '📦',
      rar: '📦'
    };
    return iconMap[ext] || '📎';
  }

  function getFileExtension(fileName) {
    if (!fileName) return '';
    return fileName.split('.').pop()?.toUpperCase() || '';
  }
};

export default AdminFileRecordsList;
