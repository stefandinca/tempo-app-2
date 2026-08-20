# TempoApp — Project Roadmap

> **210 commits** | **2026-02-01 – 2026-08-19** | **Production-ready** | **Next.js 14 + Firebase v10 on Vercel**

---

# Development Timeline

## Phase 0 — Foundation & MVP

> **Feb 1, 2026** | 14 commits

The project kicked off with a rapid build-out of core infrastructure and essential features.

**What was built:**

- [x]  Next.js 14 project scaffolding with App Router
- [x]  Firebase v10 integration (Auth, Firestore, Storage)
- [x]  Static build configuration and deployment setup
- [x]  **Client Management** — Full CRUD for therapy clients (profiles, diagnosis, contact info)
- [x]  **Services Page** — Define therapy service types with pricing
- [x]  **Programs** — Client-specific therapy programs
- [x]  **Role-Based Access Control** — Superadmin, Admin, Coordinator, Therapist roles
- [x]  **Parent Portal (Scaffold)** — Anonymous auth with access codes, basic portal structure
- [x]  **Billing System (v1)** — Invoice generation and payout calculations

**Key decisions made:**

- Client-side Firebase only (no server-side Admin SDK in Next.js)
- Real-time `onSnapshot` listeners as the default data fetching pattern
- React Context for state management over Redux/Zustand
- Anonymous Firebase Auth for parent portal access

---

## Phase 1 — Core Platform Features

> **Feb 2–3, 2026** | 16 commits

Notification system, analytics, and parent-facing features brought the platform to functional completeness.

**What was built:**

- [x]  **Notification System** — Real-time in-app notifications with Firestore listeners
- [x]  **Push Notifications** — Firebase Cloud Messaging (FCM) with service worker for background delivery
- [x]  **Parent Notifications** — Dedicated notification pipeline for parent portal
- [x]  **Program Scores for Parents** — Parents can view session scoring data
- [x]  **Recurring Events** — Calendar events with configurable recurrence
- [x]  **Search Bar** — Global search functionality
- [x]  **Analytics Page** — KPI dashboard with chart visualizations (Recharts)
- [x]  Performance optimization pass
- [x]  UI polish and clickable notification names

---

## Phase 2 — Communication, Evaluations & Alpha Launch

> **Feb 4–5, 2026** | 8 commits

The messaging system and first evaluation protocol were added, culminating in the **Alpha Launch**.

**What was built:**

- [x]  **Internal Messaging** — Thread-based real-time chat between staff members
- [x]  **Command Palette** — Cmd+K global search with quick actions
- [x]  **ABLLS-R Evaluations** — First clinical evaluation protocol (20 categories, 0–4 scoring)
- [x]  **Progress Reports** — Report generation from evaluation data
- [x]  **Parent-Clinic Messaging** — Two-way communication between parents and therapy team
- [x]  **Role-Based Schedule** — Restrict "Today's Schedule" dashboard widget by user role

> **Alpha Launch — Feb 5, 2026**
> First deployment to real users for internal testing.

---

## Phase 3 — Integrations, Offline Mode & Bug Fixes

> **Feb 6–7, 2026** | 12 commits

External billing integration, offline support, and a comprehensive bug fix pass.

**What was built:**

- [x]  **SmartBill Integration** — Romanian invoicing platform API (eFactura compliance)
- [x]  **Offline Mode** — Service worker caching with Workbox, connectivity detection
- [x]  **Performance Optimization** — Memoization, lazy loading, bundle size reduction (~320KB first load)
- [x]  **Programs Management UI** — Full CRUD interface for therapy programs
- [x]  **Loading Skeletons** — Preloader, navigation progress bar, page loading states
- [x]  **Translation System** — react-i18next with EN + RO locale files
- [x]  **Parent Portal Redesign** — Complete UI overhaul of parent-facing pages

**Phase 1 Bug Fixes (Critical — All Resolved):**

- [x]  Firestore security rules hardened
- [x]  Storage security rules hardened
- [x]  SmartBill API integration fixed
- [x]  Billing validation corrected
- [x]  Analytics fake/mock data removed
- [x]  CreatePlanModal bugs fixed

---

## Phase 4 — Clinical Evaluation Expansion

> **Feb 8–9, 2026** | 38 commits (largest phase)

