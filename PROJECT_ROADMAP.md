# TempoApp Rebuild - Master Project Schedule
## Project Roadmap & Sprint Plan

**Project Manager:** Senior PM
**Version:** 1.0
**Created:** January 31, 2026
**Target Launch:** April 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [MVP Definition](#2-mvp-definition)
3. [Project Timeline Overview](#3-project-timeline-overview)
4. [Sprint Breakdown](#4-sprint-breakdown)
5. [Dependencies & Risk Matrix](#5-dependencies--risk-matrix)
6. [Resource Allocation](#6-resource-allocation)
7. [Success Criteria](#7-success-criteria)

---

## 1. Executive Summary

### Project Scope

Rebuild TempoApp from a PHP/MySQL/Vanilla JS stack to a modern Firebase/Next.js architecture while implementing UX improvements identified in our audit.

### Team Composition

| Role | Name | Allocation |
|------|------|------------|
| Lead Developer (Firebase) | Marcus | 100% |
| Senior Frontend Developer | TBD | 100% |
| Senior UX Researcher | Sofia | 50% |
| UI Designer | Kai | 75% |
| Senior Project Manager | PM | 25% |
| QA Engineer | TBD | 50% (from Sprint 3) |

### High-Level Timeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ FEBRUARY 2026                          MARCH 2026                   APRIL 2026  │
├────────────┬────────────┬────────────┬────────────┬────────────┬────────────────┤
│  Sprint 0  │  Sprint 1  │  Sprint 2  │  Sprint 3  │  Sprint 4  │   Launch      │
│   1 week   │  2 weeks   │  2 weeks   │  2 weeks   │  2 weeks   │    Week       │
├────────────┼────────────┼────────────┼────────────┼────────────┼────────────────┤
│  Planning  │ Foundation │  Calendar  │  Clients   │  Polish    │  Go-Live      │
│  & Setup   │  & Auth    │  Module    │  & Team    │  & Launch  │               │
└────────────┴────────────┴────────────┴────────────┴────────────┴────────────────┘
     Feb 3-7    Feb 10-21   Feb 24-Mar 7  Mar 10-21   Mar 24-Apr 4    Apr 7
```

---

## 2. MVP Definition

### What IS in MVP (Must Have)

Based on the UX Guide and critical user flows, the MVP must include:

#### Core Authentication
- [x] Email/password login for staff (Admin, Coordinator, Therapist)
- [x] Role-based access control
- [x] Session persistence ("Remember me")
- [ ] ~~OAuth/Social login~~ (Post-MVP)
- [ ] ~~Parent portal authentication~~ (Post-MVP)

#### Calendar Module
- [x] Month, Week, Day view switching
- [x] Event creation with required fields (type, client, therapist, date, time)
- [x] Event editing and deletion
- [x] Recurring event support (basic: repeat weekly)
- [x] Therapist filter chips
- [x] Overlap detection (warning only)
- [ ] ~~Drag-and-drop rescheduling~~ (Post-MVP)
- [ ] ~~Keyboard shortcuts~~ (Post-MVP)

#### Attendance & Scoring
- [x] Quick attendance toggle (Present/Absent/Excused)
- [x] Program score counters (-, 0, P, +)
- [x] Session notes
- [ ] ~~Inline attendance on calendar cards~~ (Post-MVP, requires more testing)

#### Client Management
- [x] Client list with search
- [x] Client profile (basic info, contact, medical)
- [x] Assigned therapist display
- [ ] ~~Evolution tracking~~ (Post-MVP)
- [ ] ~~Intervention plans~~ (Post-MVP)
- [ ] ~~Document uploads~~ (Post-MVP)

#### Team Management
- [x] Team member list
- [x] Role assignment
- [x] Color customization
- [ ] ~~Performance metrics~~ (Post-MVP)

#### Dashboard
- [x] Today's schedule summary
- [x] Quick navigation
- [x] Activity feed (last 10 items)
- [ ] ~~KPI cards with analytics~~ (Post-MVP)
- [ ] ~~Weekly chart~~ (Post-MVP)

#### UI/UX Requirements
- [x] Responsive design (mobile-first)
- [x] Dark/Light theme toggle
- [x] Slide-in panels (not modals) for event details
- [x] Toast notifications
- [x] Loading states (skeleton loaders)
- [ ] ~~Bottom navigation (mobile)~~ (Post-MVP, requires more mobile testing)
- [ ] ~~Command palette~~ (Post-MVP)

### What is NOT in MVP (Post-Launch)

| Feature | Priority | Target Sprint |
|---------|----------|---------------|
| Parent Portal | High | Sprint 5-6 |
| Billing Module | High | Sprint 5-6 |
| Analytics Dashboard | Medium | Sprint 6-7 |
| Offline Mode (PWA) | Medium | Sprint 7-8 |
| Report Generation | Medium | Sprint 6 |
| Push Notifications | Low | Sprint 8+ |
| AI Scheduling | Low | Future |
| Multi-language (i18n) | Low | Future |

### MVP Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < 2 seconds | Lighthouse |
| Time to Log Attendance | < 15 seconds | User testing |
| Mobile Usability Score | > 85/100 | Lighthouse |
| Critical Bug Count | 0 | QA Testing |
| User Acceptance | 80% positive | Staff feedback |

---

## 3. Project Timeline Overview

### Master Schedule Table

| Phase | Sprint | Dates | Focus Area | Key Deliverables | Owner |
|-------|--------|-------|------------|------------------|-------|
| **Planning** | Sprint 0 | Feb 3-7 | Setup & Architecture | Firebase project, Next.js scaffold, CI/CD pipeline | Marcus |
| **Foundation** | Sprint 1 | Feb 10-21 | Auth & Core UI | Login flow, Dashboard shell, Design system in code | Marcus + Kai |
| **Core Features** | Sprint 2 | Feb 24 - Mar 7 | Calendar Module | All 3 views, Event CRUD, Attendance logging | Marcus + Frontend Dev |
| **Core Features** | Sprint 3 | Mar 10-21 | Clients & Team | Client profiles, Team management, Data migration | Frontend Dev + Marcus |
| **Polish** | Sprint 4 | Mar 24 - Apr 4 | Testing & Launch Prep | Bug fixes, Performance, User acceptance testing | All |
| **Launch** | Week 10 | Apr 7-11 | Go-Live | Production deployment, Monitoring, Support | Marcus + PM |

### Critical Path

```
Firebase Setup ──► Auth Implementation ──► Dashboard Shell ──► Calendar Views ──► Event CRUD ──► Client Module ──► UAT ──► Launch
     │                    │                      │                   │               │              │           │
     │                    │                      │                   │               │              │           │
     └── Firestore ───────┴── Security ──────────┴── Components ─────┴── State ──────┴── API ───────┴── QA ─────┘
         Schema              Rules                   Library           Management      Integration     Testing
```

---

## 4. Sprint Breakdown

---

### Sprint 0: Planning & Setup
**Duration:** 1 week (Feb 3-7, 2026)
**Goal:** Establish technical foundation and finalize designs

#### Developer Tasks

| Task | Owner | Est. Hours | Priority | Status |
|------|-------|------------|----------|--------|
| Create Firebase project (Auth, Firestore, Hosting) | Marcus | 2h | P0 | ⬜ |
| Configure Firestore security rules (initial) | Marcus | 4h | P0 | ⬜ |
| Initialize Next.js 14 project with TypeScript | Marcus | 2h | P0 | ⬜ |
| Set up Tailwind CSS with design tokens | Marcus | 3h | P0 | ⬜ |
| Configure ESLint, Prettier, Husky | Marcus | 2h | P1 | ⬜ |
| Set up GitHub repo with branch protection | Marcus | 1h | P0 | ⬜ |
| Configure Vercel deployment (preview + prod) | Marcus | 2h | P0 | ⬜ |
| Create CI/CD pipeline (GitHub Actions) | Marcus | 4h | P1 | ⬜ |
| Document Firestore data schema | Marcus | 4h | P0 | ⬜ |
| Set up development environment guide | Marcus | 2h | P1 | ⬜ |

#### Designer Tasks

| Task | Owner | Est. Hours | Priority | Status |
|------|-------|------------|----------|--------|
| Finalize Figma design system (tokens) | Kai | 8h | P0 | ⬜ |
| Create component library in Figma (buttons, inputs, cards) | Kai | 12h | P0 | ⬜ |
| Design Login screen (desktop + mobile) | Kai | 4h | P0 | ⬜ |
| Design Dashboard layout (desktop + mobile) | Kai | 6h | P0 | ⬜ |
| Review mockups with team | Kai + Sofia | 2h | P0 | ⬜ |
| Export assets and icons | Kai | 2h | P1 | ⬜ |

#### UX Tasks

| Task | Owner | Est. Hours | Priority | Status |
|------|-------|------------|----------|--------|
| Finalize user flow diagrams | Sofia | 4h | P0 | ⬜ |
| Define acceptance criteria for Sprint 1 | Sofia | 3h | P0 | ⬜ |
| Prepare user testing script for login flow | Sofia | 2h | P1 | ⬜ |

#### PM Tasks

| Task | Owner | Est. Hours | Priority | Status |
|------|-------|------------|----------|--------|
| Sprint planning meetings | PM | 4h | P0 | ⬜ |
| Set up Jira/Linear project board | PM | 2h | P0 | ⬜ |
| Establish communication channels (Slack) | PM | 1h | P0 | ⬜ |
| Create risk register | PM | 2h | P1 | ⬜ |
| Schedule stakeholder demo (end of Sprint 1) | PM | 1h | P1 | ⬜ |

#### Sprint 0 Deliverables

- [ ] Firebase project live with Firestore
- [ ] Next.js project deployed to Vercel (skeleton)
- [ ] Figma design system complete
- [ ] Data schema documented
- [ ] CI/CD pipeline operational
- [ ] Sprint 1 backlog groomed

---

### Sprint 1: Foundation & Authentication
**Duration:** 2 weeks (Feb 10-21, 2026)
**Goal:** Implement authentication and core UI shell

#### Developer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Implement Firebase Auth configuration | Marcus | 4h | P0 | Sprint 0 | ⬜ |
| Create login page UI | Frontend Dev | 6h | P0 | Figma designs | ⬜ |
| Implement email/password authentication | Marcus | 8h | P0 | Auth config | ⬜ |
| Create user context and auth hooks | Marcus | 6h | P0 | Auth impl | ⬜ |
| Implement protected routes | Marcus | 4h | P0 | Auth hooks | ⬜ |
| Create users collection in Firestore | Marcus | 4h | P0 | Schema | ⬜ |
| Implement role-based access control | Marcus | 8h | P0 | Users collection | ⬜ |
| Build responsive sidebar component | Frontend Dev | 8h | P0 | Figma designs | ⬜ |
| Build header component with profile dropdown | Frontend Dev | 6h | P0 | Figma designs | ⬜ |
| Build bottom navigation (mobile) | Frontend Dev | 4h | P1 | Sidebar done | ⬜ |
| Create toast notification system | Frontend Dev | 4h | P1 | - | ⬜ |
| Create skeleton loader components | Frontend Dev | 3h | P1 | - | ⬜ |
| Implement theme toggle (dark/light) | Frontend Dev | 4h | P1 | Tailwind setup | ⬜ |
| Build Dashboard layout shell | Frontend Dev | 6h | P0 | Sidebar, Header | ⬜ |
| Create basic KPI card components | Frontend Dev | 4h | P1 | Dashboard layout | ⬜ |
| Set up Zustand store for global state | Marcus | 4h | P0 | - | ⬜ |
| Write unit tests for auth flow | Marcus | 6h | P1 | Auth complete | ⬜ |
| Migrate existing users to Firebase Auth | Marcus | 8h | P0 | Auth complete | ⬜ |

#### Designer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Design Calendar views (Month, Week, Day) | Kai | 16h | P0 | - | ⬜ |
| Design Event detail panel | Kai | 8h | P0 | - | ⬜ |
| Design Event creation form | Kai | 6h | P0 | - | ⬜ |
| Create icon set export | Kai | 2h | P1 | - | ⬜ |
| Design empty states | Kai | 4h | P1 | - | ⬜ |
| Design error states | Kai | 4h | P1 | - | ⬜ |
| Review dev implementation | Kai | 4h | P0 | Dev progress | ⬜ |

#### UX Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Conduct mockup user testing (3 users) | Sofia | 6h | P0 | Mockups | ⬜ |
| Document feedback and prioritize | Sofia | 4h | P0 | Testing done | ⬜ |
| Define acceptance criteria for Sprint 2 | Sofia | 3h | P0 | - | ⬜ |

#### Sprint 1 Milestones

| Milestone | Target Date | Acceptance Criteria |
|-----------|-------------|---------------------|
| Auth Complete | Feb 14 | Users can login, sessions persist, roles enforced |
| UI Shell Complete | Feb 18 | Sidebar, header, theme toggle working |
| Dashboard Shell | Feb 21 | Layout renders, navigation works |
| Sprint Demo | Feb 21 | Stakeholder approval |

#### Sprint 1 Deliverables

- [ ] Working login flow with Firebase Auth
- [ ] Role-based routing (Admin, Coordinator, Therapist)
- [ ] Responsive dashboard shell
- [ ] Theme toggle functional
- [ ] Existing users migrated
- [ ] Calendar designs complete (Figma)
- [ ] User testing report

---

### Sprint 2: Calendar Module
**Duration:** 2 weeks (Feb 24 - Mar 7, 2026)
**Goal:** Implement full calendar functionality

#### Developer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Create events collection schema | Marcus | 4h | P0 | - | ⬜ |
| Create event types collection | Marcus | 2h | P0 | - | ⬜ |
| Build useEvents hook with Firestore | Marcus | 8h | P0 | Schema | ⬜ |
| Build Calendar page layout | Frontend Dev | 4h | P0 | Figma designs | ⬜ |
| Implement Month view grid | Frontend Dev | 12h | P0 | Layout | ⬜ |
| Implement Week view with time grid | Frontend Dev | 16h | P0 | Month view | ⬜ |
| Implement Day view | Frontend Dev | 8h | P0 | Week view | ⬜ |
| Build view switcher component | Frontend Dev | 3h | P0 | Views done | ⬜ |
| Build date navigation (prev/today/next) | Frontend Dev | 4h | P0 | - | ⬜ |
| Build event card component | Frontend Dev | 6h | P0 | Figma designs | ⬜ |
| Position events in time grid | Frontend Dev | 8h | P0 | Event card | ⬜ |
| Handle overlapping events display | Frontend Dev | 6h | P1 | Positioning | ⬜ |
| Build event detail slide-in panel | Frontend Dev | 8h | P0 | Figma designs | ⬜ |
| Build event creation form | Frontend Dev | 8h | P0 | Figma designs | ⬜ |
| Implement event CRUD operations | Marcus | 10h | P0 | Form done | ⬜ |
| Implement recurring event creation | Marcus | 8h | P0 | CRUD done | ⬜ |
| Build attendance toggle buttons | Frontend Dev | 4h | P0 | Panel done | ⬜ |
| Implement attendance save | Marcus | 4h | P0 | Toggle done | ⬜ |
| Build program score counters | Frontend Dev | 6h | P0 | Panel done | ⬜ |
| Implement score save | Marcus | 4h | P0 | Counters done | ⬜ |
| Build therapist filter chips | Frontend Dev | 4h | P0 | - | ⬜ |
| Implement filter logic | Marcus | 4h | P0 | Chips done | ⬜ |
| Implement overlap detection | Marcus | 6h | P1 | Event creation | ⬜ |
| Build filter panel (slide-in) | Frontend Dev | 6h | P1 | - | ⬜ |
| Add current time indicator | Frontend Dev | 2h | P2 | Week view | ⬜ |
| Write integration tests for calendar | Marcus | 8h | P1 | Calendar done | ⬜ |

#### Designer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Design Client list view | Kai | 6h | P0 | - | ⬜ |
| Design Client profile (all tabs) | Kai | 12h | P0 | - | ⬜ |
| Design Team list view | Kai | 4h | P0 | - | ⬜ |
| Design Team member card | Kai | 4h | P0 | - | ⬜ |
| Refine Calendar based on dev review | Kai | 4h | P1 | Dev feedback | ⬜ |
| Design confirmation dialogs | Kai | 3h | P1 | - | ⬜ |

#### UX Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Test calendar flow with 3 therapists | Sofia | 8h | P0 | Calendar working | ⬜ |
| Document usability issues | Sofia | 4h | P0 | Testing done | ⬜ |
| Prioritize fixes for Sprint 3 | Sofia | 2h | P0 | Documentation | ⬜ |

#### Sprint 2 Milestones

| Milestone | Target Date | Acceptance Criteria |
|-----------|-------------|---------------------|
| Calendar Views Complete | Feb 28 | All 3 views render correctly |
| Event CRUD Complete | Mar 3 | Create, edit, delete events works |
| Attendance Logging | Mar 5 | Can log Present/Absent/Excused |
| Sprint Demo | Mar 7 | Stakeholder approval |

#### Sprint 2 Deliverables

- [ ] Full calendar functionality (Month/Week/Day)
- [ ] Event creation with all required fields
- [ ] Event editing and deletion
- [ ] Attendance logging with instant feedback
- [ ] Program score tracking
- [ ] Therapist filtering
- [ ] Client/Team designs complete (Figma)
- [ ] User testing report

---

### Sprint 3: Clients & Team Modules
**Duration:** 2 weeks (Mar 10-21, 2026)
**Goal:** Implement client and team management, begin data migration

#### Developer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Create clients collection schema | Marcus | 4h | P0 | - | ⬜ |
| Create team_members collection schema | Marcus | 3h | P0 | - | ⬜ |
| Build useClients hook | Marcus | 6h | P0 | Schema | ⬜ |
| Build useTeamMembers hook | Marcus | 4h | P0 | Schema | ⬜ |
| Build Client list page | Frontend Dev | 8h | P0 | Figma designs | ⬜ |
| Build Client search and filter | Frontend Dev | 6h | P0 | List page | ⬜ |
| Build Client card component | Frontend Dev | 4h | P0 | Figma designs | ⬜ |
| Build Client profile page (Overview tab) | Frontend Dev | 8h | P0 | Figma designs | ⬜ |
| Implement client CRUD operations | Marcus | 8h | P0 | Profile done | ⬜ |
| Build Team list page | Frontend Dev | 6h | P0 | Figma designs | ⬜ |
| Build Team member card | Frontend Dev | 4h | P0 | Figma designs | ⬜ |
| Build Team member edit panel | Frontend Dev | 6h | P0 | Figma designs | ⬜ |
| Implement team member CRUD | Marcus | 6h | P0 | Panel done | ⬜ |
| Implement color picker for therapists | Frontend Dev | 4h | P1 | Team edit | ⬜ |
| Build archived clients view | Frontend Dev | 4h | P1 | Client list | ⬜ |
| Implement archive/restore functionality | Marcus | 4h | P1 | Archive view | ⬜ |
| Create data migration script | Marcus | 12h | P0 | Schemas done | ⬜ |
| Migrate clients from MySQL | Marcus | 4h | P0 | Script done | ⬜ |
| Migrate team members from MySQL | Marcus | 2h | P0 | Script done | ⬜ |
| Migrate events from MySQL | Marcus | 4h | P0 | Script done | ⬜ |
| Validate migrated data | Marcus | 4h | P0 | Migration done | ⬜ |
| Update events to reference new IDs | Marcus | 6h | P0 | Validation | ⬜ |
| Write E2E tests (Playwright) | Marcus | 8h | P1 | Features done | ⬜ |
| Performance optimization pass | Marcus | 6h | P1 | Features done | ⬜ |

#### Designer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Design loading and error states (full set) | Kai | 6h | P0 | - | ⬜ |
| Design mobile-specific layouts | Kai | 8h | P0 | - | ⬜ |
| Create marketing assets for launch | Kai | 8h | P1 | - | ⬜ |
| Final design QA pass | Kai | 6h | P0 | Dev complete | ⬜ |

#### UX Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Conduct full workflow testing (5 users) | Sofia | 12h | P0 | Features done | ⬜ |
| Create training documentation draft | Sofia | 8h | P1 | Testing done | ⬜ |
| Prioritize launch fixes | Sofia | 4h | P0 | Testing done | ⬜ |

#### QA Tasks (QA Engineer joins)

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Set up test environment | QA | 4h | P0 | - | ⬜ |
| Write test cases for auth flow | QA | 4h | P0 | - | ⬜ |
| Write test cases for calendar | QA | 8h | P0 | - | ⬜ |
| Write test cases for clients | QA | 6h | P0 | - | ⬜ |
| Execute manual test pass | QA | 12h | P0 | Test cases | ⬜ |
| Log and prioritize bugs | QA | 4h | P0 | Test execution | ⬜ |

#### Sprint 3 Milestones

| Milestone | Target Date | Acceptance Criteria |
|-----------|-------------|---------------------|
| Client Module Complete | Mar 14 | List, search, profile working |
| Team Module Complete | Mar 17 | List, edit, colors working |
| Data Migration Complete | Mar 19 | All data in Firebase, validated |
| QA Test Pass | Mar 21 | All P0 bugs resolved |
| Sprint Demo | Mar 21 | Stakeholder approval |

#### Sprint 3 Deliverables

- [ ] Client list with search and filter
- [ ] Client profile with basic info
- [ ] Team member management
- [ ] All data migrated to Firebase
- [ ] E2E test suite
- [ ] QA test report
- [ ] Training documentation draft

---

### Sprint 4: Polish & Launch Preparation
**Duration:** 2 weeks (Mar 24 - Apr 4, 2026)
**Goal:** Bug fixes, performance optimization, and launch readiness

#### Developer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Fix P0 bugs from QA | Marcus + FE | 20h | P0 | Bug list | ⬜ |
| Fix P1 bugs from QA | Marcus + FE | 16h | P1 | P0 done | ⬜ |
| Performance audit (Lighthouse) | Marcus | 4h | P0 | - | ⬜ |
| Optimize bundle size | Marcus | 8h | P0 | Audit | ⬜ |
| Implement lazy loading | Marcus | 4h | P1 | Optimization | ⬜ |
| Add error boundaries | Frontend Dev | 4h | P0 | - | ⬜ |
| Implement global error handling | Marcus | 4h | P0 | - | ⬜ |
| Set up error monitoring (Sentry) | Marcus | 4h | P0 | - | ⬜ |
| Set up analytics (Mixpanel/Amplitude) | Marcus | 4h | P1 | - | ⬜ |
| Configure production Firebase | Marcus | 4h | P0 | - | ⬜ |
| Set up Firebase backup schedule | Marcus | 2h | P0 | Prod config | ⬜ |
| Security audit (rules, inputs) | Marcus | 6h | P0 | - | ⬜ |
| Implement rate limiting | Marcus | 4h | P1 | - | ⬜ |
| Create admin tools (user reset, etc.) | Marcus | 6h | P1 | - | ⬜ |
| Final deployment to production | Marcus | 4h | P0 | All tests pass | ⬜ |
| Configure custom domain | Marcus | 2h | P0 | Deployment | ⬜ |
| SSL certificate verification | Marcus | 1h | P0 | Domain | ⬜ |

#### Designer Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Final UI polish pass | Kai | 8h | P0 | Dev complete | ⬜ |
| Create favicon and app icons | Kai | 2h | P0 | - | ⬜ |
| Design 404 and error pages | Kai | 4h | P1 | - | ⬜ |
| Prepare launch announcement visuals | Kai | 4h | P1 | - | ⬜ |
| Archive Figma files with documentation | Kai | 2h | P1 | - | ⬜ |

#### UX Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Final user acceptance testing (5 users) | Sofia | 10h | P0 | Polish done | ⬜ |
| Finalize training documentation | Sofia | 6h | P0 | UAT done | ⬜ |
| Create quick-start guide | Sofia | 4h | P0 | Documentation | ⬜ |
| Prepare rollback criteria | Sofia | 2h | P0 | - | ⬜ |

#### QA Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Regression testing (full suite) | QA | 16h | P0 | Bug fixes | ⬜ |
| Cross-browser testing | QA | 8h | P0 | Regression | ⬜ |
| Mobile device testing | QA | 8h | P0 | Regression | ⬜ |
| Performance testing | QA | 4h | P0 | Optimization | ⬜ |
| Security testing basics | QA | 4h | P0 | Security audit | ⬜ |
| Sign-off for launch | QA | 2h | P0 | All tests pass | ⬜ |

#### PM Tasks

| Task | Owner | Est. Hours | Priority | Depends On | Status |
|------|-------|------------|----------|------------|--------|
| Create launch checklist | PM | 4h | P0 | - | ⬜ |
| Schedule go-live meeting | PM | 1h | P0 | - | ⬜ |
| Prepare rollback plan | PM | 4h | P0 | - | ⬜ |
| Coordinate with stakeholders | PM | 4h | P0 | - | ⬜ |
| Create post-launch support schedule | PM | 2h | P0 | - | ⬜ |
| Document lessons learned | PM | 4h | P1 | Launch | ⬜ |

#### Sprint 4 Milestones

| Milestone | Target Date | Acceptance Criteria |
|-----------|-------------|---------------------|
| Bug Fix Complete | Mar 28 | All P0 bugs resolved |
| Performance Target Met | Mar 31 | Lighthouse > 85 |
| UAT Signoff | Apr 2 | 80% positive feedback |
| Launch Readiness | Apr 4 | All checklist items green |

#### Sprint 4 Deliverables

- [ ] All P0 bugs fixed
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] UAT signoff obtained
- [ ] Training documentation complete
- [ ] Production environment configured
- [ ] Rollback plan documented
- [ ] Launch checklist complete

---

### Launch Week (Apr 7-11, 2026)

#### Day-by-Day Plan

| Day | Date | Activities |
|-----|------|------------|
| **Monday** | Apr 7 | Final smoke tests, team standup, last-minute fixes |
| **Tuesday** | Apr 8 | **GO-LIVE** - Deploy to production, monitor closely |
| **Wednesday** | Apr 9 | Support and monitor, collect feedback |
| **Thursday** | Apr 10 | Hot fixes if needed, continue monitoring |
| **Friday** | Apr 11 | Week 1 retrospective, plan Sprint 5 |

#### Launch Checklist

- [ ] All test suites passing
- [ ] Production database populated
- [ ] DNS configured and propagated
- [ ] SSL certificate active
- [ ] Error monitoring active (Sentry)
- [ ] Analytics active
- [ ] Backup verified
- [ ] Rollback procedure tested
- [ ] Support team briefed
- [ ] Stakeholders notified
- [ ] Old system in read-only mode

---

## 5. Dependencies & Risk Matrix

### Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ DEPENDENCY FLOW                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Firebase Project ──────────────────────────────────────────────────────────┐  │
│        │                                                                     │  │
│        ├── Auth Configuration                                                │  │
│        │        │                                                            │  │
│        │        └── Login UI ─────► Protected Routes ─────► Dashboard        │  │
│        │                                                                     │  │
│        ├── Firestore Schema                                                  │  │
│        │        │                                                            │  │
│        │        ├── Events Collection ────► Calendar Views ────► Event CRUD  │  │
│        │        │                                                            │  │
│        │        ├── Clients Collection ───► Client List ──────► Client Profile│ │
│        │        │                                                            │  │
│        │        └── Team Collection ──────► Team List ────────► Team Edit    │  │
│        │                                                                     │  │
│        └── Security Rules ────────────────────────────────────► All Features │  │
│                                                                              │  │
│   Figma Designs ─────────────────────────────────────────────────────────────┤  │
│        │                                                                     │  │
│        └── Component Library ───► UI Implementation ───► All Screens         │  │
│                                                                              │  │
│   Data Migration ────────────────────────────────────────────────────────────┤  │
│        │                                                                     │  │
│        └── Schema Finalized ───► Migration Script ───► Data Validation       │  │
│                                                                              │  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Critical Dependencies

| Dependency | Blocks | Impact if Delayed | Mitigation |
|------------|--------|-------------------|------------|
| Firebase project setup | All development | 1 week delay | Complete in Sprint 0, no exceptions |
| Firestore schema finalized | Calendar, Clients, Team modules | 3-5 day delay | Schema review deadline: Feb 7 |
| Figma component library | All UI development | 2-3 day delay | Parallel development with placeholders |
| Auth implementation | All protected features | 1 week delay | Prioritize in Sprint 1 first week |
| Data migration script | Production launch | 3-5 day delay | Start development in Sprint 2 |
| QA test environment | Testing phase | 2-3 day delay | Set up first day of Sprint 3 |

### Risk Register

| ID | Risk | Probability | Impact | Mitigation | Contingency | Owner |
|----|------|-------------|--------|------------|-------------|-------|
| R1 | Firebase Auth migration fails for some users | Medium | High | Test with subset first, have manual reset process | Force password reset for affected users | Marcus |
| R2 | Data migration corrupts or loses data | Low | Critical | Multiple backups, validation scripts, keep MySQL read-only | Rollback to MySQL, delay launch | Marcus |
| R3 | Performance issues on production | Medium | Medium | Performance testing, Lighthouse CI, load testing | Optimize critical paths, add caching | Marcus |
| R4 | Designer availability reduced | Medium | Medium | Front-load design work, build component library early | Use mockups as reference, polish later | PM |
| R5 | Scope creep during sprints | High | Medium | Strict backlog grooming, PM gatekeeping | Defer to post-MVP, document for Sprint 5+ | PM |
| R6 | User resistance to new UI | Medium | Medium | User testing, training documentation, gradual rollout | Extended parallel run, quick feedback loop | Sofia |
| R7 | Critical bug discovered at launch | Medium | High | Thorough QA, regression testing, E2E tests | Rollback plan ready, hotfix process defined | QA |
| R8 | Third-party service outage (Firebase) | Low | Critical | Monitor Firebase status, offline-first design | Wait for resolution, communicate to users | Marcus |
| R9 | Key team member unavailable | Low | High | Cross-training, documentation, knowledge sharing | Redistribute tasks, bring in contractor | PM |
| R10 | Stakeholder changes requirements late | Medium | High | Regular demos, written signoff, change control process | Negotiate scope, defer to post-MVP | PM |

### Risk Burn-Down

```
Risk Level over Time
    │
 H  │ ████
 i  │ ████████
 g  │ ████████████
 h  │ ████████████████
    │ ████████████████████
 L  │ ████████████████████████
 o  │ ████████████████████████████
 w  │ ████████████████████████████████
    └───────────────────────────────────────
      Sprint 0  Sprint 1  Sprint 2  Sprint 3  Sprint 4  Launch

Goal: Reduce high-impact risks by Sprint 2, all mitigated by Sprint 4
```

---

## 6. Resource Allocation

### Sprint-by-Sprint Allocation

| Resource | Sprint 0 | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|----------|----------|----------|----------|----------|----------|
| Marcus (Lead Dev) | 100% | 100% | 100% | 100% | 100% |
| Frontend Dev | 0% | 100% | 100% | 100% | 100% |
| Kai (UI Designer) | 100% | 75% | 50% | 25% | 25% |
| Sofia (UX Researcher) | 75% | 50% | 50% | 50% | 50% |
| QA Engineer | 0% | 0% | 25% | 75% | 100% |
| PM | 50% | 25% | 25% | 25% | 50% |

### Capacity Planning (Hours per Sprint)

| Sprint | Available Hours | Planned Hours | Buffer |
|--------|-----------------|---------------|--------|
| Sprint 0 (1 week) | 160h | 120h | 25% |
| Sprint 1 (2 weeks) | 400h | 340h | 15% |
| Sprint 2 (2 weeks) | 440h | 380h | 14% |
| Sprint 3 (2 weeks) | 480h | 420h | 12% |
| Sprint 4 (2 weeks) | 480h | 400h | 17% |

---

## 7. Success Criteria

### Launch Criteria (Must Pass)

| Criteria | Target | Measurement Method |
|----------|--------|-------------------|
| All P0 bugs resolved | 0 open | Jira query |
| Page load time | < 2 seconds | Lighthouse |
| Mobile usability | > 85/100 | Lighthouse |
| Accessibility score | > 80/100 | Lighthouse |
| Auth success rate | > 99% | Firebase Analytics |
| Data migration accuracy | 100% | Validation scripts |
| User acceptance | > 80% positive | UAT survey |
| Rollback tested | Yes | Test execution |

### Post-Launch KPIs (Week 1-4)

| KPI | Target | Alert Threshold |
|-----|--------|-----------------|
| Daily Active Users | Baseline + 10% | < Baseline |
| Average Session Duration | > 5 minutes | < 3 minutes |
| Error Rate | < 0.1% | > 1% |
| Page Load (P95) | < 3 seconds | > 5 seconds |
| User-Reported Bugs | < 5/day | > 10/day |
| Support Tickets | < 10/day | > 20/day |

---

## Appendix A: Stakeholder Communication Plan

| Event | Frequency | Attendees | Format |
|-------|-----------|-----------|--------|
| Sprint Planning | Start of each sprint | Full team | 2-hour meeting |
| Daily Standup | Daily | Dev team | 15-min sync |
| Sprint Demo | End of each sprint | Team + Stakeholders | 1-hour presentation |
| Sprint Retrospective | End of each sprint | Full team | 1-hour meeting |
| Stakeholder Update | Weekly | PM + Stakeholders | Email + 30-min call |
| Design Review | As needed | Kai + Sofia + Devs | 30-min meeting |
| Risk Review | Bi-weekly | PM + Marcus | 30-min meeting |

---

## Appendix B: Definition of Done

A feature is considered "Done" when:

- [ ] Code is written and follows style guide
- [ ] Unit tests written and passing
- [ ] Code reviewed and approved
- [ ] Integration tests passing
- [ ] Deployed to staging environment
- [ ] Tested by QA (no P0/P1 bugs)
- [ ] Matches Figma design (pixel-perfect on desktop)
- [ ] Responsive design verified (tablet + mobile)
- [ ] Accessibility checked (keyboard nav, screen reader)
- [ ] Performance within targets (Lighthouse)
- [ ] Documentation updated (if applicable)
- [ ] Product Owner approval

---

## Appendix C: Change Control Process

1. **Request:** Stakeholder submits change request to PM
2. **Impact Assessment:** PM + Marcus evaluate scope, timeline, and risk impact
3. **Decision:** If impact > 4 hours, requires stakeholder approval
4. **Documentation:** Approved changes added to backlog with priority
5. **Communication:** Team notified in next standup

**Change Freeze:** No new features after Sprint 4 starts. Only bug fixes allowed.

---

## Appendix D: Rollback Procedure

### Trigger Conditions
- Critical bug affecting > 50% of users
- Data corruption detected
- Security vulnerability discovered
- Performance degradation > 5x baseline

### Rollback Steps
1. PM makes GO/NO-GO decision with Marcus
2. Revert Vercel deployment to previous version
3. Switch DNS back to old system (if needed)
4. Notify users via in-app banner
5. Conduct root cause analysis
6. Plan fix and re-deployment

### Recovery Time Objective (RTO)
- Rollback initiation: < 15 minutes
- Full recovery: < 1 hour

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 31, 2026 | Senior PM | Initial version |

---

**End of Document**
