exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("loan_payments", {
    id: { type: "text", primaryKey: true },
    account_id: {
      type: "text",
      notNull: true,
      references: "accounts",
      onDelete: "RESTRICT",
    },
    amount: { type: "numeric(19,4)", notNull: true },
    currency: { type: "char(3)", notNull: true },
    payment_date: { type: "date", notNull: true },
    created_by_user_id: {
      type: "text",
      notNull: true,
      references: "users",
      onDelete: "RESTRICT",
    },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });
  pgm.addConstraint("loan_payments", "loan_payments_positive_amount", {
    check: "amount > 0",
  });
  pgm.createIndex("loan_payments", ["account_id", "payment_date"], {
    name: "loan_payments_account_date_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("loan_payments");
};
