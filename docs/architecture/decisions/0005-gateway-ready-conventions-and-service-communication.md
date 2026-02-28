---
title: "ADR-0005: Gateway-Ready Conventions and Service-to-Service Communication"
doc-type: reference
status: proposed
date: 2026-03-01
decision-makers: ["@amostan"]
last-updated: 2026-03-01
updated-by: "architecture-docs-writer (AYG-74)"
related-code:
  - backend/app/core/http_client.py
  - backend/app/core/config.py
  - backend/app/core/errors.py
  - backend/app/api/deps.py
  - backend/app/api/routes/utils.py
  - compose.gateway.yml
related-docs:
  - docs/architecture/overview.md
tags: [architecture, adr, gateway, service-communication, service-discovery]
---

# ADR-0005: Gateway-Ready Conventions and Service-to-Service Communication

## Context and Problem Statement

The Aygentic Starter Template must work across a wide range of deployment targets: managed platforms (Railway, Cloud Run, Fly.io), self-hosted Docker Compose stacks, and multi-service architectures fronted by an API gateway. Two related decisions arise from this requirement: whether to include a gateway in the template itself, and how services should discover and call each other when they need to communicate.

## Decision Drivers

- Managed platforms already provide routing, load balancing, and TLS termination; bundling a gateway would duplicate this infrastructure and increase operational complexity
- Service discovery mechanisms range from simple (env vars) to complex (service mesh, Consul, DNS-based); the choice must match the operational model of the target deployment
- The template must remain usable by single-service deployments that never need inter-service calls, while also being extensible for multi-service architectures
- Any inter-service call mechanism must propagate observability context (correlation IDs) to keep request traces intact across service boundaries

---

## Decision 1: Gateway-Ready over Gateway-Inclusive

### Considered Options

1. **Gateway-ready conventions without a bundled gateway** - Follow standard conventions (health endpoints, `/api/v1` prefix, structured errors) so the service works with any gateway, but ship the gateway as a reference file only
2. **Bundle a Traefik gateway in the default Compose stack** - Include a fully configured Traefik instance in `compose.yml` as a first-class component
3. **No gateway conventions at all** - Leave routing and gateway integration entirely to teams deploying the template

<!-- OPTIONAL -->
### Option 1: Gateway-ready conventions without a bundled gateway

**Pros:**
- Services are immediately routable through any gateway without template changes (Traefik, Kong, AWS ALB, GCP Cloud Load Balancer, Railway proxy)
- Managed platforms need no gateway configuration; self-hosted teams can use `compose.gateway.yml` as a starting point
- Conventions are explicit and documentable: health endpoints at `/healthz` and `/readyz`, version info at `/version`, all API routes under `/api/v1`, structured JSON errors
- No gateway lock-in; teams choose their own solution

**Cons:**
- Self-hosted teams must configure their own gateway from scratch (mitigated by providing `compose.gateway.yml` as a reference)
- Template does not demonstrate a complete production gateway setup in a single `docker compose up`

### Option 2: Bundle a Traefik gateway in the default Compose stack

**Pros:**
- Works out of the box with `docker compose up` on any machine
- Demonstrates a complete self-hosted production topology

**Cons:**
- Adds Traefik operational knowledge as a prerequisite for all users, including those on managed platforms that provide their own routing
- Couples deployment choice (Traefik) into the template, making it harder to adopt alternative gateways
- Increases `compose.yml` complexity and introduces Traefik-specific label configuration that many teams will remove

### Option 3: No gateway conventions

**Pros:**
- Simplest possible template; no gateway-related documentation or configuration

**Cons:**
- Teams must discover health endpoint conventions independently
- No `/api/v1` prefix means routing rules cannot be applied consistently
- Non-structured errors make gateway-level error handling (rate limit pages, auth error pages) harder to implement
<!-- /OPTIONAL -->

### Decision Outcome

**Chosen option:** "Gateway-ready conventions without a bundled gateway"

**Reason:** Managed platforms already provide routing and TLS; bundling a gateway would add complexity for the majority of users who do not need it. Following standard conventions (health endpoints, `/api/v1` prefix, structured errors) makes the service immediately routable through any gateway without code changes, while the `compose.gateway.yml` reference file provides a starting point for teams that self-host.

#### Positive Consequences

