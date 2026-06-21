exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO categories (
      id,
      transaction_type,
      name,
      icon_key,
      color_token,
      is_system,
      is_archived,
      created_at,
      updated_at
    )
    VALUES (
      'cat_misc',
      'expense',
      'Misc',
      'expense',
      'danger',
      TRUE,
      FALSE,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE categories
       SET is_archived = TRUE,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = 'cat_misc'
       AND NOT EXISTS (
         SELECT 1
           FROM transactions
          WHERE category_id = 'cat_misc'
       )
  `);
};
