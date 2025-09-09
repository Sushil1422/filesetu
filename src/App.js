// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import SubAdminDashboard from './components/SubAdminDashboard';
import FileUpload from './components/FileUpload';
import RecordsView from './components/RecordsView';
import ProtectedRoute from './components/ProtectedRoute';
import AdminFileRecordsList from './components/AdminFileRecordsList';
import FileRecordsList from './components/RecordsView';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Admin Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-file-upload"
              element={
                <ProtectedRoute requiredRole="admin">
                  <FileUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-records-view"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminFileRecordsList />
                </ProtectedRoute>
              }
            />

            {/* SubAdmin Dashboard */}
            <Route
              path="/subadmin-dashboard"
              element={
                <ProtectedRoute requiredRole="subadmin">
                  <SubAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subadmin-dashboard-file-upload"
              element={
                <ProtectedRoute requiredRole="subadmin">
                  <FileUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subadmin-dashboard-records-view"
              element={
                <ProtectedRoute requiredRole="subadmin">
                  <FileRecordsList />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
