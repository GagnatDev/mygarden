import type { User, UserLanguage } from '../../domain/user.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  language?: UserLanguage;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** First user by account creation time (for app-owner fallback). */
  findOldestUser(): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(
    id: string,
    patch: Partial<Pick<User, 'displayName' | 'language' | 'passwordHash' | 'refreshJti'>>,
  ): Promise<User | null>;
}
