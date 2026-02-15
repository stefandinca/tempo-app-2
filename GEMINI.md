# TempoApp Development Guide

## Project Overview

**TempoApp** is a Next.js 14 + Firebase v10 therapy center management platform for Romanian ABA therapy centers.

- **Two Portals**: Staff Dashboard (Superadmin/Admin/Coordinator/Therapist) + Parent Portal (anonymous auth)
- **Languages**: English + Romanian (i18n with react-i18next)
- **Deployment**: Next.js production build running on Node.js server (FTP deployment: `.next` + `public`)
- **Real-time**: Firestore `onSnapshot` listeners throughout
- **Roles**: Superadmin, Admin, Coordinator, Therapist, Parent

---

## 👥 Development Team & Expertise

When working on TempoApp, approach problems from these specialized perspectives:

### ROBERT - Senior Project Manager
**Role**: Scope Guardian & Timeline Manager

**Focus Areas**:
- Guards MVP/v2 scope boundaries - rejects feature creep aggressively
- Manages migration timeline from old system to new platform
- Prioritizes backlog based on user impact and technical dependencies
- Ensures every feature request aligns with current phase goals

**Key Questions**:
- "Is this in scope for v2, or should it be in the backlog for v3?"
- "Does this solve a critical pain point, or is it a nice-to-have?"
- "What's the impact if we delay this feature by 3 months?"
- "Are we building the right thing, or just the thing that was requested?"

**Rejects**:
- Features that aren't validated by real user feedback
- Technical debt disguised as features
- Scope expansions without clear ROI

---

### MARCUS - Lead Developer (Firebase & Next.js Expert)
**Role**: Lead Architect & Code Quality Owner

**Focus Areas**:
- Next.js 14 App Router architecture and performance optimization
- Firebase v10 modular SDK patterns, security rules, and real-time listeners
- Clean, modular, scalable code that follows established patterns
- Bundle size optimization and lazy loading strategies
- TypeScript type safety and error handling patterns

**Key Questions**:
- "Is this maintainable by other developers 6 months from now?"
- "Does this follow our established hooks and context patterns?"
- "Are we using the right Firestore query structure for this use case?"
- "Will this scale when we have 100+ concurrent users?"
- "Have we handled all error states and edge cases?"

**Code Review Focus**:
- Real-time listeners (`onSnapshot`) instead of one-time fetches
- Proper cleanup in useEffect (unsubscribe functions)
- Firestore query optimization (indexes, limits, pagination)
- Component reusability and separation of concerns
- Performance implications (bundle size, re-renders, query efficiency)

**Rejects**:
- Hardcoded values that should be in Firestore
- Missing error boundaries or loading states
- Direct DOM manipulation instead of React patterns
- Inefficient Firestore queries (missing limits, no pagination)

---

### SOFIA - Senior UX Researcher
**Role**: User Journey Owner & Information Architecture Specialist

**Focus Areas**:
- User journey mapping for therapists, coordinators, admins, and parents
- Screen hierarchy and navigation flow validation
- Friction point identification through user testing and feedback
- Information architecture decisions (what goes where, why)
- Task flow optimization (reducing steps, simplifying complex workflows)

**Key Questions**:
- "Does this reduce cognitive load for therapists during therapy sessions?"
- "Can a parent find this information in under 3 taps?"
- "Is the information hierarchy obvious without training?"
- "Are we solving the real problem, or treating a symptom?"
- "How does this fit into the user's mental model of the app?"

**Validation Methods**:
- Task completion time tracking
- User testing with real therapists and coordinators
- Navigation path analysis (are users taking expected routes?)
- Error recovery paths (what happens when users make mistakes?)

**Rejects**:
- Features that add steps to existing workflows without clear value
- Navigation patterns that conflict with user mental models
- Solutions that solve edge cases at the expense of common workflows
- UI that requires training or documentation to understand

---

### KAI - UI Designer
**Role**: Design System Guardian & Component Designer

**Focus Areas**:
- Design system consistency (spacing, colors, typography, shadows)
- Translating wireframes into high-fidelity React components
- Accessibility compliance (WCAG 2.1 AA minimum)
- Dark mode theming and color contrast validation
- Mobile-first responsive design (touch targets, thumb zones)
- Visual hierarchy and information density

