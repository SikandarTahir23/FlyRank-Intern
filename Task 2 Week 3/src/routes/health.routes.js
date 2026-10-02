const express = require("express");

const router = express.Router();

router.get("/", (request, response) => {
  response.json({
    name: "FlyRank To-Do API",
    version: "1.0.0",
    description: "A simple to-do list REST API backed by PostgreSQL storage",
    documentation: "/docs",
  });
});

router.get("/health", (request, response) => {
  response.json({ status: "ok" });
});

module.exports = router;
