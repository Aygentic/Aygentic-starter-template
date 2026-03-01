---
title: "CI/CD Pipeline"
doc-type: reference
status: published
last-updated: 2026-03-01
updated-by: "infra docs writer (AYG-76)"
related-code:
  - .github/workflows/ci.yml
  - .github/workflows/playwright.yml
  - .github/workflows/pre-commit.yml
  - .github/workflows/deploy-staging.yml
  - .github/workflows/deploy-production.yml
  - .github/workflows/detect-conflicts.yml
  - .github/workflows/smokeshow.yml
  - scripts/test.sh
  - scripts/generate-client.sh
related-docs:
  - docs/deployment/environments.md
  - docs/getting-started/development.md
  - docs/testing/strategy.md
tags: [ci-cd, pipeline, deployment, automation, github-actions]
---

# CI/CD Pipeline

## Pipeline Overview

This project uses GitHub Actions for all CI/CD automation. Seven workflows cover testing, code quality, deployment, and repository management.

```
Push / PR
   │
   ├── pre-commit.yml          ─ Lint, format, type check, generate client
   ├── ci.yml                  ─ Pytest + coverage >=90%
   ├── playwright.yml          ─ E2E tests across 4 shards
   ├── detect-conflicts.yml    ─ Label PRs with merge conflicts
   │
   └── On merge to main:
         ├── deploy-staging.yml ─ Build+push to GHCR, pluggable deploy to staging
         └── smokeshow.yml      ─ Publish coverage HTML report

On GitHub Release (published):
   └── deploy-production.yml   ─ Promote GHCR image (SHA→version+latest), pluggable deploy
```

---

## Workflow Inventory

| Workflow | File | Trigger(s) | Purpose | Runner |
|----------|------|------------|---------|--------|
| CI | `ci.yml` | push main, PR (opened/sync) | Lint, test, build, coverage >=90% | ubuntu-latest |
| Playwright Tests | `playwright.yml` | push main, PR (opened/sync), workflow_dispatch | E2E tests (4-shard matrix) | ubuntu-latest |
| pre-commit | `pre-commit.yml` | PR (opened/sync) | Lint, format, type check, client gen | ubuntu-latest |
| Deploy to Staging | `deploy-staging.yml` | push main | Build+push to GHCR, pluggable deploy to staging | ubuntu-latest |
| Deploy to Production | `deploy-production.yml` | release published | Promote GHCR image (no rebuild), pluggable deploy to production | ubuntu-latest |
| Conflict Detector | `detect-conflicts.yml` | push, pull_request_target (sync) | Label PRs with merge conflicts | ubuntu-latest |
| Smokeshow | `smokeshow.yml` | workflow_run: CI (completed) | Publish coverage HTML as GitHub status | ubuntu-latest |

---

## Workflow: CI

**File:** `.github/workflows/ci.yml`

### Triggers

| Event | Branches | Conditions |
|-------|----------|------------|
| `push` | main | All files |
| `pull_request` | Any | opened, synchronize |

### Jobs

| Job | Runner | Depends On |
|-----|--------|------------|
| `backend-lint` | ubuntu-latest | — |
| `backend-test` | ubuntu-latest | — |
| `frontend-ci` | ubuntu-latest | — |
| `docker-build` | ubuntu-latest | — |
| `alls-green` | ubuntu-latest | all above |

### Steps (backend-test)

1. Checkout code (`actions/checkout@v6`)
2. Set up Python 3.10 (`actions/setup-python@v6`)
3. Install uv (`astral-sh/setup-uv@v7`)
4. Run tests: `uv run pytest` with coverage
   - Tests are located in `backend/tests/unit/` and `backend/tests/integration/`
5. Upload `backend/htmlcov` as artifact `coverage-html` (hidden files included)
6. Enforce coverage: `uv run coverage report --fail-under=90`

### Artifacts

| Artifact | Produced By | Retention |
|----------|-------------|-----------|
| `coverage-html` | `backend-test` job | Default (90 days) |

### Secrets & Variables

None required beyond `GITHUB_TOKEN` (implicit).

---

## Workflow: Playwright Tests

**File:** `.github/workflows/playwright.yml`

### Triggers

| Event | Branches | Conditions |
|-------|----------|------------|
| `push` | main | All files |
| `pull_request` | Any | opened, synchronize |
| `workflow_dispatch` | Any | `debug_enabled` input (optional) |

