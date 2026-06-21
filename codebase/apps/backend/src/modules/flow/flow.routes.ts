import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { FlowController } from "./flow.controller.js";
import { flowChatBodySchema, workspaceIdSchema } from "./flow.schemas.js";
import { FlowService } from "./flow.service.js";

export function createFlowRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new FlowController(new FlowService(database, environment));

  router.use(requireAuth({ database, environment }));
  router.post(
    "/chat",
    validate({ params: workspaceIdSchema, body: flowChatBodySchema }),
    controller.chat,
  );

  return router;
}
