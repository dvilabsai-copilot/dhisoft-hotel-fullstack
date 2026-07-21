# Local UI Validation Report

Date: 2026-07-21
Baseline commit: `4a22b06` plus uncommitted working-tree changes audited in this run
Browser: Codex In-app Browser (Chromium-backed)
Viewports: default desktop; 390x844 mobile override (reset after test)
Frontend: `http://127.0.0.1:6080`
Backend: `http://127.0.0.1:6006`

## Passed workflows

- Public home loaded from live API configuration and rendered the RainWood Heritage hero, booking widget, properties, gallery, and contact sections.
- Public `/hotels`, `/offers`, `/gallery`, `/contact`, and `/booking` routes rendered expected headings.
- Tenant login reached `/admin`; dashboard rendered RainWood tenant context and tenant-admin role.
- Website Builder reached `/admin/website` with pages, section palette, structured settings, preview, draft, and publish controls.
- Platform login reached `/platform-admin`; platform dashboard rendered separately from tenant context.
- Mobile home at 390x844 had no horizontal overflow (`scrollWidth` 375) and the Menu control exposed all six public navigation links.
- Booking flow searched availability, selected the seeded room/rate plan, created a local hold, displayed taxes/total, completed the mock payment, and rendered a voucher/booking reference.
- The resulting reservation appeared in tenant admin and a repeat availability search showed 7 rooms after the original 8-room inventory, confirming one consumption in this local run.
- Browser console contained zero error-level entries during the tested workflows.

## API-backed boundary checks used during UI validation

- Health, public website, tenant login, platform login, tenant dashboard, and platform dashboard returned success.
- Tenant token on platform endpoint returned 401.
- Platform token on tenant endpoint returned 401.
- Invalid platform password returned 401; invalid route returned 404.

## Remaining vendor-blocked or not exercised

- Real AxisRooms credentials/certification and production sync were not used; the project remains in mock/sandbox mode.
- Real payment gateway, email, SMS, and WhatsApp providers were not used.
- Custom-domain DNS ownership/verification and cloud deployment were not exercised.
- MFA/WebAuthn completion remains an external product/security requirement.
- Full Playwright suite still needs expansion beyond the current smoke specs and should be run with the browser binaries installed.
