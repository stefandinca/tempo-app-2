# Superadmin Console — Phase 0 + 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only platform-operator console at `superadmin.tempoapp.ro/platform` that lists every clinic, shows one clinic's detail, and finally surfaces the bug reports, sales leads, Mira spend and health that the platform already collects but cannot display.

**Architecture:** A path segment in the existing Next app (`src/app/platform/`), served by the same deployment as every clinic. The browser there is bound to the `(default)` control-plane database and cannot read a clinic database at all, so every cross-clinic read goes through `/api/platform/*` routes using the Admin SDK, each gated on **two** independent server-side checks: the caller is a Superadmin in `(default)`, and the request arrived on the platform host.

**Tech Stack:** Next.js 14 App Router, Firebase Admin SDK (`firebase-admin` 12.x), React 18, Tailwind, `react-i18next`, plain-node assertion scripts for tests (this repo has no jest — see `scripts/test-tenant.mjs`).

**Spec:** `docs/superpowers/specs/2026-08-20-superadmin-console-design.md`

## Global Constraints

- **Never hardcode user-facing strings.** Use `t('key', { defaultValue: 'English text' })` so the console works before translations land; Task 10 adds the `en.json` / `ro.json` entries. (`CLAUDE.md`, non-negotiable.)
- **All Firebase client code lives in `"use client"` components.** No server-side Firebase outside `/api/*`.
- **A caller's role comes from a verified ID token, never from the request body.** (`src/lib/serverAuth.ts`.)
- **The target clinic is named in the URL path, never inferred from the Host.** The host identifies the operator; the path identifies the subject.
- **Timestamps are two-shaped.** Every timestamp read goes through `toDateOrNull` / `toISO` / `toMillis` in `src/lib/timestamps.ts`. Never call `.toDate()` directly.
- **Prefer `onSnapshot` for clinic-local data**; the platform routes are one-shot `fetch` because they cross databases and cannot use listeners.
- **Commit format:** `<type>(<scope>): <description>` plus the trailer
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Verify at 375px, in dark mode, and in Romanian.** Touch targets ≥44×44.
- **Phase 1 writes nothing to a clinic.** Every route in this plan is `GET`, except the bug-report status `PATCH` in Task 7. Licence and evaluation writes are Phase 2/3.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `scripts/revoke-control-plane-staff.mjs` | Phase 0. Removes stale staff from `(default)`; backs up first |
| `src/lib/platform/gate.ts` | `requireSuperadmin` — the two-check server gate; `clinicDatabaseId` label validation |
| `src/lib/platform/types.ts` | `ClinicSummary`, `ClinicDetail`, `BugReport`, `Lead`, `ClinicSpend`, `ClinicHealth` — shared by routes and pages |
| `src/lib/platform/clientApi.ts` | Browser fetch helpers that attach the ID token |
| `src/app/api/platform/clinics/route.ts` | GET the registry plus per-clinic counts |
| `src/app/api/platform/clinics/[id]/route.ts` | GET one clinic's detail |
| `src/app/api/platform/bug-reports/route.ts` | GET the inbox; PATCH one report's status |
| `src/app/api/platform/leads/route.ts` | GET `potential_clients` |
| `src/app/api/platform/ai-usage/route.ts` | GET per-clinic Mira spend |
| `src/app/api/platform/health/route.ts` | GET per-clinic reachability |
| `src/app/platform/layout.tsx` | Host + role gate, console shell |
| `src/app/platform/page.tsx` | Clinics list |
| `src/app/platform/clinics/[id]/page.tsx` | Clinic detail |
| `src/app/platform/bug-reports/page.tsx` | Bug report inbox |
| `src/app/platform/leads/page.tsx` | Leads |
| `src/app/platform/ai-usage/page.tsx` | Spend roll-up |
| `src/app/platform/health/page.tsx` | Health roll-up |
| `src/components/platform/PlatformNav.tsx` | Console navigation |
| `src/components/platform/DataTable.tsx` | One generic table; every list screen uses it |
| `scripts/test-platform.mjs` | Gate and route assertions against a running base URL |

**Modified:**

| Path | Change |
|---|---|
| `src/lib/tenant.ts` | Add `superadmin` to `RESERVED` |
| `scripts/test-tenant.mjs` | Assert the new reserved label |
| `package.json` | `test:platform` script |
| `src/lib/i18n/locales/en.json`, `ro.json` | Console strings |
| `documentation/Tempo technical documentation.md` | New §29 |
| `docs/cutover-runbook.md` | Record what Phase 0 actually removed |

---

## Task 1: Reserve the `superadmin` label

`superadmin.tempoapp.ro` currently resolves to `clinic-superadmin` — a database that does not exist — so the console would render an empty app with no error. This is a change to a security boundary, so it gets an assertion beside the other hostile-hostname cases.

**Files:**
- Modify: `src/lib/tenant.ts:18`
- Test: `scripts/test-tenant.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `resolveDatabaseId("superadmin.tempoapp.ro") === "(default)"`, and `tenantIdFromHostname("superadmin.tempoapp.ro") === ""`. Every later task depends on this — the gate's host check is `tenantIdFromRequest(req) === ""`.

- [ ] **Step 1: Write the failing assertions**

In `scripts/test-tenant.mjs`, add to `DATABASE_CASES` (after the `aicaa` line):

```js
  ["superadmin.tempoapp.ro", DEFAULT_DATABASE_ID],   // the console, not a clinic
```

Add to `LABEL_CASES` (after the `aicaa` line):

```js
  ["superadmin.tempoapp.ro", ""],
```

Add to `BUCKET_CASES` (after the `aicaa` line):

```js
  ["superadmin.tempoapp.ro", PLATFORM_BUCKET],
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:tenant`
Expected: FAIL — three assertions, reporting `clinic-superadmin` where `(default)` was expected.

- [ ] **Step 3: Reserve the label**

In `src/lib/tenant.ts`, change the `RESERVED` set:

```ts
/** Hosts that are the platform itself rather than a clinic. */
const RESERVED = new Set(["", "www", "admin", "app", "api", "localhost", "superadmin"]);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:tenant`
Expected: PASS — 52 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant.ts scripts/test-tenant.mjs
git commit -m "$(cat <<'EOF'
fix(tenancy): superadmin is the platform, not a clinic

superadmin.tempoapp.ro resolved to clinic-superadmin — a database that does
not exist — so the host would have rendered an empty app with no error rather
than the console. Reserved alongside www, admin, app and api, and asserted
beside the other hostile hostnames, because this is the function that decides
which clinic's records a session can reach.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The platform gate

Two independent server-side checks. Neither alone is enough: host-only would let any clinic's domain reach these routes, and role-only would let a stolen session on a clinic domain reach them.

**Files:**
- Create: `src/lib/platform/gate.ts`
- Test: `scripts/test-platform.mjs` (created here, extended by later tasks)
- Modify: `package.json`

**Interfaces:**
- Consumes: `requireStaffRole` from `src/lib/serverAuth.ts`; `tenantIdFromRequest` from `src/lib/tenant.ts`.
- Produces:
  - `clinicDatabaseId(label: string): string | null` — `"aicaa"` → `"clinic-aicaa"`, anything invalid → `null`.
  - `requireSuperadmin(req: NextRequest): Promise<PlatformAuthResult>` where
    `PlatformAuthResult = { ok: true; caller: { uid: string; role: string; name: string } } | { ok: false; status: number; error: string }`.
  - `platformError(result)` → `NextResponse` for the failure case.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-platform.mjs`:

```js
#!/usr/bin/env node
/**
 * Assertions for the platform console.
 *
 *   node scripts/test-platform.mjs                       # pure functions only
 *   node scripts/test-platform.mjs --base=https://superadmin.tempoapp.ro
 *
 * The label check is the one that matters most: an unvalidated label reaching
 * adminDb() is how a typo becomes a read of the wrong clinic's database.
 */
import { clinicDatabaseId } from "../src/lib/platform/gate.ts";

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
const failures = [];

function check(what, actual, expected) {
  if (actual === expected) {
    passed += 1;
    console.log(`  ${C.green("✓")} ${what.padEnd(52)} ${C.dim(`-> ${actual}`)}`);
  } else {
    failures.push(`${what}: expected ${expected}, got ${actual}`);
    console.log(`  ${C.red("✗")} ${what.padEnd(52)} expected ${expected}, got ${actual}`);
  }
}

console.log(`\n${C.bold("clinic label -> database id")}\n`);

check("a real clinic", clinicDatabaseId("aicaa"), "clinic-aicaa");
check("hyphens are allowed inside", clinicDatabaseId("live-better-life"), "clinic-live-better-life");
check("upper case is refused", clinicDatabaseId("Aicaa"), null);
check("a leading hyphen is refused", clinicDatabaseId("-aicaa"), null);
check("a trailing hyphen is refused", clinicDatabaseId("aicaa-"), null);
check("one character is refused", clinicDatabaseId("a"), null);
check("empty is refused", clinicDatabaseId(""), null);
check("a path traversal is refused", clinicDatabaseId("../default"), null);
check("a slash is refused", clinicDatabaseId("aicaa/x"), null);
check("the control plane cannot be named", clinicDatabaseId("(default)"), null);
check("an already-prefixed id is refused", clinicDatabaseId("clinic-aicaa"), "clinic-clinic-aicaa");

console.log("");
if (failures.length) {
  console.log(`${C.red(`✗ ${failures.length} failed`)}, ${passed} passed\n`);
  failures.forEach((f) => console.log(`  ${C.red("-")} ${f}`));
  process.exit(1);
}
console.log(`${C.green(`✓ ${passed} assertions passed`)}\n`);
```

