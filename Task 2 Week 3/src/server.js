// Entry point of the to-do API.
//
// STARTUP ORDER MATTERS: with an external PostgreSQL server we can no longer
// open the database synchronously like the embedded SQLite file allowed.
// Instead we await initializeDatabase() FIRST (connectivity check + table
// creation + guarded seeding) and only then start listening for HTTP, so
// the API never accepts traffic before the schema is guaranteed to exist.

const express = require("express");

const healthRoutes = require("./routes/health.routes");
const taskRoutes = require("./routes/tasks.routes");
const { initializeDatabase } = require("./data/db");

// Port comes from the environment (compose.yaml sets it) with the same
// conventional 3000 default the earlier versions used.
const PORT = process.env.PORT || 3000;

async function startServer() {
  // Connect, create the table if needed, seed example rows if empty.
  // If Postgres is unreachable, this throws and the process exits - which
  // in Docker makes the container unhealthy instead of serving errors.
  await initializeDatabase();

  const app = express();

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
}

startServer();
