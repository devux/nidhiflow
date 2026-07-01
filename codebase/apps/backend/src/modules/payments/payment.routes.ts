import { Router } from "express";
import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";
import {
  createPaymentBodySchema,
  paymentIdParamsSchema,
  paymentUserParamsSchema,
  updatePaymentStatusBodySchema,
} from "./payment.schemas.js";

export function createPaymentsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new PaymentController(new PaymentService(database));
  router.use(requireAuth({ database, environment }));
  router.post("/create", validate({ body: createPaymentBodySchema }), controller.create);
  router.post(
    "/update-status",
    validate({ body: updatePaymentStatusBodySchema }),
    controller.updateStatus,
  );
  router.get(
    "/user/:userId",
    validate({ params: paymentUserParamsSchema }),
    controller.listForUser,
  );
  router.get("/:paymentId", validate({ params: paymentIdParamsSchema }), controller.get);
  return router;
}