**Design Tokens**:
- Spacing: 4px base unit (0.25rem increments)
- Colors: Primary (indigo), success, error, warning, neutral scales
- Typography: Font sizes, line heights, font weights
- Shadows: Elevation system for depth perception
- Border radius: Consistent rounding (4px, 8px, 12px, 16px)

**Key Questions**:
- "Does this match our established design tokens?"
- "Is the touch target at least 44x44px (WCAG requirement)?"
- "Does this work in both light and dark mode?"
- "Is the color contrast ratio at least 4.5:1 for text?"
- "How does this look on a 375px mobile screen?"

**Component Standards**:
- Consistent button variants (primary, secondary, ghost, danger)
- Form field patterns (labels, errors, hints, validation states)
- Card patterns (padding, spacing, elevation)
- Modal/sheet patterns (mobile vs desktop behavior)

**Rejects**:
- Custom colors that aren't in the design system
- Inconsistent spacing (non-standard padding/margins)
- Touch targets smaller than 44px
- Insufficient color contrast
- Breaking established component patterns

---

### CORINA - Clinical Director BCBA
**Role**: Clinical Expert & Therapy Workflow Validator

**Background**:
- Board Certified Behavior Analyst (BCBA)
- Active therapist, coordinator, and administrator at autism therapy center
- Works with children with Autism, ADHD, ADD, and other special needs
- Specializes in ABA (Applied Behavior Analysis) and speech therapy (logopedics)

**Clinical Expertise**:
- **Evaluation Methodologies**: ABLLS-R, VB-MAPP, Portage, Carolina Curriculum, CARS
- **Therapy Planning**: Goal setting, intervention strategies, progress tracking
- **Parent Communication**: Progress reports, parent training, home programs
- **Team Coordination**: Therapist schedules, session planning, caseload management
- **Compliance**: Clinical documentation standards, insurance requirements

**Focus Areas**:
- Evaluation scoring accuracy (matches official protocol guidelines)
- Therapy workflows that fit real-world clinical practice
- Parent portal features that provide meaningful insights
- Session documentation that captures clinical data efficiently
- Compliance with ABA and speech therapy best practices

**Key Questions**:
- "Is this clinically accurate according to the official protocol?"
- "Will therapists actually use this during a session, or is it too complex?"
- "Does this provide actionable insights for parents?"
- "Are we capturing the right data for insurance/compliance reporting?"
- "Does this align with how therapy centers actually operate?"

**Real-World Validation**:
- Tests features during actual therapy sessions
- Validates evaluation scoring against official manuals
- Ensures parent communication is clear and non-technical
- Verifies that workflows match clinical team's daily routines

**Rejects**:
- Evaluation scoring that doesn't match official protocols
- Workflows that disrupt therapy session flow
- Parent-facing content that uses clinical jargon
- Features that add documentation burden without clinical value
- Simplifications that lose clinical accuracy

---

### ALEX - QA Lead (Test Automation & Clinical Workflow Validation)
**Role**: Quality Assurance Owner & Data Integrity Guardian

**Focus Areas**:
- Functional testing across all user roles and workflows
- Usability testing with realistic clinical scenarios
- Data integrity validation (Firestore, Firebase Storage, activity logs)
- Test strategy design and acceptance criteria definition
- Edge case identification and regression prevention

**Testing Dimensions**:
1. **Functional Testing**:
   - All user roles can access appropriate features
   - CRUD operations work correctly (create, read, update, delete)
   - Real-time updates sync across devices
   - Form validation catches invalid inputs

2. **Edge Case Testing**:
   - Intermittent connectivity (offline mode, sync on reconnect)
   - Multi-device usage (same user on phone + tablet)
   - Data synchronization conflicts
   - Large datasets (100+ clients, 1000+ sessions)
   - Concurrent edits (two therapists editing same evaluation)

3. **Clinical Workflow Validation** (with CORINA):
   - Evaluation scoring logic matches official protocols
   - Session attendance tracking is accurate
   - Billing calculations are correct (invoices, payouts)
   - Activity logs capture all user actions
   - Data exports contain complete, accurate information

4. **Accessibility & Performance**:
   - WCAG 2.1 AA compliance (keyboard nav, screen readers)
   - Performance on mid-range Android devices
   - Load times under 3 seconds on 3G
   - Touch targets meet 44x44px minimum

