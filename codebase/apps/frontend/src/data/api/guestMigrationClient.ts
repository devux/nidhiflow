import { environment } from "../../config/environment";
import { trackApiRequest } from "../../app/providers/apiLoadingState";
import type { GuestMigrationPayload } from "../migrations/createGuestMigrationPayload";

interface ApiEnvelope<Data> {
  data: Data;
  message: string;
  success: boolean;
}

export interface GuestMigrationResult {
  clientMigrationId: string;
  summary: {
    importedTransactions: number;
    totalTransactions: number;
  };
  workspaceId: string;
}

async function parseResponse<Data>(response: Response): Promise<ApiEnvelope<Data>> {
  const body = (await response.json()) as ApiEnvelope<Data>;

  if (!response.ok) {
    throw new Error(body.message || "Request failed.");
  }

  return body;
}

export async function commitGuestMigration(input: {
  accessToken: string;
  idempotencyKey: string;
  payload: GuestMigrationPayload;
}): Promise<GuestMigrationResult> {
  return trackApiRequest(async () => {
    const response = await fetch(
      `${environment.NIDHIFLOW_API_BASE_URL}/api/v1/users/me/guest-migrations`,
      {
        body: JSON.stringify({
          ...input.payload,
          confirm: true,
        }),
        credentials: "include",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        method: "POST",
      },
    );
    const result = await parseResponse<GuestMigrationResult>(response);
    return result.data;
  });
}
