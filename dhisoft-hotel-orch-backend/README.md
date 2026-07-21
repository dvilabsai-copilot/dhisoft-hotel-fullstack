# DHISOFT Hotel OS — NestJS Backend

Production-oriented MVP backend for the accepted RainWood demo and the reusable **Shopify for Hotels** foundation.

## Included
- JWT authentication and role guards
- Tenant resolution (`x-tenant-slug`) and tenant-scoped queries
- Properties, room types, rate plans and daily inventory
- Section-based website builder with draft/version/publish flow
- Availability algorithm enforcing stop-sell, CTA, CTD, MLOS and occupancy
- Serializable reservation holds with optimistic inventory version checks
- Website and manual/agent/company/OTA reservation sources
- Online mock gateway flow, idempotent webhooks and verified offline payments
- Dashboard, reservation summary and arrival reports
- AxisRooms mapping, inbound inventory/rate/restriction endpoint, outbound booking jobs and retry state
- Prisma/PostgreSQL schema, seed data, Swagger and starter tests

## Run
```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev
```
API: `http://localhost:6006/api/v1`  
Swagger: `http://localhost:6006/docs`

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running the seed. Never commit or print the seed password.

## Important production gates
The AxisRooms and payment adapters are deliberately bounded interfaces with safe mock implementations. Replace them with vendor-certified clients, signed webhook validation, retry workers and reconciliation before a real launch. Add a background job to expire abandoned holds and restore inventory.
