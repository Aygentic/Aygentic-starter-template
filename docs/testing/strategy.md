---
title: "Testing Strategy"
doc-type: reference
status: active
last-updated: 2026-03-01
updated-by: "initialise skill"
related-code:
  - "backend/tests/**/*"
  - "frontend/tests/**/*.spec.ts"
  - "backend/pyproject.toml"
  - "frontend/playwright.config.ts"
related-docs:
  - docs/testing/test-registry.md
  - docs/architecture/overview.md
tags: [testing, strategy, quality]
---

# Testing Strategy

## Overview

This project uses a split testing approach: Pytest for backend unit and integration tests, and Playwright for frontend end-to-end tests. The backend prioritizes unit and integration coverage while the frontend currently focuses on E2E workflows.

**Backend Framework:** Pytest <8.0.0
**Frontend E2E Framework:** Playwright 1.58.2
**Coverage Target:** 90% backend source coverage (enforced in CI via `coverage` package)

## Testing Pyramid

| Level | Proportion | Framework | Purpose |
|-------|-----------|-----------|---------|
| Unit | 70% | Pytest | Service layer, models, core modules, utilities |
| Integration | 20% | Pytest | Route handlers with TestClient, dependency overrides |
| E2E | 10% | Playwright | Critical user workflows (entity CRUD, navigation) |

## Commands

### Backend

| Command | Purpose |
|---------|---------|
| `bash ./scripts/test.sh` | Run all backend tests (from project root) |
| `bash ./scripts/test-local.sh` | Run backend tests locally |
| `uv run pytest backend/tests/unit/ -v` | Run unit tests only |
| `uv run pytest backend/tests/integration/ -v` | Run integration tests only |
| `uv run pytest backend/tests/path/to/test.py` | Run single test file |
| `uv run coverage report` | View coverage report |

### Frontend

| Command | Purpose |
|---------|---------|
| `bunx playwright test` | Run all E2E tests |
| `bunx playwright test --ui` | Run tests with UI mode |
| `bunx playwright test tests/login.spec.ts` | Run single test file |
| `bun run test` | Run tests from project root |

## Test File Conventions

### Backend

| Convention | Pattern | Example |
|------------|---------|---------|
| Location | Separate `tests/` directory | `backend/tests/unit/test_entity_service.py` |
| Naming | `test_*.py` | `test_auth.py`, `test_errors.py` |
| Structure | Function-based with fixtures | `def test_create_entity(client, mock_supabase):` |
| Subdirs | `unit/`, `integration/`, `crud/` (legacy), `api/routes/` (legacy) | `tests/unit/`, `tests/integration/` |

### Frontend

| Convention | Pattern | Example |
|------------|---------|---------|
| Location | Separate `tests/` directory | `frontend/tests/entities.spec.ts` |
| Naming | `*.spec.ts` | `entities.spec.ts`, `navigation.spec.ts` |
| Structure | Playwright test/expect | `test("description", async ({ page }) => {})` |
| Auth setup | Token injection via `addInitScript()` | `tests/auth.setup.ts` injects JWT into localStorage |

## Mocking

### Backend

| Type | Pattern | When to Use |
|------|---------|-------------|
| Supabase | `MagicMock` with chainable table operations | All new resource tests (unit + integration) |
| Auth | `app.dependency_overrides[get_current_principal]` | Tests requiring authenticated user |
| Database (legacy) | pytest fixtures with test DB | Legacy DB-dependent tests (crud/, api/routes/) |
| HTTP | httpx / `unittest.mock.patch` | External API calls, HttpClient tests |
| Config | Environment variables set in fixtures before app imports | Settings validation, environment-specific tests |
| External services | `unittest.mock.patch` | Sentry, Clerk SDK |

### Frontend

| Type | Pattern | When to Use |
|------|---------|-------------|
| Auth state | `page.addInitScript()` token injection into localStorage | Tests requiring authenticated state |
| API | Running Docker backend | Full integration with real API |

## Coverage Configuration

### Backend (pyproject.toml)

| Metric | Configuration |
|--------|---------------|
| Source | `app` directory |
| Dynamic context | `test_function` |
| Report | `show_missing = true`, sorted by `-Cover` |
| HTML | `show_contexts = true` |

### Frontend

| Metric | Configuration |
|--------|---------------|
| Reporter | `html` (local) / `blob` (CI) |
| Trace | On first retry |
| Browsers | Chromium only (Firefox/WebKit available but disabled) |

## Test Fixtures (Backend)

### New Path (unit + integration tests)

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `mock_supabase` | function | MagicMock Supabase client with chainable table operations |
| `test_principal` | function | `Principal(user_id="user_test123")` for auth |
| `client` | function | FastAPI TestClient with mocked Supabase + auth overrides |
| `unauthenticated_client` | function | TestClient with mocked Supabase only (no auth override) |

### Legacy Path (crud + api/routes tests)

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `db` | session | Database session with init_db + cleanup |
| `client` | module | FastAPI TestClient instance |
| `superuser_token_headers` | module | Auth headers for superuser |
| `normal_user_token_headers` | module | Auth headers for regular user |

> Unit tests in `backend/tests/unit/` can run without database env vars. The conftest guard pattern skips DB-dependent fixtures automatically via `_INTEGRATION_DEPS_AVAILABLE`.

## Related

- [Test Registry](./test-registry.md)
- [Architecture Overview](../architecture/overview.md)
