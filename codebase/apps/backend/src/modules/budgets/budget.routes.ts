import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { BudgetController } from "./budget.controller.js";
import { BudgetService } from "./budget.service.js";
import {
  budgetIdSchema,
  createBudgetBodySchema,
  updateBudgetBodySchema,
  workspaceIdSchema,
} from "./budget.schemas.js";

const budgetParamsSchema = workspaceIdSchema.merge(budgetIdSchema);

export function createBudgetsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new BudgetController(new BudgetService(database));

  router.use(requireAuth({ database, environment }));
  router.get("/", validate({ params: workspaceIdSchema }), controller.listBudgets);
  router.get("/summary", validate({ params: workspaceIdSchema }), controller.getSummary);
  router.post(
    "/",
    validate({ params: workspaceIdSchema, body: createBudgetBodySchema }),
    controller.createBudget,
  );
  router.get("/:budgetId", validate({ params: budgetParamsSchema }), controller.getBudget);
  router.patch(
    "/:budgetId",
    validate({ params: budgetParamsSchema, body: updateBudgetBodySchema }),
    controller.updateBudget,
  );
  router.delete("/:budgetId", validate({ params: budgetParamsSchema }), controller.archiveBudget);

  return router;
}
