import type { Database } from "../../shared/database/database.js";

export interface SystemCategoryRecord {
  colorToken: string | null;
  iconKey: string | null;
  id: string;
  name: string;
  transactionType: "income" | "expense";
}

export class CategoryRepository {
  constructor(private readonly database: Database) {}

  async listSystemCategories(transactionType?: "income" | "expense") {
    const parameters = transactionType ? [transactionType] : [];
    const typeClause = transactionType ? "AND transaction_type = $1" : "";

    const result = await this.database.query<SystemCategoryRecord>(
      `SELECT id, name, transaction_type AS "transactionType", icon_key AS "iconKey", color_token AS "colorToken"
       FROM categories
       WHERE workspace_id IS NULL
         AND is_system = TRUE
         AND is_archived = FALSE
         ${typeClause}
       ORDER BY transaction_type, name`,
      parameters,
    );

    return result.rows;
  }
}
