# DHISOFT Hotel OS — React Frontend

React/Vite implementation of the accepted RainWood demo plus the V1 multi-tenant, section-based website builder.

## Included
- RainWood Heritage visual system based on the accepted demo
- Dynamic homepage section renderer
- Hotel listing and hotel detail pages
- Booking widget and full booking journey
- Transactional reservation hold integration
- Mock gateway completion and voucher
- Protected admin layout
- Website builder: pages, section palette, reorder, structured settings, draft/version/save/publish and preview
- CRS-style manual reservation entry
- Manual/offline payment verification
- Operational reports
- AxisRooms mapping and sync-job retry screens
- Responsive desktop/mobile styling

## Run
```bash
cp .env.example .env
npm install
npm run dev
```
Backend should run at `http://localhost:6006`. Use the administrator email and password configured through the backend seed environment variables after seeding.

## Builder boundary
This is a safe section-based builder. It intentionally does **not** execute arbitrary tenant-provided HTML or JavaScript. The RainWood theme can be reproduced through validated section settings and theme tokens.
