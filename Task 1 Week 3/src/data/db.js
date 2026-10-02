// SQLite database setup.
// Stage 0: opens (and creates, if missing) tasks.db, defines the tasks table,
// and seeds three example tasks on the very first run only.

const path = require("path");
const Database = require("better-sqlite3");

// Keep the database file at the project root so its location is predictable
// no matter which directory the server is started from.
const db = new Database(path.join(__dirname, "..", "..", "tasks.db"));

// Enable WAL mode so readers are never blocked while a write happens,
// and make sure every insert actually hits disk before we report success.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// IF NOT EXISTS makes this safe to run on every startup: the table is only
// created the first time, and later restarts simply reuse it.
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

// Seed logic: run only when the table is completely empty (row count of 0).
//
// Why a count check instead of an "already seeded" flag?
// - On the first ever start the table has 0 rows, so we insert the examples.
// - On every later restart the count is > 0, so we skip seeding entirely.
//   Without this guard, the three example tasks would be duplicated each
//   time the server restarts.
// - If a user deliberately deletes all tasks, we still do not reseed:
//   re-filling an intentionally emptied list would be surprising behavior.
const taskCount = db.prepare("SELECT COUNT(*) AS total FROM tasks").get().total;

if (taskCount === 0) {
  // Same seed data as the original in-memory version, so day-one responses
  // stay identical to Week 2.
  const insertSeedTask = db.prepare(
    "INSERT INTO tasks (title, done) VALUES (?, ?)"
  );

  // A transaction wraps all three inserts so the database never ends up
  // half-seeded if the process dies midway.
  const seedTasks = db.transaction(() => {
    insertSeedTask.run("Set up project scaffold", 1);
    insertSeedTask.run("Design REST API endpoints", 0);
    insertSeedTask.run("Write Swagger documentation", 0);
  });

  seedTasks();
}

module.exports = db;
