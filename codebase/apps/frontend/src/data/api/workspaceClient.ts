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
  config: { trackLoading?: boolean } = {},
): Promise<ApiEnvelope<Data>> {
  const request = async () => {
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
  };

  return config.trackLoading === false ? request() : trackApiRequest(request);
}

async function workspaceRequest<Data>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
  config: { trackLoading?: boolean } = {},
): Promise<Data> {
  try {
    const envelope = await sendWorkspaceRequest<Data>(accessToken, path, options, config);

    return envelope.data;
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken({
      trackLoading: config.trackLoading,
    });
    storeRefreshedAccessToken(refreshedAccessToken);
    const envelope = await sendWorkspaceRequest<Data>(refreshedAccessToken, path, options, config);

    return envelope.data;
  }
}

export async function createWorkspaceShareCode(
  accessToken: string,
  workspaceId: string,
  options: { trackLoading?: boolean } = {},
): Promise<WorkspaceShareCode> {
  return workspaceRequest<WorkspaceShareCode>(
    accessToken,
    `/workspaces/${workspaceId}/share-codes`,
    {
      method: "POST",
    },
    { trackLoading: options.trackLoading },
  );
}

export async function joinWorkspaceByShareCode(
  accessToken: string,
  code: string,
  options: { trackLoading?: boolean; transferOwnership?: boolean } = {},
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
    { trackLoading: options.trackLoading },
  );
}

export async function leaveCurrentWorkspace(
  accessToken: string,
  workspaceId: string,
  options: { trackLoading?: boolean; transferOwnership?: boolean } = {},
): Promise<WorkspaceSummary> {
  return workspaceRequest<WorkspaceSummary>(
    accessToken,
    `/workspaces/${workspaceId}/leave`,
    {
      body: JSON.stringify({
        transferOwnership: options.transferOwnership ?? false,
      }),
      method: "POST",
    },
    { trackLoading: options.trackLoading },
  );
}
