import crypto from "node:crypto";

import { createId } from "./ids.js";

interface AccessTokenClaims {
  audience: string;
  expiresInSeconds: number;
  issuer: string;
  secret: string;
  sessionId: string;
  subject: string;
}

interface AccessTokenPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  sid: string;
  sub: string;
}

type JwtValidationResult =
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; reason: "audience" | "expired" | "format" | "issuer" | "signature" };

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

export function createAccessToken({
  audience,
  expiresInSeconds,
  issuer,
  secret,
  sessionId,
  subject,
}: AccessTokenClaims) {
  const header = { alg: "HS256", typ: "JWT" };
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    aud: audience,
    exp: issuedAt + expiresInSeconds,
    iat: issuedAt,
    iss: issuer,
    jti: createId("jti"),
    sid: sessionId,
    sub: subject,
  };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  return {
    payload,
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
  };
}

export function verifyAccessToken(
  token: string,
  options: { audience: string; issuer: string; secret: string },
): JwtValidationResult {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return { ok: false, reason: "format" };
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, options.secret);

  if (
    expectedSignature.length !== encodedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(encodedSignature))
  ) {
    return { ok: false, reason: "signature" };
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as
    | Partial<AccessTokenPayload>
    | undefined;

  if (!payload?.iss || payload.iss !== options.issuer) {
    return { ok: false, reason: "issuer" };
  }

  if (!payload.aud || payload.aud !== options.audience) {
    return { ok: false, reason: "audience" };
  }

  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }

  if (!payload.sub || !payload.sid || !payload.iat || !payload.jti) {
    return { ok: false, reason: "format" };
  }

  return {
    ok: true,
    payload: payload as AccessTokenPayload,
  };
}
