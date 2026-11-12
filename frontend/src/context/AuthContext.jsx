import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import * as api from "../lib/api";

const AuthContext = createContext(null);
const PROFILE_TIMEOUT_MS = 10_000;
const SIGNED_OUT = { user: null, loading: false, error: null, logoutLocationKey: null };

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ ...SIGNED_OUT, loading: true });
  const pending = useRef(null);
  const { key: locationKey } = useLocation();

  const cancelProfile = useCallback(() => {
    const request = pending.current;
    pending.current = null;
    request?.controller.abort();
  }, []);

  const loadUser = useCallback(() => {
    const token = api.getToken();
    if (token && pending.current?.token === token) return pending.current.promise;

    cancelProfile();
    if (!token) {
      setSession(SIGNED_OUT);
      return;
    }

    const controller = new AbortController();
    const request = { token, controller };
    pending.current = request;
    setSession((previous) => ({ ...previous, loading: true, error: null }));

    const timer = setTimeout(() => {
      controller.abort(new DOMException("Profile request timed out", "TimeoutError"));
    }, PROFILE_TIMEOUT_MS);

    request.promise = (async () => {
      try {
        const user = await api.getMe(controller.signal);
        if (pending.current !== request) return;
        if (api.getToken() !== token) {
          setSession(SIGNED_OUT);
          return;
        }
        if (typeof user?.id !== "number" || typeof user.email !== "string" || typeof user.is_admin !== "boolean") {
          throw new Error("Invalid profile response");
        }
        setSession({ ...SIGNED_OUT, user });
      } catch (error) {
        if (pending.current !== request) return;
        const tokenIsCurrent = api.getToken() === token;
        if (!tokenIsCurrent || error.status === 401) {
          if (tokenIsCurrent) api.setToken(null);
          setSession(SIGNED_OUT);
          return;
        }

        let message = "We couldn't load your profile. Try again.";
        if (error.status === 403) {
          message = "You don't have permission to access this profile.";
        } else if (controller.signal.reason?.name === "TimeoutError") {
          message = "Loading your profile took too long. Try again.";
        } else if (error instanceof TypeError || error.status >= 500) {
          message = "We couldn't reach your profile. Check your connection or try again shortly.";
        }
        setSession({ ...SIGNED_OUT, error: message });
      } finally {
        clearTimeout(timer);
        if (pending.current === request) pending.current = null;
      }
    })();

    return request.promise;
  }, [cancelProfile]);

  useEffect(() => {
    let active = true;
    // React Strict Mode can clean up the first effect before starting it again.
    queueMicrotask(() => {
      if (active) loadUser();
    });
    return () => {
      active = false;
      cancelProfile();
    };
  }, [loadUser, cancelProfile]);

  const login = async (email, password) => {
    const { access_token } = await api.login(email, password);
    api.setToken(access_token);
    await loadUser();
  };

  const signup = async (email, password) => {
    const { access_token } = await api.signup(email, password);
    api.setToken(access_token);
    await loadUser();
  };

  const logout = () => {
    cancelProfile();
    api.setToken(null);
    setSession({ ...SIGNED_OUT, logoutLocationKey: locationKey });
  };

  return (
    <AuthContext.Provider value={{ ...session, login, signup, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
