# Full-Stack Recipe Platform Design

**Status:** Approved conversational design; written-spec review pending  
**Date:** 2026-08-24

## Purpose

Recipe Card Generator is currently a React/Vite single-page application deployed as static assets to S3/CloudFront. It renders a presentation-neutral recipe JSON contract, supports matrix/traditional/timeline views, and has unit and Playwright coverage.

The target system is a full-stack recipe platform in which the SPA is a renderer and workflow client, the backend owns authentication and authorization, structured recipe artifacts are persisted as immutable revisions, and selected users can spend an administrator- or plan-granted credit budget to convert unstructured recipes through an LLM.

This document records the complete desired end state. Implementation will proceed through incremental vertical slices; the initial slices must not prematurely implement billing, production LLM calls, or every authorization tier.

## Goals

- Serve validated recipe JSON from a backend API rather than bundling all runtime recipe data in the SPA.
- Preserve the existing recipe contract as the stable boundary between data generation and rendering.
- Store original sources, structured revisions, modification requests, provenance, and validation outcomes.
- Support public, authenticated, private, direct-share, and group-share visibility.
- Support self-managed authentication with multiple login identities linked to one application account.
- Provide asynchronous LLM conversion with provider-neutral adapters.
- Meter LLM work through opaque application credits while retaining provider token and cost data internally.
- Make local unit, integration, and E2E testing deterministic and inexpensive.
- Leave commercial plan composition and provider selection configurable rather than embedded in domain logic.

## Non-goals for the initial implementation

- Users editing structured JSON directly.
- Real billing or subscription checkout.
- Running real LLM calls during normal tests or verification suites.
- A microservice deployment from day one.
- Final commercial pricing or an exhaustive role catalog.
- Collaborative editing of recipes or structured artifacts.

## Architecture

Use a TypeScript modular monolith with an explicit API/worker boundary:

```text
SPA on S3/CloudFront
          |
       HTTPS/JSON
          v
     TypeScript API -------- Postgres
          |                    ^
          v                    |
     Job worker ---------------+
          |
          v
  Provider-neutral LLM adapter
```

### SPA

The SPA becomes a renderer and workflow client. It fetches recipes, revisions, authorization-aware metadata, and job status through the API. It may retain local-only UI state such as theme and progress, but it must not make authorization decisions or contain provider credentials.

The existing recipe contract remains presentation-neutral and is the renderer input. The backend must return validated artifacts that satisfy the contract; the frontend should not need to interpret unstructured recipe text.

### API

The API owns authentication, session handling, authorization, recipe visibility, sharing, entitlements, credit reservation, job creation, and the REST representation of resources. Authorization is enforced server-side for every protected read and mutation.

### Worker

The worker processes asynchronous conversion jobs. It loads source data, invokes the selected model adapter, validates and persists output, records provenance and usage, and reconciles credit reservations. Initially it may poll a database-backed job table; a dedicated queue is an optional later optimization.

### Database

Postgres is the recommended initial database. It provides transactional credit accounting, relational ownership and sharing rules, durable job state, JSON storage for recipe artifacts, and a straightforward local Compose setup. The recipe JSON may be stored in JSONB alongside relational metadata.

Object storage is optional initially. Add S3-compatible object storage if source uploads or artifacts become too large for practical database storage.

### Deployment

Keep static SPA delivery on S3/CloudFront. Deploy the API and worker as TypeScript services, with Postgres managed or containerized according to environment. Store credentials and signing keys outside the frontend bundle. The deployment topology may later split the API and worker into independent services without changing their domain interfaces.

## Domain model

### Users and identities

- `users` represent application accounts.
- `identities` represent login methods and contain provider plus provider subject, never recipe ownership.
- `sessions` represent authenticated browser sessions.
- One user may link multiple Google, Apple, and passkey identities.
- Account linking must prevent accidental merging of two existing accounts and require an authenticated, deliberate linking flow.