Massive expansion of clinical evaluation capabilities — 4 new evaluation protocols added in a single sprint.

**What was built:**

- [x]  **Portage Evaluation** — 5 developmental domains, binary scoring, developmental age tracking
- [x]  **CARS Evaluation** — 15-item Childhood Autism Rating Scale with severity classification
- [x]  **Carolina Curriculum** — 5 developmental domains with A/D/M scoring
- [x]  **Evaluation Hub UI** — Unified evaluation management interface in client profiles
- [x]  **Client Subscriptions** — Subscription-based billing model alongside session-based
- [x]  **Advanced Invoicing** — Enhanced invoice actions and status management
- [x]  **Parent Dashboard Enhancements** — Firestore indexes, improved data display
- [x]  **Custom UI Modals** — Replaced browser `alert()` and `confirm()` with branded modals
- [x]  **Dashboard Attendance Buttons** — Quick attendance tracking from dashboard
- [x]  **Unsaved Changes Warning** — Prevent accidental data loss in event editing

**Localization (all evaluation systems):**

- [x]  Portage — Full EN + RO translations
- [x]  CARS — Full EN + RO translations with official documentation text
- [x]  Carolina — Full EN + RO translations
- [x]  Calendar, analytics, billing, chat — Localized labels and date formatting

---

## Phase 5 — Mobile Optimization & Polish

> **Feb 10–14, 2026** | 24 commits

Comprehensive mobile UX pass, billing enhancements, and the help system.

**What was built:**

- [x]  **Multi-Legal Entity Billing** — Support for centers with multiple companies
- [x]  **Account Limits Configuration** — Max clients, max team members settings
- [x]  **Homework System** — Therapist assignment management + parent completion tracking
- [x]  **Help & Documentation** — Searchable, categorized, localized in-app help system
- [x]  **Mobile Calendar Optimization** — Agenda view, client list, parent portal UX improvements
- [x]  **Responsive Billing** — Card layouts replacing dense tables on mobile
- [x]  **Mobile Dashboard KPIs** — Optimized layout for small screens
- [x]  **Mobile Evaluation Wizards** — Shared mobile components, touch-friendly scoring UI
- [x]  **i18n Global Audit** — Complete pass replacing all remaining hardcoded text

---

## Phase 6 — Activity System & Audit Trail

> **Feb 15, 2026** | 16 commits

Complete activity logging and audit trail infrastructure.

**What was built:**

- [x]  **Activity Tracking Core** — `logActivity()` service with typed activity events
- [x]  **Activity Feed UI** — Real-time dashboard widget + dedicated activity page with category filters
- [x]  **Activity Translations** — Full EN + RO translations for all activity types
- [x]  **Firestore Security Rules** — Activities collection (immutable, create-only)
- [x]  **Logging Integration** — Session, attendance, client, team, and evaluation actions all logged
- [x]  **Chat Improvements** — Deterministic thread IDs, conversation archiving
- [x]  **Auth Normalization** — Consistent role formatting across the platform
- [x]  **Parent Portal i18n** — Comprehensive localization audit and fixes

---

## Phase 7 — Refinement & Cloud Functions

> **Feb 23–28, 2026** | 15 commits

Final polish, Cloud Functions, and quality-of-life improvements.

**What was built:**

- [x]  **Cloud Functions** — Team member onboarding (`createTeamMember`), migration support (`migrateTeamMember`)
- [x]  **Objectives Management** — Intervention plan objectives with status tracking
- [x]  **Fixed Session Pricing** — Per-client fixed pricing alongside hourly rates
- [x]  **Monthly Report Filtering** — Billing reports filterable by month
- [x]  **Calendar Optimization** — Fetch events by visible date range (not fixed limit)
- [x]  **Long-Press Score Buttons** — Auto-decrement on long press for faster scoring
- [x]  **Video Tutorials** — Help page section with embedded video guides
- [x]  **Demo Mode** — Separate Firebase project for testing without affecting production
- [x]  **Progress Utils Refactor** — Shared utilities for progress calculation

---

## Phase 8 — Session Media, Chat Hardening & Parent Auth (Post-Launch)

> **Mar–Jun 2026**

**What was built:**

