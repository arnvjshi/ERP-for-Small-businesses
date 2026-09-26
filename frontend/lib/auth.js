'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        api.clearTokens();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isWorker = user?.role === 'WORKER';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
