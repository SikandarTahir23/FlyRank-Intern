const express = require("express");
const taskStore = require("../data/task-store");

const router = express.Router();

router.get("/tasks", async (request, response) => {
  const tasks = await taskStore.getAllTasks();
  response.json(tasks);
});

router.get("/tasks/:id", async (request, response) => {
  const taskId = Number(request.params.id);

  if (Number.isNaN(taskId)) {
    return response.status(404).json({
      error: `Task with id '${request.params.id}' does not exist`,
    });
  }

  const task = await taskStore.findTaskById(taskId);

  if (task === null) {
    return response.status(404).json({
      error: `Task with id ${taskId} was not found`,
    });
  }

  response.json(task);
});

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
