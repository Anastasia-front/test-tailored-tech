import * as React from 'react';

import { AuthContext } from '@/context/auth-context';
import { api, ApiError } from '@/lib/api';
import type { PublicUser } from '@/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const me = await api.get<PublicUser>('/auth/me');
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const { user: u } = await api.post<{ user: PublicUser }>('/auth/login', { email, password });
    setUser(u);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const { user: u } = await api.post<{ user: PublicUser }>('/auth/signup', {
      email,
      password,
      name,
    });
    setUser(u);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
