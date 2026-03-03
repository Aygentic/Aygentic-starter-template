---
title: "Contributing Guidelines"
doc-type: how-to
status: published
last-updated: 2026-03-03
updated-by: "initialise skill"
related-code:
  - .github/workflows/ci.yml
  - .github/workflows/pre-commit.yml
  - .pre-commit-config.yaml
  - backend/pyproject.toml
  - frontend/package.json
related-docs:
  - docs/getting-started/setup.md
  - docs/getting-started/development.md
  - docs/testing/strategy.md
tags: [contributing, guidelines, getting-started]
---

# Contributing Guidelines

## Getting Started

1. Follow the [Setup Guide](./setup.md) to get the stack running locally
2. Read the [Development Workflow](./development.md) for daily commands and conventions
3. Review [Architecture Overview](../architecture/overview.md) to understand the system structure

## Code Standards

### General Principles

- Write clean, idiomatic code that matches the existing style in each layer
- Handle errors explicitly using `ServiceError` (backend) and proper error boundaries (frontend)
- Keep functions focused — one responsibility per function
- Write tests first (TDD): failing test, minimum code to pass, refactor
- Implement exactly what is asked — avoid abstractions beyond the acceptance criteria

### Backend (Python)

- **File/function names:** snake_case
- **Class names:** PascalCase
- **Imports:** absolute paths only (`from app.core.config import settings`, never relative)
- **Linter:** Ruff (auto-fixed on commit via pre-commit)
- **Type checker:** mypy in strict mode — no `Any` without justification
- **Error handling:** `ServiceError(status_code, message, code)` — 3-arg constructor only
- **Logging:** `get_logger(module=__name__)` from `app.core.logging`

### Frontend (TypeScript)

- **Component names:** PascalCase (`EntityCard`, not `entityCard`)
- **Utility names:** camelCase
- **Path alias:** `@/` maps to `./src/` — use it for all internal imports
- **Quotes:** double quotes (Biome enforces this)
- **Semicolons:** none (Biome enforces this)
- **Auto-generated files:** never edit `src/client/`, `src/routeTree.gen.ts`, or `src/components/ui/`

### Import Order

**Backend (enforced by Ruff isort):**

```python
# 1. Standard library
from datetime import datetime
from uuid import UUID

# 2. External packages
from fastapi import APIRouter
from pydantic import BaseModel

# 3. Internal modules (absolute paths only)
from app.core.config import settings
from app.models import EntityPublic
```

**Frontend (enforced by Biome):**

```typescript
// 1. External packages
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

// 2. Internal modules via path alias
import { EntitiesService } from "@/client"
import { useAuth } from "@/hooks/useAuth"

// 3. Relative imports (same component folder only)
import type { EntityCardProps } from "./types"
```

## Pull Request Process

1. **Create a feature branch** from `main` using the branch naming convention:
   `<type>/<STORY-ID>-<brief-description>` (e.g. `feature/AYG-123-user-auth`)

2. **Write tests first** (TDD) before implementing any business logic

3. **Run all checks locally** before pushing:

```bash
# Backend
cd backend
uv run ruff check --fix
uv run ruff format
uv run mypy backend/app
uv run pytest tests/ -v

# Frontend
cd frontend
bun run lint
bun run test
```

4. **Write a clear PR description:**
   - What problem this PR solves
   - How to test the changes
   - Screenshots for any UI changes

5. **Ensure all CI checks pass** — PRs cannot merge until:
   - `CI Complete` (lint, type check, tests, coverage >=90%) passes
   - `alls-green-playwright` passes (E2E tests, if frontend/backend changed)
   - `pre-commit-alls-green` passes (auto-format hooks)

6. **Request a code review** from a team member

7. **Address review feedback** — resolve all review comments before merging

## Commit Messages

Follow conventional commits format with Linear issue references:

```
type(scope): subject line (max 72 chars)

Body explaining what and why, not how.
Wrap at 72 characters.

Related to STORY-XXX
Fixes TASK-YYY

Co-Authored-By: Aygentic AI <ai@aygentic.com>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `style`

**Examples:**

```
feat(entities): add soft-delete support

Adds deleted_at column and filters soft-deleted entities
from all list/get queries. Hard delete remains available
via admin API only.

Related to STORY-456
Fixes TASK-789
```

```
test(entity-service): add coverage for concurrent create

Tests that create_entity is safe under concurrent inserts
by mocking Supabase to return unique IDs each call.

Related to STORY-456
```

## Pre-commit Hooks

Pre-commit hooks run automatically on commit (via `prek`). They also run in CI on every PR.

Install hooks once after cloning:

```bash
cd backend
uv run prek install -f
```

Hooks that run:

| Hook | Purpose |
|------|---------|
| `check-added-large-files` | Prevents committing large binaries |
| `check-toml` | Validates TOML syntax |
| `check-yaml --unsafe` | Validates YAML syntax |
| `end-of-file-fixer` | Ensures files end with newline |
| `trailing-whitespace` | Removes trailing whitespace |
| `biome check --write` | Auto-formats frontend TypeScript/JS |
| `ruff check --fix` | Auto-fixes Python lint issues |
| `ruff format` | Formats Python code |
| `mypy backend/app` | Type-checks Python (strict mode) |
| `bash scripts/generate-client.sh` | Regenerates TypeScript client on backend changes |

The `generate-client.sh` hook auto-regenerates `frontend/src/client/` whenever backend route or model files change. Commit the regenerated client together with your backend changes.

## Testing Requirements

All contributions must include tests. Follow the testing pyramid:

| Level | Coverage | Framework | When |
|-------|---------|-----------|------|
| Unit | Primary | Pytest / Vitest | All business logic, models, service functions |
| Integration | Secondary | Pytest TestClient | Route handlers, API end-to-end |
| E2E | Sparingly | Playwright | Critical user workflows only (when explicitly requested) |

**Backend coverage gate:** CI enforces 90% coverage (`coverage report --fail-under=90`). New code must include sufficient unit and integration tests to maintain this threshold.

**TDD cycle:**
1. Clarify acceptance criteria
2. Write a failing test
3. Write the minimum code to pass
4. Run tests — all green
5. Refactor
6. Repeat for edge cases

## Branch Protection

The `main` branch has protection rules that enforce quality gates. Direct pushes to `main` are disabled. All changes must go through a PR.

Required status checks before merge:
- `CI Complete` — backend lint + tests (90% coverage), frontend lint + build + unit tests, Docker build
- `alls-green-playwright` — E2E tests (skipped if no frontend/backend changes)
- `pre-commit-alls-green` — auto-format hooks

## Related

- [Development Workflow](./development.md)
- [Setup Guide](./setup.md)
- [Testing Strategy](../testing/strategy.md)
- [CI/CD Pipeline](../deployment/ci-pipeline.md)