Authentication providers are replaceable. Google OIDC and WebAuthn passkeys are the no-provider-fee baseline. Apple Sign in may be added behind the same interface; production web configuration requires Apple Developer enrollment and associated Apple identifiers.

Use secure server-side sessions, preferably represented to the SPA by an HTTP-only, secure, same-site cookie. Avoid putting provider credentials or long-lived identity tokens in browser storage.

### Recipes and immutable revisions

- `recipes` represent logical recipe objects and contain the owner plus visibility and current-revision pointers.
- `recipe_revisions` contain immutable structured JSON artifacts.
- A revision records its source type, parent revision when applicable, source input, and creation actor.
- Original unstructured input is retained.
- A modification request is retained as a separate input and derives a new revision from the selected parent.
- No user-facing workflow edits structured JSON directly.
- A new conversion creates a new revision; prior revisions remain immutable for provenance, comparison, rollback, or audit.

The current/published revision pointer may move to a new revision, but the revision records themselves never change. Exposing historical revisions is subject to the same owner/share authorization policy unless a later product decision specifies otherwise.

### Visibility and sharing

Recipes support four visibility levels:

1. `public`: readable without authentication.
2. `authenticated`: readable by any signed-in user.
3. `shared`: readable by explicitly granted users or owner-created groups.
4. `private`: readable only by the owner.

An owner can create ad-hoc sharing groups scoped to that owner, manage group membership, and grant a recipe to a group. Initial group grants are view-only. Direct user grants are also supported. Group membership and grants should be revocable without mutating the recipe artifact.

The policy layer must answer resource/action questions rather than plan-name questions, for example:

- Can this requester view this recipe?
- Can this requester create a recipe?
- Can this requester share this recipe?
- Can this requester submit a conversion?
- Can this requester manage this sharing group?

Public access may be anonymous. Authenticated-only, private, and shared access requires a valid application session.

### Capabilities and entitlements

Define stable capabilities such as:

- `view_authenticated_recipes`
- `create_recipe`
- `convert_recipe`
- `share_recipe`
- `manage_group`

Plans, administrator grants, and future subscriptions produce capabilities and credit allowances. The policy engine should not encode plan names. Exact plans, prices, and which capabilities each plan contains are intentionally deferred.

### Credits and usage ledger

Users receive opaque application credits. They see their allowance, consumption, and reset/re-up state, not provider token economics.

The system retains a detailed usage ledger containing:

- User and acting account
- Conversion job and revision references
- Credit reservation, final charge, refund, or adjustment
- Provider and model
- Input, output, cached, and reasoning token counts when available
- Provider-reported monetary cost when available
- Prompt/template version
- Timestamps and job outcome

Initially the administrator grants credits manually. The long-term model supports monthly plans such as view-only and conversion tiers with different monthly allowances. Billing and plan configuration can be added later without changing the usage ledger or authorization interfaces.

Credit operations must be transactional and idempotent:

1. Estimate or reserve the maximum configured application-credit amount before starting a job.
2. Reject the request when the available balance is insufficient.
3. Reconcile the reservation after completion.
4. Refund or retain unused/reserved credits according to an explicit failure policy.
5. Ensure retries cannot double-charge a user.

### Conversion jobs

Conversion is asynchronous. A job includes requester, source or parent revision, modification request, requested model policy, status, credit reservation, attempts, and timestamps.

Expected states include `queued`, `running`, `succeeded`, `failed`, and `cancelled`. A structurally valid artifact may complete as `succeeded` while its stored validation result sets `needs_review`; that artifact must not become the current trusted revision until the product's review policy permits it. A failed generation or structurally invalid result must not become a trusted revision. Invalid outputs should be retained for diagnosis while the job reports an actionable result to the client.

## LLM provider abstraction

The domain owns a canonical request and response interface, for example:

```text
generateStructuredRecipe(request) ->
  structured_output
  provider_usage
  provider_metadata
```

