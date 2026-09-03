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

// POST /tasks
// Creates a new task.
// Validation:
// - Body must be valid JSON (express.json() handles parse errors as 400).
// - title is required and must be a non-empty string.
// - done is optional; defaults to false if omitted or not a boolean.
// Returns 201 with the created task, or 400 with an error message.
router.post("/tasks", async (request, response) => {
  const { title, done } = request.body;

  if (typeof title !== "string" || title.trim() === "") {
    return response.status(400).json({
      error: "title is required and must be a non-empty string",
    });
  }

  const task = await taskStore.createTask(title.trim(), done === true);

  response.status(201).json(task);
});

// PUT /tasks/:id
// Fully replaces a task (title and done). Caller must provide both fields.
// Validation mirrors POST: title required non-empty string, done required boolean.
// Returns 200 with updated task, 400 for invalid input, 404 if id not found.
router.put("/tasks/:id", async (request, response) => {
  const taskId = Number(request.params.id);
  const { title, done } = request.body;

  if (Number.isNaN(taskId)) {
    return response.status(404).json({
      error: `Task with id '${request.params.id}' does not exist`,
    });
  }

  if (typeof title !== "string" || title.trim() === "") {
    return response.status(400).json({
      error: "title is required and must be a non-empty string",
    });
  }

  if (typeof done !== "boolean") {
    return response.status(400).json({
      error: "done is required and must be a boolean",
    });
  }

  const task = await taskStore.updateTask(taskId, title.trim(), done);

  if (task === null) {
    return response.status(404).json({
      error: `Task with id ${taskId} was not found`,
    });
  }

  response.json(task);
});

// DELETE /tasks/:id
// Removes a task. Returns 204 No Content on success, 404 if not found.
router.delete("/tasks/:id", async (request, response) => {
  const taskId = Number(request.params.id);

  if (Number.isNaN(taskId)) {
    return response.status(404).json({
      error: `Task with id '${request.params.id}' does not exist`,
    });
  }

  const deleted = await taskStore.deleteTask(taskId);

  if (!deleted) {
    return response.status(404).json({
      error: `Task with id ${taskId} was not found`,
    });
  }

  response.status(204).send();
});

module.exports = router;
