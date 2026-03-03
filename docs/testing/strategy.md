---
title: "Testing Strategy"
doc-type: reference
status: active
last-updated: 2026-03-03
updated-by: "initialise skill"
related-code:
  - "backend/tests/**/*"
  - "frontend/tests/**/*.spec.ts"
  - "frontend/src/**/__tests__/**"
  - "backend/pyproject.toml"
  - "frontend/playwright.config.ts"
  - "frontend/vitest.config.ts"
related-docs:
  - docs/testing/test-registry.md
  - docs/architecture/backend-overview.md
  - docs/architecture/frontend-overview.md
tags: [testing, strategy, quality]
---

# Testing Strategy

## Overview

This project uses a split testing approach: Pytest for backend unit and integration tests, Vitest for frontend unit tests, and Playwright for frontend end-to-end tests. The backend prioritizes unit and integration coverage; the frontend now has both unit tests (Vitest) and E2E workflows (Playwright).

**Backend Framework:** Pytest <8.0.0
**Frontend Unit Framework:** Vitest 4 + Testing Library (React)
**Frontend E2E Framework:** Playwright 1.58.2
**Coverage Target:** 90% backend source coverage (enforced in CI via `coverage` package)
**Frontend Coverage Target:** statements:30, branches:40, functions:18, lines:30 (TODO: raise as coverage improves)

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

### Frontend — Unit (Vitest)

| Command | Purpose |
|---------|---------|
| `bun run test` | Run all unit tests (Vitest) |
| `bun run test:watch` | Run unit tests in watch mode |
| `bun run test:coverage` | Run unit tests with v8 coverage report |

### Frontend — E2E (Playwright)

| Command | Purpose |
|---------|---------|
| `bun run test:e2e` | Run all E2E tests |
| `bun run test:e2e:ui` | Run E2E tests with UI mode |
| `bunx playwright test tests/entities.spec.ts` | Run single E2E test file |

## Test File Conventions

### Backend

| Convention | Pattern | Example |
|------------|---------|---------|
| Location | Separate `tests/` directory | `backend/tests/unit/test_entity_service.py` |
| Naming | `test_*.py` | `test_auth.py`, `test_errors.py` |
| Structure | Function-based with fixtures | `def test_create_entity(client, mock_supabase):` |
| Subdirs | `unit/`, `integration/` | `tests/unit/`, `tests/integration/` |

### Frontend — Unit (Vitest)

| Convention | Pattern | Example |
|------------|---------|---------|
| Location | Co-located `__tests__/` directories | `frontend/src/hooks/__tests__/useAuth.test.ts` |
| Naming | `*.test.ts` / `*.test.tsx` | `useAuth.test.ts`, `theme-provider.test.tsx` |
| Structure | Vitest `describe`/`it`/`expect` + Testing Library | `it("description", () => { render(<Comp />); expect(...) })` |
| Setup file | `frontend/src/test/setup.ts` | Imports `@testing-library/jest-dom` matchers |
| Environment | jsdom | Simulates browser DOM without a real browser |

### Frontend — E2E (Playwright)

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
| Supabase | `MagicMock` with chainable table operations | All resource tests (unit + integration) |
| Auth | `app.dependency_overrides[get_current_principal]` | Tests requiring authenticated user |
| HTTP | httpx / `unittest.mock.patch` | External API calls, HttpClient tests |
| Config | Environment variables set in fixtures before app imports | Settings validation, environment-specific tests |
| External services | `unittest.mock.patch` | Sentry, Clerk SDK |

### Frontend — Unit (Vitest)

| Type | Pattern | When to Use |
|------|---------|-------------|
| Module | `vi.mock("module-path")` | Mocking imports (localStorage, hooks, API clients) |
| Spy | `vi.spyOn(obj, "method")` | Observing calls on existing objects |
| Browser API | `vi.stubGlobal("navigator", ...)` | Mocking browser globals (Clipboard, navigator, etc.) |
| Timer | `vi.useFakeTimers()` / `vi.useRealTimers()` | Time-dependent logic |

### Frontend — E2E (Playwright)

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

### Frontend Unit (vitest.config.ts)

| Metric | Configuration |
|--------|---------------|
| Config file | `frontend/vitest.config.ts` |
| Provider | v8 |
| Environment | jsdom |
| Statements threshold | 30% (TODO: raise as coverage improves) |
| Branches threshold | 40% (TODO: raise as coverage improves) |
| Functions threshold | 18% (TODO: raise as coverage improves) |
| Lines threshold | 30% (TODO: raise as coverage improves) |
| Excluded from coverage | `src/client/**`, `src/routeTree.gen.ts`, `src/components/ui/**`, `src/main.tsx`, `src/test/**` |
| Node 25+ compat | `execArgv: ["--no-webstorage"]` applied conditionally |

### Frontend E2E (playwright.config.ts)

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

> Unit tests in `backend/tests/unit/` can run without database env vars. The conftest guard pattern skips DB-dependent fixtures automatically via `_INTEGRATION_DEPS_AVAILABLE`.

## Related

- [Test Registry](./test-registry.md)
- [Architecture Overview](../architecture/overview.md)
