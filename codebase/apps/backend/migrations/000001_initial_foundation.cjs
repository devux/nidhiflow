exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("app_metadata", {
    key: {
      type: "text",
      primaryKey: true,
    },
    value: {
      type: "text",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.sql("INSERT INTO app_metadata (key, value) VALUES ('schema_baseline', '1')");
};

exports.down = (pgm) => {
  pgm.dropTable("app_metadata");
};
