// Entry point of the to-do API.

const express = require("express");

const healthRoutes = require("./routes/health.routes");
const taskRoutes = require("./routes/tasks.routes");

// Requiring db.js opens the SQLite file, creates the table if needed, and
// seeds example data on first run - all before the server accepts traffic.
require("./data/db");

const app = express();

// Port the server listens on. 3000 is the conventional default for dev servers.
const PORT = 3000;

// Parse incoming JSON request bodies so route handlers can read request.body.
app.use(express.json());

// Health and metadata routes.
app.use("/", healthRoutes);

// Task CRUD routes.
app.use("/", taskRoutes);

// Start listening for incoming HTTP requests.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
