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

### Push notifications need nothing — this step is gone

**Removed 22 Aug 2026.** There is no longer anything to register, and
`functions/src/index.ts` is not touched when adding a clinic.

Push used to come from a Firestore trigger, and a v2 trigger binds to exactly
one database named at deploy time — so every clinic needed a line here and a
`firebase deploy --only functions`. It was the only step in this runbook that
required editing source, and it failed **silently** when forgotten: the clinic's
notifications still appeared in the app, because the bell and the page read
Firestore directly, and only the push half went missing. That reads as users
having declined notifications rather than as a deployment gap, and this section
used to carry a warning saying so.

`/api/notifications` now writes the notification and sends the push in one
request, and `/api/fcm-token` registers a device and takes ownership of its
token. Both derive the clinic from the hostname, like everything else in the
app, so a new clinic works the moment its database exists.

Nothing to do. Kept as a heading because anyone following an older copy of this
runbook will come looking for it.

## 2. Create the Storage bucket

```bash
node scripts/create-tenant-bucket.mjs --project=tempo-app-2 --tenant=<label> --yes
```

Creates the bucket in the EU with uniform access, restricts CORS to
`https://<label>.tempoapp.ro`, registers it with Firebase so rules apply, and adds
it to the `storage` array in `firebase.json`. Idempotent — safe to re-run, and it
never touches an existing bucket's contents.

The name is `tempo-app-2-<label>`, matching `tenantBucket()` in
`src/lib/tenant.ts`. That is not cosmetic: the app derives the bucket from the
hostname at runtime, so a different name means the app writes to one bucket while
the rules authorise another.

Storage rules are deployed in step 4, **not here** — see the warning there.

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

It also adds `<label>.tempoapp.ro` to **Firebase Auth's authorized domains**, so
you do not have to remember to. That list is project-wide rather than per
clinic, and a missing entry breaks sign-in with Google on that host only —
email and password keep working, and the failure surfaces in the browser console
where nobody is looking. Two clinics ran for months without it.

The script appends and never replaces, writes nothing when the host is already
listed, and exits non-zero if the tenant registered but the domain did not, so
a half-done run cannot pass for a clean one.

Re-run it whenever staff are added — or let it be, since parent mirrors refresh
themselves on every portal login.

Now, and only now, deploy the storage rules:

```bash
firebase deploy --only storage --project tempo-app-2
```

> **This order matters.** The rules deny everything until the mirrors above
> exist. Deploying them first locks the clinic out of every document, video and
> voice note it has.

## 5. Set the licence

A new clinic has neither `tenants/<label>.licence` nor its
`system_settings/licence` mirror, and §29.6 of the technical documentation
explains why that means *unrestricted, not broken*: `licenceActive()` fails
open, so a clinic with neither document never hits a single one of the 38
staff-write gates it would otherwise be subject to. Nothing else in this
runbook, or in the app, will ever prompt anyone to come back and set one — a
clinic left here runs unrestricted forever, which is the fail-open default
working exactly as designed and exactly not as intended.

Set one now, while `tenants/<label>` already exists from step 4 — both
writers below require it — and before the clinic is handed to anyone:

- **From the console** — the normal path for a single new clinic. Sign in as
  Superadmin on `superadmin.tempoapp.ro`, open `/platform/clinics/<label>`,
  and use the Licence panel: pick a plan, an expiry (or none, for lifetime),
  and a grace period — 14 days unless there is a reason for something else —
  then save. The registry write and the clinic's mirror write both happen
  server-side, in that order, from one click.
- **From `scripts/set-licences.mjs`** — the bulk path. Add the new clinic's
  row to the `LICENCES` table at the top of the script and re-run it,
  `--dry-run` first and then `--yes`. Useful when licensing several clinics
  at once, or when the licence should be reproducible from a committed file
  rather than a one-off console click.

Either way, confirm it landed on `/platform/health`: this clinic should show
a licence present and "Licence in sync" true.

## 6. Point the hostname at the platform

Add the domain to the **`tempo-app-2`** Vercel project (not a new one):

```bash
node scripts/vercel-move-domain.mjs --domain=<label>.tempoapp.ro \
  --from=<current-project> --to=tempo-app-2 --yes   # only if it already exists
```

