'use client';

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAccessToken, setOnUnauthorized, refreshAccessToken } from '@/lib/api-client';

type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'webmaster';
  companyId?: string;
  teamRole?: 'owner' | 'member' | null;
};

type RegisterData = {
  company: {
    name: string;
    baseUrl: string;
    kbisFileRef: string;
    contact: { name: string; email: string; phone?: string };
  };
  user: { email: string; password: string };
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    setOnUnauthorized(handleUnauthorized);
  }, [handleUnauthorized]);

  useEffect(() => {
    async function tryRestoreSession() {
      try {
        const token = await refreshAccessToken();
        setAccessToken(token);
        const meRes = await api.get('/api/v1/auth/me');
        setUser({
          id: meRes.data.user._id,
          email: '',
          role: meRes.data.user.role,
          companyId: meRes.data.user.companyId,
          teamRole: meRes.data.user.teamRole,
        });
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    tryRestoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/v1/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (input: RegisterData) => {
    await api.post('/api/v1/auth/register', input);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      setUser(null);
      setAccessToken(null);
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
