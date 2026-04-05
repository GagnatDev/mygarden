import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../../config/env.js';
import type { AllowedEmail } from '../../domain/allowed-email.js';
import { toPublicUser, type PublicUser, type User } from '../../domain/user.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IAllowedEmailRepository } from '../../repositories/interfaces/allowed-email.repository.interface.js';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.interface.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

interface AccessJwtPayload {
  sub: string;
  email: string;
  typ: 'access';
}

interface RefreshJwtPayload {
  sub: string;
  jti: string;
  typ: 'refresh';
}

export class AuthService {
  constructor(
    private readonly env: Env,
    private readonly users: IUserRepository,
    private readonly allowedEmails: IAllowedEmailRepository,
  ) {}

  async register(
    emailRaw: string,
    password: string,
    displayName: string,
  ): Promise<AuthResult> {
    const email = emailRaw.toLowerCase().trim();

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new HttpError(409, 'An account with this email already exists', 'Conflict');
    }

    const entry = await this.allowedEmails.findByEmail(email);
    const implicitAdminAllow =
      this.env.ADMIN_EMAIL !== undefined && email === this.env.ADMIN_EMAIL;

    if (!entry && !implicitAdminAllow) {
      throw new HttpError(
        403,
        'This email is not approved for registration',
        'Forbidden',
        'https://mygarden.app/problems/email-not-approved',
      );
    }
    if (entry?.registeredAt) {
      throw new HttpError(
        403,
        'This invitation has already been used',
        'Forbidden',
        'https://mygarden.app/problems/invitation-used',
      );
    }

    const passwordHash = await bcrypt.hash(password, this.env.BCRYPT_ROUNDS);
    const user = await this.users.create({
      email,
      passwordHash,
      displayName,
      language: 'nb',
    });

    await this.allowedEmails.markRegistered(email, new Date());

    return this.issueTokensForUser(user);
  }

  async login(emailRaw: string, password: string): Promise<AuthResult> {
    const email = emailRaw.toLowerCase().trim();
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new HttpError(401, 'Invalid email or password', 'Unauthorized');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new HttpError(401, 'Invalid email or password', 'Unauthorized');
    }

    return this.issueTokensForUser(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken?.length) {
      throw new HttpError(401, 'Missing refresh token', 'Unauthorized');
    }

    let payload: RefreshJwtPayload;
    try {
      payload = jwt.verify(refreshToken, this.env.JWT_REFRESH_SECRET) as RefreshJwtPayload;
    } catch {
      throw new HttpError(401, 'Invalid or expired refresh token', 'Unauthorized');
    }

    if (payload.typ !== 'refresh' || !payload.sub || !payload.jti) {
      throw new HttpError(401, 'Invalid refresh token', 'Unauthorized');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.refreshJti !== payload.jti) {
      throw new HttpError(401, 'Invalid or expired refresh token', 'Unauthorized');
    }

    const newJti = uuidv4();
    const updated = await this.users.update(user.id, { refreshJti: newJti });
    if (!updated) {
      throw new HttpError(401, 'User not found', 'Unauthorized');
    }

    return this.buildTokens(updated, newJti);
  }

  async logout(userId: string): Promise<void> {
    await this.users.update(userId, { refreshJti: null });
  }

  signAccessToken(user: Pick<User, 'id' | 'email'>): string {
    const body: AccessJwtPayload = {
      sub: user.id,
      email: user.email,
      typ: 'access',
    };
    return jwt.sign(body, this.env.JWT_SECRET, {
      expiresIn: this.env.ACCESS_TOKEN_EXPIRES,
    } as SignOptions);
  }

  signRefreshToken(userId: string, jti: string): string {
    const body: RefreshJwtPayload = { sub: userId, jti, typ: 'refresh' };
    return jwt.sign(body, this.env.JWT_REFRESH_SECRET, {
      expiresIn: this.env.REFRESH_TOKEN_EXPIRES,
    } as SignOptions);
  }

  private async issueTokensForUser(user: User): Promise<AuthResult> {
    const jti = uuidv4();
    const updated = await this.users.update(user.id, { refreshJti: jti });
    const current = updated ?? user;
    return this.buildTokens({ ...current, refreshJti: jti }, jti);
  }

  private buildTokens(user: User, jti: string): AuthResult {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user.id, jti);
    return {
      accessToken,
      refreshToken,
      user: toPublicUser(user),
    };
  }

  /** Exposed for unit tests: hashing + JWT shape without DB. */
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.env.BCRYPT_ROUNDS);
  }

  verifyAccessToken(token: string): AccessJwtPayload {
    const payload = jwt.verify(token, this.env.JWT_SECRET) as AccessJwtPayload;
    if (payload.typ !== 'access') {
      throw new HttpError(401, 'Invalid access token', 'Unauthorized');
    }
    return payload;
  }
}

/** For tests / admin: serialize allowlist entry */
export function publicAllowedEmail(entry: AllowedEmail) {
  return {
    id: entry.id,
    email: entry.email,
    addedBy: entry.addedBy,
    registeredAt: entry.registeredAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}
