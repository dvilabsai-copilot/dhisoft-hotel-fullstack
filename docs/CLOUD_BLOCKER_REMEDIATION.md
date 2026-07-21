# Cloud blocker remediation checklist

Date: 2026-07-21
Validated branch: `codex/hotel-os-local-cloud-validation-20260721`

## Repaired runtime contract

Backend root: `dhisoft-hotel-orch-backend`

- Node: `>=20.19.0 <25`; native Node runtime, no Docker.
- Build: `npm ci && npm run prisma:generate && npm run build`.
- Migration: `npm run prisma:migrate:deploy` against the isolated staging database only.
- Start: `npm run start:prod`.
- Health: `/api/v1/health`.
- Frontend root: `dhisoft-hotel-orch-frontend`.
- Frontend build: `npm ci && npm run build`; output `dist`.
- Frontend API base: `VITE_API_URL` must already include `/api/v1` exactly once.

## Required staging variables

Render staging must configure the repaired names, with secret values entered only in the provider UI:

`NODE_ENV`, `DATABASE_URL`, `DIRECT_URL`, `TENANT_JWT_SECRET`, `PLATFORM_JWT_SECRET`, `JWT_EXPIRES_IN`, `PLATFORM_JWT_EXPIRES_IN`, `INTEGRATION_ENCRYPTION_KEY`, `PLATFORM_BOOTSTRAP_EMAIL`, `PLATFORM_BOOTSTRAP_PASSWORD`, `PLATFORM_BOOTSTRAP_NAME`, `DEFAULT_TENANT_SLUG`, `PLATFORM_BASE_DOMAIN`, `CORS_ORIGINS`, `AXISROOMS_MODE`, `AXISROOMS_BASE_URL`, `AXISROOMS_API_KEY`, `AXISROOMS_WEBHOOK_SECRET`, `PAYMENT_PROVIDER`, and `PAYMENT_WEBHOOK_SECRET`.

Use mock/sandbox provider modes for staging. Tenant and platform JWT secrets must be different. Do not retain the legacy `JWT_SECRET` as a substitute.

Vercel Preview must configure `VITE_API_URL` to the Render staging origin plus `/api/v1`, `VITE_TENANT_SLUG=rainwood`, and `VITE_ENABLE_DEMO_FALLBACK=false`.

## Safe provider sequence

1. Create Neon branch `staging-hotel-os-20260721`, or create a separate free project `dhisoft-hotel-os-staging` if branching is unavailable. Never modify the current production/default branch.
2. Obtain pooled and direct staging URLs without printing or committing them.
3. Run Prisma `migrate:deploy`, then the idempotent staging seed/bootstrap with staging-only credentials.
4. Create a separate Render service `dhisoft-hotel-api-staging` on the repaired branch. Do not modify `dhisoft-hotel-api`.
5. Deploy and verify `/api/v1/health`, public website, tenant login, platform login, token boundaries, and CORS.
6. Create a Vercel Preview deployment from the repaired branch with the Render staging API URL.
7. Run the authenticated API smoke matrix and Chrome staging workflows.
8. Stop at the production-promotion checkpoint and request explicit approval.

## Current blockers

- Neon currently exposes only the production/default branch and its staging-branch control was disabled during inspection.
- Existing Render service is production-labeled, points to old `main`, and has legacy environment names; it must not be repointed.
- Existing Vercel project has a blocked branch preview; diagnose deployment protection, repository linkage, root directory, and build configuration before using a separate staging project.
- No cloud secrets, database URLs, production credentials, or vendor credentials belong in Git or chat.
