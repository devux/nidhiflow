exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex("accounts", ["workspace_id", "name"], {
    name: "accounts_workspace_name_active_unique",
    unique: true,
    where: "deleted_at IS NULL",
  });

  pgm.createIndex("categories", ["workspace_id", "transaction_type", "name"], {
    name: "categories_workspace_type_name_active_unique",
    unique: true,
    where: "workspace_id IS NOT NULL AND is_archived = FALSE",
  });

  pgm.createIndex("transactions", ["workspace_id", "account_id", "transaction_date"], {
    name: "transactions_workspace_account_date_active_idx",
    where: "deleted_at IS NULL",
  });

  pgm.createIndex("transactions", ["workspace_id", "destination_account_id", "transaction_date"], {
    name: "transactions_workspace_destination_date_active_idx",
    where: "deleted_at IS NULL",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("transactions", ["workspace_id", "destination_account_id", "transaction_date"], {
    name: "transactions_workspace_destination_date_active_idx",
  });
  pgm.dropIndex("transactions", ["workspace_id", "account_id", "transaction_date"], {
    name: "transactions_workspace_account_date_active_idx",
  });
  pgm.dropIndex("categories", ["workspace_id", "transaction_type", "name"], {
    name: "categories_workspace_type_name_active_unique",
  });
  pgm.dropIndex("accounts", ["workspace_id", "name"], {
    name: "accounts_workspace_name_active_unique",
  });
};
