// Entry point of the to-do API.
// Stage 0: a minimal Express server that answers every request with a greeting.

const express = require("express");

const app = express();

// Port the server listens on. 3000 is the conventional default for dev servers.
const PORT = 3000;

// Temporary welcome route so we can verify the server is alive.
app.get("/", (request, response) => {
  response.send("Hello from the FlyRank to-do API!");
});

// Start listening for incoming HTTP requests.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
