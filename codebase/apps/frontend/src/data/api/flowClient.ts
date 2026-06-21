import { environment } from "../../config/environment";
import { ApiRequestError, refreshAccessToken } from "./authClient";

interface ApiEnvelope<Data> {
  data: Data;
  message: string;
  success: boolean;
}

export interface FlowChatMessage {
  content: string;
  role: "assistant" | "user";
}

export interface FlowChatResponse {
  message: string;
  model: string;
  toolResults: Array<{
    name: string;
    result: unknown;
  }>;
  tools: Array<{
    description: string;
    name: string;
  }>;
}

const sessionAccessTokenKey = "nidhiflow.accessToken";
const sessionAuthSnapshotKey = "nidhiflow.authSession";

async function parseResponse<Data>(response: Response): Promise<ApiEnvelope<Data>> {
  const body = (await response.json()) as ApiEnvelope<Data>;

  if (!response.ok) {
    throw new ApiRequestError(body.message || "Request failed.", response.status);
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

async function sendFlowRequest(
  workspaceId: string,
  accessToken: string,
  messages: FlowChatMessage[],
) {
  const response = await fetch(
    `${environment.NIDHIFLOW_API_BASE_URL}/api/v1/workspaces/${workspaceId}/flow/chat`,
    {
      body: JSON.stringify({ messages }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
    },
  );

  return parseResponse<FlowChatResponse>(response);
}

export async function chatWithFlow(input: {
  accessToken: string;
  messages: FlowChatMessage[];
  workspaceId: string;
}): Promise<FlowChatResponse> {
  try {
    const result = await sendFlowRequest(input.workspaceId, input.accessToken, input.messages);

    return result.data;
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken();
    storeRefreshedAccessToken(refreshedAccessToken);
    const result = await sendFlowRequest(input.workspaceId, refreshedAccessToken, input.messages);

    return result.data;
  }
}
