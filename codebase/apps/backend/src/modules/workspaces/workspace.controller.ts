import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { WorkspaceService } from "./workspace.service.js";
import type {
  CreateWorkspaceBody,
  CreateWorkspaceInvitationBody,
  UpdateWorkspaceBody,
} from "./workspace.schemas.js";

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

  createWorkspace = async (
    request: Request<never, never, CreateWorkspaceBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const workspace = await this.service.createWorkspace(
      auth.userId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: workspace,
      message: "Workspace created successfully.",
      status: 201,
    });
  };

  updateWorkspace = async (
    request: Request<{ workspaceId: string }, never, UpdateWorkspaceBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const workspace = await this.service.updateWorkspace(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: workspace,
      message: "Workspace updated successfully.",
    });
  };

  archiveWorkspace = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const result = await this.service.archiveWorkspace(
      auth.userId,
      request.params.workspaceId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: result,
      message: "Workspace archived successfully.",
    });
  };

  listMembers = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const members = await this.service.listMembers(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: members,
      message: "Workspace members retrieved successfully.",
    });
  };

  createInvitation = async (
    request: Request<{ workspaceId: string }, never, CreateWorkspaceInvitationBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const invitation = await this.service.createInvitation(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: invitation,
      message: "Workspace invitation created successfully.",
      status: 201,
    });
  };

  acceptInvitation = async (request: Request<{ token: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const workspace = await this.service.acceptInvitation(
      auth.userId,
      request.params.token,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: workspace,
      message: "Workspace invitation accepted successfully.",
    });
  };

  removeMember = async (
    request: Request<{ userId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const result = await this.service.removeMember(
      auth.userId,
      request.params.workspaceId,
      request.params.userId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: result,
      message: "Workspace member removed successfully.",
    });
  };

  leaveWorkspace = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const result = await this.service.leaveWorkspace(
      auth.userId,
      request.params.workspaceId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: result,
      message: "Workspace left successfully.",
    });
  };
}
