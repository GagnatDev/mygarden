export type UserLanguage = 'nb' | 'en';

/** Authenticated request context (from access JWT). */
export interface AuthUser {
  id: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  language: UserLanguage;
  refreshJti: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  language: UserLanguage;
  createdAt: string;
  updatedAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    language: user.language,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
