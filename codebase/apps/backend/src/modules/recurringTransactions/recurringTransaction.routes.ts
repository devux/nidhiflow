import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { RecurringTransactionController } from "./recurringTransaction.controller.js";
import { RecurringTransactionService } from "./recurringTransaction.service.js";
import {
  createRecurringTransactionBodySchema,
  recurringTransactionIdSchema,
  updateRecurringTransactionBodySchema,
  workspaceIdSchema,
} from "./recurringTransaction.schemas.js";

const recurringParamsSchema = workspaceIdSchema.merge(recurringTransactionIdSchema);

export function createRecurringTransactionsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new RecurringTransactionController(new RecurringTransactionService(database));

  router.use(requireAuth({ database, environment }));
  router.get("/", validate({ params: workspaceIdSchema }), controller.listRecurringTransactions);
  router.post(
    "/",
    validate({ params: workspaceIdSchema, body: createRecurringTransactionBodySchema }),
    controller.createRecurringTransaction,
  );
  router.get(
    "/:recurringTransactionId",
    validate({ params: recurringParamsSchema }),
    controller.getRecurringTransaction,
  );
  router.patch(
    "/:recurringTransactionId",
    validate({ params: recurringParamsSchema, body: updateRecurringTransactionBodySchema }),
    controller.updateRecurringTransaction,
  );
  router.delete(
    "/:recurringTransactionId",
    validate({ params: recurringParamsSchema }),
    controller.archiveRecurringTransaction,
  );
  router.post(
    "/:recurringTransactionId/pause",
    validate({ params: recurringParamsSchema }),
    controller.pauseRecurringTransaction,
  );
  router.post(
    "/:recurringTransactionId/resume",
    validate({ params: recurringParamsSchema }),
    controller.resumeRecurringTransaction,
  );

  return router;
}
