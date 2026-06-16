import { Router } from "express";

import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { CategoryController } from "./category.controller.js";
import { CategoryRepository } from "./category.repository.js";
import { systemCategoryQuerySchema } from "./category.schemas.js";
import { CategoryService } from "./category.service.js";

export function createCategoriesRouter({ database }: { database: Database }) {
  const router = Router();
  const controller = new CategoryController(new CategoryService(new CategoryRepository(database)));

  router.get("/", validate({ query: systemCategoryQuerySchema }), controller.listSystemCategories);

  return router;
}
