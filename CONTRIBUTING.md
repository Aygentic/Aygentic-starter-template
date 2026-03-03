# Contributing to Aygentic Starter Template

Thank you for contributing! This guide covers the essentials for getting started.

## Quick Start

1. [Set up your development environment](docs/getting-started/setup.md)
2. [Read the development workflow](docs/getting-started/development.md)
3. Create a feature branch from `main`
4. Make your changes following the conventions below
5. Open a pull request

## Branch Naming

Branches are created for **stories**, not individual tasks:

```
<type>/<STORY-ID>-<brief-description>
```

Types: `feature/`, `fix/`, `hotfix/`, `chore/`, `docs/`, `refactor/`

Examples:
- `feature/STORY-123-user-authentication`
- `fix/STORY-456-payment-flow-errors`

## Commit Messages

This project uses **conventional commits** with Linear integration:

```
<type>(<scope>): <subject>

<body>

Fixes TASK-125
Related to STORY-123
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`

## Testing Requirements

### Backend (90% coverage required)

```bash
cd backend
uv run pytest tests/unit/ tests/integration/ -v
uv run coverage report --fail-under=90
```

### Frontend (80% coverage required)

```bash
cd frontend
bun run test:coverage
```

### E2E Tests

```bash
docker compose watch  # Start full stack
bunx playwright test  # Run E2E tests
```

## Code Quality

### Backend
```bash
uv run ruff check --fix     # Lint
uv run ruff format           # Format
uv run mypy app              # Type check
```

### Frontend
```bash
bun run lint                 # Biome lint + format
```

## Pull Request Checklist

- [ ] Tests written and passing (TDD: tests first, code second)
- [ ] Backend coverage >= 90%, frontend coverage >= 80%
- [ ] Linters and type checkers passing
- [ ] No debug code or temporary hacks
- [ ] Documentation updated if architecture changed
- [ ] Conventional commit messages with Linear issue references
- [ ] Branch includes story ID in name

## Code Review

All PRs require at least one review before merging. The `CI Complete` status check must pass.

## Need Help?

- [Architecture Overview](docs/architecture/overview.md)
- [API Documentation](docs/api/overview.md)
- [Testing Strategy](docs/testing/strategy.md)
- [Deployment Guide](docs/deployment/environments.md)
