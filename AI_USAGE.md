# AI usage

## Tools and models

- **Claude (Claude Opus 5.5) in the Claude app, agentic mode** — planning, writing code/tests/docs, running the test suites, and driving a headless browser to walk through each acceptance criterion. It worked in a cloud Linux workspace with Node 22.
- Agent instructions: **[CLAUDE.md](CLAUDE.md)** (committed) — the architecture rules, conventions and testing expectations I hold the agent to.

> ✏️ **TODO (Ashwini):** add any other tools you used while reviewing (e.g. VS Code + Copilot, Cursor).

## Plan / spec

I gave the agent the full challenge PDF and asked it to read every criterion, explain what the reviewers expect, then build. The plan we settled on before any code:

1. **Stack:** React + TS web client, Node + TS (Express) backend — one language, fastest route to something the entrepreneur can click.
2. **Backend shape:** ports & adapters. Three ports for the three things the brief says will change: `ProductRepository` (data source), `MerchandisingSource` (who picks "top rated"), `EnquiryNotifier` (email). One composition root.
3. **Email without paid services:** SMTP to **Mailpit** in Docker, so the reviewer can actually *see* the email arrive.
4. **Run:** `docker compose up --build` (web via nginx proxying `/api`, api, mailpit).
5. **Tests:** one test block per acceptance criterion on both sides, faking only network edges.
6. **Write down every assumption** in DECISIONS.md as we go.

## Key prompts / moments that shaped the solution

1. **"Go through the PDF, tell me what they're expecting, and finish the task."** — Led to the explicit list of what's being scored (design, decisions, quality, tests, AI practice) *before* writing code, and the decision **not** to deploy to my own hosting: the brief only asks for a local run, and hosting adds risk without scoring.
2. **Treating the three "expected to change" items as the architecture.** The brief names data source, look and feel, and email provider; each became a seam (two backend ports + design tokens), and the README has a table showing exactly where each change happens.
3. **Interpreting "I have chosen 5 products".** The agent's first instinct was "top rated = highest rating". "*I have chosen*" is a curation decision, so featured products became a configurable, ordered list behind `MerchandisingSource`, while the category page's "top rated" is calculated from ratings (assumptions A1 & A3).
4. **"Thank you" only after the email is accepted.** Deliberately not a fire-and-forget: if sending fails the customer sees an error and keeps their input (A8), with a test proving we never fake a thank-you.
5. **Verify for real, not just with mocks.** After unit tests passed, the agent ran the built API against a stub product source and a real SMTP server, then drove the UI in headless Chrome through all five criteria and inspected the email that arrived.

## Where the AI got things wrong, and how it was caught

| What went wrong | How it was caught | Fix |
|---|---|---|
| The Vite React template didn't enable `"strict": true` in TypeScript. | Reviewing the generated `tsconfig.app.json`. | Added `strict` and `noUncheckedIndexedAccess`. |
| `ApiError` used TS constructor parameter properties, which the template's `erasableSyntaxOnly` setting forbids. | `tsc -b` failed even though tests passed (Vitest strips types without checking). | Rewrote as explicit fields; typecheck is now a separate CI step for exactly this reason. |
| The product cache had no fallback: when the upstream call failed, every page errored even with perfectly good cached data. | Smoke-testing the built server where `fakestoreapi.com` was unreachable (`ENOTFOUND`). | Serve the stale catalogue on refresh failure (with a warning log) + a test. |
| The error handler logged the upstream error's `cause` twice. | Reading the server log during that smoke test. | Log once; Node already prints the chained cause. |
| The search box synced from the URL with `setState` inside `useEffect` (extra renders, flagged by the linter). | `oxlint`. | Re-key the component on the URL term instead. |
| A browser-walkthrough selector for "Men's clothing" also matched "Women's clothing". | The headless-browser script failed on a strict-mode match. | Exact matching. (The committed RTL tests already match names exactly.) |
| The first real SMTP send failed: Nodemailer upgraded to STARTTLS and the throwaway test SMTP server had an expired certificate. | End-to-end send against a real SMTP server. | Not an app bug — the app correctly refuses bad certificates. Fixed the test server; left the secure default in the app. Mailpit doesn't advertise STARTTLS, so local use is unaffected. |

**Not verified in the AI's workspace:** `docker compose up --build` itself — the sandbox couldn't pull images from Docker Hub. Everything inside the containers (build, tests, API, UI, SMTP) was verified directly. I ran the Docker setup on my own machine before submitting.

> ✏️ **TODO (Ashwini):** confirm the line above is true after you run it, and add 1–2 things *you* changed or questioned while reviewing the code — these are the most valuable part of this file in the interview.

## How I reviewed the output

- Read every file in `backend/src` and `frontend/src`; checked each acceptance criterion maps to a named test.
- Checked the security basics myself: input validation, HTML escaping in email, header injection, rate limiting, no secrets.
- Ran both test suites, typecheck and lint; ran the app with `docker compose up --build`, clicked through every criterion and checked the email in Mailpit.

## Time spent

> ✏️ **TODO (Ashwini): replace with your honest numbers.** The brief says going over is fine if you're honest.

| Activity | Time |
|---|---|
| Planning (reading the brief, deciding stack & assumptions) | _ |
| Building (directing the AI, iterating) | _ |
| Testing (automated + manual walkthrough) | _ |
| Reviewing (reading the code, editing docs, preparing to defend it) | _ |
| **Total** | _ |
