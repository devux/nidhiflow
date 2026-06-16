exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("generated_reports", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    requested_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    type: { type: "text", notNull: true },
    parameters: { type: "jsonb", notNull: true },
    status: { type: "text", notNull: true, default: "completed" },
    storage_key: { type: "text", notNull: true },
    expires_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint("generated_reports", "generated_reports_type_check", {
    check: "type IN ('summary', 'categories', 'cashFlow')",
  });
  pgm.addConstraint("generated_reports", "generated_reports_status_check", {
    check: "status IN ('queued', 'processing', 'completed', 'failed', 'expired')",
  });

  pgm.createIndex("generated_reports", ["workspace_id", "created_at"], {
    name: "generated_reports_workspace_created_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("generated_reports", ["workspace_id", "created_at"], {
    name: "generated_reports_workspace_created_idx",
  });
  pgm.dropConstraint("generated_reports", "generated_reports_status_check");
  pgm.dropConstraint("generated_reports", "generated_reports_type_check");
  pgm.dropTable("generated_reports");
};
