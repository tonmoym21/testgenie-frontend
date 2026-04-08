import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

/** Decode JWT payload, returns null if invalid/expired */
function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry — reject if expired
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    return { id: payload.sub, email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('accessToken');
    const decoded = decodeToken(token);
    if (decoded) return { id: decoded.id, email: decoded.email };

    // Access token expired but refresh token may still be valid — we'll try refresh in useEffect
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) return null; // will attempt refresh on mount

    // No tokens at all
    return null;
  });

  const refreshTimerRef = useRef(null);

  // Schedule a proactive refresh 60s before the access token expires
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const token = localStorage.getItem('accessToken');
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return;

    const msUntilExpiry = decoded.exp * 1000 - Date.now();
    const refreshIn = Math.max(msUntilExpiry - 60000, 5000); // refresh 60s early, min 5s

    refreshTimerRef.current = setTimeout(async () => {
      const success = await api.tryRefreshToken();
      if (success) {
        const newToken = localStorage.getItem('accessToken');
        const newDecoded = decodeToken(newToken);
        if (newDecoded) {
          setUser({ id: newDecoded.id, email: newDecoded.email });
          scheduleRefresh(); // schedule next refresh
        }
      } else {
        // Refresh failed — session truly expired
        api.clearTokens();
        setUser(null);
      }
    }, refreshIn);
  }, []);

  // On mount: if access token expired but refresh exists, try refresh once
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const decoded = decodeToken(accessToken);

    if (!decoded && refreshToken) {
      // Access token expired, try refresh
      api.tryRefreshToken().then((success) => {
        if (success) {
          const newToken = localStorage.getItem('accessToken');
          const newDecoded = decodeToken(newToken);
          if (newDecoded) {
            setUser({ id: newDecoded.id, email: newDecoded.email });
            scheduleRefresh();
          }
        } else {
          api.clearTokens();
          setUser(null);
        }
      });
    } else if (decoded) {
      scheduleRefresh();
    }

    // Listen for session expiry from api.js (e.g., 401 after refresh failure)
    api.onSessionExpired(() => {
      setUser(null);
    });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === 'accessToken') {
        if (!e.newValue) {
          setUser(null); // logged out in another tab
        } else {
          const decoded = decodeToken(e.newValue);
          if (decoded) {
            setUser({ id: decoded.id, email: decoded.email });
            scheduleRefresh();
          }
        }
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [scheduleRefresh]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
    setUser({ id: payload.sub, email: payload.email });
    scheduleRefresh();
    return data;
  }, [scheduleRefresh]);

  const register = useCallback(async (email, password) => {
    return api.register(email, password);
  }, []);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
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
