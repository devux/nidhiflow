import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { WorkspaceController } from "./workspace.controller.js";
import { WorkspaceService } from "./workspace.service.js";
import {
  createWorkspaceBodySchema,
  createWorkspaceInvitationBodySchema,
  updateWorkspaceBodySchema,
  workspaceMemberParamsSchema,
  workspaceParamsSchema,
} from "./workspace.schemas.js";

export function createWorkspacesRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new WorkspaceController(new WorkspaceService(database, environment));

  router.use(requireAuth({ database, environment }));
  router.get("/", controller.listWorkspaces);
  router.post("/", validate({ body: createWorkspaceBodySchema }), controller.createWorkspace);
  router.get("/:workspaceId", validate({ params: workspaceParamsSchema }), controller.getWorkspace);
  router.patch(
    "/:workspaceId",
    validate({ params: workspaceParamsSchema, body: updateWorkspaceBodySchema }),
    controller.updateWorkspace,
  );
  router.delete(
    "/:workspaceId",
    validate({ params: workspaceParamsSchema }),
    controller.archiveWorkspace,
  );
  router.get(
    "/:workspaceId/members",
    validate({ params: workspaceParamsSchema }),
    controller.listMembers,
  );
  router.post(
    "/:workspaceId/invitations",
    validate({ params: workspaceParamsSchema, body: createWorkspaceInvitationBodySchema }),
    controller.createInvitation,
  );
  router.post(
    "/:workspaceId/share-codes",
    validate({ params: workspaceParamsSchema }),
    controller.createShareCode,
  );
  router.delete(
    "/:workspaceId/members/:userId",
    validate({ params: workspaceMemberParamsSchema }),
    controller.removeMember,
  );
  router.post(
    "/:workspaceId/leave",
    validate({ params: workspaceParamsSchema }),
    controller.leaveWorkspace,
  );

  return router;
}
