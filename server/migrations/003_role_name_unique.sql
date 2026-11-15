-- FINZI AI: enforce one row per system role name (prevents seeder duplicates)
-- Duplicates are removed first so the unique index can be created.
DELETE FROM roles WHERE id NOT IN (
  SELECT MIN(id) FROM roles GROUP BY name
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_unique ON roles(name);