Path filter (`dorny/paths-filter@v3`) — the `test-playwright` job only runs if these paths changed:
- `backend/**`
- `frontend/**`
- `.env`
- `compose*.yml`
- `.github/workflows/playwright.yml`

**Note:** `compose.gateway.yml` matches the `compose*.yml` glob pattern but is a reference-only file that is never used by the template directly; changes to it do not affect application behaviour and will not produce meaningful test differences.

### Jobs

| Job | Runner | Depends On | Notes |
|-----|--------|------------|-------|
| `changes` | ubuntu-latest | — | Runs paths-filter; outputs `changed` flag |
| `test-playwright` | ubuntu-latest | `changes` | Matrix: 4 shards, `fail-fast: false`, 60 min timeout |
| `merge-playwright-reports` | ubuntu-latest | `test-playwright`, `changes` | Runs even if shards failed |
| `alls-green-playwright` | ubuntu-latest | `test-playwright` | Branch protection gate; allows skip |

### Steps — test-playwright (per shard)

1. Checkout (`actions/checkout@v6`)
2. Setup Bun (`oven-sh/setup-bun@v2`)
3. Setup Python 3.10 (`actions/setup-python@v6`)
4. Optional tmate debug session (if `workflow_dispatch` with `debug_enabled=true`)
5. Install uv (`astral-sh/setup-uv@v7`)
6. `uv sync` (backend)
7. `bun ci` (frontend)
8. `bash scripts/generate-client.sh` — regenerate TypeScript client
9. `docker compose build`
10. `docker compose down -v --remove-orphans`
11. Run tests: `docker compose run --rm playwright bunx playwright test --fail-on-flaky-tests --trace=retain-on-failure --shard=N/4`
12. `docker compose down -v --remove-orphans`
13. Upload blob report artifact `blob-report-N` (retention: 1 day)

### Steps — merge-playwright-reports

1. Checkout, setup Bun, `bun ci`
2. Download all `blob-report-*` artifacts
3. `bunx playwright merge-reports --reporter html ./all-blob-reports`
4. Upload merged HTML report as `html-report--attempt-N` (retention: 30 days)

### Artifacts

| Artifact | Produced By | Retention |
|----------|-------------|-----------|
| `blob-report-1` to `blob-report-4` | `test-playwright` (each shard) | 1 day |
| `html-report--attempt-N` | `merge-playwright-reports` | 30 days |

### Secrets & Variables

| Name | Purpose | Required |
|------|---------|----------|
| `TEST_TOKEN` | Auth token injected into `localStorage` by `tests/auth.setup.ts` via `page.addInitScript()`. Defaults to `"test-token-for-e2e"` when unset. No `FIRST_SUPERUSER` credentials needed. | No (has default) |
| `GITHUB_TOKEN` | Implicit — artifact download and status checks | Yes (auto) |

---

## Workflow: pre-commit

**File:** `.github/workflows/pre-commit.yml`

### Triggers

| Event | Branches | Conditions |
|-------|----------|------------|
| `pull_request` | Any | opened, synchronize |

### Jobs

| Job | Runner | Depends On |
|-----|--------|------------|
| `pre-commit` | ubuntu-latest | — |
| `pre-commit-alls-green` | ubuntu-latest | `pre-commit` (branch protection gate) |

### Steps

Checks `PRE_COMMIT` secret availability to differentiate own-repo vs fork:

**Own-repo (has secrets):**
1. Checkout PR branch head (full history, with `PRE_COMMIT` token)
2. Setup Bun, Python 3.11, uv (with cache)
3. `uv sync --all-packages`
4. `bun ci`
5. `uvx prek run --from-ref origin/${GITHUB_BASE_REF} --to-ref HEAD --show-diff-on-failure` (continue-on-error)
6. Commit and push auto-fixes if any (as `github-actions[bot]`)
7. Exit 1 if prek found errors

**Fork (no secrets):**
1. Default checkout
2. Same setup steps
3. Same prek run
4. `pre-commit-ci/lite-action@v1.1.0` handles commit/push for forks

### Pre-commit Hooks Run

- `check-added-large-files`
- `check-toml`
- `check-yaml --unsafe`
- `end-of-file-fixer` (excludes generated client and email templates)
- `trailing-whitespace` (excludes generated client)
- `biome check --write` (frontend files)
- `ruff check --fix` (Python files)
- `ruff format` (Python files)
- `mypy backend/app` (Python, strict mode)
- `bash scripts/generate-client.sh` (on backend changes)

