import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

import { AppError } from "../../shared/errors/appError.js";

interface ValidationSchemas {
  body?: ZodTypeAny;
  headers?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

function mapIssues(error: { issues: Array<{ message: string; path: (string | number)[] }> }) {
  return error.issues.map((issue) => {
    const field = issue.path.join(".");

    return field ? { field, message: issue.message } : { message: issue.message };
  });
}

export function validate(schemas: ValidationSchemas) {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        Object.assign(request.params, schemas.params.parse(request.params));
      }

      if (schemas.headers) {
        Object.assign(request.headers, schemas.headers.parse(request.headers));
      }

      if (schemas.query) {
        Object.assign(request.query, schemas.query.parse(request.query));
      }

      if (schemas.body) {
        const parsedBody: unknown = schemas.body.parse(request.body);

        request.body = parsedBody;
      }

      next();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "issues" in error &&
        Array.isArray((error as { issues?: unknown }).issues)
      ) {
        next(
          new AppError({
            code: "VALIDATION_ERROR",
            details: mapIssues(
              error as { issues: Array<{ message: string; path: (string | number)[] }> },
            ),
            message: "The request could not be processed.",
            status: 422,
          }),
        );
        return;
      }

      next(error);
    }
  };
}
