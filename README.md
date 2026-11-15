# CareMatch — JSON demo

A presentation-ready Next.js care marketplace using **bundled dummy JSON and browser local storage**. No database, Prisma, migration, backend authentication service, upload server or required secrets.

The homepage, search, professional profiles, registration, onboarding, administrator reviews, favourites, requests, notifications and dashboards work with fictional data. Sign-in and role permissions are **demo simulations, not secure authentication**. Use sample information and sample documents only.

## Run locally

Requirements: Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:3002**. No `.env` file or seed command is required.

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push the project to your Git repository and import it into Vercel.
2. Select the **Next.js** framework preset (normally detected automatically).
3. Install command: `npm ci`. Build command: `npm run build`. Leave the output directory at its framework default.
4. Deploy. No database, storage service or environment secrets are needed.
5. Optionally set `NEXT_PUBLIC_SITE_URL` to your deployed HTTPS URL and redeploy to give metadata and the sitemap the correct origin.

`vercel.json` supplies the framework/build settings. `.vercelignore` excludes local runtime files, the preserved legacy implementation, test output and `.env`. There are no filesystem writes or database connections at runtime. See [Vercel’s Next.js deployment documentation](https://vercel.com/docs/frameworks/full-stack/nextjs).

This project is prepared for deployment; it has not been published to a Vercel account by the coding agent.

## Demo accounts

All seeded accounts use the public demo password **`CareMatch-Demo-2026!`**. The login-page role buttons fill the credentials.

| Role                      | Email                 |
| ------------------------- | --------------------- |
| Administrator             | admin@carematch.demo  |
| Client                    | olivia@carematch.demo |
| Approved professional     | sarah@carematch.demo  |
| Pending professional      | maya@carematch.demo   |
| Under-review professional | isla@carematch.demo   |
| Rejected professional     | ruby@carematch.demo   |

## How the JSON demo works

- `src/data/demo.json` contains 1 admin, 8 clients, 20 professionals (10 approved, 5 pending, 2 under review, 3 rejected), sample requests, favourites, documents, reviews, notifications and audit events.
- First use reads the bundled seed. Mutations save a copy under `carematch-demo-v1` in **localStorage**.
- Reloads retain changes. Tabs in the **same browser profile and origin** share the same data and receive updates.
- Each tab keeps its own simulated role session in **sessionStorage**, so you can demonstrate admin, worker and client flows in separate tabs simultaneously.
- Different browsers, incognito contexts, devices and deployment origins have independent demos. There is no cross-device or multi-user synchronisation.
- **Settings → Reset this browser’s demo** discards local changes and restores the JSON examples. Clearing site storage does the same. Updating the JSON seed does not overwrite an existing browser’s changes; reset to load the new seed.
- Sample uploads are encoded in browser storage, up to **1 MB per file**, subject to the browser’s total storage quota. They are never uploaded to Vercel. Use small sample files; a storage-full error does not report a false success.
- The bundled `/demo/sample-evidence.pdf` is intentionally public and plainly marked as fictional. Local sample evidence is shown only in the corresponding demo screens, but all browser storage is inspectable. Do not upload real identity evidence.
- Password-reset links are displayed in the browser, not emailed. They update only that browser’s demo data.

## Presentation walkthrough

Use three tabs in the **same browser profile**, not three separate private-browser contexts.

1. Explore `/`, `/services` and `/find-care`.
2. In the worker tab, register a fictional nurse. Complete the onboarding steps, choose services, save weekly availability, add a fictional NMC number and upload sample evidence. Submit for review.
3. In the admin tab, sign in and open `/admin/verifications`. Start the review, inspect sample files, explicitly mark each required document reviewed, then approve and confirm.
4. Search for the worker’s city in the public tab. The approved, active, listed profile now appears.
5. In the client tab, register or sign in, open that profile, save it to favourites and send a care request.
6. In the worker tab, accept the request. The client sees the accepted state and a notification without changing records manually.
7. Demonstrate rejection/resubmission, suspension, cancellation or a labelled demo completion. Sensitive profile changes require re-review. Reset the demo before the next presentation if desired.

## Validation

```bash
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e   # keep npm run dev running in another terminal
npm run build
```

Tests cover state transitions, input validation, JSON seed integrity, draft preservation, review and care-request workflows, browser persistence, cross-tab updates, independent browser copies, reset, public navigation and responsive layouts. No database is required for any test. `PLAYWRIGHT_BASE_URL` can point browser tests at another running deployment.

## Source structure

- `src/data/demo.json`: editable fictional seed data.
- `src/lib/demo/types.ts`: domain record types.
- `src/lib/demo/store.ts`: JSON loading, browser persistence, subscriptions and reset.
- `src/lib/demo/repository.ts`: read-only query helpers and related-record views.
- `src/lib/demo/actions.ts`, `uploads.ts`: browser action dispatch and sample-file handling.
- `src/lib/auth.ts`: per-tab simulated sign-in.
- `src/modules/domain.ts`, `validation.ts`, `services.ts`: business rules, Zod schemas and demo mutations.
- `src/modules/queries.ts`: filtered, sorted and paginated JSON marketplace queries.
- `src/modules/dashboard.tsx`: role dashboard composition.
- `src/components/`: accessible forms, responsive navigation, shadcn-style Radix primitives, charts and presentation components.
- `src/app/`: App Router pages, metadata, sitemap and robots configuration.

The interface uses TypeScript, Tailwind, React Hook Form, Zod, Lucide, TanStack Table, Recharts, Sonner and Motion. Fonts and visual assets are hosted with the app; attribution is included under `public/`.

The old database-specific source was preserved in the ignored `.legacy-database-backup/` directory rather than permanently destroyed. It is excluded from TypeScript, Git and Vercel deployment, and none of its dependencies are used by this app. The local PostgreSQL process has been stopped.

## Demo boundaries

All data is fictional and inspectable. Client-side role checks demonstrate the journey; they are not a security boundary. No real care is arranged, no payments or email are sent, and no authoritative identity, DBS, GMC, NMC or right-to-work verification occurs. Privacy and Terms pages are labelled demo drafts.
