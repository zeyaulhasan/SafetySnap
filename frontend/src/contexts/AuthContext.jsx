import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Register with fullName, email, username, password, and role
  async function signup(fullName, username, email, password, role) {
    const res = await axios.post('/api/auth/register', { fullName, username, email, password, role });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  }

  // Login with email and password
  async function login(email, password) {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  }

  // Logout — clear token and state
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  }

  // Update user profile
  async function updateProfile(profileData) {
    const token = localStorage.getItem('token');
    const res = await axios.put('/api/auth/profile', profileData, {
      headers: { 'x-auth-token': token }
    });
    const { user } = res.data;
    // Merge updated profile into localStorage
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const merged = { ...stored, ...user };
    localStorage.setItem('user', JSON.stringify(merged));
    setCurrentUser(merged);
    return merged;
  }

  const value = {
    currentUser,
    login,
    signup,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
