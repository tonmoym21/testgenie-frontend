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
    return {
      id: payload.sub,
      email: payload.email,
      exp: payload.exp,
      orgId: payload.orgId || null,
      role: payload.role || null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Gate protected routes until the initial refresh attempt resolves. Without
  // this, a reload with a valid cookie but expired access token would briefly
  // show user=null → ProtectedRoute redirects to /login → cookie refresh
  // resolves → bounces back. This flag prevents that flash.
  const initialDecoded = decodeToken(localStorage.getItem('accessToken'));
  const [user, setUser] = useState(() => {
    if (initialDecoded) {
      return {
        id: initialDecoded.id,
        email: initialDecoded.email,
        orgId: initialDecoded.orgId,
        role: initialDecoded.role,
      };
    }
    return null;
  });
  // If we already have a valid access token, we're ready. Otherwise the mount
  // effect flips this true after attempting a cookie refresh.
  const [authReady, setAuthReady] = useState(!!initialDecoded);

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
          setUser({
            id: newDecoded.id,
            email: newDecoded.email,
            orgId: newDecoded.orgId,
            role: newDecoded.role,
          });
          scheduleRefresh(); // schedule next refresh
        }
      } else {
        // Refresh failed — session truly expired
        api.clearTokens();
        setUser(null);
      }
    }, refreshIn);
  }, []);

  // On mount: if access token is valid use it; otherwise blindly attempt a
  // refresh — the HttpOnly cookie tells us whether a session exists.
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const decoded = decodeToken(accessToken);

    if (decoded) {
      scheduleRefresh();
      // authReady was already true from initial state; nothing to do.
    } else {
      api.tryRefreshToken().then((success) => {
        if (success) {
          const newToken = localStorage.getItem('accessToken');
          const newDecoded = decodeToken(newToken);
          if (newDecoded) {
            setUser({
              id: newDecoded.id,
              email: newDecoded.email,
              orgId: newDecoded.orgId,
              role: newDecoded.role,
            });
            scheduleRefresh();
          }
        } else {
          api.clearTokens();
          setUser(null);
        }
      }).finally(() => {
        setAuthReady(true);
      });
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
            setUser({
              id: decoded.id,
              email: decoded.email,
              orgId: decoded.orgId,
              role: decoded.role,
            });
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
    setUser({
      id: payload.sub,
      email: payload.email,
      orgId: payload.orgId || null,
      role: payload.role || null,
    });
    scheduleRefresh();
    return data;
  }, [scheduleRefresh]);

  const register = useCallback(async (email, password) => {
    return api.register(email, password);
  }, []);

  const registerWithInvite = useCallback(async (email, password, inviteToken) => {
    const res = await fetch(`${api.API_BASE}/auth/register-with-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, inviteToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error?.message || 'Registration failed');
      error.code = data.error?.code;
      throw error;
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await api.logout();
    setUser(null);
  }, []);

  // Helper to check if user can manage team
  const canManageTeam = user?.role === 'owner' || user?.role === 'admin';
  const isOwner = user?.role === 'owner';
  const hasOrganization = !!user?.orgId;

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      registerWithInvite,
      logout,
      isAuthenticated: !!user,
      authReady,
      canManageTeam,
      isOwner,
      hasOrganization,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
