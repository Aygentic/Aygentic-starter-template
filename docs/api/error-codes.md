---
title: "Error Codes Catalog"
doc-type: reference
status: active
version: "1.1.0"
last-updated: 2026-03-03
updated-by: "initialise skill"
related-code:
  - backend/app/core/errors.py
  - backend/app/core/auth.py
  - backend/app/core/supabase.py
  - backend/app/core/http_client.py
  - backend/app/services/entity_service.py
  - backend/app/models/common.py
related-docs:
  - docs/api/overview.md
  - docs/api/endpoints/entities.md
  - docs/getting-started/add-resource.md
tags: [api, errors, reference, error-codes]
---

# Error Codes Catalog

## Overview

This project uses a structured error code system designed for consistency, machine-readability, and developer experience. Every error returned by the API includes a unique error code, an HTTP status, and a human-readable message.

Error codes are domain-prefixed (e.g. `AUTH_`, `ENTITY_`) and follow the naming pattern `{RESOURCE}_{OPERATION}_{RESULT}`. API consumers should handle errors programmatically using the `code` field rather than parsing the `message` string, which may change across versions.

All errors pass through the global exception handlers registered in `backend/app/core/errors.py` via `register_exception_handlers()`. The three registered handlers are:

- `service_error_handler` — catches `ServiceError` raised by service and auth layers
- `http_exception_handler` — catches FastAPI/Starlette `HTTPException`
- `validation_exception_handler` — catches Pydantic `RequestValidationError`
- `unhandled_exception_handler` — catch-all for any other `Exception`

## Error Response Format

All API errors return a consistent JSON structure:

```json
{
  "error": "NOT_FOUND",
  "message": "Entity not found",
  "code": "ENTITY_NOT_FOUND",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | string | HTTP status category derived from `STATUS_CODE_MAP` (e.g. `UNAUTHORIZED`, `NOT_FOUND`) |
| `message` | string | Human-readable error description |
| `code` | string | Machine-readable `UPPER_SNAKE_CASE` error code for programmatic handling |
| `request_id` | string (UUID v4) | Unique identifier for this request; matches the `X-Request-ID` response header for log correlation |

Validation errors (HTTP 422) extend the standard shape with a `details` array containing per-field information:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "code": "VALIDATION_FAILED",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "details": [
    {
      "field": "title",
      "message": "Field required",
      "type": "missing"
    },
    {
      "field": "description",
      "message": "String should have at most 1000 characters",
      "type": "string_too_long"
    }
  ]
}
```

Each entry in `details`:

| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Dot-notation path to the invalid field (e.g. `address.postcode`); `"unknown"` if location cannot be determined |
| `message` | string | Human-readable validation failure description |
| `type` | string | Pydantic error type identifier (e.g. `missing`, `value_error`, `string_too_short`) |

This extends the error summary in the [API Overview](overview.md).

## HTTP Status Code Reference

| Range | Category | Common Codes | Usage |
|-------|----------|-------------|-------|
| 2xx | Success | 200 OK, 201 Created, 204 No Content | Request completed successfully |
| 4xx | Client Error | 400 Bad Request, 401 Unauthorized, 404 Not Found, 422 Unprocessable Entity | Client sent an invalid or unauthorized request |
| 5xx | Server Error | 500 Internal Server Error, 503 Service Unavailable | Server failed to process a valid request |

## HTTP Status to Error Category Mapping

The `STATUS_CODE_MAP` in `backend/app/core/errors.py` maps HTTP status codes to `error` category strings. When constructing a `ServiceError(status_code, message, code)`, the `error` field is auto-resolved from this map:

```python
STATUS_CODE_MAP = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE",
}
```

If the status code is not in the map, `error` defaults to `"INTERNAL_ERROR"`.

## Application Error Codes

Complete catalog of all defined error codes. The `error` field in each response is derived from the HTTP status via the map above.

