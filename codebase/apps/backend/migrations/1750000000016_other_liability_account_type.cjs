exports.shorthands = undefined;

const previousTypes = "('cash', 'bank', 'credit_card', 'loan', 'wallet', 'other')";
const expandedTypes =
  "('cash', 'bank', 'credit_card', 'loan', 'wallet', 'other', 'other_liability')";

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
          FROM pg_type
         WHERE typname = 'account_type'
      ) THEN
        ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'other_liability';
      ELSE
        ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
        ALTER TABLE accounts
          ADD CONSTRAINT accounts_type_check CHECK (type IN ${expandedTypes});
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE accounts SET type = 'other' WHERE type = 'other_liability';

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_type
         WHERE typname = 'account_type'
      ) THEN
        ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
        ALTER TABLE accounts
          ADD CONSTRAINT accounts_type_check CHECK (type IN ${previousTypes});
      END IF;
    END
    $$;
  `);
};
