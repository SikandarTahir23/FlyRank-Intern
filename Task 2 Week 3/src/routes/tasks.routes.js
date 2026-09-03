// Read routes for tasks (Stage 2: GET only).
// Route handlers contain zero SQL - all database work lives in the
// repository module (src/data/task-store.js), so swapping storage engines
// never touches this file. Validation, status codes, and response bodies
// are unchanged from the SQLite version.

const express = require("express");

const taskStore = require("../data/task-store");

const router = express.Router();

// GET /tasks
// Returns the full list of tasks. An empty list is still a valid 200 response.
router.get("/tasks", async (request, response) => {
  const tasks = await taskStore.getAllTasks();

  response.json(tasks);
});

// GET /tasks/:id
// Returns a single task.
//
// Error handling:
// - The :id URL segment is always a string, so we convert it to a number.
//   If it is not numeric (e.g. /tasks/abc) there can be no matching task,
//   so we answer 404 rather than 500. Rejecting it here also keeps
//   non-numbers away from the repository layer entirely.
// - If the number is valid but no task has that id, we also return 404,
//   with a JSON body explaining what went wrong.
router.get("/tasks/:id", async (request, response) => {
  const taskId = Number(request.params.id);

  // Non-numeric ids (NaN) cannot exist in the database -> treat as not found.
  if (Number.isNaN(taskId)) {
    return response.status(404).json({
      error: `Task with id '${request.params.id}' does not exist`,
    });
  }

  const task = await taskStore.findTaskById(taskId);

  // No task with this id exists in the database -> 404 Not Found.
  if (task === null) {
    return response.status(404).json({
      error: `Task with id ${taskId} was not found`,
    });
  }

  response.json(task);
});

module.exports = router;
