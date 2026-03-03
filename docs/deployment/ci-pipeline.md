---
title: "CI/CD Pipeline"
doc-type: reference
status: published
last-updated: 2026-03-03
updated-by: "chore/fix-github-workflows merge"
related-code:
  - .github/workflows/ci.yml
  - .github/workflows/playwright.yml
  - .github/workflows/pre-commit.yml
  - .github/workflows/deploy-staging.yml
  - .github/workflows/deploy-production.yml
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

This project uses GitHub Actions for all CI/CD automation. Five workflows cover testing, code quality, and deployment.

```
Push / PR
   │
   ├── pre-commit.yml          ─ Lint, format, type check, generate client
   ├── ci.yml                  ─ Pytest + coverage >=90%
   ├── playwright.yml          ─ E2E tests across 4 shards
   │
   └── On workflow_dispatch (manual):
         └── deploy-staging.yml ─ Build+push to GHCR, pluggable deploy to staging

On workflow_dispatch (manual):
   └── deploy-production.yml   ─ Promote GHCR image (inputs.sha→version+latest), pluggable deploy
```

---

## Workflow Inventory

| Workflow | File | Trigger(s) | Purpose | Runner |
|----------|------|------------|---------|--------|
| CI | `ci.yml` | push main, PR (opened/sync) | Lint, test, build, coverage >=90% | ubuntu-latest |
| Playwright Tests | `playwright.yml` | push main, PR (opened/sync), workflow_dispatch | E2E tests (4-shard matrix) | ubuntu-latest |
| pre-commit | `pre-commit.yml` | PR (opened/sync) | Lint, format, type check, client gen | ubuntu-latest |
| Deploy to Staging | `deploy-staging.yml` | workflow_dispatch (manual) | Build+push to GHCR, pluggable deploy to staging | ubuntu-latest |
| Deploy to Production | `deploy-production.yml` | workflow_dispatch (manual) | Promote GHCR image (no rebuild), pluggable deploy to production | ubuntu-latest |

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
2. Set up Python 3.12 (`actions/setup-python@v6`)
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
3. Setup Python 3.12 (`actions/setup-python@v6`)
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
2. Setup Bun, Python 3.12, uv (with cache)
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
- `end-of-file-fixer` (excludes generated client)
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
| `workflow_dispatch` | Any | Manual trigger (enable push trigger when deployment target is configured) |

### Concurrency

```
group: deploy-staging
cancel-in-progress: true
```

Concurrent manual staging deploys are cancelled — only the latest dispatch runs.

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
| `workflow_dispatch` | Manual trigger with `tag` and `sha` inputs |

**Inputs:**

| Input | Required | Description |
|-------|----------|-------------|
| `tag` | Yes | Image tag to promote to production (e.g. `v1.2.3`) |
| `sha` | Yes | Git SHA of the staging image to promote (from staging deploy logs) |

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
3. Verify staging image exists: `docker manifest inspect ghcr.io/{repo}/backend:{inputs.sha}`
4. Promote staging image to production (no rebuild — image promotion only):
   - Pull `ghcr.io/{repo}/backend:{inputs.sha}` (the exact image built and validated on staging)
   - Re-tag as `ghcr.io/{repo}/backend:{inputs.tag}` (e.g. `v1.2.3`)
   - Re-tag as `ghcr.io/{repo}/backend:latest`
   - Push both new tags to GHCR
5. Pluggable Deploy — uncomment one platform block in the workflow file:
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

## Branch → Pipeline Mapping

| Event | Workflows Triggered | Deploy Target |
|-------|---------------------|---------------|
| PR opened or updated | pre-commit, CI, Playwright (if paths changed) | None |
| Push to `main` | CI, Playwright | None (Deploy Staging is manual `workflow_dispatch`) |
| Manual workflow_dispatch | Deploy Production | Production (GHCR image promotion + pluggable deploy) |

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
| `PRE_COMMIT` | `pre-commit.yml` | Fine-Grained PAT: Contents → Read and write (commits trigger CI) |

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

## GitHub Environments

Configure GitHub Environments for deployment isolation and approval gates:

**Navigate to:** GitHub repository → Settings → Environments

### Staging Environment

