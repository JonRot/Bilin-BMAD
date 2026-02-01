# EduSchedule Pro - Documentation Index

## Project Overview

**EduSchedule Pro** is a scheduling and enrollment management platform for BILIN Method language instruction in Florianópolis, Brazil.

**Tech Stack:** Astro 5 SSR + Cloudflare Pages + D1 (SQLite) + Google Calendar API

**Status:** ✅ **MVP COMPLETE** - All 52 FRs Implemented, Data Model Hardened, Production-Ready

**Latest Deployment:** <https://eduschedule-app.pages.dev>

**Implementation Stats (as of 2026-02-01):**
- **42 pages** (26 admin, 8 teacher, 8 parent, 1 common)
- **176 API endpoints** across 20 categories
- **73 reusable components** with full design system compliance
- **76 business services** with repository pattern
- **47+ database tables** (36+ added via migrations)
- **18 client-side TypeScript modules** in `src/scripts/`
- **93 database migrations** applied

**Phase 2 Progress:**
- ✅ **Epic 6 Complete** - Advanced Enrollment (11/11 stories)
- ✅ **Epic 7 Complete** - Rock-Solid Scheduling (9/9 stories, WhatsApp deferred)
- ✅ **Epic 8 Complete** - Payment System (11/12 stories, PIX deferred)

---

## Quick Navigation

### Which Document Do I Use?

| I want to... | Use this document |
|-------------|-------------------|
| Understand WHAT we're building | [PRD](./planning/prd.md) ✅ Complete |
| Find a specific feature to implement | [Epics & Stories](./planning/epics.md) ✅ MVP Complete |
| Understand HOW we build it | [Architecture](./architecture.md) ✅ Production-Ready |
| **Understand system FLOWS (AI-optimized)** | [Application Flows v3](./reference/application-flows-v3.md) |
| See all flows visually (Portuguese) | [/flows page](https://eduschedule-app.pages.dev/flows) |
| Understand edge-first design principles | [Edge Architecture Spec](./claude-edge-architecture-system-prompt.md) |
| Build the iOS/Android wrapper | [Native Shell](../native-shell/) |
| Build/debug API endpoints | [API Contracts](./reference/api-contracts.md) |
| Modify database schema | [Data Models](./reference/data-models.md) |
| **Change a cross-cutting feature** | [Feature Maps](./reference/feature-maps.md) |
| Build UI components | [Design System](./reference/design-system-architecture.md) |
| Set up local dev | [Development Guide](./reference/development-guide.md) |
| Understand BILIN business rules | [Business Context](./reference/business-context.md) |
| **Understand enrollment rules deeply** | [Enrollment Rules Comprehensive](./planning/enrollment-rules-comprehensive.md) |
| **See foundational business decisions** | [Brainstorming Session 2025-12-06](./archive/brainstorming-session-2025-12-06-COMPLETE.md) |
| **Plan Phase 2 features** | [Scheduling Improvements](./planning/brainstorm-scheduling-improvements.md) |
| **Phase 2: AI optimization** | [Booking Optimizer Architecture](./planning/architecture-booking-optimizer.md) |
| **Phase 2: Payment/Billing** | [Payment & Subscription Tech Spec](./planning/tech-spec-payment-subscription-system.md) |
| **Master Audit (consolidated)** | [Master Audit 2025](./testing/master-audit-2025.md) |

---

## MANDATORY Design System Rules

> **IMPORTANT:** These rules MUST be followed for ALL code changes in eduschedule-app. No exceptions.

### Rule 1: Use CSS Custom Properties (NEVER Hardcode)

```css
/* ✅ CORRECT */
color: var(--color-primary);
padding: var(--spacing-md);
font-size: var(--font-size-base);
border-radius: var(--radius-md);
box-shadow: var(--shadow-card);
transition: all var(--transition-fast);

/* ❌ WRONG - NEVER DO THIS */
color: #F69897;
padding: 1rem;
font-size: 16px;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0,0,0,0.1);
transition: all 0.2s ease;
```

### Rule 2: Available CSS Variables

All variables are defined in `src/constants/theme.ts` and injected via `BaseLayout.astro`:

| Category | Variables | Example |
|----------|-----------|---------|
| **Colors** | `--color-primary`, `--color-secondary`, `--color-text`, `--color-text-light`, `--color-text-muted`, `--color-surface`, `--color-background`, `--color-border`, `--color-success`, `--color-danger`, `--color-warning`, `--color-info` | `color: var(--color-primary)` |
| **Brand** | `--brand-coral`, `--brand-cream`, `--brand-tan`, `--brand-dark`, `--brand-white`, `--brand-yellow`, `--brand-olive`, `--brand-peach`, `--brand-sky-blue`, `--brand-lavender` | `background: var(--brand-coral)` |
| **Spacing** | `--spacing-xs` (0.25rem), `--spacing-sm` (0.5rem), `--spacing-md` (1rem), `--spacing-lg` (1.5rem), `--spacing-xl` (2rem), `--spacing-2xl` (3rem), `--spacing-3xl` (4rem) | `padding: var(--spacing-md)` |
| **Font Sizes** | `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`, `--font-size-3xl`, `--font-size-4xl` | `font-size: var(--font-size-lg)` |
| **Radius** | `--radius-sm`, `--radius-base`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full` | `border-radius: var(--radius-md)` |
| **Shadows** | `--shadow-sm`, `--shadow-base`, `--shadow-md`, `--shadow-lg`, `--shadow-card` | `box-shadow: var(--shadow-card)` |
| **Transitions** | `--transition-fast` (150ms), `--transition-base` (200ms), `--transition-slow` (300ms) | `transition: all var(--transition-fast)` |
| **Status Colors** | `--status-ativo-bg`, `--status-inativo-bg`, `--status-pausado-bg`, `--status-novo-bg` + text variants | `background: var(--status-ativo-bg)` |
| **Form Tokens** | `--form-input-padding`, `--form-input-border-color`, `--form-input-focus-shadow`, `--form-label-font-size` | `padding: var(--form-input-padding)` |
| **Component Tokens** | `--btn-height-sm/md/lg`, `--input-height-sm/md/lg`, `--card-padding-sm/md/lg`, `--nav-height` | `height: var(--btn-height-md)` |

### Rule 3: Use Reusable Components

| Component | Use For | Import From |
|-----------|---------|-------------|
| `FormField` | ALL form inputs (text, email, select, textarea, etc.) | `@/components/FormField.astro` |
| `Button` | ALL buttons (primary, secondary, danger, ghost, outline) | `@/components/Button.astro` |
| `Card` | Content containers with shadow | `@/components/Card.astro` |
| `Modal` | Dialogs and overlays | `@/components/Modal.astro` |
| `StatusBadge` | Status indicators (ATIVO, INATIVO, etc.) | `@/components/StatusBadge.astro` |
| `Nav` | Navigation bar | `@/components/Nav.astro` |
| `EmptyState` | "No data" messages | `@/components/EmptyState.astro` |
| `StatsCard` | Dashboard metrics | `@/components/StatsCard.astro` |

```astro
<!-- ✅ CORRECT -->
<FormField type="email" name="email" label="Email" required />
<Button variant="primary">Save</Button>
<StatusBadge status="ATIVO" />

<!-- ❌ WRONG - Don't use raw HTML -->
<input type="email" name="email" />
<button class="my-button">Save</button>
<span class="status">ATIVO</span>
```

### Rule 4: Form Patterns

```astro
<!-- Standard form layout -->
<form class="form-container">
  <div class="form-grid">
    <FormField type="text" name="name" label="Name" required />
    <FormField type="email" name="email" label="Email" required />
  </div>
  <div class="form-actions">
    <Button variant="ghost" type="button">Cancel</Button>
    <Button variant="primary" type="submit">Save</Button>
  </div>
</form>

<style>
  .form-container { max-width: 600px; }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-lg);
  }
