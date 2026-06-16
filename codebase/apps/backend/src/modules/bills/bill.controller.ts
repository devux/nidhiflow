import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { BillService } from "./bill.service.js";
import type { CreateBillBody, UpdateBillBody } from "./bill.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class BillController {
  constructor(private readonly service: BillService) {}

  listBills = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const bills = await this.service.listBills(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: bills,
      message: "Bills retrieved successfully.",
    });
  };

  getBill = async (
    request: Request<{ billId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const bill = await this.service.getBill(
      auth.userId,
      request.params.workspaceId,
      request.params.billId,
    );

    sendSuccess(response, {
      data: bill,
      message: "Bill retrieved successfully.",
    });
  };

  createBill = async (
    request: Request<{ workspaceId: string }, never, CreateBillBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const bill = await this.service.createBill(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: bill,
      message: "Bill created successfully.",
      status: 201,
    });
  };

  updateBill = async (
    request: Request<{ billId: string; workspaceId: string }, never, UpdateBillBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const bill = await this.service.updateBill(
      auth.userId,
      request.params.workspaceId,
      request.params.billId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: bill,
      message: "Bill updated successfully.",
    });
  };

  archiveBill = async (
    request: Request<{ billId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const bill = await this.service.archiveBill(
      auth.userId,
      request.params.workspaceId,
      request.params.billId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: bill,
      message: "Bill archived successfully.",
    });
  };

  markPaid = async (
    request: Request<{ billId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const result = await this.service.markPaid(
      auth.userId,
      request.params.workspaceId,
      request.params.billId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: result,
      message: result.created ? "Bill marked paid successfully." : "Bill payment already recorded.",
    });
  };
}
