---
title: "Error Codes Catalog"
doc-type: reference
status: active
last-updated: 2026-03-03
related-code:
  - backend/app/core/errors.py
  - backend/app/core/auth.py
  - backend/app/core/supabase.py
  - backend/app/core/http_client.py
  - backend/app/services/entity_service.py
tags: [api, errors, reference]
---

# Error Codes Catalog

Every API error conforms to the standard `ErrorResponse` shape defined in `backend/app/core/errors.py`. This catalog lists all defined error codes, their HTTP statuses, and where they originate.

## Error Codes

| Code | HTTP Status | Description | Source |
|------|-------------|-------------|--------|
| `AUTH_MISSING_TOKEN` | 401 | No Bearer token in request | `core/auth.py` |
| `AUTH_EXPIRED_TOKEN` | 401 | JWT has expired | `core/auth.py` |
| `AUTH_INVALID_TOKEN` | 401 | Bad signature, wrong party, or other JWT failure | `core/auth.py` |
| `ENTITY_NOT_FOUND` | 404 | Entity doesn't exist or not owned by caller | `services/entity_service.py` |
| `ENTITY_CREATE_FAILED` | 500 | Insert failed (RLS block or DB error) | `services/entity_service.py` |
| `ENTITY_GET_FAILED` | 500 | Unexpected error fetching entity | `services/entity_service.py` |
| `ENTITY_LIST_FAILED` | 500 | Unexpected error listing entities | `services/entity_service.py` |
| `ENTITY_UPDATE_FAILED` | 500 | Unexpected error updating entity | `services/entity_service.py` |
| `ENTITY_DELETE_FAILED` | 500 | Unexpected error deleting entity | `services/entity_service.py` |
| `VALIDATION_FAILED` | 422 | Request body/params failed Pydantic validation | `core/errors.py` |
| `INTERNAL_ERROR` | 500 | Unhandled exception catch-all | `core/errors.py` |
| `SERVICE_UNAVAILABLE` | 503 | Supabase not initialized, circuit open, or upstream failure | `core/supabase.py`, `core/http_client.py` |

## HTTP Status Category Mapping

The `STATUS_CODE_MAP` in `backend/app/core/errors.py` maps HTTP status codes to UPPER_SNAKE_CASE error category strings. When constructing a `ServiceError(status_code, message, code)`, the `error` field is auto-resolved from this map:

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

If the status code is not in the map, the `error` field defaults to `"INTERNAL_ERROR"`.

## Naming Convention

Error codes follow the pattern:

```
{RESOURCE}_{OPERATION}_{RESULT}
```

| Segment | Description | Examples |
|---------|-------------|----------|
| `RESOURCE` | The domain resource or category | `ENTITY`, `AUTH`, `USER`, `ORDER` |
| `OPERATION` | The action being performed | `CREATE`, `UPDATE`, `DELETE`, `GET`, `LIST`, `PROCESS` |
| `RESULT` | The failure reason | `FAILED`, `NOT_FOUND`, `EXPIRED`, `INVALID` |

**Examples for new resources:**

- `USER_CREATE_FAILED` -- user insert failed
- `ORDER_NOT_FOUND` -- order doesn't exist or not owned by caller
- `PAYMENT_PROCESS_FAILED` -- payment processing error

Some codes omit the operation when the result is self-explanatory (e.g. `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`).

## Response Shape

All errors return the standard `ErrorResponse` JSON body:

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
| `error` | `string` | HTTP status category from `STATUS_CODE_MAP` |
| `message` | `string` | Human-readable error message |
| `code` | `string` | Machine-readable error code from the table above |
| `request_id` | `string` | UUID v4 request identifier for tracing |

Validation errors (HTTP 422) extend with field-level details:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "code": "VALIDATION_FAILED",
  "request_id": "...",
  "details": [
    { "field": "title", "message": "Field required", "type": "missing" }
  ]
}
```
