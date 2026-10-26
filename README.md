# BoardIQ Starter Pack

A minimal full-stack project with a FastAPI backend and a Next.js frontend.

## Run locally

Make sure Docker Desktop is running, then start both applications from the repository root:

```bash
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) to see the frontend. The page fetches its message from the FastAPI backend through the Next.js `/api` rewrite.

The backend is also available directly at [http://localhost:8000](http://localhost:8000). Its API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

Stop the services with `Ctrl+C`, or run:

```bash
docker compose down
```

Both services run in development mode with the source directories mounted, so edits are picked up automatically.
