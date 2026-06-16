import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { BillController } from "./bill.controller.js";
import { BillService } from "./bill.service.js";
import {
  billIdSchema,
  createBillBodySchema,
  updateBillBodySchema,
  workspaceIdSchema,
} from "./bill.schemas.js";

const billParamsSchema = workspaceIdSchema.merge(billIdSchema);

export function createBillsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new BillController(new BillService(database));

  router.use(requireAuth({ database, environment }));
  router.get("/", validate({ params: workspaceIdSchema }), controller.listBills);
  router.post(
    "/",
    validate({ params: workspaceIdSchema, body: createBillBodySchema }),
    controller.createBill,
  );
  router.get("/:billId", validate({ params: billParamsSchema }), controller.getBill);
  router.patch(
    "/:billId",
    validate({ params: billParamsSchema, body: updateBillBodySchema }),
    controller.updateBill,
  );
  router.delete("/:billId", validate({ params: billParamsSchema }), controller.archiveBill);
  router.post("/:billId/mark-paid", validate({ params: billParamsSchema }), controller.markPaid);

  return router;
}
