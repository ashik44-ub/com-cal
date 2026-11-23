# Commission Calculator — Next.js + MongoDB

> **v14 (2026-11-23):** the **Parts Sales Collection — This Month** card
> now shows the month's **parts-sale collection only** (e.g. ৳163,270),
> not the month's total collection — Service / TDS & VDS collections are
> never added into it (they have their own **Total TDS VDS Service
> Collection** card). The card also **updates by itself**: after a parts
> collection is added on the Bills page, the dashboard refetches when you
> come back to it, and it refetches again whenever the tab becomes
> visible — no manual Refresh or reload needed. **No commission rule
> changed.**
>
> **v13 (2026-11-23):** dashboard card labels rewritten to match the
> live dashboard exactly — **Total Earning — This Month**, **Parts Sales
> Collection — This Month** (still the month's *total* collection),
> **Parts Commission — This Month**, **Service & TDS/VDS Commission —
> This Month**, **Total Parts Sales Amount** (still the pending/remaining
> total, subtitle "N pending bills"), **Total Bills** — plus a new card
> **Total TDS VDS Service Collection** (service + TDS/VDS collected this
> month) right after the Service & TDS/VDS card. Only the labels changed;
> every value is computed exactly as before. The **Bills page has a
> search box** (customer name or invoice number, partial and
> case-insensitive) that filters the loaded bills together with the month
> filter. **No commission rule changed.**
>
> **v12 (2026-11-23):** one small UI change. The **Add New Bill form
> only creates Parts Sale bills** — the Category dropdown is gone (Service
> / TDS & VDS / Service Contract are entered from the dashboard standalone
> entries, not as bills). Existing bills of other categories still work
> and can still be edited (Edit Bill keeps their category). Also fixed
> a leftover from v11: the **Admin user table still overflowed by exactly
> the width of a classic vertical scrollbar (15px)** on desktop, so the
> page showed a horizontal scrollbar after all. The table now uses a
> fixed layout with explicit column widths (and the card clips any
> overflow), so there is no horizontal scrollbar at any width. **No
> commission rule changed.**
>
> **v11 (2026-11-23):** two small UI fixes. The **Admin user table no
> longer scrolls sideways**: compact columns fit the page at desktop
> widths, and on narrower screens each user is shown as a stacked card
> instead of a table row — no horizontal scrollbar at any width. The
> **Add Posting form on a bill card no longer has a Type dropdown** —
> bill postings are always a Collection; TDS & VDS is entered from the
> dashboard standalone card instead (bills that already have a challan
> posting keep working). Also fixed: a posting's "days since invoice"
> label now counts the days between the invoice date and the posting date
> (it wrongly counted from the posting date to today, so a posting made
> today showed "0 days since invoice"). **No commission rule changed.**
>
> **v10 (2026-11-23):** the **area moved from each bill to the account**.
> At sign-up every user picks an area — **Residential** or **Outside
> Residential** (required) — and every bill they add inherits that area
> automatically; the Area field is gone from the Add New Bill and Edit Bill
> forms (the bill card still shows the area, read-only). The **admin can
> change any user's area from the Admin page** — including the admin
> account itself, which is now listed first there — and changing it updates
> that user's existing bills too, so the dashboard recomputes under the new
> area. A user cannot change their own area. Accounts created before v10
> have no area set and their bills keep the area they were created with
> until an admin sets one. **No commission rule changed** — the gate
> (৳275,000 industrial / ৳115,000 residential), slabs, flats, the
> ৳250,000 residential cap and the target % all work exactly as before.
>
> **v8 (2026-11-23):** the dashboard now **explains a ৳0 commission**
> instead of leaving it looking like the numbers never loaded. Under each
> commission card, when its value is 0, a short reason line appears — e.g.
> "Monthly minimum not reached — collected ৳221,342 of ৳275,000 (৳53,658
> more to go)" when the month's total collection is below the area minimum,
> "Parts base ৳100,500 — first slab starts at ৳115,000" when the parts
> base is below the first slab, or "All parts postings past the 45-day
> deadline — no commission" when every parts posting is late. The same
> gate line shows under Earning. When a commission is non-zero, nothing
> extra is shown. **Loading is faster and no longer blanks the page:**
> the summary is fetched immediately in parallel with the login check
> (never from a stale cache), the server reads bills, entries and target
> in parallel, and after adding a posting or entry the old numbers stay
> visible with a small "Updating…" note instead of a full "Loading
> dashboard…" screen. A failed refresh keeps the old numbers and shows a
> banner with a Retry button; a Refresh button is next to the header. No
> commission rule changed.
>
> **v7 (2026-11-23):** standalone entries now take a **Customer Name** and
> an **Invoice Number** (shown in the entries list), bills take an optional
> **Invoice Number** (Add New Bill form, bill card next to the invoice date,
> Edit Bill), and **CSA** is a third quick-entry type on the dashboard: a
> CSA earns the contract commission (New ৳500 / Renewal ৳1,000) and counts
> in contract earned and Earning, but not in Collection totals, the gate,
> the parts-sale slab base or the target %. **Contract rates corrected:**
> New = ৳500, Renewal = ৳1,000 (swapped from the earlier reading — the
> user's correction governs, for contract bills and standalone CSA alike).
>
> **v6 (2026-11-23):** sign-up + database users with roles (admin/user),
> an Admin dashboard to manage all users (targets, roles, disable/enable,
> password reset, delete with bills reassigned to the admin), and a
> self-service Forgot password flow (reset link shown on the page — there is
> no email server; the admin reset is the secure path). A monthly **sales
> target** (default ৳550,000, admin-editable) with an achievement % on the
> dashboard (parts sale only; any positive collection shows at least 1.0%,
> above 100% shown uncapped). **Residential cap:** in a residential month
> the parts commission base is capped at ৳250,000. A new **Service &
> TDS/VDS Commission — This Month** card. **Posting types:** a posting on a
> bill is always a normal Collection; a TDS & VDS (challan) posting can no
> longer be added from the bill card — it is entered from the dashboard
> standalone card instead. Bills that already have a challan posting keep
> working: the challan counts toward the bill total and the month's total
> collection, but on the dashboard it counts as TDS & VDS (flat
> commission), not in the parts-sale slab base or the target %. Each bill
> card shows the split under the posting list ("Cash collected ৳… · TDS &
> VDS ৳…"). **Standalone collections:** a quick entry on the dashboard for
> Service / TDS & VDS collections not tied to any bill — they count in the
> dashboard totals together with bill postings. See "Users & Admin", "Sales
> target" and "Posting types" below.
>
> **v5 (2026-11-22):** commission is now calculated **per month on Collection
> — This Month** (ASE policy), not per bill. If the month's total collection
> is below the area minimum (৳275,000 industrial / ৳115,000 residential) no
> commission at all is added that month; above it, the parts-sale slab applies
> to the month's parts-sale collection — a partially-collected bill still earns
> commission. The database is **pre-configured** in `.env.local` (MongoDB
> Atlas) and there is **no local-memory fallback**: if the database cannot be
> reached the app shows an error instead of serving temporary data. See
> "Commission rules (summary)" and "MongoDB" below.
>
> **⚠️ Do NOT share this zip file with anyone.** It contains `.env.local` with
> the database password — anyone with the zip can open, change or delete the
> whole database. In Atlas, restrict Network Access to your own IP only
> (not `0.0.0.0/0`).
>
> **v4 (2026-11-22):** the dashboard now shows a "Parts Commission — This
> Month" card next to Collection — This Month, and the MongoDB banner now
> says exactly why it is not connected: a missing `MONGODB_URI` (no
> `.env.local`) versus a failed connection (the sanitised Atlas error is
> shown). See "MongoDB not connecting?" below.
>
> **v3 (2026-11-22) — login fix:** fixes the `cookies(...).get is not a function`
> error. In Next.js 15, `cookies()` returns a Promise, so the layout now
> awaits it; the API routes also await their `params` (also a Promise in
> Next 15). The code works on **both Next 14 and Next 15**. If you ended up
> with Next 15 by accident, install with `npm ci` instead of `npm install` —
> `npm ci` uses the lockfile and installs exactly Next 14.2.35.
>
> To install the pinned version: `npm ci`, then `npm run dev` (or
> `npm run build` + `npm run start`).

A standalone Commission Calculator for an Area Sales Executive (ASE) at Energypac Power Generation Ltd. (EPGL). It tracks sales bills, records collection postings against each bill, and computes commission exactly per the ASE Policy File — including service/TDS/VDS flat slabs, parts-sale percentage slabs with bonuses, area minimums, the 45-day collection deadline, and service-contract commission.

## Features

- **Users & Admin** — anyone can sign up (name, email, password, **area: Residential or Outside Residential**) and log in with email + password; the admin account (APP_USERNAME / APP_PASSWORD) keeps working. The admin dashboard (`/admin`, sidebar "Admin" link, admin only) lists every user — including the admin account itself — with this month's parts collection, achievement % and commission, and lets the admin edit the monthly target, change the role, **change the area** (which also updates that user's existing bills), disable/enable the account, reset the password (the new password is shown once), delete the user (their bills move to the admin), and view that user's bills. Regular users only ever see their own bills, dashboard, salary and charts; the admin can filter the dashboard and bills pages by user (Me / All users / one user).
- **Forgot password** — on `/forgot`, enter your email: if the account exists, a reset link is shown on the page (valid 1 hour, single use). There is no email server, so the link is displayed instead of emailed — keep it private. The admin password reset is the secure path.
- **Sales target** — each user has a monthly target (default ৳550,000, admin-editable). The dashboard shows a full-width "Sales Target — This Month" progress bar with the achievement % (parts sale only): 0 collection → 0.0%; any positive collection → at least 1.0%; above 100% shown uncapped (e.g. 110.0%).
- **Residential cap** — in a residential month (no industrial collections that month) the parts-sale commission base is capped at ৳250,000; the ৳115,000 gate is unchanged. Industrial months have no cap.
- **Posting types** — postings added to a bill are always Collection (cash). A TDS & VDS (challan) posting can no longer be added from the bill card — it is entered from the dashboard standalone card instead. Bills that already have a challan posting keep working: a TDS & VDS posting counts toward the bill total and the month's total collection / gate, but on the dashboard it counts as TDS & VDS: it earns the flat TDS/VDS commission, shows in the Service & TDS/VDS Commission card, and does NOT count in the parts-sale slab base or the sales-target %. Each bill card shows the split under the posting list ("Cash collected ৳… · TDS & VDS ৳…").
- **Standalone collections** — a quick entry on the dashboard for Service / TDS & VDS collections not tied to any bill (type, amount, date, customer name, invoice number, optional note). They count in Collection — This Month, the month's total collection for the gate, and their kind's collected, and earn the flat commission when the gate passes (no 45-day deadline — there is no invoice date). They do NOT affect the parts-sale slab base or the sales target, and they appear in the 6-month series like bill postings. Entries belong to the user who added them; the admin sees all users' entries with the same filter as bills. **CSA** is a third quick-entry type (customer name, invoice number, contract type, date, note — no amount): a CSA earns the contract commission (New ৳500 / Renewal ৳1,000) and counts in contract earned and Earning, but NOT in Collection totals, the gate, the parts-sale base or the target %.
- **Dashboard** — dark-navy sidebar, stat cards (Earning / Collection / Parts Commission / Service & TDS/VDS Commission / Pending / Total Bills), a 6-month collected-vs-earned bar chart, a collection-trend area chart, and a per-category donut.
- **Bills** — enter a sale bill once (customer, category, bill amount, invoice date, optional invoice number), then add as many collection postings as needed against that bill. Each bill card shows the invoice number next to the invoice date when set, total collected, remaining amount, collected % with a progress bar, the posting list (with delete), and the commission earned or projected.
- **Salary & Benefits** — basic salary by experience category (A ৳5,500 / B ৳4,500 / C ৳3,500), conveyance by location (inside metro ৳3,300 / outside ৳3,800), food allowance ৳1,250, mobile ceiling ৳1,000 (a ceiling, not added), festival-bonus rules, and a calculator for the monthly fixed total.
- **Commission Rules** — the full slab tables, area minimums, the 45-day deadline and disqualifier rules, and contract rates.

## Commission rules (summary)

- **Monthly basis (v5)** — commission is calculated per month from
  **Collection — This Month** (the month's total collection, all categories),
  not per bill. A partially-collected bill still earns commission.
- **Monthly gate** — if the month's total collection is below the area
  minimum, **no commission at all** is added that month (parts slab ৳0 and
  service/TDS-VDS flat ৳0). The minimum is **৳275,000** when any bill
  collected that month is industrial / outside-metro, otherwise **৳115,000**.
  Service contracts (New ৳500 / Renewal ৳1,000) are not gated.
- **Service & TDS/VDS** — flat commission per posting: > 1,000–3,000 → ৳150; > 3,000–6,000 → ৳300; > 6,000–15,000 → ৳400; > 15,000 → ৳500; 1,000 or less → ৳0. Each posting earns its own commission, but ৳0 for the whole month when the monthly gate fails.
- **Parts Sale** — percentage on the month's parts-sale collection: ≥ 115,000 → 1.75% + ৳750; ≥ 150,000 → 2% + ৳1,000; ≥ 200,000 → 2.25% + ৳1,250; ≥ 300,000 → 2.5% + ৳1,500; ≥ 400,000 → 2.75% + ৳1,750; ≥ 500,000 → 3% + ৳2,000; ≥ 700,000 → 3.25% + ৳2,500. Monthly 100% achievement adds +1.75%. The month's parts commission is shared across the bills with eligible postings that month, pro-rata by each bill's eligible postings that month.
- **Worked example** — one industrial parts bill of ৳665,000, invoice 2026-11-01, one posting of ৳500,000 on 2026-11-10: November Collection — This Month = ৳500,000 (above the ৳275,000 gate), Parts Commission — This Month = ৳17,000 (3% of ৳500,000 = ৳15,000 + ৳2,000 bonus), Earning — This Month = ৳17,000, Pending = ৳165,000, bill status partial. If the same month's total collection were ৳200,000 instead, commission would be ৳0.
- **45-day deadline** — a posting dated more than 45 days after the invoice date earns ৳0 commission, but its amount still counts in the collected totals. Postings at 31–45 days carry a "HoD approval needed" warning.
- **No commission** if payment was received partially, profit is below the SnS product-wise budget, or monthly sales/collection achievement is below 50%.
- **Service Contract (CSA/SnM/OnM)** — new contract ৳500, renewal ৳1,000. A CSA can also be added without a bill from the dashboard quick entry, at the same rates.
- No lube-oil commission feature (per policy, lube oil is ৳5/litre and is not tracked here).

## Setup

The database is already configured — `.env.local` is included in the zip
with the MongoDB connection string and the login credentials, so there is
nothing to paste. Just install and run (use `npm ci` to get exactly the
pinned Next.js 14.2.35 from the lockfile — plain `npm install` may pull a
newer Next.js):

```bash
npm ci
npm run dev
```

Then open http://localhost:3000 and log in. **Do NOT share this zip** — it
contains the database password in `.env.local`.

For a production run instead of the dev server:
```bash
npm run build
npm run start
```

## Login

Every page and every `/api/*` route is protected by a login. The login page
is at `/login` (username or email + password). Use **Log out** in the sidebar to sign out.

New users sign up at `/signup` (name, email, password — at least 6
characters) and then log in with their email and password. If you forget
your password, use `/forgot`: enter your email and a reset link is shown on
the page (valid 1 hour, single use). There is no email server, so the link
is displayed instead of emailed — keep it private. The admin can also reset
any user's password from the Admin dashboard.

Default login (used when `APP_USERNAME` / `APP_PASSWORD` are not set in
`.env.local`):

- Username: `ashikur`
- Password: `commission123`

To change it, set these two lines in `.env.local` and restart the server:

```
APP_USERNAME=ashikur
APP_PASSWORD=commission123
```

Replace the values with your own username and password. Never share
`.env.local` — it holds your database password too.

Sessions are HMAC-signed cookies (7 days). The signing secret is
`SESSION_SECRET` in `.env.local`; if it is not set, `APP_PASSWORD` is used
as the secret. If you change `APP_PASSWORD` or `SESSION_SECRET`, everyone
is logged out and must log in again.

## Sales target

Each user's monthly sales target (parts sale) defaults to ৳550,000. The
admin can change it on the Admin dashboard. The dashboard shows the
achievement %: parts-sale collection this month ÷ target × 100, with 1
decimal — 0.0% at no collection, at least 1.0% for any positive collection
(even ৳1 shows 1.0%), and above 100% shown uncapped (e.g. 110.0%). The
target base is the month's total parts-sale collection (Collection postings
only — TDS & VDS challan postings do not count toward it).

## MongoDB

The app saves every bill and posting straight to MongoDB (database
`commission-calculator`, collection `bills`) as soon as you enter it, and
entries persist across restarts. There is **no local-memory fallback**: if
`MONGODB_URI` is missing or Atlas cannot be reached, the app does not serve
temporary data — the dashboard and APIs return an error (HTTP 503) with the
reason, and the logged-in `/api/health` endpoint reports the same check as
JSON (`configured` / `connected` / `error`).

The connection is pre-configured in `.env.local`:

```
MONGODB_URI=mongodb://<username>:<password>@<shard-hosts>/?ssl=true&replicaSet=<replica-set>&authSource=admin
```

The app always uses the database `commission-calculator`, even if the
connection string has no database name after the `/`. Never share
`.env.local` — it holds your database password.

## MongoDB not connecting?

If the dashboard shows a database error:

1. `.env.local` must be in the project root — the same folder as `package.json`. It is included in the zip; check it is there after unzipping.
2. The `MONGODB_URI` line must contain your full Atlas connection string, with no spaces or quotes around it.
3. Restart the dev server after creating or editing `.env.local` (Ctrl+C, then `npm run dev` again). Next.js only reads `.env.local` when the server starts — editing the file while the server is running does nothing until you restart it.
4. In Atlas, Network Access must allow your IP — add **your own IP only** (do not use `0.0.0.0/0`, because this zip contains the database password).
5. Make sure the cluster is not paused.

How to tell which problem it is: if `MONGODB_URI` is missing or empty, the dashboard says so ("MONGODB_URI is not set"). If it is set but Atlas rejects it, the dashboard shows the connection error. The logged-in `/api/health` endpoint reports the same check as JSON (`configured` / `connected` / `error`).

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — start the production server (after `npm run build`)
- `npm run lint` — lint

## Project structure

```
app/
  page.tsx            Dashboard (stat cards, sales-target bar, charts)
  bills/page.tsx      Bills (add bill, postings, edit/delete)
  salary/page.tsx     Salary & Benefits calculator
  rules/page.tsx      Commission Rules reference
  login/page.tsx      Login page (username or email + password)
  signup/page.tsx     Sign-up page
  forgot/page.tsx     Forgot password (reset link shown on the page)
  reset/page.tsx      Reset password (single-use token link)
  admin/page.tsx      Admin dashboard (manage all users)
  admin/users/[id]/bills/page.tsx   Admin view of one user's bills
  api/
    auth/login/route.ts         Log in (sets the HMAC-signed session cookie)
    auth/logout/route.ts        Log out (clears the session cookie)
    auth/signup/route.ts        Sign up (creates a DB user)
    auth/forgot/route.ts        Request a password-reset link
    auth/reset/route.ts         Reset the password with a token
    auth/me/route.ts            The logged-in user
    admin/users/route.ts        Admin: list users with month stats
    admin/users/[id]/route.ts   Admin: edit target/role/disabled, delete user
    admin/users/[id]/reset-password/route.ts  Admin: reset a user's password
    bills/route.ts              List / create bills
    bills/[id]/route.ts         Get / update / delete a bill
    bills/[id]/postings/route.ts
    bills/[id]/postings/[postingId]/route.ts
    collections/route.ts        List / create standalone Service, TDS/VDS & CSA entries
    collections/[id]/route.ts   Delete a standalone entry
    summary/route.ts            Monthly totals, 6-month series, per-category totals
middleware.ts         Protects all pages and /api/* routes (redirects to /login, or 401 for APIs); /admin/* is admin-only
components/           Sidebar, StatCard, BillCard, StandaloneCollectionCard, formatting helpers
lib/
  types.ts            Shared types (Bill, Posting, Summary, UserPublic)
  commission.ts       The commission engine (all policy rules)
  db.ts               Data layer: Mongoose only — no local-memory fallback
  collections.ts      Standalone Service / TDS & VDS collection entries
  auth.ts             Login credentials (APP_USERNAME / APP_PASSWORD) and HMAC session cookie
  users.ts            Database users: scrypt passwords, reset tokens, session user
  scope.ts            Per-user scoping for the data APIs
models/Bill.ts        Mongoose Bill schema (bills carry a userId owner)
models/User.ts        Mongoose User schema
models/CollectionEntry.ts  Mongoose schema for standalone collections
```

## Tech

Next.js 14 (App Router, TypeScript), Tailwind CSS, Mongoose, Recharts.
#   c o m - c a l  
 