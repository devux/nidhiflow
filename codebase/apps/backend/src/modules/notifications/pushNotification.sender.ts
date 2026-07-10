import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

import type { Environment } from "../../app/config/environment.js";
import type { PushTokenRecord } from "./notification.repository.js";

export interface PushMessage {
  body: string;
  data?: Record<string, string>;
  title: string;
}

export interface PushSendResult {
  failed: Array<{ errorCode: string; tokenHash: string }>;
  sent: number;
}

function isInvalidTokenError(code: string) {
  return (
    code === "messaging/invalid-registration-token" ||
    code === "messaging/registration-token-not-registered"
  );
}

export class PushNotificationSender {
  private readonly messaging: Messaging | null;

  constructor(environment: Environment) {
    if (
      !environment.FIREBASE_PROJECT_ID ||
      !environment.FIREBASE_CLIENT_EMAIL ||
      !environment.FIREBASE_PRIVATE_KEY
    ) {
      this.messaging = null;
      return;
    }

    const privateKey = environment.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    const firebaseApp: App =
      getApps().find((app) => app.name === "nidhiflow-push") ??
      initializeApp(
        {
          credential: cert({
            clientEmail: environment.FIREBASE_CLIENT_EMAIL,
            privateKey,
            projectId: environment.FIREBASE_PROJECT_ID,
          }),
          projectId: environment.FIREBASE_PROJECT_ID,
        },
        "nidhiflow-push",
      );

    this.messaging = getMessaging(firebaseApp);
  }

  get isConfigured() {
    return Boolean(this.messaging);
  }

  async sendToTokens(tokens: PushTokenRecord[], message: PushMessage): Promise<PushSendResult> {
    if (!this.messaging || tokens.length === 0) {
      return { failed: [], sent: 0 };
    }

    const response = await this.messaging.sendEachForMulticast({
      android: {
        notification: {
          channelId: "workspace_activity",
          color: "#1565C0",
          icon: "ic_stat_nidhiflow",
        },
        priority: "high",
      },
      data: message.data ?? {},
      notification: {
        body: message.body,
        title: message.title,
      },
      tokens: tokens.map((token) => token.token),
    });

    return {
      failed: response.responses
        .map((result, index) => ({
          errorCode: result.error?.code ?? "",
          tokenHash: tokens[index]?.tokenHash ?? "",
        }))
        .filter((failure) => failure.errorCode.length > 0 && failure.tokenHash.length > 0),
      sent: response.successCount,
    };
  }
}

export { isInvalidTokenError };
