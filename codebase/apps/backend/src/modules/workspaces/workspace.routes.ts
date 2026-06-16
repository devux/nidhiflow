import { Router } from "express";
import { z } from "zod";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { WorkspaceController } from "./workspace.controller.js";
import { WorkspaceService } from "./workspace.service.js";

const workspaceParamsSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export function createWorkspacesRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new WorkspaceController(new WorkspaceService(database));

  router.use(requireAuth({ database, environment }));
  router.get("/", controller.listWorkspaces);
  router.get("/:workspaceId", validate({ params: workspaceParamsSchema }), controller.getWorkspace);

  return router;
}
