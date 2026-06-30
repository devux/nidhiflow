exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TEMP TABLE retained_workspace_memberships ON COMMIT DROP AS
    SELECT id
      FROM (
        SELECT wm.id,
               ROW_NUMBER() OVER (
                 PARTITION BY wm.user_id
                 ORDER BY wm.joined_at DESC, wm.created_at DESC, wm.id DESC
               ) AS membership_rank
          FROM workspace_members wm
          JOIN workspaces w
            ON w.id = wm.workspace_id
           AND w.deleted_at IS NULL
      ) ranked
     WHERE membership_rank = 1;

    CREATE TEMP TABLE workspace_ownership_successors ON COMMIT DROP AS
    SELECT DISTINCT ON (wm.workspace_id)
           wm.workspace_id,
           wm.user_id
      FROM workspace_members wm
      JOIN retained_workspace_memberships retained
        ON retained.id = wm.id
      JOIN workspaces w
        ON w.id = wm.workspace_id
     WHERE NOT EXISTS (
             SELECT 1
               FROM workspace_members owner_membership
               JOIN retained_workspace_memberships retained_owner
                 ON retained_owner.id = owner_membership.id
              WHERE owner_membership.workspace_id = w.id
                AND owner_membership.user_id = w.created_by_user_id
           )
     ORDER BY wm.workspace_id, wm.joined_at ASC, wm.created_at ASC, wm.id ASC;

    UPDATE workspace_members wm
       SET membership_role = 'manager',
           updated_at = CURRENT_TIMESTAMP
      FROM workspace_ownership_successors successor
     WHERE wm.workspace_id = successor.workspace_id
       AND wm.user_id = successor.user_id;

    UPDATE workspaces w
       SET created_by_user_id = successor.user_id,
           updated_at = CURRENT_TIMESTAMP
      FROM workspace_ownership_successors successor
     WHERE w.id = successor.workspace_id;

    UPDATE workspaces w
       SET deleted_at = COALESCE(w.deleted_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
     WHERE w.deleted_at IS NULL
       AND NOT EXISTS (
             SELECT 1
               FROM workspace_members wm
               JOIN retained_workspace_memberships retained
                 ON retained.id = wm.id
              WHERE wm.workspace_id = w.id
           );

    DELETE FROM workspace_members wm
     WHERE NOT EXISTS (
             SELECT 1
               FROM retained_workspace_memberships retained
              WHERE retained.id = wm.id
           );
  `);

  pgm.addConstraint("workspace_members", "workspace_members_user_unique", {
    unique: ["user_id"],
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("workspace_members", "workspace_members_user_unique");
};