Note the last case: `clinic-aicaa` in produces `clinic-clinic-aicaa` out. That is correct and deliberate — the function prefixes, it does not sanitise — and asserting it stops someone later "helpfully" making it idempotent, which would let a caller name any database directly.

- [ ] **Step 2: Run to verify it fails**

```bash
node --experimental-strip-types --no-warnings scripts/test-platform.mjs
```

Expected: FAIL — `Cannot find module '../src/lib/platform/gate.ts'`.

- [ ] **Step 3: Write the gate**

Create `src/lib/platform/gate.ts`:

```ts
/**
 * The gate for every /api/platform/* route.
 *
 * These routes read and write EVERY clinic with the Admin SDK, which bypasses
 * Firestore rules entirely. The gate is therefore the only thing standing
 * between a request and all four clinics' records, and it checks two
 * independent things:
 *
 *   who    a verified ID token whose team_members doc in the CONTROL PLANE
 *          carries role Superadmin
 *   where  the request arrived on the platform host
 *
 * Neither alone is enough. Host-only would let any clinic's domain reach these
 * routes. Role-only would work, but the host check means a session stolen on a
 * clinic domain cannot be replayed against the platform.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireStaffRole } from "@/lib/serverAuth";
import { tenantIdFromRequest } from "@/lib/tenant";

export interface PlatformCaller {
  uid: string;
  role: string;
  name: string;
}

export type PlatformAuthResult =
  | { ok: true; caller: PlatformCaller }
  | { ok: false; status: number; error: string };

/**
 * `"aicaa"` -> `"clinic-aicaa"`. Anything that is not a well-formed clinic
 * label -> `null`.
 *
 * The same pattern `src/lib/tenant.ts` applies to hostnames. This exists
 * because the clinic arrives as a URL path segment: an unvalidated label
 * reaching `adminDb()` is how a typo, or a caller, reads the wrong database.
 *
 * It PREFIXES rather than sanitises — `clinic-aicaa` in gives
 * `clinic-clinic-aicaa` out, which resolves to nothing. Do not make it
 * idempotent: that would let a caller name `(default)`, or any other database,
 * directly.
 */
export function clinicDatabaseId(label: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(label)) return null;
  return `clinic-${label}`;
}

/** True when this request arrived on the platform host rather than a clinic's. */
export function isPlatformHost(req: NextRequest): boolean {
  return tenantIdFromRequest(req) === "";
}

export async function requireSuperadmin(req: NextRequest): Promise<PlatformAuthResult> {
  // Cheapest check first, and it needs no I/O.
  if (!isPlatformHost(req)) {
    return { ok: false, status: 404, error: "not_found" };
  }
  // Undefined database => the control plane, which is where platform staff live.
  const staff = await requireStaffRole(req, ["superadmin"], undefined);
  if (!staff.ok) return staff;
  if (staff.caller.role !== "superadmin") {
    return { ok: false, status: 403, error: "not_superadmin" };
  }
  return { ok: true, caller: staff.caller };
}

/** The NextResponse for a failed gate. */
export function platformError(result: { status: number; error: string }): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
```

Two details worth keeping. The host check returns **404, not 403** — on a clinic's domain these routes should not appear to exist. And `requireStaffRole` lets a Superadmin through any `allowedRoles` list, so the explicit `role !== "superadmin"` re-check is what actually restricts this to Superadmins rather than all staff.

- [ ] **Step 4: Run to verify it passes**

```bash
node --experimental-strip-types --no-warnings scripts/test-platform.mjs
```

Expected: PASS — 11 assertions.

- [ ] **Step 5: Add the npm script**

In `package.json` `scripts`, after `"test:parent-link"`:

```json
    "test:platform": "node --experimental-strip-types --no-warnings scripts/test-platform.mjs"
```

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/platform/gate.ts scripts/test-platform.mjs package.json
git commit -m "$(cat <<'EOF'
feat(platform): the gate for cross-clinic routes

Platform routes read every clinic with the Admin SDK, which bypasses Firestore
rules, so this gate is the only thing between a request and all four clinics'
records. It checks two independent things: a verified Superadmin in the control
plane, and arrival on the platform host. A clinic domain gets 404 rather than
403 — these routes should not appear to exist there.

clinicDatabaseId prefixes rather than sanitises, so an already-prefixed label
resolves to nothing. Asserted, because making it idempotent would let a caller
name any database directly.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Shared types

Both routes and pages need these shapes, and defining them once stops the route and the page drifting apart.

**Files:**
- Create: `src/lib/platform/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the interfaces below, imported by every later task.

- [ ] **Step 1: Write the types**

Create `src/lib/platform/types.ts`:

```ts
/** Shapes shared by the /api/platform routes and the console pages. */

/** One row of the clinics list. */
export interface ClinicSummary {
  tenantId: string;
  name: string;
  databaseId: string;
  bucket: string;
  status: string;
  isDemo: boolean;
  host: string;
  counts: { clients: number; staff: number; events: number };
  /** Phase 3 fills this in. Null means no licence document — unlimited. */
  licence: { plan: string; expiresAt: string | null } | null;
}

/** One clinic's detail page. */
export interface ClinicDetail extends ClinicSummary {
  /** Protocol ids switched OFF for this clinic; [] means everything enabled. */
  disabledEvaluations: string[];
  brandingLogoUrl: string | null;
  /** From system_settings/config — the clinic's own billing identity. */
  legalName: string | null;
  staff: Array<{ uid: string; name: string; role: string; email: string }>;
}

export interface BugReport {
  id: string;
  tenantId: string;
  host: string;
  page: string;
  title: string;
  description: string;
  status: string;
  reportedBy: { name?: string; role?: string; uid?: string } | null;
  userAgent: string;
  createdAt: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  clinic: string;
  consent: boolean;
  source: string;
  createdAt: string | null;
}

export interface ClinicSpend {
  tenantId: string;
  name: string;
  conversations: number;
  insightEvents: number;
  costUsd: number;
}

export interface ClinicHealth {
  tenantId: string;
  name: string;
  databaseReachable: boolean;
  bucketConfigured: boolean;
  anthropicKeyPresent: boolean;
  licencePresent: boolean;
  error: string | null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/platform/types.ts
git commit -m "$(cat <<'EOF'
feat(platform): shared shapes for the console

Defined once so a route and its page cannot drift apart.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The clinics route

Reads the registry from the control plane, then one count per collection per clinic.

**Files:**
- Create: `src/app/api/platform/clinics/route.ts`
- Test: `scripts/test-platform.mjs` (extend)

**Interfaces:**
- Consumes: `requireSuperadmin`, `platformError` (Task 2); `ClinicSummary` (Task 3); `adminDb` from `@/lib/firebaseAdmin`.
- Produces: `GET /api/platform/clinics` → `200 { clinics: ClinicSummary[] }`, sorted by name.

- [ ] **Step 1: Write the route**

Create `src/app/api/platform/clinics/route.ts`:

```ts
/**
 * Every clinic, with enough detail to render the console's front page.
 *
 * The registry lives in the control plane; the counts live in each clinic's own
 * database, so this fans out one read per clinic. `count()` aggregation is used
 * rather than fetching documents — Live Better Life has 88 clients and tens of
 * thousands of events, and the console only needs the number.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import type { ClinicSummary } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function countOf(db: FirebaseFirestore.Firestore, collection: string): Promise<number> {
  try {
    const snap = await db.collection(collection).count().get();
    return snap.data().count;
  } catch {
    // A clinic whose database is unreachable should render as zero rather than
    // taking the whole page down.
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const registry = await adminDb().collection("tenants").get();

    const clinics = await Promise.all(
      registry.docs.map(async (doc): Promise<ClinicSummary> => {
        const t = doc.data() as {
          tenantId?: string;
          name?: string;
          databaseId?: string;
          bucket?: string;
          status?: string;
          isDemo?: boolean;
        };
        const databaseId = t.databaseId || `clinic-${doc.id}`;
        const db = adminDb(databaseId);

        const [clients, staff, events, licenceSnap] = await Promise.all([
          countOf(db, "clients"),
          countOf(db, "team_members"),
          countOf(db, "events"),
          db.collection("system_settings").doc("licence").get().catch(() => null),
        ]);

        const licence = licenceSnap?.exists
          ? (licenceSnap.data() as { plan?: string; expiresAt?: string | null })
          : null;

        return {
          tenantId: doc.id,
          name: t.name || doc.id,
          databaseId,
          bucket: t.bucket || "",
          status: t.status || "unknown",
          isDemo: !!t.isDemo,
          host: `${doc.id}.tempoapp.ro`,
          counts: { clients, staff, events },
          licence: licence
            ? { plan: licence.plan || "unknown", expiresAt: licence.expiresAt ?? null }
            : null,
        };
      }),
    );

    clinics.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ clinics });
  } catch (e: any) {
    console.error("[platform/clinics] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add the route assertions**

In `scripts/test-platform.mjs`, add above the final summary block:

```js
const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "";

if (BASE) {
  console.log(`\n${C.bold("routes are closed without a token")}  ${C.dim(BASE)}\n`);
  for (const path of [
    "/api/platform/clinics",
    "/api/platform/bug-reports",
    "/api/platform/leads",
    "/api/platform/ai-usage",
    "/api/platform/health",
  ]) {
    const res = await fetch(`${BASE}${path}`);
    check(`GET ${path} unauthenticated`, res.status, 401);
  }

  // A clinic host must not even admit these exist.
  const onClinic = await fetch("https://livebetterlife.tempoapp.ro/api/platform/clinics");
  check("a clinic host hides the platform routes", onClinic.status, 404);
} else {
  console.log(`\n  ${C.dim("no --base given; skipping route assertions")}`);
}
```

- [ ] **Step 3: Run the pure-function suite**

```bash
npm run test:platform
```

Expected: PASS (11 assertions, route section skipped).

- [ ] **Step 4: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/app/api/platform/clinics/route.ts scripts/test-platform.mjs
git commit -m "$(cat <<'EOF'
feat(platform): list every clinic with its live counts

Registry from the control plane, counts from each clinic's own database via
count() aggregation rather than fetching documents — the console needs the
number, not tens of thousands of events. An unreachable clinic renders as zero
instead of taking the page down with it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: The console shell

The layout carries the host and role gate for everything under `/platform`. This is signposting, not the security boundary — Task 2 is — but a console that renders on a clinic's domain is a mistake that should be visible.

**Files:**
- Create: `src/app/platform/layout.tsx`, `src/components/platform/PlatformNav.tsx`, `src/lib/platform/clientApi.ts`

**Interfaces:**
- Consumes: `useAuth` from `@/context/AuthContext`; `ACTIVE_DATABASE_ID`, `DEFAULT_DATABASE_ID`.
- Produces: `platformGet<T>(path): Promise<T>` and `platformPatch<T>(path, body): Promise<T>` from `clientApi.ts`; the shell every console page renders inside.

> **Why `/platform` and not the site root.** `src/app/(dashboard)/page.tsx` already owns `/`, and two route groups cannot both define it. So the console is a real path segment. On `superadmin.tempoapp.ro`, `/` still renders the staff dashboard against the control plane — near-empty and harmless, but the reason the nav links home to `/platform`.

- [ ] **Step 1: Write the client API helper**

Create `src/lib/platform/clientApi.ts`:

```ts
"use client";

import { auth } from "@/lib/firebase";

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("not_signed_in");
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    "Content-Type": "application/json",
  };
}

