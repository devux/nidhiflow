exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn("workspace_invitations", "invited_email", {
    notNull: false,
  });
};

exports.down = (pgm) => {
  pgm.sql("DELETE FROM workspace_invitations WHERE invited_email IS NULL AND status = 'pending'");
  pgm.alterColumn("workspace_invitations", "invited_email", {
    notNull: true,
  });
};
