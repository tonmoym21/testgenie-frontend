import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
    setUser({ id: payload.sub, email: payload.email });
    return data;
  }, []);

  const register = useCallback(async (email, password) => {
    return api.register(email, password);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
