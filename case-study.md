# TempoApp — Therapy Center Management Platform

## Case Study

---

### The Client

A Romanian therapy center specializing in ABA (Applied Behavior Analysis) and speech therapy for children with Autism, ADHD, and other special needs. The center employs therapists, coordinators, and administrators who manage dozens of active clients, and communicates daily with parents who want to stay informed about their child's progress.

---

### The Problem

The center was running its entire operation on spreadsheets, WhatsApp groups, and paper forms. This created friction at every level:

**For therapists**, administrative work was eating into therapy time. After each session, they had to manually log attendance, write notes, and score evaluations on paper. Evaluation protocols like ABLLS-R have over 500 individual items across 25 categories — scoring these by hand was slow, error-prone, and made it nearly impossible to track progress over time.

**For coordinators**, there was no centralized view of what was happening. Schedules lived in shared calendars that weren't linked to client records. Caseload distribution was managed by feel, not data. When a therapist called in sick, rescheduling meant a chain of phone calls and messages.

**For administrators**, billing was a monthly headache. Invoices were calculated manually from attendance records that lived in a different system than the schedule. Discrepancies were common. Therapist payouts required cross-referencing hours across multiple spreadsheets.

**For parents**, visibility into their child's therapy was limited to periodic meetings. Between those meetings, parents had no way to see what happened in sessions, whether homework was assigned, or how their child was progressing on specific goals. Communication happened through WhatsApp, where messages about their child were mixed in with group chats and personal conversations.

---

### The Solution

I designed and built **TempoApp** — a unified platform that digitizes the center's entire clinical workflow, from scheduling to evaluation to billing to parent communication.

The platform is split into two purpose-built portals:

**The Staff Dashboard** gives therapists, coordinators, and administrators a shared operational hub. Scheduling, client management, evaluations, billing, team coordination, analytics, and messaging all live in one place. Data updates in real time across all users — when a therapist marks a child as present, the coordinator's dashboard reflects it instantly.

**The Parent Portal** gives families a simple, focused window into their child's therapy. Parents log in with an access code (no account creation needed) and can see session summaries, progress charts, homework assignments, invoices, and messages from their child's therapy team.

---

### What We Fixed

#### Paper evaluations → Digital scoring with progress tracking

The center uses five standardized evaluation protocols (ABLLS-R, VB-MAPP, Portage, CARS, Carolina), each with its own scoring methodology. I built guided wizard interfaces for each one, allowing therapists to score items directly during or after sessions. Scores auto-save, so no work is lost if a session runs long.

More importantly, the system now tracks evaluations over time. Coordinators can pull up a child's evaluation history and see exactly which skills have improved, which have plateaued, and which need attention — with radar charts and side-by-side comparisons that make patterns immediately visible. Comparison works across all five protocols, so a child assessed with VB-MAPP last spring and Portage this autumn still produces a coherent progress picture. PDF reports are generated automatically for parent meetings and insurance documentation.

One detail took several iterations to get right. ABLLS-R is criterion-referenced, not age-normed — it lists skills a child may not be developmentally ready for yet. Early on, the system reported a four-year-old's unscored reading and maths sections as deficits, which is both clinically wrong and alarming for a parent reading the report. Scoring is now age-aware: sections a child isn't old enough for are marked as not-yet-expected rather than counted as gaps, and they're excluded from the percentage entirely.

I worked directly with the center's clinical director (a Board Certified Behavior Analyst) throughout development to ensure every scoring interface matches the official protocols exactly. The ABLLS-R and VB-MAPP item banks were rebuilt from the official Romanian source documents rather than translated informally. Clinical accuracy was non-negotiable.

#### Disconnected tools → One operational hub

Scheduling, client records, attendance, and billing were previously scattered across different tools with no connection between them. Now they're all linked. A session on the calendar is connected to a client profile, a therapist assignment, specific intervention programs, attendance records, session scores, and billing line items.

This means a coordinator can see, from a single screen: who's scheduled today, who showed up, what programs were worked on, and how that rolls into this month's invoice. No more cross-referencing spreadsheets.

#### Manual billing → Automated invoicing

