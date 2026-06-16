import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { CategoryService } from "./category.service.js";

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  listSystemCategories = async (
    request: Request<never, never, never, { transactionType?: "income" | "expense" }>,
    response: Response,
  ) => {
    const categories = await this.service.listSystemCategories(request.query.transactionType);

    sendSuccess(response, {
      data: categories,
      message: "System categories retrieved successfully",
    });
  };
}
