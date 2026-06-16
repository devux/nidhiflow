import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { FeedbackService } from "./feedback.service.js";

export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  createFeedback = async (
    request: Request<
      never,
      never,
      { category: "suggestion" | "issue" | "general"; description: string }
    >,
    response: Response,
  ) => {
    const feedback = await this.service.createFeedback({
      ...request.body,
      requestId: response.locals.requestId as string,
    });

    sendSuccess(response, {
      data: feedback,
      message: "Feedback received successfully",
      status: 201,
    });
  };
}
