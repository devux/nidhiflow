exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("transactions", {
    source: { type: "text", notNull: true, default: "MANUAL" },
    source_package: { type: "text" },
    source_parser_version: { type: "smallint" },
    source_fingerprint: { type: "char(64)" },
    source_detected_at: { type: "timestamptz" },
  });

  pgm.addConstraint("transactions", "transactions_source_check", {
    check: "source IN ('MANUAL', 'ANDROID_NOTIFICATION')",
  });
  pgm.addConstraint("transactions", "transactions_notification_source_fields_check", {
    check: `(
      source = 'MANUAL'
      AND source_package IS NULL
      AND source_parser_version IS NULL
      AND source_fingerprint IS NULL
      AND source_detected_at IS NULL
    ) OR (
      source = 'ANDROID_NOTIFICATION'
      AND source_package IS NOT NULL
      AND source_parser_version IS NOT NULL
      AND source_fingerprint IS NOT NULL
      AND source_detected_at IS NOT NULL
    )`,
  });
  pgm.addConstraint("transactions", "transactions_source_package_length_check", {
    check: "source_package IS NULL OR char_length(source_package) <= 200",
  });
  pgm.addConstraint("transactions", "transactions_source_parser_version_check", {
    check: "source_parser_version IS NULL OR source_parser_version BETWEEN 1 AND 100",
  });
  pgm.createIndex("transactions", ["created_by_user_id", "source_fingerprint"], {
    name: "transactions_notification_fingerprint_unique",
    unique: true,
    where: "source = 'ANDROID_NOTIFICATION'",
  });

  pgm.sql(`
    INSERT INTO categories (
      id, transaction_type, name, icon_key, color_token, is_system, is_archived,
      created_at, updated_at
    ) VALUES
      ('cat_uncategorized_income', 'income', 'Uncategorized', 'income', 'brand', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('cat_uncategorized_expense', 'expense', 'Uncategorized', 'expense', 'danger', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex("transactions", ["created_by_user_id", "source_fingerprint"], {
    name: "transactions_notification_fingerprint_unique",
  });
  pgm.dropConstraint("transactions", "transactions_source_package_length_check");
  pgm.dropConstraint("transactions", "transactions_source_parser_version_check");
  pgm.dropConstraint("transactions", "transactions_notification_source_fields_check");
  pgm.dropConstraint("transactions", "transactions_source_check");
  pgm.dropColumns("transactions", [
    "source",
    "source_package",
    "source_parser_version",
    "source_fingerprint",
    "source_detected_at",
  ]);
};
