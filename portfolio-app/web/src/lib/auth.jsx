import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get('/api/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signup = async (payload) => {
    const { user } = await api.post('/api/auth/signup', payload);
    setUser(user);
    return user;
  };

  const login = async (payload) => {
    const { user } = await api.post('/api/auth/login', payload);
    setUser(user);
    return user;
  };

  const logout = async () => {
    await api.post('/api/auth/logout', {});
    setUser(null);
  };

  const completeOnboarding = async (payload) => {
    const { user } = await api.post('/api/auth/onboarding', payload);
    setUser(user);
    return user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, completeOnboarding, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