- [x]  **Voice Feedback** — Record/play/share/delete audio notes per session (`useVoiceFeedback`, `useAudioRecorder`), parent playback, rules, notifications (spec: `documentation/archive/voice-feedback.md`)
- [x]  **Session Videos** — Record/play/share/delete video clips per session (`useSessionVideos`, `useMediaRecorder`), parent playback, rules, notifications (spec: `documentation/archive/video-recording.md`)
- [x]  **Chat fixes** — Deterministic thread IDs (no duplicates), `senderRole`-based message attribution (survives parent re-login), persistent parent archiving, archived threads view with unarchive
- [x]  **Parent auth rework** — Login via `/client_codes/{CODE}` lookup collection (get-only, enumeration forbidden); fixed permission errors, double-login, stale-UID duplicate notifications; 30-min idle auto sign-out
- [x]  **Parent portal redesign** — Restructured navigation, redesigned dashboard/profile, intervention plan removed from profile, dashboard shows every session from the latest session day
- [x]  **Notifications** — Read status persists with optimistic updates
- [x]  **Packaging** — tar bundling for cPanel deployment *(removed Aug 2026 when hosting consolidated on Vercel)*

---

## Phase 9 — AI Assistant, Evaluation Rebuild & Tenancy Prep

> **Jun–Aug 2026**

**What was built:**

- [x]  **Mira, the clinical assistant** — staff-only chat powered by Claude, grounded in real client data via server-side tools (`find_clients`, `get_client_details`). Consent gate, staff-role check and a 100-call/user/day limit in `src/lib/assistant/gate.ts`
- [x]  **AI evaluation insights** — structured summary / strengths / focus areas on completed evaluations, reviewed by the therapist rather than authored by them
- [x]  **GDPR data minimisation** — client data reaches the model pseudonymised (initials, age in months); names, birth dates, phone numbers and e-mail addresses never leave the server
- [x]  **AI cost accounting** — per-prompt token usage and USD cost persisted, with a Superadmin `/ai-usage` view
- [x]  **Evaluation comparison across all 5 protocols** with an instrument picker
- [x]  **Age-aware ABLLS-R scoring** — sections above a child's developmental level are marked not-yet-expected instead of counted as deficits
- [x]  **ABLLS-R + VB-MAPP rebuilt** from the official Romanian source documents (25 categories, 536 items)
- [x]  **Demo data seeder** (`scripts/seed-demo-data.mjs`) — a year of realistic Romanian clinical data in the demo project for screenshots
- [x]  **Tenancy prep** — explicit tenant selection for dev/build (`scripts/tenant-env.mjs`), new-tenant bootstrap (`scripts/bootstrap-tenant.mjs`), and `new-tenant-runbook.md`

---

# Current State — August 2026

## Tenants

| Clinic | Hostname | Database | Status |
| --- | --- | --- | --- |
| Live Better Life | `livebetterlife.tempoapp.ro` | `clinic-livebetterlife` | Production |
| Diaconu Maria | `diaconumaria.tempoapp.ro` | `clinic-diaconumaria` | Production |
| Demo | `demo.tempoapp.ro` | `clinic-demo` | Sales/demo, seeded |

**Multi-database model, live since 20 Aug 2026.** One Firebase project
(`tempo-app-2`) and one Vercel project serve every clinic, separated by a
Firestore database and a Storage bucket derived from the hostname. Adding a
clinic is a database, a bucket, a registry entry and a DNS record — no new
project of either kind. See `new-tenant-runbook.md` and §28 of the technical
documentation.

The silo model (a Firebase and Vercel project per clinic) and the bridge model
that was to replace it are both retired; the plan for the latter is in
`documentation/archive/`. The cPanel/Passenger path is long retired.

## What's Live

| Area | Status | Notes |
| --- | --- | --- |
| Staff Dashboard (13 pages) | Production | All pages functional with real-time data |
| Parent Portal (9 pages) | Production | Anonymous auth + access codes |
| 5 Evaluation Protocols | Production | ABLLS-R, VB-MAPP, Portage, CARS, Carolina |
| Billing + SmartBill | Production | Invoices, payouts, expenses, SmartBill sync |
| Calendar & Scheduling | Production | 4 views, recurring events, attendance, scoring |
| Messaging | Production | Real-time threads, staff + parent communication |
| Notifications | Production | In-app + push (FCM) |
| Activity Logging | Production | Immutable audit trail for all actions |
| Analytics | Production | 6 chart types + KPI cards |
| i18n (EN + RO) | Production | 2,000+ translation keys |
| PWA | Production | Installable, offline-capable |
| Cloud Functions | Production | Team onboarding, push delivery |
| Help System | Production | Searchable docs + video tutorials |
| Voice Feedback | Production | Per-session audio notes, parent sharing |
| Session Videos | Production | Per-session video clips, parent sharing |

