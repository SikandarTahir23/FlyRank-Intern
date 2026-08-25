// In-memory data store for tasks.
// No external database: the array lives only as long as the server process.
// All data resets to the seed values when the server restarts.

// Seed data: three example tasks so the API returns something useful on day one.
let tasks = [
  { id: 1, title: "Set up project scaffold", done: true },
  { id: 2, title: "Design REST API endpoints", done: false },
  { id: 3, title: "Write Swagger documentation", done: false },
];

// Every new task gets a unique id. We keep a counter instead of deriving the
// next id from array length, because deletions would otherwise cause
// duplicate ids.
let nextId = 4;

// Return every task in the store.
function getAllTasks() {
  return tasks;
}

// Find a single task by its numeric id.
// Returns the task object, or null if no task with that id exists.
function findTaskById(id) {
  return tasks.find((task) => task.id === id) || null;
}

module.exports = {
  getAllTasks,
  findTaskById,
};
