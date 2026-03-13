import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as api from '@/lib/api';

interface AuthContextType {
  user: api.AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (api.hasToken()) {
      api.getMe()
        .then(setUser)
        .catch(() => api.logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    const { user } = await api.login(username, password);
    setUser(user);
  }, []);

  const handleRegister = useCallback(async (username: string, password: string, displayName?: string) => {
    const { user } = await api.register(username, password, displayName);
    setUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login: handleLogin, register: handleRegister, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
