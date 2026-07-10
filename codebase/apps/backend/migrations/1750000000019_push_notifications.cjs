exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("push_tokens", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    token: { type: "text", notNull: true },
    token_hash: { type: "text", notNull: true, unique: true },
    platform: { type: "text", notNull: true },
    device_name: { type: "text" },
    browser: { type: "text" },
    os: { type: "text" },
    is_active: { type: "boolean", notNull: true, default: true },
    last_used_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("push_tokens", "push_tokens_platform_check", {
    check: "platform IN ('android', 'web')",
  });
  pgm.createIndex("push_tokens", ["user_id", "is_active"], {
    name: "push_tokens_user_active_idx",
  });

  pgm.createTable("push_notification_deliveries", {
    id: { type: "text", primaryKey: true },
    notification_id: {
      type: "text",
      notNull: true,
      references: "notifications",
      onDelete: "CASCADE",
    },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    status: { type: "text", notNull: true, default: "pending" },
    attempts: { type: "integer", notNull: true, default: 0 },
    next_attempt_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    last_error_code: { type: "text" },
    sent_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("push_notification_deliveries", "push_notification_deliveries_status_check", {
    check: "status IN ('pending', 'sent', 'skipped', 'failed')",
  });
  pgm.createIndex("push_notification_deliveries", ["status", "next_attempt_at"], {
    name: "push_notification_deliveries_pending_idx",
  });

  pgm.addColumns("notification_preferences", {
    push_enabled: { type: "boolean", notNull: true, default: false },
    recurring_reminders_enabled: { type: "boolean", notNull: true, default: true },
    monthly_reports_enabled: { type: "boolean", notNull: true, default: true },
    security_alerts_enabled: { type: "boolean", notNull: true, default: true },
    quiet_hours_enabled: { type: "boolean", notNull: true, default: false },
    quiet_hours_start: { type: "time", notNull: true, default: "22:00" },
    quiet_hours_end: { type: "time", notNull: true, default: "07:00" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("notification_preferences", [
    "quiet_hours_end",
    "quiet_hours_start",
    "quiet_hours_enabled",
    "security_alerts_enabled",
    "monthly_reports_enabled",
    "recurring_reminders_enabled",
    "push_enabled",
  ]);
  pgm.dropIndex("push_notification_deliveries", ["status", "next_attempt_at"], {
    name: "push_notification_deliveries_pending_idx",
  });
  pgm.dropTable("push_notification_deliveries");
  pgm.dropIndex("push_tokens", ["user_id", "is_active"], {
    name: "push_tokens_user_active_idx",
  });
  pgm.dropTable("push_tokens");
};