## Platform Stats

| Metric | Value |
| --- | --- |
| Total commits | 210 |
| Development period | Feb 2026 – Aug 2026 |
| React components | 180+ |
| Custom hooks | 18 |
| Context providers | 9 |
| Translation keys | 2,000+ |
| Firestore collections | 21 top-level + 11 subcollections |
| API routes | 6 (incl. 3 AI routes) |
| Cloud Functions | 3 |
| Known bugs catalogued | 61 |
| Phase 1 bugs resolved | All critical |

---

# Active Backlog — Short Term

> Improvements identified from the UX review and bug audit. Organized by priority.

## Immediate Wins (1–2 days each)

| Item | Impact | Status |
| --- | --- | --- |
| Fix hardcoded dashboard metrics (attendance %, trends) | Critical — data integrity | To do |
| Increase touch targets to 44x44px minimum | Accessibility compliance | To do |
| Add focus ring indicators on interactive elements | Keyboard navigation | To do |
| Add inline form validation (error text below fields) | UX — form usability | To do |
| Persist client profile tab state via URL params | UX — navigation | To do |

## Short-Term (1–2 weeks)

| Item | Impact | Status |
| --- | --- | --- |
| Field-level validation highlighting (red borders) | UX — error clarity | To do |
| Modal focus trap implementation (`focus-trap-react`) | Accessibility | To do |
| Swipeable tabs on mobile billing page | Mobile UX | To do |
| Add "Last updated" timestamps on data cards | Data freshness awareness | To do |
| Persist calendar filters (URL or localStorage) | UX — navigation | To do |
| ARIA attributes for form validation errors | Screen reader support | To do |
| Memoize context provider values (`useMemo`) | Performance | To do |

## Medium-Term (2–4 weeks)

| Item | Impact | Status |
| --- | --- | --- |
| Refactor client profile tabs (8 → 5 grouped) | UX — cognitive load | To do |
| Drag-and-drop calendar rescheduling | UX — modern calendar UX | To do |
| Migrate to dynamic routes `/clients/[id]` | URL semantics | To do |
| Evaluation comparison view (side-by-side over time) | Clinical value | To do |
| Message search across all threads | Communication efficiency | To do |
| Mobile 3-day calendar view | Mobile UX | To do |
| Billing summary dashboard cards before tabs | UX — onboarding | To do |
| Standardize timestamps (`serverTimestamp()` everywhere) | Data consistency | To do |
| Resolve NotificationContext circular dependency | Technical debt | To do |

## Lower Priority

| Item | Impact | Status |
| --- | --- | --- |
| Admin onboarding tour | New user experience | To do |
| Breadcrumb navigation component | Navigation clarity | To do |
| File sharing in chat | Communication | To do |
| CSV/PDF export for analytics | Reporting | To do |
| Typing indicators in chat | Chat UX | To do |
| Keyboard navigation guide | Accessibility | To do |
| Migrate `<img>` to Next.js `<Image>` | Performance | To do |
| Comprehensive screen reader audit (NVDA/VoiceOver) | Accessibility | To do |
| Heading hierarchy cleanup (h1 → h2 → h3) | Accessibility | To do |

## Carried over from WORK.md

The scratch list was archived in Aug 2026; these were still open when it was.

| Item | Notes | Status |
| --- | --- | --- |
| Share evaluations with parents | Parents can see evaluation results in the portal, but staff have no explicit per-evaluation share toggle like documents and session media have | To do |
| System popups not firing | Logged in WORK.md as `[BUGGY] no system popups` — needs reproducing before it can be scoped | To do |
| Carolina Curriculum completion | Logged as `[PARTIAL]` — protocol is implemented and scoring works; confirm what remains against the source | To do |
| Logopedics evaluation protocol | A speech-therapy assessment was wanted alongside the five existing protocols; never started | To do |
| Recent activity | Listed unqualified in WORK.md; the activity feed ships, so confirm whether anything is actually outstanding | To triage |

