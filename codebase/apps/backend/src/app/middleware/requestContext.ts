import crypto from "node:crypto";

import type { NextFunction, Request, Response } from "express";

function normalizeRequestId(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) {
    return undefined;
  }

  const trimmed = candidate.trim();

  if (trimmed.length === 0 || trimmed.length > 100) {
    return undefined;
  }

  return trimmed;
}

export function requestContext(request: Request, response: Response, next: NextFunction) {
  const requestId = normalizeRequestId(request.header("X-Request-Id")) ?? crypto.randomUUID();

  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);
  next();
}
