import { Router } from 'express';

import { authController, type AuthController } from './auth.controller.js';
import { registerSchema } from './auth.schema.js';
import { validate } from '../../middlewares/validate.js';

export interface CreateAuthRouterOptions {
  controller?: AuthController;
}

export function createAuthRouter({
  controller = authController,
}: CreateAuthRouterOptions = {}): Router {
  const router = Router();

  router.post('/register', validate({ body: registerSchema }), controller.register);

  return router;
}
