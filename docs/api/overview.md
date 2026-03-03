---
title: "API Overview"
doc-type: reference
status: active
version: "1.9.0"
base-url: "/api/v1"
last-updated: 2026-03-03
updated-by: "initialise skill"
related-code:
  - backend/app/main.py
  - backend/app/api/main.py
  - backend/app/api/deps.py
  - backend/app/api/routes/entities.py
  - backend/app/api/routes/health.py
  - backend/app/models/entity.py
  - backend/app/models/common.py
  - backend/app/services/entity_service.py
  - backend/app/core/auth.py
  - backend/app/core/config.py
  - backend/app/core/errors.py
  - backend/app/core/middleware.py
related-docs:
  - docs/architecture/backend-overview.md
  - docs/data/models.md
  - docs/api/error-codes.md
tags: [api, rest, overview]
---

# API Overview

## Base Information

| Property | Value |
|----------|-------|
| Base URL | `http://localhost:8000/api/v1` |
| Authentication | Clerk JWT (Bearer token) |
| Content Type | `application/json` |
| API Version | 1.1.0 |
| OpenAPI Spec | `GET /api/v1/openapi.json` |
| Swagger UI | `GET /docs` |
| ReDoc | `GET /redoc` |

## Authentication

> **AYG-65:** Authentication has migrated from an internal HS256 JWT to **Clerk JWT**. Auth uses Clerk JWT with no internal login endpoint — clients obtain tokens directly from Clerk outside this API.

The API uses Clerk-issued JWT bearer tokens. Clients obtain a token directly from Clerk (via the Clerk SDK or Clerk-hosted UI), then pass it to the API on every request.

### Auth Flow

1. Client authenticates with Clerk (hosted UI, SDK sign-in, or OAuth provider).
2. Clerk issues a short-lived JWT signed with Clerk's RSA key.
3. Client sends the JWT as a `Bearer` token in the `Authorization` header.
4. FastAPI dependency (`get_current_principal` in `backend/app/core/auth.py`) verifies the token via the Clerk SDK and extracts a `Principal` (containing `user_id`, `session_id`, `roles`, and `org_id`). All auth failures raise `ServiceError(401)` — there are no 403 responses from the auth layer.
5. The resolved `Principal` is forwarded to route handlers for authorization decisions.

### Using a Token

```bash
curl -X GET "http://localhost:8000/api/v1/entities/" \
  -H "Authorization: Bearer <clerk_jwt>" \
  -H "Content-Type: application/json"
```

### Principal Claims

After verification the Clerk SDK exposes the following fields to route handlers:

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | string | Clerk user identifier — the `sub` claim from the JWT (e.g. `user_2abc...`) |
| `session_id` | string | Clerk session identifier — the `sid` claim from the JWT |
| `roles` | array[string] | Roles extracted from the `o.rol` claim in the JWT (active org role); empty if no active organization |
| `org_id` | string \| null | Active organization identifier from the `o.id` or `org_id` claim; `null` if no org session |

### Token Lifetime

Token expiry is controlled by Clerk session settings. Clients should treat tokens as short-lived and use Clerk's SDK refresh mechanisms rather than storing or re-using tokens long-term.

## Endpoint Summary

Endpoints are grouped by resource. **Operational endpoints** (`/healthz`, `/readyz`, `/version`) are mounted at the **root level** — they are not under `/api/v1`. All other paths are relative to the base URL `/api/v1`.

### Operational Endpoints (Root Level)

These endpoints are public (no authentication required) and mounted directly on the application root for compatibility with container orchestrators and API gateways. They do not appear in the `/api/v1/openapi.json` spec.

| Method | Path | Description | Auth Required |
|--------|------|-------------|:-------------:|
| `GET` | `/healthz` | Liveness probe — returns `{"status": "ok"}` immediately | No |
| `GET` | `/readyz` | Readiness probe — checks Supabase connectivity | No |
| `GET` | `/version` | Build metadata for API gateway service discovery | No |

