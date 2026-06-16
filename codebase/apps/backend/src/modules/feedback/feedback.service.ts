import type { FeedbackRepository } from "./feedback.repository.js";

export class FeedbackService {
  constructor(private readonly repository: FeedbackRepository) {}

  async createFeedback(input: {
    category: "suggestion" | "issue" | "general";
    description: string;
    requestId: string;
  }) {
    return this.repository.create(input);
  }
}
