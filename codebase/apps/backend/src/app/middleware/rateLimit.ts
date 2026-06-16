import type { NextFunction, Request, Response } from "express";

import { sendError } from "../http.js";

interface Bucket {
  count: number;
  resetsAt: number;
}

interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

function getClientIdentifier(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

export function createRateLimit(options: RateLimitOptions) {
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${getClientIdentifier(request)}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetsAt <= now) {
      buckets.set(key, {
        count: 1,
        resetsAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (existing.count >= options.limit) {
      response.setHeader("Retry-After", Math.ceil((existing.resetsAt - now) / 1000));
      sendError(response, {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
        status: 429,
      });
      return;
    }

    existing.count += 1;
    next();
  };
}

export function resetRateLimitStore() {
  buckets.clear();
}