> **Note:** `/readyz` returns `200` when all checks pass and `503` when any dependency is unreachable. Container orchestrators (Kubernetes, ECS) use these distinct status codes to gate traffic routing. `/healthz` always returns `200` regardless of dependency state.

### Entities

> **Active (AYG-70):** Entity CRUD endpoints are implemented and registered at `/api/v1/entities`. See [Entities API](endpoints/entities.md) for full documentation.

All entity endpoints are scoped to the authenticated caller — `owner_id` isolation is enforced at the service layer, so users can only access their own records.

| Method | Path | Description | Auth Required |
|--------|------|-------------|:-------------:|
| `POST` | `/entities` | Create a new entity | Yes |
| `GET` | `/entities` | List caller's entities (paginated, max 100 per page) | Yes |
| `GET` | `/entities/{entity_id}` | Get a single entity by UUID | Yes |
| `PATCH` | `/entities/{entity_id}` | Partially update an entity | Yes |
| `DELETE` | `/entities/{entity_id}` | Delete an entity (returns 204) | Yes |

## Standard Response Patterns

### Pagination

List endpoints return a `PaginatedResponse[T]` envelope and accept `offset` and `limit` query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `offset` | integer | `0` | — | Number of records to skip |
| `limit` | integer | `20` | `100` | Maximum records to return per page |

`PaginatedResponse[T]` shape:

```json
{
  "data": [...],
  "count": 42
}
```

`data` is an array of the resource type `T`; `count` is the **total** number of matching records in the system (not just the current page), useful for building pagination controls.

### Date / Time

All timestamp fields (e.g. `created_at`) are returned in **UTC ISO 8601** format:

```
2026-02-24T12:34:56.789012+00:00
```

### UUIDs

All resource identifiers (`id`, `owner_id`, `user_id`) are version-4 UUIDs:

```
550e8400-e29b-41d4-a716-446655440000
```

## Standard Error Responses

> **AYG-65 / AYG-71:** All API errors return a unified JSON shape applied to every active endpoint. The previous `{"detail": "..."}` format is no longer used. Every `HTTPException`, `RequestValidationError`, and unhandled `Exception` goes through `backend/app/core/errors.py` and produces the structure below. As of AYG-71 only `/api/v1/entities` and the root-level operational endpoints (`/healthz`, `/readyz`, `/version`) are registered; all legacy routes (login, users, items, utils, private) have been removed from the router.

### Standard Error Shape

Every error response (4xx and 5xx) returns JSON with these top-level fields:

```json
{
  "error": "NOT_FOUND",
  "message": "The requested user does not exist.",
  "code": "ENTITY_NOT_FOUND",
  "request_id": "a3f1c2d4-1234-5678-abcd-ef9876543210"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | string | High-level error category derived from the HTTP status code (see table below) |
| `message` | string | Human-readable description of what went wrong |
| `code` | string | Machine-readable sub-code for programmatic handling (e.g. `ENTITY_NOT_FOUND`) |
| `request_id` | string (UUID v4) | Unique identifier for this request; matches the `X-Request-ID` response header for log correlation |

### HTTP Status to Error Category Mapping

| HTTP Status | `error` value | Common Cause |
|-------------|---------------|--------------|
| `400` | `BAD_REQUEST` | Invalid input or business rule violation |
| `401` | `UNAUTHORIZED` | Missing or malformed `Authorization` header |
| `403` | `FORBIDDEN` | Token is invalid, expired, or caller lacks privileges |
| `404` | `NOT_FOUND` | Requested resource does not exist |
| `409` | `CONFLICT` | Resource state conflict (e.g. duplicate email) |
| `422` | `VALIDATION_ERROR` | Request body or query parameter validation failed |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Unexpected server-side failure |
| `503` | `SERVICE_UNAVAILABLE` | Upstream dependency unavailable |

### Validation Error Extension (422)

When request validation fails (HTTP 422), the response extends the standard shape with a `details` array containing per-field information:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "code": "VALIDATION_FAILED",
  "request_id": "a3f1c2d4-1234-5678-abcd-ef9876543210",
  "details": [
    {
      "field": "title",
      "message": "Field required",
      "type": "missing"
    },
    {
      "field": "email",
      "message": "value is not a valid email address",
      "type": "value_error"
    }
  ]
}
```

