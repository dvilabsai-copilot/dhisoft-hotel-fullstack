# Vercel deployment runbook

This repository is a Vite React SPA.

## Project settings

- Root directory: `dhisoft-hotel-orch-frontend`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Preview first; promote only after staging validation.

Set only the public API configuration needed by the browser:

```text
VITE_API_URL=https://<verified-render-service>/api/v1
VITE_TENANT_SLUG=rainwood
VITE_ENABLE_DEMO_FALLBACK=false
```

Never expose database URLs, JWT secrets, integration credentials, or provider keys through `VITE_` variables.

`vercel.json` already rewrites SPA paths to `index.html`, so `/admin/...` and `/platform-admin/...` can refresh directly. Verify the rewrite on a preview deployment before promotion.

## Verification

Confirm the exact preview URL, browser preflight/CORS behavior, API URL in network requests, no localhost references, public routes, tenant login, platform login, and safe read-only admin flows. Record the actual Vercel URL and deployment commit only after observing them in Vercel.