</style>
```

### Rule 5: Import Constants in TypeScript

```typescript
// ✅ CORRECT - Import from constants
import { COLORS, SPACING, FORM_TOKENS } from '@/constants/theme';
import { NAV_LINKS, MESSAGES, STATUS_LABELS } from '@/constants/ui';
import { LOCALE } from '@/constants/config';

// ❌ WRONG - Never hardcode values in TypeScript
const primaryColor = '#F69897'; // BAD
```

### Rule 6: Brazil Locale

All dates/times must use Brazilian format:
- **Date format:** DD/MM/YYYY (e.g., 25/12/2025)
- **Time format:** 24-hour (e.g., 14:30)
- **Timezone:** America/Sao_Paulo
- **Currency:** R$ (BRL)
- Use `src/lib/format.ts` utilities: `formatDate()`, `formatTime()`, `formatCurrency()`

### Checklist Before Any PR

- [ ] No hardcoded colors (hex, rgb, hsl)
- [ ] No hardcoded spacing (px, rem, em without var())
- [ ] All form inputs use `FormField` component
- [ ] All buttons use `Button` component
- [ ] Status indicators use `StatusBadge` component
- [ ] Dates formatted as DD/MM/YYYY
- [ ] Times formatted as 24-hour

---

## Implementation Status (2025-12-17)

### PRD Alignment by Role

| Role | Coverage | Key Features |
|------|----------|--------------|
| **Admin** | 100% | Enrollments, leads, approvals, closures, edit modal, PAUSADO countdown, status history |
| **Teacher** | 100% | Schedule, completions, notes, earnings display, availability grid |
| **Parent** | 100% | Dashboard, history, invoice, notes view, class cancellation |

### Feature Completion

| Feature | PRD Ref | Status |
|---------|---------|--------|
| Enrollment CRUD | FR1-9 | ✅ Complete |
| Class Completions | FR10, FR15-16 | ✅ Complete |
| Status Lifecycle | FR42-46 | ✅ Complete + History Tracking |
| Slot Management | FR37-41 | ✅ Complete (minute-based blocking) |
| Lead Pipeline | FR30-36 | ✅ Complete |
| Parent Invoice | FR29 | ✅ Complete |
| Teacher Earnings | FR23 | ✅ Complete |
| Teacher Availability | FR20 | ✅ Complete |
| Exception Management | FR11-14, FR17-18 | ✅ Complete |
| Security | NFR6-12 | ✅ Complete |
| Data Integrity | Triggers, Indexes | ✅ Complete (21 hardening issues) |
| Status History | Audit/Compliance | ✅ Complete |

---

## Folder Structure

```text
docs/                                 # PROJECT-LEVEL DOCUMENTATION
├── index.md                          # This file - start here!
├── README.md                         # Brief project overview
├── architecture.md                   # System architecture (the "HOW")
├── claude-edge-architecture-system-prompt.md  # Edge-first design principles
│
├── planning/                         # WHAT we're building + future roadmap
│   ├── prd.md                        # Product Requirements Document ✅ MVP Complete
│   ├── epics.md                      # Epics breakdown ✅ 1-5 Complete
│   ├── enrollment-rules-comprehensive.md  # Detailed business rules reference
│   ├── epic-6-advanced-enrollment.md      # Phase 2: Advanced features
│   ├── epic-7-rock-solid-scheduling.md    # Phase 2: Notifications, reliability
│   ├── epic-8-payment-subscription-system.md  # Phase 2: Stripe billing integration
│   ├── architecture-booking-optimizer.md  # Phase 2: AI scheduling optimization
│   ├── brainstorm-scheduling-improvements.md  # Phase 2+ roadmap (Cal.com analysis)
│   ├── tech-spec-scheduling-enhancements.md   # Buffer times + time-off spec
│   └── tech-spec-payment-subscription-system.md  # Phase 2: Stripe billing integration
│
├── reference/                        # Technical specifications
│   ├── application-flows-v3.md       # 🔑 AI-OPTIMIZED FLOWS (Mermaid + YAML)
│   ├── api-contracts.md              # REST API documentation (80+ endpoints)
│   ├── data-models.md                # Database schema (22 tables)
│   ├── feature-maps.md               # Cross-cutting feature impact maps
│   ├── design-system-architecture.md # CSS variables, components ✅ Implemented
│   ├── development-guide.md          # Setup instructions
│   ├── business-context.md           # BILIN domain knowledge
│   ├── brainstorming-session-2025-12-06.md  # Foundational business decisions
│   ├── teacher-cancellation-workflow.md     # Cancellation approval flow
│   ├── makeup-class-tracking.md             # Makeup class system
│   └── notification-mapping.md              # Notification types and triggers
│
├── testing/                          # Test plans and checklists
│   └── master-audit-2025.md          # Consolidated audit report (150+ issues tracked)
│
└── archive/                          # Historical summary
    └── ARCHIVE-HISTORY.md            # Master summary of project history

