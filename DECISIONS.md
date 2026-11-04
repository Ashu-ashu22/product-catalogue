# Decisions and assumptions

## Assumptions (where the acceptance criteria left gaps)

| # | Gap | Assumption | Why |
|---|---|---|---|
| A1 | **"I have chosen 5 products to be top rated"** — chosen how? | The business hand-picks them. Stored as an ordered list of IDs in config (`FEATURED_PRODUCT_IDS`, default `1,5,9,13,18` — one or more from each category). Shown in that order. | "I have chosen" describes a curation decision, not a calculation. Config is the simplest thing that lets the owner change it today; it sits behind a `MerchandisingSource` interface so a CMS or admin screen can replace it. |
| A2 | A featured ID no longer exists in the source | Skip it, log a warning, show the rest. | One stale ID shouldn't break the home page. |
| A3 | **Category page "top rated"** — chosen or calculated? | Calculated: the top **3** products in the category by average rating (ties → more reviews wins). The rest are listed under "More in …", also highest-rated first. `TOP_RATED_PER_CATEGORY` configures the 3. | No one is going to hand-pick per category in a PoC, and Fake Store provides ratings. Fake Store categories have 4–6 products, so 3 leaves room for "additional products". |
| A4 | **Search matching** | Case-insensitive. A product matches when **every word** of the term appears in its title, description or category name. Whitespace trimmed; blank searches are not sent. Max 100 chars. | "Only see products that have text matching" — searching title + description + category is what a customer expects. Requiring every word keeps results relevant ("slim shirts" doesn't return every "slim" item). |
| A5 | Search runs where? | In the backend (Fake Store has no search endpoint). Exposed on the `ProductRepository` interface so a future source with real search (Postgres FTS, OpenSearch, Algolia) does it natively. | Keeps the client dumb and the rule in one place. |
| A6 | **"Contact details"** on the enquiry form | Name and email required; phone and message optional. | Email is the minimum for sales to reply; fewer required fields = more enquiries. |
| A7 | **"The sales inbox will receive an email"** | One configurable address (`SALES_INBOX`). Email has `Reply-To` set to the customer so sales can just hit Reply. No confirmation email to the customer. | Not asked for; a customer email adds deliverability/spam concerns. Easy to add as a second notifier. |
| A8 | When is "Thank you" shown? | Only **after** the email server accepts the message. If sending fails the customer sees an error and keeps their typed details. | A "Thank you" for an enquiry that was silently lost is worse than an honest error. |
| A9 | Currency | Fake Store has no currency; assumed **USD**, but the domain model carries `{ amount, currency }` so this is a data change later. | Avoid a "number means dollars" assumption leaking everywhere. |
| A10 | Enquiry form location | Its own URL (`/products/:id/enquire`) rather than a modal. | Linkable, back-button friendly, simple to test, accessible by default. |
| A11 | Authentication / accounts | None. Public catalogue. | Not in the criteria. |
| A12 | Hosting | Runs locally via Docker Compose; no deployment. | The brief asks for local run in under 10 minutes and no paid accounts. |

## Requirements dropped or simplified

- **No persistence of enquiries.** Email is the system of record for the PoC. *Risk:* if the email provider is down the enquiry is lost (the customer is told and can retry). *Next:* store the enquiry first, then send via a queue (see "next day").
- **Look and feel is deliberately plain.** The creative work is in progress; I built a neutral, accessible UI on design tokens so the brand can be applied in one file rather than polished something that will be replaced.
- **No pagination or sorting controls.** Fake Store has 20 products. The API shape (`{ products: [...] }`) leaves room to add `nextCursor` without breaking clients.
- **API types are duplicated** between `backend/src/domain/product.ts` and `frontend/src/api/types.ts` rather than shared or generated. Acceptable at this size; the obvious next step is an OpenAPI spec with generated client types.
- **Simple in-memory cache and rate limiter.** Correct for one instance. Multiple instances would need Redis (ElastiCache) or a CDN cache.
- **No end-to-end browser tests in the repo.** The frontend tests render the full app with real routing and only mock the API module; the backend tests run the real HTTP stack with only `fetch` and email faked. I did a manual browser walkthrough of every criterion (see AI_USAGE.md). Playwright E2E would be next.

## How the design supports growth beyond the PoC

- **Ports and adapters in the backend.** Services depend on three interfaces — `ProductRepository`, `MerchandisingSource`, `EnquiryNotifier` — and `container.ts` is the only file that picks implementations. Replacing Fake Store with a database is a new adapter and one line; services, routes, validation and tests don't change.
- **Our own domain model.** Fake Store's shape (`image`, `rating.rate`, numeric `id`, category as a raw string) is mapped at the boundary into our model (`imageUrl`, `rating.average`, string IDs, `{ slug, name }` categories, `{ amount, currency }` prices), and the upstream payload is validated with Zod. Upstream changes break one mapper, loudly, not the UI.
- **The browser only knows `/api`.** One module (`frontend/src/api/client.ts`) holds every URL. The client never talks to the product source — enforced by architecture, and checked in a test.
- **Design tokens.** All colours, fonts, radii and spacing are CSS variables in `theme.css`; components never hard-code them. Dark mode already works from the same tokens.
- **Email provider is configuration.** Any SMTP service (Amazon SES included) works via env vars. A non-SMTP provider or a CRM is a new `EnquiryNotifier`.
- **AWS-friendly by construction.** Stateless containers, config from env, health check endpoint, graceful SIGTERM shutdown, logs to stdout. Maps directly to ECS Fargate (or App Runner) behind an ALB, the SPA to S3 + CloudFront, email to SES, secrets to Secrets Manager / SSM.
- **Resilience.** Upstream calls have a timeout; product data is cached (TTL configurable), concurrent cache misses share one request, and a stale cache is served if a refresh fails. Upstream failures map to `502` with a safe message, distinct from our own `500`s.

## What I would do next with another day

1. **Persist enquiries + outbox.** Save to a database (Postgres / DynamoDB) before acknowledging, then deliver email from a queue (SQS) with retries. No enquiry is ever lost, and sales get a history.
2. **OpenAPI spec** for the API, generating frontend types and request validation, so the contract can't drift.
3. **Playwright E2E** test of the five criteria against `docker compose`, run in CI.
4. **Real merchandising:** an authenticated admin screen (or headless CMS) for featured products, behind the existing `MerchandisingSource`.
5. **Infrastructure as code** (AWS CDK): ECS Fargate API, S3 + CloudFront web, SES, Secrets Manager, with staging + production.
6. **Observability:** structured JSON logs (pino) with request IDs, metrics on upstream latency/errors and enquiry success rate.
7. **Data-fetching library** (TanStack Query) on the client once caching/retries across pages are needed.
