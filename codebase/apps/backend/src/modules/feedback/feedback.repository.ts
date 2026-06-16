import crypto from "node:crypto";

import type { Database } from "../../shared/database/database.js";

export interface FeedbackRecord {
  category: "suggestion" | "issue" | "general";
  createdAt: string;
  description: string;
  id: string;
  status: "open";
}

export class FeedbackRepository {
  constructor(private readonly database: Database) {}

  async create(input: {
    category: FeedbackRecord["category"];
    description: string;
    requestId: string;
  }) {
    const id = `fbk_${crypto.randomUUID()}`;
    const result = await this.database.query<FeedbackRecord>(
      `INSERT INTO feedback (id, category, description, status, request_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'open', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, category, description, status, created_at AS "createdAt"`,
      [id, input.category, input.description, input.requestId],
    );

    return result.rows[0] as FeedbackRecord;
  }
}
