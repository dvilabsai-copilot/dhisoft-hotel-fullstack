# DHISOFT Hotel OS Backend Audit

Date: 2026-07-21
Repository: `dhisoft-hotel-orch-backend` (nested in the shared Git worktree)
Base commit observed: `4a22b06`

## Architecture summary

NestJS 10 API with Prisma/PostgreSQL, URI versioning under `/api/v1`, global validation, Helmet, compression, Swagger, tenant middleware, tenant JWT authentication, and a section-based website/booking/reservation/payment core. The working tree also contains an in-progress DHISOFT platform control plane: separate platform JWT strategy/guard, platform users, tenant lifecycle, plans, features, themes, domains, encrypted integrations, audit logs, health, and support-access modules.

## Current functionality

- RainWood tenant-scoped properties, rooms, rate plans, inventory, restrictions, offers, website pages, media, enquiries, reservations, payments, reports, and AxisRooms adapter boundaries exist.
- Website content validation rejects unsafe section payloads and arbitrary script/HTML execution is not part of the renderer.
- Reservation holds use transactional inventory updates and version checks; payment and AxisRooms adapters are mock/bounded integrations.
- The in-progress platform modules expose separate platform login and management routes, but their schema/migration integration is incomplete.

## Confirmed findings

- The shared Git worktree has extensive uncommitted user changes. They are preserved and treated as in-scope existing work.
- A full platform Prisma schema is present as an untracked backend-root `schema.prisma`, while tracked `prisma/schema.prisma` remains the older tenant-only schema. Prisma commands therefore generate different client shapes depending on command/path resolution.
- `DIRECT_URL` is absent from the local `.env`, so explicit Prisma validation of the tracked schema fails before database access.
- Backend lint and tests fail with missing platform enums/models; the backend build, after root-schema generation, reaches a single `JsonValue`/`InputJsonValue` typing error in platform bootstrap.
- Frontend lint, unit tests, and production build pass at baseline. Playwright is configured, but the existing E2E specs are minimal and one admin spec is conditionally skipped unless `E2E_WITH_BACKEND` is set.
- Existing `.env.example` files still use the legacy single `JWT_SECRET`/`SEED_ADMIN_*` contract and do not document platform bootstrap or integration encryption settings.
- The tracked migration is only the original tenant application schema; the platform models require a reviewed follow-up migration before local/cloud deployment.

## Security findings

- Separate tenant/platform JWT audiences and secrets are implemented in the working tree, but cannot be considered validated until the canonical schema and boundary tests run.
- Tenant middleware rejects missing/inactive tenants and tenant guards compare token tenant IDs; cross-tenant and token-boundary tests are still required.
- Platform integration credentials are encrypted through AES-256-GCM and API responses are intended to expose metadata only; encryption-key configuration and redaction tests are still required.
- Default development JWT fallbacks remain in code and must be rejected or strongly constrained in production configuration.
- Swagger is enabled unconditionally; production exposure should be an explicit configuration decision.
- Login/contact/webhook rate limiting and a production-grade request audit/structured logging strategy are not yet present.

## Build, database, and deployment risks

- Duplicate schema locations can produce schema/client drift and an invalid migration history.
- Local PostgreSQL 16 service is running, but the configured database/role and migration/seed result have not yet been verified.
- Node `v24.14.0` is installed; no repository Node version marker is present. Compatibility must be verified rather than silently changing major versions.
- Deployment manifests/docs for Render/Neon/Vercel are incomplete; no cloud deployment is claimed or attempted until local validation succeeds.

## Proposed corrections

1. Make one Prisma schema path canonical and update all scripts/validation to use it.
2. Add a reviewed migration for platform models and confirm the migration applies on a dedicated local database.
3. Fix remaining strict TypeScript errors and run generated-client lint/tests/build.
4. Add environment examples for separate JWT secrets, platform bootstrap, encryption, mock providers, and direct Prisma URL without secret values.
5. Add boundary, tenant-isolation, encryption-redaction, and platform-owner safety tests where the current service contracts permit.
6. Add deployment/runbook documentation and a validation report with explicit unverified external blockers.

## Files changed later

This section will be updated after each verified implementation batch. Existing user modifications are not overwritten or reset.
