// Health and API metadata routes.
// These endpoints let clients (and monitoring tools) confirm the service is up.

const express = require("express");

const router = express.Router();

// GET /
// Returns basic metadata about the API so consumers can discover what it is.
router.get("/", (request, response) => {
  response.json({
    name: "FlyRank To-Do API",
    version: "1.0.0",
    description: "A simple to-do list REST API with in-memory storage",
    documentation: "/docs",
  });
});

// GET /health
// A lightweight liveness probe. Returns 200 with a fixed body when the
// process is running and able to serve requests.
router.get("/health", (request, response) => {
  response.json({ status: "ok" });
});

module.exports = router;
