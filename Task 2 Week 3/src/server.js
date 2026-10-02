const express = require("express");

const healthRoutes = require("./routes/health.routes");
const taskRoutes = require("./routes/tasks.routes");
const { initializeDatabase } = require("./data/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  await initializeDatabase();

  const app = express();
  app.use(express.json());
  app.use("/", healthRoutes);
  app.use("/", taskRoutes);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
