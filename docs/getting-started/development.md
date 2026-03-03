---
title: "Development Workflow"
doc-type: how-to
status: published
last-updated: 2026-03-03
updated-by: "initialise skill"
related-code:
  - backend/pyproject.toml
  - frontend/package.json
  - .pre-commit-config.yaml
  - scripts/test.sh
  - scripts/generate-client.sh
  - compose.override.yml
  - supabase/config.toml
  - supabase/migrations/**
related-docs:
  - docs/getting-started/setup.md
  - docs/getting-started/contributing.md
  - docs/deployment/ci-pipeline.md
tags: [development, workflow, getting-started]
---

# Development Workflow

## Daily Commands

### Full Stack (Docker)

Start all services with live reload:

```bash
docker compose watch
```

This syncs code changes to running containers automatically.

### Backend Only

**Run locally with uv:**

```bash
cd backend
uv sync          # Install dependencies
fastapi dev app/main.py  # Start dev server at http://localhost:8000
```

**Run tests:**

```bash
cd backend
bash ../scripts/test.sh
# Or use pytest directly
uv run pytest tests/ -v
uv run pytest tests/ --cov=app  # With coverage
```

**Linting & formatting:**

```bash
cd backend
uv run ruff check --fix   # Fix issues
uv run ruff format        # Format code
uv run mypy backend/app   # Type check
```

**Pre-commit hooks manually:**

```bash
cd backend
uv run prek install -f    # Install hooks (run once)
uv run prek run --all-files  # Run all hooks
```

### Frontend Only

**Run locally with Bun:**

```bash
cd frontend
bun install      # Install dependencies
bun run dev      # Start dev server at http://localhost:5173
```

**Run unit tests:**

```bash
cd frontend
bun run test           # Run all unit tests (Vitest)
bun run test:watch     # Run unit tests in watch mode
bun run test:coverage  # Run unit tests with coverage report
```

**Run E2E tests:**

```bash
cd frontend
bun run test:e2e        # Run all E2E tests (Playwright)
bun run test:e2e:ui     # Run with interactive UI
bunx playwright test --debug  # Debug mode
```

**Linting & formatting:**

```bash
cd frontend
bun run lint   # Check and fix with Biome
```

**Generate API client:**

```bash
bash scripts/generate-client.sh
```

Regenerates TypeScript API client from backend OpenAPI schema.

## Dependency Management

### Backend (Python)

Using `uv` package manager:

```bash
cd backend

# Add a dependency
uv add package-name

# Add dev dependency
uv add --dev package-name

# Update all
uv sync --upgrade

# Check for outdated
uv pip list --outdated
```

Dependency file: `backend/pyproject.toml`

### Frontend (Node)

Using `bun` package manager:

```bash
cd frontend

# Add a dependency
bun add package-name

# Add dev dependency
bun add --dev package-name

# Update all
bun update

# Check lockfile
bun install --frozen-lockfile  # CI mode (don't update)
```

Dependency files: `frontend/package.json`, `frontend/bun.lock`

## Code Quality

### Before Committing

Run the pre-commit checks:

```bash
uv run prek run --all-files
```

Or run individual checks:

```bash
# Backend Python
cd backend
uv run ruff check --fix
uv run ruff format
uv run mypy backend/app

# Frontend TypeScript/JavaScript
cd frontend
bun run lint
```

### Code Conventions

**Backend (Python):**
- Snake_case for files and functions
- PascalCase for classes
- Strict mypy type checking enabled
- Ruff for linting (see `backend/pyproject.toml` for rules)

**Frontend (TypeScript):**
- ES modules
- `@/` path alias for `src/`
- PascalCase for components
- Double quotes, no semicolons
- Biome for linting and formatting

### Import Order

Files should follow this import structure:

```python
# External packages
from fastapi import FastAPI
from pydantic import BaseModel

# Internal modules (absolute paths)
from app.core.config import settings
from app.api.routes import entities

# Relative imports
from .utils import helper_function

# Type imports
from typing import Optional
```

## Database Management

### Database Migrations

This project uses Supabase CLI for database migrations:

| System | Tool | Files | Purpose |
|--------|------|-------|---------|
| **Supabase CLI** | Supabase | `supabase/migrations/` | Entity tables with RLS |

#### Supabase CLI

Before using Supabase CLI, configure your project:

```bash
# Edit supabase/config.toml and set project.id
# Get it from Supabase dashboard → Settings → General → Project Ref
[project]
id = "your-project-ref"
```

Apply entity migrations:

```bash
# From repository root
supabase db push
```

This applies all pending migrations from `supabase/migrations/` to your Supabase project.

Create a new migration:

```bash
supabase migration new create_entities
# Edit the generated file in supabase/migrations/
supabase db push
```

### Database Migration Workflow

**Supabase CLI:**
- New entity tables with row-level security
- PostgreSQL-specific features (triggers, functions, extensions)
- Data requiring user isolation

## API Development

### Swagger UI

Interactive API docs available at: http://localhost:8000/docs

### Generate Frontend Client

After changing backend API routes or models:

```bash
bash scripts/generate-client.sh
```

This:
1. Exports OpenAPI schema from backend
2. Generates TypeScript client in `frontend/src/client/`
3. Runs linting on frontend

The generated client is then used in frontend: `src/client/` (auto-generated, don't edit)

## Branch Workflow

```
main ← develop ← feature/STORY-XXX-description
```

Create feature branches from main:

```bash
git checkout -b feature/STORY-123-user-authentication
```

Make focused commits following conventional commit format:

```
feat(auth): add jwt token refresh endpoint

Implements refresh token rotation for security.

Related to STORY-123
```

Before pushing, ensure all checks pass:

```bash
cd backend && uv run prek run --all-files && bash ../scripts/test.sh
cd frontend && bun run lint && bun run test && bun run test:e2e
```

## Testing Strategy

### Backend (Pytest)

Tests live in `backend/tests/`:
- `tests/unit/` - Service layer, models, core modules (MagicMock, no DB needed)
- `tests/integration/` - Route handlers with TestClient + dependency overrides

```bash
cd backend

# Run all tests
uv run pytest tests/ -v

# Run unit tests only (no DB required)
uv run pytest tests/unit/ -v

# Run integration tests only
uv run pytest tests/integration/ -v

# Run specific test file
uv run pytest tests/unit/test_entity_service.py -v

# Run with coverage
uv run pytest tests/ --cov=app --cov-report=html

# Run tests matching pattern
uv run pytest tests/ -k "test_create" -v
```

### Frontend Unit Tests (Vitest)

Unit tests live in `frontend/src/**/__tests__/`. Run without a running server.

```bash
cd frontend

