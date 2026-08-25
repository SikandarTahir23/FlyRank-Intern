// Entry point of the to-do API.
// Stage 5: serves interactive Swagger UI documentation at /docs.

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const healthRoutes = require("./routes/health.routes");
const taskRoutes = require("./routes/tasks.routes");

const app = express();

// Port the server listens on. 3000 is the conventional default for dev servers.
const PORT = 3000;

// Load the static OpenAPI specification and parse it once at startup.
// The spec is a plain YAML file, so it stays easy to review and edit.
const openApiSpecPath = path.join(__dirname, "docs", "openapi.yaml");
const openApiSpec = YAML.parse(fs.readFileSync(openApiSpecPath, "utf8"));

// Parse incoming JSON request bodies so route handlers can read request.body.
app.use(express.json());

// Health and metadata routes.
app.use("/", healthRoutes);

// Task CRUD routes.
app.use("/", taskRoutes);

// Interactive API documentation, generated from the OpenAPI spec above.
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Start listening for incoming HTTP requests.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
});
