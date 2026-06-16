import { Router } from "express";

import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { GuestMigrationController } from "./guestMigration.controller.js";
import {
  guestMigrationCommitBodySchema,
  guestMigrationPreviewBodySchema,
  idempotencyHeadersSchema,
} from "./guestMigration.schemas.js";
import { GuestMigrationService } from "./guestMigration.service.js";

export function createGuestMigrationsRouter({ database }: { database: Database }) {
  const router = Router();
  const controller = new GuestMigrationController(new GuestMigrationService(database));

  router.post("/preview", validate({ body: guestMigrationPreviewBodySchema }), controller.preview);
  router.post(
    "/",
    validate({
      body: guestMigrationCommitBodySchema,
      headers: idempotencyHeadersSchema,
    }),
    controller.commit,
  );

  return router;
}