| Setting | Value |
|---------|-------|
| Name | `staging` |
| Deployment branches | `main` only |
| Required reviewers | None (auto-deploy on merge) |
| Environment secrets | Platform-specific deploy secrets |

### Production Environment

| Setting | Value |
|---------|-------|
| Name | `production` |
| Deployment branches | `main` only |
| Required reviewers | 1-2 team members |
| Wait timer | 0-15 minutes (optional) |
| Environment secrets | Platform-specific deploy secrets |

Environment-scoped secrets override repository-level secrets, allowing different credentials per environment (e.g., separate database URLs for staging vs production).

---

## Security Scanning

### CodeQL SAST

**File:** `.github/workflows/codeql.yml`

| Property | Value |
|----------|-------|
| Trigger | Push to main, PRs |
| Languages | Python, JavaScript/TypeScript |
| Results | GitHub Security tab → Code scanning alerts |

CodeQL performs static analysis to detect security vulnerabilities (SQL injection, XSS, path traversal, etc.) and code quality issues.

### Dependency Auditing

Dependency auditing runs as part of the CI workflow:

| Tool | Scope | Database |
|------|-------|----------|
| `pip-audit` | Backend Python packages | OSV (Open Source Vulnerabilities) |
| `bun audit` | Frontend npm packages | npm advisory database |

Both tools fail the CI pipeline on known vulnerabilities.

### Container Scanning (Trivy)

Container images are scanned before push in deploy workflows:

| Property | Value |
|----------|-------|
| Scanner | Trivy |
| Fail threshold | CRITICAL, HIGH |
| Results | GitHub Security tab (SARIF upload) |

### Supply Chain Attestation

Deploy workflows sign container images with Cosign (keyless via GitHub OIDC):

| Property | Value |
|----------|-------|
| Signing | Cosign keyless (Sigstore Fulcio CA) |
| Transparency log | Rekor |
| SBOM | Generated by `docker/build-push-action` |
| Provenance | Build provenance attestation |

Verify a signed image:
```bash
cosign verify ghcr.io/<org>/<repo>/backend:staging \
  --certificate-identity-regexp="https://github.com/<org>/<repo>" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

---

## Release Automation

### release-please

**File:** `.github/workflows/release.yml`

Automated release management using [release-please](https://github.com/googleapis/release-please):

1. Push conventional commits to `main`
2. release-please accumulates changes and maintains a Release PR
3. The Release PR contains: version bump, changelog updates
4. A human reviews and merges the Release PR
5. On merge: Git tag + GitHub Release created automatically

**Configuration:**
- `release-please-config.json` — Monorepo package configuration
- `.release-please-manifest.json` — Current version tracking

---

## Migration Validation

Supabase migrations in `supabase/migrations/` can be validated locally:

```bash
# Lint SQL migrations for common issues
supabase db lint

# Dry-run migrations against a local Supabase instance
supabase start
supabase db push --dry-run
```

**Note:** Supabase CLI is not included in CI by default. To add migration validation:
1. Add `supabase` CLI setup step to CI
2. Run `supabase db lint` against migration files
3. Optionally run dry-run migrations against a throwaway database

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Test Backend fails on startup | Backend not healthy yet | Check `docker compose logs backend` for startup errors and verify environment variables |
| Coverage below 90% | New code without tests | Add tests; view coverage report in Artifacts → `coverage-html` |
| Playwright shards fail inconsistently | Flaky tests (`--fail-on-flaky-tests`) | Identify flaky test from HTML report artifact; fix race conditions |
| Deploy to staging fails | GHCR push permission denied | Verify `GITHUB_TOKEN` has `packages: write` permission in the workflow |
| Deploy to staging fails | Pluggable deploy step not configured | Uncomment one platform block in `deploy-staging.yml` |
| Deploy to production fails | Staging image not found by SHA | Ensure the staging workflow completed and use the correct SHA from staging deploy logs |
| Deploy to production fails | Pluggable deploy step not configured | Uncomment one platform block in `deploy-production.yml` |
| pre-commit fails on fork | No `PRE_COMMIT` secret (expected) | Fork uses `pre-commit-ci/lite-action` fallback — this is normal |
| Tests pass locally but fail in CI | Python or Bun version mismatch | CI uses Python 3.12 and Bun latest — check your local versions match |
