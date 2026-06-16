import type { ErrorDetail } from "../../app/http.js";

export class AppError extends Error {
  readonly code: string;
  readonly details: ErrorDetail[] | undefined;
  readonly status: number;

  constructor(options: { code: string; details?: ErrorDetail[]; message: string; status: number }) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.details = options.details;
    this.status = options.status;
  }
}
