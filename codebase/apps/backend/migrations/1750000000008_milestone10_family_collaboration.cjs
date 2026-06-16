exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("workspace_invitations", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    invited_email: { type: "text", notNull: true },
    invited_by_user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    token_hash: { type: "text", notNull: true, unique: true },
    status: { type: "text", notNull: true, default: "pending" },
    expires_at: { type: "timestamptz", notNull: true },
    accepted_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    accepted_at: { type: "timestamptz" },
    revoked_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint("workspace_invitations", "workspace_invitations_status_check", {
    check: "status IN ('pending', 'accepted', 'revoked', 'expired')",
  });

  pgm.createIndex("workspace_members", ["workspace_id", "membership_role"], {
    name: "workspace_members_workspace_role_idx",
  });
  pgm.createIndex("workspace_invitations", ["workspace_id", "status"], {
    name: "workspace_invitations_workspace_status_idx",
  });
  pgm.createIndex("workspace_invitations", ["invited_email", "status"], {
    name: "workspace_invitations_email_status_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("workspace_invitations", ["invited_email", "status"], {
    name: "workspace_invitations_email_status_idx",
  });
  pgm.dropIndex("workspace_invitations", ["workspace_id", "status"], {
    name: "workspace_invitations_workspace_status_idx",
  });
  pgm.dropIndex("workspace_members", ["workspace_id", "membership_role"], {
    name: "workspace_members_workspace_role_idx",
  });
  pgm.dropConstraint("workspace_invitations", "workspace_invitations_status_check");
  pgm.dropTable("workspace_invitations");
};
