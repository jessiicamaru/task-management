import type { NextFunction, Request, Response } from 'express';

import type { RegisterInput } from './auth.schema.js';
import { authService, type AuthService } from './auth.service.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as RegisterInput;
      const user = await this.service.register(input);
      res.setHeader('Location', `/api/v1/users/${user.id}`);
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
