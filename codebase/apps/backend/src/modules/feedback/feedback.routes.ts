import { Router } from "express";

import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { FeedbackController } from "./feedback.controller.js";
import { FeedbackRepository } from "./feedback.repository.js";
import { feedbackBodySchema } from "./feedback.schemas.js";
import { FeedbackService } from "./feedback.service.js";

export function createFeedbackRouter({ database }: { database: Database }) {
  const router = Router();
  const controller = new FeedbackController(new FeedbackService(new FeedbackRepository(database)));

  router.post("/", validate({ body: feedbackBodySchema }), controller.createFeedback);

  return router;
}
