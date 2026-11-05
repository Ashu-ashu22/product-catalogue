# Product Catalogue — Proof of Concept

A small product catalogue where customers browse, search and send an enquiry about a product. Built as a **foundation that can grow**, not a throwaway prototype: the product data source, look and feel, and email provider can each be swapped without touching the rest of the code.

| Layer | Choice |
|---|---|
| Client | **React + TypeScript** (Vite, React Router) |
| Backend | **Node.js + TypeScript** (Express 5, Zod) |
| Product data | Fake Store API, **only ever called by the backend** |
| Email | SMTP via Nodemailer → **Mailpit** locally (free fake inbox) |

**Why this stack:** one language (TypeScript) end-to-end keeps the codebase small for a single developer and lets the API contract be shared later. React web is the fastest way for the entrepreneur to click around a PoC on any device with no app-store step. Express is deliberately boring and widely known; the architecture (below) matters more than the framework.

---

## Run it (≈ 3 minutes)

**Prerequisite:** Docker Desktop (or Docker Engine + Compose v2).

```bash
git clone <this-repo-url> && cd product-catalogue
docker compose up --build
```

Then open:

| URL | What |
|---|---|
| http://localhost:8080 | **The catalogue** |
| http://localhost:8025 | **Mailpit — the "sales inbox".** Submit an enquiry and the email appears here. |
| http://localhost:4000/api/health | The API directly |

No `.env` is needed — every setting has a working default. To change one (e.g. which 5 products are featured), copy `.env.example` to `.env` and edit it.

> Needs internet access to `fakestoreapi.com`. If it is down, pages show a friendly error; once data has loaded, the API keeps serving its cached copy through short outages.

### Try the acceptance criteria

1. **Home** — the 5 "Top rated" products (chosen via `FEATURED_PRODUCT_IDS`).
2. **Category** — click a category in the header → "Top rated in …" plus "More in …".
3. **Search** — type `jacket` and click **Search** → only matching products.
4. **Product** — click any product tile → details page.
5. **Enquiry** — click **Enquire**, fill in the form, submit → "Thank you", and the email lands in Mailpit at http://localhost:8025.

---

## Run without Docker (for development)

Requires Node.js 20+.

```bash
docker compose up mailpit          # optional: an inbox for enquiry emails (or skip; enquiries will return 502)
cd backend  && npm install && npm run dev     # API on http://localhost:4000
cd frontend && npm install && npm run dev     # UI on http://localhost:5173 (proxies /api to :4000)
```

## Tests

```bash
cd backend  && npm install && npm test    # API, adapters, validation, email rendering
cd frontend && npm install && npm test    # Every acceptance criterion through the real UI + router
```

Or `npm test` at the repo root to run both. CI runs typecheck + tests on every PR (`.github/workflows/ci.yml`).

---

## Architecture

```
 Browser (React)                 Backend (Express)                               Outside world
 ───────────────                 ─────────────────                               ─────────────
 pages ─► api/client.ts ──/api──► http/app.ts (routes + Zod validation)
                                      │
                                      ▼
                                 services/  (business rules: featured, top-rated, search, enquiry)
                                      │ depends only on interfaces ("ports")
                                      ▼
                                 domain/ports.ts
                                   ├── ProductRepository   ◄── FakeStoreProductRepository ──► fakestoreapi.com
                                   ├── MerchandisingSource ◄── ConfigMerchandisingSource  ──► env: FEATURED_PRODUCT_IDS
                                   └── EnquiryNotifier     ◄── SmtpEnquiryNotifier        ──► Mailpit / SES / any SMTP
                                      ▲
                                 container.ts — the ONE place adapters are chosen
```

**What changing each expected thing looks like:**

| Change | Where |
|---|---|
| Real product database / commerce platform | New `ProductRepository` adapter + one line in `backend/src/container.ts` |
| New look and feel | `frontend/src/styles/theme.css` (all design tokens live there) |
| Different email provider (SES, SendGrid, CRM…) | Env vars for any SMTP provider, or a new `EnquiryNotifier` adapter |
| Business picks different featured products | `FEATURED_PRODUCT_IDS` (later: a CMS/admin behind `MerchandisingSource`) |

### API

| Method & path | Purpose |
|---|---|
| `GET /api/featured` | The hand-picked featured products |
| `GET /api/categories` | Category list (`slug`, `name`) |
| `GET /api/categories/:slug` | `{ category, topRated, others }` |
| `GET /api/search?q=term` | Products matching the term |
| `GET /api/products/:id` | Product details |
| `POST /api/products/:id/enquiries` | `{ name, email, phone?, message? }` → `202 { status: "received" }` |

Errors always look like `{ "error": { "code", "message", "fields?" } }` — `400` validation, `404` not found, `429` rate-limited, `502` upstream (product source or email) down.

### Security basics

- Every input validated with Zod (params, query, body); JSON body limited to 10 KB.
- Enquiry endpoint rate-limited per IP; hidden honeypot field drops bot submissions.
- Customer input HTML-escaped in emails; line breaks stripped from headers.
- The email names the product from **our** data, never from the client.
- `helmet` headers, no `x-powered-by`, CORS closed by default (same-origin via proxy).
- Internal error details are logged, never returned to the client.
- No secrets in the repo; config validated at startup (fails fast with a clear message).

---

## Repository guide

```
backend/    Express API — src/{domain,services,adapters,http}, test/
frontend/   React app — src/{api,pages,components,hooks,styles}
docker-compose.yml   web (nginx) + api + mailpit
DECISIONS.md   assumptions, cuts, how it grows, next steps
AI_USAGE.md    how AI was used, what it got wrong, how it was caught
CLAUDE.md      instructions given to the AI coding agent
```

See **[DECISIONS.md](DECISIONS.md)** and **[AI_USAGE.md](AI_USAGE.md)**.
