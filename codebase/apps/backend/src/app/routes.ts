import { Router } from "express";

import type { Environment } from "./config/environment.js";
import { createCategoriesRouter } from "../modules/categories/category.routes.js";
import { createFeedbackRouter } from "../modules/feedback/feedback.routes.js";
import { createAuthRouter } from "../modules/auth/auth.routes.js";
import { createOpenApiRouter } from "../modules/openapi/openapi.routes.js";
import { createUsersRouter } from "../modules/users/user.routes.js";
import { createWorkspacesRouter } from "../modules/workspaces/workspace.routes.js";
import type { Database } from "../shared/database/database.js";
import { createRateLimit } from "./middleware/rateLimit.js";

interface ApiRoutesDependencies {
  database: Database;
  environment: Environment;
  feedbackRateLimitMax: number;
  feedbackRateLimitWindowMs: number;
}

export function createApiRoutes({
  database,
  environment,
  feedbackRateLimitMax,
  feedbackRateLimitWindowMs,
}: ApiRoutesDependencies) {
  const router = Router();

  router.use("/openapi.json", createOpenApiRouter());
  router.use("/auth", createAuthRouter({ database, environment }));
  router.use("/users", createUsersRouter({ database, environment }));
  router.use("/workspaces", createWorkspacesRouter({ database, environment }));
  router.use("/categories/system", createCategoriesRouter({ database }));
  router.use(
    "/feedback",
    createRateLimit({
      keyPrefix: "feedback",
      limit: feedbackRateLimitMax,
      windowMs: feedbackRateLimitWindowMs,
    }),
    createFeedbackRouter({ database }),
  );

  return router;
}
