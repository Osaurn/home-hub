// One-off schema upgrades for databases created before a given change.
// Safe to call on every startup: each migration checks whether it's
// already applied before doing anything.

// Adds 'monthly' as a valid recurrence_type and a `months` column to
// tasks. SQLite can't ALTER a CHECK constraint in place, so this
// rebuilds the table following SQLite's documented safe procedure.
// `legacy_alter_table = ON` during the rename is essential: without it,
// modern SQLite rewrites other tables' foreign key definitions to
// follow the renamed table, so completions/attachments/task_tags would
// end up pointing at the temporary name instead of the new `tasks`
// table once it's recreated under the original name.
function migrateMonthlyRecurrence(db) {
  const existing = db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'`).get();
  if (!existing || existing.sql.includes("'monthly'")) return;

  const hasMonthsColumn = db
    .prepare(`PRAGMA table_info(tasks)`)
    .all()
    .some((c) => c.name === 'months');

  db.pragma('foreign_keys = OFF');
  db.pragma('legacy_alter_table = ON');

  const migrate = db.transaction(() => {
    db.exec(`ALTER TABLE tasks RENAME TO tasks_pre_monthly_migration;`);
    db.exec(`
      CREATE TABLE tasks (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        title               TEXT NOT NULL,
        instructions        TEXT,
        recurrence_type     TEXT NOT NULL CHECK (recurrence_type IN ('quarterly','monthly','interval')),
        quarters            TEXT,
        months              TEXT,
        interval_min_years  INTEGER,
        interval_max_years  INTEGER,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.exec(`
      INSERT INTO tasks (id, title, instructions, recurrence_type, quarters, months, interval_min_years, interval_max_years, created_at)
      SELECT id, title, instructions, recurrence_type, quarters, ${hasMonthsColumn ? 'months' : 'NULL'}, interval_min_years, interval_max_years, created_at
      FROM tasks_pre_monthly_migration;
    `);
    db.exec(`DROP TABLE tasks_pre_monthly_migration;`);
  });
  migrate();

  db.pragma('legacy_alter_table = OFF');
  const violations = db.pragma('foreign_key_check');
  if (violations.length > 0) {
    throw new Error(`Tietokannan päivitys epäonnistui: viittausvirheitä (${JSON.stringify(violations)})`);
  }
  db.pragma('foreign_keys = ON');
}

// Adds `interval_first_due`: an optional ISO date before which a
// never-completed interval task is "upcoming" instead of immediately due.
function migrateIntervalFirstDue(db) {
  const hasColumn = db
    .prepare(`PRAGMA table_info(tasks)`)
    .all()
    .some((c) => c.name === 'interval_first_due');
  if (!hasColumn) db.exec(`ALTER TABLE tasks ADD COLUMN interval_first_due TEXT`);
}

function runMigrations(db) {
  migrateMonthlyRecurrence(db);
  migrateIntervalFirstDue(db);
}

module.exports = { runMigrations };