| Code | HTTP Status | `error` field | Description | Source |
|------|-------------|---------------|-------------|--------|
| `AUTH_MISSING_TOKEN` | 401 | `UNAUTHORIZED` | No Bearer token in request | `core/auth.py` |
| `AUTH_EXPIRED_TOKEN` | 401 | `UNAUTHORIZED` | JWT has expired | `core/auth.py` |
| `AUTH_INVALID_TOKEN` | 401 | `UNAUTHORIZED` | Bad signature, wrong authorized party, missing `sub`/`sid`, or SDK-level failure | `core/auth.py` |
| `ENTITY_NOT_FOUND` | 404 | `NOT_FOUND` | Entity doesn't exist or is not owned by caller | `services/entity_service.py` |
| `ENTITY_CREATE_FAILED` | 500 | `INTERNAL_ERROR` | Insert failed (RLS block, network error, or no data returned) | `services/entity_service.py` |
| `ENTITY_GET_FAILED` | 500 | `INTERNAL_ERROR` | Unexpected error fetching entity | `services/entity_service.py` |
| `ENTITY_LIST_FAILED` | 500 | `INTERNAL_ERROR` | Unexpected error listing entities | `services/entity_service.py` |
| `ENTITY_UPDATE_FAILED` | 500 | `INTERNAL_ERROR` | Unexpected error updating entity | `services/entity_service.py` |
| `ENTITY_DELETE_FAILED` | 500 | `INTERNAL_ERROR` | Unexpected error deleting entity | `services/entity_service.py` |
| `VALIDATION_FAILED` | 422 | `VALIDATION_ERROR` | Request body or query params failed Pydantic validation | `core/errors.py` |
| `INTERNAL_ERROR` | 500 | `INTERNAL_ERROR` | Unhandled exception catch-all | `core/errors.py` |
| `SERVICE_UNAVAILABLE` | 503 | `SERVICE_UNAVAILABLE` | Supabase not initialized, circuit breaker open, or upstream failure | `core/supabase.py`, `core/http_client.py` |

## Domain-Specific Errors

### Authentication (AUTH_*)

Errors raised by `get_current_principal()` in `backend/app/core/auth.py` before route handlers are reached. All auth errors return HTTP `401` — there are no `403` responses from the auth layer in this codebase.

| Code | HTTP Status | Description | Example Trigger |
|------|-------------|-------------|-----------------|
| `AUTH_MISSING_TOKEN` | 401 | No Bearer token in request | Request sent without `Authorization` header |
| `AUTH_EXPIRED_TOKEN` | 401 | JWT has expired | Clerk session TTL exceeded; client must re-authenticate |
| `AUTH_INVALID_TOKEN` | 401 | JWT verification failed | Bad RSA signature, wrong authorized party, missing `sub` or `sid` claim, or Clerk SDK exception |

**Example response:**

```json
{
  "error": "UNAUTHORIZED",
  "message": "Token expired",
  "code": "AUTH_EXPIRED_TOKEN",
  "request_id": "a3f1c2d4-1234-5678-abcd-ef9876543210"
}
```

### Entities (ENTITY_*)

Errors raised by functions in `backend/app/services/entity_service.py`. All entity operations enforce `owner_id` isolation — a valid UUID belonging to a different user returns `404` (not `403`) to avoid leaking existence information.

| Code | HTTP Status | Description | Example Trigger |
|------|-------------|-------------|-----------------|
| `ENTITY_NOT_FOUND` | 404 | Entity doesn't exist or caller is not the owner | GET/PATCH/DELETE with a UUID owned by another user |
| `ENTITY_CREATE_FAILED` | 500 | Supabase insert failed or returned no data | RLS policy blocked the insert; network failure to Supabase |
| `ENTITY_GET_FAILED` | 500 | Unexpected error fetching a single entity | Network error or Supabase timeout during SELECT |
| `ENTITY_LIST_FAILED` | 500 | Unexpected error listing entities | Network error or Supabase timeout during paginated SELECT |
| `ENTITY_UPDATE_FAILED` | 500 | Unexpected error updating entity | Network error or Supabase timeout during UPDATE |
| `ENTITY_DELETE_FAILED` | 500 | Unexpected error deleting entity | Network error or Supabase timeout during DELETE |

**Example 404 response:**

