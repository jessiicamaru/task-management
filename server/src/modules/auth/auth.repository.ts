import { query } from '../../db/pool.js';
import { ConflictError } from '../../utils/errors.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPasswordHash extends UserRow {
  passwordHash: string;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
}

export interface RefreshTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedBy: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export interface AuthRepository {
  createUser(data: CreateUserData): Promise<UserRow>;
  findUserByEmailWithHash(email: string): Promise<UserWithPasswordHash | null>;
  findUserById(id: string): Promise<UserRow | null>;
  updateUserPasswordHash(id: string, passwordHash: string): Promise<void>;
  createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshTokenRow>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null>;
  revokeRefreshToken(id: string, replacedBy?: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
}

export class PostgresAuthRepository implements AuthRepository {
  async createUser({ email, passwordHash, name }: CreateUserData): Promise<UserRow> {
    try {
      const result = await query<UserRow>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [email, passwordHash, name],
      );

      const user = result.rows[0];
      if (!user) {
        throw new Error('Failed to insert user');
      }
      return user;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        throw new ConflictError('Email already registered', 'email_already_registered');
      }
      throw err;
    }
  }

  async findUserByEmailWithHash(email: string): Promise<UserWithPasswordHash | null> {
    const result = await query<UserWithPasswordHash>(
      `SELECT id, email, name, password_hash AS "passwordHash", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      `SELECT id, email, name, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async updateUserPasswordHash(id: string, passwordHash: string): Promise<void> {
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);
  }

  async createRefreshToken({
    userId,
    tokenHash,
    familyId,
    expiresAt,
    userAgent,
    ip,
  }: CreateRefreshTokenData): Promise<RefreshTokenRow> {
    const result = await query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent, ip)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id AS "userId", token_hash AS "tokenHash", family_id AS "familyId",
                 expires_at AS "expiresAt", revoked_at AS "revokedAt", replaced_by AS "replacedBy",
                 user_agent AS "userAgent", ip, created_at AS "createdAt"`,
      [userId, tokenHash, familyId, expiresAt.toISOString(), userAgent ?? null, ip ?? null],
    );

    const tokenRow = result.rows[0];
    if (!tokenRow) throw new Error('Failed to insert refresh token');
    return tokenRow;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const result = await query<RefreshTokenRow>(
      `SELECT id, user_id AS "userId", token_hash AS "tokenHash", family_id AS "familyId",
              expires_at AS "expiresAt", revoked_at AS "revokedAt", replaced_by AS "replacedBy",
              user_agent AS "userAgent", ip, created_at AS "createdAt"
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async revokeRefreshToken(id: string, replacedBy?: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = now(), replaced_by = $2
       WHERE id = $1`,
      [id, replacedBy ?? null],
    );
  }

  async revokeFamily(familyId: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = now()
       WHERE family_id = $1 AND revoked_at IS NULL`,
      [familyId],
    );
  }
}

export const authRepository = new PostgresAuthRepository();
