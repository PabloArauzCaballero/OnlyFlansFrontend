import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/onlyflansApi.js";
import { TOKEN_KEYS } from "../services/api.js";

const AuthContext = createContext(null);
const USER_KEY = "onlyflans_user";

function readStoredJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession({ user, token, refreshToken }) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (token) localStorage.setItem(TOKEN_KEYS.access, token);
  if (refreshToken) localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
}

function clearSessionStorage() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredJson(USER_KEY));
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEYS.access));
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const saveSession = (session) => {
    persistSession(session);
    setUser(session.user);
    setToken(session.token || localStorage.getItem(TOKEN_KEYS.access));
  };

  const login = async (payload) => {
    const session = await authApi.login(payload);
    saveSession(session);
    return session.user;
  };

  const register = async (payload) => {
    const session = await authApi.register(payload);
    saveSession(session);
    return session.user;
  };

  const refreshMe = async () => {
    const currentUser = await authApi.me();
    const nextUser = { ...(readStoredJson(USER_KEY) || {}), ...currentUser };
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await authApi.logout();
    clearSessionStorage();
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      try {
        const currentUser = await authApi.me();
        if (!active) return;

        const nextUser = { ...(readStoredJson(USER_KEY) || {}), ...currentUser };
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      } catch {
        if (!active) return;
        clearSessionStorage();
        setUser(null);
        setToken(null);
      } finally {
        if (active) setIsBootstrapping(false);
      }
    }

    bootstrapSession();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(user),
    isBootstrapping,
    login,
    register,
    logout,
    refreshMe,
  }), [user, token, isBootstrapping]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
