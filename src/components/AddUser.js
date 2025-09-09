import React, { useState } from 'react';
import { database } from '../firebase';
import { ref, push, set } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const AddUser = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user',
    department: '',
    phoneNumber: '',
    address: '',
    employeeId: '',
    joiningDate: '',
    status: 'active'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const newUser = userCredential.user;
      
      // Save user data to Realtime Database under 'users/' node
      const userData = {
        uid: newUser.uid,
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        department: formData.department,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        employeeId: formData.employeeId,
        joiningDate: formData.joiningDate,
        status: formData.status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Store password (Note: In production, never store plain text passwords)
        // This is just for demo purposes
        password: formData.password
      };

      // Save to users/ node with UID as key
      await set(ref(database, `users/${newUser.uid}`), userData);

      alert(`✅ User created successfully!\nUID: ${newUser.uid}\nEmail: ${formData.email}`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: 'user',
        department: '',
        phoneNumber: '',
        address: '',
        employeeId: '',
        joiningDate: '',
        status: 'active'
      });

    } catch (error) {
      console.error('Error creating user:', error);
      alert(`❌ Error creating user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user-container">
      <div className="add-user-header">
        <h2>👤 Add New User</h2>
        <p>Create new user account with complete profile information</p>
      </div>

      <form onSubmit={handleSubmit} className="add-user-form">
        <div className="form-grid">
          {/* Basic Information */}
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Full Name *</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="Enter full name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
              disabled={loading}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Select Department</option>
              <option value="IT">Information Technology</option>
              <option value="HR">Human Resources</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
              <option value="Marketing">Marketing</option>
              <option value="Legal">Legal</option>
              <option value="Administration">Administration</option>
              <option value="Sales">Sales</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="employeeId">Employee ID</label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              placeholder="Enter employee ID"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="joiningDate">Joining Date</label>
            <input
              type="date"
              id="joiningDate"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter complete address"
            rows="3"
            disabled={loading}
          />
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className={`create-user-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating User...
              </>
            ) : (
              '👤 Create User'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUser;
