import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { WorkspaceCategoryService } from "./workspace-category.service.js";
import type { CreateCategoryBody, UpdateCategoryBody } from "../accounts/account.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class WorkspaceCategoryController {
  constructor(private readonly service: WorkspaceCategoryService) {}

  listCategories = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const categories = await this.service.listCategories(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: categories,
      message: "Categories retrieved successfully.",
    });
  };

  getCategory = async (
    request: Request<{ categoryId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const category = await this.service.getCategory(
      auth.userId,
      request.params.workspaceId,
      request.params.categoryId,
    );

    sendSuccess(response, {
      data: category,
      message: "Category retrieved successfully.",
    });
  };

  createCategory = async (
    request: Request<{ workspaceId: string }, never, CreateCategoryBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const category = await this.service.createCategory(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: category,
      message: "Category created successfully.",
      status: 201,
    });
  };

  updateCategory = async (
    request: Request<{ categoryId: string; workspaceId: string }, never, UpdateCategoryBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const category = await this.service.updateCategory(
      auth.userId,
      request.params.workspaceId,
      request.params.categoryId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: category,
      message: "Category updated successfully.",
    });
  };

  archiveCategory = async (
    request: Request<{ categoryId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const category = await this.service.archiveCategory(
      auth.userId,
      request.params.workspaceId,
      request.params.categoryId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: category,
      message: "Category archived successfully.",
    });
  };

  restoreCategory = async (
    request: Request<{ categoryId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const category = await this.service.restoreCategory(
      auth.userId,
      request.params.workspaceId,
      request.params.categoryId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: category,
      message: "Category restored successfully.",
    });
  };
}
