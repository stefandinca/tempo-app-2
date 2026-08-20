# Archive Index

Documentation kept for reference but no longer maintained. Anything here may
describe a version of the product or infrastructure that no longer exists —
check it against the code before trusting it.

**Current documentation lives one level up in `documentation/`.**

Every file in this folder carries a stale banner at the top. This folder was
called `old documentation/` until 20 Aug 2026.

---

## Archived August 2026 — after the multi-database cutover

On 20 Aug 2026 all three clinics moved onto **one Firebase project and one Vercel
project**, separated by a Firestore database and a Storage bucket derived from the
hostname. That invalidated everything written about the silo model.

| File | Why archived |
|---|---|
| `multi-tenant-implementation-plan.md` | The bridge-model plan: keep a Firebase project per clinic, share one Vercel deployment. Superseded — the product went further, to one project with a database and bucket per clinic. The design that shipped is `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md`; what was actually done is `docs/cutover-runbook.md`. Its central worry — that one `FIREBASE_SERVICE_ACCOUNT` cannot serve several projects — is exactly why the silo model was abandoned rather than bridged. |
| `tempo-diaconumaria.md` | Firebase web config for the `tempo-diaconumaria` project. That project no longer serves anything: her clinic runs from `tempo-app-2` on the `clinic-diaconumaria` database. Kept only so the old project can be identified if it needs decommissioning. |


## Archived August 2026

Moved when the doc set was pruned ahead of onboarding a second clinic.

| File | Why archived |
|---|---|
| `INSTALL PLATFORM.md` | cPanel/Passenger deployment guide. Hosting is **Vercel only**; the cPanel path (`server.js`, `.htaccess`, `npm run package`) is no longer used. |
| `BUILD COMMANDS.md` | `rmdir /s /q .next & npm run build:demo` etc. Superseded by `scripts/tenant-env.mjs` — builds now select a tenant explicitly and refuse to default to live. |
| `chat fixes.md` | Feb 2026 write-up of the chat thread/attribution/archiving fixes. All shipped (roadmap Phase 8). |
| `parent-portal.md` | Per-page parent portal punch list. All items `[FIXED]`/`[DONE]`. |
| `UX-REVIEW.md` | Feb 2026 usability review. The open items it generated live on in the roadmap's Active Backlog; this is the original rationale. |
| `WORK.md` | Scratch task list. Its unfinished items were carried into the roadmap's Active Backlog before archiving — see "Carried over from WORK.md". |
| `video-recording.md` | Full spec for session video. Feature shipped (Phase 8); kept as reference for how it was designed. |
| `voice-feedback.md` | Full spec for voice notes. Feature shipped (Phase 8); same. |
| `Personas & Feature Guide.md` | Mar 2026 persona/feature material. Dormant. |
| `Marketing Outline.md` | Mar 2026 marketing plan. Dormant. |
| `MarketAnalysis-Combined.md` | Mar 2026 market analysis. Dormant. |

## Archived earlier (Feb–Mar 2026)

The remaining files predate this index — per-feature implementation notes, the
original bug audit (`bugreport.md`), the first roadmap and project overview, the
ABLLS-R/CARS/Portage/Carolina implementation notes, and the source PDFs for the
evaluation protocols.

`bugreport.md` (61 catalogued bugs) and `activity-integration-guide.md` are still
referenced from `CLAUDE.md` and remain useful.
