import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import {
  categoryIdSchema,
  createCategoryBodySchema,
  updateCategoryBodySchema,
  workspaceIdSchema,
} from "../accounts/account.schemas.js";
import { WorkspaceCategoryController } from "./workspace-category.controller.js";
import { WorkspaceCategoryService } from "./workspace-category.service.js";

const categoryParamsSchema = workspaceIdSchema.merge(categoryIdSchema);

export function createWorkspaceCategoriesRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new WorkspaceCategoryController(new WorkspaceCategoryService(database));

  router.use(requireAuth({ database, environment }));
  router.get("/", validate({ params: workspaceIdSchema }), controller.listCategories);
  router.post(
    "/",
    validate({ params: workspaceIdSchema, body: createCategoryBodySchema }),
    controller.createCategory,
  );
  router.get("/:categoryId", validate({ params: categoryParamsSchema }), controller.getCategory);
  router.patch(
    "/:categoryId",
    validate({ params: categoryParamsSchema, body: updateCategoryBodySchema }),
    controller.updateCategory,
  );
  router.delete(
    "/:categoryId",
    validate({ params: categoryParamsSchema }),
    controller.archiveCategory,
  );
  router.post(
    "/:categoryId/archive",
    validate({ params: categoryParamsSchema }),
    controller.archiveCategory,
  );
  router.post(
    "/:categoryId/restore",
    validate({ params: categoryParamsSchema }),
    controller.restoreCategory,
  );

  return router;
}
