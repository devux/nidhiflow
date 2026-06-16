exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("recurring_transactions", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    name: { type: "text", notNull: true },
    type: { type: "text", notNull: true },
    amount: { type: "numeric(19,4)", notNull: true },
    currency: { type: "char(3)", notNull: true },
    account_id: { type: "text", notNull: true, references: "accounts", onDelete: "RESTRICT" },
    destination_account_id: { type: "text", references: "accounts", onDelete: "RESTRICT" },
    category_id: { type: "text", references: "categories", onDelete: "RESTRICT" },
    schedule_rule: { type: "text", notNull: true },
    timezone: { type: "text", notNull: true },
    next_occurrence: { type: "date" },
    is_active: { type: "boolean", notNull: true, default: true },
    note: { type: "text" },
    created_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    updated_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.addConstraint("recurring_transactions", "recurring_transactions_type_check", {
    check: "type IN ('income', 'expense', 'transfer')",
  });
  pgm.addConstraint("budgets", "budgets_currency_check", {
    check: "currency IS NOT NULL",
  });
  pgm.addConstraint("goals", "goals_target_amount_positive", {
    check: "target_amount > 0",
  });
  pgm.addConstraint("bills", "bills_amount_positive", {
    check: "amount > 0",
  });

  pgm.createIndex("recurring_transactions", ["workspace_id", "next_occurrence"]);
  pgm.createIndex("goals", ["workspace_id", "type", "status"]);

  pgm.sql(
    `CREATE UNIQUE INDEX budgets_workspace_category_period_active_unique
       ON budgets (workspace_id, COALESCE(category_id, ''), period_start, period_end)
     WHERE deleted_at IS NULL`,
  );
  pgm.sql(
    `CREATE UNIQUE INDEX goals_workspace_name_active_unique
       ON goals (workspace_id, name)
     WHERE deleted_at IS NULL`,
  );
  pgm.sql(
    `CREATE UNIQUE INDEX bills_workspace_name_due_active_unique
       ON bills (workspace_id, name, due_date)
     WHERE deleted_at IS NULL`,
  );
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS bills_workspace_name_due_active_unique`);
  pgm.sql(`DROP INDEX IF EXISTS goals_workspace_name_active_unique`);
  pgm.sql(`DROP INDEX IF EXISTS budgets_workspace_category_period_active_unique`);
  pgm.dropTable("recurring_transactions");
  pgm.dropConstraint("bills", "bills_amount_positive");
  pgm.dropConstraint("goals", "goals_target_amount_positive");
  pgm.dropConstraint("budgets", "budgets_currency_check");
  pgm.dropConstraint("recurring_transactions", "recurring_transactions_type_check");
};
