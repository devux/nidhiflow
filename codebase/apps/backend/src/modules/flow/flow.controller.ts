import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { FlowChatBody } from "./flow.schemas.js";
import type { FlowService, FlowTrace } from "./flow.service.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

const flowStageLabels: Record<string, string> = {
  "ollama.request": "Ollama API input",
  "ollama.response": "Ollama intent output and decision",
  "tool.request": "Read-only tool API call",
};

export class FlowController {
  constructor(private readonly service: FlowService) {}

  chat = async (
    request: Request<{ workspaceId: string }, never, FlowChatBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const requestId = response.locals.requestId as string;
    const workspaceId = request.params.workspaceId;
    const trace: FlowTrace = (stage, details = {}) => {
      request.log.info(
        {
          actorUserId: auth.userId,
          event: "flow.ai",
          flowStage: stage,
          requestId,
          workspaceId,
          ...details,
        },
        `Flow → ${flowStageLabels[stage] ?? stage}`,
      );
    };

    const result = await this.service.chat(auth.userId, workspaceId, request.body, trace);

    sendSuccess(response, {
      data: result,
      message: "Flow response generated successfully.",
    });
  };
}
