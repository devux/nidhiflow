import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type {
  GuestMigrationCommitInput,
  GuestMigrationPreviewInput,
} from "./guestMigration.schemas.js";
import type { GuestMigrationService } from "./guestMigration.service.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class GuestMigrationController {
  constructor(private readonly service: GuestMigrationService) {}

  preview = async (
    request: Request<never, never, GuestMigrationPreviewInput>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const preview = await this.service.preview(auth.userId, request.body);

    sendSuccess(response, {
      data: preview,
      message: "Guest migration preview generated successfully.",
    });
  };

  commit = async (
    request: Request<never, never, GuestMigrationCommitInput>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const migration = await this.service.commit(
      auth.userId,
      request.body,
      request.headers["idempotency-key"] as string,
      response.locals.requestId as string | null,
    );

    sendSuccess(response, {
      data: migration,
      message: "Guest data migrated successfully.",
      status: 201,
    });
  };
}
