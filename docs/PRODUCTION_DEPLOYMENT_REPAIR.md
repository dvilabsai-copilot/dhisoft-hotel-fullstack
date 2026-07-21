# Production Deployment Repair

Status: repair branch validated locally and against the temporary Neon test branch. Production schema migration is complete; Render configuration and application deployment remain gated.

## Source control

- Repository: `dvilabsai-copilot/dhisoft-hotel-fullstack`
- Repair branch: `codex/hotel-os-production-deployment-repair-20260721`
- Base main commit: `348377dd7be2e3b5e8f5dbbab6072877d911b81a`
- Production Render service: `dhisoft-hotel-api`
- Production Vercel project: `dhisoft-hotel-fullstack`

## Provider protection and current state

- Render repository: `dvilabsai-copilot/dhisoft-hotel-fullstack`, branch `main`, root `dhisoft-hotel-orch-backend`.
- Render auto-deploy was disabled through the Render dashboard before repair work.
- Previous successful Render deployment remains commit `67d4852`; the failed deployment for `348377d` did not replace it.
- Vercel production currently points to commit `348377d` and is Ready, but the frontend cannot complete API workflows while Render serves the older backend.
- Render's configured production database host matches the Neon `production` branch.

## Exact backend environment contract

Required for production startup or runtime:

`NODE_ENV`, `PORT` (Render-supplied), `DATABASE_URL`, `DIRECT_URL`, `TENANT_JWT_SECRET`, `PLATFORM_JWT_SECRET`, `JWT_EXPIRES_IN` (optional default), `DEFAULT_TENANT_SLUG`, `PLATFORM_BASE_DOMAIN`, `CORS_ORIGINS`, `INTEGRATION_ENCRYPTION_KEY`, `PAYMENT_WEBHOOK_SECRET`, and `AXISROOMS_WEBHOOK_SECRET`.

Optional or controlled bootstrap configuration:

`PLATFORM_BOOTSTRAP_EMAIL`, `PLATFORM_BOOTSTRAP_PASSWORD`, and `PLATFORM_BOOTSTRAP_NAME` are used only when no platform user exists. Remove the bootstrap password after the initial owner is created. `ENABLE_SWAGGER` is optional and should remain disabled in production unless intentionally enabled.

`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are for an explicit local/controlled seed only and are not part of normal production startup. `JWT_SECRET` is a legacy variable and is not used by the repaired source. `PAYMENT_PROVIDER_MODE` is not an application variable in this repository; the source contract currently uses `PAYMENT_PROVIDER` only as a documented provider setting. `AXISROOMS_MODE` is documented for future provider selection but is not read by the current source.

## Code repairs

- Added public `/api/v1/health/live` and database-aware `/api/v1/health/ready` endpoints.
- Added production environment validation for required values and distinct JWT secrets.
- Added an explicit `RAINWOOD_BOOTSTRAP_ACTIVE=true` flag that only promotes the RainWood tenant from `ONBOARDING` to `ACTIVE`.
- Scoped payment idempotency to `(tenantId, idempotencyKey)` and reject mismatched reservation, amount, or currency reuse.
- Made payment confirmation and cancellation conditional and serializable so concurrent requests cannot double-count payments or restore inventory twice.
- Added critical API smoke coverage and platform-admin Playwright coverage.

## Neon migration review and execution

Migration history already present in production:

- `20260720232359_init`
- `20260721053055_add_tenant_status_values`
- `20260721053056_add_platform_control_plane`

Applied to production after review:

- `20260721120000_harden_payment_idempotency`

The production branch had one tenant, one user, two properties, zero reservations, and zero payments both before and after the migration. The resulting Payment indexes include `Payment_tenantId_idempotencyKey_key`; the global idempotency index was removed.

Neon rollback reference: a manual production snapshot was created on 2026-07-21 at 08:46 UTC with no expiry. The Free plan also exposes a six-hour point-in-time restore window.

## Temporary Neon test branch

Branch: `staging-hotel-os-20260721` (temporary isolated test database only).

The schema-only branch contained the base schema without matching Prisma migration history. The existing base schema was recorded as the initial migration, then all remaining reviewed migrations were applied. RainWood was explicitly activated through the controlled bootstrap flag.

Validated against the branch:

- migration history and bootstrap records
- RainWood tenant `ACTIVE`
- tenant/platform login and dashboards
- token-boundary rejection
- booking, mock payment, idempotency replay
- concurrent payment confirmation
- inventory decrement/restoration
- website builder draft/publish/public visibility
- API smoke and six desktop/mobile Playwright tests

## Remaining deployment gate

The Render dashboard must receive the repaired environment contract, including the Neon production pooled/direct URLs and new distinct tenant/platform secrets. Values must be entered only in Render, never committed or pasted into chat. After that, deploy the repair commit manually, verify both health endpoints and authenticated workflows, then merge the repair PR and deploy Vercel only after the backend is healthy.

## Rollback

- Neon: restore the recorded manual snapshot or use the available point-in-time restore window; do not run `prisma migrate reset`.
- Render: manually deploy the last known-good deployment/commit `67d4852` from the dashboard.
- Vercel: promote the last known-good production deployment from the Vercel dashboard.
