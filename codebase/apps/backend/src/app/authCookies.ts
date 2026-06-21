import type { Response } from "express";

const refreshCookieName = "nidhiflow_refresh";

export function getRefreshCookieOptions(appEnvironment: string) {
  return appEnvironment === "production"
    ? { sameSite: "None" as const, secure: true }
    : { sameSite: "Strict" as const, secure: false };
}

function buildCookie({
  maxAgeSeconds,
  sameSite,
  secure,
  value,
}: {
  maxAgeSeconds: number;
  sameSite: "None" | "Strict";
  secure: boolean;
  value: string;
}) {
  const parts = [
    `${refreshCookieName}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/api/v1/auth",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function setRefreshCookie(
  response: Response,
  options: { maxAgeSeconds: number; sameSite: "None" | "Strict"; secure: boolean; token: string },
) {
  response.append(
    "Set-Cookie",
    buildCookie({
      maxAgeSeconds: options.maxAgeSeconds,
      sameSite: options.sameSite,
      secure: options.secure,
      value: options.token,
    }),
  );
}

export function clearRefreshCookie(
  response: Response,
  options: { sameSite: "None" | "Strict"; secure: boolean },
) {
  const parts = [
    `${refreshCookieName}=`,
    "HttpOnly",
    "Path=/api/v1/auth",
    `SameSite=${options.sameSite}`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
  ];

  if (options.secure) {
    parts.push("Secure");
  }

  response.append("Set-Cookie", parts.join("; "));
}

export function readRefreshCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());

  for (const cookie of cookies) {
    if (!cookie.startsWith(`${refreshCookieName}=`)) {
      continue;
    }

    return decodeURIComponent(cookie.slice(refreshCookieName.length + 1));
  }

  return null;
}
