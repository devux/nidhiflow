import { AppError } from "../../shared/errors/appError.js";
import type { Database } from "../../shared/database/database.js";
import { WorkspaceRepository } from "./workspace.repository.js";

export class WorkspaceService {
  private readonly repository: WorkspaceRepository;

  constructor(database: Database) {
    this.repository = new WorkspaceRepository(database);
  }

  async listWorkspaces(userId: string) {
    return this.repository.listMemberships(userId);
  }

  async getWorkspace(userId: string, workspaceId: string) {
    const workspace = await this.repository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return workspace;
  }
}
