# Superadmin Console — Phase 2 + 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the platform console write — licences, evaluation access and branding, set per clinic from one place — and then make an expired licence actually stop staff writing, without ever touching a parent or the audit trail.

**Architecture:** Phase 2 adds `PUT` routes beside the existing read routes, behind the same `requireSuperadmin` gate, each writing through the Admin SDK into the named clinic database. Phase 3 adds one helper to `firestore.rules` that reads a licence document mirrored into each clinic, and gates staff writes on it. The mirror exists because Firestore rules cannot read another database — the same wall that put `tenant_members` in `(default)` for Storage.

**Tech Stack:** Next.js 14 App Router, Firebase Admin SDK (`firebase-admin` 12.x), Firestore security rules, React 18, Tailwind, `react-i18next`, plain-node assertion scripts (this repo has no jest — see `scripts/test-rules.mjs`).

**Spec:** `docs/superpowers/specs/2026-08-20-superadmin-console-design.md`

## Global Constraints

- **Licence expiry makes staff READ-ONLY. Parents are never affected, and the activity log is never gated** — an audit trail must not gain holes at the moment a dispute is most likely.
- **Licences fail OPEN.** A clinic with no `system_settings/licence` document is unrestricted. Rules deploy to five databases at once and mirrors are written per clinic afterwards; fail-closed would freeze every clinic in that window.
- **`graceEndsAtMillis` is a number**, so rules compare `request.time.toMillis()` against it with no date parsing.
- **Never hardcode user-facing strings** — `t('key', { defaultValue: 'English' })`, with matching entries in BOTH `src/lib/i18n/locales/en.json` and `ro.json`. The Romanian must match the register of the existing `platform.*` block.
- **Timestamps are two-shaped** (`Timestamp` or ISO string). Every read goes through `src/lib/timestamps.ts`. Never call `.toDate()` directly.
- **The target clinic is named in the URL path, never inferred from the Host**, and always validated by `clinicDatabaseId` before reaching `adminDb()`.
- **Every platform write logs an activity into the TARGET CLINIC's `activities`** as well as returning success, so a clinic's own audit trail records changes made from outside.
- Touch targets ≥44×44; a `dark:` counterpart for every colour; layout holds at 375px.
- Commit format `<type>(<scope>): <description>` plus trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- `npx tsc --noEmit` clean and `npm run lint` with **zero errors** (39 pre-existing warnings are not yours) before every commit.
- **Do not run anything that writes to production Firestore** except where a task explicitly says so.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/lib/platform/licence.ts` | The licence shape, and the one function that computes `graceEndsAtMillis` |
| `src/app/api/platform/clinics/[id]/licence/route.ts` | PUT — registry then mirror |
| `src/app/api/platform/clinics/[id]/evaluations/route.ts` | PUT — the disabled-protocol list |
| `src/app/api/platform/clinics/[id]/branding/route.ts` | PUT/DELETE — the clinic's logo |
| `src/lib/platform/activity.ts` | Logs a platform action into a clinic's own audit trail |
| `src/components/platform/LicenceEditor.tsx` | The licence form on clinic detail |
| `scripts/test-licence.mjs` | Rules assertions for the enforcement matrix |
| `scripts/set-licences.mjs` | Sets the four clinics' licences, registry + mirror |

**Modified:**

| Path | Change |
|---|---|
| `src/lib/platform/types.ts` | `ClinicDetail.licence` gains fields; `ClinicHealth` gains `licenceInSync`; `Lead` gains `source`/`message`/`teamSize`/`status` |
| `src/app/platform/clinics/[id]/page.tsx` | Licence editor, evaluation switches, branding upload |
| `src/app/api/platform/leads/route.ts` | Read both lead collections; PATCH a marketing lead's status |
| `src/app/platform/leads/page.tsx` | Source column, filter, status control |
| `src/app/api/platform/health/route.ts` | Report registry-vs-mirror drift |
| `firestore.rules` | `licenceActive()` and the gated writes |
| `package.json` | `test:licence` |
| `src/lib/i18n/locales/{en,ro}.json` | New keys |
| `documentation/Tempo technical documentation.md` | §29 gains the write surface and the licence model |

---

## Task 1: The licence shape

One module owns what a licence is and how its grace deadline is computed, so the route, the script and the tests cannot disagree.

**Files:**
- Create: `src/lib/platform/licence.ts`
- Modify: `src/lib/platform/types.ts`
- Test: `scripts/test-licence.mjs` (created here, extended in Task 6)
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type LicencePlan = "lifetime" | "term"`
  - `interface LicenceInput { plan: LicencePlan; expiresAt: string | null; graceDays: number; notes: string }`
  - `interface LicenceRecord extends LicenceInput { graceEndsAtMillis: number | null; updatedAt: string; updatedBy: string }`
  - `buildLicence(input: LicenceInput, updatedBy: string): LicenceRecord | { error: string }`
  - `DEFAULT_GRACE_DAYS = 14`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-licence.mjs`:

```js
#!/usr/bin/env node
/**
 * Licence maths and, from Task 6, the rules enforcement matrix.
 *
 *   npm run test:licence
 *
 * The maths matters because `graceEndsAtMillis` is what Firestore rules compare
 * against. Get it wrong and either a paid clinic is frozen or an expired one
 * never stops — and neither is visible until it happens to someone.
 */
import { buildLicence, DEFAULT_GRACE_DAYS } from "../src/lib/platform/licence.ts";

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
const failures = [];

