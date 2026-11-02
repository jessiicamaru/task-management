import { Router } from 'express';

import { authController, type AuthController } from './auth.controller.js';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth.schema.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authLimiter } from '../../middlewares/rate-limit.js';
import { validate } from '../../middlewares/validate.js';

export interface CreateAuthRouterOptions {
  controller?: AuthController;
}

export function createAuthRouter({
  controller = authController,
}: CreateAuthRouterOptions = {}): Router {
  const router = Router();

  router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
  router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
  router.post('/refresh', authLimiter, validate({ body: refreshSchema }), controller.refresh);
  router.post('/logout', validate({ body: logoutSchema }), controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}
