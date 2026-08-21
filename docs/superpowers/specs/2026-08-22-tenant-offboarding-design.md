# Offboarding a clinic

**Date:** 22 Aug 2026
**Status:** design. No code written yet, deliberately — this is the one path in
the platform where a bug destroys a clinic's records rather than inconveniencing
them, and it should be argued before it is typed.

**Companion:** `documentation/new-tenant-runbook.md` is the forward direction.
This is its reverse, and it should be read alongside it: every numbered step
there has a counterpart here, and anything without one is a leak.

---

## 1. Why this needs a design at all

Onboarding is scripted end to end. Offboarding does not exist — not a script,
not a runbook step, not a `status` that means anything. Today removing a clinic
means a human deleting a Firestore database by hand at speed, which is how the
wrong database gets dropped.

It is also the only operation here that is **irreversible in a way backups do
not fully cover**: a deleted Firestore database takes its point-in-time recovery
window with it, and a deleted GCS bucket releases its name for anyone to claim.

---

## 2. What must be true before anything is deleted

Four gates. All four, every time, no flag to skip them.

1. **An export exists and has been fetched.** GDPR Art. 28(3)(g) gives the
   controller the choice of return *or* deletion. We cannot honour "return"
   after the fact, so the export happens first and its download is recorded.
2. **The clinic has been told, and the notice has been acknowledged or has
   timed out.** Notice at 30/60/80 days after read-only; deletion at 90.
3. **The tenant is `status: "deleting"` and has been for at least 24 hours.**
   A deliberate cooling-off between "decided" and "done", so a mistaken
   decision has a window in which to be noticed.
4. **A dry run has been read by a human.** Same pattern as
   `set-licences.mjs` and `expire-parent-links.mjs`: `--dry-run` prints the
   exact resources, counts and names; `--yes` is a separate invocation.

---

## 3. The reverse of the runbook, in order

Order matters as much as it does on the way in, and for the same reason: each
step should fail toward the clinic still existing rather than half-existing.

**Reverse order of creation, so the last thing created is the first removed.**
The hostname goes first because it is the only step that changes what a user
sees; everything after it is invisible to them.

| # | Resource | Operation | Notes |
|---|---|---|---|
| 1 | Vercel domain `<label>.tempoapp.ro` | Remove from the `tempo-app-2` project | The wildcard still resolves, so the host will fail TLS rather than 404. Consider a holding page before this step. |
| 2 | Vercel env `ANTHROPIC_API_KEY_<LABEL>` | Delete | Named in `vercel-move-domain.mjs`; a stray key is a live credential for a clinic that no longer exists. |
| 3 | Firebase Auth authorized domain | Remove `<label>.tempoapp.ro` | `register-tenant.mjs` adds it. Project-wide list, so leaving it is untidy rather than dangerous. |
| 4 | **Export** | Firestore + Storage to an archive | Must already be done — gate 1. Listed here because it is part of the sequence, not a precondition anyone remembers. |
| 5 | `tenant_parents/{bucket}__{uid}` | Delete all for this bucket | Storage authorisation. Removing these before the bucket means no window where a parent can still reach media for a clinic being deleted. |
| 6 | `tenant_members/{bucket}__{uid}` | Delete all for this bucket | Same reasoning. |
| 7 | Storage bucket `tempo-app-2-<label>` | Delete **objects first**, then the bucket | GCS refuses to delete a non-empty bucket. Videos and voice notes live here. |
| 8 | Firestore database `clinic-<label>` | Delete | The irreversible one. Everything above is recoverable by re-running onboarding; this is not. |
| 9 | `tenants/{label}` | Delete, or tombstone — see §5 | |
| 10 | Cloud Function triggers | Remove the two registrations, redeploy | `sendPushNotification<Label>` and `fcmTokenOwnership<Label>`. **Goes away entirely once Phase 1 of the self-onboarding roadmap lands** — see that spec. |
| 11 | Firebase Auth accounts | Delete **only orphans** — see §4 | |

---

## 4. The trap: Auth is shared