function check(what, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`  ${C.green("✓")} ${what.padEnd(58)} ${C.dim(`-> ${JSON.stringify(actual)}`)}`);
  } else {
    failures.push(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    console.log(`  ${C.red("✗")} ${what.padEnd(58)} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log(`\n${C.bold("licence maths")}\n`);

const lifetime = buildLicence(
  { plan: "lifetime", expiresAt: null, graceDays: DEFAULT_GRACE_DAYS, notes: "" },
  "uid1",
);
check("a lifetime licence never expires", lifetime.graceEndsAtMillis, null);
check("a lifetime licence keeps no expiry date", lifetime.expiresAt, null);

const term = buildLicence(
  { plan: "term", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: 14, notes: "" },
  "uid1",
);
check(
  "grace is added to the expiry",
  term.graceEndsAtMillis,
  Date.parse("2027-08-20T00:00:00.000Z") + 14 * 86400000,
);
check("zero grace means the expiry itself", 
  buildLicence({ plan: "term", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: 0, notes: "" }, "u").graceEndsAtMillis,
  Date.parse("2027-08-20T00:00:00.000Z"));

console.log(`\n${C.bold("refusals — a bad licence must never be stored")}\n`);

check("a term licence with no date is refused",
  buildLicence({ plan: "term", expiresAt: null, graceDays: 14, notes: "" }, "u").error,
  "expiry_required");
check("an unparseable date is refused",
  buildLicence({ plan: "term", expiresAt: "not a date", graceDays: 14, notes: "" }, "u").error,
  "invalid_expiry");
check("negative grace is refused",
  buildLicence({ plan: "term", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: -1, notes: "" }, "u").error,
  "invalid_grace");
check("an unknown plan is refused",
  buildLicence({ plan: "forever", expiresAt: null, graceDays: 14, notes: "" }, "u").error,
  "invalid_plan");
check("a lifetime licence ignores any date it is handed",
  buildLicence({ plan: "lifetime", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: 14, notes: "" }, "u").expiresAt,
  null);

console.log("");
if (failures.length) {
  console.log(`${C.red(`✗ ${failures.length} failed`)}, ${passed} passed\n`);
  failures.forEach((f) => console.log(`  ${C.red("-")} ${f}`));
  process.exit(1);
}
console.log(`${C.green(`✓ ${passed} assertions passed`)}\n`);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --experimental-strip-types --no-warnings scripts/test-licence.mjs
```

Expected: FAIL — `Cannot find module '../src/lib/platform/licence.ts'`.

- [ ] **Step 3: Write the module**

Create `src/lib/platform/licence.ts`:

```ts
/**
 * What a licence is, and the one place its grace deadline is computed.
 *
 * Dependency-free on purpose, like `src/lib/tenant.ts` and
 * `src/lib/platform/labels.ts`: `scripts/test-licence.mjs` loads it directly
 * with plain Node, which resolves neither `@/*` nor `next/server`.
 *
 * `graceEndsAtMillis` is the field Firestore rules actually compare against, as
 * epoch milliseconds, because a rule can do `request.time.toMillis() < n` with
 * no date parsing and no timezone question. Everything else on the record is
 * for humans.
 */

export const DEFAULT_GRACE_DAYS = 14;

export type LicencePlan = "lifetime" | "term";

export interface LicenceInput {
  plan: LicencePlan;
  /** ISO date. Ignored — and stored as null — when the plan is "lifetime". */
  expiresAt: string | null;
  graceDays: number;
  notes: string;
}

export interface LicenceRecord extends LicenceInput {
  /** null means "never expires". Rules treat null as unrestricted. */
  graceEndsAtMillis: number | null;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Validate and normalise. Returns `{ error }` rather than throwing so the API
 * route can map it straight to a 400 — a malformed licence must never reach
 * Firestore, because the mirror is what rules enforce against.
 */
export function buildLicence(
  input: LicenceInput,
  updatedBy: string,
): LicenceRecord | { error: string } {
  if (input.plan !== "lifetime" && input.plan !== "term") {
    return { error: "invalid_plan" };
  }
  if (!Number.isFinite(input.graceDays) || input.graceDays < 0) {
    return { error: "invalid_grace" };
  }

  const base = {
    graceDays: input.graceDays,
    notes: String(input.notes || ""),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  if (input.plan === "lifetime") {
    // A date on a lifetime licence is dropped rather than kept and ignored:
    // a stored value nothing reads is the kind of thing someone later "fixes"
    // by starting to read it.
    return { plan: "lifetime", expiresAt: null, graceEndsAtMillis: null, ...base };
  }

  if (!input.expiresAt) return { error: "expiry_required" };
  const expiryMs = Date.parse(input.expiresAt);
  if (Number.isNaN(expiryMs)) return { error: "invalid_expiry" };

  return {
    plan: "term",
    expiresAt: new Date(expiryMs).toISOString(),
    graceEndsAtMillis: expiryMs + input.graceDays * 86400000,
    ...base,
  };
}

/** The subset mirrored into a clinic. Rules read only these. */
export function licenceMirror(record: LicenceRecord) {
  return {
    plan: record.plan,
    expiresAt: record.expiresAt,
    graceEndsAtMillis: record.graceEndsAtMillis,
    updatedAt: record.updatedAt,
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
node --experimental-strip-types --no-warnings scripts/test-licence.mjs
```

Expected: PASS — 10 assertions.

- [ ] **Step 5: Extend the shared types**

In `src/lib/platform/types.ts`, replace the `licence` field on `ClinicSummary` and add to `ClinicHealth`:

```ts
  /** Phase 3 fills this in. Null means no licence document — unlimited. */
  licence: { plan: string; expiresAt: string | null; graceEndsAtMillis: number | null } | null;
```

and on `ClinicHealth`, after `licencePresent`:

```ts
  /**
   * Whether the clinic's mirrored licence matches the registry. They are two
   * documents in two databases; drift means the console shows one thing and the
   * rules enforce another.
   */
  licenceInSync: boolean;
```

- [ ] **Step 6: Add the npm script, typecheck, commit**

In `package.json` scripts, after `test:platform`:

```json
    "test:licence": "node --experimental-strip-types --no-warnings scripts/test-licence.mjs"
```

```bash
npx tsc --noEmit
npm run test:licence
git add src/lib/platform/licence.ts src/lib/platform/types.ts scripts/test-licence.mjs package.json
git commit -m "$(cat <<'EOF'
feat(platform): what a licence is, in one dependency-free module

graceEndsAtMillis is stored as epoch milliseconds because it is the field
Firestore rules compare against, and a rule can test request.time.toMillis()
without parsing a date or reasoning about a timezone.

buildLicence returns { error } rather than throwing, so a malformed licence
maps to a 400 and never reaches Firestore — the mirror is what rules enforce
against, and a bad value there is a clinic frozen or an expired one running on.

A date handed to a lifetime licence is dropped rather than stored and ignored;
a value nothing reads is what someone later "fixes" by starting to read it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Logging a platform action into the clinic's own audit trail

Every write in Phase 2 changes a clinic's configuration from outside it. The clinic's audit trail is a compliance artefact; those changes must appear in it, attributed, rather than seeming to happen by themselves.

**Files:**
- Create: `src/lib/platform/activity.ts`

**Interfaces:**
- Consumes: `adminDb` from `@/lib/firebaseAdmin`.
- Produces: `logPlatformActivity(databaseId: string, entry: { type: string; targetName: string; caller: { uid: string; name: string }; metadata?: Record<string, unknown> }): Promise<void>` — never throws.

- [ ] **Step 1: Write the module**

Create `src/lib/platform/activity.ts`:

```ts
/**
 * Records a platform-side change in the CLINIC's own activity feed.
 *
 * A clinic's audit trail is a compliance artefact. When we change what they
 * bought, or their branding, or their licence, that has to show up there —
 * attributed to a named person — rather than appearing to have happened by
 * itself. `src/lib/activityService.ts` does the same job from inside a clinic;
 * this is its Admin-SDK counterpart, because the platform console is bound to
 * the control-plane database and cannot write a clinic's collections directly.
 *
 * Never throws. A failed audit write must not fail the change the operator
 * asked for — but it is logged loudly, because a silent gap in an audit trail
 * is worse than a noisy one.
 */
import { adminDb } from "@/lib/firebaseAdmin";

export interface PlatformActivityEntry {
  /** e.g. "licence_updated", "evaluation_access_updated", "branding_updated" */
  type: string;
  targetName: string;
  caller: { uid: string; name: string };
  metadata?: Record<string, unknown>;
}

export async function logPlatformActivity(
  databaseId: string,
  entry: PlatformActivityEntry,
): Promise<void> {
  try {
    await adminDb(databaseId).collection("activities").add({
      type: entry.type,
      // The clinic's own feed filters by category; "system" keeps platform
      // actions distinguishable from a therapist's or an admin's.
      category: "system",
      userId: entry.caller.uid,
      userName: entry.caller.name || "TempoApp",
      userPhotoURL: null,
      targetId: "platform",
      targetName: entry.targetName,
      metadata: { ...(entry.metadata || {}), viaPlatformConsole: true },
      createdAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error(
      `[platform/activity] could not log ${entry.type} to ${databaseId}:`,
      String(e?.message || e),
    );
  }
}
```

Note `createdAt` is an ISO string, matching what the rest of this database already holds (see `src/lib/timestamps.ts`) and what `activityService.ts` readers tolerate.

- [ ] **Step 2: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/platform/activity.ts
git commit -m "$(cat <<'EOF'
feat(platform): platform changes appear in the clinic's own audit trail

Changing what a clinic bought, or its branding, or its licence, is done from
outside the clinic. Their activity feed is a compliance artefact, so those
changes must show up in it and name who made them, rather than appearing to
have happened by themselves.

Never throws: a failed audit write must not fail the operator's change. It is
logged loudly instead, because a silent hole in an audit trail is worse than a
noisy one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: The licence write route

The crux of Phase 2. Two documents in two databases must both be written, and **the order is a safety property**.

**Files:**
- Create: `src/app/api/platform/clinics/[id]/licence/route.ts`
- Modify: `src/app/api/platform/clinics/[id]/route.ts` (return the new licence fields)

**Interfaces:**
- Consumes: `requireSuperadmin`, `platformError`, `clinicDatabaseId` from `@/lib/platform/gate`; `buildLicence`, `licenceMirror`, `LicenceInput` from `@/lib/platform/licence`; `logPlatformActivity` from `@/lib/platform/activity`; `adminDb`.
- Produces: `PUT /api/platform/clinics/[id]/licence` → `200 { licence: LicenceRecord, mirrored: boolean }`, `400 { error }` for a malformed licence, `404 { error: "unknown_clinic" }`.

- [ ] **Step 1: Write the route**

Create `src/app/api/platform/clinics/[id]/licence/route.ts`:

```ts
/**
 * Sets a clinic's licence.
 *
 * TWO WRITES, AND THE ORDER IS THE SAFETY PROPERTY.
 *
 *   1. `tenants/{id}.licence` in the control plane — the source of truth.
 *   2. `system_settings/licence` in the clinic's own database — the mirror
 *      Firestore rules actually enforce against, because a rule cannot read
 *      another database.
 *
 * Registry FIRST, mirror second. If the mirror write fails after the registry
 * succeeded, the console shows a licence that is not yet enforced: the clinic
 * keeps working. The reverse order would risk enforcing a licence the console
 * cannot see — a clinic frozen with no visible reason. Fail open, always, in
 * the direction of the clinic continuing to work.
 *
 * The response says whether the mirror landed. The health screen reports drift
 * separately, so a half-applied licence is visible rather than assumed.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import { buildLicence, licenceMirror, type LicenceInput } from "@/lib/platform/licence";
import { logPlatformActivity } from "@/lib/platform/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  if (!clinicDatabaseId(params.id)) {
    return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
  }

  let body: Partial<LicenceInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const built = buildLicence(
    {
      plan: body.plan as LicenceInput["plan"],
      expiresAt: body.expiresAt ?? null,
      graceDays: Number(body.graceDays),
      notes: String(body.notes || ""),
    },
    gate.caller.uid,
  );
  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  try {
    const registryRef = adminDb().collection("tenants").doc(params.id);
    const registrySnap = await registryRef.get();
    if (!registrySnap.exists) {
      return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
    }
    const t = registrySnap.data() as { name?: string; databaseId?: string };
    const databaseId = t.databaseId || `clinic-${params.id}`;

    // 1. Source of truth.
    await registryRef.set({ licence: built }, { merge: true });

    // 2. The mirror rules read. A failure here leaves the clinic unrestricted,
    //    which is the safe direction, so it is reported rather than rolled back.
    let mirrored = true;
    try {
      await adminDb(databaseId)
        .collection("system_settings")
        .doc("licence")
        .set(licenceMirror(built), { merge: true });
    } catch (e: any) {
      mirrored = false;
      console.error("[platform/licence] mirror failed:", String(e?.message || e));
    }

    await logPlatformActivity(databaseId, {
      type: "licence_updated",
      targetName: t.name || params.id,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: {
        plan: built.plan,
        expiresAt: built.expiresAt,
        graceDays: built.graceDays,
        mirrored,
      },
    });

    return NextResponse.json({ licence: built, mirrored });
  } catch (e: any) {
    console.error("[platform/licence] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Return the fuller licence from the detail route**

In `src/app/api/platform/clinics/[id]/route.ts`, the `licence` field currently returns `{ plan, expiresAt }`. Extend it so the editor can populate itself — find where `licence` is built and include `graceEndsAtMillis`, plus read `graceDays` and `notes` from the registry rather than the mirror (the mirror deliberately does not carry them):

```ts
    const registryLicence = (registrySnap.data() as any)?.licence ?? null;
    const licence = registryLicence
      ? {
          plan: String(registryLicence.plan || "unknown"),
          expiresAt: registryLicence.expiresAt ?? null,
          graceEndsAtMillis: registryLicence.graceEndsAtMillis ?? null,
          graceDays: Number(registryLicence.graceDays ?? 14),
          notes: String(registryLicence.notes || ""),
        }
      : null;
```

Add `graceDays: number; notes: string` to `ClinicDetail["licence"]` in `src/lib/platform/types.ts` (as an intersection on the detail type only — `ClinicSummary.licence` stays the narrower shape the list needs).

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/platform/clinics src/lib/platform/types.ts
git commit -m "$(cat <<'EOF'
feat(platform): set a clinic's licence, registry before mirror

Two writes in two databases, and the order is the safety property. The registry
in the control plane is the source of truth; the mirror inside the clinic is
what Firestore rules enforce against, because a rule cannot read another
database.

Registry first. If the mirror then fails, the console shows a licence that is
not yet enforced and the clinic keeps working. The reverse order risks
enforcing a licence the console cannot see — a clinic frozen with no visible
reason. Both failure modes are possible; only one of them is safe.

The response reports whether the mirror landed, and the health screen reports
drift separately, so a half-applied licence is visible rather than assumed.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Evaluation access and branding write routes

Two more writes into a named clinic, sharing the shape Task 3 established.

**Files:**
- Create: `src/app/api/platform/clinics/[id]/evaluations/route.ts`, `src/app/api/platform/clinics/[id]/branding/route.ts`

**Interfaces:**
- Consumes: as Task 3, plus `getStorage` from `firebase-admin/storage`.
- Produces: `PUT /api/platform/clinics/[id]/evaluations` with `{ disabled: string[] }` → `200 { disabled }`; `PUT /api/platform/clinics/[id]/branding` (multipart, field `file`) → `200 { logoUrl }`; `DELETE` the same path → `200 { ok: true }`.

- [ ] **Step 1: The evaluations route**

Create `src/app/api/platform/clinics/[id]/evaluations/route.ts`:

```ts
/**
 * Which evaluation protocols a clinic has bought.
 *
 * Stored as an OPT-OUT list (`disabled`) so a clinic with no document has
 * everything enabled — an allowlist would have switched every protocol off for
 * every clinic the moment the rule shipped. `firestore.rules`' evalDisabled()
 * reads this exact field, so the shape is not ours to change unilaterally.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import { logPlatformActivity } from "@/lib/platform/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The five protocol ids the rules and the UI both know. */
const PROTOCOLS = new Set(["ablls", "vbmapp", "portage", "cars", "carolina"]);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  const derived = clinicDatabaseId(params.id);
  if (!derived) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

  let body: { disabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Validated against a closed set: an unknown id here would silently disable
  // nothing while looking like it had worked.
  const raw = Array.isArray(body.disabled) ? body.disabled : null;
  if (!raw || raw.some((k) => typeof k !== "string" || !PROTOCOLS.has(k))) {
    return NextResponse.json({ error: "invalid_protocols" }, { status: 400 });
  }
  const disabled = Array.from(new Set(raw as string[]));

  try {
    const registrySnap = await adminDb().collection("tenants").doc(params.id).get();
    if (!registrySnap.exists) {
      return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
    }
    const t = registrySnap.data() as { name?: string; databaseId?: string };
    const databaseId = t.databaseId || derived;

    await adminDb(databaseId)
      .collection("system_settings")
      .doc("evaluation_access")
      .set(
        { disabled, updatedAt: new Date().toISOString(), updatedBy: gate.caller.uid },
        { merge: true },
      );

    await logPlatformActivity(databaseId, {
      type: "evaluation_access_updated",
      targetName: t.name || params.id,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: { disabled },
    });

    return NextResponse.json({ disabled });
  } catch (e: any) {
    console.error("[platform/evaluations] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: The branding route**

Create `src/app/api/platform/clinics/[id]/branding/route.ts`:

```ts
/**
 * A clinic's logo, uploaded into that clinic's OWN Storage bucket.
 *
 * The bucket is the tenant — `storage.rules` authorises by comparing the bucket
 * name against the caller's membership mirror — so writing to the wrong bucket
 * is a cross-tenant write, not a cosmetic mistake. The bucket name comes from
 * the registry, never from the request.
 *
 * `system_settings/branding` is world-readable by design: the logo renders on
 * the login and password-reset screens, before anyone has signed in. It holds a
 * URL to an image that is public by nature and nothing else.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import { logPlatformActivity } from "@/lib/platform/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

async function registryFor(id: string) {
  const snap = await adminDb().collection("tenants").doc(id).get();
  if (!snap.exists) return null;
  const t = snap.data() as { name?: string; databaseId?: string; bucket?: string };
  return {
    name: t.name || id,
    databaseId: t.databaseId || `clinic-${id}`,
    bucket: t.bucket || "",
  };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);
  if (!clinicDatabaseId(params.id)) {
    return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  // The same limits storage.rules enforces. Checked here too, because this
  // route uses the Admin SDK and bypasses those rules entirely.
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not_an_image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  try {
    const reg = await registryFor(params.id);
    if (!reg) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
    if (!reg.bucket) return NextResponse.json({ error: "no_bucket" }, { status: 500 });

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `branding/logo-${Date.now()}.${ext}`;
    const bucket = getStorage().bucket(reg.bucket);
    const blob = bucket.file(path);

    await blob.save(Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      resumable: false,
    });
    // The login screen renders this before anyone signs in, so the object has
    // to be readable without a token. storage.rules already allows public READ
    // on branding/**; makePublic gives the URL below the same property.
    await blob.makePublic();
    const logoUrl = `https://storage.googleapis.com/${reg.bucket}/${path}`;

    const previous = await adminDb(reg.databaseId)
      .collection("system_settings")
      .doc("branding")
      .get();
    const previousPath = previous.exists ? (previous.data()?.logoPath as string | undefined) : undefined;

    await adminDb(reg.databaseId)
      .collection("system_settings")
      .doc("branding")
      .set(
        { logoUrl, logoPath: path, updatedAt: new Date().toISOString(), updatedBy: gate.caller.uid },
        { merge: true },
      );

    // Best effort: an orphaned old logo costs pennies, a failed delete must not
    // fail the upload the operator just made.
    if (previousPath && previousPath !== path) {
      bucket.file(previousPath).delete().catch(() => {});
    }

    await logPlatformActivity(reg.databaseId, {
      type: "branding_updated",
      targetName: reg.name,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: { logoPath: path },
    });

    return NextResponse.json({ logoUrl });
  } catch (e: any) {
    console.error("[platform/branding] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);
  if (!clinicDatabaseId(params.id)) {
    return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
  }

  try {
    const reg = await registryFor(params.id);
    if (!reg) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

    const ref = adminDb(reg.databaseId).collection("system_settings").doc("branding");
    const existing = await ref.get();
    const path = existing.exists ? (existing.data()?.logoPath as string | undefined) : undefined;

    await ref.set(
      { logoUrl: "", logoPath: "", updatedAt: new Date().toISOString(), updatedBy: gate.caller.uid },
      { merge: true },
    );
    if (path && reg.bucket) {
      getStorage().bucket(reg.bucket).file(path).delete().catch(() => {});
    }

    await logPlatformActivity(reg.databaseId, {
      type: "branding_updated",
      targetName: reg.name,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: { cleared: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[platform/branding] delete failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/platform/clinics
git commit -m "$(cat <<'EOF'
feat(platform): set evaluation access and branding per clinic

Both were previously settable only by signing into a clinic's own subdomain as
Superadmin — borrowing a customer's front door to make a commercial decision
about them.

Protocol ids are validated against a closed set: an unknown id would silently
disable nothing while looking like it worked. The logo's bucket comes from the
registry and never from the request, because the bucket IS the tenant in
storage.rules — writing to the wrong one is a cross-tenant write, not a
cosmetic slip. Size and content-type are re-checked here because this route
uses the Admin SDK and bypasses the rules that normally enforce them.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: The clinic detail editors

Turn the read-only badges into controls.

**Files:**
- Create: `src/components/platform/LicenceEditor.tsx`
- Modify: `src/app/platform/clinics/[id]/page.tsx`, `src/lib/platform/clientApi.ts`, both locale files

**Interfaces:**
- Consumes: `platformGet`, `platformPatch` (existing); `ClinicDetail`.
- Produces: `platformPut<T>(path, body)` and `platformUpload<T>(path, file)` added to `clientApi.ts`; `platformDelete<T>(path)`.

- [ ] **Step 1: Extend the client API**

In `src/lib/platform/clientApi.ts`, after `platformPatch`:

```ts
export async function platformPut<T>(path: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(path, { method: "PUT", headers: await authHeaders(), body: JSON.stringify(body) }),
  );
}

export async function platformDelete<T>(path: string): Promise<T> {
  return unwrap<T>(await fetch(path, { method: "DELETE", headers: await authHeaders() }));
}

/**
 * Multipart upload. Deliberately does NOT use `authHeaders()`: setting
 * Content-Type by hand strips the multipart boundary the browser generates,
 * and the request arrives unparseable.
 */
export async function platformUpload<T>(path: string, file: File): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new PlatformError("not_signed_in", 401);
  const form = new FormData();
  form.append("file", file);
  return unwrap<T>(
    await fetch(path, {
      method: "PUT",
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      body: form,
    }),
  );
}
```

Note also: change `authHeaders()`'s `throw new Error("not_signed_in")` to `throw new PlatformError("not_signed_in", 401)` so callers can distinguish it by status, as the Phase 1 review asked.

- [ ] **Step 2: Write the licence editor**

Create `src/components/platform/LicenceEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { platformPut } from "@/lib/platform/clientApi";

export interface LicenceValue {
  plan: string;
  expiresAt: string | null;
  graceDays: number;
  notes: string;
}

/**
 * The licence form.
 *
 * An expiry date is only meaningful on a term licence, so the date and grace
 * inputs disappear for a lifetime one rather than sitting there disabled and
 * inviting the question of whether they still apply.
 */
export default function LicenceEditor({
  tenantId,
  value,
  onSaved,
}: {
  tenantId: string;
  value: LicenceValue | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [plan, setPlan] = useState(value?.plan === "lifetime" ? "lifetime" : "term");
  const [expiresAt, setExpiresAt] = useState((value?.expiresAt || "").slice(0, 10));
  const [graceDays, setGraceDays] = useState(String(value?.graceDays ?? 14));
  const [notes, setNotes] = useState(value?.notes || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await platformPut<{ mirrored: boolean }>(`/api/platform/clinics/${tenantId}/licence`, {
        plan,
        expiresAt: plan === "term" && expiresAt ? new Date(expiresAt).toISOString() : null,
        graceDays: Number(graceDays),
        notes,
      }).then((r) => {
        if (!r.mirrored) {
          // Saved, but the rules are not enforcing it yet. Say so — a licence
          // that looks set and is not enforced is the worst of both.
          toastError(
            t("platform.licence.not_mirrored", {
              defaultValue: "Saved, but not yet enforced on the clinic. Check Health.",
            }),
          );
        } else {
          success(t("platform.licence.saved", { defaultValue: "Licence saved." }));
        }
      });
      onSaved();
    } catch {
      toastError(t("platform.licence.save_failed", { defaultValue: "Could not save the licence." }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["term", "lifetime"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={
              plan === p
                ? "px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-primary-500 text-white"
                : "px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            }
          >
            {t(`platform.licence.plan_${p}`, { defaultValue: p === "term" ? "Term" : "Lifetime" })}
          </button>
        ))}
      </div>

      {plan === "term" && (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="block text-xs text-neutral-500 mb-1">
              {t("platform.licence.expires", { defaultValue: "Expires" })}
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-neutral-500 mb-1">
              {t("platform.licence.grace", { defaultValue: "Grace (days)" })}
            </span>
            <input
              type="number"
              min={0}
              value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
              className="w-24 px-3 py-2 min-h-[44px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            />
          </label>
        </div>
      )}

      <label className="block text-sm">
        <span className="block text-xs text-neutral-500 mb-1">
          {t("platform.licence.notes", { defaultValue: "Notes" })}
        </span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        />
      </label>

      <button
        onClick={save}
        disabled={saving || (plan === "term" && !expiresAt)}
        className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-primary-500 text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {t("platform.licence.save", { defaultValue: "Save licence" })}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Wire the editors into clinic detail**

In `src/app/platform/clinics/[id]/page.tsx`:

1. Extract the fetch into a `load()` callback so the editors can refresh the page after saving (`useCallback`, called from `useEffect` and passed as `onSaved`).
2. Replace the read-only licence text with `<LicenceEditor tenantId={clinic.tenantId} value={clinic.licence} onSaved={load} />`.
3. Turn each protocol badge into a button that toggles membership of `disabledEvaluations` and `PUT`s the whole list via `platformPut(\`/api/platform/clinics/${clinic.tenantId}/evaluations\`, { disabled: next })`, then calls `load()`. Guard against double-clicks with a `saving` state, as the bug-reports page does with `pending`.
4. Add a file input for branding calling `platformUpload(\`/api/platform/clinics/${clinic.tenantId}/branding\`, file)` and a "remove" button calling `platformDelete` on the same path, both followed by `load()`.
5. Remove the "Read-only for now — editing arrives with Phase 2" hint.

Every new string uses `t()` with a `defaultValue`.

- [ ] **Step 4: Add the locale keys**

Add to the `platform` block of BOTH `en.json` and `ro.json`: `licence.plan_term`, `licence.plan_lifetime`, `licence.expires`, `licence.grace`, `licence.notes`, `licence.save`, `licence.saved`, `licence.save_failed`, `licence.not_mirrored`, `clinic.evaluations_saved`, `clinic.branding_upload`, `clinic.branding_remove`, `clinic.branding_saved`, `clinic.save_failed`.

Romanian must match the existing register — read the `platform` block first. For example `licence.not_mirrored`: *"Salvat, dar încă neaplicat la centru. Verifică Stare."*

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint
node -e "const en=require('./src/lib/i18n/locales/en.json'),ro=require('./src/lib/i18n/locales/ro.json');const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?f(v,p+k+'.'):[p+k]);const a=f(en.platform).sort(),b=f(ro.platform).sort();const m=a.filter(x=>!b.includes(x)).concat(b.filter(x=>!a.includes(x)));console.log(m.length?'MISMATCH: '+m.join(', '):'parity ok, '+a.length+' keys')"
git add src/components/platform/LicenceEditor.tsx src/app/platform/clinics src/lib/platform/clientApi.ts src/lib/i18n/locales
git commit -m "$(cat <<'EOF'
feat(platform): edit a clinic's licence, protocols and branding

The date and grace inputs disappear on a lifetime licence rather than sitting
disabled — a disabled field still invites the question of whether it applies.

When the licence saves but the mirror does not, the toast says so rather than
reporting plain success: a licence that looks set and is not enforced is the
worst of the two failure modes, and the operator is the only one who can notice.

platformUpload deliberately does not reuse authHeaders() — setting Content-Type
by hand strips the multipart boundary the browser generates and the request
arrives unparseable.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Two lead funnels, one screen

**Files:**
- Modify: `src/app/api/platform/leads/route.ts`, `src/app/platform/leads/page.tsx`, `src/lib/platform/types.ts`, both locale files

**Interfaces:**
- Produces: `Lead` gains `source: "marketing" | "demo"`, `message: string`, `teamSize: string`, `status: string | null`, `clinic: string`. `GET /api/platform/leads` → `{ leads: Lead[]; total: number }` merged from both collections. `PATCH` with `{ id, status }` updates a marketing lead only.

- [ ] **Step 1: Extend the `Lead` type**

In `src/lib/platform/types.ts`:

```ts
export interface Lead {
  id: string;
  /** Which funnel this came from. `marketing` rows carry a status. */
  source: "marketing" | "demo";
  name: string;
  email: string;
  phone: string;
  /** Marketing only — what they wrote in the contact form. */
  message: string;
  /** Marketing only — e.g. "4-10 Terapeuți". */
  teamSize: string;
  /** Demo only — the centre name they typed. */
  clinic: string;
  /** Marketing only; null for demo rows, which have no status field. */
  status: string | null;
  createdAt: string | null;
}
```

- [ ] **Step 2: Read both collections**

Rewrite the GET in `src/app/api/platform/leads/route.ts` to read both, tagging each with its source:

```ts
    const [marketing, demo, marketingTotal, demoTotal] = await Promise.all([
      db.collection("leads").orderBy("createdAt", "desc").limit(PAGE).get().catch(() => null),
      db.collection("potential_clients").orderBy("createdAt", "desc").limit(PAGE).get().catch(() => null),
      countOf(db, "leads"),
      countOf(db, "potential_clients"),
    ]);
```

Map each into `Lead` — `source: "marketing"` for `leads` (taking `message`, `teamSize`, `status`, and `clinic: ""`), `source: "demo"` for `potential_clients` (taking `clinic`, with `message: ""`, `teamSize: ""`, `status: null`) — concatenate, then sort the merged array by `createdAt` descending using the existing `toISO`-normalised comparison. Return `{ leads, total: marketingTotal + demoTotal }`.

Keep the existing comment block explaining why `orderBy` is safe, and extend it: `leads` is written only by the marketing site and its `createdAt` is uniformly a Timestamp (measured 21 Aug 2026: 7 of 7), while `potential_clients` is mixed because it passed through the tenant migration.

- [ ] **Step 3: Add the status PATCH**

Mirror the bug-reports PATCH exactly, but write to `leads` and validate against `new Set(["new", "contacted", "qualified", "closed"])`. Return `404 unknown_lead` on `e.code === 5`. Only `leads` documents have a status; a request for a demo row must 400 with `not_triageable` — check by attempting the update and mapping NOT_FOUND, since the two collections have disjoint ids.

- [ ] **Step 4: The merged screen**

In `src/app/platform/leads/page.tsx`:
- Add a source filter: three buttons (all / marketing / demo), filtering client-side over the fetched rows.
- Add a **Source** column rendering a small badge.
- Show `message` truncated under the name for marketing rows, and `clinic` for demo rows — a column each source lacks renders blank.
- Give marketing rows a status button cycling `new → contacted → qualified → closed → new`, with the same `pending` in-flight guard and `disabled` affordance as the bug-reports page. Demo rows show `—`.
- Keep `getRowId={(l) => l.id}`, the `error` prop, and the "showing N of M" banner.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run test:platform
git add src/app/api/platform/leads src/app/platform/leads src/lib/platform/types.ts src/lib/i18n/locales
git commit -m "$(cat <<'EOF'
feat(platform): both lead funnels on one screen

Two collections, two forms, one job: people waiting to be contacted. Two
screens would mean two inboxes, and the one nobody opens is the one that
matters — which is the failure the last phase existed to end.

A column a source lacks renders blank rather than being hidden, so the shape of
a row tells you where it came from. Only marketing leads carry a status, so
only they get the triage control.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Licence enforcement in the rules

**The only task in either phase that can stop a clinic working.** Read the whole task before starting.

**Files:**
- Modify: `firestore.rules`, `scripts/test-licence.mjs`, `src/app/api/platform/health/route.ts`

**Interfaces:**
- Consumes: the mirror written by Task 3.
- Produces: `licenceActive()` in the rules; `ClinicHealth.licenceInSync`.

- [ ] **Step 1: Write the failing rules assertions**

Extend `scripts/test-licence.mjs` with a rules section modelled on `scripts/test-rules.mjs` — read that file first for the harness (it uses the Firebase Rules **test API** with mocked `get`/`exists` results and deploys nothing). Mock the licence document three ways: absent; `graceEndsAtMillis` in the future; `graceEndsAtMillis` in the past.

Assert this matrix:

| Case | Path | Expect |
|---|---|---|
| no licence document | therapist creates an event | ALLOW |
| grace not elapsed | therapist creates an event | ALLOW |
| grace elapsed | therapist creates an event | **DENY** |
| grace elapsed | therapist READS an event | ALLOW |
| grace elapsed | admin updates a client | **DENY** |
| grace elapsed | admin reads a client | ALLOW |
| grace elapsed | **parent reads their child** | ALLOW |
| grace elapsed | **parent marks homework complete** | ALLOW |
| grace elapsed | staff writes an activity | ALLOW |
| grace elapsed | staff writes an evaluation | **DENY** |
| grace elapsed | staff reads an evaluation | ALLOW |
| `graceEndsAtMillis` null (lifetime) | therapist creates an event | ALLOW |

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:licence
```

Expected: the maths assertions pass; every rules assertion fails, because `licenceActive()` does not exist yet.

- [ ] **Step 3: Add the helper**

In `firestore.rules`, immediately after `evalDisabled()`:

```javascript
    // Whether this clinic's licence still permits STAFF WRITES.
    //
    // Fails OPEN: a clinic with no licence document is unrestricted. These
    // rules deploy to every database at once while the mirrors are written per
    // clinic afterwards, so fail-closed would freeze every clinic in the gap.
    //
    // graceEndsAtMillis is epoch milliseconds precisely so this comparison
    // needs no date parsing. null means a lifetime licence.
    //
    // READS ARE NEVER GATED, and neither is anything a parent does. The clinic
    // is the data controller and we are the processor: a billing lapse must not
    // become an outage on a child's clinical record.
    function licenceActive() {
      return !exists(/databases/$(database)/documents/system_settings/licence)
             || get(/databases/$(database)/documents/system_settings/licence)
                  .data.get('graceEndsAtMillis', null) == null
             || request.time.toMillis()
                  < get(/databases/$(database)/documents/system_settings/licence)
                       .data.graceEndsAtMillis;
    }
```

- [ ] **Step 4: Gate the staff writes**

Add `&& licenceActive()` to the write rules on these collections **only**:

`clients` (create/update/delete) · `events` (create/update/delete) · all five evaluation subcollections (write) · `interventionPlans` (write) · `homework` (create/delete — **not** the parent's update branch) · `documents`, `videos`, `voiceFeedback`, `reports` (create/update/delete) · `invoices`, `payouts`, `expenses`, `recurring_expenses` (write) · `programs`, `services` (write) · `client_codes` (create/update/delete) · `team_members` (the `isAdmin()` branch of update, and delete — **not** the self-update branch) · `team_public` (write).

Do **not** gate: `activities` (an audit trail must not gain holes), `notifications`, `fcm_tokens`, `threads` and their `messages` (communication with parents must not stop mid-therapy), `user_consents`, `user_ai_usage`, `ai_*`, `system_settings` (platform-controlled — gating it would stop us fixing the licence), `tenants`/`tenant_members`/`tenant_parents`, `bug_reports`, `potential_clients`.

Rules budget: `licenceActive()` reads one document, and repeated access to the same path inside one evaluation is cached. A staff write already reads `team_members` and sometimes `evaluation_access`, so the deepest path is three — well inside the limit of ten.

- [ ] **Step 5: Run the assertions and the existing suite**

```bash
npm run test:licence
npm run test:rules
```

Expected: all licence assertions pass; `test:rules` still passes 43/43 — if it drops, a gate landed somewhere it should not have.

- [ ] **Step 6: Report drift on the health screen**

In `src/app/api/platform/health/route.ts`, read the registry's `licence.graceEndsAtMillis` alongside the clinic's mirror and set `licenceInSync` to whether they match (both absent counts as in sync). Add a column to `src/app/platform/health/page.tsx` showing it, with a locale key in both files.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit && npm run lint
git add firestore.rules scripts/test-licence.mjs src/app/api/platform/health src/app/platform/health src/lib/i18n/locales
git commit -m "$(cat <<'EOF'
feat(rules): an expired licence makes staff read-only

Reads are never gated, and nothing a parent does is gated. The clinic is the
data controller and we are the processor — a billing lapse must not become an
outage on a child's clinical record, and a wrong date should embarrass us
rather than stop therapy. The activity log is not gated either: an audit trail
must not gain holes at the moment a dispute is most likely.

Fails open. A clinic with no licence document is unrestricted, because these
rules deploy to every database at once while the mirrors are written per clinic
afterwards — fail-closed would freeze every clinic in that window.

Messaging stays open too: cutting a clinic off from its parents mid-therapy is
not a billing lever we are willing to pull.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Deploy, then set the four licences

**Ordering is the whole task.** Rules first (they fail open, so nothing changes), mirrors second.

**Files:**
- Create: `scripts/set-licences.mjs`
- Modify: `documentation/Tempo technical documentation.md`, `documentation/new-tenant-runbook.md`

- [ ] **Step 1: Write the script**

Create `scripts/set-licences.mjs` taking `--project`, `--dry-run`/`--yes`, writing both the registry entry and the clinic mirror for each clinic in a table at the top of the file:

```js
const LICENCES = {
  livebetterlife: { plan: "lifetime", expiresAt: null },
  demo: { plan: "lifetime", expiresAt: null },
  diaconumaria: { plan: "term", expiresAt: "2027-08-20T00:00:00.000Z" },
  aicaa: { plan: "term", expiresAt: "2027-08-20T00:00:00.000Z" },
};
const GRACE_DAYS = 14;
```

It must import `buildLicence` and `licenceMirror` from `../src/lib/platform/licence.ts` rather than recomputing the maths, use the `Db` helper from `./demo-seed/firestore.mjs` with `allowAnyProject: true`, write the registry entry **before** the mirror for each clinic, print the resulting `graceEndsAtMillis` as a human date, and refuse to run without `--yes`.

- [ ] **Step 2: Deploy the rules — this changes nothing yet**

```bash
npm run test:licence && npm run test:rules
node scripts/deploy-rules.mjs --project=tempo-app-2
```

Expected: released to 5/5 databases. Every clinic still has no licence document, so `licenceActive()` returns true everywhere and no behaviour changes. **Verify that before continuing** — check all four clinics still report `firestore=ok` and that a staff write still works.

- [ ] **Step 3: Dry-run the licences**

```bash
node scripts/set-licences.mjs --project=tempo-app-2 --dry-run
```

Expected: two lifetime, two expiring 20 Aug 2027 with grace ending 3 Sep 2027. **Read every line before applying.**

- [ ] **Step 4: Apply, then verify enforcement is what you think**

```bash
node scripts/set-licences.mjs --project=tempo-app-2 --yes
```

Then confirm on the console: all four clinics show a licence, Health shows `licenceInSync` true for each, and — the one that matters — a staff write still succeeds on a clinic whose licence is in force. Nothing should have changed for anyone yet, because no clinic is past its grace date.

- [ ] **Step 5: Document and commit**

Extend §29 of `documentation/Tempo technical documentation.md` with the write surface, the licence model (registry, mirror, ordering, fail-open) and the enforcement matrix. Add a licence step to `documentation/new-tenant-runbook.md` — a new clinic needs a licence set, or it runs unrestricted forever.

```bash
git add scripts/set-licences.mjs documentation/
git commit -m "$(cat <<'EOF'
feat(platform): set the four clinics' licences

Rules first, mirrors second — the rules fail open, so deploying them changes
nothing until a mirror exists. The reverse order would enforce against
databases whose rules had not landed.

Live Better Life and Demo are lifetime. Diaconu Maria and Academia lui Alex
expire 20 Aug 2027, twelve months from onboarding, with writes actually
stopping on 3 Sep after the fourteen-day grace. Every date is editable from the
console, so this is a starting position rather than a commitment.

The runbook gains a licence step: a new clinic without one runs unrestricted
forever, which is the fail-open default working exactly as designed and exactly
not as intended.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage.** §5 licence model → Tasks 1, 3, 7, 8 (registry, mirror, ordering, `graceEndsAtMillis` as a number, fail-open, the enforcement matrix, the four dates and 14-day grace). §6 screens: clinic detail writes → Task 5; the two lead funnels → Task 6. §4 "writes are logged twice" → Task 2, used by Tasks 3 and 4. §7 testing → `test:licence` in Tasks 1 and 7, `test:rules` unchanged in Task 7. §8 sequencing → Task 8's rules-then-mirrors order.

**Deliberately not in this plan.** The parked Phase 1 minors (the `Host` port-parsing imprecision, `role="button"` on `<tr>`, the ai-usage partial-aggregate roll-up, the leads timestamp backfill) are separate work and are recorded in the Phase 1 ledger's final message. Adding them here would blur what this plan is answerable for.

**Placeholder scan.** None. Tasks 5 §3, 6 §2–4 and 8 §1 describe edits to existing files in prose plus the exact expressions and validation sets to use, rather than reproducing a whole file — the surrounding code is in the repo and quoting it wholesale would risk the implementer pasting over later changes.

**Type consistency.** `LicenceRecord` (Task 1) is what Task 3 stores and Task 8's script builds. `licenceMirror()` produces exactly the four fields Task 7's rule reads (`plan`, `expiresAt`, `graceEndsAtMillis`, `updatedAt`), and only `graceEndsAtMillis` is load-bearing. `ClinicDetail.licence` gains `graceDays`/`notes` in Task 3 and is consumed by `LicenceEditor`'s `LicenceValue` in Task 5. `Lead` gains its fields in Task 6 §1 before §2 and §4 use them. `platformPut`/`platformDelete`/`platformUpload` are defined in Task 5 §1 and used in §2–3.

**Known risk, accepted.** Task 7 edits roughly twenty rule clauses by hand. `npm run test:rules` (43 assertions) is the regression net: if a gate lands where it should not, an existing assertion fails. Run it after every few edits rather than only at the end.
