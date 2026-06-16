import { Router } from "express";

import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Environment } from "../../app/config/environment.js";
import type { Database } from "../../shared/database/database.js";
import { AccountController } from "./account.controller.js";
import { AccountService } from "./account.service.js";
import {
  accountIdSchema,
  createAccountBodySchema,
  updateAccountBodySchema,
  workspaceIdSchema,
} from "./account.schemas.js";

const accountParamsSchema = workspaceIdSchema.merge(accountIdSchema);

export function createAccountsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new AccountController(new AccountService(database));

  router.use(requireAuth({ database, environment }));
  router.get("/", validate({ params: workspaceIdSchema }), controller.listAccounts);
  router.get("/summary", validate({ params: workspaceIdSchema }), controller.getSummary);
  router.post(
    "/",
    validate({ params: workspaceIdSchema, body: createAccountBodySchema }),
    controller.createAccount,
  );
  router.get("/:accountId", validate({ params: accountParamsSchema }), controller.getAccount);
  router.patch(
    "/:accountId",
    validate({ params: accountParamsSchema, body: updateAccountBodySchema }),
    controller.updateAccount,
  );
  router.post(
    "/:accountId/archive",
    validate({ params: accountParamsSchema }),
    controller.archiveAccount,
  );
  router.delete(
    "/:accountId",
    validate({ params: accountParamsSchema }),
    controller.archiveAccount,
  );
  router.post(
    "/:accountId/restore",
    validate({ params: accountParamsSchema }),
    controller.restoreAccount,
  );

  return router;
}
