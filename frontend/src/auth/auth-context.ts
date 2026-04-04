import { createContext } from 'react';
import type { PublicUser, UserLanguage } from '../api/types';

export interface AuthContextValue {
  user: PublicUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setLanguage: (language: UserLanguage) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
