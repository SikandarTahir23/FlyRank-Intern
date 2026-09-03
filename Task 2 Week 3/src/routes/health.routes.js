// Health and API metadata routes.
// Kept identical to the previous versions; only the description wording
// reflects the new storage backend (PostgreSQL in Docker).

const express = require("express");

const router = express.Router();

// GET /
// Returns basic metadata about the API so consumers can discover what it is.
router.get("/", (request, response) => {
  response.json({
    name: "FlyRank To-Do API",
    version: "1.0.0",
    description: "A simple to-do list REST API backed by PostgreSQL storage",
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
