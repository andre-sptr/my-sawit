# Rekapal (`my-sawit`)

## Architecture & Runtime
- Next.js 16 + Prisma SQLite (`dev.db`) app for `https://rekapal.site`.
- Served via Docker container `rekapal` on `127.0.0.1:5000`, using 1Panel runtime at `/opt/1panel/runtime/node/rekapal`.

## Verification Commands
- Lint: `npm run lint`
- Test: `npm test`
- Build: `npm run build` (`prisma generate && next build`)

## Known Gotchas & Guardrails
- Ownership quirk: `node_modules/` and `.next/` are owned by `root:root` (generated inside the Docker container), while source files are owned by `ubuntu:ubuntu`.
- Never overwrite, delete, or commit `dev.db` or `.env`.
- Keep service bound to `127.0.0.1:5000` behind OpenResty.
