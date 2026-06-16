import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { TransactionController } from "./transaction.controller.js";
import { TransactionService } from "./transaction.service.js";
import {
  createTransactionBodySchema,
  transactionListQuerySchema,
  workspaceIdSchema,
} from "./transaction.schemas.js";

export function createTransactionsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new TransactionController(new TransactionService(database));

  router.use(requireAuth({ database, environment }));
  router.get(
    "/",
    validate({ params: workspaceIdSchema, query: transactionListQuerySchema }),
    controller.listTransactions,
  );
  router.post(
    "/",
    validate({ params: workspaceIdSchema, body: createTransactionBodySchema }),
    controller.createTransaction,
  );

  return router;
}
