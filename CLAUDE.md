# TempoApp

Next.js 14 + Firebase v10 therapy-center management platform for Romanian ABA clinics. Two portals: Staff Dashboard (Superadmin / Admin / Coordinator / Therapist) and Parent Portal (anonymous Firebase auth + client access code). i18n in English and Romanian.

## Tech Stack & Major Components
- **Next.js 14** App Router; client-side rendering for all Firebase code (`"use client"`)
- **Firebase v10** modular SDK — Firestore, Auth, Storage, Messaging (PWA via `next-pwa`)
- **Tailwind CSS** with design tokens (`tailwind.config.ts`); `lucide-react`; Recharts
- **i18n**: `react-i18next`, locales in `src/lib/i18n/locales/{en,ro}.json`
- **Deployment**: `next build` on a Node.js server (NOT static export); FTP ships `.next` + `public`
- **Providers (root)**: `Confirm > Toast > Auth > ParentAuth > Notification` — `src/app/layout.tsx`
- **Providers (dashboard)**: `Data > EventModal > CommandPalette` — `src/app/(dashboard)/layout.tsx`

## Essential Commands
| Command | Purpose |
|---|---|
| `npm run dev` / `start` / `lint` | Dev server (:3000) / serve built app / ESLint |
| `npm run build` | Production build |
| `npm run build:demo` / `build:prod` | Build with `.env.demo` / `.env.live` |
| `npx tsc --noEmit` | Type check |
| `firebase deploy --only firestore:rules` / `storage:rules` | Deploy security / storage rules |

## Directory Map
```
src/
  app/              (dashboard)/* staff routes · parent/* parent portal · api auth login reports seed · layout.tsx
  components/       domain folders + ui/ CommandPalette/ evaluations/
  context/          Auth ParentAuth Data Notification EventModal CommandPalette Toast Confirm
  hooks/            useCollections useActivities useAnalyticsData useEvaluations useVBMAPP usePortage useCarolina useCARS useChat useClient useClientDocuments useSessionVideos useConnectivity useAnyAuth + audio/video/voice
  lib/              firebase activityService notificationService billing ageUtils calendarUtils clinicalInterpretation goalGenerator invoiceGenerator objectiveUtils progressUtils callFunction i18n/
  types/            Shared TypeScript types
firestore.rules · storage.rules · firestore.indexes.json · next.config.js
```

## Conventions (non-negotiable)
- Never hardcode user-facing strings — always `t('key')` with matching `en.json` + `ro.json` entries
- All Firebase code in `"use client"` components; no server-side Firebase
- Prefer `onSnapshot` over one-shot `getDocs`; return `unsubscribe` from every `useEffect`
- Every create/update/delete calls `logActivity(...)` (`src/lib/activityService.ts`)
- New collections require rules in `firestore.rules` (default-deny, explicit allow)
- Use `serverTimestamp()` for new Firestore timestamps
- Touch targets ≥44×44; verify at 375px, in dark mode, and in Romanian
- Commit format: `<type>(<scope>): <description>` + `Co-Authored-By` trailer

## Agents & Orchestration
Team modeled as specialist agents in `.claude/agents/`. The **orchestrator** routes every prompt automatically — the user does NOT name agents. Roster: `robert` (PM), `marcus` (lead dev), `sofia` (UX research), `kai` (UI design), `corina` (clinical/BCBA), `alex` (QA). See `.claude/agents/orchestrator.md` for routing rules and the test → fix → verify → commit loop.

## Reference Documents
**Current** — `documentation/`: `Tempo technical documentation.md` (§27 Mira, §28 tenancy) · `ProjectOverview.md` · `Project roadmap.md` · `new-tenant-runbook.md` (onboarding a clinic) · `AI_CORE_CONTEXT.md`

**Tenancy** — all clinics share one Firebase project and one Vercel project, split by a Firestore database and Storage bucket derived from the hostname (`src/lib/tenant.ts`). Design: `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md`. What was actually done, and what remains: `docs/cutover-runbook.md`.

**Archived** — `documentation/archive/` (see `ARCHIVE-INDEX.md`): every file there carries a stale banner. Includes `bugreport.md` (61 catalogued bugs) and `activity-integration-guide.md`, which are still useful, plus `multi-tenant-implementation-plan.md` and `INSTALL PLATFORM.md`, which describe infrastructure that no longer exists. Treat all of it as historical — verify against the code before relying on it.
