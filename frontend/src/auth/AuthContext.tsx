import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';
import { setAccessToken } from '../api/token';
import type { PublicUser, UserLanguage } from '../api/types';
import i18n from '../i18n';
import { AuthContext } from './auth-context';

export type { AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  const applyUser = useCallback((u: PublicUser | null) => {
    setUser(u);
    if (u) {
      void i18n.changeLanguage(u.language);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshed = await authApi.refreshSession();
        if (cancelled) return;
        if (!refreshed) {
          applyUser(null);
          return;
        }
        const me = await usersApi.getMe();
        if (!cancelled) {
          applyUser(me);
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          applyUser(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u } = await authApi.login(email, password);
    applyUser(u);
  }, [applyUser]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const { user: u } = await authApi.register(email, password, displayName);
    applyUser(u);
  }, [applyUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* still clear local session */
    }
    applyUser(null);
  }, [applyUser]);

  const refreshUser = useCallback(async () => {
    const me = await usersApi.getMe();
    applyUser(me);
  }, [applyUser]);

  const setLanguage = useCallback(async (language: UserLanguage) => {
    const updated = await usersApi.patchMe({ language });
    applyUser(updated);
  }, [applyUser]);

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      register,
      logout,
      refreshUser,
      setLanguage,
    }),
    [user, ready, login, register, logout, refreshUser, setLanguage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
