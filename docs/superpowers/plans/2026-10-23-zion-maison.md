# Zion Maison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the complete public boutique and functional administration defined by the approved design.

**Architecture:** Next.js App Router serves both experiences. Supabase PostgreSQL/Auth/Storage enforce identity, authorization and persistence. Server domain services validate all writes and integrations; a transactional outbox handles delivery independently.

**Tech Stack:** TypeScript strict, React, Next.js, Tailwind, Motion, Zod, Supabase, Sharp, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-23-zion-maison-design.md`

## Global Constraints

- BRL integer cents; timestamps UTC, reporting America/Belem.
- Production uses PostgreSQL persistence; no runtime mock database.
- No automatic stock decrement on WhatsApp click; sale must be confirmed.
- No production fictional products, testimonials or commercial details.
- No credentials in browser bundles or logs; RLS on exposed tables.
- Optional tracking requires consent; integrations disabled until configured.
- Preserve the approved mobile-first ivory/champagne/coffee visual direction.

## Review Focus

- Stale cart prices and archived variants: revalidate before recording intent (Task 2 tests).
- Concurrent last-unit sales and duplicate submissions: atomic, nonnegative, idempotent (Task 1 integration tests).
- Staff bypassing UI: database denies self-elevation and unauthorized mutations (Task 1 integration tests).
- Consent refusal/revocation: no behavioral events or optional identifiers (Task 5 tests).
- Hostile URLs, MIME and CSV cells: no SSRF, unsafe upload or spreadsheet formulas (Tasks 2/4 tests).

### Task 1: Database and access foundation

**Files:** `supabase/migrations/202610230001_foundation.sql`, `supabase/config.toml`, `src/server/supabase.ts`, `src/server/auth.ts`, `tests/database.test.ts`, project configuration.
**Interfaces:** `database()` returns session SupabaseClient; `serviceDatabase()` server-only privileged client; `requireAdmin(permission?: string)` returns `{db,user,profile}`. SQL `can_access(text)`, `record_sale(uuid,jsonb,text)`, `adjust_stock(uuid,integer,integer,text)` enforce authority and atomicity.
- [x] Write SQL integration tests: denied public drafts/admin writes; staff cannot change membership; last-unit sale cannot oversell; repeated sale is one stock movement.
- [x] Run `pnpm test tests/database.test.ts`; expect missing migration failure.
- [x] Implement schema, RLS, stock functions, audit and bootstrap boundary.
- [x] Run integration tests; expect all pass. Initialize development branch in the requested folder (no preexisting Git checkout).

### Task 2: Commercial and security domain

**Files:** `src/lib/domain.ts`, `src/lib/schemas.ts`, `src/lib/whatsapp.ts`, `src/lib/security.ts`, `tests/domain.test.ts`, `src/server/catalog.ts`, `src/server/commerce.ts`.
**Interfaces:** `buildWhatsAppMessage(name,items,baseUrl)` returns message; `reconcileSelection(selection,products)` returns validated snapshots; `safePushcutEndpoint(string)` returns validated URL; `csv(rows)` returns escaped CSV. Public product repository returns only published records via session RLS.
- [x] Write tests: integer quantities, unavailable variants, stale prices, accented link encoding, no silent truncation, hostile URLs, CSV formulas.
- [x] Run `pnpm test tests/domain.test.ts`; expect missing functions.
- [x] Implement validators and domain functions, typed catalog queries and transactional intent registration.
- [x] Run tests; expect pass.

### Task 3: Public boutique

**Files:** `src/app/(shop)/**`, `src/components/shop/**`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/selection-provider.tsx`, `tests/e2e/shop.spec.ts`.
**Interfaces:** `Product`, `Variant`, `Media`, `EditorialSection`; selection context stores variant IDs/quantities, favorites and optional remembered name. `/api/intent` validates selection; `/api/catalog` queries filters.
- [x] Write browser scenarios for responsive navigation, empty catalog, search, consent, selection persistence, product variant and WhatsApp message.
- [x] Run Playwright; expect missing pages.
- [x] Implement editorial homepage, catalog, product gallery, collections, looks, favorites, selection and institutional pages; dynamic CMS without fabricated commercial content.
- [x] Run browser tests and typecheck; expect working routes and no horizontal overflow.

### Task 4: Authenticated administration and media

**Files:** `src/app/admin/**`, `src/app/api/admin/**`, `src/components/admin/**`, `src/server/admin.ts`, `src/server/media.ts`, `scripts/bootstrap-owner.ts`, `tests/admin.test.ts`.
**Interfaces:** authenticated CRUD endpoints for approved resources use allowlisted schemas and permissions; product save includes variants transactionally; media finalization verifies actual bytes; mutations audit and refresh public content.
- [x] Write tests for permission matrix, publication validation, counterfeit image content and optimistic stock conflicts.
- [x] Run tests; expect missing implementation.
- [x] Implement login/recovery, responsive admin, catalog CRUD, variants, stock/sales, media library/editor, CMS/looks/videos, settings/team and audit.
- [x] Verify tests, login denial without infrastructure and no unauthenticated admin APIs.

### Task 5: Analytics, integrations and durable delivery

**Files:** `src/server/events.ts`, `src/server/integrations.ts`, `src/components/tracking.tsx`, `src/app/api/events/route.ts`, `src/app/api/jobs/route.ts`, `src/app/api/webhooks/whatsapp/route.ts`, `tests/events.test.ts`.
**Interfaces:** `emitEvent(event)` validated insertion; `processDeliveries()` leases and sends retryable jobs; `report(range)` aggregates real database events; `verifyWebhook(raw,signature,secret)` checks HMAC.
- [x] Write tests for consent refusal, retry limits, endpoint allowlist, signature invalidity, secret encryption and report denominator.
- [x] Run tests; expect missing implementation.
- [x] Implement consented tracking, Meta/GA adapters, dashboard/reports/CSV, private integration configuration, Pushcut worker, summaries and future WhatsApp webhook.
- [x] Run tests; expect pass; no external sends without configured credentials.

### Task 6: Verification, operations and delivery

**Files:** `README.md`, `.env.example`, `docs/operations.md`, `docs/integrations.md`, `docs/publication-checklist.md`, `src/app/sitemap.ts`, `src/app/robots.ts`.
- [x] Verify typecheck, lint, domain/database tests, build and browser flows; fix observed issues.
- [x] Add production/development setup, migrations, bootstrap, backups/recovery, retention, worker scheduling and provider requirements.
- [x] Request independent whole-project review; resolve material findings with regression tests.
- [x] Record exact verification results and external blockers; do not label unverified production features as production-ready.

## Execution decision

The user approved the design and explicitly authorized both plan and implementation, delegating technical choices. Execute inline without another approval loop. Use one independent final reviewer as required by executing-plans. Local project is newly created; work in the requested directory on a development branch rather than create an unnecessary duplicate checkout. Native Next.js/Vercel hosting takes precedence over Sites defaults because it is the explicitly approved stack.

## Delivery boundary

Local implementation and checks are complete; see `docs/progress.md` for exact evidence and intermediate failures. Service-dependent acceptance is explicitly pending, not implied by these implementation checkboxes. The user confirmed there is no Supabase project yet and requested setup instructions. No deployment or external account provisioning was performed.
