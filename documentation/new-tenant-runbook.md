# Onboarding a New Clinic

How to stand up a new clinic on TempoApp, under the **multi-database model** —
one Firebase project and one Vercel project for the whole platform, with a
Firestore database and a Storage bucket per clinic.

> **No new Firebase project. No new Vercel project.** If you are about to create
> either, stop — that was the old silo model, archived on 20 Aug 2026. See
> `documentation/archive/ARCHIVE-INDEX.md`.

Budget **under an hour**, most of it waiting for DNS.

---

## 0. Pick the label

One lowercase label, used everywhere and never changed afterwards:

| Thing | Derived as | Example |
|---|---|---|
| Hostname | `<label>.tempoapp.ro` | `clinicx.tempoapp.ro` |
| Firestore database | `clinic-<label>` | `clinic-clinicx` |
| Storage bucket | `tempo-app-2-<label>` | `tempo-app-2-clinicx` |
| Mira API key variable | `ANTHROPIC_API_KEY_<LABEL>` | `ANTHROPIC_API_KEY_CLINICX` |

It must match `^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$` — two characters minimum,
hyphens allowed inside. `src/lib/tenant.ts` derives everything from it, so a
label the pattern rejects resolves to the control plane and the clinic sees an
empty app.

Reserved and unusable: `www`, `admin`, `app`, `api`.

---

## 1. Create the database

```bash
TOKEN=$(gcloud auth application-default print-access-token)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"FIRESTORE_NATIVE","locationId":"eur3","concurrencyMode":"PESSIMISTIC"}' \
  "https://firestore.googleapis.com/v1/projects/tempo-app-2/databases?databaseId=clinic-<label>"
```

`eur3` keeps clinical data in the EU, matching the others.

Then deploy rules and indexes to **every** database — they are per database and
do not sync:

```bash
npm run test:rules
node scripts/deploy-rules.mjs --project=tempo-app-2
```

## 2. Create the Storage bucket

A GCS bucket in the EU, then registered with Firebase so rules apply and the SDK
can address it. CORS is restricted to the clinic's own origin.

```bash
# create, EU, uniform access, CORS for https://<label>.tempoapp.ro + localhost
# then: POST .../v1beta/projects/tempo-app-2/buckets/tempo-app-2-<label>:addFirebase
```

`scripts/` has no single command for this yet — the pattern used for the existing
three is in `docs/cutover-runbook.md`. Afterwards, add the bucket to the
`storage` array in `firebase.json` and deploy:

```bash
firebase deploy --only storage --project tempo-app-2
```

> **Order matters.** Deploy storage rules only *after* step 4 writes the
> membership mirrors. The rules deny everything until a mirror exists, so the
> reverse order locks the clinic out of every document, video and voice note.

## 3. Seed the clinic

```bash
node scripts/bootstrap-tenant.mjs --project=tempo-app-2 --database=clinic-<label> --yes
```

Settings, service catalogue and starter programmes. Then create the first Admin:
add them in Firebase Auth on `tempo-app-2` and write their `team_members/{uid}`
document in the new database with the right `role`.

Auth is **shared across the platform** — one account, one password, and the same
person can be staff at several clinics.

## 4. Register the tenant

```bash
node scripts/register-tenant.mjs --project=tempo-app-2 \
  --tenant=<label> --name="Clinic X" --yes
```

Writes `tenants/<label>` plus a `tenant_members/{bucket}__{uid}` mirror for every
staff member, into the `(default)` control plane. Storage authorisation depends
on these, because Storage rules cannot read a named database.

Re-run it whenever staff are added — or let it be, since parent mirrors refresh
themselves on every portal login.

## 5. Point the hostname at the platform

Add the domain to the **`tempo-app-2`** Vercel project (not a new one):

```bash
node scripts/vercel-move-domain.mjs --domain=<label>.tempoapp.ro \
  --from=<current-project> --to=tempo-app-2 --yes   # only if it already exists
```

For a brand-new hostname, add it in the Vercel dashboard, then create the DNS
record at the registrar:

```
<label>.tempoapp.ro    CNAME    cname.vercel-dns.com
```

Once `*.tempoapp.ro` is wildcarded, this step disappears for future clinics.

## 6. Give the clinic its Mira key

Each clinic pays for its own usage, so each gets its own Anthropic key. On the
`tempo-app-2` Vercel project add:

```
ANTHROPIC_API_KEY_<LABEL>
```

**Then redeploy.** Vercel binds environment variables at build time — a running
deployment cannot see a variable added after it built, and the symptom is
identical to a wrong key. Without one, Mira answers `ai_unavailable` and the rest
of the app is unaffected.

## 7. Brand it and set what they bought

Sign in as Superadmin **on the clinic's own subdomain**:

- **Settings → Branding** — upload their logo. It replaces our mark everywhere,
  including the signed-out login screen and the parent portal.
- **Settings → Evaluation access** — switch off any protocol they have not
  bought. Disabled protocols are denied at the rules layer, so existing
  evaluations are genuinely hidden. With all five off, the tab says evaluations
  are coming soon.

Both default to "everything on, our branding", so skipping this step is safe.

---

## Verify before handing over

```bash
npm run test:isolation      # tenant mapping, Firestore rules, Storage rules
```

Then on the real hostname:

- `https://<label>.tempoapp.ro/api/assistant/health/` reports
  `tenant=<label>`, `projectId=tempo-app-2`, `anthropic=ok`
- sign in · client list · a calendar week · upload a document · a parent login
  with an access code

The parent flow is worth testing properly, because an access code is the only
credential a parent has and what it unlocks is a child's clinical record:

```bash
node scripts/test-parent-link.mjs --base=https://<label>.tempoapp.ro \
  --database=clinic-<label> --bucket=tempo-app-2-<label> \
  --code=<a real code> --client=<its client id>
```

Use a test client, never a real child.

---

## The mistakes worth naming

- **Deploying storage rules before the mirrors exist** locks the clinic out of
  all media. Mirrors first, always.
- **Forgetting to redeploy after adding an env var.** It looks exactly like a
  wrong value.
- **Changing a clinic's Firebase config on an old Vercel project.** The old
  per-clinic projects still exist with builds disabled. Editing one changes
  nothing; the platform project is the only one that serves traffic.
- **Assuming rules propagate.** Four databases, four deploys — use
  `scripts/deploy-rules.mjs`.
- **Reusing a label that differs from the hostname.** Everything is derived from
  the hostname; a mismatch is a clinic staring at an empty app.
