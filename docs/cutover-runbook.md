# Cutover — multi-database tenancy

**Done: 20 August 2026.** All three clinics now run from one Firebase project,
`tempo-app-2`, separated by a Firestore database and a Storage bucket each, both
derived from the hostname. This file is kept as the record of what was done, the
rollback that is still available, and what remains.

| | database | documents | bucket | mirrors |
|---|---|---|---|---|
| Live Better Life | `clinic-livebetterlife` | 11,096 | `tempo-app-2-livebetterlife` | 6 staff, 267 parents |
| Diaconu Maria | `clinic-diaconumaria` | 125 | `tempo-app-2-diaconumaria` | 3 staff |
| Demo | `clinic-demo` | seeded | `tempo-app-2-demo` | 8 staff |

Verified after the switch: all three hosts serve HTTP 200 on `tempo-app-2`, the
tenant-resolution code is in every deployed bundle, and parent sign-in passes 9
end-to-end assertions against the live Live Better Life deployment (using its
`Alex Test Child` test record, never a real child) and against demo.

## What the cutover actually consisted of

1. **Notifications pruned to 30 days.** 28,268 → 1,640 for Live Better Life, in
   both the source and the copy. Backups under `notification-backups/`. This cut
   the dataset from 37,724 documents to 11,096 and made every sync minutes rather
   than tens of minutes.
2. **Re-sync**, because both clinics had kept working since the first copy —
   Diaconu Maria had grown from 1 client to 6. Then her UID remap again, because
   a fresh copy reintroduces her old-project UID, and the media move again,
   because a fresh copy reintroduces the old bucket URLs.
3. **Merge to `main`**, which rebuilt all three Vercel projects.
4. **Repointed the Vercel env** for `tempo-app-diaconumaria` and `tempo-demo` at
   the platform project, then redeployed them with the build cache disabled.
5. **Deployed `firestore.rules`** to all four databases — after the code, never
   before.

### The ordering that mattered

Each clinic has its own Vercel project, and two of them still pointed at their
old Firebase projects. Those had to be repointed, and the order was not
arbitrary:

> The old code reads `(default)` on **every** host. Old code plus platform
> config would have served Diaconu Maria's domain Live Better Life's records.

So the merge went first and the env second, accepting a few minutes where those
two domains looked for a database that does not exist in their old project —
errors, not a leak. **Broken beats leaked.** Anything that re-treads this path
should preserve that order.

Two things behaved exactly as designed and are worth remembering:

- `tempo-demo`'s first build **failed**, because `FIREBASE_SERVICE_ACCOUNT` is now
  a required variable and demo had never had one. That is the gate working: a
  demo that built fine would have had a parent portal nobody could sign in to.
- The redeploys ran with `VERCEL_FORCE_NO_BUILD_CACHE=1` (since removed). Vercel
  restores the build cache between deployments and `NEXT_PUBLIC_*` are inlined
  into it, so a cached chunk would have carried the **old** Firebase project id.
  That is not hypothetical — it happened locally first, and cost an hour.

## Rollback, still available

Nothing was deleted at any source. The old Firebase projects
(`tempo-diaconumaria`, `tempo-app-demo`) and the platform bucket still hold
everything they held before, including the original objects and their download
URLs.

```bash
git revert -m 1 <merge-commit> && git push
node scripts/vercel-tenant-env.mjs --project=tempo-app-diaconumaria --from=.env.diaconumaria --yes
node scripts/vercel-tenant-env.mjs --project=tempo-demo --from=.env.demo --yes
git checkout <pre-merge> -- firestore.rules && node scripts/deploy-rules.mjs --project=tempo-app-2
```

One gap: the Vercel env vars were stored as `sensitive` and could not be read
back, so `FIREBASE_SERVICE_ACCOUNT` for `tempo-diaconumaria` was overwritten and
is not recoverable from any local file. A rollback that also needs Mira or
SmartBill on her old project would need a fresh service-account key generated
from its Firebase console. The `NEXT_PUBLIC_*` values all restore from
`.env.diaconumaria` and `.env.demo`.