Adapters translate this interface to OpenAI, Anthropic, DeepSeek, or other providers. Provider-specific structured-output features, retry rules, reasoning controls, and usage fields stay inside adapters.

The canonical prompt contract is versioned. Each generated revision records the prompt/template version and model policy used. Model choice should be configurable per environment, operation, or evaluation run; normal tests use a deterministic fake adapter.

The existing `recipe-card-structurer` instructions and schema remain the domain starting point. Generation must preserve source meaning, avoid invented quantities/timings, produce the full contract, and report ambiguity through validation rather than silently creating false precision.

## REST API shape

Initial resource-oriented endpoints may include:

- `GET /recipes/:id`
- `GET /recipes/:id/revisions`
- `POST /recipes`
- `POST /recipes/:id/conversions`
- `GET /jobs/:id`
- `POST /recipes/:id/shares`
- `POST /groups`
- `POST /groups/:id/members`
- `GET /me/entitlements`
- `GET /me/usage`

The exact versioning and pagination conventions can be finalized during implementation, but endpoint behavior must consistently apply the policy layer. Anonymous access is permitted only for explicitly public resources.

## Local development and testing

Add a `compose.yaml` for local infrastructure. The initial stack should include Postgres and, as the backend is introduced, the API and worker. Add object storage or a queue only when a concrete requirement appears.

Use a deterministic fake LLM adapter for local development and automated tests. It should return fixed fixture outputs, configurable validation failures, and controllable delays/failures so job behavior is testable without spending provider credits.

Test layers:

- Unit tests for schema validation, policy evaluation, visibility, group grants, credit accounting, job transitions, and provider-adapter normalization.
- Integration tests against local Postgres for transactions, migrations, authorization queries, reservations, and immutable revision persistence.
- API tests for anonymous/public, authenticated, owner, direct-share, group-share, and denied access paths.
- Playwright E2E tests for renderer behavior, authentication stubs, job progress, successful conversion, and failure states.
- Explicit evaluation commands for real model calls; these are never part of standard build, unit, integration, or E2E verification.

## Incremental implementation slices

1. **Backend foundation**: establish TypeScript service structure, shared recipe contract, configuration, migrations, and health checks.
2. **Read-only persistence API**: import existing example recipes into Postgres and expose authorized/public recipe reads.
3. **SPA API migration**: replace bundled runtime recipe loading with API-backed loading while preserving renderer behavior and tests.
4. **Local infrastructure**: add Compose Postgres, migration/seeding commands, integration-test fixtures, and deterministic fake adapters.
5. **Authentication baseline**: add application users, Google OIDC, passkeys, sessions, identity linking, and test login stubs.
6. **Visibility and sharing**: add ownership, public/authenticated/private policies, direct grants, ad-hoc groups, and group membership.
7. **Async conversion skeleton**: add jobs, fake worker, immutable revisions, validation, provenance, and SPA job status.
8. **Credit accounting**: add administrator grants, reservations, usage ledger, reconciliation, and conversion capability checks.
9. **Real provider adapters**: add one provider first, then additional providers behind the canonical interface; keep real calls out of normal verification.
10. **Commercial entitlements**: define plans, recurring allowances, and billing only after usage and authorization behavior are proven.

Each slice should leave the application runnable and testable. No slice should require the final commercial tier design or a production model-selection policy.

## Deferred decisions

- Exact monthly plan prices and capability composition
- Billing provider and subscription lifecycle
- Whether authenticated-only viewing is paid, free, or grant-based
- Exact credit pricing per conversion/model
- Apple Sign in production enrollment
- Queue technology and independent API/worker deployment
- Object-storage threshold and retention policy
- Revision visibility for shared users
- Administrative UI versus initial database/CLI grants

These decisions are intentionally represented as configuration or policy boundaries rather than left as hidden assumptions in the core data model.
