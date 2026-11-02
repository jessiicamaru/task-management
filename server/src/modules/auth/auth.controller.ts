import type { NextFunction, Request, Response } from 'express';

import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from './auth.schema.js';
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

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as LoginInput;
      const clientMeta = {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };
      const result = await this.service.login(input, clientMeta);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as RefreshInput;
      const clientMeta = {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };
      const result = await this.service.refresh(input.refreshToken, clientMeta);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as LogoutInput;
      await this.service.logout(input?.refreshToken);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res
          .status(401)
          .json({ error: { code: 'unauthorized', message: 'Authentication required' } });
        return;
      }
      const user = await this.service.getMe(userId);
      res.status(200).json({
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
