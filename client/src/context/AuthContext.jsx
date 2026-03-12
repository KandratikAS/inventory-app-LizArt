import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      if (data.user.language) {
        i18n.changeLanguage(data.user.language);
        sessionStorage.setItem('language', data.user.language);
      }
    } catch {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = (userData, token, refreshToken) => {
    sessionStorage.setItem('token', token);
    if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    if (userData.language) {
      i18n.changeLanguage(userData.language);
      sessionStorage.setItem('language', userData.language);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    setUser(null);
  };

  const updateUser = (u) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);