import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/onlyflansApi.js";

const AuthContext = createContext(null);

const USER_KEY = "onlyflans_user";
const ACCESS_TOKEN_KEY = "onlyflans_access_token";
const REFRESH_TOKEN_KEY = "onlyflans_refresh_token";

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
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearSessionStorage() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredJson(USER_KEY));
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)));

  const saveSession = (session) => {
    persistSession(session);
    setUser(session.user);
    setToken(session.token);
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

  const logout = async () => {
    await authApi.logout();
    clearSessionStorage();
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    let active = true;

    async function validateSession() {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const currentUser = await authApi.me();
        if (!active) return;
        const storedUser = { ...user, ...currentUser };
        localStorage.setItem(USER_KEY, JSON.stringify(storedUser));
        setUser(storedUser);
      } catch {
        if (!active) return;
        clearSessionStorage();
        setUser(null);
        setToken(null);
      } finally {
        if (active) setIsBootstrapping(false);
      }
    }

    validateSession();
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isBootstrapping,
    login,
    register,
    logout,
  }), [user, token, isBootstrapping]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
