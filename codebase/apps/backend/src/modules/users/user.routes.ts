import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { UserController } from "./user.controller.js";
import { sessionParamsSchema, updateProfileBodySchema } from "./user.schemas.js";
import { UserService } from "./user.service.js";

export function createUsersRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new UserController(new UserService(database), environment);

  router.use(requireAuth({ database, environment }));
  router.get("/me", controller.getCurrentUser);
  router.patch("/me", validate({ body: updateProfileBodySchema }), controller.updateCurrentUser);
  router.get("/me/sessions", controller.listSessions);
  router.delete(
    "/me/sessions/:sessionId",
    validate({ params: sessionParamsSchema }),
    controller.revokeSession,
  );

  return router;
}