```json
{
  "error": "NOT_FOUND",
  "message": "Entity not found",
  "code": "ENTITY_NOT_FOUND",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Validation (VALIDATION_FAILED)

Raised automatically by FastAPI's `RequestValidationError` handler when Pydantic rejects the request body or query parameters. Always returns HTTP `422` with a `details` array.

| Code | HTTP Status | Description | Example Trigger |
|------|-------------|-------------|-----------------|
| `VALIDATION_FAILED` | 422 | Request body or query params failed Pydantic validation | Missing required `title` field; `limit` query param is not an integer |

### Infrastructure / Catch-All

| Code | HTTP Status | Description | Example Trigger |
|------|-------------|-------------|-----------------|
| `INTERNAL_ERROR` | 500 | Unhandled exception not caught by any specific handler | Programming error; unexpected library exception |
| `SERVICE_UNAVAILABLE` | 503 | A required infrastructure dependency is unavailable | Supabase client not initialized; HTTP circuit breaker is open |

## Error Handling Patterns

### Error Propagation Chain

```
Service Layer (ServiceError) → Global Handler → ErrorResponse JSON → HTTP Response
Auth Layer (ServiceError)    → Global Handler → ErrorResponse JSON → HTTP Response
FastAPI Validation (422)     → Global Handler → ValidationErrorResponse JSON → HTTP Response
Unhandled Exception          → Catch-all     → INTERNAL_ERROR JSON → HTTP 500
```

- **Auth layer** (`core/auth.py`): raises `ServiceError(401, message, code)` — always 401, never 403
- **Service layer** (`services/entity_service.py`): raises `ServiceError(status_code, message, code)` with domain-specific codes
- **Route handlers** (`api/routes/`): thin wrappers; they do not catch exceptions — propagation flows to global handlers
- **Global handlers** (`core/errors.py`): `register_exception_handlers()` registers four handlers on the FastAPI app

### Raising a ServiceError

```python
from app.core.errors import ServiceError

raise ServiceError(
    status_code=404,
    message="Entity not found",
    code="ENTITY_NOT_FOUND",
)
```

The `error` field in the response is automatically resolved from `STATUS_CODE_MAP` based on `status_code`. Do not set `error` manually.

### Logging

- All `5xx` errors are logged at `error` level with full exception info
- `4xx` errors from `ServiceError` are not logged by the handler (the service layer logs them at `error` or `warning` level before raising)
- Validation errors (`422`) are not logged — they are client errors with structured `details`
- `request_id` is included in every log entry via `RequestPipelineMiddleware` in `core/middleware.py`

## Naming Convention

Error codes follow the pattern:

```
{RESOURCE}_{OPERATION}_{RESULT}
```

| Segment | Description | Examples |
|---------|-------------|----------|
| `RESOURCE` | The domain resource or category | `ENTITY`, `AUTH`, `USER`, `ORDER` |
| `OPERATION` | The action being performed | `CREATE`, `UPDATE`, `DELETE`, `GET`, `LIST` |
| `RESULT` | The failure reason | `FAILED`, `NOT_FOUND`, `EXPIRED`, `INVALID` |

Some codes omit the operation when the result is self-explanatory (e.g. `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`).

**Examples for new resources:**

- `USER_CREATE_FAILED` — user insert failed
- `ORDER_NOT_FOUND` — order doesn't exist or not owned by caller
- `PAYMENT_PROCESS_FAILED` — payment processing error

## Adding New Error Codes

When introducing a new error code:

1. **Define the ServiceError raise** in the appropriate service file with the new code string
2. **Use the correct domain prefix** — `AUTH_` for auth, `ENTITY_` for entity ops, `{RESOURCE}_` for new resources
3. **Follow the naming pattern** — `{RESOURCE}_{OPERATION}_{RESULT}`
4. **Register in this document** — add a row to the Application Error Codes table and the appropriate domain-specific section
5. **Write tests** that verify the error code is returned for the expected trigger condition (see `backend/tests/unit/` for examples)

When adding errors for a new resource, see [Adding a New Resource](../getting-started/add-resource.md) for the full resource creation workflow.

## Related

- [API Overview](overview.md)
- [Entities API](endpoints/entities.md)
- [Adding a New Resource](../getting-started/add-resource.md)
- [Data Models](../data/models.md)

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.1.0 | 2026-03-03 | initialise skill: Added `version`, `updated-by`, template-aligned structure with domain sections, error propagation chain, naming convention, adding-new-codes guide, and changelog |
| 1.0.0 | 2026-03-03 | AYG-89: Initial catalog with all defined error codes, HTTP status mapping, and response shape |
