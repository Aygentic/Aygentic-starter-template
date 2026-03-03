---
title: "Setup Guide"
doc-type: how-to
status: published
last-updated: 2026-03-03
updated-by: "infra docs writer"
related-code:
  - backend/app/core/config.py
  - compose.yml
  - compose.override.yml
  - backend/Dockerfile
  - frontend/Dockerfile
  - backend/pyproject.toml
  - frontend/package.json
related-docs:
  - docs/getting-started/development.md
  - docs/getting-started/contributing.md
  - docs/deployment/environments.md
tags: [setup, onboarding, getting-started]
---

# Setup Guide

## Prerequisites

- Git
- Docker and Docker Compose (latest version)
- Python >=3.12 (for local backend development without Docker)
- Bun >=1.0 (for local frontend development without Docker)

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-org/your-repo.git
cd Aygentic-starter-template
```

### Set Up Environment Variables

Create a `.env` file in the project root with required Supabase and Clerk credentials:

```bash
# Create .env file (note: .env is git-ignored)
cat > .env << 'EOF'
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
CLERK_SECRET_KEY=your-clerk-secret-key
EOF
```

See the Environment Variables section below for complete configuration details.

### Start the Full Stack

The quickest way to get everything running is with Docker Compose:

```bash
docker compose watch
```

On first run, this will:
1. Build backend and frontend images
2. Start FastAPI backend server
3. Start Vite frontend dev server
4. Start Traefik proxy

The first startup takes ~1-2 minutes as Docker builds the images.

### Verify Installation

Once `docker compose watch` shows services are running, open these URLs in your browser:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React/TypeScript app |
| Backend API | http://localhost:8000 | FastAPI REST API |
| API Docs (Swagger) | http://localhost:8000/docs | Interactive API documentation |
| Proxy Dashboard | http://localhost:8090 | Traefik routing status |

### Run Tests to Verify Setup

Backend tests:

```bash
cd backend
bash ../scripts/test.sh
```

Frontend tests:

```bash
bunx playwright test
```

Playwright authenticates via token injection (not a login form). The setup file `tests/auth.setup.ts` calls `page.addInitScript()` to place an `access_token` in `localStorage` before any navigation. The token value is read from the `TEST_TOKEN` environment variable, which defaults to `"test-token-for-e2e"` when unset. No `FIRST_SUPERUSER` credentials are needed for E2E tests.

## Environment Variables

Configuration is managed through environment variables loaded from the `.env` file. The application settings are **frozen and immutable** after initialization, and sensitive values use `SecretStr` type to prevent accidental logging.

### Required Variables (no defaults)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | https://your-project.supabase.co |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | eyJhbGc... (long JWT) |
| `CLERK_SECRET_KEY` | Clerk secret key for JWT verification | sk_test_... |

### Optional Variables (with defaults)

| Variable | Default | Description | Notes |
|----------|---------|-------------|-------|
| `ENVIRONMENT` | local | Runtime environment | Values: `local`, `staging`, `production` |
| `SERVICE_NAME` | my-service | Application identifier | Used in logs and metrics |
| `SERVICE_VERSION` | 0.1.0 | Application version | Semantic versioning |
| `LOG_LEVEL` | INFO | Logging level | Values: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LOG_FORMAT` | json | Log output format | Values: `json`, `console` |
| `API_V1_STR` | /api/v1 | API prefix | Used for all API routes |
| `BACKEND_CORS_ORIGINS` | [] | Allowed CORS origins | Comma-separated or JSON array |
| `CLERK_JWKS_URL` | None | Clerk JWKS endpoint | Auto-configured if not provided |
| `CLERK_AUTHORIZED_PARTIES` | [] | Authorized JWT audiences | List of allowed parties |
| `SENTRY_DSN` | None | Sentry error tracking | Optional error reporting URL |
| `GIT_COMMIT` | unknown | Current git commit hash | Automatically set by build system |
| `BUILD_TIME` | unknown | Build timestamp | Automatically set by build system |
| `HTTP_CLIENT_TIMEOUT` | 30 | HTTP request timeout (seconds) | For external API calls |
| `HTTP_CLIENT_MAX_RETRIES` | 3 | HTTP request retries | For resilience |

### Frontend Variables

| Variable | Default | Description | Notes |
|----------|---------|-------------|-------|
| `VITE_DASHBOARD_URL` | http://localhost:3000 | URL of the dashboard/shell app | Used to redirect unauthenticated users |
| `VITE_DEV_TOKEN` | (unset) | Dev JWT token for local development | Optional: bypasses dashboard auth locally |

### Security Notes