Each entry in `details`:

| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Dot-notation path to the invalid field (e.g. `address.postcode`); `"unknown"` if the location cannot be determined |
| `message` | string | Validation failure description |
| `type` | string | Pydantic error type identifier (e.g. `missing`, `value_error`, `string_too_short`) |

### Request ID

The `request_id` in every error response is a UUID v4 that is also echoed back in the `X-Request-ID` response header. Use this value when filing bug reports or searching application logs.

## CORS

CORS is enforced by `starlette.middleware.cors.CORSMiddleware` configured in `backend/app/main.py`. Requests that use an unlisted method or include an unlisted header will be rejected by the browser's preflight check (or by the server for non-preflighted requests).

### Allowed Origins

Origins are controlled by two configuration values:

| Setting | Default | Description |
|---------|---------|-------------|
| `BACKEND_CORS_ORIGINS` | `[]` | Comma-separated list or JSON array of additional allowed origins |
| `FRONTEND_HOST` | `http://localhost:5173` | Always appended to the allowed origins list |

CORS is only enabled when at least one origin is configured (`settings.all_cors_origins` is non-empty). If no origins are configured, the middleware is not added and all cross-origin requests will be blocked.

### Allowed Methods

The following HTTP methods are explicitly allowed. All other methods will be refused in CORS preflight responses:

```
GET  POST  PATCH  DELETE  OPTIONS
```

### Allowed Headers

The following request headers are explicitly allowed. Any header not in this list will be refused in CORS preflight responses:

| Header | Purpose |
|--------|---------|
| `Authorization` | Clerk JWT bearer token |
| `Content-Type` | Request body media type (always `application/json`) |
| `X-Correlation-ID` | Optional caller-supplied trace identifier (propagated through logs) |

> **Note for API consumers:** Do not send custom headers outside this list (e.g. `X-Custom-Header`) — the browser will block the request at preflight. Credentials (`credentials: 'include'`) are supported.

## Security Headers

`RequestPipelineMiddleware` (`backend/app/core/middleware.py`) injects the following headers on **every response**, including CORS preflight `OPTIONS` responses. The middleware is registered as the outermost layer so these headers are never omitted regardless of which inner handler produces the response.

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | See policy below | Restricts resource loading to prevent XSS and data-injection attacks |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing a response away from the declared content type |
| `X-Frame-Options` | `DENY` | Blocks the page from being embedded in any `<iframe>`, mitigating clickjacking |
| `X-XSS-Protection` | `0` | Disables the legacy XSS auditor (CSP supersedes it; the auditor can introduce vulnerabilities) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full `Referer` on same-origin requests; only the origin on cross-origin HTTPS requests; nothing on HTTP downgrade |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables access to camera, microphone, and geolocation APIs for all browsing contexts |

> **Production only:** `Strict-Transport-Security: max-age=31536000; includeSubDomains` is additionally set when `ENVIRONMENT=production`. It is omitted in `local` and `staging` environments to avoid accidentally pinning HTTPS on non-TLS development origins.

### Content-Security-Policy

The full CSP applied to every response (10 directives):

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none'
```

| Directive | Value | Rationale |
|-----------|-------|-----------|
| `default-src` | `'self'` | Blocks all resource types not covered by a more specific directive unless they originate from the same host |
| `script-src` | `'self'` | Only scripts served from the same origin may execute; no inline scripts, no CDNs |
| `style-src` | `'self' 'unsafe-inline'` | Same-origin stylesheets plus inline styles (required by Tailwind CSS utility classes) |
| `img-src` | `'self' data:` | Same-origin images plus inline `data:` URIs (used by UI components) |
| `font-src` | `'self' data:` | Same-origin fonts plus inline `data:` URIs |
| `connect-src` | `'self' https://*.supabase.co https://*.clerk.accounts.dev` | Allows `fetch`/`XHR` to the same origin, Supabase, and Clerk auth endpoints |
| `object-src` | `'none'` | Blocks all plugin content (`<object>`, `<embed>`, Flash) |
| `base-uri` | `'self'` | Prevents injected `<base>` tags from hijacking relative URLs |
| `form-action` | `'self'` | Restricts `<form>` submission targets to the same origin |
| `frame-ancestors` | `'none'` | Equivalent to `X-Frame-Options: DENY`; prevents embedding in any frame |