export class PlatformError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PlatformError(body.error || "request_failed", res.status);
  }
  return (await res.json()) as T;
}

export async function platformGet<T>(path: string): Promise<T> {
  return unwrap<T>(await fetch(path, { headers: await authHeaders() }));
}

export async function platformPatch<T>(path: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(path, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(body) }),
  );
}
```

- [ ] **Step 2: Write the nav**

Create `src/components/platform/PlatformNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Building2, Bug, UserPlus, Sparkles, Activity } from "lucide-react";

const ITEMS = [
  { href: "/platform", icon: Building2, key: "clinics", label: "Clinics" },
  { href: "/platform/bug-reports", icon: Bug, key: "bug_reports", label: "Bug reports" },
  { href: "/platform/leads", icon: UserPlus, key: "leads", label: "Leads" },
  { href: "/platform/ai-usage", icon: Sparkles, key: "ai_usage", label: "Mira spend" },
  { href: "/platform/health", icon: Activity, key: "health", label: "Health" },
];

export default function PlatformNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800 px-4">
      {ITEMS.map((item) => {
        const active = item.href === "/platform" ? pathname === "/platform" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold whitespace-nowrap border-b-2 transition-colors",
              active
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
            )}
          >
            <Icon className="w-4 h-4" />
            {t(`platform.nav.${item.key}`, { defaultValue: item.label })}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Write the layout**

Create `src/app/platform/layout.tsx`:

```tsx
"use client";

import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ACTIVE_DATABASE_ID, DEFAULT_DATABASE_ID } from "@/lib/firebase";
import PlatformNav from "@/components/platform/PlatformNav";

/**
 * The console shell.
 *
 * The checks here are signposting, not the boundary: every /api/platform route
 * re-checks the caller and the host server-side, because the bundle is shared
 * by every clinic and anything in the browser can be bypassed. What this
 * prevents is the console rendering somewhere it does not belong and looking
 * like it works.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // The console reads the control plane. On a clinic's host `db` is bound to
  // that clinic, so this page is not merely unauthorised — it is meaningless.
  if (ACTIVE_DATABASE_ID !== DEFAULT_DATABASE_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-500 max-w-md">
          {t("platform.wrong_host", {
            defaultValue: "The platform console is served from superadmin.tempoapp.ro.",
          })}
        </p>
      </div>
    );
  }

  if (!user || String(userRole || "").toLowerCase() !== "superadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-500">
          {t("platform.not_authorised", { defaultValue: "Superadmin access only." })}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="px-4 pt-4">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t("platform.title", { defaultValue: "TempoApp Platform" })}
          </h1>
        </div>
        <PlatformNav />
      </header>
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles and gates**

```bash
npx tsc --noEmit
npm run dev:demo
```

Visit `http://localhost:3000/platform`. Expected: the wrong-host message, because `dev:demo` sets `NEXT_PUBLIC_TENANT_HOST=demo.tempoapp.ro` and `db` binds to `clinic-demo`. Stop the server, then:

```bash
node scripts/tenant-env.mjs --check
```

- [ ] **Step 5: Commit**

```bash
git add src/app/platform/layout.tsx src/components/platform/PlatformNav.tsx src/lib/platform/clientApi.ts
git commit -m "$(cat <<'EOF'
feat(platform): the console shell

Lives at /platform rather than the site root: (dashboard) already owns / and
two route groups cannot both define it.

The host and role checks here are signposting, not the boundary — every
platform route re-checks server-side, because the bundle is shared by every
clinic. What they prevent is the console rendering on a clinic's domain and
appearing to work.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: The table, and the clinics page

One generic table serves every list screen; writing it once here keeps the four later pages small.

**Files:**
- Create: `src/components/platform/DataTable.tsx`, `src/app/platform/page.tsx`

**Interfaces:**
- Consumes: `platformGet` (Task 5); `ClinicSummary` (Task 3).
- Produces: `DataTable<T>({ rows, columns, empty, loading })` where
  `columns: Array<{ key: string; header: string; render: (row: T) => React.ReactNode; align?: "left" | "right" }>`.

- [ ] **Step 1: Write the table**

Create `src/components/platform/DataTable.tsx`:

```tsx
"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

/**
 * The console's one table. Scrolls horizontally inside its own container so a
 * wide row never makes the page scroll sideways on a phone.
 */
export default function DataTable<T extends { id?: string }>({
  rows,
  columns,
  empty,
  loading,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  empty: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }
  if (!rows.length) {
    return <p className="py-16 text-center text-sm text-neutral-500">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            {columns.map((c) => (
              <th
                key={c.key}
                className={clsx(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 whitespace-nowrap",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                "border-b last:border-0 border-neutral-100 dark:border-neutral-800/60",
                onRowClick && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx(
                    "px-4 py-3 text-neutral-800 dark:text-neutral-200",
                    c.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Write the clinics page**

Create `src/app/platform/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicSummary } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";

export default function PlatformClinicsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ clinics: ClinicSummary[] }>("/api/platform/clinics")
      .then((d) => { if (!cancelled) setClinics(d.clinics); })
      .catch((e) => { if (!cancelled) setError(String(e.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const columns: Column<ClinicSummary>[] = [
    {
      key: "name",
      header: t("platform.clinics.name", { defaultValue: "Clinic" }),
      render: (c) => (
        <div>
          <p className="font-semibold">{c.name}</p>
          <p className="text-xs text-neutral-500">{c.host}</p>
        </div>
      ),
    },
    {
      key: "licence",
      header: t("platform.clinics.licence", { defaultValue: "Licence" }),
      render: (c) =>
        !c.licence ? (
          <span className="text-warning-600">
            {t("platform.clinics.no_licence", { defaultValue: "none — unlimited" })}
          </span>
        ) : c.licence.plan === "lifetime" ? (
          t("platform.clinics.lifetime", { defaultValue: "lifetime" })
        ) : (
          (c.licence.expiresAt || "").slice(0, 10)
        ),
    },
    { key: "clients", header: t("platform.clinics.clients", { defaultValue: "Clients" }), align: "right", render: (c) => c.counts.clients },
    { key: "staff", header: t("platform.clinics.staff", { defaultValue: "Staff" }), align: "right", render: (c) => c.counts.staff },
    { key: "events", header: t("platform.clinics.events", { defaultValue: "Sessions" }), align: "right", render: (c) => c.counts.events },
  ];

  if (error) {
    return <p className="text-error-600 text-sm">{error}</p>;
  }

  return (
    <DataTable
      rows={clinics.map((c) => ({ ...c, id: c.tenantId }))}
      columns={columns}
      loading={loading}
      empty={t("platform.clinics.empty", { defaultValue: "No clinics registered." })}
      onRowClick={(c) => router.push(`/platform/clinics/${c.tenantId}`)}
    />
  );
}
```

- [ ] **Step 3: Verify against the real registry**

```bash
npx tsc --noEmit
npm run lint
```

Expected: typecheck clean, zero ESLint **errors** (this repo carries 39 pre-existing warnings; errors are the gate).

- [ ] **Step 4: Commit**

```bash
git add src/components/platform/DataTable.tsx src/app/platform/page.tsx
git commit -m "$(cat <<'EOF'
feat(platform): the clinics list

One generic table for every console screen, scrolling inside its own container
so a wide row never makes the page scroll sideways on a phone.

A clinic with no licence document is called out as "none — unlimited" rather
than left blank: licences fail open, so absent means unrestricted, and that is
the state worth noticing.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Bug reports

Three reports are stored in `clinic-demo` with nothing in the product able to read them. `bug_reports` is `allow write: if false`, so the status change goes through the Admin SDK — a browser genuinely cannot do it.

**Files:**
- Create: `src/app/api/platform/bug-reports/route.ts`, `src/app/platform/bug-reports/page.tsx`

**Interfaces:**
- Consumes: `requireSuperadmin`, `platformError`, `BugReport`, `platformGet`, `platformPatch`, `DataTable`, `toISO`.
- Produces: `GET /api/platform/bug-reports` → `{ reports: BugReport[] }`; `PATCH` with `{ id, status }` → `{ ok: true }`.

- [ ] **Step 1: Write the route**

Create `src/app/api/platform/bug-reports/route.ts`:

```ts
/**
 * The bug-report inbox.
 *
 * Reports from every clinic land in ONE database — `clinic-demo`, pinned by
 * BUG_REPORT_DATABASE in api/report-bug — so they can be read together instead
 * of scattered per clinic where nobody would look. This is the reader that was
 * never built: the write path, the rules and the email have existed since the
 * feature shipped.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { toISO } from "@/lib/timestamps";
import type { BugReport } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Must match BUG_REPORT_DATABASE in src/app/api/report-bug/route.ts. */
const BUG_REPORT_DATABASE = "clinic-demo";
const STATUSES = new Set(["new", "triaged", "resolved", "wontfix"]);

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const snap = await adminDb(BUG_REPORT_DATABASE)
      .collection("bug_reports")
      .limit(200)
      .get();

    const reports: BugReport[] = snap.docs.map((d) => {
      const r = d.data() as Record<string, any>;
      return {
        id: d.id,
        tenantId: r.tenantId || "",
        host: r.host || "",
        page: r.page || "",
        title: r.title || "",
        description: r.description || "",
        status: r.status || "new",
        reportedBy: r.reportedBy || null,
        userAgent: r.userAgent || "",
        createdAt: toISO(r.createdAt),
      };
    });

    // Sorted here rather than in the query: createdAt is a string on some rows
    // and a Timestamp on others (see lib/timestamps), so orderBy would drop or
    // misorder them. 200 rows sort instantly.
    reports.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return NextResponse.json({ reports });
  } catch (e: any) {
    console.error("[platform/bug-reports] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    await adminDb(BUG_REPORT_DATABASE).collection("bug_reports").doc(id).update({
      status,
      triagedBy: gate.caller.uid,
      triagedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[platform/bug-reports] patch failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the page**

Create `src/app/platform/bug-reports/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformGet, platformPatch } from "@/lib/platform/clientApi";
import type { BugReport } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";
import { useToast } from "@/context/ToastContext";

const NEXT_STATUS: Record<string, string> = {
  new: "triaged",
  triaged: "resolved",
  resolved: "new",
  wontfix: "new",
};

export default function PlatformBugReportsPage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ reports: BugReport[] }>("/api/platform/bug-reports")
      .then((d) => { if (!cancelled) setReports(d.reports); })
      .catch(() => { if (!cancelled) toastError(t("platform.load_failed", { defaultValue: "Could not load." })); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cycleStatus(report: BugReport) {
    const status = NEXT_STATUS[report.status] || "triaged";
    const previous = reports;
    setReports((rs) => rs.map((r) => (r.id === report.id ? { ...r, status } : r)));
    try {
      await platformPatch("/api/platform/bug-reports", { id: report.id, status });
      success(t("platform.bug_reports.updated", { defaultValue: "Status updated." }));
    } catch {
      setReports(previous);
      toastError(t("platform.bug_reports.update_failed", { defaultValue: "Could not update." }));
    }
  }

  const columns: Column<BugReport>[] = [
    {
      key: "title",
      header: t("platform.bug_reports.report", { defaultValue: "Report" }),
      render: (r) => (
        <div className="max-w-md">
          <p className="font-semibold">{r.title}</p>
          <p className="text-xs text-neutral-500 line-clamp-2">{r.description}</p>
        </div>
      ),
    },
    { key: "tenant", header: t("platform.bug_reports.clinic", { defaultValue: "Clinic" }), render: (r) => r.tenantId || "—" },
    { key: "page", header: t("platform.bug_reports.page", { defaultValue: "Page" }), render: (r) => r.page || "—" },
    { key: "by", header: t("platform.bug_reports.by", { defaultValue: "Reported by" }), render: (r) => r.reportedBy?.name || "—" },
    { key: "when", header: t("platform.bug_reports.when", { defaultValue: "When" }), render: (r) => (r.createdAt || "").slice(0, 10) || "—" },
    {
      key: "status",
      header: t("platform.bug_reports.status", { defaultValue: "Status" }),
      align: "right",
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); cycleStatus(r); }}
          className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        >
          {r.status}
        </button>
      ),
    },
  ];

  return (
    <DataTable
      rows={reports}
      columns={columns}
      loading={loading}
      empty={t("platform.bug_reports.empty", { defaultValue: "No bug reports." })}
    />
  );
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run lint
```

Expected: typecheck clean, zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/platform/bug-reports/route.ts src/app/platform/bug-reports/page.tsx
git commit -m "$(cat <<'EOF'
feat(platform): read the bug reports

The write path, the rules and the Resend email have existed since the feature
shipped; nothing could ever read what they produced. Three reports were waiting.

Sorted in the route rather than by orderBy, because createdAt is a string on
some rows and a Timestamp on others — orderBy would silently drop or misorder
them. Status changes go through the Admin SDK because bug_reports is
`allow write: if false`, so no browser can forge one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Leads

30 leads captured by the demo login page's entry form, in `clinic-demo`, never read.

**Files:**
- Create: `src/app/api/platform/leads/route.ts`, `src/app/platform/leads/page.tsx`

**Interfaces:**
- Consumes: `requireSuperadmin`, `platformError`, `Lead`, `platformGet`, `DataTable`, `toISO`.
- Produces: `GET /api/platform/leads` → `{ leads: Lead[] }`.

- [ ] **Step 1: Write the route**

Create `src/app/api/platform/leads/route.ts`:

```ts
/**
 * Sales leads from the demo platform's entry form.
 *
 * `src/app/login/page.tsx` writes these with the browser's own db handle, so
 * they land in whatever database that host resolves to — in practice
 * `clinic-demo`, since the form is on the demo site. Like the bug reports, a
 * reader was never built.
 *
 * These carry contact details a person typed in expecting a sales call, so the
 * route is Superadmin-only and the console does not export them anywhere.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { toISO } from "@/lib/timestamps";
import type { Lead } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEADS_DATABASE = "clinic-demo";

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const snap = await adminDb(LEADS_DATABASE).collection("potential_clients").limit(500).get();

    const leads: Lead[] = snap.docs.map((d) => {
      const l = d.data() as Record<string, any>;
      return {
        id: d.id,
        name: l.name || "",
        email: l.email || "",
        phone: l.phone || "",
        clinic: l.clinic || "",
        consent: !!l.consent,
        source: l.source || "",
        createdAt: toISO(l.createdAt),
      };
    });

    leads.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return NextResponse.json({ leads });
  } catch (e: any) {
    console.error("[platform/leads] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the page**

Create `src/app/platform/leads/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformGet } from "@/lib/platform/clientApi";
import type { Lead } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";

export default function PlatformLeadsPage() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ leads: Lead[] }>("/api/platform/leads")
      .then((d) => { if (!cancelled) setLeads(d.leads); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const columns: Column<Lead>[] = [
    { key: "name", header: t("platform.leads.name", { defaultValue: "Name" }), render: (l) => <span className="font-semibold">{l.name || "—"}</span> },
    { key: "clinic", header: t("platform.leads.clinic", { defaultValue: "Centre" }), render: (l) => l.clinic || "—" },
    {
      key: "contact",
      header: t("platform.leads.contact", { defaultValue: "Contact" }),
      render: (l) => (
        <div className="text-xs">
          {l.email && <a href={`mailto:${l.email}`} className="block text-primary-600 hover:underline">{l.email}</a>}
          {l.phone && <a href={`tel:${l.phone}`} className="block text-neutral-500">{l.phone}</a>}
        </div>
      ),
    },
    { key: "when", header: t("platform.leads.when", { defaultValue: "When" }), align: "right", render: (l) => (l.createdAt || "").slice(0, 10) || "—" },
  ];

  return (
    <DataTable
      rows={leads}
      columns={columns}
      loading={loading}
      empty={t("platform.leads.empty", { defaultValue: "No leads yet." })}
    />
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/platform/leads/route.ts src/app/platform/leads/page.tsx
git commit -m "$(cat <<'EOF'
feat(platform): read the demo leads

30 people filled in the demo entry form expecting to be contacted, and nothing
has ever displayed them. Superadmin-only and deliberately not exportable —
these are contact details someone typed in for one purpose.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Mira spend, and health

Two small read-only roll-ups. Grouped in one task because they share a fan-out-over-clinics shape and neither is meaningful alone.

**Files:**
- Create: `src/app/api/platform/ai-usage/route.ts`, `src/app/platform/ai-usage/page.tsx`, `src/app/api/platform/health/route.ts`, `src/app/platform/health/page.tsx`

**Interfaces:**
- Consumes: `requireSuperadmin`, `platformError`, `ClinicSpend`, `ClinicHealth`, `platformGet`, `DataTable`; `anthropicKeyFor` from `@/lib/assistant/anthropic`; `tenantEnvSuffix` from `@/lib/tenant`.
- Produces: `GET /api/platform/ai-usage` → `{ spend: ClinicSpend[] }`; `GET /api/platform/health` → `{ health: ClinicHealth[] }`.

- [ ] **Step 1: Write the spend route**

Create `src/app/api/platform/ai-usage/route.ts`:

```ts
/**
 * What Mira costs, per clinic.
 *
 * Each clinic pays for its own Anthropic key, so this is the number that says
 * whether a clinic's usage matches what they pay. Both ledgers are written
 * server-side only: ai_conversations rolls up a chat's cost, ai_usage_events
 * records one row per evaluation-insights generation.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import type { ClinicSpend } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const registry = await adminDb().collection("tenants").get();

    const spend = await Promise.all(
      registry.docs.map(async (doc): Promise<ClinicSpend> => {
        const t = doc.data() as { name?: string; databaseId?: string };
        const db = adminDb(t.databaseId || `clinic-${doc.id}`);
        let conversations = 0;
        let insightEvents = 0;
        let costUsd = 0;

        try {
          const convs = await db.collection("ai_conversations").limit(1000).get();
          conversations = convs.size;
          convs.forEach((c) => { costUsd += Number(c.data().costUsd || 0); });

          const events = await db.collection("ai_usage_events").limit(1000).get();
          insightEvents = events.size;
          events.forEach((e) => { costUsd += Number(e.data().costUsd || 0); });
        } catch {
          // An unreachable clinic contributes nothing rather than failing the page.
        }

        return {
          tenantId: doc.id,
          name: t.name || doc.id,
          conversations,
          insightEvents,
          costUsd: Math.round(costUsd * 10000) / 10000,
        };
      }),
    );

    spend.sort((a, b) => b.costUsd - a.costUsd);
    return NextResponse.json({ spend });
  } catch (e: any) {
    console.error("[platform/ai-usage] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the health route**

Create `src/app/api/platform/health/route.ts`:

```ts
/**
 * Per-clinic reachability — the runbook's manual per-host curl, as one page.
 *
 * Checked server-side rather than by fetching each clinic's /api/assistant/health
 * over the network: the Admin SDK can read every database directly, and an
 * HTTP fan-out would report a CDN hiccup as a broken clinic.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { anthropicKeyFor } from "@/lib/assistant/anthropic";
import type { ClinicHealth } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const registry = await adminDb().collection("tenants").get();

    const health = await Promise.all(
      registry.docs.map(async (doc): Promise<ClinicHealth> => {
        const t = doc.data() as { name?: string; databaseId?: string; bucket?: string };
        const databaseId = t.databaseId || `clinic-${doc.id}`;
        let databaseReachable = false;
        let licencePresent = false;
        let error: string | null = null;

        try {
          const db = adminDb(databaseId);
          await db.collection("team_members").limit(1).get();
          databaseReachable = true;
          licencePresent = (await db.collection("system_settings").doc("licence").get()).exists;
        } catch (e: any) {
          error = String(e?.message || e).slice(0, 160);
        }

        return {
          tenantId: doc.id,
          name: t.name || doc.id,
          databaseReachable,
          bucketConfigured: !!t.bucket,
          anthropicKeyPresent: !!anthropicKeyFor(doc.id),
          licencePresent,
          error,
        };
      }),
    );

    health.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ health });
  } catch (e: any) {
    console.error("[platform/health] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Write both pages**

Create `src/app/platform/ai-usage/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicSpend } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";

export default function PlatformAiUsagePage() {
  const { t } = useTranslation();
  const [spend, setSpend] = useState<ClinicSpend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ spend: ClinicSpend[] }>("/api/platform/ai-usage")
      .then((d) => { if (!cancelled) setSpend(d.spend); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const total = spend.reduce((s, c) => s + c.costUsd, 0);

  const columns: Column<ClinicSpend>[] = [
    { key: "name", header: t("platform.ai.clinic", { defaultValue: "Clinic" }), render: (c) => <span className="font-semibold">{c.name}</span> },
    { key: "convs", header: t("platform.ai.conversations", { defaultValue: "Chats" }), align: "right", render: (c) => c.conversations },
    { key: "insights", header: t("platform.ai.insights", { defaultValue: "Insights" }), align: "right", render: (c) => c.insightEvents },
    { key: "cost", header: t("platform.ai.cost", { defaultValue: "Cost (USD)" }), align: "right", render: (c) => `$${c.costUsd.toFixed(4)}` },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        {t("platform.ai.total", { defaultValue: "Total across all clinics" })}:{" "}
        <span className="font-bold text-neutral-900 dark:text-white">${total.toFixed(4)}</span>
      </p>
      <DataTable
        rows={spend.map((s) => ({ ...s, id: s.tenantId }))}
        columns={columns}
        loading={loading}
        empty={t("platform.ai.empty", { defaultValue: "No usage recorded." })}
      />
    </div>
  );
}
```

Create `src/app/platform/health/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicHealth } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";

function Flag({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="w-4 h-4 text-success-600 inline" />
  ) : (
    <X className="w-4 h-4 text-error-600 inline" />
  );
}

export default function PlatformHealthPage() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<ClinicHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ health: ClinicHealth[] }>("/api/platform/health")
      .then((d) => { if (!cancelled) setHealth(d.health); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const columns: Column<ClinicHealth>[] = [
    { key: "name", header: t("platform.health.clinic", { defaultValue: "Clinic" }), render: (c) => <span className="font-semibold">{c.name}</span> },
    { key: "db", header: t("platform.health.database", { defaultValue: "Database" }), align: "right", render: (c) => <Flag ok={c.databaseReachable} /> },
    { key: "bucket", header: t("platform.health.bucket", { defaultValue: "Bucket" }), align: "right", render: (c) => <Flag ok={c.bucketConfigured} /> },
    { key: "mira", header: t("platform.health.mira", { defaultValue: "Mira key" }), align: "right", render: (c) => <Flag ok={c.anthropicKeyPresent} /> },
    { key: "licence", header: t("platform.health.licence", { defaultValue: "Licence" }), align: "right", render: (c) => <Flag ok={c.licencePresent} /> },
  ];

  return (
    <DataTable
      rows={health.map((h) => ({ ...h, id: h.tenantId }))}
      columns={columns}
      loading={loading}
      empty={t("platform.health.empty", { defaultValue: "No clinics registered." })}
    />
  );
}
```

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/platform/ai-usage src/app/platform/ai-usage src/app/api/platform/health src/app/platform/health
git commit -m "$(cat <<'EOF'
feat(platform): Mira spend and clinic health

Each clinic pays for its own Anthropic key, so per-clinic spend is what says
whether usage matches what they pay.

Health is checked server-side through the Admin SDK rather than by fetching
each clinic's health endpoint over HTTP — a fan-out would report a CDN hiccup
as a broken clinic. Until Phase 3 every clinic shows no licence, which is
accurate: absent means unlimited.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Clinic detail

The one screen that reads across a single clinic's settings. Read-only in this phase; Phase 2 makes its toggles writable.

**Files:**
- Create: `src/app/api/platform/clinics/[id]/route.ts`, `src/app/platform/clinics/[id]/page.tsx`

**Interfaces:**
- Consumes: `requireSuperadmin`, `platformError`, `clinicDatabaseId`, `ClinicDetail`, `platformGet`.
- Produces: `GET /api/platform/clinics/[id]` → `{ clinic: ClinicDetail }`, `404 { error: "unknown_clinic" }` for an unregistered or malformed label.

- [ ] **Step 1: Write the route**

Create `src/app/api/platform/clinics/[id]/route.ts`:

```ts
/**
 * One clinic, in detail.
 *
 * The clinic is named in the PATH, and validated before it reaches adminDb():
 * the host says who is asking, the path says who they are asking about, and an
 * unvalidated label is how a typo becomes a read of the wrong database.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import type { ClinicDetail } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function countOf(db: FirebaseFirestore.Firestore, collection: string): Promise<number> {
  try {
    return (await db.collection(collection).count().get()).data().count;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  const derived = clinicDatabaseId(params.id);
  if (!derived) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

  try {
    const registryDoc = await adminDb().collection("tenants").doc(params.id).get();
    if (!registryDoc.exists) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

    const t = registryDoc.data() as Record<string, any>;
    const databaseId = t.databaseId || derived;
    const db = adminDb(databaseId);

    const [clients, events, staffSnap, evalSnap, brandingSnap, configSnap, licenceSnap] =
      await Promise.all([
        countOf(db, "clients"),
        countOf(db, "events"),
        db.collection("team_members").limit(50).get(),
        db.collection("system_settings").doc("evaluation_access").get(),
        db.collection("system_settings").doc("branding").get(),
        db.collection("system_settings").doc("config").get(),
        db.collection("system_settings").doc("licence").get(),
      ]);

    const licence = licenceSnap.exists
      ? (licenceSnap.data() as { plan?: string; expiresAt?: string | null })
      : null;
    const config = configSnap.exists ? (configSnap.data() as Record<string, any>) : null;
    const entities = Array.isArray(config?.legalEntities) ? config!.legalEntities : [];

    const clinic: ClinicDetail = {
      tenantId: registryDoc.id,
      name: t.name || registryDoc.id,
      databaseId,
      bucket: t.bucket || "",
      status: t.status || "unknown",
      isDemo: !!t.isDemo,
      host: `${registryDoc.id}.tempoapp.ro`,
      counts: { clients, staff: staffSnap.size, events },
      licence: licence ? { plan: licence.plan || "unknown", expiresAt: licence.expiresAt ?? null } : null,
      disabledEvaluations: evalSnap.exists ? (evalSnap.data()?.disabled ?? []) : [],
      brandingLogoUrl: brandingSnap.exists ? (brandingSnap.data()?.logoUrl ?? null) : null,
      legalName: entities[0]?.name ?? null,
      staff: staffSnap.docs.map((d) => {
        const m = d.data() as Record<string, any>;
        return { uid: d.id, name: m.name || "", role: m.role || "", email: m.email || "" };
      }),
    };

    return NextResponse.json({ clinic });
  } catch (e: any) {
    console.error("[platform/clinics/:id] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the page**

Create `src/app/platform/clinics/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicDetail } from "@/lib/platform/types";

const PROTOCOLS = ["ablls", "vbmapp", "portage", "cars", "carolina"];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0 border-neutral-100 dark:border-neutral-800/60">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900 dark:text-white text-right">{value}</span>
    </div>
  );
}

export default function PlatformClinicDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ clinic: ClinicDetail }>(`/api/platform/clinics/${params.id}`)
      .then((d) => { if (!cancelled) setClinic(d.clinic); })
      .catch((e) => { if (!cancelled) setError(String(e.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  }
  if (error || !clinic) {
    return <p className="text-error-600 text-sm">{error || t("platform.clinic.not_found", { defaultValue: "Clinic not found." })}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/platform" className="inline-flex items-center gap-2 min-h-[44px] text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ArrowLeft className="w-4 h-4" />
        {t("platform.clinic.back", { defaultValue: "All clinics" })}
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{clinic.name}</h2>
        <a href={`https://${clinic.host}`} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">
          {clinic.host}
        </a>
      </div>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.details", { defaultValue: "Details" })}
        </h3>
        <Row label={t("platform.clinic.database", { defaultValue: "Database" })} value={<code className="text-xs">{clinic.databaseId}</code>} />
        <Row label={t("platform.clinic.bucket", { defaultValue: "Storage bucket" })} value={<code className="text-xs">{clinic.bucket || "—"}</code>} />
        <Row label={t("platform.clinic.legal_name", { defaultValue: "Legal entity" })} value={clinic.legalName || "—"} />
        <Row label={t("platform.clinic.status", { defaultValue: "Status" })} value={clinic.status} />
        <Row label={t("platform.clinic.clients", { defaultValue: "Clients" })} value={clinic.counts.clients} />
        <Row label={t("platform.clinic.events", { defaultValue: "Sessions" })} value={clinic.counts.events} />
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.evaluations", { defaultValue: "Evaluation access" })}
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          {t("platform.clinic.evaluations_hint", { defaultValue: "Read-only for now — editing arrives with Phase 2." })}
        </p>
        <div className="flex flex-wrap gap-2">
          {PROTOCOLS.map((p) => {
            const enabled = !clinic.disabledEvaluations.includes(p);
            return (
              <span
                key={p}
                className={
                  enabled
                    ? "px-3 py-1 rounded-full text-xs font-semibold bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                    : "px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                }
              >
                {p}
              </span>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.staff", { defaultValue: "Staff" })}
        </h3>
        {clinic.staff.map((s) => (
          <Row key={s.uid} label={`${s.name} · ${s.role}`} value={<span className="text-xs text-neutral-500">{s.email}</span>} />
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/platform/clinics src/app/platform/clinics
git commit -m "$(cat <<'EOF'
feat(platform): one clinic in detail

The clinic is named in the path and validated before it reaches adminDb().
Read-only in this phase: the evaluation protocols render as badges so the
current state is visible, and Phase 2 turns them into switches.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Translations, provisioning, documentation

The console works before this task via `defaultValue`; this makes it Romanian, reachable, and documented.

**Files:**
- Modify: `src/lib/i18n/locales/en.json`, `src/lib/i18n/locales/ro.json`, `documentation/Tempo technical documentation.md`, `docs/cutover-runbook.md`

- [ ] **Step 1: Add the English keys**

Add a `platform` object at the top level of `src/lib/i18n/locales/en.json`:

```json
  "platform": {
    "title": "TempoApp Platform",
    "wrong_host": "The platform console is served from superadmin.tempoapp.ro.",
    "not_authorised": "Superadmin access only.",
    "load_failed": "Could not load.",
    "nav": { "clinics": "Clinics", "bug_reports": "Bug reports", "leads": "Leads", "ai_usage": "Mira spend", "health": "Health" },
    "clinics": { "name": "Clinic", "licence": "Licence", "no_licence": "none — unlimited", "lifetime": "lifetime", "clients": "Clients", "staff": "Staff", "events": "Sessions", "empty": "No clinics registered." },
    "clinic": { "back": "All clinics", "details": "Details", "database": "Database", "bucket": "Storage bucket", "legal_name": "Legal entity", "status": "Status", "clients": "Clients", "events": "Sessions", "evaluations": "Evaluation access", "evaluations_hint": "Read-only for now — editing arrives with Phase 2.", "staff": "Staff", "not_found": "Clinic not found." },
    "bug_reports": { "report": "Report", "clinic": "Clinic", "page": "Page", "by": "Reported by", "when": "When", "status": "Status", "updated": "Status updated.", "update_failed": "Could not update.", "empty": "No bug reports." },
    "leads": { "name": "Name", "clinic": "Centre", "contact": "Contact", "when": "When", "empty": "No leads yet." },
    "ai": { "clinic": "Clinic", "conversations": "Chats", "insights": "Insights", "cost": "Cost (USD)", "total": "Total across all clinics", "empty": "No usage recorded." },
    "health": { "clinic": "Clinic", "database": "Database", "bucket": "Bucket", "mira": "Mira key", "licence": "Licence", "empty": "No clinics registered." }
  }
```

- [ ] **Step 2: Add the Romanian keys**

Add the matching `platform` object to `src/lib/i18n/locales/ro.json`:

```json
  "platform": {
    "title": "Platforma TempoApp",
    "wrong_host": "Consola platformei este disponibilă la superadmin.tempoapp.ro.",
    "not_authorised": "Doar pentru Superadmin.",
    "load_failed": "Nu s-a putut încărca.",
    "nav": { "clinics": "Centre", "bug_reports": "Raportări", "leads": "Lead-uri", "ai_usage": "Costuri Mira", "health": "Stare" },
    "clinics": { "name": "Centru", "licence": "Licență", "no_licence": "fără — nelimitat", "lifetime": "pe viață", "clients": "Clienți", "staff": "Echipă", "events": "Ședințe", "empty": "Niciun centru înregistrat." },
    "clinic": { "back": "Toate centrele", "details": "Detalii", "database": "Bază de date", "bucket": "Spațiu de stocare", "legal_name": "Entitate juridică", "status": "Status", "clients": "Clienți", "events": "Ședințe", "evaluations": "Acces evaluări", "evaluations_hint": "Deocamdată doar vizualizare — editarea vine în Faza 2.", "staff": "Echipă", "not_found": "Centrul nu a fost găsit." },
    "bug_reports": { "report": "Raportare", "clinic": "Centru", "page": "Pagină", "by": "Raportat de", "when": "Când", "status": "Status", "updated": "Status actualizat.", "update_failed": "Nu s-a putut actualiza.", "empty": "Nicio raportare." },
    "leads": { "name": "Nume", "clinic": "Centru", "contact": "Contact", "when": "Când", "empty": "Niciun lead." },
    "ai": { "clinic": "Centru", "conversations": "Conversații", "insights": "Analize", "cost": "Cost (USD)", "total": "Total pe toate centrele", "empty": "Nicio utilizare înregistrată." },
    "health": { "clinic": "Centru", "database": "Bază de date", "bucket": "Stocare", "mira": "Cheie Mira", "licence": "Licență", "empty": "Niciun centru înregistrat." }
  }
```

- [ ] **Step 3: Verify both files parse and match**

```bash
node -e "const en=require('./src/lib/i18n/locales/en.json'),ro=require('./src/lib/i18n/locales/ro.json');const k=o=>Object.keys(o).flatMap(x=>typeof o[x]==='object'&&o[x]?k(o[x]).map(y=>x+'.'+y):[x]);const a=k(en.platform).sort(),b=k(ro.platform).sort();console.log('en',a.length,'ro',b.length);const miss=a.filter(x=>!b.includes(x)).concat(b.filter(x=>!a.includes(x)));console.log(miss.length?'MISMATCH: '+miss.join(', '):'keys match')"
```

Expected: `keys match`.

- [ ] **Step 4: Provision the hostname**

```bash
# Vercel — attach the host so it earns a per-host certificate over HTTP-01.
# The *.tempoapp.ro record already resolves, so no registrar step is needed.
vercel domains add superadmin.tempoapp.ro tempo-app-2

# Firebase Auth — sign-in fails on an unlisted origin.
# register-tenant.mjs does this for clinics; the platform host is not a clinic,
# so it is added by hand once.
```

Then, in the Firebase console: Authentication → Settings → Authorized domains → add `superadmin.tempoapp.ro`.

Verify:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://superadmin.tempoapp.ro/platform
npm run test:platform -- --base=https://superadmin.tempoapp.ro
```

Expected: `200`, and the route assertions pass (401 unauthenticated, 404 from a clinic host).

- [ ] **Step 5: Document it**

Append a new `# 29. Platform Console` section to `documentation/Tempo technical documentation.md`, after §28, covering: the host and why `superadmin` is reserved; that the console is a path segment because `(dashboard)` owns `/`; the two-check gate and why a clinic host gets 404; the route table; and that bug reports and leads live in `clinic-demo`.

In `docs/cutover-runbook.md`, under "Still to do", replace the `(default)` purge line with what Phase 0 actually did and what remains.

- [ ] **Step 6: Full verification and commit**

```bash
npx tsc --noEmit
npm run lint
npm run test:isolation
npm run test:timestamps
npm run test:platform
npm run build:demo
```

Expected: typecheck clean; zero ESLint errors; 52 + 43 + 29 tenant/rules/storage assertions; 16 timestamp assertions; platform assertions pass; build succeeds.

```bash
git add src/lib/i18n/locales "documentation/Tempo technical documentation.md" docs/cutover-runbook.md
git commit -m "$(cat <<'EOF'
feat(platform): Romanian, the hostname, and the documentation

Every console string went in with a defaultValue so the screens worked before
this; these are the real keys, checked for parity between en and ro.

superadmin.tempoapp.ro needs the Vercel domain (which earns the certificate)
and a Firebase authorized domain entry, added by hand because
register-tenant.mjs handles clinics and the platform host is not one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 0 (do this FIRST): Purge the control plane

> Ordered last in this document but **executed first**. It is separated because
> it deletes production data and needs its own judgement call.

`(default)` still holds a complete copy of Live Better Life — 88 clients, 2,837
events, 5,822 activities, 61 access codes — from before the tenancy cutover. Once
the console treats `team_members` there as its authorization source, every staff
document in it is a grant against the **platform**, not a clinic.

The clinic's live data now lives in `clinic-livebetterlife`, confirmed by
aggregation count on every collection: each one is present there in equal or
greater number (activities 5,830 vs 5,822 and notifications 1,702 vs 1,653,
because the clinic kept working after the copy).

**Two things a naive purge gets wrong**, both handled below:

- **Deleting a document does not delete its subcollections.** Each client has 11
  (`evaluations`, `vbmapp_evaluations`, `portage_evaluations`,
  `cars_evaluations`, `carolina_evaluations`, `interventionPlans`, `homework`,
  `documents`, `reports`, `videos`, `voiceFeedback`) and each thread has
  `messages`. Deleting only the parents leaves thousands of clinical documents
  present but invisible — the opposite of the point.
- **`team_members` cannot be emptied.** It is what the console authenticates
  against. Superadmins stay; clinic staff go.

**Files:**
- Create: `scripts/purge-control-plane.mjs`

- [ ] **Step 1: Write the script**

Create `scripts/purge-control-plane.mjs`:

```js
#!/usr/bin/env node
/**
 * Removes clinic data from the CONTROL PLANE, leaving the tenant registry.
 *
 *   node scripts/purge-control-plane.mjs --project=tempo-app-2 --dry-run
 *   node scripts/purge-control-plane.mjs --project=tempo-app-2 --yes
 *
 * (default) was Live Better Life's database before the tenancy cutover, and
 * still holds a full copy. The clinic now runs from clinic-livebetterlife. Once
 * the platform console treats team_members in (default) as its authorization
 * source, every leftover staff document there is a grant against the platform
 * itself rather than against a clinic — so the leftovers have to go, and the
 * clinical records they sit beside have no business being there either.
 *
 * THREE SAFETY PROPERTIES, in order of how much they matter:
 *
 *   1. It verifies before it deletes. Every collection is counted here and in
 *      clinic-livebetterlife, and the run ABORTS if the clinic has fewer — i.e.
 *      if this copy is not redundant after all. --force overrides, deliberately
 *      awkwardly.
 *   2. It backs up everything it deletes, first, to disk.
 *   3. It recurses. Deleting a document does not delete its subcollections, and
 *      each client here has 11 of them.
 *
 * KEEPS: tenants, tenant_members, tenant_parents (the control plane's actual
 * job) and every Superadmin in team_members (without whom the console locks).
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Db } from "./demo-seed/firestore.mjs";

/**
 * Collections whose documents have subcollections, and which therefore need a
 * per-document probe. Firestore cannot list subcollections in bulk, so probing
 * every document everywhere would mean ~11,000 sequential round trips.
 *
 * This list is derived from the code that CREATES subcollections — every
 * collection(db, parent, id, sub) and doc(db, parent, id, sub, ...) call site in
 * src/ — not from sampling the data. Sampling would have missed `clients`
 * entirely: its first five documents have no subcollections, while others have
 * twelve.
 *
 * The canary pass below is a backstop against this list going stale as the
 * schema grows, not the primary evidence. It aborts rather than guessing,
 * because a silent orphan is the exact failure this task exists to prevent.
 */
const KNOWN_PARENTS = new Set(["clients", "threads", "ai_conversations"]);
const CANARY_SAMPLE = 5;
/** How many listCollectionIds probes to have in flight at once. */
const PROBE_BATCH = 20;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const DRY = !!args["dry-run"];
const FORCE = !!args.force;
/** The database that must already hold everything we are about to delete. */
const REFERENCE = args.reference || "clinic-livebetterlife";

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project is required")}\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to delete without --yes")} (or --dry-run)\n`);
  process.exit(1);
}

/** The control plane's own collections. Never touched. */
const KEEP_WHOLE = new Set(["tenants", "tenant_members", "tenant_parents"]);
/** Emptying this locks the console out; Superadmins are filtered back in below. */
const KEEP_SUPERADMINS = "team_members";

const token = execSync("gcloud auth application-default print-access-token").toString().trim();
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const base = (db) => `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${db}/documents`;

async function collectionIds(database, docPath = "") {
  const url = `${base(database)}${docPath ? "/" + docPath : ""}:listCollectionIds`;
  const r = await fetch(url, { method: "POST", headers: H, body: "{}" });
  if (!r.ok) return [];
  return (await r.json()).collectionIds || [];
}

async function countOf(database, collection) {
  const r = await fetch(`${base(database)}:runAggregationQuery`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: collection }] },
        aggregations: [{ alias: "n", count: {} }],
      },
    }),
  });
  if (!r.ok) return -1;
  const j = await r.json();
  const row = (Array.isArray(j) ? j : [j]).find((x) => x.result);
  return Number(row?.result?.aggregateFields?.n?.integerValue ?? 0);
}

/** IDs of the first `n` documents in a top-level collection — a page, not a full listAll. */
async function sampleDocIds(database, collection, n) {
  const u = new URL(`${base(database)}/${collection}`);
  u.searchParams.set("pageSize", String(n));
  const r = await fetch(u, { headers: H });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.documents || []).map((d) => d.name.split("/").pop());
}

/**
 * listCollectionIds for many document paths at once, PROBE_BATCH in flight at a
 * time. Returns a Map keyed by the input path.
 */
async function probeMany(docPaths) {
  const out = new Map();
  for (let i = 0; i < docPaths.length; i += PROBE_BATCH) {
    const batch = docPaths.slice(i, i + PROBE_BATCH);
    const results = await Promise.all(batch.map((p) => collectionIds("(default)", p)));
    batch.forEach((p, idx) => out.set(p, results[idx]));
  }
  return out;
}

const db = new Db(PROJECT, { allowAnyProject: true }); // (default)
db.dryRun = DRY;

console.log(`\n${C.bold("Purge the control plane")}`);
console.log(`  project   : ${PROJECT}  ${C.dim("database (default)")}${DRY ? C.yellow("  (DRY RUN)") : ""}`);
console.log(`  reference : ${REFERENCE}\n`);

const roots = await collectionIds("(default)");
const toPurge = roots.filter((c) => !KEEP_WHOLE.has(c));

/* ---------- 1. verify redundancy ---------- */

console.log(`${C.bold("  verifying every collection is already in " + REFERENCE)}\n`);
const unsafe = [];
for (const c of toPurge) {
  const [here, there] = await Promise.all([countOf("(default)", c), countOf(REFERENCE, c)]);
  const ok = there >= here;
  if (!ok) unsafe.push(`${c}: (default)=${here}, ${REFERENCE}=${there}`);
  console.log(
    `    ${ok ? C.green("✓") : C.red("✗")} ${c.padEnd(22)} ${String(here).padStart(6)} here, ${String(there).padStart(6)} there`,
  );
}

if (unsafe.length && !FORCE) {
  console.error(`\n${C.red("✗ ABORTING — this copy is not redundant:")}`);
  unsafe.forEach((u) => console.error(`    ${u}`));
  console.error(`\n  ${C.dim("Investigate before deleting. --force overrides, and you should not need it.")}\n`);
  process.exit(1);
}

/* ---------- 2. canary: catch a stale KNOWN_PARENTS before it costs anything ---------- */

console.log(`${C.bold("  canary — sampling collections outside KNOWN_PARENTS for missed subcollections")}\n`);
const nonParents = toPurge.filter((c) => !KNOWN_PARENTS.has(c));
const canaryPaths = [];
for (const c of nonParents) {
  for (const id of await sampleDocIds("(default)", c, CANARY_SAMPLE)) canaryPaths.push(`${c}/${id}`);
}
const canaryResults = await probeMany(canaryPaths);
const staleFound = [...canaryResults.entries()].filter(([, subs]) => subs.length);
if (staleFound.length) {
  console.error(`\n${C.red("✗ ABORTING — KNOWN_PARENTS is stale:")}`);
  staleFound.forEach(([p, subs]) => console.error(`    ${p} has subcollection(s): ${subs.join(", ")}`));
  console.error(`\n  ${C.dim("Add the root collection to KNOWN_PARENTS above and re-run.")}\n`);
  process.exit(1);
}
console.log(
  `  ${C.green("✓")} canary clean — ${canaryPaths.length} sample(s) across ${nonParents.length} collection(s), no missed subcollections\n`,
);

/* ---------- 3. collect, recursively ---------- */

const doomed = []; // { path, data }

async function walk(collectionPath, probe) {
  const docs = await db.listAll(collectionPath).catch(() => []);
  const candidates = [];
  for (const d of docs) {
    const docPath = `${collectionPath}/${d.__id}`;
    if (collectionPath === KEEP_SUPERADMINS && String(d.role || "").toLowerCase() === "superadmin") {
      console.log(`    ${C.green("keep")} ${docPath.padEnd(46)} ${d.role} ${C.dim(d.name || "")}`);
      continue;
    }
    candidates.push({ d, docPath });
  }

  // Only KNOWN_PARENTS collections get a per-document subcollection probe — see
  // the comment on KNOWN_PARENTS for why probing everything is too slow, and the
  // canary above for why this is safe.
  const subsByPath = probe ? await probeMany(candidates.map((c) => c.docPath)) : null;

  for (const { d, docPath } of candidates) {
    // Subcollections first: a deleted parent would otherwise orphan them.
    for (const sub of subsByPath?.get(docPath) || []) {
      await walk(`${docPath}/${sub}`, false); // subcollections here are leaves, per KNOWN_PARENTS
    }
    doomed.push({ path: docPath, data: d });
  }
}

console.log(`\n${C.bold("  walking")}\n`);
for (const c of toPurge) await walk(c, KNOWN_PARENTS.has(c));
console.log(`\n  ${doomed.length} document(s) to delete`);

if (!doomed.length) {
  console.log(`\n  ${C.green("nothing to purge")}\n`);
  process.exit(0);
}

/* ---------- 4. back up, then delete ---------- */

const dir = path.join(process.cwd(), "notification-backups", `control-plane-purge_${PROJECT}`);
mkdirSync(dir, { recursive: true });
const file = path.join(dir, "purged.json");
writeFileSync(file, JSON.stringify(doomed, null, 1), "utf8");
console.log(`  ${C.green("✓")} backed up to ${C.dim(file)}`);

if (DRY) {
  console.log(`\n  ${C.yellow("dry run — nothing deleted")}\n`);
  process.exit(0);
}

await db.commit(doomed.map((d) => db.deleteWrite(d.path)));

const remaining = await collectionIds("(default)");
console.log(`  ${C.green("✓")} deleted ${doomed.length}`);
console.log(`\n  ${C.bold("remaining root collections:")} ${remaining.join(", ")}\n`);
```

- [ ] **Step 2: Dry run, and read every line of the output**

```bash
node scripts/purge-control-plane.mjs --project=tempo-app-2 --dry-run
```

Expected: every collection reports `✓` in the verification block; one `keep`
line for Stefan Dinca (Superadmin); a total in the region of 11,000 documents.
**If any collection reports `✗`, or no `keep` line appears, stop.**

- [ ] **Step 3: Confirm the backup is real before trusting it**

```bash
node -e "const d=require('./notification-backups/control-plane-purge_tempo-app-2/purged.json');console.log(d.length,'documents');console.log('sample:',d.slice(0,3).map(x=>x.path).join(', '));console.log('subcollection docs:',d.filter(x=>x.path.split('/').length>2).length)"
```

Expected: ~11,000 documents, and a non-zero subcollection count — proof the walk
recursed rather than skimming the top level.

- [ ] **Step 4: Purge**

```bash
node scripts/purge-control-plane.mjs --project=tempo-app-2 --yes
```

Expected final line: `remaining root collections: team_members, tenant_members, tenant_parents, tenants`.

- [ ] **Step 5: Verify the clinics are untouched, and the console can still authenticate**

```bash
for H in aicaa livebetterlife diaconumaria demo; do
  printf "  %-16s " "$H"
  curl -s "https://$H.tempoapp.ro/api/assistant/health/" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('database='+j.database,'firestore='+j.firestore)})"
done
npm run test:isolation
```

Expected: all four `firestore=ok`; 49 + 43 + 29 assertions pass. The Storage
suite matters most here — it reads `tenant_members` from `(default)`, so a
purge that took too much would fail it loudly.

- [ ] **Step 6: Commit**

```bash
git add scripts/purge-control-plane.mjs
git commit -m "$(cat <<'EOF'
feat(platform): purge clinic data from the control plane

(default) was Live Better Life's database before the cutover and still held a
full copy — 88 clients, 2,837 events, 5,822 activities, 61 access codes. The
console is about to treat team_members there as its authorization source, at
which point every leftover staff document is a grant against the platform
rather than a clinic, and the clinical records beside them have no business
being there either.

Verifies before deleting: every collection is counted here and in
clinic-livebetterlife, and the run aborts if the clinic has fewer. It does not
— activities and notifications are higher there, because the clinic kept
working after the copy.

Recurses, which is the part that is easy to get wrong. Deleting a document does
not delete its subcollections, and each client here has 11 of them; a top-level
delete would have left thousands of evaluations and session videos present but
unreachable.

Keeps tenants, tenant_members and tenant_parents — the control plane's actual
job — and every Superadmin, without whom the console locks itself out.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Close it out in the runbook**

In `docs/cutover-runbook.md`, under "Still to do", replace the
`Purge (default) of clinic data` line with a `[x]` entry recording the date, the
document count, and that `tenants` / `tenant_members` / `tenant_parents` and the
Superadmin remain. Note that the old Firebase projects stay as the rollback
target, since `(default)` no longer is one.

---

## Self-review

**Spec coverage.** §2 host and route group → Tasks 1, 5. §3 access control →
Task 2; the `(default)` prerequisite → Task 0, in full. §4 API layer and label validation → Tasks 2, 4, 10. §5 licence — Phase 3,
out of scope here; Phase 1 reads the licence where it exists and shows "none —
unlimited" where it does not. §6 screens → Tasks 6–10, all read-only. §7 testing
→ Tasks 1, 2, 4, 11. §8 sequencing → this document is Phases 0 and 1.

**Task 0 does the full purge, as the spec asks.** Confirmed by the repo owner
on 20 Aug 2026 that Live Better Life's data now lives in
`clinic-livebetterlife`, and verified independently by aggregation count on
every collection before anything is deleted — the script aborts if any
collection is short there. `(default)` therefore stops being a rollback
target; the retired per-clinic Firebase projects still are.

**Deviation from the spec, minor.** The spec models the gate on
`src/lib/assistant/gate.ts`. It reuses `requireStaffRole` from
`src/lib/serverAuth.ts` instead — that helper already does token verification and
a role check against a named database, so the gate is a wrapper adding the host
check rather than a third copy of the same logic.

**Placeholder scan.** None. Every step contains runnable code or an exact
command.

**Type consistency.** `ClinicSummary.counts` is `{ clients, staff, events }` in
Tasks 3, 4 and 10. `ClinicDetail extends ClinicSummary`, so Task 10's route
supplies every `ClinicSummary` field. `Column<T>` is defined in Task 6 and
imported by Tasks 6–9. `platformGet` / `platformPatch` are defined in Task 5 and
used in Tasks 6–10. `clinicDatabaseId` is defined in Task 2 and used in Task 10.
`toISO` comes from the existing `src/lib/timestamps.ts`.

**Known gap, accepted.** `count()` aggregation queries need
`firebase-admin` ≥ 11.4; this repo is on 12.x — verified in `package.json`.
