import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { FlowChatBody } from "./flow.schemas.js";
import type { FlowService } from "./flow.service.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class FlowController {
  constructor(private readonly service: FlowService) {}

  chat = async (
    request: Request<{ workspaceId: string }, never, FlowChatBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const result = await this.service.chat(auth.userId, request.params.workspaceId, request.body);

    sendSuccess(response, {
      data: result,
      message: "Flow response generated successfully.",
    });
  };
}
