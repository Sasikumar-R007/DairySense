import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const user = authAPI.getCurrentUser();
    const token = localStorage.getItem('auth_token');
    // Only set user if both user data and token exist
    if (user && token) {
      setCurrentUser(user);
    } else {
      // Clear any stale data
      if (!token) {
        localStorage.removeItem('user');
      }
      setCurrentUser(null);
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const result = await authAPI.login(email, password);
      if (result.user) {
        setCurrentUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message || 'Failed to login' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      authAPI.logout();
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

