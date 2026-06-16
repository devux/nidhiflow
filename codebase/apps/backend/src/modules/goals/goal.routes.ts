import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { GoalController } from "./goal.controller.js";
import { GoalService } from "./goal.service.js";
import {
  contributionIdSchema,
  createContributionBodySchema,
  createGoalBodySchema,
  goalIdSchema,
  updateGoalBodySchema,
  workspaceIdSchema,
} from "./goal.schemas.js";

const goalParamsSchema = workspaceIdSchema.merge(goalIdSchema);
const contributionParamsSchema = goalParamsSchema.merge(contributionIdSchema);

export function createGoalsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new GoalController(new GoalService(database));

  router.use(requireAuth({ database, environment }));
  router.get("/", validate({ params: workspaceIdSchema }), controller.listGoals);
  router.post(
    "/",
    validate({ params: workspaceIdSchema, body: createGoalBodySchema }),
    controller.createGoal,
  );
  router.get("/:goalId", validate({ params: goalParamsSchema }), controller.getGoal);
  router.patch(
    "/:goalId",
    validate({ params: goalParamsSchema, body: updateGoalBodySchema }),
    controller.updateGoal,
  );
  router.delete("/:goalId", validate({ params: goalParamsSchema }), controller.archiveGoal);
  router.post(
    "/:goalId/contributions",
    validate({ params: goalParamsSchema, body: createContributionBodySchema }),
    controller.createContribution,
  );
  router.delete(
    "/:goalId/contributions/:contributionId",
    validate({ params: contributionParamsSchema }),
    controller.deleteContribution,
  );

  return router;
}