---

# Future Features — v3

## AI Therapy Assistant

> ✅ **v1 SHIPPED as "Mira"** (see Phase 9). Staff-facing chat grounded in real client data, plus structured AI insights on completed evaluations, are live. Everything parent-facing and the scheduling/caseload work below remain future.

> An AI-powered agent integrated into the platform to assist therapists, coordinators, and parents with clinical insights, documentation, and recommendations.

**Shipped in v1:** staff chat with tool-based lookup of real client records (`find_clients`, `get_client_details`), structured evaluation insights (summary, strengths, focus areas), consent gate, per-user daily rate limit, and per-prompt cost tracking on `/ai-usage`.

**Not built yet:** session note generation, anomaly detection, caseload insights, smart scheduling, and everything parent-facing.

### Planned Capabilities

**For Therapists:**

- **Session Note Generation** — AI drafts session notes from program scores and attendance data. Therapists review and approve rather than writing from scratch.
- **Goal Recommendations** — Based on evaluation results, the AI suggests specific, measurable intervention goals aligned with the child's profile and clinical protocols (ABLLS-R, VB-MAPP, etc.).
- **Progress Summaries** — Weekly or monthly auto-generated progress narratives per client, pulling data from session scores, evaluation history, and objective completion.
- **Anomaly Detection** — Flag unexpected patterns: sudden score drops, missed sessions, declining trends across programs.

**For Coordinators & Admins:**

- **Caseload Insights** — AI-powered overview of therapist workloads, client distribution imbalances, and scheduling gaps.
- **Report Generation** — Natural language summaries for parent meetings, insurance documentation, or compliance audits.
- **Smart Scheduling Suggestions** — Recommend optimal session times based on therapist availability, client history, and session spacing best practices.

**For Parents:**

- **Plain-Language Summaries** — Translate clinical data into easy-to-understand progress updates. Instead of "VB-MAPP Level 2 Mand score: 8/10", show "Your child is asking for things they want in most situations — great progress!"
- **Home Activity Suggestions** — AI recommends activities parents can do at home based on current therapy goals and evaluation data.
- **Q&A Assistant** — Parents can ask questions about their child's therapy plan and get clear, non-clinical explanations.

### Technical Approach

*As built — this table described the intent; the shipped implementation differs where noted.*

| Component | Technology | As built |
| --- | --- | --- |
| LLM Backend | Claude API (Anthropic) | ✅ Next.js API routes (`/api/assistant/*`), server-only SDK |
| Context Window | Client profile + evaluations + recent sessions | ✅ Assembled per request by server-side tools |
| Output Format | Structured JSON → rendered in UI | ⚠️ Chat is streaming Markdown; only evaluation insights are structured JSON |
| Access Control | Role-based | ✅ Staff only — Mira is never exposed to parents |
| Data Privacy | No client data sent without consent | ✅ Consent gate (`CONSENT_VERSION`) **plus** server-side pseudonymisation — initials and age in months only, no names, contact details or birth dates |
| Cost Control | Caching + rate limiting per user/day | ✅ 100 calls/user/day, prompt caching, per-prompt cost recorded |

### Implementation Phases

| Phase | Scope | Status |
| --- | --- | --- |
| AI Phase 1 | Staff chat + evaluation insights (therapist/coordinator/admin) | ✅ Shipped |
| AI Phase 2 | Session note drafting, progress summaries, anomaly detection | To do |
| AI Phase 3 | Parent-facing summaries + home activity suggestions | To do — needs a separate privacy review before any parent-facing AI |
| AI Phase 4 | Smart scheduling + caseload insights + Q&A assistant | To do |

---

## Video Recording & Session Documentation

> ✅ **v1 SHIPPED** (see Phase 8 and `documentation/archive/video-recording.md`). Basic recording, playback, parent sharing, and storage limits are live. Remaining items below (compression, bookmarks, comparison viewer) are still future work.

> Enable therapists to record therapy sessions directly within the platform for review, training, and parent sharing.

### Planned Capabilities

**Recording:**

