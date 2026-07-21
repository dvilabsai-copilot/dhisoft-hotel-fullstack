# DHISOFT Hotel OS Frontend Audit

Date: 2026-07-21
Repository: `dhisoft-hotel-orch-frontend` (nested in the shared Git worktree)
Base commit observed: `4a22b06`

## Architecture summary

React 18/Vite SPA using React Router, Axios API clients, local session state, a RainWood public storefront, tenant administration, a section-based website builder, booking flow, and an in-progress DHISOFT platform-admin control plane. Vercel SPA fallback is configured through `vercel.json`.

## Current functionality

- Public routes cover home, hotels, property/room detail, offers, gallery, contact, booking, and configurable pages.
- Tenant routes cover dashboard, builder, reservations, payments, reports, AxisRooms, content, users, and support access.
- Platform routes cover login, dashboard, tenants/onboarding/detail, plans, subscriptions, themes, domains, features, integrations, support, users, audit, and health.
- Axios clients separate tenant and platform token storage and attach tenant slug only to tenant requests.
- A disabled-by-default demo fallback exists for public content/API unavailability.

## Confirmed findings

- Frontend lint, Vitest unit tests, and production build pass at baseline.
- Playwright is configured for desktop/mobile with a local Vite web server, but coverage is currently only a small public navigation test plus a conditionally skipped admin-builder reachability test.
- The frontend uses `localStorage` for bearer tokens; this is an accepted implementation tradeoff only if XSS defenses and strict content validation remain effective.
- Several platform/admin screens use broad `any` response types and have limited loading/empty/error handling; this is a maintainability and UX risk rather than a compile failure.
- The API default is `/api/v1`, while the attached request’s example uses `/api`; this must remain aligned to the backend’s actual global prefix/versioning.
- The current Vite config already uses port 6080 and `vercel.json` provides an SPA rewrite.

## Security and UX findings

- Platform and tenant clients use separate token keys and 401 cleanup, but automated proof of cross-boundary denial is absent.
- User-facing platform forms handle passwords as input fields and do not persist them, but no MFA/WebAuthn flow is implemented in the UI.
- Structured builder settings are preferable to arbitrary HTML; client-side forms should continue to treat server validation as authoritative.
- Public pages need explicit browser verification for mobile overflow, keyboard focus, broken media, API failure states, and nested-route refresh.
- Production API URL must be supplied through `VITE_API_URL`; no backend secrets may be exposed as Vite variables.

## Build and deployment risks

- Existing browser tests require the backend/seeded data for authenticated flows and do not yet provide API-assisted setup.
- No live cloud URL is known or claimed; Render/Neon/Vercel validation remains external and authentication-dependent.
- Browser console/network evidence and screenshots have not yet been collected.

## Proposed corrections

1. Preserve the current public RainWood routes and add loading/error/empty states where missing.
2. Add focused Playwright coverage for public navigation, tenant login, platform login, token-boundary denial, and builder publish using a controlled local setup.
3. Add a local UI validation report with viewport/browser/date/commit and explicit blocked vendor workflows.
4. Add deployment documentation and confirm Vercel rewrites/API configuration without embedding secrets.

## Files changed later

This section will be updated after each verified implementation batch. Existing user modifications are not overwritten or reset.
