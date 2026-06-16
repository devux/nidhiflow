import type { Response } from "express";

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface PaginationMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

function createMeta(response: Response) {
  return {
    requestId: response.locals.requestId as string,
    timestamp: new Date().toISOString(),
  };
}

export function sendSuccess<ResponseData>(
  response: Response,
  options: {
    data: ResponseData;
    message: string;
    pagination?: PaginationMeta;
    status?: number;
  },
) {
  response.status(options.status ?? 200).json({
    success: true,
    message: options.message,
    data: options.data,
    ...(options.pagination ? { pagination: options.pagination } : {}),
    meta: createMeta(response),
  });
}

export function sendError(
  response: Response,
  options: {
    code: string;
    details?: ErrorDetail[];
    message: string;
    status: number;
  },
) {
  response.status(options.status).json({
    success: false,
    message: options.message,
    error: {
      code: options.code,
      ...(options.details ? { details: options.details } : {}),
    },
    meta: createMeta(response),
  });
}
