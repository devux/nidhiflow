import { Capacitor } from "@capacitor/core";

import { registerPushToken, unregisterPushToken } from "../../../data/api/financeClient";

const storedPushTokenIdKey = "nidhiflow.pushTokenId";

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function requestPushPermission() {
  if (!isNativeAndroid()) {
    return "unsupported" as const;
  }

  const { PushNotifications } = await import("@capacitor/push-notifications");
  const current = await PushNotifications.checkPermissions();
  if (current.receive === "granted") return "granted" as const;

  const requested = await PushNotifications.requestPermissions();
  return requested.receive === "granted" ? ("granted" as const) : ("denied" as const);
}

export async function registerNativeAndroidPushToken(accessToken: string) {
  if (!isNativeAndroid()) {
    return { status: "unsupported" as const };
  }

  const permission = await requestPushPermission();
  if (permission !== "granted") {
    return { status: permission };
  }

  const { PushNotifications } = await import("@capacitor/push-notifications");

  return new Promise<{ status: "registered"; tokenId: string } | { status: "error" }>((resolve) => {
    let settled = false;

    const settle = (result: { status: "registered"; tokenId: string } | { status: "error" }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    void PushNotifications.removeAllListeners().then(() => {
      void PushNotifications.addListener("registration", (token) => {
        void registerPushToken({
          accessToken,
          deviceName: "Android device",
          os: "Android",
          platform: "android",
          token: token.value,
        })
          .then((registered) => {
            window.localStorage.setItem(storedPushTokenIdKey, registered.id);
            settle({ status: "registered", tokenId: registered.id });
          })
          .catch(() => settle({ status: "error" }));
      });

      void PushNotifications.addListener("registrationError", () => {
        settle({ status: "error" });
      });

      void PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        const data: unknown = event.notification.data;
        const path =
          data && typeof data === "object" && "path" in data
            ? (data as { path?: unknown }).path
            : undefined;
        if (typeof path === "string") {
          window.dispatchEvent(new CustomEvent("nidhiflow:push-open", { detail: { path } }));
        }
      });

      void PushNotifications.register();
    });
  });
}

export async function unregisterStoredNativePushToken(accessToken: string) {
  const tokenId = window.localStorage.getItem(storedPushTokenIdKey);
  if (!tokenId) return;

  await unregisterPushToken({ accessToken, tokenId });
  window.localStorage.removeItem(storedPushTokenIdKey);
}