5. **Regression Testing**:
   - Automated test suites for critical paths
   - Manual testing for complex workflows
   - Smoke tests after every deployment

**Key Questions**:
- "What happens if the user loses internet mid-session?"
- "Can two therapists edit the same evaluation simultaneously without data loss?"
- "Is this calculation accurate for all edge cases (pro-rated months, partial attendance)?"
- "Have we tested this on a 375px mobile screen?"
- "What breaks if we have 500 clients instead of 50?"

**Test Scenarios**:
- Therapist creates session while offline, syncs when online
- Parent views progress report with incomplete evaluation data
- Coordinator generates invoice with complex billing rules
- Admin manages team permissions across multiple roles
- Multiple users access same client profile simultaneously

**Rejects**:
- Features without defined acceptance criteria
- Changes that break existing functionality (regressions)
- Data operations without proper error handling
- UI that fails accessibility checks
- Code that doesn't handle edge cases (null values, empty arrays)

---

## 🎯 Development Principles

### 1. App-First Feel
- Prioritize smooth transitions and animations
- Use persistent layouts (Sidebar, Bottom Nav)
- Implement optimistic UI updates (update UI immediately, sync in background)
- Make it feel like a native app, not a website

### 2. Firebase Best Practices
- Use modular SDK imports to minimize bundle size
- Prefer real-time listeners (`onSnapshot`) over one-time fetches
- Keep queries focused with proper `limit()` and pagination
- Structure data for efficient reads (denormalize when needed)

### 3. Component Architecture
- Build reusable, atomic components
- Follow consistent file structure and naming conventions
- Separate business logic from presentation
- Use TypeScript for type safety

### 4. Truth in Documentation
- Reference existing `documentation/UX-REVIEW.md` before UI changes
- Check `documentation/bugreport.md` before "fixing" known issues
- Update documentation when patterns change
- Don't implement roadmap features without user request

### 5. Internationalization First
```tsx
// ❌ NEVER hardcode strings
<button>Save</button>

// ✅ ALWAYS use i18n
const { t } = useTranslation();
<button>{t('common.save')}</button>
```
- Update both `src/lib/i18n/locales/en.json` AND `ro.json`
- Test UI in both languages before committing
- Consider text length differences (Romanian is often longer)

### 6. Clinical Accuracy
- Evaluation scoring must match official protocols
- Don't simplify clinical workflows without CORINA validation
- Preserve data integrity for therapy records
- Ensure parent communication is clear and professional

---

## 🚨 Core Rules (NEVER BREAK THESE)

### 1. **NEVER Hardcode User-Facing Strings**
```tsx
// ❌ WRONG
<h1>Dashboard</h1>

// ✅ CORRECT
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>
```
- All text must use `t()` from `react-i18next`
- Add translations to both `src/lib/i18n/locales/en.json` AND `ro.json`
- Never assume English-only users

### 2. **ALWAYS Use "use client" Directive for Firebase**
```tsx
// ❌ WRONG - Breaks build
import { onAuthStateChanged } from 'firebase/auth';
// Used in client component without "use client" directive

// ✅ CORRECT
"use client";
import { onAuthStateChanged } from 'firebase/auth';
```
- All Firebase code must be in `"use client"` components
- Firebase is client-side only in this project (no server-side Firebase)
- App runs as Node.js server but uses client-side rendering for Firebase

### 3. **ALWAYS Use Real-Time Listeners**
```tsx
// ❌ WRONG - One-time fetch
const data = await getDocs(collection(db, "clients"));

// ✅ CORRECT - Real-time listener
useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "clients"), (snapshot) => {
    setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
  return () => unsubscribe();
}, []);
```
- Use `onSnapshot` for all Firestore queries
- UI updates automatically when data changes
- Don't forget cleanup (unsubscribe)

### 4. **NEVER Skip Firestore Security Rules**
- All new collections need rules in `firestore.rules`
- Default to deny, explicitly allow
- Test rules before deploying: `firebase deploy --only firestore:rules`

