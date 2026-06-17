exports.up = (pgm) => {
  pgm.sql(`
    WITH affected_workspaces AS (
      SELECT DISTINCT t.workspace_id, w.reporting_currency
        FROM transactions t
        JOIN guest_migrations gm
          ON gm.workspace_id = t.workspace_id
        JOIN workspaces w
          ON w.id = t.workspace_id
       WHERE t.client_id IS NOT NULL
         AND t.account_id IS NULL
         AND t.deleted_at IS NULL
    ),
    created_accounts AS (
      INSERT INTO accounts (
        id,
        workspace_id,
        name,
        type,
        opening_balance,
        currency
      )
      SELECT 'acc_migrated_' || substring(md5(aw.workspace_id), 1, 24),
             aw.workspace_id,
             'Migrated guest cash',
             'cash',
             0::numeric(19,4),
             aw.reporting_currency
        FROM affected_workspaces aw
       WHERE NOT EXISTS (
         SELECT 1
           FROM accounts a
          WHERE a.workspace_id = aw.workspace_id
            AND a.name = 'Migrated guest cash'
            AND a.type = 'cash'
            AND a.deleted_at IS NULL
       )
      RETURNING id, workspace_id
    ),
    existing_accounts AS (
      SELECT DISTINCT ON (a.workspace_id) a.id, a.workspace_id
        FROM accounts a
        JOIN affected_workspaces aw
          ON aw.workspace_id = a.workspace_id
       WHERE a.name = 'Migrated guest cash'
         AND a.type = 'cash'
         AND a.deleted_at IS NULL
       ORDER BY a.workspace_id, a.created_at ASC
    ),
    migration_accounts AS (
      SELECT id, workspace_id
        FROM created_accounts
      UNION
      SELECT id, workspace_id
        FROM existing_accounts
    )
    UPDATE transactions t
       SET account_id = ma.id,
           updated_at = CURRENT_TIMESTAMP
      FROM migration_accounts ma
     WHERE t.workspace_id = ma.workspace_id
       AND t.client_id IS NOT NULL
       AND t.account_id IS NULL
       AND t.deleted_at IS NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    WITH migration_accounts AS (
      SELECT a.id, a.workspace_id
        FROM accounts a
       WHERE a.name = 'Migrated guest cash'
         AND a.type = 'cash'
         AND a.id LIKE 'acc_migrated_%'
    ),
    detached_transactions AS (
      UPDATE transactions t
         SET account_id = NULL,
             updated_at = CURRENT_TIMESTAMP
        FROM migration_accounts ma
       WHERE t.workspace_id = ma.workspace_id
         AND t.account_id = ma.id
         AND t.client_id IS NOT NULL
       RETURNING ma.id
    )
    DELETE FROM accounts a
     WHERE a.id IN (SELECT id FROM migration_accounts)
       AND NOT EXISTS (
         SELECT 1
           FROM transactions t
          WHERE t.account_id = a.id
       )
  `);
};
