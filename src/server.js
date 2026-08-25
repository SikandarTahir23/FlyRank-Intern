// Entry point of the to-do API.
// Stage 2: adds the task routes backed by an in-memory store.

const express = require("express");

const healthRoutes = require("./routes/health.routes");
const taskRoutes = require("./routes/tasks.routes");

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
