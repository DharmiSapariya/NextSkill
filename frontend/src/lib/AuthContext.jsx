import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiGet, getToken, setToken as persistToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [profile, setProfile] = useState(null); // { id, email, skills, tier, is_admin }
  const [loading, setLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      return;
    }
    setLoading(true);
    const { ok, data } = await apiGet("/auth/me", { authed: true });
    setLoading(false);
    if (ok) setProfile(data);
    else {
      // Token expired/invalid — drop it rather than keep showing a stale "logged in" state.
      persistToken(null);
      setTokenState(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (token) refreshProfile();
  }, [token, refreshProfile]);

  const login = useCallback((newToken) => {
    persistToken(newToken);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    setTokenState(null);
    setProfile(null);
  }, []);

  const value = {
    token,
    profile,
    loading,
    isLoggedIn: Boolean(token),
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
