import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { WorkspaceService } from "./workspace.service.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}

  listWorkspaces = async (_request: Request, response: Response) => {
    const auth = getAuthContext(response);
    const workspaces = await this.service.listWorkspaces(auth.userId);

    sendSuccess(response, {
      data: workspaces,
      message: "Workspaces retrieved successfully.",
    });
  };

  getWorkspace = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const workspace = await this.service.getWorkspace(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: workspace,
      message: "Workspace retrieved successfully.",
    });
  };
}