- **In-Session Video Capture** — Record therapy sessions using the device camera (tablet or phone) directly from the calendar event detail panel
- **Auto-Tagging** — Videos automatically tagged with client name, therapist, date, programs covered, and session type
- **Duration Limits** — Configurable per-session recording limits to manage storage costs
- **Recording Indicators** — Clear visual indicators when recording is active (privacy compliance)

**Storage & Management:**

- **Cloud Storage** — Videos uploaded to Firebase Storage with client-scoped access paths (`/clients/{id}/videos/{videoId}`)
- **Thumbnail Generation** — Auto-generated thumbnails for video library browsing
- **Compression** — Client-side compression before upload to reduce bandwidth and storage costs
- **Storage Quotas** — Per-center storage limits with usage monitoring

**Review & Sharing:**

- **Video Library** — New tab in client profile for browsing session recordings chronologically
- **Playback Controls** — Standard video player with speed control (0.5x, 1x, 1.5x, 2x) for review
- **Timestamp Bookmarks** — Mark specific moments in a recording for discussion or training
- **Parent Sharing** — Share specific recordings with parents through the Parent Portal (opt-in per video)
- **Team Review** — Coordinators and supervisors can review therapist session recordings for training and quality assurance

**Clinical Value:**

- **Behavioral Documentation** — Video evidence for insurance claims and compliance audits
- **Training Tool** — New therapists learn from recordings of experienced team members
- **Parent Engagement** — Parents see real therapy interactions, building trust and understanding
- **Progress Evidence** — Side-by-side video comparison showing child's development over time

### Technical Approach

| Component | Technology | Notes |
| --- | --- | --- |
| Capture | MediaRecorder API (browser-native) | No third-party SDK needed |
| Format | WebM (recording) → MP4 (stored) | Browser-native format + universal playback |
| Storage | Firebase Storage | Client-scoped paths with security rules |
| Streaming | Progressive download or HLS | Based on file size |
| Compression | FFmpeg.wasm (client-side) or Cloud Function | Reduce before upload |
| Thumbnails | Canvas API (client-side) or Cloud Function | Auto-generated at upload |
| Access Control | Firestore metadata doc + Storage security rules | Same RBAC model |

### Implementation Phases

| Phase | Scope | Effort |
| --- | --- | --- |
| Video Phase 1 | Basic recording from event panel + upload to Storage + video library tab | 3–4 weeks |
| Video Phase 2 | Playback with speed controls + thumbnail generation + parent sharing | 2–3 weeks |
| Video Phase 3 | Timestamp bookmarks + team review workflows + storage quotas | 2–3 weeks |
| Video Phase 4 | Compression pipeline + progress comparison viewer | 2–3 weeks |

---

## Audio Feedback & Voice Notes

> ✅ **v1 SHIPPED for therapists** (see Phase 8 and `documentation/archive/voice-feedback.md`). Voice session notes with parent playback are live. Transcription, chat voice messages, parent-recorded feedback, and dictation mode remain future work.

> Allow therapists and parents to leave voice-based feedback, reducing the friction of typing detailed notes — especially on mobile devices during or after sessions.

### Planned Capabilities

**For Therapists:**

- **Voice Session Notes** — Record audio notes during or after a session instead of typing. Especially valuable when hands are busy during therapy.
- **Voice-to-Text Transcription** — Audio automatically transcribed to text for searchability and documentation.
- **Quick Audio Annotations** — Attach a short audio clip to a specific program score, evaluation item, or objective for context.
- **Dictation Mode** — Speak to fill in session notes, evaluation comments, or homework descriptions with live transcription.

**For Parents:**

- **Voice Homework Feedback** — Instead of typing notes about homework completion, parents record a quick voice message describing how the activity went.
- **Audio Messages in Chat** — Send voice messages to therapists through the existing chat system.
- **Voice Progress Updates** — Parents can record observations about their child's behavior at home.

**For Coordinators:**

- **Audio Supervision Notes** — Leave voice feedback on therapist session recordings or evaluation scores.
- **Voice Memos on Client Profiles** — Quick audio notes attached to client records for team context.

### Technical Approach

