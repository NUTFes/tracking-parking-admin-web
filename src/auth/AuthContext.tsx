import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/client";
import { getAccessToken, onAccessTokenChange } from "../api/authToken";
import type { AuthUser } from "../api/types";

type AuthContextValue = {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  user: AuthUser | null;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAccessTokenChange((token) => {
      setIsAuthenticated(!!token);
      if (!token) setUser(null);
    });
    // Re-establish the session from the HttpOnly refresh cookie, if any —
    // the access token itself doesn't survive a page reload.
    authApi.bootstrap().finally(() => setIsBootstrapping(false));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated && !user) {
      authApi.me().then(setUser).catch(() => {});
    }
  }, [isAuthenticated, user]);

  const loginWithGoogle = async (idToken: string) => {
    await authApi.loginWithGoogle(idToken);
  };

  const logout = async () => {
    await authApi.logout();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isBootstrapping, user, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
