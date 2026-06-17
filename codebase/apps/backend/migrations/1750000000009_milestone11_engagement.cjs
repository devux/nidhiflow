exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("notifications", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    workspace_id: { type: "text", references: "workspaces", onDelete: "SET NULL" },
    type: { type: "text", notNull: true },
    title: { type: "text", notNull: true },
    body: { type: "text", notNull: true },
    payload: { type: "jsonb", notNull: true, default: "{}" },
    read_at: { type: "timestamptz" },
    sent_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("notification_preferences", {
    user_id: { type: "text", primaryKey: true, references: "users", onDelete: "RESTRICT" },
    in_app_enabled: { type: "boolean", notNull: true, default: true },
    email_enabled: { type: "boolean", notNull: true, default: false },
    bill_reminders_enabled: { type: "boolean", notNull: true, default: true },
    budget_alerts_enabled: { type: "boolean", notNull: true, default: true },
    goal_updates_enabled: { type: "boolean", notNull: true, default: true },
    flow_launch_enabled: { type: "boolean", notNull: true, default: false },
    timezone: { type: "text", notNull: true, default: "UTC" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("flow_launch_subscriptions", {
    id: { type: "text", primaryKey: true },
    email: { type: "text" },
    user_id: { type: "text", references: "users", onDelete: "SET NULL" },
    token_hash: { type: "text", notNull: true, unique: true },
    consented_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    unsubscribed_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createIndex("notifications", ["user_id", "read_at", "created_at"], {
    name: "notifications_user_read_created_idx",
  });
  pgm.createIndex("flow_launch_subscriptions", ["email"], {
    name: "flow_launch_subscriptions_email_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("flow_launch_subscriptions", ["email"], {
    name: "flow_launch_subscriptions_email_idx",
  });
  pgm.dropIndex("notifications", ["user_id", "read_at", "created_at"], {
    name: "notifications_user_read_created_idx",
  });
  pgm.dropTable("flow_launch_subscriptions");
  pgm.dropTable("notification_preferences");
  pgm.dropTable("notifications");
};
