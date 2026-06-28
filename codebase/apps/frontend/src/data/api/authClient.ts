import { environment } from "../../config/environment";
import { trackApiRequest } from "../../app/providers/apiLoadingState";
import type { SupportedCurrency } from "../../domain/preferences/guestPreferences";

export interface AuthUser {
  displayName: string;
  email: string;
  id: string;
  locale: string;
  preferredCurrency: string;
  theme: string;
  timezone: string;
}

export interface WorkspaceSummary {
  id: string;
  membershipRole?: "manager" | "member";
  name: string;
  ownerDisplayName?: string;
  reportingCurrency?: SupportedCurrency;
  type: string;
}

interface ApiEnvelope<Data> {
  data: Data;
  message: string;
  success: boolean;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  workspaces: WorkspaceSummary[];
}

let refreshAccessTokenRequest: Promise<string> | null = null;

async function parseResponse<Data>(response: Response): Promise<ApiEnvelope<Data>> {
  const body = (await response.json()) as ApiEnvelope<Data>;

  if (!response.ok) {
    throw new ApiRequestError(body.message || "Request failed.", response.status);
  }

  return body;
}

async function apiRequest<Data>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<Data>> {
  return trackApiRequest(async () => {
    const response = await fetch(`${environment.NIDHIFLOW_API_BASE_URL}/api/v1${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    return parseResponse<Data>(response);
  });
}

export async function registerAccount(input: {
  displayName: string;
  email: string;
  locale: string;
  password: string;
  preferredCurrency: string;
  theme: string;
  timezone: string;
}): Promise<AuthSession> {
  const result = await apiRequest<AuthSession>("/auth/register", {
    body: JSON.stringify(input),
    method: "POST",
  });

  return result.data;
}

export async function verifyEmail(token: string): Promise<AuthSession> {
  const result = await apiRequest<{
    accessToken: string;
    user: AuthUser;
    workspace: WorkspaceSummary;
  }>("/auth/verify-email", {
    body: JSON.stringify({ token }),
    method: "POST",
  });

  return {
    accessToken: result.data.accessToken,
    user: result.data.user,
    workspaces: [result.data.workspace],
  };
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const result = await apiRequest<AuthSession>("/auth/login", {
    body: JSON.stringify(input),
    method: "POST",
  });

  return result.data;
}

export async function refreshAccessToken(): Promise<string> {
  refreshAccessTokenRequest ??= apiRequest<{ accessToken: string }>("/auth/refresh", {
    method: "POST",
  })
    .then((result) => result.data.accessToken)
    .finally(() => {
      refreshAccessTokenRequest = null;
    });

  return refreshAccessTokenRequest;
}

export async function getWorkspaces(accessToken: string): Promise<WorkspaceSummary[]> {
  const result = await apiRequest<WorkspaceSummary[]>("/workspaces", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  return result.data;
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const result = await apiRequest<AuthUser>("/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  return result.data;
}

export async function updateCurrentUser(
  accessToken: string,
  input: Partial<
    Pick<AuthUser, "displayName" | "locale" | "preferredCurrency" | "theme" | "timezone">
  >,
): Promise<AuthUser> {
  const result = await apiRequest<AuthUser>("/users/me", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "PATCH",
  });

  return result.data;
}

export async function logout(): Promise<void> {
  await apiRequest<{ status: string }>("/auth/logout", {
    method: "POST",
  });
}