**One Firebase Auth pool serves every clinic. One person, one account, and the
same person can be staff at several clinics** — the runbook says so explicitly,
and it is the whole reason onboarding does not create a second account for
someone who already has one.

So deleting a clinic must never delete a user who works somewhere else. Before
deleting any Auth account:

- Enumerate that clinic's `team_members` uids.
- For each, check **every other clinic database** for a `team_members` document
  with the same uid.
- Delete the Auth account only when it appears nowhere else.

Getting this wrong signs a therapist out of a clinic that is still paying, and
the failure is silent: they simply cannot log in, and nothing connects that to
a different clinic having been removed the day before.

**Anonymous parent accounts** are the opposite case: they are per-session, they
already expire, and `expire-parent-links.mjs` prunes their links. They are not
worth enumerating — deleting the clinic's database removes everything they
could reach.

---

## 5. Labels are never reused after real data

A label that ever held client records goes on a **permanent tombstone list** and
is never issued again.

Parents keep bookmarks. Access codes travel by email and on paper. A clinic's
own staff have saved logins. If `clinicx.tempoapp.ro` is reassigned, all of that
lands on **a different clinic's login page** — a parent typing their child's
access code into an organisation that has never heard of them.

The mechanism: `tenants/{label}` is not deleted but replaced with a tombstone —
`{ status: "deleted", deletedAt, hadClientRecords: true }` — and label
availability checks treat any existing document as taken. It costs one tiny
document per departed clinic and removes an entire class of accident.

A label that **never** held client records — an abandoned trial, a squat — may
be released after a 90-day cooling-off, because nobody ever had a reason to
bookmark it.

---

## 6. What "deleted" actually means

Worth stating plainly in the DPA rather than discovering during an audit:

- Firestore and Storage deletion is immediate and, for the database, final.
- **Backups are not.** Whatever the backup retention window is, that is the real
  horizon at which the data is gone, and the DPA should name it rather than
  implying deletion is instant.
- Exports handed to the controller are outside our control entirely once
  downloaded, which is the point of them.

---

## 7. Script shape

`scripts/offboard-tenant.mjs`, following the conventions the other destructive
scripts already established:

```bash
node scripts/offboard-tenant.mjs --project=tempo-app-2 --tenant=<label> --dry-run
node scripts/offboard-tenant.mjs --project=tempo-app-2 --tenant=<label> --export-only
node scripts/offboard-tenant.mjs --project=tempo-app-2 --tenant=<label> --yes
```

Requirements, each earned by something that has already gone wrong in this
codebase:

- **Refuses without `--yes`**, and `--dry-run` performs every read and no write.
- **Refuses a tenant that is not `status: "deleting"`**, so the decision and the
  execution are two separate acts by two separate commands.
- **Prints counts before acting** — clients, staff, events, documents, videos,
  voice notes, bucket objects and total bytes. A human should be able to tell
  from the dry run alone whether this is the abandoned trial they meant or a
  working clinic with 54 children in it.
- **Aborts if the counts look alive** unless `--force-nonempty` is passed with
  an explicit reason recorded in the tombstone. The purge script's own history
  is the argument here: a 5-document sample once found no subcollections while
  12 existed, and sampling would have orphaned everything.
- **Never `git`-style globs a database name.** The label goes through
  `clinicDatabaseId()` validation, as every other platform path does.
- **Logs each step to the control plane** before performing it, so an
  interrupted run leaves a readable trail of what had already happened.

---

## 8. Open questions

- **Who authorises deletion?** A Superadmin in the console, or two people? For a
  database holding children's clinical records, a second pair of eyes is cheap.
- **Holding page.** Removing the Vercel domain gives a TLS handshake failure,
  which reads as broken rather than closed. A short-lived static page saying the
  clinic is no longer active would be kinder, and is a small amount of work.
- **Export format.** JSON per collection is easy for us and useless to a clinic.
  A readable archive of documents, videos and evaluations is what "return the
  data" actually means to a controller, and it is more work than it sounds.
