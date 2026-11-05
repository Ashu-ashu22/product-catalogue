# Instructions for AI coding agents

This file is given to AI coding assistants (Claude) working in this repository.

## Project
A product catalogue PoC that must grow into a real product. The product data source, look and feel and email provider WILL change. Optimise for clear boundaries and readability over feature count.

## Architecture rules (do not break)
- The browser must never call the product source directly. All data goes through `/api`. Only `frontend/src/api/client.ts` knows URLs.
- Backend layering: `http/` → `services/` → `domain/ports.ts` ← `adapters/`. Services import only domain types and ports — never an adapter, never Express.
- `backend/src/container.ts` is the only place adapters are instantiated.
- Map external data into the domain model (`backend/src/domain/product.ts`) at the adapter boundary and validate it with Zod. Never leak an upstream shape into services or the frontend.
- Frontend components use CSS variables from `frontend/src/styles/theme.css`. No hard-coded colours or fonts in components.

## Code conventions
- TypeScript strict mode everywhere. No `any`.
- Validate all external input (params, query, body, env, upstream responses) with Zod.
- Errors: throw `NotFoundError` / `UpstreamError` from the domain; `http/errorHandler.ts` maps them. Never return stack traces or upstream messages to clients.
- No secrets in code or committed files. New config goes in `config.ts` (validated, with a safe local default) AND `.env.example` AND `docker-compose.yml`.
- Keep dependencies minimal; justify any new one.

## Testing
- Every acceptance criterion has a test in `backend/test/api.test.ts` and `frontend/src/App.test.tsx`. A change to behaviour updates those tests first.
- Backend tests run the real app; fake only the network edges (`fetchFn`, `EnquiryNotifier`).
- Frontend tests render the whole `App` and mock only `api/client`. Query by role/label (what users see), not by class or test id.
- Run `npm run typecheck && npm test` in both `backend/` and `frontend/` before declaring a task done.

## Working style
- Small, reviewable changes. Explain trade-offs in the PR/commit message.
- Record any new assumption in `DECISIONS.md`.
- If a requirement is ambiguous, make a reasonable assumption, write it down, move on.