### Secrets

| Name | Purpose | Required |
|------|---------|----------|
| `PRE_COMMIT` | Push auto-fixed code back to branch (own-repo only) | No (falls back to fork mode) |

---

## Workflow: Deploy to Staging

**File:** `.github/workflows/deploy-staging.yml`

### Triggers

| Event | Branches | Conditions |
|-------|----------|------------|
| `push` | main | All files |

### Concurrency

```
group: deploy-staging
cancel-in-progress: true
```

Concurrent staging deploys are cancelled — only the latest push to `main` deploys.

### Permissions

| Permission | Level |
|-----------|-------|
| `contents` | read |
| `packages` | write (required for GHCR push) |

### Jobs

| Job | Runner | Depends On |
|-----|--------|------------|
| `deploy` | ubuntu-latest | — |

### Steps

1. Checkout (`actions/checkout@v6`)
2. Log in to GHCR (`docker/login-action@v3`) — authenticates using `GITHUB_TOKEN` (automatic)
3. Build and push Docker image (`docker/build-push-action@v6`):
   - Context: `.` (repository root), Dockerfile: `backend/Dockerfile`
   - Tags pushed: `ghcr.io/{repo}/backend:{sha}` and `ghcr.io/{repo}/backend:staging`
   - Build args: `GIT_COMMIT=${{ github.sha }}`, `BUILD_TIME=${{ github.event.head_commit.timestamp }}`
4. Pluggable Deploy — uncomment one platform block in the workflow file:
   - **Railway**: `railway up --service` with `RAILWAY_TOKEN`
   - **Alibaba Cloud ACR + ECS**: re-tag to ACR, update ECS service
   - **Google Cloud Run**: `google-github-actions/deploy-cloudrun@v2` with `GCP_SERVICE_NAME`
   - **Fly.io**: `flyctl deploy --image` with `FLY_API_TOKEN`
   - **Self-hosted via SSH**: `ssh DEPLOY_HOST "docker pull ... && docker compose up -d"`

### Secrets

| Secret | Source | Description |
|--------|--------|-------------|
| `GITHUB_TOKEN` | Automatic | Authenticates GHCR login and image push — no configuration required |
| Platform secrets | Platform-dependent | See pluggable deploy options below |

**Platform-specific secrets (depends on chosen deploy target):**

| Secret | Platform |
|--------|----------|
| `RAILWAY_TOKEN` + `RAILWAY_SERVICE_ID_STAGING` | Railway |
| `ALIBABA_ACCESS_KEY` + `ALIBABA_SECRET_KEY` | Alibaba Cloud (ACR + ECS) |
| `GCP_SA_KEY` + `GCP_SERVICE_NAME` | Google Cloud Run |
| `FLY_API_TOKEN` | Fly.io |
| `DEPLOY_HOST` | Self-hosted via SSH |

---

## Workflow: Deploy to Production

**File:** `.github/workflows/deploy-production.yml`

### Triggers

| Event | Conditions |
|-------|------------|
| `release` published | Triggered by publishing a GitHub Release |

### Concurrency

```
group: deploy-production
cancel-in-progress: false
```

Production deployments are never cancelled mid-flight — a second release queues behind the first.

### Permissions

| Permission | Level |
|-----------|-------|
| `contents` | read |
| `packages` | write (required for GHCR push) |

### Jobs

| Job | Runner | Depends On |
|-----|--------|------------|
| `deploy` | ubuntu-latest | — |

### Steps

1. Checkout (`actions/checkout@v6`)
2. Log in to GHCR (`docker/login-action@v3`) — authenticates using `GITHUB_TOKEN` (automatic)
3. Promote staging image to production (no rebuild — image promotion only):
   - Pull `ghcr.io/{repo}/backend:{sha}` (the exact image built and validated on staging)
   - Re-tag as `ghcr.io/{repo}/backend:{release.tag_name}` (e.g. `v1.2.3`)
   - Re-tag as `ghcr.io/{repo}/backend:latest`
   - Push both new tags to GHCR
4. Pluggable Deploy — uncomment one platform block in the workflow file:
   - **Railway**: `railway up --service` with `RAILWAY_TOKEN`
   - **Alibaba Cloud ACR + ECS**: re-tag to ACR, update ECS service
   - **Google Cloud Run**: `google-github-actions/deploy-cloudrun@v2` with `GCP_SERVICE_NAME`
   - **Fly.io**: `flyctl deploy --image` with `FLY_API_TOKEN`
   - **Self-hosted via SSH**: `ssh DEPLOY_HOST "docker pull ... && docker compose up -d"`

