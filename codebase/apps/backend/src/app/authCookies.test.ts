import { describe, expect, it } from "vitest";
import type { Response } from "express";

import { clearRefreshCookie, setRefreshCookie } from "./authCookies.js";

function createResponse() {
  const cookies: string[] = [];

  return {
    cookies,
    response: {
      append: (_name: string, value: string) => {
        cookies.push(value);
      },
    } as Response,
  };
}

describe("auth refresh cookies", () => {
  it("sets cross-site production attributes for Vercel to Render refresh calls", () => {
    const { cookies, response } = createResponse();

    setRefreshCookie(response, {
      maxAgeSeconds: 2_592_000,
      sameSite: "None",
      secure: true,
      token: "ses_123.secret",
    });

    expect(cookies[0]).toContain("HttpOnly");
    expect(cookies[0]).toContain("SameSite=None");
    expect(cookies[0]).toContain("Secure");
    expect(cookies[0]).toContain("Path=/api/v1/auth");
  });

  it("clears production cookies with matching cross-site attributes", () => {
    const { cookies, response } = createResponse();

    clearRefreshCookie(response, { sameSite: "None", secure: true });

    expect(cookies[0]).toContain("SameSite=None");
    expect(cookies[0]).toContain("Secure");
    expect(cookies[0]).toContain("Max-Age=0");
  });
});