| Component | Technology | Notes |
| --- | --- | --- |
| Capture | MediaRecorder API (audio only) | Small file sizes, browser-native |
| Format | WebM Opus (recording) → MP3 (stored) | Opus for quality, MP3 for compatibility |
| Storage | Firebase Storage | Scoped paths: `/clients/{id}/audio/`, `/threads/{id}/audio/` |
| Transcription | Web Speech API (browser) or Cloud-based STT | Browser API for free tier, Cloud for accuracy |
| Playback | HTML5 `<audio>` element | Minimal UI: play/pause, speed, waveform |
| Waveform | Web Audio API or `wavesurfer.js` | Visual feedback during recording and playback |
| Max Duration | 5 minutes per clip (configurable) | Prevent storage bloat |

### Implementation Phases

| Phase | Scope | Effort |
| --- | --- | --- |
| Audio Phase 1 | Voice session notes (record + playback + attach to events) | 2–3 weeks |
| Audio Phase 2 | Voice-to-text transcription (browser Speech API) | 1–2 weeks |
| Audio Phase 3 | Audio messages in chat (therapist + parent) | 2 weeks |
| Audio Phase 4 | Parent voice homework feedback + coordinator supervision notes | 2 weeks |
| Audio Phase 5 | Cloud-based transcription upgrade + dictation mode | 2–3 weeks |

---

# Feature Priority Matrix

> Overview of all future features ranked by clinical value, user impact, and implementation effort.

| Feature | Clinical Value | User Impact | Effort | Priority |
| --- | --- | --- | --- | --- |
| **AI — Session Note Drafting** | High | High (saves 15–20 min/day per therapist) | Medium | P1 |
| **AI — Goal Recommendations** | High | High (clinical accuracy) | Medium | P1 |
| **Audio — Voice Session Notes** | High | High (hands-free during sessions) | Low–Medium | ✅ Shipped |
| **AI — Progress Summaries** | High | Medium (coordinator + parent value) | Medium | P2 |
| **Audio — Voice-to-Text** | Medium | High (searchable notes) | Low | P2 |
| **Video — Basic Recording** | High | Medium (documentation + training) | High | ✅ Shipped |
| **AI — Parent Summaries** | Medium | High (parent engagement) | Medium | P2 |
| **Audio — Chat Voice Messages** | Low | Medium (convenience) | Low | P3 |
| **Video — Parent Sharing** | Medium | Medium (transparency) | Medium | ✅ Shipped |
| **AI — Smart Scheduling** | Medium | Medium (coordinator efficiency) | High | P3 |
| **Video — Timestamp Bookmarks** | Medium | Low–Medium (training) | Medium | P3 |
| **Audio — Parent Homework Feedback** | Low | Medium (parent engagement) | Low | P3 |
| **Video — Progress Comparison** | High | Low (specialist use) | High | P4 |
| **AI — Q&A Assistant** | Low | Medium (parent convenience) | High | P4 |
| **Audio — Dictation Mode** | Medium | Medium (power users) | Medium | P4 |

---

# Estimated Timeline

| Quarter | Focus | Key Deliverables |
| --- | --- | --- |
| **Q1 2026** (Completed) | Core platform + production launch | All 7 development phases delivered, 143 commits, production deployment |
| **Q2 2026** | UX polish + accessibility + AI Phase 1 | Hardcoded metrics fix, touch targets, inline validation, AI session notes + goal recommendations |
| **Q3 2026** | Audio feedback + AI Phase 2–3 | Voice session notes, transcription, progress summaries, parent-facing AI |
| **Q4 2026** | Video recording + AI Phase 4 | Session recording, video library, smart scheduling, caseload insights |
| **Q1 2027** | Advanced features + scale | Video sharing, compression pipeline, dictation mode, comprehensive accessibility audit |

---

# Success Metrics

| Metric | Current | Target (Q4 2026) |
| --- | --- | --- |
| Therapist session note time | ~15 min/session (manual) | ~3 min/session (AI-assisted) |
| Parent portal engagement | Passive (read-only) | Active (voice feedback, AI summaries) |
| Evaluation-to-goal time | Manual process (~30 min) | AI-suggested (~5 min review) |
| Session documentation completeness | ~70% (notes often skipped) | ~95% (voice notes lower friction) |
| Video-documented sessions | 0% | 30% of sessions recorded |
| Accessibility score (Lighthouse) | ~75 | 90+ |
| Mobile usability score | Good | Excellent (44px targets, focus traps, swipeable) |

---

*Last Updated: June 2026*
