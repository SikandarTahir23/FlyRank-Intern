// CRUD routes for tasks.
// Stage 2: adds create (POST /tasks), which writes through a parameterized
// INSERT. Routes, status codes, validation, and response bodies are
// unchanged from the original in-memory version.

const express = require("express");

const taskStore = require("../data/task-store");

const router = express.Router();

// GET /tasks
// Returns the full list of tasks. An empty list is still a valid 200 response.
router.get("/tasks", (request, response) => {
  response.json(taskStore.getAllTasks());
});

// GET /tasks/:id
// Returns a single task.
//
// Error handling:
// - The :id URL segment is always a string, so we convert it to a number.
//   If it is not numeric (e.g. /tasks/abc) there can be no matching task,
//   so we answer 404 rather than 500.
// - If the number is valid but no task has that id, we also return 404,
//   with a JSON body explaining what went wrong.
router.get("/tasks/:id", (request, response) => {
  const taskId = Number(request.params.id);

  // Non-numeric ids (NaN) cannot exist in the database -> treat as not found.
  // Rejecting them here also keeps non-numbers away from SQL entirely.
  if (Number.isNaN(taskId)) {
    return response.status(404).json({
      error: `Task with id '${request.params.id}' does not exist`,
    });
  }

  const task = taskStore.findTaskById(taskId);

  // No task with this id exists in the database -> 404 Not Found.
  if (task === null) {
    return response.status(404).json({
      error: `Task with id ${taskId} was not found`,
    });
  }

  response.json(task);
});

// POST /tasks
// Creates a new task from the JSON body: { "title": "..." }.
//
// Input validation (400 Bad Request):
// - The body must contain a "title" field.
// - The title must be a non-empty string (after trimming whitespace).
// Anything else is a client mistake, so we reject it with 400 and a JSON
// error message instead of storing bad data.
//
// On success we return 201 Created together with the stored task, including
// its SQLite-generated id. Any "id" or "done" sent by the client is ignored:
// ids come from AUTOINCREMENT and new tasks always start as not done.
router.post("/tasks", (request, response) => {
  const titleFromRequest = request.body.title;

  // Missing title field entirely, wrong type, or only whitespace -> invalid.
  if (
    typeof titleFromRequest !== "string" ||
    titleFromRequest.trim().length === 0
  ) {
    return response.status(400).json({
      error: "The 'title' field is required and must be a non-empty string",
    });
  }

  const createdTask = taskStore.createTask(titleFromRequest.trim());

  response.status(201).json(createdTask);
});

module.exports = router;