**Important:** The production image is the same binary that ran on staging — no new build occurs. This guarantees what was tested is what ships.

### Secrets

| Secret | Source | Description |
|--------|--------|-------------|
| `GITHUB_TOKEN` | Automatic | Authenticates GHCR login and image push — no configuration required |
| Platform secrets | Platform-dependent | See pluggable deploy options below |

**Platform-specific secrets (depends on chosen deploy target):**

| Secret | Platform |
|--------|----------|
| `RAILWAY_TOKEN` + `RAILWAY_SERVICE_ID_PRODUCTION` | Railway |
| `ALIBABA_ACCESS_KEY` + `ALIBABA_SECRET_KEY` | Alibaba Cloud (ACR + ECS) |
| `GCP_SA_KEY` + `GCP_SERVICE_NAME` | Google Cloud Run |
| `FLY_API_TOKEN` | Fly.io |
| `DEPLOY_HOST` | Self-hosted via SSH |

---

## Workflow: Conflict Detector

**File:** `.github/workflows/detect-conflicts.yml`

### Triggers

| Event | Conditions |
|-------|------------|
| `push` | All branches |
| `pull_request_target` | synchronize |

### Jobs

| Job | Runner | Steps |
|-----|--------|-------|
| `main` | ubuntu-latest | `eps1lon/actions-label-merge-conflict@v3` — adds `conflicts` label and posts a comment if a PR has a merge conflict |

### Permissions

- `contents: read`
- `pull-requests: write`

---

## Workflow: Smokeshow

**File:** `.github/workflows/smokeshow.yml`

### Triggers

| Event | Conditions |
|-------|------------|
| `workflow_run` | Triggered when `CI` workflow completes |

### Jobs

| Job | Runner | Steps |
|-----|--------|-------|
| `smokeshow` | ubuntu-latest | Checkout, Python 3.13, `pip install smokeshow`, download `coverage-html` artifact from triggering run, `smokeshow upload backend/htmlcov` |

Sets a GitHub commit status `coverage` with the coverage percentage. Fails if coverage < 90%.

### Secrets

| Name | Purpose | Required |
|------|---------|----------|
| `SMOKESHOW_AUTH_KEY` | Smokeshow service auth key | Yes |
| `GITHUB_TOKEN` | Download artifacts, set commit status | Yes (auto) |

---

## Branch → Pipeline Mapping

| Event | Workflows Triggered | Deploy Target |
|-------|---------------------|---------------|
| PR opened or updated | pre-commit, CI, Playwright (if paths changed), Conflict Detector | None |
| Push to `main` | CI, Playwright, Deploy Staging | Staging (GHCR + pluggable deploy) |
| GitHub Release published | Deploy Production | Production (GHCR image promotion + pluggable deploy) |
| `workflow_run: CI` completes | Smokeshow | — (coverage report) |

---

## Required Secrets

Configure these in: **GitHub repository → Settings → Secrets and variables → Actions**

### Deployment Secrets (Required for staging/production)

**GHCR authentication:** `GITHUB_TOKEN` is automatically provided by GitHub Actions for all workflows — no configuration required. Both deploy workflows use it to authenticate with `ghcr.io`.

**Platform-specific deploy secrets** are required only for the pluggable deploy step. Configure only the secrets matching your chosen deploy platform:

| Secret | Used By | Platform | Description |
|--------|---------|----------|-------------|
| `RAILWAY_TOKEN` | Both deploy workflows | Railway | Railway API token for deployment |
| `RAILWAY_SERVICE_ID_STAGING` | `deploy-staging.yml` | Railway | Railway service ID for staging |
| `RAILWAY_SERVICE_ID_PRODUCTION` | `deploy-production.yml` | Railway | Railway service ID for production |
| `ALIBABA_ACCESS_KEY` | Both deploy workflows | Alibaba Cloud (ACR + ECS) | Alibaba Cloud access key ID |
| `ALIBABA_SECRET_KEY` | Both deploy workflows | Alibaba Cloud (ACR + ECS) | Alibaba Cloud secret access key |
| `GCP_SA_KEY` | Both deploy workflows | Google Cloud Run | Service account JSON key |
| `GCP_SERVICE_NAME` | Both deploy workflows | Google Cloud Run | Cloud Run service name |
| `FLY_API_TOKEN` | Both deploy workflows | Fly.io | Fly.io API token |
| `DEPLOY_HOST` | Both deploy workflows | Self-hosted SSH | SSH connection string (user@host) |

