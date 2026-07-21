# API Smoke Matrix

Run against an already-started local or staging API without printing credentials:

```powershell
$env:SMOKE_TENANT_EMAIL='admin@rainwood.local'
$env:SMOKE_TENANT_PASSWORD='<local-only value>'
$env:SMOKE_PLATFORM_EMAIL='owner@dhisoft.local'
$env:SMOKE_PLATFORM_PASSWORD='<local-only value>'
npm run test:smoke
```

The runner validates health, public website access, tenant login, platform login, both dashboards, tenant/platform token-boundary denial, invalid credentials, and invalid-route handling. It is intentionally read-only after authentication and does not call payment, archival, domain, integration, or vendor endpoints.
