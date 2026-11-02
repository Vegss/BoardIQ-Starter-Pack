# BoardIQ Starter Pack

A minimal BoardIQ prototype: a Next.js page displays a greeting from a FastAPI backend. The API also provides a health endpoint and interactive documentation. Database storage, authentication, and Supabase integration are **not implemented**.

## Prerequisites

- [Git](https://git-scm.com/downloads/) to clone the repository.
- [Docker Desktop](https://docs.docker.com/get-started/get-docker/), installed and running. On Linux, Docker Engine with the [Compose plugin](https://docs.docker.com/compose/install/) also works. Commands below use `docker compose` (Compose v2).
- Available local ports **3000** and **8000**, a browser, and internet access for the first image and dependency downloads.

Docker supplies Node.js 22 and Python 3.12; you do not need to install Node.js, npm, or Python on your computer for this workflow. No cloud account, API key, database, or environment file is required.

| Component | Repository configuration |
| --- | --- |
| [Frontend](frontend/package.json) | Next.js 15.1.4, React 19.0.0, TypeScript 5.7.2; Tailwind CSS via PostCSS |
| [Backend](backend/requirements.txt) | FastAPI 0.115.6 and Uvicorn 0.34.0 |
| [Local services](docker-compose.yml) | Builds from `frontend/` and `backend/`; exposes ports 3000 and 8000 respectively |

## Setup and startup

Clone the repository, or use your existing checkout:

```bash
git clone https://github.com/Vegss/BoardIQ-Starter-Pack.git
cd BoardIQ-Starter-Pack
```

Run all remaining commands from the repository root, the folder containing `docker-compose.yml`.

```bash
docker --version
docker compose version
docker info
docker compose config --quiet
docker compose up --build
```

`docker info` checks that Docker is reachable. `config --quiet` validates the Compose configuration; no output means it passed. `up --build` builds the images and starts both services, with logs in your terminal. Wait for Next.js to report ready and Uvicorn to report application startup complete.

| Open in your browser | Expected result |
| --- | --- |
| [Frontend](http://localhost:3000) | “BoardIQ starter” and “Hello from the BoardIQ backend!” |
| [Backend health](http://localhost:8000/health) | `{"status":"ok"}` |
| [Backend greeting](http://localhost:8000/api/hello) | `{"message":"Hello from the BoardIQ backend!"}` |
| [Proxied greeting](http://localhost:3000/api/hello) | The same greeting JSON, through Next.js |
| [API documentation](http://localhost:8000/docs) | Swagger UI for trying the API |

The backend has no `/` route: `http://localhost:8000/` returning 404 is expected.

## Development Environment Architecture

- **Dockerfiles:** [Frontend](frontend/Dockerfile) uses `node:22-alpine`; [backend](backend/Dockerfile) uses `python:3.12-slim`. Each installs dependencies (`npm install` or `pip install -r requirements.txt`), then copies application files into `/app` to create its image.
- **Docker Compose:** [docker-compose.yml](docker-compose.yml) builds and runs both images, sets the frontend's `BACKEND_URL`, and starts the backend first. Startup order does not guarantee API readiness.
- **Networking:** Compose creates a shared network where Next.js can reach `backend:8000`. It publishes frontend port 3000 and backend port 8000 on the same host ports. Use `localhost` in your browser; inside a container, `localhost` refers to that container itself.
- **Volumes:** Each local source folder is bind-mounted at `/app` in its container, making edits available immediately. Anonymous volumes at `/app/node_modules` and `/app/.next` keep frontend dependencies and generated files separate from the host folders.
- **Development servers:** Compose runs Next.js through `npm run dev` and adds `--reload` to the backend image's Uvicorn command. Both listen on `0.0.0.0` inside their containers. These servers are configured to reload source edits without rebuilding images.

## How the services connect

There are two separate request paths:

1. **Homepage:** the browser requests `localhost:3000`. The Next.js server renders [the page](frontend/app/page.tsx), fetching `http://backend:8000/api/hello` directly. This URL is hardcoded in the page.
2. **API proxy:** requests to `localhost:3000/api/...` use the [Next.js rewrite](frontend/next.config.ts). It forwards them to `${BACKEND_URL}/api/...`, preserving the `/api` prefix. The homepage does not use this rewrite.

`/health` and `/docs` are accessed on port 8000 because only `/api/...` is proxied.

## Environment variables

There are no `.env.example` files in this repository and nothing to copy before startup.

| Variable | Used by | Value |
| --- | --- | --- |
| `BACKEND_URL` | Next.js server configuration, for the `/api` rewrite only | Compose explicitly sets `http://backend:8000`. If absent, the configuration falls back to `http://localhost:8000`. Use an origin without `/api` or a trailing slash. |

The backend reads no application environment variables. No `NEXT_PUBLIC_*` or Supabase variables are used. Changing `BACKEND_URL` does **not** change the homepage's hardcoded fetch URL. A root `.env` cannot override the literal value in the current Compose file; changing the container environment requires recreating the frontend container.

Keep credentials out of source control. `.gitignore` excludes local environment files, but it does not exclude them from Docker build contexts. There is no `.dockerignore`, and the frontend image copies the whole frontend directory; do not put secrets there for image builds.

## Daily use and shutdown

For later starts, use `docker compose up`. To run in the background, use `docker compose up -d`. In another terminal at the repository root:

```bash
docker compose ps
docker compose logs --tail=100 -f
```

`Ctrl+C` exits the log viewer. In the terminal running an attached `docker compose up`, `Ctrl+C` stops the services. To stop and remove the project containers and network, including after background startup:

```bash
docker compose down
```

This keeps your source files and built images. Docker also retains anonymous volumes unless explicitly removed; see [Compose shutdown behavior](https://docs.docker.com/reference/cli/docker/compose/down/).

## Troubleshooting and known limitations

| Symptom or limitation | Explanation / next step |
| --- | --- |
| Docker daemon connection or permission error | Start Docker Desktop, or check your Linux Docker Engine installation and user access. Confirm `docker info` succeeds. |
| Port 3000 or 8000 is already allocated | Stop the other application or container using that port, then retry startup. |
| Homepage fails just after startup | `depends_on` starts the backend first but does not wait for API readiness. There are no Compose health checks. Check backend logs and `/health`, then refresh. See [Docker startup ordering](https://docs.docker.com/compose/how-tos/startup-order/). |
| `backend` cannot be resolved when running Next.js outside Docker | The homepage requires Docker's internal hostname. Use Compose for the current code; setting `BACKEND_URL` alone cannot fix this. |
| Source edits do not appear | Check service logs and Docker's access to the mounted source folder; try `docker compose restart frontend backend`. Live reload is configured but was not exercised in this review. |
| Installed dependencies appear stale after a dependency update | Rebuild and replace frontend dependency/cache volumes with `docker compose up --build --force-recreate --renew-anon-volumes`. This discards container `node_modules` and `.next` contents, not source files. |
| Linting is not configured | `npm run lint` exists, but there is no ESLint configuration and neither `eslint` nor `eslint-config-next` is declared. It is not a ready-to-run validation check. |
| Frontend builds may resolve different transitive dependencies | The Dockerfile runs `npm install` before copying `package-lock.json`, so the committed lockfile does not govern that installation. No dependency or Dockerfile changes were made in this review. |

## Proposed hosting (future work)

The proposed split is [Vercel for Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs), [Railway for FastAPI](https://docs.railway.com/guides/fastapi), and [Supabase for the database and authentication](https://supabase.com/docs). These are proposals, not services deployed or configured by this repository.

Before deployment, the homepage fetch must use a configurable backend address, the rewrite must target the hosted API, and production build/start and port settings must be reviewed. The current Compose setup and frontend Dockerfile run development servers. Supabase would need new application integration, schema, and authentication work; there are no Supabase setup steps for the current prototype.

## Verification from this documentation review

- **Passed:** `docker compose config --quiet`; `docker compose build` for both images (dependency-install layers were cached); startup with `docker compose up -d`; shutdown and removal of the test containers and their volumes.
- **Passed via local HTTP requests:** homepage status and greeting text, direct `/health` and `/api/hello`, proxied `/api/hello`, `/docs`, and `/openapi.json`. The backend root returned the expected 404.
- **Passed:** `docker compose exec -T frontend ./node_modules/.bin/tsc --noEmit --incremental false`. Package and lockfile root dependency declarations match; relative README links and `git diff --check` also passed.
- **Not verified:** a fresh uncached dependency installation, production build/deployment, visual browser behavior, live reload after edits, or other operating systems. Linting was not run because its configuration and dependencies are missing; no automated test suite is included in the repository.

The limitations above are reported for follow-up; this review changes documentation only.
