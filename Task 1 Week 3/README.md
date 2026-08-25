# FlyRank To-Do API (SQLite Edition)

A simple to-do list REST API backed by a real SQLite database.
This is the Week 3 migration of the Week 2 in-memory version: every route,
status code, validation rule, and response body stays exactly the same -
only the storage layer changed.

## Why SQLite?

For a small single-server API like this one, SQLite is the sweet spot:

- **Zero setup**: there is no database server to install or run. The entire
  database is a single file (`tasks.db`) that lives next to the code, and
  Node reads/writes it directly through `better-sqlite3`.
- **Real persistence**: unlike the in-memory array from Week 2, tasks now
  survive server restarts and crashes - which is the whole point of this
  migration.
- **Surprisingly fast**: for read-heavy workloads with low concurrency,
  SQLite often beats client/server databases because there is no network
  hop at all.
- **Industry standard SQL**: the queries we write here (parameterized
  SELECT / INSERT / UPDATE / DELETE) transfer directly to PostgreSQL or
  MySQL later, so this is genuine SQL practice rather than throwaway code.

## Where is the database?

The file is created automatically on first startup at the project root:

```
Task 1 Week 3/
└── tasks.db        <- the whole database (gitignored)
```

On very first run, the schema is created and three example tasks are seeded.
Later restarts detect existing rows and skip seeding, so examples never
duplicate.

## Getting started

```bash
npm install     # once per machine
npm start       # production-style start -> http://localhost:3000
npm run dev     # same but auto-restarts when files change
```

## API endpoints

| Method | Route           | Success | Errors |
| ------ | --------------- | ------- | ------ |
| GET    | `/tasks`        | 200     | -      |
| GET    | `/tasks/:id`    | 200     | 404    |
| POST   | `/tasks`        | 201     | 400    |
| PUT    | `/tasks/:id`    | 200     | 400, 404 |
| DELETE | `/tasks/:id`    | 204     | 404    |
| GET    | `/health`       | 200     | -      |

## Database inspection

The database can be opened with any SQLite tool. We recommend
[DB Browser for SQLite](https://sqlitebrowser.org/).

<!-- TODO(week-3): paste a screenshot of tasks.db open in DB Browser for SQLite here -->

## Example raw SQL

The exact query that powers `GET /tasks/:id`, as you could run it in
DB Browser's "Execute SQL" tab:

```sql
SELECT * FROM tasks WHERE id = ?;
```

(The `?` is a bound parameter: the application supplies the value separately
from the SQL text, which makes SQL injection impossible.)
