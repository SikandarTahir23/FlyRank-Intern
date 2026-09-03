# FlyRank To-Do API (PostgreSQL + Docker)

A simple REST API for managing a to-do list, backed by PostgreSQL running in Docker Compose.

## Quick Start

### Prerequisites
- Docker and Docker Compose (Docker Desktop includes both)

### 1. Configure Environment
Copy the example environment file and adjust values if needed:
```bash
cp .env.example .env
```

The `.env` file contains:
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` - database credentials
- `DATABASE_URL` - full connection string used by the API

**Important:** The `DATABASE_URL` uses `db` as the hostname (the Compose service name), **not** `localhost`. Inside the Docker network, services reach each other by service name.

### 2. Start the Stack
```bash
docker compose up --build
```

This starts two services:
- **api** - Node.js/Express API on http://localhost:3000
- **db** - PostgreSQL 16 on port 5432 (internal only)

The API waits for the database healthcheck to pass before accepting requests.

### 3. Verify It Works
```bash
curl http://localhost:3000/health
# {"status":"ok"}

curl http://localhost:3000/tasks
# Returns the seeded example tasks
```

### 4. Stop the Stack
```bash
docker compose down
```

To also remove the database volume (wipes all data):
```bash
docker compose down -v
```

## API Endpoints

| Method | Endpoint        | Description                 | Status Codes        |
|--------|-----------------|-----------------------------|---------------------|
| GET    | `/`             | API metadata                | 200                 |
| GET    | `/health`       | Health check                | 200                 |
| GET    | `/tasks`        | List all tasks              | 200                 |
| GET    | `/tasks/:id`    | Get a single task by ID     | 200, 404            |
| POST   | `/tasks`        | Create a new task           | 201, 400            |
| PUT    | `/tasks/:id`    | Replace a task (full update)| 200, 400, 404       |
| DELETE | `/tasks/:id`    | Delete a task               | 204, 404            |

## Request/Response Examples

### Create a Task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Docker Compose", "done": false}'
```
Response (201):
```json
{
  "id": 4,
  "title": "Learn Docker Compose",
  "done": false
}
```

### Get All Tasks
```bash
curl http://localhost:3000/tasks
```
Response (200):
```json
[
  {"id": 1, "title": "Set up project scaffold", "done": true},
  {"id": 2, "title": "Design REST API endpoints", "done": false},
  {"id": 3, "title": "Write Swagger documentation", "done": false},
  {"id": 4, "title": "Learn Docker Compose", "done": false}
]
```

### Get a Single Task
```bash
curl http://localhost:3000/tasks/2
```
Response (200):
```json
{"id": 2, "title": "Design REST API endpoints", "done": false}
```

### Update a Task (Full Replacement)
```bash
curl -X PUT http://localhost:3000/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{"title": "Design REST API endpoints", "done": true}'
```
Response (200):
```json
{"id": 2, "title": "Design REST API endpoints", "done": true}
```

### Delete a Task
```bash
curl -X DELETE http://localhost:3000/tasks/2
```
Response: 204 No Content

## Database Screenshot

![Database Screenshot](docs/db-screenshot.png)

*Placeholder: Add a screenshot of the `tasks` table in pgAdmin, DBeaver, or `psql` showing the seeded rows and any tasks you created via the API.*

## Architecture Notes

### Docker Networking
- The API container connects to PostgreSQL using the hostname `db` (the Compose service name), **not** `localhost`.
- Inside a container, `localhost` refers to the container itself. Compose creates a shared network where each service is reachable by its service name.
- From your host machine, you would use `localhost:5432` (if you publish the port in compose.yaml).

### Parameterized Queries
All SQL in `src/data/task-store.js` uses parameterized queries (`$1`, `$2`):
```javascript
await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
```
This prevents SQL injection and allows Postgres to cache query plans.

### Repository Pattern
Database logic is encapsulated in `src/data/task-store.js`. Route handlers in `src/routes/tasks.routes.js` call repository functions and never write SQL directly. This makes the storage backend swappable without touching HTTP logic.

## Development (Without Docker)

```bash
npm install
# Requires a local PostgreSQL instance with matching .env values
npm run dev
```

## License

ISC