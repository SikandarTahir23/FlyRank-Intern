// PostgreSQL database setup and startup initialization.
//
// CONNECTION STRATEGY
// The pool reads its connection string from the DATABASE_URL environment
// variable, which comes from the ".env" file (loaded via "node --env-file")
// when running locally, and from compose.yaml when running in Docker.
//
// DOCKER NETWORKING - WHY "@db" AND NOT "@localhost":
// Inside Docker Compose every service gets its own network namespace, so
// "localhost" inside the api container refers to the api container itself,
// not to the Postgres container next to it. Compose instead registers each
// service on a shared internal network under its service name, so the
// database is reachable at the hostname "db", port 5432. That is why the
// .env file uses postgres://user:pass@db:5432/todos. From the host machine
// (e.g. psql or a GUI client), you WOULD use localhost - because there you
// are outside the Compose network.
//
// The table creation and seed logic below runs once on startup, before the
// HTTP server starts listening, so the API never accepts traffic before the
// schema is guaranteed to exist.

const { Pool } = require("pg");

// A Pool manages a set of reusable connections. Creating one client per
// request would pay TCP + auth handshake costs every time; the pool keeps
// a few connections warm and hands them out as needed.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the tasks table if it does not exist yet.
//
// IF NOT EXISTS makes this safe on every restart: first boot creates it,
// later boots simply reuse the existing table.
//
// Column notes vs. the old SQLite version:
// - SERIAL auto-generates ids (SQLite used INTEGER PRIMARY KEY AUTOINCREMENT).
// - BOOLEAN is a real boolean in Postgres, so no more storing done as 0/1
//   and converting back in JavaScript like the SQLite version had to.
async function createTableIfMissing() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done  BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
}

// Seed three example tasks - but ONLY if the table is completely empty.
//
// Why guard with COUNT(*) instead of an "already seeded" flag?
// - First ever start: 0 rows -> insert the examples.
// - Every later restart: count > 0 -> skip entirely, so the examples are
//   never duplicated.
// - If a user deliberately deletes all tasks, we still do not reseed:
//   silently re-filling an intentionally emptied list would be surprising.
async function seedIfEmpty() {
  const countResult = await pool.query("SELECT COUNT(*) AS total FROM tasks");
  const taskCount = Number(countResult.rows[0].total);

  if (taskCount > 0) {
    return;
  }

  // Same seed data as the original in-memory/SQLite versions, so day-one
  // API responses stay identical across every storage backend so far.
  const seedTasks = [
    { title: "Set up project scaffold", done: true },
    { title: "Design REST API endpoints", done: false },
    { title: "Write Swagger documentation", done: false },
  ];

  // A transaction wraps all three inserts so the database can never end up
  // half-seeded if the process dies midway: either all rows land, or none.
  try {
    await pool.query("BEGIN");

    for (const task of seedTasks) {
      await pool.query(
        "INSERT INTO tasks (title, done) VALUES ($1, $2)",
        [task.title, task.done]
      );
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

module.exports = {
  pool,
  initializeDatabase: async function initializeDatabase() {
    await createTableIfMissing();
    await seedIfEmpty();
  },
};
