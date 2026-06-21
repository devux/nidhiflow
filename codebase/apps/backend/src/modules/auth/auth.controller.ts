import type { Request, Response } from "express";

import {
  clearRefreshCookie,
  getRefreshCookieOptions,
  readRefreshCookie,
  setRefreshCookie,
} from "../../app/authCookies.js";
import type { Environment } from "../../app/config/environment.js";
import { sendError, sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { AuthService } from "./auth.service.js";

function getDeviceContext(request: Pick<Request, "headers" | "ip">) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const ipAddress =
    typeof forwardedFor === "string"
      ? (forwardedFor.split(",")[0]?.trim() ?? null)
      : (request.ip ?? null);

  return {
    deviceName: null,
    ipAddress,
    userAgent: request.headers["user-agent"] ?? null,
  };
}

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly environment: Environment,
  ) {}

  register = async (
    request: Request<
      never,
      never,
      {
        displayName: string;
        email: string;
        locale: string;
        password: string;
        preferredCurrency: string;
        theme: string;
        timezone: string;
      }
    >,
    response: Response,
  ) => {
    const result = await this.service.register(
      request.body,
      response.locals.requestId as string | null,
    );

    sendSuccess(response, {
      data: {
        status: "pending_verification",
        ...(result.debugToken ? { debugToken: result.debugToken } : {}),
      },
      message: result.message,
      status: 202,
    });
  };

  login = async (
    request: Request<never, never, { deviceName?: string; email: string; password: string }>,
    response: Response,
  ) => {
    const result = await this.service.login(
      {
        deviceName: request.body.deviceName ?? null,
        email: request.body.email,
        password: request.body.password,
      },
      getDeviceContext(request),
      response.locals.requestId as string | null,
    );

    setRefreshCookie(response, {
      maxAgeSeconds: result.refreshTokenTtlSeconds,
      ...getRefreshCookieOptions(this.environment.APP_ENV),
      token: result.refreshToken,
    });
    sendSuccess(response, {
      data: {
        accessToken: result.accessToken,
        user: result.user,
        workspaces: result.workspaces,
      },
      message: "Login successful.",
    });
  };

  verifyEmail = async (request: Request<never, never, { token: string }>, response: Response) => {
    const result = await this.service.verifyEmail(
      request.body.token,
      getDeviceContext(request),
      response.locals.requestId as string | null,
    );

    setRefreshCookie(response, {
      maxAgeSeconds: result.refreshTokenTtlSeconds,
      ...getRefreshCookieOptions(this.environment.APP_ENV),
      token: result.refreshToken,
    });
    sendSuccess(response, {
      data: {
        accessToken: result.accessToken,
        user: result.user,
        workspace: result.workspace,
      },
      message: "Email verified successfully.",
    });
  };

  resendVerification = async (
    request: Request<never, never, { email: string }>,
    response: Response,
  ) => {
    const result = await this.service.resendVerification(request.body.email);

    sendSuccess(response, {
      data: {
        status: "pending_verification",
        ...(result.debugToken ? { debugToken: result.debugToken } : {}),
      },
      message: result.message,
      status: 202,
    });
  };

  forgotPassword = async (
    request: Request<never, never, { email: string }>,
    response: Response,
  ) => {
    const result = await this.service.forgotPassword(request.body.email);

    sendSuccess(response, {
      data: {
        status: "password_reset_requested",
        ...(result.debugToken ? { debugToken: result.debugToken } : {}),
      },
      message: result.message,
      status: 202,
    });
  };

  resetPassword = async (
    request: Request<never, never, { password: string; token: string }>,
    response: Response,
  ) => {
    const result = await this.service.resetPassword(
      request.body.token,
      request.body.password,
      response.locals.requestId as string | null,
    );

    clearRefreshCookie(response, getRefreshCookieOptions(this.environment.APP_ENV));
    sendSuccess(response, {
      data: { status: "password_reset" },
      message: result.message,
    });
  };

  refresh = async (request: Request, response: Response) => {
    const refreshToken = readRefreshCookie(request.headers.cookie);

    if (!refreshToken) {
      clearRefreshCookie(response, getRefreshCookieOptions(this.environment.APP_ENV));
      sendError(response, {
        code: "INVALID_SESSION",
        message: "The current session is invalid or expired.",
        status: 401,
      });
      return;
    }

    const result = await this.service.refresh(
      refreshToken,
      getDeviceContext(request),
      response.locals.requestId as string | null,
    );

    setRefreshCookie(response, {
      maxAgeSeconds: result.refreshTokenTtlSeconds,
      ...getRefreshCookieOptions(this.environment.APP_ENV),
      token: result.refreshToken,
    });
    sendSuccess(response, {
      data: {
        accessToken: result.accessToken,
      },
      message: "Session refreshed successfully.",
    });
  };

  logout = async (request: Request, response: Response) => {
    const result = await this.service.logout(
      readRefreshCookie(request.headers.cookie),
      response.locals.requestId as string | null,
    );

    clearRefreshCookie(response, getRefreshCookieOptions(this.environment.APP_ENV));
    sendSuccess(response, {
      data: { status: "logged_out" },
      message: result.message,
    });
  };

  logoutAll = async (_request: Request, response: Response) => {
    const auth = getAuthContext(response);
    const result = await this.service.logoutAll(
      auth.userId,
      response.locals.requestId as string | null,
    );

    clearRefreshCookie(response, getRefreshCookieOptions(this.environment.APP_ENV));
    sendSuccess(response, {
      data: { status: "logged_out_all" },
      message: result.message,
    });
  };
}
