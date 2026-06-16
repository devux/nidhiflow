exports.shorthands = undefined;

const systemCategories = [
  ["cat_salary", "income", "Salary", "income", "brand"],
  ["cat_freelance", "income", "Freelance", "income", "brand"],
  ["cat_business", "income", "Business", "income", "brand"],
  ["cat_interest", "income", "Interest", "income", "brand"],
  ["cat_food", "expense", "Food", "expense", "danger"],
  ["cat_shopping", "expense", "Shopping", "expense", "danger"],
  ["cat_transport", "expense", "Transport", "expense", "danger"],
  ["cat_bills", "expense", "Bills", "expense", "danger"],
  ["cat_entertainment", "expense", "Entertainment", "expense", "danger"],
  ["cat_health", "expense", "Health", "expense", "danger"],
  ["cat_education", "expense", "Education", "expense", "danger"],
  ["cat_travel", "expense", "Travel", "expense", "danger"],
  ["cat_home", "expense", "Home", "expense", "danger"],
];

exports.up = (pgm) => {
  pgm.createTable("users", {
    id: { type: "text", primaryKey: true },
    email: { type: "text", notNull: true, unique: true },
    password_hash: { type: "text" },
    email_verified_at: { type: "timestamptz" },
    display_name: { type: "text" },
    locale: { type: "text" },
    timezone: { type: "text" },
    preferred_currency: { type: "char(3)" },
    theme: { type: "text" },
    status: { type: "text", notNull: true, default: "active" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("workspaces", {
    id: { type: "text", primaryKey: true },
    name: { type: "text", notNull: true },
    type: { type: "text", notNull: true },
    reporting_currency: { type: "char(3)", notNull: true },
    timezone: { type: "text", notNull: true },
    created_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("workspace_members", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    user_id: { type: "text", notNull: true, references: "users", onDelete: "RESTRICT" },
    membership_role: { type: "text", notNull: true, default: "member" },
    joined_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("workspace_members", "workspace_members_unique", {
    unique: ["workspace_id", "user_id"],
  });

  pgm.createTable("accounts", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    name: { type: "text", notNull: true },
    type: { type: "text", notNull: true },
    opening_balance: { type: "numeric(19,4)", notNull: true, default: 0 },
    currency: { type: "char(3)", notNull: true },
    is_archived: { type: "boolean", notNull: true, default: false },
    archived_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("categories", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", references: "workspaces", onDelete: "RESTRICT" },
    parent_id: { type: "text", references: "categories", onDelete: "RESTRICT" },
    transaction_type: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    icon_key: { type: "text" },
    color_token: { type: "text" },
    is_system: { type: "boolean", notNull: true, default: false },
    is_archived: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("transactions", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    type: { type: "text", notNull: true },
    amount: { type: "numeric(19,4)", notNull: true },
    currency: { type: "char(3)", notNull: true },
    account_id: { type: "text", references: "accounts", onDelete: "RESTRICT" },
    destination_account_id: { type: "text", references: "accounts", onDelete: "RESTRICT" },
    category_id: { type: "text", references: "categories", onDelete: "RESTRICT" },
    transaction_date: { type: "date", notNull: true },
    occurred_at: { type: "timestamptz" },
    payment_method: { type: "text" },
    note: { type: "text" },
    recurring_transaction_id: { type: "text" },
    created_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    updated_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    client_id: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });
  pgm.addConstraint("transactions", "transactions_positive_amount", {
    check: "amount > 0",
  });

  pgm.createTable("budgets", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    category_id: { type: "text", references: "categories", onDelete: "RESTRICT" },
    period_start: { type: "date", notNull: true },
    period_end: { type: "date", notNull: true },
    limit_amount: { type: "numeric(19,4)", notNull: true },
    currency: { type: "char(3)", notNull: true },
    created_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("goals", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    name: { type: "text", notNull: true },
    type: { type: "text", notNull: true },
    target_amount: { type: "numeric(19,4)", notNull: true },
    currency: { type: "char(3)", notNull: true },
    target_date: { type: "date" },
    image_key: { type: "text" },
    status: { type: "text", notNull: true, default: "active" },
    created_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("goal_contributions", {
    id: { type: "text", primaryKey: true },
    goal_id: { type: "text", notNull: true, references: "goals", onDelete: "RESTRICT" },
    amount: { type: "numeric(19,4)", notNull: true },
    currency: { type: "char(3)", notNull: true },
    contribution_date: { type: "date", notNull: true },
    transaction_id: { type: "text", references: "transactions", onDelete: "RESTRICT" },
    created_by_user_id: { type: "text", references: "users", onDelete: "RESTRICT" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("bills", {
    id: { type: "text", primaryKey: true },
    workspace_id: { type: "text", notNull: true, references: "workspaces", onDelete: "RESTRICT" },
    name: { type: "text", notNull: true },
    amount: { type: "numeric(19,4)", notNull: true },
    currency: { type: "char(3)", notNull: true },
    due_date: { type: "date", notNull: true },
    recurrence_rule: { type: "text" },
    status: { type: "text", notNull: true, default: "pending" },
    category_id: { type: "text", references: "categories", onDelete: "RESTRICT" },
    account_id: { type: "text", references: "accounts", onDelete: "RESTRICT" },
    paid_transaction_id: { type: "text", references: "transactions", onDelete: "RESTRICT" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("feedback", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "text", references: "users", onDelete: "SET NULL" },
    category: { type: "text", notNull: true },
    description: { type: "text", notNull: true },
    status: { type: "text", notNull: true, default: "open" },
    request_id: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    deleted_at: { type: "timestamptz" },
  });

  pgm.createTable("feedback_messages", {
    id: { type: "text", primaryKey: true },
    feedback_id: { type: "text", notNull: true, references: "feedback", onDelete: "RESTRICT" },
    actor_type: { type: "text", notNull: true },
    actor_id: { type: "text" },
    message: { type: "text", notNull: true },
    visibility: { type: "text", notNull: true, default: "user" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("audit_logs", {
    id: { type: "text", primaryKey: true },
    actor_user_id: { type: "text", references: "users", onDelete: "SET NULL" },
    workspace_id: { type: "text", references: "workspaces", onDelete: "SET NULL" },
    action: { type: "text", notNull: true },
    resource_type: { type: "text", notNull: true },
    resource_id: { type: "text", notNull: true },
    change_metadata: { type: "jsonb" },
    request_id: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("idempotency_keys", {
    id: { type: "text", primaryKey: true },
    actor_user_id: { type: "text", references: "users", onDelete: "SET NULL" },
    workspace_id: { type: "text", references: "workspaces", onDelete: "SET NULL" },
    key: { type: "text", notNull: true },
    request_fingerprint: { type: "text", notNull: true },
    response_status: { type: "integer" },
    response_reference: { type: "text" },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("idempotency_keys", "idempotency_keys_scope_unique", {
    unique: ["actor_user_id", "workspace_id", "key"],
  });

  pgm.addConstraint("workspaces", "workspaces_type_check", {
    check: "type IN ('personal', 'family')",
  });
  pgm.addConstraint("workspace_members", "workspace_members_role_check", {
    check: "membership_role IN ('manager', 'member')",
  });
  pgm.addConstraint("accounts", "accounts_type_check", {
    check: "type IN ('cash', 'bank', 'credit_card', 'loan', 'wallet', 'other')",
  });
  pgm.addConstraint("categories", "categories_transaction_type_check", {
    check: "transaction_type IN ('income', 'expense', 'transfer')",
  });
  pgm.addConstraint("transactions", "transactions_type_check", {
    check: "type IN ('income', 'expense', 'transfer')",
  });
  pgm.addConstraint("goals", "goals_status_check", {
    check: "status IN ('active', 'completed', 'archived')",
  });
  pgm.addConstraint("feedback", "feedback_status_check", {
    check: "status IN ('open', 'in_review', 'closed')",
  });
  pgm.addConstraint("feedback_messages", "feedback_messages_visibility_check", {
    check: "visibility IN ('user', 'internal')",
  });

  pgm.createIndex("transactions", ["workspace_id", "transaction_date"]);
  pgm.createIndex("budgets", ["workspace_id", "period_start", "period_end"]);
  pgm.createIndex("bills", ["workspace_id", "due_date", "status"]);
  pgm.createIndex("goals", ["workspace_id", "status"]);
  pgm.createIndex("audit_logs", ["workspace_id", "created_at"]);

  systemCategories.forEach(([id, transactionType, name, iconKey, colorToken]) => {
    pgm.sql(
      `INSERT INTO categories (id, transaction_type, name, icon_key, color_token, is_system, is_archived, created_at, updated_at)
       VALUES ('${id}', '${transactionType}', '${name}', '${iconKey}', '${colorToken}', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    );
  });
};

exports.down = (pgm) => {
  pgm.dropTable("idempotency_keys");
  pgm.dropTable("audit_logs");
  pgm.dropTable("feedback_messages");
  pgm.dropTable("feedback");
  pgm.dropTable("bills");
  pgm.dropTable("goal_contributions");
  pgm.dropTable("goals");
  pgm.dropTable("budgets");
  pgm.dropTable("transactions");
  pgm.dropTable("categories");
  pgm.dropTable("accounts");
  pgm.dropTable("workspace_members");
  pgm.dropTable("workspaces");
  pgm.dropTable("users");
};
