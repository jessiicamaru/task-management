import { query } from '../../db/pool.js';
import { ConflictError } from '../../utils/errors.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
}

export interface AuthRepository {
  createUser(data: CreateUserData): Promise<UserRow>;
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
}

export const authRepository = new PostgresAuthRepository();
