import type { AllowedEmail } from '../../domain/allowed-email.js';

export interface CreateAllowedEmailInput {
  email: string;
  addedBy?: string | null;
}

export interface IAllowedEmailRepository {
  findByEmail(email: string): Promise<AllowedEmail | null>;
  findById(id: string): Promise<AllowedEmail | null>;
  create(input: CreateAllowedEmailInput): Promise<AllowedEmail>;
  deleteById(id: string): Promise<boolean>;
  list(): Promise<AllowedEmail[]>;
  markRegistered(email: string, registeredAt: Date): Promise<void>;
}
