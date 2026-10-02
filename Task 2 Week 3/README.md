# FlyRank To-Do API (PostgreSQL + Docker)

A simple REST API for managing a to-do list, backed by PostgreSQL running in Docker Compose.

## Quick Start

### Prerequisites
- Docker and Docker Compose (Docker Desktop includes both)

### 1. Configure Environment
```bash
cp .env.example .env
```

The `.env` file contains database credentials and the `DATABASE_URL` connection string.  
**Important:** The URL uses `db` as hostname (the Compose service name), not `localhost`.

### 2. Start the Stack
```bash
docker compose up --build
```

This starts:
- **api** - Node.js/Express API on http://localhost:3000
- **db** - PostgreSQL 16 (internal only)

The API waits for the database healthcheck before accepting requests.

### 3. Verify It Works
```bash
curl http://localhost:3000/health
curl http://localhost:3000/tasks
```

### 4. Stop the Stack
```bash
docker compose down
```
To also remove the database volume:
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
{"id": 4, "title": "Learn Docker Compose", "done": false}
```

### Get All Tasks
```bash
curl http://localhost:3000/tasks
```

### Get a Single Task
```bash
curl http://localhost:3000/tasks/2
```

### Update a Task
```bash
curl -X PUT http://localhost:3000/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{"title": "Design REST API endpoints", "done": true}'
```

### Delete a Task
```bash
curl -X DELETE http://localhost:3000/tasks/2
```

## Database Screenshot

![Database Screenshot](docs/db-screenshot.png)

*Add a screenshot of the `tasks` table showing seeded rows and tasks created via the API.*

## Development (Without Docker)

```bash
npm install
# Requires a local PostgreSQL instance with matching .env values
npm run dev
```

## License

ISC