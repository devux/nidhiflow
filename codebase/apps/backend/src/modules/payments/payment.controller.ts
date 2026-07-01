import type { Request, Response } from "express";
import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { PaymentService } from "./payment.service.js";
import type { CreatePaymentBody, UpdatePaymentStatusBody } from "./payment.schemas.js";

const auth = (response: Response) => response.locals.auth as AuthContext;

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  create = async (request: Request<never, never, CreatePaymentBody>, response: Response) => {
    const payment = await this.service.create(
      auth(response).userId,
      request.body,
      response.locals.requestId as string,
    );
    sendSuccess(response, {
      data: payment,
      message: "Payment intent created successfully.",
      status: 201,
    });
  };

  updateStatus = async (
    request: Request<never, never, UpdatePaymentStatusBody>,
    response: Response,
  ) => {
    const payment = await this.service.updateStatus(
      auth(response).userId,
      request.body,
      response.locals.requestId as string,
    );
    sendSuccess(response, { data: payment, message: "UPI app status recorded as unverified." });
  };

  get = async (request: Request<{ paymentId: string }>, response: Response) => {
    const payment = await this.service.get(auth(response).userId, request.params.paymentId);
    sendSuccess(response, { data: payment, message: "Payment retrieved successfully." });
  };

  listForUser = async (request: Request<{ userId: string }>, response: Response) => {
    const payments = await this.service.list(auth(response).userId, request.params.userId);
    sendSuccess(response, { data: payments, message: "Payments retrieved successfully." });
  };
}
