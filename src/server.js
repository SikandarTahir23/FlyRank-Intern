// Entry point of the to-do API.
// Stage 1: root metadata endpoint and a health check.

const express = require("express");

const healthRoutes = require("./routes/health.routes");

const app = express();

// Port the server listens on. 3000 is the conventional default for dev servers.
const PORT = 3000;

// Parse incoming JSON request bodies so route handlers can read request.body.
app.use(express.json());

// Health and metadata routes.
app.use("/", healthRoutes);

// Start listening for incoming HTTP requests.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
