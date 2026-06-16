import type { Queryable } from "../../shared/database/database.js";

export interface WorkspaceCategoryRecord {
  colorToken: string | null;
  createdAt: string;
  iconKey: string | null;
  id: string;
  isArchived: boolean;
  isSystem: boolean;
  name: string;
  parentCategoryId: string | null;
  transactionType: "income" | "expense" | "transfer";
  updatedAt: string;
  workspaceId: string | null;
}

export class WorkspaceCategoryRepository {
  constructor(private readonly database: Queryable) {}

  async listByWorkspace(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<WorkspaceCategoryRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              parent_id AS "parentCategoryId",
              transaction_type AS "transactionType",
              name,
              icon_key AS "iconKey",
              color_token AS "colorToken",
              is_system AS "isSystem",
              is_archived AS "isArchived",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM categories
        WHERE workspace_id IS NULL
           OR workspace_id = $1
        ORDER BY COALESCE(workspace_id, '') ASC, transaction_type ASC, name ASC`,
      [workspaceId],
    );

    return result.rows;
  }

  async findById(workspaceId: string, categoryId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<WorkspaceCategoryRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              parent_id AS "parentCategoryId",
              transaction_type AS "transactionType",
              name,
              icon_key AS "iconKey",
              color_token AS "colorToken",
              is_system AS "isSystem",
              is_archived AS "isArchived",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM categories
        WHERE id = $2
          AND (workspace_id IS NULL OR workspace_id = $1)
        LIMIT 1`,
      [workspaceId, categoryId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    input: {
      colorToken?: string | null;
      iconKey?: string | null;
      id: string;
      name: string;
      parentCategoryId?: string | null;
      transactionType: "income" | "expense";
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<WorkspaceCategoryRecord>(
      `INSERT INTO categories (
         id,
         workspace_id,
         parent_id,
         transaction_type,
         name,
         icon_key,
         color_token,
         is_system,
         is_archived,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id,
                 workspace_id AS "workspaceId",
                 parent_id AS "parentCategoryId",
                 transaction_type AS "transactionType",
                 name,
                 icon_key AS "iconKey",
                 color_token AS "colorToken",
                 is_system AS "isSystem",
                 is_archived AS "isArchived",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [
        input.id,
        input.workspaceId,
        input.parentCategoryId ?? null,
        input.transactionType,
        input.name,
        input.iconKey ?? null,
        input.colorToken ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }

  async update(
    workspaceId: string,
    categoryId: string,
    updates: Partial<{
      colorToken: string | null;
      iconKey: string | null;
      name: string;
      parentCategoryId: string | null;
      transactionType: "income" | "expense";
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [workspaceId, categoryId];

    if (updates.name !== undefined) {
      values.push(updates.name);
      assignments.push(`name = $${values.length}`);
    }

    if (updates.transactionType !== undefined) {
      values.push(updates.transactionType);
      assignments.push(`transaction_type = $${values.length}`);
    }

    if (updates.parentCategoryId !== undefined) {
      values.push(updates.parentCategoryId);
      assignments.push(`parent_id = $${values.length}`);
    }

    if (updates.iconKey !== undefined) {
      values.push(updates.iconKey);
      assignments.push(`icon_key = $${values.length}`);
    }

    if (updates.colorToken !== undefined) {
      values.push(updates.colorToken);
      assignments.push(`color_token = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(workspaceId, categoryId, queryable);
    }

    await queryable.query(
      `UPDATE categories
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND workspace_id = $1
          AND is_system = FALSE`,
      values,
    );

    return this.findById(workspaceId, categoryId, queryable);
  }

  async archive(workspaceId: string, categoryId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE categories
          SET is_archived = TRUE,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND workspace_id = $1
          AND is_system = FALSE`,
      [workspaceId, categoryId],
    );

    return this.findById(workspaceId, categoryId, queryable);
  }

  async restore(workspaceId: string, categoryId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE categories
          SET is_archived = FALSE,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND workspace_id = $1
          AND is_system = FALSE`,
      [workspaceId, categoryId],
    );

    return this.findById(workspaceId, categoryId, queryable);
  }

  async findActiveCategoryForTransaction(
    workspaceId: string,
    categoryId: string,
    transactionType: "income" | "expense",
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<WorkspaceCategoryRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              parent_id AS "parentCategoryId",
              transaction_type AS "transactionType",
              name,
              icon_key AS "iconKey",
              color_token AS "colorToken",
              is_system AS "isSystem",
              is_archived AS "isArchived",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM categories
        WHERE id = $2
          AND is_archived = FALSE
          AND transaction_type = $3
          AND (
            (workspace_id IS NULL AND is_system = TRUE)
            OR workspace_id = $1
          )
        LIMIT 1`,
      [workspaceId, categoryId, transactionType],
    );

    return result.rows[0] ?? null;
  }
}
