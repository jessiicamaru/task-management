import { authRepository, type AuthRepository, type UserRow } from './auth.repository.js';
import type { RegisterInput } from './auth.schema.js';
import { hash } from './password.js';

export class AuthService {
  constructor(private readonly repository: AuthRepository = authRepository) {}

  async register({ email, password, name }: RegisterInput): Promise<UserRow> {
    const passwordHash = await hash(password);
    return this.repository.createUser({ email, passwordHash, name });
  }
}

export const authService = new AuthService();
