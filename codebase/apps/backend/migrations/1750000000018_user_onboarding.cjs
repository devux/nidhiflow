exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("users", {
    onboarding_status: { type: "text" },
    onboarding_version: { type: "integer" },
    onboarding_finished_at: { type: "timestamptz" },
  });

  pgm.sql(
    `UPDATE users
        SET onboarding_status = 'completed',
            onboarding_version = 1,
            onboarding_finished_at = CURRENT_TIMESTAMP`,
  );

  pgm.alterColumn("users", "onboarding_status", {
    default: "pending",
    notNull: true,
  });
  pgm.alterColumn("users", "onboarding_version", {
    default: 1,
    notNull: true,
  });
  pgm.addConstraint("users", "users_onboarding_status_check", {
    check: "onboarding_status IN ('pending', 'completed', 'skipped')",
  });
  pgm.addConstraint("users", "users_onboarding_version_check", {
    check: "onboarding_version > 0",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("users", "users_onboarding_version_check");
  pgm.dropConstraint("users", "users_onboarding_status_check");
  pgm.dropColumns("users", ["onboarding_finished_at", "onboarding_version", "onboarding_status"]);
};
