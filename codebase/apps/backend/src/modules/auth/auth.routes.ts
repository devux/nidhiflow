import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { createRateLimit } from "../../app/middleware/rateLimit.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { AuthController } from "./auth.controller.js";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
} from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";

export function createAuthRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new AuthController(new AuthService(database, environment), environment);
  const authRateLimit = createRateLimit({
    keyPrefix: "auth",
    limit: environment.AUTH_RATE_LIMIT_MAX,
    windowMs: environment.API_RATE_LIMIT_WINDOW_MS,
  });

  router.post(
    "/register",
    authRateLimit,
    validate({ body: registerBodySchema }),
    controller.register,
  );
  router.post("/login", authRateLimit, validate({ body: loginBodySchema }), controller.login);
  router.post("/refresh", authRateLimit, controller.refresh);
  router.post("/logout", controller.logout);
  router.post("/logout-all", requireAuth({ database, environment }), controller.logoutAll);
  router.post(
    "/verify-email",
    authRateLimit,
    validate({ body: verifyEmailBodySchema }),
    controller.verifyEmail,
  );
  router.post(
    "/resend-verification",
    authRateLimit,
    validate({ body: resendVerificationBodySchema }),
    controller.resendVerification,
  );
  router.post(
    "/forgot-password",
    authRateLimit,
    validate({ body: forgotPasswordBodySchema }),
    controller.forgotPassword,
  );
  router.post(
    "/reset-password",
    authRateLimit,
    validate({ body: resetPasswordBodySchema }),
    controller.resetPassword,
  );

  return router;
}