- Services expose `/healthz`, `/readyz`, and `/version` endpoints that all major gateways and load balancers use for health probing and traffic shifting
- The `/api/v1` URL prefix allows gateway path-based routing rules to target this service without ambiguity alongside other services
- Structured JSON error responses (`{error, message, code, request_id}`) allow gateway-level error handling policies to parse and act on error types
- No gateway lock-in; the same service image deploys unchanged to Railway, Fly.io, Cloud Run, or a self-hosted Traefik/Kong/Nginx setup
- `compose.gateway.yml` provides a reference Traefik 3.6 configuration for teams that need it, without imposing it on those who do not

#### Negative Consequences

- Self-hosted teams must wire up their own gateway; `compose.gateway.yml` reduces but does not eliminate this effort
- The gateway reference file must be kept in sync with Traefik configuration as Traefik versions evolve (mitigated by versioning Traefik explicitly in the file)

---

## Decision 2: Environment Variable Service Discovery

### Considered Options

1. **`{SERVICE_NAME}_URL` environment variables** - Declare one env var per upstream dependency; values are stable internal URLs provided by the deployment platform
2. **DNS-based service discovery** - Use predictable DNS names (e.g., `http://user-service/`) defined by Docker Compose service names or Kubernetes DNS
3. **Service registry (Consul, etcd)** - Register services on startup; discover them at runtime via a registry API
4. **Service mesh (Istio, Linkerd)** - Intercept all inter-service traffic at the network layer; handle discovery, retries, and mTLS transparently

<!-- OPTIONAL -->
### Option 1: Environment variable service discovery

**Pros:**
- Works identically on every platform: Docker Compose, Railway, Cloud Run, Kubernetes, bare metal
- Explicit and auditable — every upstream dependency is visible in the service's environment
- No additional infrastructure required
- Consistent with the `{SERVICE_NAME}_URL` pattern already established for `SUPABASE_URL`, `CLERK_SECRET_KEY`, etc.

**Cons:**
- No dynamic discovery; if a service URL changes, all callers must update their environment variables
- Does not support multiple instances of the same service behind different URLs without additional configuration

### Option 2: DNS-based service discovery

**Pros:**
- Zero configuration in Docker Compose stacks where service names are stable DNS entries
- Familiar pattern for teams using Kubernetes (service DNS)

**Cons:**
- Breaks when services span different Docker Compose projects or are deployed on different platforms
- DNS names are implicitly coupled to the orchestrator; not portable across deployment targets

### Option 3: Service registry

**Pros:**
- Supports dynamic topologies with services appearing and disappearing at runtime
- Enables health-aware routing (deregister unhealthy instances)

**Cons:**
- Requires running and operating Consul/etcd as additional infrastructure
- Overkill for the template's target scale; adds significant operational complexity

### Option 4: Service mesh

**Pros:**
- Transparent mTLS, automatic retries, circuit breaking, and observability without application-level changes
- Industry standard for large microservice deployments

**Cons:**
- Requires a control plane (Istio, Linkerd) that is complex to configure and operate
- Significant overhead for small to medium deployments
- Template would need to be tested against the mesh, limiting portability
<!-- /OPTIONAL -->

### Decision Outcome

**Chosen option:** "`{SERVICE_NAME}_URL` environment variables"

**Reason:** Managed platforms provide stable internal URLs that do not change between deployments, making dynamic discovery unnecessary at the template's target scale. Environment variables are explicit, debuggable, and work identically across every deployment target without additional infrastructure.

#### Positive Consequences

- Each upstream dependency is declared with a single, named environment variable (`USER_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, etc.), making dependencies visible at a glance in `.env` or platform configuration
- The shared `HttpClient` (created once during lifespan startup, stored on `app.state`) handles retries, circuit breaking, and correlation ID propagation automatically for all outbound calls
- Missing configuration is detected at request time via a fail-fast `ServiceError(503, ..., "SERVICE_NOT_CONFIGURED")` rather than producing a confusing downstream error
- SSRF risk is contained because URL values come exclusively from deployment environment variables, never from user input

#### Negative Consequences

- Service URL changes require updating environment variables in all dependent services and redeploying; there is no live propagation (acceptable at the template's target scale)
- Teams building highly dynamic topologies (autoscaling services with changing URLs) will need to extend this pattern or switch to DNS-based discovery within their orchestrator (mitigated by the pattern being easy to replace without changing application code structure)

## More Information

- Gateway-ready conventions reference: `README.md` — "Gateway-Ready Conventions" section
- Reference self-hosted gateway configuration: `compose.gateway.yml`
- Shared HTTP client implementation: `backend/app/core/http_client.py`
- Fail-fast error pattern: `backend/app/core/errors.py` (`ServiceError`)
- Service-to-service section in architecture overview: `docs/architecture/overview.md` — "Service-to-Service Communication"