For a brand-new hostname, add it to the `tempo-app-2` project in the Vercel
dashboard. **That is the whole of it — the registrar needs nothing.**

`*.tempoapp.ro CNAME cname.vercel-dns.com` is already in the zone, so any new
subdomain resolves to Vercel the moment someone asks for it. What the wildcard
cannot do is carry TLS. A wildcard certificate needs a DNS-01 challenge, which
requires Vercel to control the zone, and `tempoapp.ro` runs on hostico
nameservers alongside the MX records for mail — so Vercel issues nothing for a
subdomain it has never been told about, and the browser gets a handshake failure
rather than a page.

Adding the hostname to the project is what closes that gap: Vercel then completes
an **HTTP-01** challenge, which needs only that the name already resolves to it,
and issues a certificate for that one host. Resolution comes from the wildcard,
the certificate comes from the domain being attached — two different mechanisms,
and only the second one is your job.

Verified 20 Aug 2026 while onboarding `aicaa`: an unregistered subdomain resolves
to Vercel and fails the handshake, while `aicaa.tempoapp.ro` — attached to the
project and never given a record of its own — served a Let's Encrypt certificate
whose only SAN is `aicaa.tempoapp.ro`, within minutes and with no registrar
involvement.

## 7. Give the clinic its Mira key

Each clinic pays for its own usage, so each gets its own Anthropic key. On the
`tempo-app-2` Vercel project add:

```
ANTHROPIC_API_KEY_<LABEL>
```

**Then redeploy.** Vercel binds environment variables at build time — a running
deployment cannot see a variable added after it built, and the symptom is
identical to a wrong key. Without one, Mira answers `ai_unavailable` and the rest
of the app is unaffected.

## 8. Brand it and set what they bought

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
  `tenant=<label>`, `database=clinic-<label>`, `projectId=tempo-app-2`,
  `firestore=ok`, `anthropic=ok`

  `database` and `firestore` together are the load-bearing part: the check
  reads the **clinic's own** database, so `firestore=ok` means that clinic's
  records are reachable. It used to probe `(default)`, which answers on every
  host and would have signed off a clinic whose database was missing entirely.
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

## When a self-onboarded signup fails

This runbook is the manual path. A clinic that arrives through tempoapp.ro's own
signup does all of it automatically, and when it stops, the customer sees a
Romanian screen saying their clinic was created, the setup did not finish, and
we have been notified — and specifically telling them **not** to sign up again,
because the subdomain they picked is already claimed by that half-built setup.

**Start at `/platform/provisions`.** It shows every signup and every attempt,
and it distinguishes the two failures that look identical from the customer's
side:

| What the screen says | What actually happened | What to do |
|---|---|---|
| A signup with **No webhook** / **Never started** | The card was charged, but `checkout.session.completed` never reached us, so the sale has no `confirmedAt` and `/api/provision/clinic` refused with 402. Nothing was built. | Fix the Stripe webhook — endpoint, signing secret, and the MODE the payment was made in — then resend the event from the Stripe dashboard. |
| An attempt marked **Failed** | Provisioning started and a step threw. The row carries the step, the errorCode and the whole error text. | Fix the cause, then press **Resume setup**. |

**Resuming is the whole recovery path, and it is safe.** Every step checks
whether its own work is already done, so a resumed attempt walks the completed
steps in milliseconds and re-runs only the one that failed. Nothing is rolled
back and nothing is built twice — and the label stays claimed by that signup, so
the customer never has to pick a different subdomain.

**Before you blame the clinic, check `/platform/health`.** The readiness panel
at the top lists every credential self-onboarding needs, including the Stripe
signing secret per mode. `Cannot complete a signup` there means the next person
who pays will fail the same way, whatever you do about this one.

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
- **Configuring only Stripe test mode.** The webhook used to demand
  `STRIPE_SECRET_KEY` specifically, so a test-only installation answered every
  event with a 500 while checkout worked perfectly — a card charged, a sale
  never confirmed, and a customer told their setup did not finish. Either mode
  now satisfies the check, but each still needs its OWN signing secret;
  `/platform/health` lists both.
- **Skipping step 5.** A clinic with no licence document isn't broken — it's
  unrestricted, silently and indefinitely, because `licenceActive()` fails
  open. Nothing surfaces the omission later; check `/platform/health` before
  handing the clinic over.
