import type { Request, Response } from "express";

import { clearRefreshCookie } from "../../app/authCookies.js";
import type { Environment } from "../../app/config/environment.js";
import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { UserService } from "./user.service.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class UserController {
  constructor(
    private readonly service: UserService,
    private readonly environment: Environment,
  ) {}

  getCurrentUser = async (_request: Request, response: Response) => {
    const auth = getAuthContext(response);
    const user = await this.service.getCurrentUser(auth.userId);

    sendSuccess(response, {
      data: user,
      message: "Profile retrieved successfully.",
    });
  };

  updateCurrentUser = async (
    request: Request<
      never,
      never,
      Partial<{
        displayName: string;
        locale: string;
        preferredCurrency: string;
        theme: string;
        timezone: string;
      }>
    >,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const user = await this.service.updateCurrentUser(auth.userId, request.body);

    sendSuccess(response, {
      data: user,
      message: "Profile updated successfully.",
    });
  };

  listSessions = async (_request: Request, response: Response) => {
    const auth = getAuthContext(response);
    const sessions = await this.service.listSessions(auth.userId, auth.sessionId);

    sendSuccess(response, {
      data: sessions,
      message: "Active sessions retrieved successfully.",
    });
  };

  revokeSession = async (request: Request<{ sessionId: string }>, response: Response) => {
    const auth = getAuthContext(response);

    await this.service.revokeSession(auth.userId, request.params.sessionId);

    if (request.params.sessionId === auth.sessionId) {
      clearRefreshCookie(response, this.environment.APP_ENV === "production");
    }

    sendSuccess(response, {
      data: { id: request.params.sessionId, revoked: true },
      message: "Session revoked successfully.",
    });
  };
}