# Run all unit tests
bun run test

# Run in watch mode (re-runs on file changes)
bun run test:watch

# Run with coverage report
bun run test:coverage
```

### Frontend E2E Tests (Playwright)

E2E tests live in `frontend/tests/`. Auth is handled by `tests/auth.setup.ts`, which injects a `TEST_TOKEN` into `localStorage` via `page.addInitScript()` — no login form interaction is required. The token defaults to `"test-token-for-e2e"` when `TEST_TOKEN` is unset.

```bash
cd frontend

# Run all E2E tests
bun run test:e2e

# Run specific test file
bunx playwright test tests/entities.spec.ts

# Run with UI
bun run test:e2e:ui

# Debug mode
bunx playwright test --debug

# Show reports
bunx playwright show-report
```

## Development Debugging

### Backend Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 50 lines
docker compose logs -n 50 backend

# Follow and filter
docker compose logs -f backend | grep "ERROR"
```

### Frontend Dev Tools

Built-in development features:
- React DevTools browser extension
- TanStack Query DevTools (http://localhost:5173 with dev query tools)
- TanStack Router DevTools

## Performance Tips

### Hot Reload

- **Backend**: Changes to Python files reload automatically with `fastapi dev`
- **Frontend**: Changes to TypeScript/CSS hot-reload with Vite

### Docker Sync

`docker compose watch` syncs local files to containers:

```yaml
# compose.override.yml
develop:
  watch:
    - path: ./backend
      action: sync
```

Only syncs code, not node_modules or .venv.

### Frontend Build

For production builds:

```bash
cd frontend
bun run build  # Builds to dist/
bun run preview  # Preview production build locally
```

## Related

- [Setup Guide](./setup.md)
- [Contributing Guidelines](./contributing.md)
- [Deployment Environments](../deployment/environments.md)
- [CI/CD Pipeline](../deployment/ci-pipeline.md)
