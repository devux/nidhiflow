exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("guest_migrations", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    client_migration_id: { type: "text", notNull: true },
    payload_fingerprint: { type: "text", notNull: true },
    preview_summary: { type: "jsonb", notNull: true },
    result_summary: { type: "jsonb", notNull: true },
    id_mapping: { type: "jsonb", notNull: true },
    committed_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint("guest_migrations", "guest_migrations_user_workspace_client_unique", {
    unique: ["user_id", "workspace_id", "client_migration_id"],
  });

  pgm.createIndex("guest_migrations", ["workspace_id", "committed_at"]);

  pgm.createIndex("transactions", ["workspace_id", "client_id"], {
    name: "transactions_workspace_client_id_active_idx",
    unique: true,
    where: "client_id IS NOT NULL AND deleted_at IS NULL",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("transactions", ["workspace_id", "client_id"], {
    name: "transactions_workspace_client_id_active_idx",
  });
  pgm.dropTable("guest_migrations");
};
