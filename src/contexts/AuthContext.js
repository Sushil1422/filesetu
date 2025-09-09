// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email, password, userData) => {
    // console.log('AuthContext.js signup - userData:', userData);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;
      
      // Save user data to realtime database under 'user/' node
      await set(ref(database, `user/${uid}`), {
        name: userData.name,
        email: email, // Corrected: use the email argument
        mobile: userData.mobile,
        role: userData.role, // Removed default role
        createdAt: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const getUserRole = async (uid) => {
    try {
      const userRef = ref(database, `user/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val().role) {
        return snapshot.val().role;
      }
      return null; // Revert to null if not found
    } catch (error) {
      console.error('AuthContext.js Error fetching user role:', error);
      return null;
    }
  };

  const getUserName = async (uid) => {
    try {
      const userRef = ref(database, `user/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val().name) {
        return snapshot.val().name;
      }
      return null;
    } catch (error) {
      console.error('AuthContext.js Error fetching user name:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const role = await getUserRole(user.uid);
        const name = await getUserName(user.uid);
        setUserRole(role);
        setUserName(name);
        setLoading(false); // Move setLoading(false) here
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserName(null);
        setLoading(false); // Also set loading to false if no user
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userName,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