Invoices are now generated automatically from session attendance data. The system aggregates completed sessions by client and service type, applies the correct rates, handles pro-rated months, and produces invoice line items ready for review. Integration with SmartBill (Romania's leading invoicing platform) syncs approved invoices to the center's accounting system.

Therapist payouts are calculated the same way — hours worked, rates applied, bonuses and deductions factored in. What used to take a full day of spreadsheet work now takes minutes of review.

#### Parent anxiety → Real-time transparency

Parents no longer wait weeks to learn how their child is doing. The Parent Portal shows:

- **Latest session summaries** — what was worked on, how the child performed
- **Progress tracking** — success rates and trends for each intervention program
- **Evaluation results** — scores broken down by category with visual progress indicators
- **Homework** — active assignments with completion tracking
- **Billing** — outstanding invoices and payment history
- **Direct messaging** — private conversations with the therapy team, separate from personal messaging apps

Parents access all of this through a simple code-based login. No email, no password, no account setup. The center generates an access code for each family, and that's all they need.

Making that simple for parents without making it weak took some care. Codes resolve through a dedicated lookup that allows fetching a code you already know but forbids listing them, so the set of valid codes can't be enumerated. Failed attempts are rate-limited, and a parent session signs itself out after 30 minutes idle — these are shared family devices, and a portal left open on a kitchen tablet shouldn't stay open all day.

#### WhatsApp chaos → Structured communication

Team and parent communication moved from WhatsApp groups (where messages got buried and context was lost) to in-app messaging linked to specific clients. Conversations are threaded, searchable, and archived. Read receipts let coordinators know when parents have seen important updates. Push notifications ensure nothing is missed.

#### "You had to be there" → Voice notes and session video

Some of what happens in a session doesn't survive being written down. A first spontaneous request, the exact prompt that finally worked, the way a child reacted to a new activity — a therapist can spend ten minutes writing that up badly, or fifteen seconds saying it out loud.

Therapists can now record a short voice note or a video clip directly from the session panel, on the same phone they already have in the room. Each clip is attached to the session it came from, and each one carries an explicit share-with-parent toggle. Nothing reaches a family until someone decides it should — enforced in the database rules, not just hidden in the interface.

For parents, this is the part that changed the relationship with therapy most. Instead of reading that their child "made progress on manding", they hear their therapist explain it, or watch the thirty seconds where it happened.

#### Clinical data without interpretation → An assistant that reads the record

The platform accumulated a lot of structured data — scores, attendance, evaluation histories, objectives — and reading it still took a trained clinician and real time.

I built **Mira**, a clinical assistant powered by Claude, into the staff side of the platform. Staff can ask about a specific child in plain language and get answers grounded in that child's actual record: how they've moved across evaluations, where the scores suggest focusing next, what the session history shows. Mira also generates structured insights on completed evaluations — a summary, relative strengths, and suggested focus areas — which the therapist reviews rather than writes from scratch.

Three constraints shaped how it was built:

- **It supports clinical judgment, it doesn't replace it.** Mira frames suggestions as options and makes no diagnostic claims. A BCBA remains the decision-maker.
- **Data minimisation is enforced server-side.** Children reach the model as initials and an age in months. Names, birth dates, phone numbers and email addresses are never sent — not as policy, but because the code that assembles the request cannot include them.
- **Access is gated and accounted for.** Only authenticated staff can reach it, each user records explicit consent before any data leaves the platform, usage is rate-limited per person per day, and every prompt's token cost is recorded so the center can see exactly what the feature costs.

#### No visibility → Full audit trail and analytics

Every user action in the platform is logged — sessions created, evaluations completed, clients added, invoices generated. This gives administrators a complete activity feed showing who did what and when.

Analytics dashboards surface operational metrics: session volume over time, attendance trends, revenue breakdowns by service type, therapist utilization rates, and goal achievement across the client base. For the first time, the center has data-driven visibility into its own operations.

---

### Key Design Decisions

**App-first experience.** The platform feels like a native app, not a website. It's a Progressive Web App (PWA) that can be installed on phones and tablets, works offline, and sends push notifications. Transitions are smooth, updates are instant, and the interface is optimized for touch on mobile devices.

**Bilingual from day one.** Every screen works fully in both English and Romanian. The center operates in Romania but collaborates with international partners, so both languages needed first-class support. The interface adapts to text length differences between languages automatically.

**Role-based access.** Four staff roles (Superadmin, Admin, Coordinator, Therapist) each see exactly what they need — no more, no less. Security rules enforce data access at the database level, not just the UI. Parents can only see data related to their own child.

**Real-time everything.** The entire platform runs on real-time data sync. There's no "refresh to see changes" anywhere. When one user makes a change, every other user sees it immediately. This is critical in a clinical environment where coordinators, therapists, and parents all need to stay in sync.

**Privacy designed in, not bolted on.** This platform holds health data about children, which sets the bar high. Parents see only their own child. Therapists see only their assigned caseload. Documents, voice notes and video clips are invisible to families until someone explicitly shares them, enforced by database rules rather than interface logic. And when AI entered the product, the same standard applied: identifying details are stripped before any request leaves the server, so the feature is limited by construction rather than by policy.

---

### Results

- **Evaluation time reduced significantly** — therapists score digitally during sessions instead of transcribing paper forms afterward
- **Billing errors eliminated** — invoices are calculated from actual session data, removing manual math
- **Parent engagement increased** — families check the portal regularly instead of waiting for quarterly meetings
- **Team communication centralized** — all clinical conversations happen in context, linked to the right client
- **Session detail captured in the moment** — voice notes and video clips replace write-ups attempted from memory hours later
- **Clinical interpretation available on demand** — evaluation insights and record-grounded answers that a therapist reviews and edits, instead of drafting from a blank page
- **Operational visibility unlocked** — administrators can now make data-driven decisions about scheduling, staffing, and service allocation
- **Complete audit trail** — every action is logged for compliance and accountability

---

### Tech Stack

Next.js 14 · TypeScript · Firebase (Firestore, Auth, Storage, Cloud Messaging, Cloud Functions) · Anthropic Claude API · Tailwind CSS · Recharts · react-i18next · MediaRecorder API · SmartBill API · PWA with offline support

**Scale:** 180+ React components · 18 custom hooks · 9 context providers · 20+ database collections · 5 clinical evaluation protocols · 2,100+ translation keys · 2 languages · 5 user roles