## Vercel consolidation — 20 Aug 2026

`tempo-app-2` is now the single platform project. **All three clinic hostnames
serve from it** — `livebetterlife`, `diaconumaria` and `demo` — each resolving
its own database, bucket and Mira key from the host. `tempo-demo`,
`tempo-livebetterlife` and `tempo-app-diaconumaria` keep their configuration but
have builds disabled (ignored build step `exit 0`), so a push builds once rather
than four times. None was deleted: they are the rollback targets.

`tempo-web` is a **different repository** serving the apex and `www`. It was not
touched, and an explicit domain always beats a wildcard, so it stays put.

Three values used to be baked into the build, which is what forced one project
per clinic. Each is now resolved from the request's host — see
`refactor(tenancy): move per-clinic config from build time to the host`:

| was | now |
|---|---|
| `NEXT_PUBLIC_APP_ENV=demo` | `isDemoHost(hostname)` |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY_<TENANT>`, chosen per request |
| one build per clinic | one build, host-resolved database, bucket and key |

### One thing still needs you

1. **The wildcard needs a DNS record.** `*.tempoapp.ro` is added to the project
   and ownership-verified, but `tempoapp.ro` DNS is managed at the registrar,
   not Vercel (`serviceType=external`), so Vercel reports it
   `misconfigured=true` and an arbitrary subdomain does not resolve. Add at the
   registrar:

   ```
   *.tempoapp.ro    CNAME    cname.vercel-dns.com
   ```

   Until then everything still works — each clinic's own subdomain has its own
   record. The wildcard only removes the need for a DNS record per future
   clinic. `www` and the apex keep their explicit records and are unaffected.

### Diaconu Maria's Mira key — resolved

Her key was stored `sensitive` and could not be read back by anyone, including
through the API, so it could not be copied to the platform project. Rather than
move her domain and leave Mira dead on a live clinic, a **new** key was issued
for her and set as `ANTHROPIC_API_KEY_DIACONUMARIA`. That is the better outcome
anyway: the old key stays scoped to the project it was made for.

The platform project was redeployed before the move, because Vercel binds env at
build time and a running deployment cannot see a variable added after it built —
a step that, skipped, looks exactly like a wrong key.

Her old key is now unused and **should be revoked in the Anthropic console**.
`tempo-app-diaconumaria` no longer holds anything unique, so it can be deleted
whenever the rollback window closes.

## Still to do

- [ ] **Lock the platform bucket.** `tempo-app-2.firebasestorage.app` is
      deliberately absent from `firebase.json`, so it still carries the OLD rules
      and still serves Live Better Life's original objects — deliberate
      redundancy while this settles. Once the new bucket has proven itself, add
      it to the `storage` array and redeploy; the new rules deny everything
      there, which is correct for a bucket that should hold no clinic data.
- [ ] **Purge `(default)` of clinic data**, leaving `tenants`, `tenant_members`,
      `tenant_parents`. Back up first. It is still Live Better Life's original
      database and is the rollback target, so leave it until confident.
- [ ] **Decommission** `tempo-app-demo` and `tempo-diaconumaria` once the old
      objects are no longer wanted.
- [x] **Collapse to one Vercel project** — done 20 Aug 2026, see below. Two of
      three domains moved; Diaconu Maria's is held pending her Mira key.
- [ ] **Update `documentation/new-tenant-runbook.md`.** A new clinic is now a
      database, a bucket, `register-tenant.mjs`, a Vercel domain and a DNS
      record — no new Firebase project.
- [ ] Rotate the SmartBill credentials (long-standing, unrelated to this).
- [ ] 267 parent mirrors and one client with 91 linked uids, from years of
      anonymous sessions. Sign-out now unlinks properly so it stops growing;
      pruning the backlog is optional housekeeping.
