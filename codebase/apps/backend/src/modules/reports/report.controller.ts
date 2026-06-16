import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { ReportService } from "./report.service.js";
import type { CreateReportExportBody, ReportFilters } from "./report.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class ReportController {
  constructor(private readonly service: ReportService) {}

  getSummary = async (
    request: Request<{ workspaceId: string }, never, never, ReportFilters>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const report = await this.service.getSummary(
      auth.userId,
      request.params.workspaceId,
      request.query,
    );

    sendSuccess(response, {
      data: report,
      message: "Report summary retrieved successfully.",
    });
  };

  getCategories = async (
    request: Request<{ workspaceId: string }, never, never, ReportFilters>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const report = await this.service.getCategories(
      auth.userId,
      request.params.workspaceId,
      request.query,
    );

    sendSuccess(response, {
      data: report,
      message: "Report categories retrieved successfully.",
    });
  };

  getCashFlow = async (
    request: Request<{ workspaceId: string }, never, never, ReportFilters>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const report = await this.service.getCashFlow(
      auth.userId,
      request.params.workspaceId,
      request.query,
    );

    sendSuccess(response, {
      data: report,
      message: "Report cash flow retrieved successfully.",
    });
  };

  createExport = async (
    request: Request<{ workspaceId: string }, never, CreateReportExportBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const report = await this.service.createExport(
      auth.userId,
      request.params.workspaceId,
      request.body,
    );

    sendSuccess(response, {
      data: report,
      message: "Report export created successfully.",
      status: 201,
    });
  };

  getExport = async (
    request: Request<{ exportId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const report = await this.service.getExport(
      auth.userId,
      request.params.workspaceId,
      request.params.exportId,
    );

    sendSuccess(response, {
      data: report,
      message: "Report export retrieved successfully.",
    });
  };

  downloadExport = async (
    request: Request<{ exportId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const report = await this.service.downloadExport(
      auth.userId,
      request.params.workspaceId,
      request.params.exportId,
    );

    response
      .status(200)
      .type(report.mimeType)
      .setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`)
      .send(report.csv);
  };
}
