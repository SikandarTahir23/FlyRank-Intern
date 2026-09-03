// Task repository - the ONLY place in the codebase that talks SQL.
//
// Route handlers never build queries themselves; they call these functions
// and receive plain JavaScript objects. Keeping every query inside this
// single module means there is exactly one auditable surface for SQL
// correctness and injection safety.
//
// PARAMETERIZED QUERIES - WHY $1/$2 MATTERS:
// User-supplied values are NEVER concatenated into SQL text. Instead they
// are sent separately ($1, $2 placeholders) and Postgres binds them as raw
// data. A malicious title like '; DROP TABLE tasks; -- is stored as a
// literal string and can never change what the query does. Beyond safety,
// parameterization also lets Postgres cache and reuse query plans.

const { pool } = require("./db");

// Return every task, oldest first (same order the in-memory array gave).
// Postgres returns REAL booleans for "done", so unlike the SQLite version
// no 0/1 -> true/false conversion is needed here.
async function getAllTasks() {
  const result = await pool.query(
    "SELECT id, title, done FROM tasks ORDER BY id"
  );

  return result.rows;
}

// Find a single task by its numeric id.
// Returns the task object, or null if no task with that id exists.
//
// The $1 placeholder carries the id safely into the WHERE clause; callers
// already reject non-numeric ids before this runs, but even a hostile value
// could only ever match-or-not-match, never alter the query itself.
async function findTaskById(id) {
  const result = await pool.query(
    "SELECT id, title, done FROM tasks WHERE id = $1",
    [id]
  );

  // Normalize to null (not undefined) so route handlers can rely on the
  // same "null means 404" contract the earlier versions used.
  return result.rows.length === 0 ? null : result.rows[0];
}

// Create a new task and return the inserted row (including generated id).
// Uses INSERT ... RETURNING so the id assigned by Postgres comes back immediately.
// Parameterized values ($1, $2) prevent injection even if title contains quotes.
async function createTask(title, done) {
  const result = await pool.query(
    "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING id, title, done",
    [title, done]
  );

  return result.rows[0];
}

// Update an existing task by id. Only non-null fields are modified.
// Returns the updated row, or null if no task with that id exists.
// The COALESCE pattern keeps the current value when the caller passes undefined.
async function updateTask(id, title, done) {
  const result = await pool.query(
    `UPDATE tasks
     SET title = COALESCE($1, title),
         done  = COALESCE($2, done)
     WHERE id = $3
     RETURNING id, title, done`,
    [title, done, id]
  );

  return result.rows.length === 0 ? null : result.rows[0];
}

// Delete a task by id. Returns true if a row was deleted, false if not found.
// The rowCount property tells us whether the WHERE clause matched anything.
async function deleteTask(id) {
  const result = await pool.query(
    "DELETE FROM tasks WHERE id = $1",
    [id]
  );

  return result.rowCount > 0;
}

module.exports = {
  getAllTasks,
  findTaskById,
  createTask,
  updateTask,
  deleteTask,
};
