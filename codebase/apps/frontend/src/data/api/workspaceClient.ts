import { trackApiRequest } from "../../app/providers/apiLoadingState";
import { environment } from "../../config/environment";
import type { WorkspaceSummary } from "./authClient";
import { ApiRequestError } from "./authClient";

interface ApiEnvelope<Data> {
  data: Data;
  message: string;
  success: boolean;
}

export interface WorkspaceShareCode {
  code: string;
  expiresAt: string;
  id: string;
  workspaceId: string;
}

async function parseResponse<Data>(response: Response): Promise<ApiEnvelope<Data>> {
  const body = (await response.json()) as ApiEnvelope<Data>;

  if (!response.ok) {
    throw new ApiRequestError(body.message || "Request failed.", response.status);
  }

  return body;
}

async function workspaceRequest<Data>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<Data> {
  return trackApiRequest(async () => {
    const response = await fetch(`${environment.NIDHIFLOW_API_BASE_URL}/api/v1${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
    const envelope = await parseResponse<Data>(response);

    return envelope.data;
  });
}

export async function createFamilyWorkspace(
  accessToken: string,
  input: {
    name: string;
    reportingCurrency: string;
    timezone: string;
  },
): Promise<WorkspaceSummary> {
  return workspaceRequest<WorkspaceSummary>(accessToken, "/workspaces", {
    body: JSON.stringify({
      ...input,
      type: "family",
    }),
    method: "POST",
  });
}

export async function createWorkspaceShareCode(
  accessToken: string,
  workspaceId: string,
): Promise<WorkspaceShareCode> {
  return workspaceRequest<WorkspaceShareCode>(
    accessToken,
    `/workspaces/${workspaceId}/share-codes`,
    {
      method: "POST",
    },
  );
}

export async function joinWorkspaceByShareCode(
  accessToken: string,
  code: string,
): Promise<WorkspaceSummary> {
  return workspaceRequest<WorkspaceSummary>(
    accessToken,
    `/workspace-invitations/share-codes/${encodeURIComponent(code)}/join`,
    {
      method: "POST",
    },
  );
}
