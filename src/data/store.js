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

// Create a new task with the given title and add it to the store.
// The id is generated here so callers cannot inject their own ids,
// and every new task starts as "not done".
function createTask(title) {
  const newTask = {
    id: nextId,
    title: title,
    done: false,
  };

  tasks.push(newTask);
  nextId = nextId + 1;

  return newTask;
}

// Update an existing task in place with the given fields (title and/or done).
// Returns the updated task object, or null if no task has that id.
function updateTask(id, updatedFields) {
  const task = findTaskById(id);

  // Nothing to update if the task does not exist; the route layer decides
  // how to report that to the client (404).
  if (task === null) {
    return null;
  }

  Object.assign(task, updatedFields);

  return task;
}

// Remove a task from the store by id.
// Returns true if a task was removed, or false if no task had that id.
function deleteTask(id) {
  const taskIndex = tasks.findIndex((task) => task.id === id);

  if (taskIndex === -1) {
    return false;
  }

  tasks.splice(taskIndex, 1);

  return true;
}

module.exports = {
  getAllTasks,
  findTaskById,
  createTask,
  updateTask,
  deleteTask,
};
