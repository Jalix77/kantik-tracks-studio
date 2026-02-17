import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('kantik_token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token]);
  const login
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('kantik_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, displayName) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, displayName });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('kantik_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('kantik_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser();
    }
  };

  const isPlanActive = () => {
    if (!user) return false;
    if (user.plan === 'FREE') return true;
    
    const now = new Date().toISOString();
    if (user.planExpiresAt && user.planExpiresAt >= now) return true;
    if (user.graceUntil && user.graceUntil >= now) return true;
    return false;
  };

  const canDownload = (accessTier) => {
    if (!user || !isPlanActive()) return false;
    if (user.plan === 'FREE') return false;
    if (user.plan === 'STANDARD' && accessTier === 'PREMIUM') return false;
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      token,
      login,
      register,
      logout,
      refreshUser,
      isPlanActive,
      canDownload,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || user?.role === 'ADMIN' || false
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
