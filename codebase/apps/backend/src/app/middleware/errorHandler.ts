import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../shared/errors/appError.js";
import { sendError } from "../http.js";

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
) {
  void next;

  if (error instanceof SyntaxError && "body" in error) {
    sendError(response, {
      code: "BAD_REQUEST",
      message: "The request body could not be parsed.",
      status: 400,
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.status >= 500) {
      request.log.error({ err: error, code: error.code }, "Request failed");
    } else {
      request.log.warn({ code: error.code, details: error.details }, "Request rejected");
    }

    sendError(response, {
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
      message: error.message,
      status: error.status,
    });
    return;
  }

  request.log.error({ err: error }, "Unexpected request failure");
  sendError(response, {
    code: "INTERNAL_SERVER_ERROR",
    message: "The request could not be processed",
    status: 500,
  });
}
