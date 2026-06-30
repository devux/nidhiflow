import { trackApiRequest } from "../../app/providers/apiLoadingState";
import { environment } from "../../config/environment";
import type { WorkspaceSummary } from "./authClient";
import { ApiRequestError, refreshAccessToken } from "./authClient";

const sessionAccessTokenKey = "nidhiflow.accessToken";
const sessionAuthSnapshotKey = "nidhiflow.authSession";

interface ApiEnvelope<Data> {
  data: Data;
  error?: {
    code?: string;
  };
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
    throw new ApiRequestError(body.message || "Request failed.", response.status, body.error?.code);
  }

  return body;
}

function storeRefreshedAccessToken(accessToken: string) {
  try {
    window.sessionStorage.setItem(sessionAccessTokenKey, accessToken);
    const snapshot = window.sessionStorage.getItem(sessionAuthSnapshotKey);

    if (snapshot) {
      window.sessionStorage.setItem(
        sessionAuthSnapshotKey,
        JSON.stringify({ ...JSON.parse(snapshot), accessToken }),
      );
    }
  } catch {
    // The refresh cookie still carries the server session.
  }
}

async function sendWorkspaceRequest<Data>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<Data>> {
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

    return parseResponse<Data>(response);
  });
}

async function workspaceRequest<Data>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<Data> {
  try {
    const envelope = await sendWorkspaceRequest<Data>(accessToken, path, options);

    return envelope.data;
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken();
    storeRefreshedAccessToken(refreshedAccessToken);
    const envelope = await sendWorkspaceRequest<Data>(refreshedAccessToken, path, options);

    return envelope.data;
  }
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
  options: { transferOwnership?: boolean } = {},
): Promise<WorkspaceSummary> {
  return workspaceRequest<WorkspaceSummary>(
    accessToken,
    `/workspace-invitations/share-codes/${encodeURIComponent(code)}/join`,
    {
      body: JSON.stringify({
        transferOwnership: options.transferOwnership ?? false,
      }),
      method: "POST",
    },
  );
}

export async function leaveCurrentWorkspace(
  accessToken: string,
  workspaceId: string,
  options: { transferOwnership?: boolean } = {},
): Promise<WorkspaceSummary> {
  return workspaceRequest<WorkspaceSummary>(accessToken, `/workspaces/${workspaceId}/leave`, {
    body: JSON.stringify({
      transferOwnership: options.transferOwnership ?? false,
    }),
    method: "POST",
  });
}
