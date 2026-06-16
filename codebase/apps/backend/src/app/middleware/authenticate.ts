import type { NextFunction, Request, Response } from "express";

import type { Environment } from "../config/environment.js";
import { AppError } from "../../shared/errors/appError.js";
import type { Database } from "../../shared/database/database.js";
import { verifyAccessToken } from "../../shared/security/jwt.js";
import { AuthRepository } from "../../modules/auth/auth.repository.js";

export interface AuthContext {
  sessionId: string;
  userId: string;
}

function getBearerToken(request: Pick<Request, "headers">) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function requireAuth({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const repository = new AuthRepository(database);

  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const token = getBearerToken(request);

      if (!token) {
        throw new AppError({
          code: "UNAUTHENTICATED",
          message: "Authentication is required for this resource.",
          status: 401,
        });
      }

      const verified = verifyAccessToken(token, {
        audience: environment.JWT_ACCESS_AUDIENCE,
        issuer: environment.JWT_ACCESS_ISSUER,
        secret: environment.JWT_ACCESS_SECRET,
      });

      if (!verified.ok) {
        throw new AppError({
          code: "UNAUTHENTICATED",
          message: "Authentication is required for this resource.",
          status: 401,
        });
      }

      const session = await repository.findSessionById(verified.payload.sid);

      if (
        !session ||
        session.userId !== verified.payload.sub ||
        session.revokedAt ||
        new Date(session.expiresAt).getTime() <= Date.now()
      ) {
        throw new AppError({
          code: "UNAUTHENTICATED",
          message: "Authentication is required for this resource.",
          status: 401,
        });
      }

      response.locals.auth = {
        sessionId: session.id,
        userId: session.userId,
      } satisfies AuthContext;
      next();
    } catch (error) {
      next(error);
    }
  };
}
