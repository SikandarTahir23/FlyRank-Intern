const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTableIfMissing() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done  BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
}

async function seedIfEmpty() {
  const countResult = await pool.query("SELECT COUNT(*) AS total FROM tasks");
  const taskCount = Number(countResult.rows[0].total);

  if (taskCount > 0) {
    return;
  }

  const seedTasks = [
    { title: "Set up project scaffold", done: true },
    { title: "Design REST API endpoints", done: false },
    { title: "Write Swagger documentation", done: false },
  ];

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
