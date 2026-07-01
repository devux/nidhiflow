exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("payments", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    payee_upi_id: { type: "text", notNull: true },
    payee_name: { type: "text" },
    amount: { type: "numeric(19,2)", notNull: true },
    currency: { type: "text", notNull: true, default: "INR" },
    note: { type: "text" },
    transaction_ref: { type: "text", notNull: true, unique: true },
    selected_upi_app: { type: "text", notNull: true },
    source: { type: "text", notNull: true },
    upi_uri: { type: "text", notNull: true },
    app_reported_status: { type: "text", notNull: true, default: "PENDING" },
    verification_status: { type: "text", notNull: true, default: "UNVERIFIED" },
    raw_response: { type: "text" },
    approval_ref_no: { type: "text" },
    response_code: { type: "text" },
    launched_at: { type: "timestamptz" },
    callback_received_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint("payments", "payments_amount_positive", { check: "amount > 0" });
  pgm.addConstraint("payments", "payments_currency_inr", { check: "currency = 'INR'" });
  pgm.addConstraint("payments", "payments_source_valid", {
    check: "source IN ('QR_SCAN', 'MANUAL_ENTRY')",
  });
  pgm.addConstraint("payments", "payments_app_reported_status_valid", {
    check: "app_reported_status IN ('PENDING', 'SUCCESS', 'FAILURE', 'CANCELLED', 'UNKNOWN')",
  });
  pgm.addConstraint("payments", "payments_verification_status_valid", {
    check: "verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')",
  });
  pgm.createIndex("payments", ["user_id", "created_at"], {
    name: "payments_user_created_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("payments", ["user_id", "created_at"], {
    name: "payments_user_created_idx",
  });
  pgm.dropTable("payments");
};
