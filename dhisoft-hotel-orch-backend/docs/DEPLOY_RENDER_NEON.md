# Render + Neon deployment runbook

This repository is a native Node.js NestJS service. It does not require Docker.

## Neon

Create or select an application-specific staging project. Configure two private connection strings:

- `DATABASE_URL`: Neon pooled runtime connection.
- `DIRECT_URL`: Neon direct connection for Prisma migration commands.

Do not place either value in Git, frontend variables, logs, screenshots, or documentation. Apply migrations with `npm run prisma:migrate:deploy` before enabling application traffic. Do not use `prisma db push` for deployment.

## Render Web Service

- Root directory: `dhisoft-hotel-orch-backend`
- Runtime: Node
- Build: `npm ci && npm run prisma:generate && npm run build`
- Pre-deploy: `npm run prisma:migrate:deploy`
- Start: `npm run start:prod`
- Health path: `/api/v1/health`

Set a supported Node version through the repository `engines.node` range or the Render service settings. Render supplies `PORT`; the application binds to `0.0.0.0` and respects that value.

Required private environment variables include `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, `TENANT_JWT_SECRET`, `PLATFORM_JWT_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, `CORS_ORIGINS`, and provider-specific mock/sandbox flags until certified vendor credentials exist. Use platform bootstrap variables only for the first controlled owner bootstrap, then rotate/disable them according to the platform runbook.

Keep Swagger disabled in production unless `ENABLE_SWAGGER=true` is an intentional, protected decision. Never use wildcard production CORS or default JWT secrets.

## Verification

Verify the Render health endpoint, migration result, platform login, tenant login, public website API, token audience isolation, and a safe read-only smoke set. Record the actual service URL and deployment commit in the final validation report only after observing them in Render.
