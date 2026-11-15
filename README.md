# CareMatch

A persistent, full-stack UK care marketplace demonstration built with Next.js App Router, TypeScript, PostgreSQL, Prisma and Auth.js. It includes a public website, client and professional dashboards, private document uploads, manual administrator review, favourites, notifications, care requests and audit history.

**Demonstration only.** Every seeded identity and qualification is fictional. Approval means internal demo review, not a real identity, DBS, GMC, NMC or right-to-work check. No payments, medical consultations, external verification, email delivery or real care arrangements take place. Upload sample evidence only.

## Run locally

Requirements: Node.js 22.12+ (tested with 24), npm, PostgreSQL 16+ or Docker.

```bash
npm install
cp .env.example .env
# Replace NEXTAUTH_SECRET with output from:
openssl rand -base64 32
# Start PostgreSQL (or use your own server):
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3002**. The fixed development port avoids other applications in this workspace. Set `NEXTAUTH_URL` to the exact origin used in your browser. If changing the port, change the dev/start scripts too. The example database URL matches the Docker service. Never reuse example credentials or the development secret in a deployed environment.

Without Docker on Linux, the included helper can start an isolated PostgreSQL 16 cluster:

```bash
bash scripts/local-postgres.sh
# Set DATABASE_URL in .env to:
# postgresql://YOUR_OS_USERNAME@127.0.0.1:54329/carematch?schema=public
npm run db:migrate
npm run db:seed
npm run dev
```

The helper uses local trust authentication, binds only to loopback and is for a single-user development machine. The current workspace has this local cluster in `.local/postgres` on port 54329. To stop it: `/usr/lib/postgresql/16/bin/pg_ctl -D .local/postgres stop`.

## Demo accounts

The seed reads `DEMO_PASSWORD` and `ADMIN_EMAIL` from the environment. With `.env.example` values:

| Role                      | Email                 | Password             |
| ------------------------- | --------------------- | -------------------- |
| Administrator             | admin@carematch.demo  | CareMatch-Demo-2026! |
| Client                    | olivia@carematch.demo | CareMatch-Demo-2026! |
| Approved professional     | sarah@carematch.demo  | CareMatch-Demo-2026! |
| Pending professional      | maya@carematch.demo   | CareMatch-Demo-2026! |
| Under-review professional | isla@carematch.demo   | CareMatch-Demo-2026! |
| Rejected professional     | ruby@carematch.demo   | CareMatch-Demo-2026! |

There is no public administrator registration. The seed creates 1 administrator, 8 clients and 20 professionals (10 approved, 5 pending, 2 under review, 3 rejected), alongside requests, favourites, notifications, audit events and clearly watermarked sample PDFs. Rerunning the seed preserves existing records and passwords without duplication. To change an existing password, use the reset flow; changing the seed environment alone does not overwrite it.

## Presentation walkthrough

Use separate browser profiles or private windows for the three roles.

1. **Public website:** visit `/`, explore `/services`, and search `/find-care`. Try London, hourly care or a maximum hourly rate. Open Sarah Mitchell’s profile.
2. **Worker registration:** visit `/register/worker`, register a fictional nurse, and follow all five onboarding steps. Save each step. Select services, set an indicative rate, and use **Save availability** to persist weekly times. Upload sample PDF/PNG/JPEG evidence for identity, right to work, criminal-record check and qualification. Add a fictional NMC identifier. Submit for verification.
3. **Administrator review:** sign in as admin and open `/admin/verifications`. Find the new application, select **Start review**, download each private sample document, then explicitly **Mark reviewed**. Select **Approve application** and confirm. Required evidence must be reviewed before approval is allowed.
4. **Live search:** return to the public website and search the worker’s city. Their active, listed, approved profile appears immediately. Private address, date of birth, registration identifier and document storage keys never appear publicly.
5. **Client request:** sign in as Olivia or register a new client. Open the nurse’s profile, save it to favourites, fill the request form and select **Request care**. The saved request starts as pending.
6. **Worker response:** open the nurse’s Care Requests, accept the request and confirm. The client sees the accepted status and an in-app notification.
7. **Optional governance:** demonstrate rejection with a reason, worker resubmission, account suspension, or approved credential changes. Rejected/suspended/unlisted/inactive workers disappear from public search. Changing approved credentials returns the profile to draft for re-review.

Clients may cancel pending or accepted requests. Either request participant may record an accepted request as completed using the explicitly labelled demo action. Terminal statuses cannot be changed.

## Checks

```bash
npm run typecheck
npm test                         # unit tests; DB integration skipped by default
RUN_DB_TESTS=true npm test        # unit + database integration tests (bash)
npx playwright install chromium
npm run test:e2e                  # start npm run dev in another terminal first
npm run build
npm start                        # production mode on port 3002; stop dev first
```

Playwright covers all seven specified journeys, private document access, role/ownership checks, CSRF rejection, public pages and mobile overflow. It creates uniquely named test users and removes their records and uploads afterwards. Use a dedicated demo database. Integration tests also clean up their own records. Screenshots and failure traces are placed in `test-results/`; the HTML report is in `playwright-report/`.

## Architecture

- `src/app/`: App Router pages, protected role layouts, metadata and route handlers.
- `src/components/`: presentation, forms, navigation, charts and shadcn-style Radix UI primitives.
- `src/modules/domain.ts`: verification/request state machines, visibility and category-specific evidence rules.
- `src/modules/validation.ts`: shared Zod input schemas.
- `src/modules/services.ts`: application mutations, transactions, notifications and audit events.
- `src/modules/queries.ts`: database queries, public-field allowlist, filtering, sorting and pagination.
- `src/modules/dashboard.tsx`: server-rendered role dashboard composition and read models.
- `src/lib/`: Prisma singleton, Auth.js credentials sessions, server authorisation, rate limiting and origin checks.
- `prisma/`: PostgreSQL schema, committed SQL migration and repeatable demo seed.
- `tests/`: state/validation tests, persistent integration test and Playwright workflows.

The interface uses Tailwind CSS 4, semantic design tokens, Lucide, React Hook Form + Zod, TanStack Table, Recharts, Sonner, Motion and Radix-based shadcn primitives. Fonts and illustrative assets are served locally. Asset attribution is in `public/images/ATTRIBUTION.md`.

Prisma 6 is used with its stable query engine and PostgreSQL connector. The `deepmerge-ts` override pins the patched dependency used by Prisma’s configuration package; generation, migrations and builds are validated with it. Auth.js uses the stable `next-auth` v4 credentials implementation and JWT sessions.

## Security and privacy behaviour

- bcrypt password hashes; HTTP-only Auth.js cookies and its sign-in CSRF protection. HTTPS deployments use secure cookies.
- Every mutation requires a valid same-origin request; protected mutations re-read the active account and check its role and ownership on the server.
- Account suspension/password reset increments a session version, invalidating existing sessions.
- Database-backed rate limits protect login, registration, reset and authenticated mutations.
- Zod validates input; monetary values use PostgreSQL Decimal, never float arithmetic for price calculations.
- Verification decisions and request changes use transactions, explicit transitions and concurrency guards. Decisions record reviewer, time, reason, audit event and notification.
- Uploads accept PDF/PNG/JPEG signatures and matching MIME types, up to 5 MB. Files are saved outside `public/`, with opaque keys and restrictive permissions. Evidence downloads require the owner or an active admin and disable caching; files are sent as attachments.
- Required document categories depend on profession. A document’s upload state is distinct from its internal review state. No authoritative verification state is invented.
- Public queries use an explicit safe-field allowlist. Private dashboards are marked noindex and excluded from robots/sitemap.
- Onboarding drafts persist in PostgreSQL. Availability is saved independently. Credentials edited after approval require re-review.
- No third-party tracking, payment collection, live register lookup or email provider is configured.

### Password resets

`/forgot-password` creates a random 256-bit, hashed, single-use token with a 30-minute expiry. The link is returned **only when both `NODE_ENV=development` and `DEMO_MODE=true`**. Production mode does not send email or display the link. A production rollout would require a verified email provider and delivery flow. Token redemption invalidates existing sessions and other reset tokens.

### Storage and deployment boundaries

`UPLOAD_DIR` defaults to `.local/uploads`. Both PostgreSQL and this directory must be persistent and backed up together. Runtime files are deliberately excluded from build tracing. This app targets a Node.js server with local persistent storage; it is not packaged for static hosting or ephemeral serverless upload storage. Production would need private object storage, scanning/document sanitisation, operational monitoring, data retention controls, managed secrets and an independently reviewed care/compliance process.

The draft Privacy and Terms pages are labelled demonstrations, not legal advice. Sample contact details do not receive messages. Public hourly rates are indicative only. Seeded historical experience and documents are explicitly fictional.
