// src/components/AddAdmin.js
import React, { useState } from 'react';
import { getDatabase, ref, set, get, child } from 'firebase/database';

const AddAdmin = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setStatus('');

    if (!email || !name) {
      setStatus('Please enter both name and email.');
      return;
    }

    const db = getDatabase();
    const usersRef = ref(db, 'users');

    // Simple key: base64 of email for uniqueness (replace as needed)
    const userKey = btoa(email);

    try {
      // Check if user already exists
      const snapshot = await get(child(ref(db), `users/${userKey}`));
      if (snapshot.exists()) {
        setStatus('User already exists!');
        return;
      }

      // Create user object
      const userObj = {
        name,
        email,
        role: 'admin',
        createdAt: Date.now()
      };

      await set(child(usersRef, userKey), userObj);
      setStatus('Admin user added successfully!');
      setEmail('');
      setName('');
    } catch (err) {
      setStatus('Error adding admin: ' + err.message);
    }
  };

  return (
    <div className="add-admin">
      <h3>Add Admin</h3>
      <form onSubmit={handleAddAdmin}>
        <div>
          <input
            type="text"
            placeholder="Admin Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <button type="submit">Add Admin</button>
      </form>
      {status && <div className="status">{status}</div>}
    </div>
  );
};

export default AddAdmin;
