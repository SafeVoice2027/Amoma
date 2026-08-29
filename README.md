# Amoma

A low-friction, confidential way for students to report bullying and conflict, with AI-assisted
severity triage and role-based dashboards for Student, Staff, and Admin.

Built with Next.js (App Router, TypeScript), Tailwind CSS, and Supabase (Postgres + Auth + Storage).

## Setup

1. **Create a Supabase project**, then run the migration:

   ```bash
   supabase migration up
   ```

   or paste `supabase/migrations/0001_init_schema.sql` into the Supabase SQL editor. It creates the
   schema, enums, RLS policies, and a private `report_evidence` storage bucket.

2. **Copy environment variables**:

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's API settings. `ANTHROPIC_API_KEY` is
   optional — without it, AI severity classification and unresolved-case summaries fall back to a
   deterministic heuristic so the whole flow still works in local dev.

3. **Install dependencies and run**:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Account provisioning

Students, Staff, and Admin can all request an account from `/signup`, but signing up never grants
access by itself — every new profile is created with `status = 'pending'`, and both
`proxy.ts` (middleware) and the RLS policies refuse to let a pending account into `/student`,
`/staff`, or `/admin` until an existing Admin approves it from the Admin dashboard.

That means the **very first** Admin still has to be seeded directly in Supabase, since there's no
one to approve them otherwise: create an `auth.users` row via the dashboard (or let them sign up
through `/signup` first), then set that row's matching `profiles` row to `status = 'approved'` via
the SQL editor. From there, that Admin can approve everyone else — Staff, Student, and any
additional Admins — through the dashboard.

`/signup`'s server action (`app/(auth)/signup/actions.ts`) uses the service-role client to create
the `auth.users` row directly via `auth.admin.createUser({ email_confirm: true })` rather than the
regular client-side `signUp()` call — this sidesteps Supabase's email-confirmation flow entirely,
which matters because student accounts don't have a real inbox to confirm (see below).

Students log in with an **LRN**, not an email. Supabase Auth is email-based, so student accounts
are provisioned with a synthetic auth email of the form `{lrn}@lrn.safevoice.internal`
(see `app/(auth)/login/actions.ts` and `app/(auth)/signup/actions.ts`) — the LRN itself is never
treated as a public identifier.

## Project structure

- `app/student`, `app/staff`, `app/admin` — role-specific routes, each gated by `proxy.ts`
  (role + approval check) and `lib/auth.ts` (`requireProfile`) at the data layer.
- `app/student/report/{bully,conflict}` — the two report wizards (Section 7 of the spec).
- `lib/ai/severity.ts` — DepEd-aligned severity classification (minor/less_serious/serious/critical),
  called on Bully report submission. Conflict reports aren't severity-scored.
- `lib/ai/summary.ts` — the "why cases are stuck" summary on the Staff dashboard. Only sends report
  metadata (status/severity/age/follow-up count) to the model, never the free-text description.
- `lib/supabase/{client,server,service,middleware}.ts` — browser client, server (RLS-scoped)
  client, service-role client (privileged, server-only), and the session-refresh/RBAC middleware
  helper.
- `staff_reports_view` (defined in the migration) — the view Staff/Admin dashboards query instead of
  the raw `reports` table; it nulls out `reporter_id` for Staff when a report is anonymous. Admin
  still sees the real `reporter_id` through the view — the actual gate for Admin is that revealing
  an anonymous reporter's name in the UI (`app/admin/actions.ts:revealIdentity`) always writes to
  `identity_disclosure_log` first, via the service-role client (there's no RLS insert policy for
  authenticated users on that table by design).
- `supabase/migrations/0001_init_schema.sql` — schema + RLS policies + storage bucket. This is the
  actual migration the live Supabase project for this app was provisioned from, recovered from a
  stray `Migration.db` file found at the project root partway through development (its origin is
  unconfirmed — it may be worth asking whoever set up the Supabase project about it).

## RLS behavior worth knowing before extending this

- **Staff/Admin report visibility isn't scoped by school.** The `reports` and `profiles` SELECT
  policies for staff/admin check role only, not `school_id`. In a real multi-school deployment,
  add that filtering explicitly in your queries (the tables have `school_id` columns already) —
  don't assume RLS is doing it for you.
- **A staff member can only UPDATE a report already assigned to them** (`assigned_staff_id =
  auth.uid()`). There's no self-assign policy, so `app/staff/actions.ts:updateReportStatus` uses
  the service-role client and sets `assigned_staff_id` to the acting staff member on every status
  change — whoever last touched a report owns it. There's no "reassign" or "unclaim" UI yet.
- **`ai_assessments` and `notifications` inserts must go through the service-role client** — there's
  no authenticated-role insert policy on either table by design.

## A known Next.js dev-mode quirk

In `next dev`, Server Components can be invoked more than once per request as part of React's
built-in dev-mode correctness checking. Each invocation of `requireProfile()`/`getCurrentProfile()`
(in `lib/auth.ts`) used to independently call `auth.getUser()`, and since Supabase refresh tokens
are single-use, two near-simultaneous calls could both try to refresh with the same token — one
would win, the other would fail with `Invalid Refresh Token: Already Used` and could corrupt the
session for a moment. This is memoized away with React's `cache()` now, and `proxy.ts` also skips
its own refresh for Server Action requests and Next.js's background `<Link>` prefetches, which were
the two other sources of the same race. If you ever see that error again in dev, it's very likely
this same category of issue — it did **not** reproduce in a production build (`npm run build && npm
run start`) during testing, so treat a recurrence as a dev-only annoyance, not a sign the deployed
app is broken, but it's worth checking either way.

## Before handling real student data

This is a starting structure, not a finished compliance or security review:

- Have your school's legal counsel or DepEd liaison review the anti-bullying severity bands
  (`lib/ai/severity.ts`) and the anonymity/disclosure decision tree
  (`app/admin/actions.ts:revealIdentity`) against RA 10627, RA 10173, and RA 7610.
- Have the RLS policies in the migration reviewed against your exact anonymity rules — they're a
  reasonable starting point, not an audit. See "RLS behavior worth knowing" above in particular.
- Wire up real SMS/push delivery for the "critical" severity alert (`alertOnCritical` in
  `app/student/report/actions.ts` currently only writes a `notifications` row with no delivery).
- Implement data retention/deletion policies for the Data Privacy Act (RA 10173).