### Automation Secrets (Optional)

| Secret | Used By | Description |
|--------|---------|-------------|
| `PRE_COMMIT` | `pre-commit.yml` | PAT with push permission — allows bot to commit auto-fixes |
| `SMOKESHOW_AUTH_KEY` | `smokeshow.yml` | Smokeshow.io auth key for hosting coverage reports |

---

## Self-Hosted Runners

Both deploy workflows (`deploy-staging.yml` and `deploy-production.yml`) run on `ubuntu-latest` (GitHub-hosted). Self-hosted runners are **not required** for the core build and image promotion steps.

Self-hosted infrastructure is one of the five available pluggable deploy options. If you choose the SSH deploy pattern:

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | SSH connection string (e.g. `deploy@staging.example.com`) |

The SSH deploy step issues a `docker pull` and `docker compose up -d` on your server — the server only needs Docker and network access to `ghcr.io`. No GitHub Actions runner needs to be installed on the server.

To use a self-hosted runner instead of `ubuntu-latest` for the build step, change `runs-on: ubuntu-latest` to `runs-on: self-hosted` in the workflow file and register a runner at: **GitHub repository → Settings → Actions → Runners → New self-hosted runner**

---

## Local Reproduction

Run all CI checks locally before pushing:

```bash
# Backend: lint, type check, format
cd backend
uv run ruff check --fix
uv run ruff format
uv run mypy backend/app

# Backend: tests with coverage
uv run pytest backend/tests/unit/ backend/tests/integration/ -v --cov=app
uv run coverage report --fail-under=90

# Frontend: lint
cd frontend
bun run lint

# Frontend: E2E tests (requires full stack running)
docker compose watch  # In another terminal
bunx playwright test

# All pre-commit hooks
cd backend
uv run prek run --all-files

# Generate API client (after backend changes)
bash scripts/generate-client.sh
```

---

## Dependencies

### Backend Runtime Dependencies

The backend requires these core dependencies (defined in `backend/pyproject.toml`):

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `fastapi` | >=0.114.2 | Web framework |
| `sqlmodel` | >=0.0.21 | ORM with SQLAlchemy |
| `pydantic-settings` | >=2.2.1 | Configuration management |
| `sentry-sdk` | >=2.0.0 | Error tracking |
| `structlog` | >=24.1.0 | Structured logging |
| `supabase` | >=2.0.0 | Supabase client library |
| `clerk-backend-api` | >=1.0.0,<2.0.0 | Clerk authentication |

**Test Environment Requirements:**

For CI/CD pipelines, ensure these environment variables are set:

```bash
SUPABASE_URL=<project-url>           # Required
SUPABASE_SERVICE_KEY=<service-key>   # Required, must be valid (not "changethis")
CLERK_SECRET_KEY=<secret-key>        # Required, must be valid (not "changethis")
ENVIRONMENT=local                    # Relaxed validation for tests
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Test Backend fails on migration step | DB not healthy yet | Check `docker compose up -d db mailcatcher` health check passes before prestart |
| Coverage below 90% | New code without tests | Add tests; view coverage report in Artifacts → `coverage-html` |
| Playwright shards fail inconsistently | Flaky tests (`--fail-on-flaky-tests`) | Identify flaky test from HTML report artifact; fix race conditions |
| Deploy to staging fails | GHCR push permission denied | Verify `GITHUB_TOKEN` has `packages: write` permission in the workflow |
| Deploy to staging fails | Pluggable deploy step not configured | Uncomment one platform block in `deploy-staging.yml` |
| Deploy to production fails | Staging image not found by SHA | Ensure the staging workflow completed successfully before publishing the release |
| Deploy to production fails | Pluggable deploy step not configured | Uncomment one platform block in `deploy-production.yml` |
| pre-commit fails on fork | No `PRE_COMMIT` secret (expected) | Fork uses `pre-commit-ci/lite-action` fallback — this is normal |
| Smokeshow fails | Missing `SMOKESHOW_AUTH_KEY` | Register at smokeshow.io and add key to secrets |
| Tests pass locally but fail in CI | Python or Bun version mismatch | CI uses Python 3.10 and Bun latest — check your local versions match |
