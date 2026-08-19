# Cutover Runbook — multi-database tenancy

Everything except the switch itself is done. This is the switch.

**Read this first:** the cutover is `git merge` of `feat/multi-database-tenancy`
into `main`. `resolveDatabaseId()` is deterministic, so the moment that code is
live, **all three tenants move at once** — there is no per-clinic rollout. Both
production clinics are in active daily use, so pick a window outside therapy
hours.

Status as of 19 Aug 2026, all verified against the real project:

| | database | documents | bucket | objects | staff mirrors | parent mirrors |
|---|---|---|---|---|---|---|
| Live Better Life | `clinic-livebetterlife` | 37,724 ✓ | `tempo-app-2-livebetterlife` | 32 ✓ | 6 | 267 |
| Diaconu Maria | `clinic-diaconumaria` | 70 ✓ | `tempo-app-2-diaconumaria` | 0 | 3 | 0 |
| Demo | `clinic-demo` | seeded | `tempo-app-2-demo` | 0 | 8 | 0 |

Auth is already merged into `tempo-app-2`: Diaconu Maria's two staff and the
demo login were imported with their UIDs and password hashes intact, and her
old-project UID was rewritten to the platform one across 15 documents.

---

## Before the window

- [ ] **Re-run the sync.** Both clinics have been in use since the first copy, so
      the destination is stale. This is idempotent and takes minutes.

      ```bash
      node scripts/migrate-tenant.mjs --from-project=tempo-app-2 --from-database='(default)' \
        --to-project=tempo-app-2 --to-database=clinic-livebetterlife --yes

      node scripts/migrate-tenant.mjs --from-project=tempo-diaconumaria \
        --to-project=tempo-app-2 --to-database=clinic-diaconumaria --yes
      ```

- [ ] **Re-run her UID remap** — the fresh copy reintroduces her old-project UID.

      ```bash
      node scripts/remap-uid.mjs --project=tempo-app-2 --database=clinic-diaconumaria \
        --from=c7j7LfAEUjMjZ74hU3Hea5s5Ctf2 --to=bE6C6yysQNXUroLGnOMlYhKvhoW2 --yes
      ```

- [ ] **Re-run the media move** (picks up anything uploaded since; already-copied
      objects are skipped by hash).

      ```bash
      node scripts/migrate-storage.mjs --from-bucket=tempo-app-2.firebasestorage.app \
        --to-bucket=tempo-app-2-livebetterlife --project=tempo-app-2 \
        --database=clinic-livebetterlife --yes
      ```

- [ ] **Refresh the mirrors.** New staff or newly-linked parents since the last
      run would otherwise have no Storage access. Order matters — mirrors before
      rules, always.

      ```bash
      node scripts/register-tenant.mjs --project=tempo-app-2 --tenant=livebetterlife --name="Live Better Life" --yes
      node scripts/register-tenant.mjs --project=tempo-app-2 --tenant=diaconumaria  --name="Diaconu Maria"    --yes
      node scripts/register-tenant.mjs --project=tempo-app-2 --tenant=demo          --name="Tempo Demo Clinic" --yes
      ```

- [ ] **Verify all three.** `--verify` writes nothing and exits non-zero if the
      destination is short.

      ```bash
      node scripts/migrate-tenant.mjs --from-project=tempo-app-2 --from-database='(default)' \
        --to-project=tempo-app-2 --to-database=clinic-livebetterlife --verify

      node scripts/migrate-storage.mjs --from-bucket=tempo-app-2.firebasestorage.app \
        --to-bucket=tempo-app-2-livebetterlife --project=tempo-app-2 \
        --database=clinic-livebetterlife --verify
      ```

- [ ] **Run the isolation tests.** `npm run test:isolation` — 33 hostname
      assertions, the Firestore rules suite, and 23 live Storage assertions
      against the real buckets.

---

## The window

- [ ] **Announce a freeze.** Nothing written to the old databases during the
      window is carried across.

- [ ] **Final sync.** Re-run every command in "Before the window" — that is the
      point of them being idempotent.

- [ ] **Cut over.**

      ```bash
      git checkout main
      git merge feat/multi-database-tenancy
      git push
      ```

      Vercel builds. When it goes live, every tenant is reading its own database
      and its own bucket.

- [ ] **Verify each tenant in the browser**, on its real hostname:
      sign in · client list · a calendar week · one evaluation · a client
      document or video · a parent login with an access code · Mira.

---

## Immediately after

- [ ] **Lock the platform bucket.** It is deliberately absent from
      `firebase.json`, so it still carries the OLD rules and still serves Live
      Better Life's original objects. Once the new bucket is confirmed working,
      add it to the `storage` array and redeploy — the new rules deny everything
      there, which is correct for a bucket that should hold no clinic data.

- [ ] **Do not delete the old projects yet.** Original objects keep the URLs in
      any un-migrated copy alive. Give it a few days of real use first.

---

## Rollback

Revert the merge and redeploy:

```bash
git revert -m 1 <merge-commit>
git push
```

The old databases and buckets were never written to or deleted, so this is a
genuine rollback rather than a restore. The per-clinic Firebase projects are
untouched and still hold everything they held before.

---

## Later, once it has settled

- [ ] Purge `(default)` of clinic data, leaving `tenants`, `tenant_members`,
      `tenant_parents`. Back it up first.
- [ ] Decommission `tempo-app-demo` and `tempo-diaconumaria`, and their Vercel
      projects.
- [ ] Collapse to one Vercel project on a wildcard domain — the remaining half of
      the bridge model.
- [ ] Update `documentation/new-tenant-runbook.md` for the multi-database process:
      a new clinic is now a database, a bucket, `register-tenant.mjs`, and a DNS
      record — no new Firebase project.

## Worth deciding separately

- **28,268 of Live Better Life's 37,724 documents are notifications** — 75% of
  the dataset, and the bulk of every sync. Pruning notifications older than a few
  months would make this and every future migration substantially faster. Not
  done here: deleting a clinic's history is your call, not a migration step.
- **The old platform bucket allows CORS from `*`.** The three new buckets are
  restricted to their own clinic's origin plus localhost. That finding closes
  itself when the old bucket stops serving media.
