exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addConstraint("users", "users_status_check", {
    check: "status IN ('pending_verification', 'active', 'suspended')",
  });

  pgm.createTable("auth_sessions", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    refresh_token_hash: { type: "text", notNull: true },
    token_family_id: { type: "text", notNull: true },
    rotated_from_session_id: { type: "text", references: "auth_sessions", onDelete: "SET NULL" },
    replaced_by_session_id: { type: "text", references: "auth_sessions", onDelete: "SET NULL" },
    user_agent: { type: "text" },
    ip_address: { type: "text" },
    device_name: { type: "text" },
    expires_at: { type: "timestamptz", notNull: true },
    last_used_at: { type: "timestamptz" },
    revoked_at: { type: "timestamptz" },
    revoke_reason: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("email_verification_tokens", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    token_hash: { type: "text", notNull: true, unique: true },
    expires_at: { type: "timestamptz", notNull: true },
    used_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("password_reset_tokens", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    token_hash: { type: "text", notNull: true, unique: true },
    expires_at: { type: "timestamptz", notNull: true },
    used_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createIndex("auth_sessions", ["user_id", "created_at"]);
  pgm.createIndex("auth_sessions", ["token_family_id"]);
  pgm.createIndex("auth_sessions", ["expires_at"]);
  pgm.createIndex("email_verification_tokens", ["user_id", "expires_at"]);
  pgm.createIndex("password_reset_tokens", ["user_id", "expires_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("password_reset_tokens");
  pgm.dropTable("email_verification_tokens");
  pgm.dropTable("auth_sessions");
  pgm.dropConstraint("users", "users_status_check");
};
