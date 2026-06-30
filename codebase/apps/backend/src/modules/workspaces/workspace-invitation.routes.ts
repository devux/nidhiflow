import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { WorkspaceController } from "./workspace.controller.js";
import { WorkspaceService } from "./workspace.service.js";
import {
  workspaceMembershipMoveBodySchema,
  workspaceInvitationParamsSchema,
  workspaceShareCodeParamsSchema,
} from "./workspace.schemas.js";

export function createWorkspaceInvitationsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new WorkspaceController(new WorkspaceService(database, environment));

  router.use(requireAuth({ database, environment }));
  router.post(
    "/:token/accept",
    validate({ params: workspaceInvitationParamsSchema, body: workspaceMembershipMoveBodySchema }),
    controller.acceptInvitation,
  );
  router.post(
    "/share-codes/:code/join",
    validate({ params: workspaceShareCodeParamsSchema, body: workspaceMembershipMoveBodySchema }),
    controller.joinShareCode,
  );

  return router;
}