## Environment-Specific Behaviour

| Feature | `local` | `staging` | `production` |
|---------|---------|-----------|--------------|
| Default secret key warning | Warning logged | Error raised | Error raised |
| Sentry error tracking | Optional | Configured via `SENTRY_DSN` | Configured via `SENTRY_DSN` |

## Rate Limiting

Rate limiting is not enabled by default in this template. When you're ready to add it, we recommend [slowapi](https://github.com/laurentS/slowapi) — a lightweight rate limiter for FastAPI built on top of `limits`.

### Adding Rate Limiting

1. Install the dependency:
```bash
cd backend
uv add slowapi
```

2. Configure the limiter in `app/core/middleware.py`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

3. Apply to the FastAPI app in `app/main.py`:
```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

4. Decorate individual routes:
```python
from app.core.middleware import limiter

@router.get("/entities")
@limiter.limit("60/minute")
async def list_entities(request: Request, ...):
    ...
```

### Considerations

- **Key function**: `get_remote_address` uses the client IP. Behind a reverse proxy (Traefik), configure `X-Forwarded-For` trust.
- **Storage backend**: Defaults to in-memory. For multi-worker deployments, use Redis: `Limiter(key_func=..., storage_uri="redis://localhost:6379")`
- **Response headers**: slowapi automatically adds `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers.
- **Error response**: Rate-limited requests return HTTP 429 with the standard error shape (`"error": "RATE_LIMITED"`).

## Related

- [Architecture Overview](../architecture/overview.md)
- [Data Models](../data/models.md)
- [Getting Started](../getting-started/)

## Endpoint Reference

- [Operational Endpoints — Health, Readiness, Version](endpoints/health.md)
- [Entities](endpoints/entities.md)

> **Removed in AYG-71:** Login, Users, Items, Utils, and Private routes have been removed from the router. Legacy endpoint docs (items, login, users, utils) were removed as part of the documentation cleanup.

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.9.0 | 2026-03-03 | initialise skill: Added `session_id` to Principal Claims table; clarified auth always returns 401 (never 403); added `models/common.py`, `core/auth.py`, and `error-codes.md` to related-code/related-docs |
| 1.8.0 | 2026-03-03 | AYG-89: Expanded CORS section with explicit allowed-methods and allowed-headers lists; added Security Headers section documenting all 6 headers emitted by RequestPipelineMiddleware including full CSP directive breakdown |
| 1.7.0 | 2026-03-01 | Docs cleanup: Removed deprecated endpoint doc files (items, login, users, utils) and stale references to legacy security module |
| 1.6.0 | 2026-03-01 | AYG-76: Removed stale `skip` migration note (all endpoints use `offset`); removed `Message` data model section (DELETE /entities returns 204 No Content, no body); updated curl example from removed `/users/me` to `/entities/`; marked utils.md as removed |
| 1.5.0 | 2026-02-28 | AYG-71: Legacy routes (login, users, items, utils, private) removed from router; only /api/v1/entities and root operational endpoints active; unified error shape confirmed applied to all active endpoints |
| 1.4.0 | 2026-02-28 | AYG-70: Entity CRUD route handlers registered; all five endpoints live |
| 1.3.0 | 2026-02-28 | AYG-69: Entity resource forward-reference added; service layer complete, routes planned for AYG-70 |
| 1.2.0 | 2026-02-28 | AYG-68: Operational endpoints (`/healthz`, `/readyz`, `/version`) added at root level; Utils `/health-check/` marked as legacy |
| 1.1.0 | 2026-02-27 | AYG-65: Auth updated to Clerk JWT; unified error response shape documented; `PaginatedResponse[T]` and `offset`/`limit` pagination params documented |
| 1.0.0 | 2026-02-26 | Initial release |
