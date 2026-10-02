# FlyRank To-Do API

A simple to-do list REST API built with Node.js and Express, using in-memory
storage (no external database). Interactive Swagger documentation is served
at `/docs`.

## Requirements

- Node.js 22 LTS (any modern Node 18+ will work)
- npm

## Run instructions

```powershell
# Install dependencies once
npm install

# Start the server (production style)
npm start

# ...or start with auto-reload on file changes (development)
npm run dev
```

The server listens on `http://localhost:3000`.

- API base: http://localhost:3000
- Swagger UI: http://localhost:3000/docs

> Note: data is stored in memory only. All tasks reset to the three seed
> tasks whenever the server restarts.

## Endpoints

| Method | Endpoint      | Description                     | Success | Errors     |
| ------ | ------------- | ------------------------------- | ------- | ---------- |
| GET    | `/`           | API metadata                    | 200     | -          |
| GET    | `/health`     | Liveness probe                  | 200     | -          |
| GET    | `/tasks`      | List all tasks                  | 200     | -          |
| GET    | `/tasks/:id`  | Get a single task by id         | 200     | 404        |
| POST   | `/tasks`      | Create a task (`{ "title": "" }`) | 201   | 400        |
| PUT    | `/tasks/:id`  | Update title and/or done fields | 200     | 400, 404   |
| DELETE | `/tasks/:id`  | Delete a task                   | 204     | 404        |

## Sample curl commands

```bash
# Create a new task (expects 201)
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Review the weekly report"}'

# List all tasks (expects 200)
curl http://localhost:3000/tasks

# Mark a task as done (expects 200)
curl -X PUT http://localhost:3000/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Delete a task (expects 204, no body)
curl -X DELETE http://localhost:3000/tasks/3

# Request a task that does not exist (expects 404)
curl -i http://localhost:3000/tasks/999
```

## Project structure

```
src/
├── server.js              # Express app bootstrap
├── routes/
│   ├── health.routes.js   # GET / and /health
│   └── tasks.routes.js    # Task CRUD endpoints + validation
├── data/
│   └── store.js           # In-memory array + seed data
└── docs/
    └── openapi.yaml       # OpenAPI spec rendered by Swagger UI
```
