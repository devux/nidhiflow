import type { Environment } from "../../app/config/environment.js";
import { AppError } from "../../shared/errors/appError.js";

interface AuthEmailInput {
  displayName: string;
  email: string;
  token: string;
}

function buildVerificationUrl(environment: Environment, token: string) {
  const url = new URL("/signup", environment.APP_PUBLIC_URL);

  url.searchParams.set("verificationToken", token);
  return url.toString();
}

function buildResetUrl(environment: Environment, token: string) {
  const url = new URL("/login", environment.APP_PUBLIC_URL);

  url.searchParams.set("resetToken", token);
  return url.toString();
}

function buildEmailHtml(content: {
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  title: string;
}) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #071330; line-height: 1.6;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">${content.title}</h1>
      <p>${content.body}</p>
      <p>
        <a href="${content.ctaUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #078032; color: #ffffff; text-decoration: none; font-weight: 700;">
          ${content.ctaLabel}
        </a>
      </p>
      <p style="font-size: 13px; color: #4b587c;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 13px; color: #4b587c; word-break: break-all;">${content.ctaUrl}</p>
    </div>
  `;
}

async function sendWithResend(
  environment: Environment,
  email: { html: string; subject: string; text: string; to: string },
) {
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: environment.EMAIL_FROM,
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: [email.to],
    }),
    headers: {
      Authorization: `Bearer ${environment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new AppError({
      code: "EMAIL_DELIVERY_FAILED",
      message: "Email could not be sent right now. Please try again.",
      status: 502,
    });
  }
}

export class AuthEmailService {
  constructor(private readonly environment: Environment) {}

  async sendVerificationEmail(input: AuthEmailInput) {
    if (this.environment.EMAIL_DELIVERY_PROVIDER === "none") {
      return;
    }

    const verificationUrl = buildVerificationUrl(this.environment, input.token);

    await sendWithResend(this.environment, {
      html: buildEmailHtml({
        body: `Hi ${input.displayName}, use this link to verify your NidhiFlow account.`,
        ctaLabel: "Verify email",
        ctaUrl: verificationUrl,
        title: "Verify your NidhiFlow email",
      }),
      subject: "Verify your NidhiFlow email",
      text: `Hi ${input.displayName}, verify your NidhiFlow account: ${verificationUrl}`,
      to: input.email,
    });
  }

  async sendPasswordResetEmail(input: AuthEmailInput) {
    if (this.environment.EMAIL_DELIVERY_PROVIDER === "none") {
      return;
    }

    const resetUrl = buildResetUrl(this.environment, input.token);

    await sendWithResend(this.environment, {
      html: buildEmailHtml({
        body: `Hi ${input.displayName}, use this link to reset your NidhiFlow password.`,
        ctaLabel: "Reset password",
        ctaUrl: resetUrl,
        title: "Reset your NidhiFlow password",
      }),
      subject: "Reset your NidhiFlow password",
      text: `Hi ${input.displayName}, reset your NidhiFlow password: ${resetUrl}`,
      to: input.email,
    });
  }
}
