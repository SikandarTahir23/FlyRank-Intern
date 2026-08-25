// Read-only data access for tasks (Stage 1).
// Every query is parameterized (? placeholders): user-supplied values are
// bound separately from the SQL text, so a malicious value like
// "1 OR 1 = 1" is treated as literal data and can never change the query's
// meaning. This is our defense against SQL injection.

const db = require("./db");

// Convert a raw database row into the API shape.
//
// SQLite has no real boolean type, so "done" is stored as 0/1. The Week 2
// in-memory API returned true/false, so we map it back here to keep the JSON
// responses byte-for-byte identical to the original version.
function mapRowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
  };
}

// Return every task, oldest first (matching the in-memory array order).
function getAllTasks() {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY id").all();

  return rows.map(mapRowToTask);
}

// Find a single task by its numeric id.
// Returns the task object, or null if no task with that id exists.
function findTaskById(id) {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  // better-sqlite3 returns undefined when no row matches; the route layer
  // expects null (same contract as the in-memory store), so we normalize.
  return row === undefined ? null : mapRowToTask(row);
}

module.exports = {
  getAllTasks,
  findTaskById,
};