- **Frozen settings**: All settings are immutable after the application starts. Configuration cannot be changed at runtime.
- **Secret values**: Variables containing secrets (ending in `_KEY` or `_SECRET`) use Pydantic's `SecretStr` type, which:
  - Prevents secret values from appearing in logs
  - Hides secrets in error messages and repr output
  - Must call `.get_secret_value()` to access actual value (framework handles this automatically)
- **Production validation**: In production environment, the application enforces:
  - Secret values cannot be `"changethis"` (will raise error on startup)
  - CORS origins cannot include wildcard `*` (will raise error on startup)
- **Local development**: Same validation applies, but `"changethis"` secrets emit warnings instead of errors

## Working with Specific Services

### Stop/Start Services

To develop one component independently while Docker Compose runs everything else:

**Stop frontend in Docker, run locally:**

```bash
docker compose stop frontend
cd frontend
bun install
bun run dev
```

Frontend will still be at http://localhost:5173, but from your local Bun dev server instead of Docker.

**Stop backend in Docker, run locally:**

```bash
docker compose stop backend
cd backend
uv sync
fastapi dev app/main.py
```

Backend will be at http://localhost:8000 from your local uvicorn server.

**Stop specific service:**

```bash
docker compose stop backend  # Stop backend
docker compose logs backend  # View service logs
docker compose restart backend  # Restart service
```

## Database Setup

Migrations are managed by the Supabase CLI. To apply pending migrations:

```bash
supabase db push
```

To create a new migration after schema changes:

```bash
supabase migration new <description-of-changes>
# Edit the generated SQL file in supabase/migrations/
supabase db push
```

## Branch Protection

Configure GitHub branch protection rules for the `main` branch to enforce CI quality gates:

**Navigate to:** GitHub repository → Settings → Branches → Add branch protection rule

### Recommended Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Branch name pattern | `main` | Protect the default branch |
| Require a pull request before merging | Enabled | Prevent direct pushes |
| Required approvals | 1 | At least one reviewer |
| Require status checks to pass | Enabled | Block merge on CI failure |
| Required status checks | `CI Complete`, `alls-green-playwright` | Gate on all CI + E2E |
| Require branches to be up to date | Enabled | Ensure branch is current |
| Do not allow bypassing | Enabled (recommended) | Even admins go through PR |

### Required Status Checks

These jobs must pass before a PR can merge:

- **`CI Complete`** — Backend lint, backend tests (90% coverage), frontend lint + build, frontend unit tests (80% coverage), Docker build
- **`alls-green-playwright`** — Playwright E2E tests across 4 shards (skipped if no frontend/backend changes)

### Additional Recommendations

- **Disable force push** to `main` — prevents history rewriting
- **Disable branch deletion** for `main` — prevents accidental deletion
- **Require linear history** (optional) — enforces squash or rebase merges

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5173 already in use | Kill the process: `lsof -ti:5173 \| xargs kill -9` or change in compose.override.yml |
| Port 8000 already in use | Kill the process: `lsof -ti:8000 \| xargs kill -9` or change in compose.override.yml |
| Supabase connection error | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`. Check Supabase dashboard for service status |
| Migrations failing | Check Supabase dashboard for migration status. Re-run: `supabase db push` |
| Backend/frontend not connecting | Verify `BACKEND_CORS_ORIGINS` in .env. Check logs: `docker compose logs backend` |
| `docker compose watch` not syncing code | Volumes mount correctly. Check logs: `docker compose logs backend` or `docker compose logs frontend` |
| Backend logs show plain text instead of JSON | Verify `LOG_FORMAT=json` in `.env`. Default is `json`; the console renderer only activates when `LOG_FORMAT=console`. |
| Supabase connection error | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct. Check Supabase dashboard. |
| Clerk auth errors | Verify `CLERK_SECRET_KEY` is correct. Check Clerk dashboard for valid key. |
| Settings validation error | Verify no secret values are `"changethis"` in non-local environments. Restart: `docker compose down && docker compose watch` |

## Docker Compose Files

- **compose.yml** - Main config with backend and frontend services
- **compose.override.yml** - Development overrides: ports, live reload, Traefik proxy, Playwright

After changing `.env`, restart the stack:

```bash
docker compose down && docker compose watch
```

## Next Steps

1. Read [Development Workflow](./development.md) to learn daily commands
2. Read [Contributing Guidelines](./contributing.md) for code standards
3. Check [Deployment Environments](../deployment/environments.md) to understand environments
4. Explore the [backend API docs](http://localhost:8000/docs) to see available endpoints

## Related

- [Development Workflow](./development.md)
- [Contributing Guidelines](./contributing.md)
- [Deployment Environments](../deployment/environments.md)