eduschedule-app/docs/                 # APP OPERATIONAL DOCUMENTATION
├── README.md                         # This folder's index
├── TESTING-CHECKLIST.md              # Pre-deployment QA checklist
├── admin-quick-guide-cancellations.md  # Admin user guide
└── setup-guides/
    ├── GOOGLE_CALENDAR_OAUTH_SETUP.md  # Google OAuth setup
    ├── STRIPE_SETUP.md                 # Stripe payment integration
    └── SUPERSIGN_SETUP.md              # SuperSign contract signing

eduschedule-app/                      # APP ROOT (non-docs operational files)
├── CLAUDE.md                         # AI assistant instructions
├── CLOUDFLARE_CODING_STANDARDS.md    # Critical Cloudflare patterns
├── DEPLOYMENT.md                     # Cloudflare Pages deploy guide
├── SECURITY.md                       # Security features
└── .credentials-reference.md         # Secrets (gitignored)
```

---

## Application Routes

### Admin Routes (`/admin/*`) - 24 Pages

| Route | Purpose | PRD Ref |
|-------|---------|---------|
| `/admin` | Dashboard with stats, pending approvals, recent leads | - |
| `/admin/enrollments` | Enrollment management, edit modal, PAUSADO countdown | FR1-9, FR41 |
| `/admin/leads` | Lead pipeline, matching, conversion | FR30-36 |
| `/admin/invoices` | Billing dashboard: revenue, payroll, margins, parent/teacher breakdown | Extra |
| `/admin/approvals` | Change request approvals (email, phone, address, etc.) | FR14 |
| `/admin/availability-approvals` | Teacher availability submissions + day zones | - |
| `/admin/closures` | Holidays, FÉRIAS, weather, emergency closures | - |
| `/admin/users` | Teacher/student management | FR50 |
| `/admin/settings` | App settings (languages, cities, data maintenance) | - |
| `/admin/theme-editor` | Design system customization with live preview | - |
| `/admin/pending-cancellations` | Teacher cancellation approval workflow | FR13-14 |
| `/admin/time-off-approvals` | Teacher vacation/sick/personal time-off requests | Extra |
| `/admin/pausado-approvals` | Parent pausado (pause) requests approval workflow | Extra |
| `/admin/parent-links` | Link parent OAuth emails to students | Extra |
| `/admin/teacher-links` | Link teacher OAuth emails to teacher records | Extra |
| `/admin/account-links` | Combined parent/teacher link management | Extra |
| `/admin/scheduling-analytics` | Hot times dashboard - demand vs supply analysis | Extra |
| `/admin/travel-errors` | Geocoding/route calculation error resolution | Extra |
| `/admin/re-encrypt` | Data re-encryption tool for key rotation | Extra |
| `/admin/import-data` | Bulk student import from JSON | Extra |
| `/admin/resolve-errors` | Error resolution and data cleanup tool | Extra |
| `/admin/host-selection` | Select new location host for 3+ person groups | Extra |
| `/admin/billing` | Subscription overview: MRR, ARR, churn rate, subscription stats | Epic 8 |
| `/admin/billing/subscriptions` | Subscription list with filters, search, bulk actions | Epic 8 |
| `/admin/billing/transactions` | Transaction history with CSV export | Epic 8 |
| `/admin/backups` | Backup management with manual backups and restore | Extra |
| `/admin/profile-changes` | Profile change history and review (auto-approved) | Extra |
| `/admin/contracts` | Autentique digital contract signing (MATRICULA / REMATRICULA) | Extra |

### Teacher Routes (`/teacher/*`) - 8 Pages

| Route | Purpose | PRD Ref |
|-------|---------|---------|
| `/teacher` | Dashboard: stats, itinerary view, student grid with details | - |
| `/teacher/schedule` | Weekly schedule: start/complete class, cancellation requests, time-off, earnings | FR19, FR22-23 |
| `/teacher/student/[id]` | Student detail: class history with full editing (status, notes, BILIN, skills) | - |
| `/teacher/availability` | LIVRE/BLOCKED grid: day-zone selectors, potential earnings calculation | FR20-21 |
| `/teacher/profile` | Profile info, banking (PIX/CPF), change requests, teaching preferences | - |
| `/teacher/invoice` | Monthly earnings: tier display, class-by-class breakdown, summary stats | FR23 |
| `/teacher/time-off` | Time-off request management and history | Extra |
| `/teacher/location-change-approvals` | Approve/reject parent location host requests with travel impact | Extra |

### Parent Routes (`/parent/*`) - 8 Pages

| Route | Purpose | PRD Ref |
|-------|---------|---------|
| `/parent` | Dashboard: children cards, upcoming classes list, pausado request modal | - |
| `/parent/profile` | Parent profile: account info, contact details, change requests | - |
| `/parent/students` | Consolidated dashboard: BILIN pillars, skill ratings, class history with status, student info | FR25-27 |
| `/parent/invoice` | Monthly billing: per-class breakdown, group rates, total due | FR29 |
| `/parent/cancel-choice` | Rate change decision UI when group class drops to 1 student | Epic 7 |
| `/parent/location-change` | Location approval UI when host cancels group class | Epic 7 |
| `/parent/billing` | Subscription overview: current plan, payment methods, payment history | Epic 8 |
| `/parent/billing/subscribe` | New subscription flow: student → class type → plan → payment | Epic 8 |

### Common Routes - 1 Page

| Route | Purpose | PRD Ref |
|-------|---------|---------|
| `/notifications` | Notification center: filter by type/status, mark read, pagination | Extra |

### API Routes (`/api/*`) - 154 Endpoints

| Category | Count | Key Endpoints | Purpose |
|----------|-------|---------------|---------|
| Auth | 6 | `/login`, `/logout`, `/csrf`, `/microsoft/*` | OAuth login, logout, CSRF, Microsoft SSO |
| Admin | 16 | `/cancellations`, `/time-off-approvals`, `/geocode-*`, `/travel-errors/*` | Cancellation approval, time-off, geocoding, analytics |
| Enrollments | 11 | `/[id]`, `/[id]/status`, `/[id]/exceptions/*`, `/[id]/completions/*` | CRUD, status, exceptions, completions |
| Leads | 8 | `/[id]`, `/[id]/matches`, `/[id]/convert`, `/[id]/send-contract`, `/[id]/mark-signed` | Pipeline, matching, conversion, contracts |
| Schedule | 2 | `/[teacherId]`, `/student/[studentId]` | Generated schedules |
| Slots | 3 | `/[teacherId]`, `/matches`, `/suggestions` | Availability queries, matching |
| Availability | 2 | `/index`, `/approvals` | Teacher availability CRUD |
| Teacher | 6 | `/availability`, `/time-off`, `/day-zones` | Teacher-specific operations |
| Notifications | 3 | `/index`, `/[id]/read`, `/read-all` | User notifications |
| Pending Counts | 3 | `/admin/pending-counts`, `/teacher/pending-counts`, `/parent/pending-counts` | Badge counts |
| Travel | 2 | `/index`, `/matrix` | Travel time calculations |
| Change Requests | 4 | `/index`, `/count`, `/[id]/approve`, `/[id]/reject` | Change request workflow |
| System | 1 | `/closures` | System closure management |
| Calendar | 1 | `/events` | Google Calendar sync |
| Webhooks | 2 | `/jotform`, `/stripe` | JotForm lead import, Stripe payment events |
| Public | 1 | `/register` | Public registration (no auth) |
| Subscriptions | 7 | `/subscriptions`, `/[id]`, `/[id]/pause`, `/[id]/resume` | Subscription CRUD and lifecycle |
| Payment Methods | 5 | `/payment-methods`, `/[id]`, `/[id]/default` | Card/Boleto management |
| Billing | 1 | `/billing/portal-session` | Stripe Customer Portal |
| Completions | 3 | `/pending-confirmation`, `/[id]/confirm`, `/[id]/report-issue` | Teacher class confirmation |
| Cron | 2 | `/auto-complete`, `/payment-grace` | Scheduled jobs |

---

## Current Architecture Summary

### Edge-First Principles

All architecture decisions follow the [Edge Architecture Spec](./claude-edge-architecture-system-prompt.md):

- **Edge-Driven Logic** - All workflows run on Cloudflare Workers (scheduling, matching, billing, notifications)
- **Distributed State** - D1 for relational data, KV for config/cache, R2 for files
- **Server-Driven UI** - JSON schema generation on the edge
- **Minimal Native Shell** - WebView + push tokens + device permissions only

### Enrollment-First Paradigm

- **Enrollments** are persistent entities (student + teacher + weekly slot)
- **Class Instances** are generated on-demand from enrollments
- **Google Calendar** is display-only (one-way sync from database)

### Key Design Decisions

1. **Database as Source of Truth** - D1 SQLite, not Google Calendar
2. **Hybrid Data Model** - Enrollments + Exceptions + Completions
3. **Lazy PAUSADO Evaluation** - Auto-transition on access, no cron jobs
4. **Computed Slots** - LIVRE/BLOCKED derived from enrollment status
5. **Repository + Service Pattern** - Clean separation for future migration
6. **No Centralized Servers** - Edge-only compute, no monolithic backends

### Security Implementation

| Feature | Status |
|---------|--------|
| Google OAuth 2.0 + PKCE | ✅ |
| Microsoft OAuth (optional) | ✅ |
| AES-256-GCM Session Encryption | ✅ |
| CSRF Protection (all mutations) | ✅ |
| Rate Limiting (100 reads/min, 20 writes/min) | ✅ |
| Role-Based Access Control | ✅ |
| PII Encryption at Rest | ✅ |
| SQL Injection Prevention | ✅ |
| XSS Prevention | ✅ |

---

## Database Tables (40+ Total)

### Core Tables (9)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (admin/teacher/parent) |
| `teachers` | Teacher profiles, languages, teaching cities |
| `students` | Student profiles, parent info (encrypted) |
| `enrollments` | Recurring class commitments |
| `enrollment_exceptions` | Cancellations, reschedules, holidays |
| `class_completions` | Class delivery proof + notes |
| `system_closures` | Holidays, FÉRIAS, weather closures |
| `leads` | Pre-enrollment pipeline |
| `audit_log` | Security and compliance events |

### Scheduling & Travel (7)

| Table | Purpose |
|-------|---------|
| `teacher_availability` | Declared LIVRE slots |
| `teacher_day_zones` | Per-day city/zone assignments |
| `slot_reservations` | 5-minute slot holds |
| `slot_offers` | Waitlist slot offers |
| `travel_time_cache` | Cached driving times (30-day expiry) |
| `travel_time_errors` | Geocoding error tracking |
| `zone_travel_matrix` | Pre-calculated zone-to-zone times |

### Notifications & History (4)

| Table | Purpose |
|-------|---------|
| `notifications` | User notification system |
| `enrollment_status_history` | Status transition audit trail |
| `teacher_time_off_requests` | Vacation/sick requests |
| `pausado_requests` | Parent pause requests |

### Payment & Subscription (7) - Epic 8

| Table | Purpose |
|-------|---------|
| `subscription_plans` | Plan templates (monthly/semester/annual) |
| `subscriptions` | Active student subscriptions |
| `stripe_customers` | User → Stripe customer mapping |
| `reschedule_credits` | Monthly reschedule credits |
| `one_time_payments` | PIX/Boleto payments |
| `payment_transactions` | Payment audit log |

### Cancellation Billing (4) - Epic 7

| Table | Purpose |
|-------|---------|
| `cancellation_charges` | Late cancellation fees |
| `cancellation_pending_choices` | Group rate change choices |
| `location_change_requests` | Location host workflow |
| `location_change_responses` | Parent approval responses |

### Other Tables (6)

| Table | Purpose |
|-------|---------|
| `sessions` | Server-side session storage |
| `parent_links` | Link OAuth emails to students |
| `change_requests` | Profile change approvals |
| `teacher_credits` | Gamification points |
| `teacher_credit_events` | Credit event history |
| `address_cache` | Geocoded address cache |

### Key Status Values

| Table | Field | Valid Values |
|-------|-------|--------------|
| `enrollments` | status | WAITLIST, ATIVO, PAUSADO, AVISO, INATIVO |
| `students` | status | ATIVO, AULA_TESTE, PAUSADO, AVISO, INATIVO |
| `enrollment_exceptions` | exception_type | CANCELLED_STUDENT, CANCELLED_TEACHER, CANCELLED_ADMIN, RESCHEDULED, RESCHEDULED_BY_STUDENT, RESCHEDULED_BY_TEACHER, HOLIDAY |
| `class_completions` | status | COMPLETED, NO_SHOW |
| `leads` | status | AGUARDANDO, EM_ANALISE, WAITLIST, CONTRACTED, NOT_A_MATCH |

---

## Extra Features Implemented (Beyond PRD)

These features were built during implementation but aren't in the original PRD. They enhance the core system.

### Admin Tools

| Feature | Page/API | Purpose |
|---------|----------|---------|
| **Time-Off System** | `/admin/time-off-approvals` | Teachers request vacation/sick days, admin approves, system auto-handles affected classes |
| **Account Links** | `/admin/*-links` | Flexible OAuth - parents/teachers can use any Google/Microsoft email |
| **Scheduling Analytics** | `/admin/scheduling-analytics` | Hot times dashboard - demand vs supply analysis for recruitment |
| **Travel Error Resolution** | `/admin/travel-errors` | Diagnose/fix geocoding errors with inline editing |
| **Data Re-encryption** | `/admin/re-encrypt` | Key rotation tool for security compliance |
| **Bulk Import** | `/admin/import-data` | Import students from JSON with progress tracking |

### Teacher Enhancements

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **Start/Complete Class** | 2-step workflow | Teacher clicks "Start" → timer starts → "Complete" with notes |
| **Early Completion Tracking** | `completion_type`, `early_completion_reason` | Track why classes ended early (sick, no answer, etc.) |
| **Time-Off Requests** | Modal in schedule page | Request vacation/sick directly from schedule |
| **Day Zones** | Per-day city assignment | Optimize travel by working same area on same days |

### System Enhancements

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **Notifications** | `notifications` table + bell UI | In-app notifications for cancellations, approvals |
| **Group Billing** | `actual_rate`, `effective_group_size` | Variable pricing for group classes (2=R$110, 3+=R$90) |
| **Travel Time Cache** | `travel_time_cache` table | 30-day cache for driving times (Google Routes API) |
| **City-Specific Closures** | `city_id` in closures | Different holidays for different cities |
| **Makeup Tracking** | `makeup_for_exception_id` | Link makeup classes to original cancellation |

---

## Recent Changes

### 2026-01-31: Admin Calendar Edit, Color Picker, ICS Import

- **Event edit:** Edit button on detail modal opens creation form pre-populated. GET/PUT API endpoints. Instant open using client-side stored data (no fetch delay).
- **Color picker:** 10-swatch picker + auto option. `color` column on `admin_events` (migration 091). Applied across all view components.
- **Detail modal:** Read-only admin chip, removed "Fechar" button, wider modals (500px).
- **ICS import:** `POST /api/admin/import-calendar` + `scripts/import-ics.mjs`. Parses Google Calendar ICS exports, maps attendees to admin users, cleans descriptions. 334 events imported.
- **Week view:** Time range expanded from 07:00–21:00 to 00:00–24:00.
- **Expanded events:** `event_date`, `day_of_week`, `range_start`, `range_end` added to `ExpandedAdminEvent`.

### 2026-01-24: Enhanced Lead Scoring & Smart Categorization System

**Location Proximity Scoring:**
- New scoring weights: Same Building (40pts), Same Street (25pts), Same CEP (15pts), Same Neighborhood (10pts)
- `calculateLocationProximity()` compares lead address against existing students with active enrollments
- "Easy Win" detection when lead lives in same building as existing student

**Smart Categorization System:**
- 7 category tabs: Easy Wins, Need Teacher, Need Lead Availability, Too Far, No Language, Needs Data, Archived
- Filter chips for combinable filtering (70%+, 40-70%, Same Building, Same Street, Has Errors)
- Action column showing blocker type for each lead

**Easy Win Wizard:**
- 3-step guided wizard for high-potential leads
- Lightning bolt button (⚡) on Easy Win leads opens wizard
- Step 1: Match confirmation, Step 2: Slot selection, Step 3: Send contract

**Teacher Travel Method Preferences:**
- New columns: `travels_by_car`, `travels_by_walk`, `travels_by_transit`
- Travel mode buttons disable based on teacher preferences
- Per-enrollment travel mode selection

**Files:** `lead-readiness-service.ts`, `matching.ts`, `leads.astro`, `leads-page-client.ts`, `leads-page.css`, migration 081

---

### 2026-01-17: Address Fields Extended + Teacher Profile Enhancements

**Address Fields Extended to Students and Leads:**
- Added `address_number` and `address_complement` columns to students and leads tables
- Updated forms to use separate address fields (CEP, state, number, complement)
- Updated validation schemas and repositories

**Teacher Profile Page Redesign (`/teacher/profile`):**
- Full parity with admin edit modal: email, phone, birth date, address (with geocoding), languages, cities, teaching preferences, CPF, PIX key
- Critical change warnings for address/language/city changes
- Enrollment-based restrictions (grayed checkboxes) for active enrollments
- Admin notification on profile changes via NotificationService

**Location Services Standardization:**
- Completely removed LocationIQ, standardized on Google APIs
- Travel time now uses Google Routes Essentials (free tier)
- All geocoding uses Google Geocoding API

**Profile Changes Auto-Approval:**
- `/admin/approvals` → `/admin/profile-changes` (auto-approve with history)
- `/admin/pausado-approvals` shows history with timeline
- Address change alerts with confirmation dialogs

**Backup Restore via GitHub Actions:**
- New `restore-backup.yml` workflow for database restoration
- `deleted_backup_runs` table to track deleted backups
- Restore webhook for status updates

---

### 2026-01-15: Travel Time System Upgrade + Performance Optimization

**Google Routes API Integration:**
- Switched to Google Routes Essentials API for travel time calculations
- Tier 3 (estimate) visual indicator with orange/warning styling
- Auto-error logging + super admin notifications for travel issues
- Coordinate region validation (150km from Florianópolis)
- New error types: `ESTIMATE_USED`, `COORDS_OUT_OF_REGION`

**Performance Optimization (80% Faster):**
- Admin enrollments page: 6.7s → 1.4s TTFB
- On-demand suggestions loading (button instead of auto-load)
- Added `findByIdsMinimal()` and `findAllMinimal()` to skip PII decryption
- Parallelized page queries with `Promise.all()`
- Batched travel time API calls

---

### 2026-01-13: Historical Integrity & Feedback System

**Historical Integrity System:**
- New tables: `student_status_history`, `teacher_availability_history`
- Type 2 SCD pattern with valid_from/valid_to for point-in-time queries
- Auto-triggers to capture status changes
- Historical lock: Classes >30 days old cannot be edited

**Teacher Feedback System:**
- `feedback_status` (PENDING/SUBMITTED/SKIPPED) on class completions
- Feedback bonus window (24h for +1 credit point)
- New API: `POST /api/completions/[id]/feedback`, `POST /api/completions/[id]/no-show`
- Cron endpoint for feedback penalties

**Teacher Cancellations Auto-Approval:**
- Cancellations auto-approved without admin review
- Uses `system-auto` or `system-auto-sick` tags
- Notifications sent immediately to admins and parents

---

### 2026-01-12: Trial Tracking System

**AULA_TESTE Trial Period Tracking:**
- New columns: `trial_started_at`, `trial_contract_status`, `trial_contract_sent_at`
- 30-day trial period with 7-day warning
- Contract types: MONTHLY, SEMESTER (10% off), ANNUAL (15% off)
- Accept/Decline workflow transitions to ATIVO/INATIVO
- "Aula Teste" tab in Users page for trial management
- New APIs: `/api/trial-contracts` endpoints

---

### 2026-01-10: Backup Management & Student Status UX (Session 179)

**Backup Management System:**
- Created Kinsta-style backup management page at `/admin/backups`
- Four backup types: Full, Core Data, Configuration, Financial
- Manual backup creation with descriptions
- Backup history with restore functionality
- Integration with existing GitHub Actions daily backup

**Student Status 3-Dot Menu:**
- Replaced checkbox-based status controls with 3-dot action menu on student cards
- Menu shows status options with current status disabled
- Immediate status application on menu selection
- Larger student cards (56px), avatars (40px), fonts (16px)

**New Features:**
- `backup_metadata` table for tracking manual backups
- `POST /api/backups` - Create manual backup
- `GET /api/backups` - List all backups
- `GET /api/backups/status` - Get backup status and statistics
- `POST /api/backups/restore` - Restore from backup

---

### 2026-01-10: Class Format & Location Improvements (Sessions 177-178)

**Location/Format Change Modals:**
- Added confirmation flows for class location and format changes in enrollment edit modal
- Location change notification system with date picker for effective date
- Format change validation (prevents group → individual if >1 active member)
- Online badge displayed for Online classes (blue video camera icon)
- Online classes skip travel time calculations

**Format Consistency Fixes:**
- Fixed data consistency between `class_format` and `group_id` in enrollments table
- Updated add-to-group/remove-from-group APIs to maintain consistency
- Fixed 18+ enrollments with inconsistent data

**Class Mode Refactoring:**
- Split legacy `class_mode` into two separate fields: `class_location` and `class_format`
- Added type guards: `isOnline()`, `isPresencial()`, `isGroup()`, `isIndividual()`
- Migration 057 with CHECK constraints
- Updated all services, repositories, components, and tests

---

### 2026-01-06: Epic 6 Complete + Epic 7/8 Progress (Sessions 140-148)

**Epic 6 Complete (11/11 Stories):**
- ✅ Story 6.11: Relocation Impact Analysis - Impact preview when teacher/student moves
- ✅ Story 6.10: Teacher Credit Gamification - Tier system with progress tracking
- ✅ Story 6.9: Waitlist Auto-Matching - Ghost tracking + offer status
- ✅ Story 6.8: Group Class Dynamic Pricing - Rate change notifications
- ✅ Story 6.7: AI-Powered Rescheduling Suggestions - Smart slot suggestions

**Epic 7 Complete (9/9 Stories, WhatsApp deferred):**
- ✅ Cancellation System Redesign - 24h billing, sick exemptions, group cascade
- ✅ Parent Cancel-Class integration with GroupCancellationService
- ✅ Location change workflow for group classes
- ✅ Story 7.7: Parent Reschedule Slot Picker - Multi-step modal with slot picker
- ✅ Story 7.8: Makeup Class Tracking UI - Visual indicators in teacher/parent/admin views

**Epic 8 Progress (11/12 Stories):**
- ✅ Story 8.1-8.6: Stripe SDK, Database, Service Layer, Webhooks, API, Payment Methods
- ✅ Story 8.8: Parent Subscription UI - Billing pages, plan selector, payment methods
- ✅ Story 8.9-8.10: Auto-Completion Cron + Teacher Confirmation UI
- ✅ Story 8.11-8.12: Admin Billing Dashboard + Payment Reminders
- ⏳ Story 8.7: PIX One-Time Payments (pending)

**New Features:**
- `/parent/cancel-choice.astro` - Rate change decision UI
- `/parent/location-change.astro` - Location approval UI
- `GroupCancellationService` - 24h billing + sick exemptions
- `LocationChangeService` - Location host workflow
- SuperSign API research for contract signing

---

### 2026-01-03: Story 6.9 Waitlist Auto-Match Complete (Session 120)

**Slot Offer System with Teacher Approval:**
- Offers workflow: `pending_teacher` → teacher approves → `pending` → family accepts → `accepted`
- Teacher approval UI on `/teacher/schedule` page
- Admin panels: "Aguardando Professora" and "Aguardando Família" sections
- Accept action auto-creates student + enrollment
- Decline/ghost tracking for lead prioritization

**New API Endpoints:**
- `POST /api/offers` - Create offer from suggestion
- `GET /api/offers` - List offers by teacher/status
- `PUT /api/offers/[id]` - Actions: teacher_approve, teacher_reject, accept, decline, ghost

**Database Migration:**
- `037_slot_offers.sql` - slot_offers table
- `038_offer_teacher_approval.sql` - Added pending_teacher, rejected_teacher statuses

---

### 2025-12-27: Teacher Invoice UX Redesign (Session 39)

**Major UX Overhaul of `/teacher/invoice`:**
- Hero section with trend indicator (% change vs previous month)
- Smart month picker dropdown with year navigation
- 5 KPI cards: total classes, avg/class, best day (trophy), YTD, projection
- Tier progression visualization with labeled progress track (0-1000)
- Calendar heatmap with earnings intensity levels
- YTD bar chart with clickable month navigation
- Enhanced day-by-day details with collapsible sections

**Deployment:** https://66f8bde6.eduschedule-app.pages.dev

---

### 2025-12-21: Teacher Portal Overhaul (Sessions 22-23)

**Dashboard Redesign (`/teacher`):**
- Added "Next Class" card showing today's or tomorrow's upcoming class
- Class action buttons: Iniciar Aula (start), Concluir Aula (complete), Cancelar
- PRD-compliant button visibility (confirm only today's classes, cancel only future)
- Added earnings stat card (estimated monthly earnings)
- Fixed locale (`pt-BR`) and status check (`ATIVO`)
- New `teacher-dashboard-client.ts` for button interactions

**Availability Page Fixes (`/teacher/availability`):**
- Fixed edit button visibility (uses `style.display` instead of CSS class)
- Added quick-fill buttons: ☀️ Manhã (8-12), 🍽️ Almoço (12-14), 🌙 Tarde (14-19), 🧹 Limpar
- Individual/Group slot color differentiation: Purple (#9796ca) / Coral (#e85d44)
- **Fixed group slots to show ALL student names** (slot-service populates `studentNames` array)
- Group slots show up to 2 student names + "+N more"

**Schedule Page Fixes (`/teacher/schedule`):**
- Time-off request now reloads page after successful submission
- **Fixed button visibility:** Iniciar only current, Cancelar only future, Concluir for past/started
- **Added Falta (NO_SHOW) button** for marking absent students
- closeModal exposed globally (fixes onclick handlers)
- Button text translated to Portuguese

### 2025-12-21: Page Optimization & Code Quality

**Client-Side Script Extractions (14 TypeScript modules created):**

Extracted inline JavaScript from Astro pages to typed TypeScript modules in `src/scripts/`:

| Page/Component | Before | After | Reduction |
|----------------|--------|-------|-----------|
| leads.astro | 5,216 | 3,650 | 30% |
| users.astro | 3,042 | 1,483 | 51% |
| WeeklyScheduleGrid.astro | 3,507 | 2,389 | 32% |
| AddressForm.astro | 1,803 | 1,036 | 43% |
| SmartBookingModal.astro | 1,657 | 890 | 46% |
| teacher/schedule.astro | 1,810 | 1,235 | 32% |
| teacher/availability.astro | 1,605 | 1,222 | 24% |
| parent/schedule.astro | 1,227 | 744 | 39% |
| travel-errors.astro | 1,366 | 1,064 | 22% |
| availability-approvals.astro | 926 | 569 | 39% |
| approvals.astro | 679 | 318 | 53% |
| settings.astro | 630 | 372 | 41% |
| pending-cancellations.astro | 625 | 355 | 43% |
| theme-editor.astro | 2,504 | 1,972 | 21% |

**Benefits:**
- ~9,500 lines removed from Astro pages
- 17 typed TypeScript modules (~13,900 lines total)
- Vite bundles modules for optimal client-side loading
- Pattern: hidden inputs → module import → `initPage(config)`

**CSS Variable Fixes (34 violations fixed):**
- Fixed `--text-primary` → `--color-text`
- Fixed `--text-secondary` → `--color-text-light`
- Fixed `--text-muted` → `--color-text-muted`
- Fixed `--bg-secondary` → `--color-surface`
- Files: parent/schedule.astro, parent/invoice.astro, parent/history.astro

**Performance Optimization:**
- Fixed N+1 queries in schedule-generator.ts (90% query reduction)
- Added shared-utils.js for client-side date formatting

### 2025-12-17: Comprehensive Documentation Audit

**Findings from parallel agent audit (4 agents):**

1. **Pages:** 26 implemented vs 17 documented (+53%)
2. **API Endpoints:** 80+ implemented vs ~30 documented
3. **Database Tables:** 22 total (11 added via migrations)
4. **All 52 FRs:** Verified implemented ✅
5. **PRD Alignment:** 95%+ (core innovation fully working)

### Data Model Hardening Complete (21 Issues Resolved)

**Phase 1-6 all completed:**
- Cascade delete triggers (prevent orphaned records)
- Unique index for reschedule conflict prevention
- Status transition validation in service layer
- Minute-based slot blocking (was hour-based)
- Performance indexes for PAUSADO/AVISO queries
- Status history table for compliance tracking

### Database Enhancements

- `enrollment_status_history` table with triggered_by tracking
- 6 database triggers for data integrity
- 4 performance indexes for auto-transition queries
- Unique index prevents double-booking via reschedules

### Service Layer Improvements

- Status transition validation via VALID_STATUS_TRANSITIONS
- PAUSADO cooldown enforcement with PausadoCooldownError
- effective_group_size calculated from database (not client)
- findByEnrollmentAndDate for improved validation

See [Archive History](./archive/ARCHIVE-HISTORY.md) for complete project history and implementation details.

---

## Knowledge Registry

Where to find and store different types of information:

### Where to FIND Knowledge

| Knowledge Type | Primary Source | Secondary |
|----------------|----------------|-----------|
| **What to build (requirements)** | `planning/prd.md` | `planning/epics.md` |
| **How to build (architecture)** | `architecture.md` | `reference/api-contracts.md` |
| **Business rules (enrollment)** | `planning/enrollment-rules-comprehensive.md` | `reference/business-context.md` |
| **Database schema** | `reference/data-models.md` | Code: `database/migrations/` |
| **Cross-cutting features** | `reference/feature-maps.md` | Change impact analysis |
| **API endpoints** | `reference/api-contracts.md` | Code: `src/pages/api/` |
| **UI patterns** | `reference/design-system-architecture.md` | Code: `src/components/` |
| **System flows** | `reference/application-flows-v3.md` | Code: `src/lib/services/` |
| **Phase 2 roadmap** | `planning/epic-6-*.md`, `epic-7-*.md`, `epic-8-*.md` | `planning/architecture-booking-optimizer.md` |
| **Session context** | `../eduschedule-app/project-context.md` | This file |
| **Cloudflare patterns** | `../eduschedule-app/CLOUDFLARE_CODING_STANDARDS.md` | - |
| **Project history** | `archive/ARCHIVE-HISTORY.md` | - |

### Where to REGISTER New Knowledge

| When you... | Update this file |
|-------------|------------------|
| Add new feature/FR | `planning/prd.md` (add FR), then `planning/epics.md` (add story) |
| Add new API endpoint | `reference/api-contracts.md` |
| Add new database table | `reference/data-models.md` |
| Add new page/route | This file (`index.md`) - Application Routes section |
| Change architecture | `architecture.md` |
| Add new component | `reference/design-system-architecture.md` |
| Complete session work | `../eduschedule-app/project-context.md` (Recent Changes) |
| Complete major milestone | This file (`index.md`) - Recent Changes section |

### Document Hierarchy

```text
CLAUDE.md (AI instructions)
    ↓ points to
project-context.md (session context - SINGLE SOURCE OF TRUTH)
    ↓ points to
docs/index.md (documentation map - THIS FILE)
    ↓ branches to
├── planning/*.md (requirements, roadmap)
├── reference/*.md (technical specs)
├── testing/*.md (QA checklists)
└── architecture.md (system design)
```

---

## Quick Links

- **App Code:** `../eduschedule-app/`
- **Native Shell:** `../native-shell/` (iOS/Android wrapper)
- **Production:** <https://eduschedule-app.pages.dev>
- **Project Context:** `../eduschedule-app/project-context.md`
- **BMAD Framework:** `../.bmad/`

---

**Last Updated:** 2026-01-24 (Enhanced Lead Scoring & Easy Win Wizard, Teacher Travel Methods)