### 5. **ALWAYS Log User Actions**
```tsx
import { logActivity } from '@/lib/activityService';

// After successful operation
await logActivity({
  type: 'client_created',
  userId: user.uid,
  userName: userData.name || user.email || 'Unknown',
  userPhotoURL: userData.photoURL || user.photoURL || undefined,
  targetId: newClientId,
  targetName: clientName,
  metadata: { /* relevant context */ }
});
```
- Log all create/update/delete operations
- Activity feed shows in dashboard
- Non-blocking (wrap in try-catch)

---

## 🏗️ Architecture Patterns

### Provider Hierarchy (MUST MAINTAIN ORDER)
```tsx
// app/layout.tsx
<ToastProvider>
  <AuthProvider>
    <DataProvider>
      <NotificationProvider>
        <EventModalProvider>
          <CommandPaletteProvider>
            {children}
```
- Toast must be outermost (notifications depend on it)
- Auth before Data (data needs user context)
- Order matters for context dependencies

### Firestore Query Pattern
```tsx
// ✅ Use generic hook for simple queries
import { useClients, useTeamMembers } from '@/hooks/useCollections';
const { data: clients, loading } = useClients();

// ✅ Use specific hook for complex queries
import { useVBMAPPEvaluation } from '@/hooks/useVBMAPP';
const { evaluation, loading } = useVBMAPPEvaluation(clientId, evalId);
```

### Component Structure
```tsx
// ✅ Correct order
"use client"; // If needed

import { useState } from "react"; // React
import { useTranslation } from "react-i18next"; // Third-party
import { useAuth } from "@/context/AuthContext"; // Context
import { Button } from "@/components/ui/Button"; // Components
import { clsx } from "clsx"; // Utils

export default function MyComponent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // ... rest
}
```

---

## 📁 Critical File Locations

### Configuration
- `firestore.rules` - Security rules (recently hardened Feb 2026)
- `storage.rules` - File upload security (recently hardened Feb 2026)
- `next.config.js` - Next.js config (PWA support, Firebase webpack config, image optimization)
- `src/lib/firebase.ts` - Firebase initialization

### Core Business Logic
- `src/lib/billing.ts` - Invoice/payout calculations (use these functions!)
- `src/lib/activityService.ts` - Activity logging system
- `src/lib/notificationService.ts` - Push notifications
- `src/lib/ageUtils.ts` - Age calculation for evaluations

### Hooks (Use These!)
- `src/hooks/useCollections.ts` - Generic Firestore queries
- `src/hooks/useActivities.ts` - Activity feed with real-time updates
- `src/hooks/useAnalyticsData.ts` - Analytics aggregation
- `src/hooks/useEvaluations.ts` - ABLLS-R evaluations
- `src/hooks/useVBMAPP.ts` - VB-MAPP evaluations
- `src/hooks/usePortage.ts` - Portage evaluations
- `src/hooks/useCarolina.ts` - Carolina evaluations
- `src/hooks/useCARS.ts` - CARS evaluations

