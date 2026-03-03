---
title: "How to Add a New Resource"
doc-type: guide
status: active
last-updated: 2026-03-03
related-code:
  - backend/app/models/entity.py
  - backend/app/services/entity_service.py
  - backend/app/api/routes/entities.py
  - frontend/src/components/Entities/
  - frontend/src/routes/_layout/entities.tsx
tags: [guide, getting-started, crud]
---

# How to Add a New Resource

This guide walks through adding a complete CRUD resource to the stack, from database table to frontend UI. The **Entity** resource is the canonical reference implementation -- each step links to the corresponding Entity file as an example.

Replace `<resource>` with your resource name (e.g. `project`, `invoice`, `task`).

## Steps

### 1. Database Migration

Create a new Supabase migration for your table:

```bash
supabase migration new create_<resource>
```

In the generated SQL file, define:

- The table with columns, types, and constraints
- Indexes for common query patterns
- RLS policies scoped to `auth.uid()`

**Reference:** `supabase/migrations/`

### 2. Pydantic Models

Create `backend/app/models/<resource>.py` following the four-model pattern:

| Model | Purpose |
|-------|---------|
| `<Resource>Base` | Shared fields (name, description, etc.) |
| `<Resource>Create` | Fields required for creation (extends Base) |
| `<Resource>Update` | Optional fields for partial updates |
| `<Resource>Public` | Full representation returned to clients (includes id, timestamps) |

Re-export the models in `backend/app/models/__init__.py`.

**Reference:** `backend/app/models/entity.py`

### 3. Service Layer

Create `backend/app/services/<resource>_service.py` with CRUD functions:

- Accept the Supabase `Client` as the first argument
- Raise `ServiceError` with `{RESOURCE}_*` error codes (see `docs/api/error-codes.md`)
- Use 3-arg `ServiceError(status_code, message, code)` constructor
- Keep business logic here, not in route handlers

**Reference:** `backend/app/services/entity_service.py`

### 4. Route Handlers

Create `backend/app/api/routes/<resource>.py`:

- Define thin route handlers that delegate to the service layer
- Use `PrincipalDep` for auth and `SupabaseDep` for the database client
- Return appropriate Pydantic response models

Register the router in `backend/app/api/main.py`:

```python
from app.api.routes.<resource> import router as <resource>_router
api_router.include_router(<resource>_router, prefix="/<resources>", tags=["<resources>"])
```

**Reference:** `backend/app/api/routes/entities.py`

### 5. Backend Tests

Write tests following TDD -- tests first, then implementation:

- **Unit tests** in `backend/tests/unit/test_<resource>_service.py` -- mock the Supabase client with `MagicMock`, test each service function in isolation
- **Integration tests** in `backend/tests/integration/test_<resource>.py` -- use `TestClient` with dependency overrides to test route handlers end-to-end

**Reference:** `backend/tests/unit/test_entity_service.py`, `backend/tests/integration/test_entities.py`

### 6. Regenerate SDK

After backend routes are in place, regenerate the frontend API client:

```bash
bash ./scripts/generate-client.sh
```

Alternatively, commit your backend changes and the pre-commit hook will regenerate the client automatically.

**Note:** Never hand-edit files in `frontend/src/client/` -- they are auto-generated.

### 7. Frontend Route

Create `frontend/src/routes/_layout/<resource>.tsx`:

- Use `useSuspenseQuery` to load data from the generated API client
- Wrap in `Suspense` with a loading fallback
- TanStack Router will auto-register the route via file-based routing

**Reference:** `frontend/src/routes/_layout/entities.tsx`

### 8. Frontend Components

Create CRUD components in `frontend/src/components/<Resource>/`:

| Component | Purpose |
|-----------|---------|
| `Add<Resource>.tsx` | Create dialog with form |
| `Edit<Resource>.tsx` | Edit dialog with pre-filled form |
| `Delete<Resource>.tsx` | Confirmation dialog |

Each component follows the same pattern:

1. Define a Zod schema for form validation
2. Use `useForm` with `zodResolver` for form state
3. Use `useMutation` for the API call
4. Wrap in a shadcn `Dialog` component
5. Call `queryClient.invalidateQueries` on success
6. Show feedback with `useCustomToast`

**Reference:** `frontend/src/components/Entities/`

### 9. Frontend Tests

Write unit tests for form components in `frontend/src/components/<Resource>/__tests__/`:

- Use Vitest + React Testing Library
- Mock the API client and auth hooks
- Test form validation, submission, and error states
- Follow the patterns in existing Entity component tests

**Reference:** `frontend/src/components/Entities/__tests__/AddEntity.test.tsx`

### 10. Update Sidebar

Add a navigation item in `frontend/src/components/Sidebar/AppSidebar.tsx`:

```typescript
const items: Item[] = [
  // ... existing items
  { icon: YourIcon, title: "<Resources>", path: "/<resources>" },
]
```

**Reference:** `frontend/src/components/Sidebar/AppSidebar.tsx`

## Checklist

Use this checklist to verify your new resource is complete:

- [ ] Database migration created and applied (`supabase db push`)
- [ ] Pydantic models defined (Base, Create, Update, Public) and re-exported
- [ ] Service layer with CRUD functions and proper error codes
- [ ] Route handlers registered in `api/main.py`
- [ ] Unit tests for service layer (mock Supabase)
- [ ] Integration tests for route handlers (TestClient)
- [ ] Frontend SDK regenerated (`generate-client.sh`)
- [ ] Frontend route created (file-based routing)
- [ ] Frontend CRUD components (Add, Edit, Delete dialogs)
- [ ] Frontend component tests (Vitest + RTL)
- [ ] Sidebar navigation updated
- [ ] All tests passing, linter clean, types checked