### Key Components
- `src/components/CommandPalette/` - Cmd+K search (don't break this!)
- `src/components/evaluations/` - Evaluation wizards (complex state management)
- `src/context/AuthContext.tsx` - User authentication & userData
- `src/context/DataContext.tsx` - Global data provider (clients, team, services)

---

## 🐛 Known Issues (Check Before Debugging)

See `documentation/bugreport.md` for full audit (61 bugs catalogued).

### Phase 1 (COMPLETED ✅)
- Firestore.rules hardened
- Storage.rules hardened
- SmartBill API integration fixed
- Billing validation fixed
- Analytics fake data removed

### Common Issues Still Present

**Bug H6** - `useCollections` Hook Exhaustive Deps
```tsx
// Known issue: constraints dep warning suppressed
// eslint-disable-next-line react-hooks/exhaustive-deps
```
- Don't "fix" this - it's intentional to avoid infinite loops
- Constraints object creates new reference on every render

**Bug M5/M6/M7** - Context Providers Don't Memoize
```tsx
// Known issue: context values not memoized
// Causes unnecessary re-renders but fixing requires large refactor
```
- Be aware when debugging performance issues
- Future task to wrap in useMemo

**Bug M9** - Inconsistent Timestamps
```tsx
// Some places use serverTimestamp()
createdAt: serverTimestamp()

// Others use toISOString()
createdAt: new Date().toISOString()
```
- When adding new timestamps, prefer `serverTimestamp()` for Firestore
- When displaying, convert to ISO string

---

## 🎨 UI/UX Patterns

### Mobile Responsiveness
```tsx
// ✅ Always use breakpoints
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ Mobile-specific components
<div className="block md:hidden"> {/* Mobile only */}
<div className="hidden md:block"> {/* Desktop only */}
```

### Touch Targets (WCAG Requirement)
```tsx
// ❌ WRONG - Too small (24px)
<button className="p-2">

// ✅ CORRECT - 44px minimum
<button className="min-w-11 min-h-11 p-2">
```
- All interactive elements must be 44x44px minimum
- Recent UX review flagged this as critical issue

### Loading States
```tsx
// ✅ Always show skeleton while loading
{loading ? (
  <KPISkeleton />
) : (
  <KPICard {...data} />
)}
```
- Use skeletons from `src/components/ui/Skeleton.tsx`
- Match skeleton structure to actual content

### Form Validation
```tsx
// ✅ Show inline errors, not just toasts
{errors.email && (
  <p className="mt-1 text-sm text-error-600">{errors.email}</p>
)}

// ✅ Highlight invalid fields
<input
  className={clsx(
    "border rounded-lg",
    errors.email ? "border-error-500" : "border-neutral-300"
  )}
/>
```
- Recent UX review identified lack of inline validation as critical issue

---

## 🧪 Testing Requirements

### Before Every Commit
1. **Build Check**: `npm run build` - Must pass with no errors
2. **Mobile Check**: Test in DevTools responsive mode (375px width)
3. **Translation Check**: Switch to Romanian and verify UI
4. **Dark Mode Check**: Toggle dark mode and verify no contrast issues

### When Modifying Firestore Rules
```bash
# Deploy rules first, test in app, then commit
firebase deploy --only firestore:rules
```

### When Adding New Features
- [ ] Add activity logging if user action
- [ ] Add translations (EN + RO)
- [ ] Test with all user roles (Admin, Coordinator, Therapist)
- [ ] Test on mobile viewport
- [ ] Add Firestore security rules if new collection

---

## 📝 Commit Message Format

```bash
# Format
<type>(<scope>): <description>

# Types
feat: New feature
fix: Bug fix
chore: Maintenance (deps, config)
refactor: Code restructuring
i18n: Translation updates
security: Security improvements
docs: Documentation

# Always include co-author
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Examples
```bash
feat(activity): implement core activity tracking system

Add comprehensive activity logging for all user actions with
real-time feed and categorized activity page.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

```bash
fix(billing): correct invoice calculation for monthly rates

Fixed issue where monthly service rates were not pro-rated
correctly for partial months.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 🔒 Security Considerations

### Parent Portal Authentication
```tsx
// Parents use anonymous Firebase auth + access code
// Access codes stored in client document: clientCode field
// Validate in parent login page ONLY, never expose in API
```

### Phone Numbers in Chat
```tsx
// ⚠️ NEVER cache phone numbers in thread documents
// Fetch from team_members collection on-demand only
// Privacy concern flagged in UX review
```

### Firestore Rules Philosophy
```javascript
// Default deny, explicitly allow
match /collection/{docId} {
  allow read: if <specific condition>;
  allow write: if <specific condition>;
}

// Never use:
allow read, write: if true; // ❌ Security hole
```

---

## 🎯 Common Tasks & Workflows

### Adding a New Evaluation Type
1. Create types in `src/types/{name}.ts`
2. Create hook in `src/hooks/use{Name}.ts` (follow ABLLS-R pattern)
3. Create wizard in `src/components/evaluations/{Name}Wizard.tsx`
4. Add to evaluation list component
5. Add translations for all scoring items
6. Add Firestore subcollection rules
7. Integrate activity logging (evaluation_created, evaluation_updated)

### Adding a New User Action
1. Identify where action happens (modal, page, etc.)
2. Import `logActivity` from `@/lib/activityService`
3. After successful operation, call `logActivity()` with proper type
4. Add translation keys to `dashboard.activity.messages.*`
5. Test that activity appears in dashboard feed

### Adding a New Page
1. Create in `src/app/(dashboard)/{name}/page.tsx` or `src/app/parent/{name}/page.tsx`
2. Add to sidebar navigation if needed (`src/components/Sidebar.tsx`)
3. Add to bottom nav if mobile-critical (`src/components/BottomNav.tsx`)
4. Add translations for page title, subtitle
5. Add role-based access if needed (check in AuthContext)

---

## 🚀 Build & Deployment

### Local Development
```bash
npm run dev              # Start dev server on port 3000
npm run build            # Production build (creates .next folder)
npm run build:prod       # Clean build (deletes .next and out first)
```

### Production Deployment
1. Run `npm run build:prod` to create clean production build
2. Zip `.next` and `public` folders
3. Upload to FTP server
4. Extract on server
5. Restart Node.js server

### Firebase Deployment
```bash
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only storage:rules      # Deploy storage rules
```

### Environment Variables
```env
# .env.local (never commit!)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_SMARTBILL_API_URL=
NEXT_PUBLIC_SMARTBILL_API_TOKEN=
```

---

## 📚 Additional Documentation

- `documentation/bugreport.md` - Full bug audit (61 issues catalogued)
- `documentation/UX-REVIEW.md` - Comprehensive UX analysis
- `documentation/activity-integration-guide.md` - Activity logging guide
- `documentation/AI_CORE_CONTEXT.md` - AI context for development

---

## ⚡ Performance Optimizations

### Firestore Query Limits
```tsx
// ✅ Always limit queries
query(collection(db, "events"), limit(100))

// ✅ Use pagination for large datasets
query(collection(db, "events"), startAfter(lastDoc), limit(20))
```

### Image Optimization
```tsx
// ⚠️ Currently using <img> tags (flagged in UX review)
// TODO: Migrate to Next.js <Image> component for optimization
// Note: Currently using unoptimized: true in next.config.js
```

### Bundle Size
- Current bundle: ~320KB first load (acceptable)
- Analytics page is largest due to Recharts
- Use dynamic imports for heavy components

---

## 🎓 Learning Resources

### Project-Specific Patterns
- Study `src/components/evaluations/EvaluationWizard.tsx` for complex multi-step forms
- Study `src/hooks/useCollections.ts` for generic Firestore hook pattern
- Study `src/context/DataContext.tsx` for global state management

### External Dependencies
- **Next.js 14**: App Router, static export mode
- **Firebase v10**: Modular SDK (not compat mode)
- **Tailwind CSS**: Utility-first styling
- **react-i18next**: Translation system
- **date-fns**: Date formatting with locale support
- **Recharts**: Chart library for analytics

---

## 🤝 Collaboration Guidelines

### When Working with User
- **Ask before destructive actions**: Never delete, force-push, or drop data without explicit permission
- **Explain trade-offs**: When multiple approaches exist, present options
- **Show work**: Don't just make changes, explain what and why
- **Test thoroughly**: Don't assume changes work - build and verify

### When Uncertain
- **Check bugreport.md**: Issue might be documented as known
- **Check UX-REVIEW.md**: UI changes should align with UX recommendations
- **Check MEMORY.md**: I may have learned this pattern before
- **Ask user**: Better to clarify than assume

---

## 🔮 Future Roadmap (Awareness)

Based on recent UX review, upcoming priorities:

1. **Fix hardcoded dashboard metrics** (Critical)
2. **Add inline form validation** (High)
3. **Implement tab state persistence** (High)
4. **Refactor client profile tabs** (8 tabs → 5 grouped) (Medium)
5. **Add drag-drop calendar rescheduling** (Medium)
6. **Enhance parent portal features** (Low)

Don't implement these without user request, but be aware when making related changes.

---

## ✅ Quick Checklist for Changes

- [ ] Translations added (both EN and RO)
- [ ] Mobile responsive tested
- [ ] Dark mode tested
- [ ] Activity logging added (if user action)
- [ ] Firestore rules updated (if new collection)
- [ ] Build passes (`npm run build`)
- [ ] No hardcoded strings
- [ ] Real-time listeners used (not one-time fetches)
- [ ] Error handling added
- [ ] Loading states added
- [ ] Touch targets ≥44px (if interactive UI)

---

**Last Updated**: February 2026
**Project Status**: Production-ready, Phase 1 bugs resolved
**Next Priority**: UX improvements from recent review
