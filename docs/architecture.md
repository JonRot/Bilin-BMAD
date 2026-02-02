---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'production-ready'
completedAt: '2025-12-07'
lastUpdated: '2025-12-17'
inputDocuments:
  - docs/prd.md
  - eduschedule-app/project-context.md
  - docs/data-models.md
  - docs/api-contracts.md
  - eduschedule-app/README.md
  - eduschedule-app/docs/TESTING-CHECKLIST.md
workflowType: 'architecture'
lastStep: 0
project_name: 'Bilin'
user_name: 'Jonathan'
date: '2025-12-07'
hasProjectContext: true
---

# Architecture Decision Document - EduSchedule Pro Enrollment System

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements Summary:**
The PRD defines 52 functional requirements across 8 capability areas, centered on the **enrollment-first paradigm** where enrollments are persistent entities and class instances are ephemeral.

| Capability Area | FR Count | Core Architectural Need |
|-----------------|----------|------------------------|
| Enrollment Management | 9 | State machine, CRUD, automation triggers |
| Class Instance Management | 9 | Generated entities, status tracking |
| Teacher Schedule & Availability | 6 | Computed views, slot visibility |
| Parent Dashboard | 5 | Read-only views with child linkage |
| Lead Management | 7 | Import pipeline, matching workflow |
| Slot & Conflict Management | 5 | Real-time constraint enforcement |
| Status Lifecycle | 5 | State transitions, countdown automation |
| User Auth & Roles | 6 | Role-based data filtering |

**Non-Functional Requirements Driving Architecture:**

| NFR | Architectural Implication |
|-----|--------------------------|
| NFR13: Slot status always consistent | Transactional updates, no eventual consistency |
| NFR15: PAUSADO auto-return reliable | Lazy evaluation on access (no Cloudflare cron on free tier) |
| NFR17: Atomic enrollment operations | Database transactions required |
| NFR18-20: Calendar as display layer | Enrollment is source of truth, calendar syncs from it |

### Scale & Complexity Assessment

**Project Complexity:** Medium-High

**Complexity Drivers:**
- Enrollment state machine with 6+ statuses and business rules
- Slot blocking logic that must never drift from enrollment state
- PAUSADO automation with 3-week countdown and 5-month cooldown
- Lead → Enrollment conversion with matching workflow
- Multi-role access patterns (admin full, teacher/parent filtered)

**Technical Domain:** Full-stack SSR web application (Astro 5 + Cloudflare Pages + D1)

**Scale Indicators:**
- Users: ~100 (12 teachers, 89 students/parents, admins)
- Enrollments: ~100 active at any time
- Class instances: ~400/month generated
- Database queries: <1000/day initially

### Platform Decision

**Decision: Stay on Cloudflare with clean abstractions**

**Rationale:**
- Current scale (100 users, 1000 queries/day) well within Cloudflare free tier
- Existing infrastructure (auth, security, D1) already working
- Platform migration would consume 2-3 weeks with minimal benefit
- Clean abstractions enable future migration in 1-2 weeks if needed

**Trade-offs accepted:**
- No native mobile app (web responsive for now)
- No push notifications (WhatsApp integration planned for Phase 2)
- No real-time subscriptions (page refresh acceptable)
- PAUSADO automation via lazy evaluation, not cron jobs

**Future migration path:**
- If needed: Supabase + React Native in 4-6 months
- Repository pattern makes database swap straightforward
- Business logic in pure TypeScript transfers anywhere

### Technical Constraints & Dependencies

**Platform Constraints (Cloudflare Workers):**
- No persistent background jobs (no cron on free tier)
- 10ms CPU time per request limit
- No Node.js crypto (Web Crypto API only)
- Runtime binding for D1 access (`locals.runtime.env.DB`)
- D1 loop query issue: same query in a loop returns results only on first iteration (cache before loop - see `CLOUDFLARE_CODING_STANDARDS.md`)

**Existing System Integration:**
- Preserve: users, teachers, students tables (extend, don't replace)
- Preserve: Google OAuth flow (Arctic library)
- Preserve: Session encryption (AES-256-GCM)
- Preserve: BILIN Design System components

**Data Format Standards:**
- Dates: DD/MM/YYYY format (Brazilian standard)
- Timestamps: Unix integers
- Encrypted fields: PII using AES-256-GCM

### Cross-Cutting Concerns

1. **Status State Machine**
   - Affects: enrollments, slots, class instances
   - Valid transitions enforced at service layer
   - PAUSADO→ATIVO automation via lazy evaluation on data access

2. **Slot Blocking Consistency**
   - LIVRE/BLOCKED computed from enrollment state (not stored separately)
   - Conflict prevention at enrollment creation time
   - No drift possible when computed on-demand

3. **Audit Trail**
   - All enrollment changes logged to audit_log
   - Status transitions tracked with timestamps and actor
   - Extend existing audit_log table with enrollment actions

4. **Role-Based Data Filtering**
   - Admin: sees all data
   - Teacher: sees own enrollments and schedule
   - Parent: sees own children's enrollments only
   - Enforced at repository layer

5. **Lazy Automation (PAUSADO)**
   - On every enrollment access: check if PAUSADO > 3 weeks
   - If yes: auto-transition to ATIVO, set cooldown
   - No external scheduler needed

### Future Capability: Intelligent Slot Suggestions

**Not for Jan 5, but informs data model:**

The system should eventually suggest optimal slot assignments by analyzing:
- Teacher's LIVRE slots (computed from enrollments)
- Geographic clustering (minimize travel)
- Lead's availability windows
- Travel time constraints

**Data model implications:**
- Store student/enrollment location (address or neighborhood)
- Track teacher's daily schedule sequence
- Foundation for zone matrix in Phase 2

### Architectural Approach: Clean Abstractions

**Code Organization for Portability:**

```
src/lib/
├── repositories/           # Database abstraction layer
│   ├── types.ts            # Interfaces (platform-agnostic)
│   └── d1/                 # Cloudflare D1 implementations
│       ├── enrollment.ts
│       ├── class-instance.ts
│       └── lead.ts
│
├── services/               # Pure business logic (no platform code)
│   ├── enrollment-service.ts
│   ├── slot-service.ts
│   ├── status-machine.ts
│   └── lead-matching.ts
│
└── platform/               # Cloudflare-specific utilities
    ├── runtime.ts
    └── auth.ts
```

**Benefits:**
- Business logic testable without database
- Repository swap enables platform migration
- Clear boundary between "what" and "how"

### Architectural Decisions Required

Based on this analysis, key decisions for next steps:

1. **Data Model:** How do enrollments, class_instances, and slots relate?
2. **Slot Computation:** Computed on-demand from enrollments (not stored)
3. **PAUSADO Automation:** Lazy evaluation on access
4. **Class Instance Generation:** On-demand for N weeks ahead when viewing schedule
5. **Calendar Sync:** Push to Google Calendar on enrollment changes
6. **Lead Storage:** Separate `leads` table with status tracking

## Starter Template Evaluation

### Primary Technology Domain

**Existing Full-Stack SSR Web Application** - This is a brownfield redesign, not a greenfield project.

### Starter Decision: Extend Existing Codebase

**Decision:** No new starter template - build enrollment system on existing foundation

**Rationale:**
- Existing Astro 5 + Cloudflare application is 85-90% complete
- Working infrastructure: Auth, security, deployment, database
- BILIN Design System components ready for use
- Starting fresh would discard 2+ months of working code

### Existing Technical Stack (Preserved)

| Layer | Technology | Version | Status |
|-------|------------|---------|--------|
| **Framework** | Astro | 5.x | ✅ Working |
| **Language** | TypeScript | Latest | ✅ Configured |
| **Runtime** | Cloudflare Workers | Latest | ✅ Deployed |
| **Database** | Cloudflare D1 (SQLite) | Latest | ✅ Working |
| **Session Store** | Cloudflare KV | Latest | ✅ Working |
| **Auth** | Arctic (Google OAuth) | 3.7.0 | ✅ Working |
| **Validation** | Zod | 3.x | ✅ Working |
| **Calendar API** | Google Calendar | Latest | ✅ Working |

### New Modules to Add

**Database:**
- `enrollments` table
- `class_instances` table
- `leads` table
- Migration scripts for new schema

**API Routes:**
- `/api/enrollments/*` - Enrollment CRUD
- `/api/instances/*` - Class instance management
- `/api/leads/*` - Lead management
- `/api/slots/*` - Slot availability queries

**Business Logic (Clean Architecture):**
```
src/lib/
├── repositories/
│   ├── types.ts
│   └── d1/
│       ├── enrollment.ts
│       ├── class-instance.ts
│       └── lead.ts
├── services/
│   ├── enrollment-service.ts
│   ├── slot-service.ts
│   ├── status-machine.ts
│   └── lead-matching.ts
└── platform/
    └── runtime.ts
```

**Pages:**
- `/admin/enrollments` - Enrollment management
- `/admin/leads` - Lead pipeline
- `/teacher/schedule` - Schedule from enrollments
- `/parent/classes` - Class history view

### Development Commands (Existing)

```bash
# Development
npm run dev              # Local dev server
npm run dev:remote       # With production D1

# Build & Deploy
npm run build
npx wrangler pages deploy build-output --project-name=eduschedule-app

# Database
npx wrangler d1 execute eduschedule-db --remote --file=./database/enrollments.sql
```

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Data Model: Hybrid (Exception-Based + Completions) ✅
2. Slot Computation: On-demand from enrollments ✅
3. PAUSADO Automation: Lazy evaluation on access ✅
4. Platform: Cloudflare (D1 + Pages + KV) ✅

**Important Decisions (Shape Architecture):**
1. Code Organization: Repository + Service pattern ✅
2. Calendar Integration: Push to Google Calendar on changes ✅
3. System Closures: Separate table for FÉRIAS/holidays ✅

**Deferred Decisions (Post-MVP):**
1. Zone matrix for travel optimization
2. Teacher credit gamification
3. WhatsApp integration
4. Payment processing

### Data Architecture

#### Decision: Hybrid Data Model (Exception-Based + Completions)

**Rationale:** Enrollments are recurring commitments. Instead of generating 52 instances per year, we store only:
- The enrollment rule (recurring schedule)
- Exceptions (what's different from the rule)
- Completions (proof of delivery with teacher notes)

**Benefits:**
- Minimal storage (exceptions are rare, ~5-10 per enrollment/year)
- FÉRIAS handled at system level (one record covers date range)
- Clean separation: scheduling vs history
- Invoice = count completions (simple, accurate)

#### Database Schema

```sql
-- CORE: Enrollments (the recurring commitment)
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  teacher_id TEXT NOT NULL REFERENCES teachers(id),

  -- Recurrence rule
  day_of_week INTEGER NOT NULL,         -- 0=Sunday, 1=Monday, etc.
  start_time TEXT NOT NULL,             -- "14:00"
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  recurrence_start_date TEXT NOT NULL,  -- When enrollment began (YYYY-MM-DD)

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'ATIVO',
  -- Values: WAITLIST, ATIVO, PAUSADO, AVISO, INATIVO

  -- PAUSADO tracking
  pausado_started_at INTEGER,
  pausado_cooldown_until INTEGER,

  -- Class details
  language TEXT NOT NULL,               -- 'Inglês', 'Espanhol'
  location_encrypted TEXT,              -- Student address
  hourly_rate INTEGER,                  -- R$ per class

  -- Metadata
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  terminated_at INTEGER
);

-- EXCEPTIONS: What's different from the rule
CREATE TABLE enrollment_exceptions (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id),

  exception_date TEXT NOT NULL,         -- YYYY-MM-DD
  exception_type TEXT NOT NULL,
  -- Values: CANCELLED_STUDENT, CANCELLED_TEACHER, RESCHEDULED, HOLIDAY

  -- Reschedule details
  rescheduled_to_date TEXT,
  rescheduled_to_time TEXT,

  -- Context
  reason TEXT,
  created_by TEXT NOT NULL,             -- 'student', 'teacher', 'admin', 'system'
  approved_by TEXT,
  approved_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- COMPLETIONS: Proof of delivery
CREATE TABLE class_completions (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id),

  class_date TEXT NOT NULL,             -- YYYY-MM-DD
  class_time TEXT NOT NULL,             -- "14:00"

  status TEXT NOT NULL DEFAULT 'COMPLETED',
  -- Values: COMPLETED, NO_SHOW

  notes TEXT,                           -- What was taught

  -- Makeup tracking
  is_makeup INTEGER DEFAULT 0,
  makeup_for_date TEXT,

  google_event_id TEXT,
  completed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- SYSTEM: Holiday/FÉRIAS periods
CREATE TABLE system_closures (
  id TEXT PRIMARY KEY,

  closure_type TEXT NOT NULL,           -- 'HOLIDAY', 'FERIAS'
  name TEXT NOT NULL,                   -- 'Christmas Break'

  start_date TEXT NOT NULL,             -- YYYY-MM-DD
  end_date TEXT NOT NULL,               -- YYYY-MM-DD

  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- LEADS: Pre-enrollment pipeline
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'AGUARDANDO',
  -- Values: AGUARDANDO, EM_ANALISE, WAITLIST, CONTRACTED, NOT_A_MATCH

  -- Parent info
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT,
  parent_instagram TEXT,
  parent_cpf_encrypted TEXT,

  -- Student info
  student_name TEXT NOT NULL,
  student_birth_date TEXT,
  student_needs TEXT,
  student_allergies TEXT,
  student_in_school INTEGER,

  -- Location
  address_encrypted TEXT,
  neighborhood TEXT,                    -- For matching (not encrypted)
  city TEXT DEFAULT 'Florianópolis',

  -- Preferences
  class_mode TEXT,
  language TEXT,
  availability_windows TEXT,            -- JSON

  -- Referral
  referral_source TEXT,
  referral_detail TEXT,

  -- Matching & Conversion
  matched_teacher_id TEXT REFERENCES teachers(id),
  matched_at INTEGER,
  rejection_reason TEXT,
  converted_to_enrollment_id TEXT REFERENCES enrollments(id),
  converted_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- INDEXES
CREATE INDEX idx_enrollments_teacher ON enrollments(teacher_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_day ON enrollments(day_of_week);

CREATE INDEX idx_exceptions_enrollment ON enrollment_exceptions(enrollment_id);
CREATE INDEX idx_exceptions_date ON enrollment_exceptions(exception_date);

CREATE INDEX idx_completions_enrollment ON class_completions(enrollment_id);
CREATE INDEX idx_completions_date ON class_completions(class_date);

CREATE INDEX idx_closures_dates ON system_closures(start_date, end_date);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_neighborhood ON leads(neighborhood);
```

#### Entity Relationships

```
students (existing)
    │
    └──< enrollments >──┐
            │           │
            │           teachers (existing)
            │
    ┌───────┴───────┐
    │               │
enrollment_     class_
exceptions      completions


system_closures (applies to all enrollments)

leads ──(converts to)──> enrollments
```

### Schedule Generation Logic

**Algorithm:** Generate schedule from enrollment rule, apply exceptions and closures.

```typescript
function getScheduleForWeek(teacherId: string, weekStart: Date): ScheduleItem[] {
  // 1. Get ATIVO/PAUSADO enrollments for teacher
  const enrollments = getEnrollmentsByTeacher(teacherId, ['ATIVO', 'PAUSADO'])

  // 2. Get system closures for this week
  const closures = getSystemClosures(weekStart, weekEnd)

  // 3. For each enrollment, generate scheduled date
  const schedule = []
  for (const enrollment of enrollments) {
    const classDate = getDateForDayOfWeek(weekStart, enrollment.day_of_week)

    // Check system closure
    if (isDateInClosure(classDate, closures)) {
      schedule.push({ ...enrollment, date: classDate, status: 'CLOSURE' })
      continue
    }

    // Check individual exception
    const exception = getException(enrollment.id, classDate)
    if (exception) {
      schedule.push({ ...enrollment, date: classDate, status: exception.type, exception })
      continue
    }

    // Check PAUSADO status
    if (enrollment.status === 'PAUSADO') {
      schedule.push({ ...enrollment, date: classDate, status: 'PAUSADO' })
      continue
    }

    // Default: scheduled
    schedule.push({ ...enrollment, date: classDate, status: 'SCHEDULED' })
  }

  return schedule
}
```

### Slot Availability Logic

**Decision:** Computed on-demand from enrollments (not stored).

```typescript
function getSlotStatus(teacherId: string, dayOfWeek: number, time: string): 'LIVRE' | 'BLOCKED' {
  const enrollment = findEnrollment({
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    start_time: time,
    status: ['ATIVO', 'PAUSADO']  // Both block the slot
  })
  return enrollment ? 'BLOCKED' : 'LIVRE'
}
```

**Rationale:** No drift possible between enrollment status and slot status when computed on-demand.

### PAUSADO Automation Logic

**Decision:** Lazy evaluation on enrollment access.

```typescript
function getEnrollmentWithAutoTransition(id: string): Enrollment {
  const enrollment = db.getEnrollment(id)

  // Check if PAUSADO needs auto-return
  if (enrollment.status === 'PAUSADO' && enrollment.pausado_started_at) {
    const threeWeeksAgo = Date.now() - (21 * 24 * 60 * 60 * 1000)

    if (enrollment.pausado_started_at < threeWeeksAgo) {
      // Auto-transition to ATIVO
      enrollment.status = 'ATIVO'
      enrollment.pausado_cooldown_until = Date.now() + (5 * 30 * 24 * 60 * 60 * 1000) // 5 months
      db.updateEnrollment(enrollment)
      auditLog('PAUSADO_AUTO_RETURN', enrollment.id, 'system')
    }
  }

  return enrollment
}
```

**Rationale:** No cron jobs needed on Cloudflare free tier. Transition happens on next access.

### Invoice Calculation Logic

**Decision:** Invoice = count completions for the period.

```typescript
function calculateInvoice(enrollmentId: string, startDate: Date, endDate: Date): Invoice {
  const completions = getCompletions(enrollmentId, startDate, endDate)
  const completed = completions.filter(c => c.status === 'COMPLETED')

  const enrollment = getEnrollment(enrollmentId)

  return {
    enrollment_id: enrollmentId,
    period_start: startDate,
    period_end: endDate,
    classes_completed: completed.length,
    rate_per_class: enrollment.hourly_rate,
    total: completed.length * enrollment.hourly_rate,
    completions: completed
  }
}
```

### Authentication & Security

**Decision:** Preserve existing implementation.

| Component | Choice | Status |
|-----------|--------|--------|
| Auth Provider | Google OAuth 2.0 | ✅ Existing |
| OAuth Library | Arctic | ✅ Existing |
| Session Storage | Encrypted cookies (AES-256-GCM) | ✅ Existing |
| CSRF Protection | Token validation | ✅ Existing |
| PII Encryption | AES-256-GCM at application layer | ✅ Existing |
| Role-Based Access | admin/teacher/parent | ✅ Existing, extend for enrollments |

**New Security Considerations:**
- Enrollment data filtered by role at repository layer
- Teacher sees only their enrollments
- Parent sees only their children's enrollments
- Admin sees all

### API & Communication Patterns

**Decision:** REST API with existing patterns.

**New API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enrollments` | GET | List enrollments (filtered by role) |
| `/api/enrollments` | POST | Create enrollment |
| `/api/enrollments/[id]` | GET | Get single enrollment |
| `/api/enrollments/[id]` | PUT | Update enrollment |
| `/api/enrollments/[id]/status` | PUT | Change status (with validation) |
| `/api/enrollments/[id]/exceptions` | GET | List exceptions for enrollment |
| `/api/enrollments/[id]/exceptions` | POST | Create exception |
| `/api/enrollments/[id]/completions` | GET | List completions |
| `/api/enrollments/[id]/completions` | POST | Mark class complete |
| `/api/schedule/[teacherId]` | GET | Get teacher's generated schedule |
| `/api/slots/[teacherId]` | GET | Get teacher's LIVRE/BLOCKED slots |
| `/api/leads` | GET/POST | Lead management |
| `/api/leads/[id]` | GET/PUT | Single lead |
| `/api/leads/[id]/convert` | POST | Convert lead to enrollment |
| `/api/system/closures` | GET/POST | Manage FÉRIAS/holidays |

### Infrastructure & Deployment

**Decision:** Continue with existing Cloudflare setup.

| Component | Choice | Notes |
|-----------|--------|-------|
| Hosting | Cloudflare Pages | ✅ Existing |
| Database | Cloudflare D1 | Add new tables via migration |
| KV | Cloudflare KV | ✅ Existing (sessions) |
| Deployment | wrangler pages deploy | ✅ Existing |
| Environment | Dev/Preview/Production | ✅ Existing |

### Decision Impact Analysis

**Implementation Sequence:**
1. Database migrations (new tables)
2. Repository layer (enrollment, exception, completion, lead)
3. Service layer (enrollment-service, slot-service, status-machine)
4. API routes
5. Admin UI (enrollment management)
6. Teacher UI (schedule view)
7. Parent UI (class history)

**Cross-Component Dependencies:**
- Enrollments depend on existing students + teachers tables
- Exceptions and completions depend on enrollments
- Schedule generation depends on enrollments + exceptions + closures
- Slot availability depends on enrollments
- Invoice calculation depends on completions

## Runtime Business Configuration

### Overview

Business settings (57 values across 8 categories) are stored in the `business_config` DB table and editable via `/admin/settings`. Astro middleware loads all settings from DB once per request into `locals.config` as a typed, frozen `BusinessConfig` object.

### Architecture

```
Request → middleware.ts → loadBusinessConfig(db) → locals.config (BusinessConfig)
                                                      ↓
                                          Pages/APIs: Astro.locals.config / locals.config
                                          Services: passed as constructor/method param
                                          Client scripts: <div id="business-config"> → config-bridge.ts
```

### Key Files

| File | Role |
|------|------|
| `src/lib/runtime-business-config.ts` | `BusinessConfig` interface, `loadBusinessConfig()`, `createDefaultBusinessConfig()` |
| `src/middleware.ts` | Loads config per request, falls back to static defaults on error |
| `src/env.d.ts` | Declares `config: BusinessConfig` on `App.Locals` |
| `src/scripts/config-bridge.ts` | Client-side utility reading config from server-rendered DOM element |

### Patterns

- **Astro pages/components**: `const config = Astro.locals.config;` then use `config.propertyName`
- **API routes**: `const config = locals.config;` then use `config.propertyName`
- **Service classes**: Accept config via constructor, use instance property
- **Helper functions**: Optional config parameter with static constant as default
- **Client scripts**: Import `getConfigNumber()` from `config-bridge.ts`; parent page renders `<div id="business-config" data-config={JSON.stringify({...})} hidden>`
- **Fallback**: `createDefaultBusinessConfig()` returns static constants as defaults when DB is unavailable

### Config Categories

| Category | Properties | Example |
|----------|-----------|---------|
| `pricing_parent` | parentIndividualRate, parentGroupRate, etc. | 150, 125 |
| `pricing_teacher` | tierRates, tierStandardThreshold, etc. | ELITE: {individual: 80, group: 65} |
| `plan_discounts` | planDiscountMonthly, planDiscountSemester, etc. | 0, 10, 15 |
| `status_durations` | pausadoMaxDays, avisoMaxDays, trialDays, etc. | 21, 14, 30 |
| `billing_rules` | cancellationWindowHours, gracePeriodDays, etc. | 24, 7 |
| `travel_scheduling` | maxTravelMinutes, classDurationMinutes, etc. | 45, 60 |
| `lead_matching` | buildingWeight, streetWeight, etc. | 40, 25 |
| `data_retention` | trashPurgeDays, historicalLockDays, etc. | 90, 30 |

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 18 areas where AI agents could make different choices

These patterns ensure any AI agent working on this codebase produces compatible, consistent code.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural (`enrollments`, `class_completions`, `system_closures`)
- Columns: `snake_case` (`student_id`, `day_of_week`, `pausado_started_at`)
- Foreign keys: `{referenced_table_singular}_id` (`student_id`, `teacher_id`, `enrollment_id`)
- Indexes: `idx_{table}_{column}` (`idx_enrollments_teacher`, `idx_completions_date`)
- Primary keys: Always `id TEXT PRIMARY KEY`
- Timestamps: `{action}_at` as Unix integers (`created_at`, `updated_at`, `terminated_at`)

**API Naming Conventions:**
- Endpoints: `/api/{resource}` plural, kebab-case (`/api/enrollments`, `/api/class-completions`)
- Route parameters: `[id]` square bracket format (Astro convention)
- Nested resources: `/api/{parent}/[parentId]/{child}` (`/api/enrollments/[id]/exceptions`)
- Actions: `/api/{resource}/[id]/{action}` (`/api/leads/[id]/convert`)
- Query parameters: `snake_case` (`?teacher_id=...&status=ATIVO`)

**Code Naming Conventions:**
- Files: `kebab-case.ts` (`enrollment-service.ts`, `status-machine.ts`)
- Components: `PascalCase.astro` (`Button.astro`, `EnrollmentCard.astro`)
- Functions: `camelCase` (`getEnrollmentById`, `calculateInvoice`)
- Variables: `camelCase` (`teacherId`, `weekStart`)
- Constants: `SCREAMING_SNAKE_CASE` (`ENROLLMENT_STATUSES`, `MAX_PAUSADO_DAYS`)
- Types/Interfaces: `PascalCase` (`Enrollment`, `EnrollmentException`, `SlotStatus`)
- Repository classes: `{Entity}Repository` (`EnrollmentRepository`, `LeadRepository`)
- Service classes: `{Domain}Service` (`EnrollmentService`, `SlotService`)

### Structure Patterns

**Project Organization:**
```
src/lib/
├── repositories/           # Data access (one file per entity)
│   ├── types.ts            # All repository interfaces
│   └── d1/                 # D1 implementations
│       ├── enrollment.ts   # EnrollmentRepository
│       ├── exception.ts    # ExceptionRepository
│       ├── completion.ts   # CompletionRepository
│       └── lead.ts         # LeadRepository
├── services/               # Business logic (no DB/platform code)
│   ├── enrollment-service.ts
│   ├── slot-service.ts
│   ├── status-machine.ts
│   ├── schedule-generator.ts
│   └── lead-matching.ts
├── platform/               # Cloudflare-specific code
│   └── runtime.ts
└── validation/             # Zod schemas
    ├── enrollment.ts
    └── lead.ts

src/pages/
├── api/                    # API routes (match database entities)
│   ├── enrollments/
│   ├── leads/
│   ├── schedule/
│   └── slots/
├── admin/                  # Admin pages
├── teacher/                # Teacher pages
└── parent/                 # Parent pages

src/components/             # Reusable UI components
```

**File Structure Rules:**
- One repository per entity file
- One service per domain concept
- API routes mirror resource hierarchy
- Tests co-located: `enrollment-service.test.ts` next to `enrollment-service.ts`
- No `utils/` or `helpers/` folders - put utilities in relevant service
- No barrel exports (`index.ts`) - import directly from files

### Format Patterns

**API Response Formats:**

Success response (direct data, no wrapper):
```json
{
  "id": "enr_abc123",
  "student_id": "stu_xyz",
  "status": "ATIVO"
}
```

List response:
```json
{
  "items": [...],
  "total": 42
}
```

Error response:
```json
{
  "error": "ENROLLMENT_NOT_FOUND",
  "message": "Enrollment with id 'enr_abc' does not exist"
}
```

**Data Exchange Formats:**
- JSON fields: `snake_case` (matches database)
- Dates in API: `YYYY-MM-DD` string (ISO format for transport)
- Dates in UI: `DD/MM/YYYY` (Brazilian format for display)
- Timestamps: Unix integers (seconds, not milliseconds)
- Booleans: `true`/`false` (not 1/0)
- Null: explicit `null` (not empty string or undefined)
- IDs: prefixed UUIDs (`enr_`, `exc_`, `cmp_`, `led_`, `cls_`)

**Status Value Conventions:**
- All status values: `SCREAMING_SNAKE_CASE`
- Enrollment: `WAITLIST`, `ATIVO`, `PAUSADO`, `AVISO`, `INATIVO`
- Exception: `CANCELLED_STUDENT`, `CANCELLED_TEACHER`, `RESCHEDULED`, `HOLIDAY`
- Completion: `COMPLETED`, `NO_SHOW`
- Lead: `AGUARDANDO`, `EM_ANALISE`, `WAITLIST`, `CONTRACTED`, `NOT_A_MATCH`

### Communication Patterns

**Event/Action Naming:**
- Not using event bus for MVP
- Audit log entries: `{ENTITY}_{ACTION}` (`ENROLLMENT_CREATED`, `STATUS_CHANGED`)
- Form actions: `{verb}{Noun}` (`createEnrollment`, `markComplete`)

**State Management Patterns:**
- Server-side state only (SSR, no client-side store)
- Page props passed from Astro frontmatter
- Forms use native HTML forms with POST
- Toast notifications via existing `Toast.astro` component
- CSRF token in `X-CSRF-Token` header for all mutations

### Process Patterns

**Error Handling Patterns:**
```typescript
// Service layer: throw typed errors
throw new EnrollmentNotFoundError(enrollmentId)
throw new InvalidStatusTransitionError('ATIVO', 'WAITLIST')

// API layer: catch and format
try {
  const result = await enrollmentService.update(data)
  return new Response(JSON.stringify(result), { status: 200 })
} catch (error) {
  if (error instanceof EnrollmentNotFoundError) {
    return new Response(JSON.stringify({
      error: 'ENROLLMENT_NOT_FOUND',
      message: error.message
    }), { status: 404 })
  }
  throw error // Let global handler catch
}
```

**Validation Patterns:**
- Zod schemas for all input validation
- Validate at API boundary (pages/api/*)
- Services assume valid input
- Repository assumes valid + authorized input
```typescript
// In API route
const parsed = enrollmentSchema.safeParse(await request.json())
if (!parsed.success) {
  return new Response(JSON.stringify({
    error: 'VALIDATION_ERROR',
    message: parsed.error.issues[0].message
  }), { status: 400 })
}
```

**Loading State Patterns:**
- Astro SSR renders complete HTML
- Form submissions show browser loading indicator
- No client-side loading spinners for MVP
- Optimistic UI not used (page reload is acceptable)

**Role-Based Access Patterns:**
```typescript
// Check at start of every API route
const session = await getSession(locals)
if (!session) return unauthorizedResponse()

// Repository methods filter by role
function getEnrollments(userId: string, role: Role): Enrollment[] {
  if (role === 'admin') return getAllEnrollments()
  if (role === 'teacher') return getEnrollmentsByTeacher(userId)
  if (role === 'parent') return getEnrollmentsByParent(userId)
}
```

### Repository Pattern Rules

**Interface Definition (in types.ts):**
```typescript
interface IEnrollmentRepository {
  findById(id: string): Promise<Enrollment | null>
  findByTeacher(teacherId: string): Promise<Enrollment[]>
  findByStudent(studentId: string): Promise<Enrollment[]>
  create(data: CreateEnrollmentData): Promise<Enrollment>
  update(id: string, data: UpdateEnrollmentData): Promise<Enrollment>
  updateStatus(id: string, status: EnrollmentStatus): Promise<void>
}
```

**D1 Implementation (in d1/enrollment.ts):**
```typescript
export class D1EnrollmentRepository implements IEnrollmentRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<Enrollment | null> {
    const result = await this.db
      .prepare('SELECT * FROM enrollments WHERE id = ?')
      .bind(id)
      .first()
    return result ? this.mapToEnrollment(result) : null
  }
  // ... other methods
}
```

**Usage in Services:**
```typescript
// Service receives repository interface, not concrete implementation
export class EnrollmentService {
  constructor(
    private enrollmentRepo: IEnrollmentRepository,
    private exceptionRepo: IExceptionRepository
  ) {}
}
```

### Enforcement Guidelines

**All AI Agents MUST:**
1. Read existing code in the same domain before writing new code
2. Match existing patterns exactly (naming, structure, error handling)
3. Use prepared statements for ALL database queries (no string concatenation)
4. Pass `locals.runtime` to any function that needs database/env access
5. Add audit log entries for all enrollment state changes
6. Apply role-based filtering in repository layer, not in UI

**Pattern Verification:**
- Before committing: verify naming matches conventions above
- Check imports: should import from specific files, not barrels
- Check error handling: should use typed errors, not strings
- Check date formats: API uses YYYY-MM-DD, UI shows DD/MM/YYYY

### Pattern Examples

**Good Examples:**
```typescript
// ✅ Correct: snake_case column, proper prepared statement
const enrollment = await db
  .prepare('SELECT student_id, day_of_week FROM enrollments WHERE id = ?')
  .bind(enrollmentId)
  .first()

// ✅ Correct: Typed error with clear message
throw new InvalidStatusTransitionError(
  currentStatus,
  requestedStatus,
  `Cannot transition from ${currentStatus} to ${requestedStatus}`
)

// ✅ Correct: Repository filters by role
async findByRole(userId: string, role: Role): Promise<Enrollment[]> {
  if (role === 'admin') {
    return this.findAll()
  }
  return this.findByTeacher(userId)
}
```

**Anti-Patterns (NEVER DO):**
```typescript
// ❌ Wrong: camelCase column name
SELECT studentId FROM enrollments

// ❌ Wrong: String concatenation (SQL injection risk)
db.prepare(`SELECT * FROM enrollments WHERE id = '${id}'`)

// ❌ Wrong: Generic error (no type, no code)
throw new Error('Something went wrong')

// ❌ Wrong: Filtering in API route instead of repository
const allEnrollments = await repo.findAll()
const filtered = allEnrollments.filter(e => e.teacher_id === userId) // Too late!

// ❌ Wrong: Hardcoded status strings
enrollment.status = 'active' // Should be 'ATIVO'
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
eduschedule-app/
├── .env                          # Environment variables (local)
├── .env.example                  # Environment template
├── .gitignore
├── astro.config.mjs              # Astro configuration
├── package.json
├── package-lock.json
├── tsconfig.json
├── wrangler.toml                 # Cloudflare configuration
├── CLAUDE.md                     # AI assistant instructions
├── project-context.md            # Project documentation
├── CLOUDFLARE_CODING_STANDARDS.md
│
├── database/                     # Database migrations
│   ├── schema.sql                # Initial schema (existing tables)
│   ├── enrollments.sql           # NEW: Enrollment tables migration
│   ├── leads.sql                 # NEW: Leads table migration
│   └── indexes.sql               # Performance indexes
│
├── public/
│   ├── fonts/                    # Poligrapher Grotesk font files
│   │   ├── PoligrapherGrotesk-Regular.woff2
│   │   ├── PoligrapherGrotesk-Bold.woff2
│   │   └── PoligrapherGrotesk-Medium.woff2
│   └── assets/                   # Static images
│
├── src/
│   ├── env.d.ts                  # TypeScript environment definitions
│   ├── middleware.ts             # Astro middleware (config loading)
│   │
│   ├── lib/
│   │   ├── runtime-business-config.ts  # BusinessConfig interface + loader
│   │
│   ├── constants/                # Application constants
│   │   ├── index.ts              # Barrel export
│   │   ├── theme.ts              # BILIN design tokens
│   │   ├── config.ts             # App configuration
│   │   ├── api.ts                # API route constants
│   │   ├── ui.ts                 # UI strings/labels
│   │   └── enrollment-statuses.ts # NEW: Status constants
│   │
│   ├── components/               # BILIN Design System components
│   │   ├── Button.astro
│   │   ├── Card.astro
│   │   ├── Modal.astro
│   │   ├── Table.astro
│   │   ├── EmptyState.astro
│   │   ├── FormField.astro
│   │   ├── StatusBadge.astro
│   │   ├── Toast.astro
│   │   ├── Nav.astro
│   │   ├── CheckboxGroup.astro
│   │   ├── EnrollmentCard.astro  # NEW: Enrollment display
│   │   ├── ScheduleGrid.astro    # NEW: Weekly schedule view
│   │   ├── SlotPicker.astro      # NEW: Slot selection
│   │   └── LeadCard.astro        # NEW: Lead pipeline card
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro      # Base layout with CSS vars
│   │
│   ├── styles/
│   │   └── fonts.css             # Font face definitions
│   │
│   ├── lib/                      # Core application logic
│   │   │
│   │   ├── # === EXISTING (PRESERVED) ===
│   │   ├── auth.ts               # Google OAuth (Arctic)
│   │   ├── session.ts            # Session management
│   │   ├── crypto.ts             # AES-256-GCM encryption
│   │   ├── database.ts           # D1 database utilities
│   │   ├── validation.ts         # Zod schemas
│   │   ├── sanitize.ts           # XSS prevention
│   │   ├── roles.ts              # Role-based access
│   │   ├── rate-limit.ts         # Rate limiting
│   │   ├── auth-middleware.ts    # Auth middleware
│   │   ├── calendar.ts           # Google Calendar API
│   │   ├── conflict-checker.ts   # Event conflict detection
│   │   ├── change-requests.ts    # Change request workflow
│   │   │
│   │   ├── # === NEW: REPOSITORY LAYER ===
│   │   ├── repositories/
│   │   │   ├── types.ts          # Repository interfaces
│   │   │   └── d1/               # D1 implementations
│   │   │       ├── enrollment.ts     # EnrollmentRepository
│   │   │       ├── exception.ts      # ExceptionRepository
│   │   │       ├── completion.ts     # CompletionRepository
│   │   │       ├── lead.ts           # LeadRepository
│   │   │       └── closure.ts        # SystemClosureRepository
│   │   │
│   │   ├── # === NEW: SERVICE LAYER ===
│   │   ├── services/
│   │   │   ├── enrollment-service.ts # Enrollment CRUD + rules
│   │   │   ├── slot-service.ts       # LIVRE/BLOCKED computation
│   │   │   ├── schedule-generator.ts # Weekly schedule generation
│   │   │   ├── status-machine.ts     # Status transitions
│   │   │   ├── pausado-automator.ts  # PAUSADO lazy evaluation
│   │   │   ├── lead-matching.ts      # Lead→Teacher matching
│   │   │   └── invoice-calculator.ts # Invoice from completions
│   │   │
│   │   ├── # === NEW: VALIDATION SCHEMAS ===
│   │   └── validation/
│   │       ├── enrollment.ts     # Enrollment Zod schemas
│   │       ├── exception.ts      # Exception Zod schemas
│   │       ├── completion.ts     # Completion Zod schemas
│   │       └── lead.ts           # Lead Zod schemas
│   │
│   └── pages/
│       ├── index.astro           # Landing page
│       ├── login.astro           # Login page
│       │
│       ├── admin/                # Admin pages
│       │   ├── index.astro       # Admin dashboard
│       │   ├── users.astro       # Teacher/Student management
│       │   ├── calendar.astro    # Calendar view (existing)
│       │   ├── approvals.astro   # Change request approvals
│       │   ├── availability-approvals.astro
│       │   ├── enrollments.astro # NEW: Enrollment management
│       │   ├── leads.astro       # NEW: Lead pipeline
│       │   └── closures.astro    # NEW: FÉRIAS/holidays
│       │
│       ├── teacher/              # Teacher pages
│       │   ├── index.astro       # Teacher dashboard
│       │   ├── profile.astro     # Profile management
│       │   ├── availability.astro # Availability management
│       │   └── schedule.astro    # NEW: Schedule from enrollments
│       │
│       ├── parent/               # Parent pages
│       │   ├── index.astro       # Parent dashboard
│       │   ├── students.astro    # View children
│       │   └── classes.astro     # NEW: Class history/completions
│       │
│       └── api/                  # API routes
│           │
│           ├── # === EXISTING (PRESERVED) ===
│           ├── auth/
│           │   ├── login.ts
│           │   ├── callback.ts
│           │   ├── logout.ts
│           │   └── csrf.ts
│           ├── teachers/
│           │   ├── index.ts
│           │   └── [id].ts
│           ├── students/
│           │   ├── index.ts
│           │   └── [id].ts
│           ├── calendar/
│           │   └── events.ts
│           ├── settings/
│           │   ├── index.ts
│           │   └── theme.ts
│           ├── change-requests/
│           │   ├── index.ts
│           │   ├── count.ts
│           │   └── [id]/
│           │       ├── approve.ts
│           │       └── reject.ts
│           ├── availability/
│           │   ├── index.ts
│           │   └── approvals.ts
│           ├── admin/
│           │   ├── cleanup-data.ts
│           │   └── re-encrypt-data.ts
│           │
│           ├── # === NEW: ENROLLMENT API ===
│           ├── enrollments/
│           │   ├── index.ts              # GET list, POST create
│           │   └── [id]/
│           │       ├── index.ts          # GET, PUT single enrollment
│           │       ├── status.ts         # PUT status change
│           │       ├── exceptions/
│           │       │   └── index.ts      # GET/POST exceptions
│           │       └── completions/
│           │           └── index.ts      # GET/POST completions
│           │
│           ├── # === NEW: SCHEDULE API ===
│           ├── schedule/
│           │   └── [teacherId].ts        # GET teacher schedule
│           │
│           ├── # === NEW: SLOTS API ===
│           ├── slots/
│           │   └── [teacherId].ts        # GET LIVRE/BLOCKED slots
│           │
│           ├── # === NEW: LEADS API ===
│           ├── leads/
│           │   ├── index.ts              # GET list, POST create
│           │   └── [id]/
│           │       ├── index.ts          # GET, PUT single lead
│           │       └── convert.ts        # POST convert to enrollment
│           │
│           └── # === NEW: SYSTEM API ===
│           └── system/
│               └── closures.ts           # GET/POST FÉRIAS/holidays
│
└── docs/                         # Project documentation
    ├── design-system-architecture.md
    ├── diagrams/
    │   └── design-system-architecture.excalidraw
    └── TESTING-CHECKLIST.md
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Responsibility | Access Control |
|----------|----------------|----------------|
| `/api/enrollments/*` | Enrollment CRUD, status changes | Admin: all; Teacher: own; Parent: children's |
| `/api/schedule/*` | Generated schedule views | Admin: all; Teacher: own |
| `/api/slots/*` | LIVRE/BLOCKED computation | Admin: all |
| `/api/leads/*` | Lead pipeline management | Admin only |
| `/api/system/*` | System-wide closures | Admin only |
| `/api/auth/*` | Authentication (unchanged) | Public |
| `/api/teachers/*` | Teacher profiles (existing) | Admin: all; Teacher: own |
| `/api/students/*` | Student profiles (existing) | Admin: all; Parent: own children |

**Service Layer Boundaries:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Routes                               │
│  (Validation, Auth Check, Response Formatting)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│  enrollment-service.ts  │  slot-service.ts  │  status-machine.ts│
│  schedule-generator.ts  │  lead-matching.ts │  pausado-automator│
│                                                                  │
│  Pure TypeScript - NO database/platform code                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Repository Layer                             │
│  IEnrollmentRepository  │  IExceptionRepository  │  ILeadRepo   │
│  ICompletionRepository  │  IClosureRepository                   │
│                                                                  │
│  Interface definitions in types.ts                              │
│  D1 implementations in d1/*.ts                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare D1 Database                        │
│  enrollments │ enrollment_exceptions │ class_completions        │
│  leads       │ system_closures       │ (existing tables)        │
└─────────────────────────────────────────────────────────────────┘
```

**Data Boundaries:**

| Entity | Encrypted Fields | Accessed By |
|--------|------------------|-------------|
| enrollments | location_encrypted | Admin, Teacher (own), Parent (children) |
| leads | address_encrypted, parent_cpf_encrypted | Admin only |
| class_completions | (none) | Admin, Teacher (own), Parent (children) |
| enrollment_exceptions | (none) | Admin, Teacher (own) |
| system_closures | (none) | Admin (write), All (read) |

### Requirements to Structure Mapping

**Epic 1: Enrollment Management (FR1-FR9)**
- Repository: `src/lib/repositories/d1/enrollment.ts`
- Service: `src/lib/services/enrollment-service.ts`
- API Routes: `src/pages/api/enrollments/*`
- Admin UI: `src/pages/admin/enrollments.astro`
- Validation: `src/lib/validation/enrollment.ts`

**Epic 2: Class Instance Management (FR10-FR18)**
- Service: `src/lib/services/schedule-generator.ts`
- Repository: `src/lib/repositories/d1/exception.ts`, `completion.ts`
- API Routes: `src/pages/api/enrollments/[id]/exceptions/*`, `completions/*`
- Components: `src/components/ScheduleGrid.astro`

**Epic 3: Teacher Schedule & Availability (FR19-FR24)**
- Service: `src/lib/services/slot-service.ts`
- API Routes: `src/pages/api/schedule/*`, `slots/*`
- Teacher UI: `src/pages/teacher/schedule.astro`
- Components: `src/components/SlotPicker.astro`

**Epic 4: Parent Dashboard (FR25-FR29)**
- Parent UI: `src/pages/parent/classes.astro`
- API: Uses `/api/enrollments` with parent filtering
- Components: `src/components/EnrollmentCard.astro`

**Epic 5: Lead Management (FR30-FR36)**
- Repository: `src/lib/repositories/d1/lead.ts`
- Service: `src/lib/services/lead-matching.ts`
- API Routes: `src/pages/api/leads/*`
- Admin UI: `src/pages/admin/leads.astro`
- Components: `src/components/LeadCard.astro`

**Epic 6: Status Lifecycle (FR42-FR46)**
- Service: `src/lib/services/status-machine.ts`
- Automator: `src/lib/services/pausado-automator.ts`
- Constants: `src/constants/enrollment-statuses.ts`

**Cross-Cutting: System Closures**
- Repository: `src/lib/repositories/d1/closure.ts`
- API: `src/pages/api/system/closures.ts`
- Admin UI: `src/pages/admin/closures.astro`

### Integration Points

**Internal Communication:**
```
Page (Astro)
    → calls API route
    → API validates with Zod
    → API calls Service
    → Service calls Repository
    → Repository executes D1 query
    → Response bubbles back up
```

**External Integrations:**

| Integration | Location | Trigger |
|-------------|----------|---------|
| Google OAuth | `src/lib/auth.ts` | Login flow |
| Google Calendar | `src/lib/calendar.ts` | On enrollment create/update |
| (Future) WhatsApp | TBD | On status change notifications |

**Data Flow for Schedule Generation:**
```
Request: GET /api/schedule/[teacherId]?week=2024-01-15
    │
    ▼
schedule-generator.ts
    │
    ├── getEnrollmentsByTeacher(teacherId, ['ATIVO', 'PAUSADO'])
    │       └── enrollment.ts (repository)
    │
    ├── getSystemClosures(weekStart, weekEnd)
    │       └── closure.ts (repository)
    │
    ├── getExceptionsForWeek(enrollmentIds, weekStart, weekEnd)
    │       └── exception.ts (repository)
    │
    └── For each enrollment:
            ├── Check system closure → status: 'CLOSURE'
            ├── Check exception → status: exception.type
            ├── Check PAUSADO → status: 'PAUSADO'
            └── Default → status: 'SCHEDULED'
    │
    ▼
Response: ScheduleItem[] with computed statuses
```

### File Organization Patterns

**Configuration Files:**
- Root level: `astro.config.mjs`, `package.json`, `tsconfig.json`, `wrangler.toml`
- Environment: `.env` (local), `.env.example` (template)
- Documentation: `CLAUDE.md`, `project-context.md`, `CLOUDFLARE_CODING_STANDARDS.md`

**Source Organization:**
- Constants: `src/constants/` - Single source of truth for all config values
- Components: `src/components/` - Reusable Astro components (BILIN Design System)
- Layouts: `src/layouts/` - Page layouts with CSS custom properties
- Lib: `src/lib/` - All business logic, split by layer (repositories, services, validation)
- Pages: `src/pages/` - Astro pages and API routes, organized by role

**Test Organization:**
- Co-located: `*.test.ts` files next to implementation files
- Example: `src/lib/services/enrollment-service.test.ts`
- Integration tests: `src/lib/services/__tests__/` (if needed)

**Asset Organization:**
- Static fonts: `public/fonts/`
- Images: `public/assets/`
- Styles: `src/styles/` (fonts.css, any additional global styles)

### Development Workflow Integration

**Development Server:**
```bash
npm run dev              # Local dev (mock data)
npm run dev:remote       # Connected to production D1
```

**Database Migrations:**
```bash
# Apply new tables
npx wrangler d1 execute eduschedule-db --remote --file=./database/enrollments.sql
npx wrangler d1 execute eduschedule-db --remote --file=./database/leads.sql
```

**Build & Deploy:**
```bash
npm run build
npx wrangler pages deploy build-output --project-name=eduschedule-app
```

**File Creation Sequence for New Feature:**
1. Database migration in `database/`
2. Repository interface in `src/lib/repositories/types.ts`
3. D1 implementation in `src/lib/repositories/d1/`
4. Zod schema in `src/lib/validation/`
5. Service in `src/lib/services/`
6. API route in `src/pages/api/`
7. UI component in `src/components/`
8. Page in `src/pages/{role}/`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts:
- Astro 5 SSR + Cloudflare Pages + D1 ✅ (proven stack, already working)
- Repository + Service pattern + D1 ✅ (clean separation enables future migration)
- Hybrid data model + lazy evaluation ✅ (eliminates need for cron jobs)
- Google Calendar as display layer + enrollment as source of truth ✅ (clear data authority)

**Pattern Consistency:**
- Naming conventions (snake_case DB, camelCase TS) are consistent throughout
- API response formats standardized across all endpoints
- Error handling patterns uniform (typed errors in services, formatted in API)
- Status values use SCREAMING_SNAKE_CASE consistently

**Structure Alignment:**
- Project structure mirrors the service/repository pattern
- API routes organized by domain (enrollments, leads, schedule, slots)
- Clear separation: pages/api for routes, lib/services for logic, lib/repositories for data
- Components aligned with user journeys (EnrollmentCard, ScheduleGrid, LeadCard)

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (52 FRs):**

| FR Category | FRs | Architectural Support |
|-------------|-----|----------------------|
| Enrollment Management | FR1-FR9 | ✅ `enrollment-service.ts`, `status-machine.ts`, `pausado-automator.ts` |
| Class Instance Management | FR10-FR18 | ✅ `schedule-generator.ts`, `enrollment_exceptions` table, `class_completions` table |
| Teacher Schedule & Availability | FR19-FR24 | ✅ `slot-service.ts`, `/api/schedule/*`, `/api/slots/*` |
| Parent Dashboard | FR25-FR29 | ✅ `/parent/classes.astro`, enrollment filtering by parent role |
| Lead Management | FR30-FR36 | ✅ `lead.ts` repository, `lead-matching.ts` service, `/admin/leads.astro` |
| Slot & Conflict Management | FR37-FR41 | ✅ Computed slots via `slot-service.ts`, conflict check in `enrollment-service.ts` |
| Status Lifecycle | FR42-FR46 | ✅ `status-machine.ts` enforces transitions, `pausado-automator.ts` handles automation |
| User Auth & Roles | FR47-FR52 | ✅ Existing auth preserved, role-based filtering in repository layer |

**Non-Functional Requirements Coverage (28 NFRs):**

| NFR Category | NFRs | Architectural Support |
|--------------|------|----------------------|
| Performance | NFR1-NFR5 | ✅ SSR edge deployment, D1 edge latency, indexed queries |
| Security | NFR6-NFR12 | ✅ Existing security preserved (OAuth, encryption, CSRF, prepared statements) |
| Reliability | NFR13-NFR17 | ✅ Computed slots (never drift), lazy PAUSADO evaluation, transactions |
| Integration | NFR18-NFR21 | ✅ Calendar as display layer in `calendar.ts`, enrollment is source of truth |
| Scalability | NFR22-NFR24 | ✅ D1 handles scale, Cloudflare edge deployment |
| Accessibility | NFR25-NFR28 | ✅ Existing BILIN Design System components |

### Implementation Readiness Validation ✅

**Decision Completeness:**
- ✅ All critical decisions documented with technology choices
- ✅ Database schema fully defined with all tables and indexes
- ✅ API routes specified with HTTP methods and access control
- ✅ Code organization pattern documented (Repository + Service)

**Structure Completeness:**
- ✅ Complete project tree with all new and existing files
- ✅ All directories defined with clear purposes
- ✅ File naming conventions established
- ✅ Migration files specified in `database/` directory

**Pattern Completeness:**
- ✅ 18 conflict points identified and addressed
- ✅ Good/bad examples provided for all major patterns
- ✅ Error handling, validation, and role-based access patterns defined
- ✅ Data flow diagrams for complex operations (schedule generation)

### Gap Analysis Results

**No Critical Gaps Found**

The architecture comprehensively covers all PRD requirements with:
- Clear data model (Hybrid: Exception-Based + Completions)
- Complete API surface
- Defined implementation patterns
- Mapped project structure

**Minor Refinement Opportunities (Post-MVP):**

1. **Test infrastructure:** Test patterns defined but no test runner configured yet
2. **CI/CD pipeline:** Deployment commands documented but no GitHub Actions workflow
3. **Monitoring/logging:** Audit log exists but no observability infrastructure
4. **Error boundary UI:** Toast notifications exist but no global error boundary component

These are not blocking for implementation and can be addressed incrementally.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (brownfield redesign)
- [x] Scale and complexity assessed (Medium-High, 100 users, 1000 queries/day)
- [x] Technical constraints identified (Cloudflare Workers limitations)
- [x] Cross-cutting concerns mapped (status machine, slot blocking, audit trail)

**✅ Architectural Decisions**
- [x] Critical decisions documented (Hybrid data model, lazy evaluation)
- [x] Technology stack fully specified (Astro 5, D1, KV, Arctic)
- [x] Integration patterns defined (Google Calendar sync)
- [x] Performance considerations addressed (edge deployment, indexed queries)

**✅ Implementation Patterns**
- [x] Naming conventions established (snake_case DB, camelCase TS)
- [x] Structure patterns defined (Repository + Service)
- [x] Communication patterns specified (REST API, server-side state)
- [x] Process patterns documented (error handling, validation, auth)

**✅ Project Structure**
- [x] Complete directory structure defined (200+ files mapped)
- [x] Component boundaries established (API/Service/Repository layers)
- [x] Integration points mapped (Google OAuth, Google Calendar)
- [x] Requirements to structure mapping complete (6 epics → specific files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

Based on:
- Complete requirements coverage (52 FRs, 28 NFRs)
- Proven technology stack (existing app 85-90% complete)
- Clean abstractions enabling future migration
- Comprehensive implementation patterns

**Key Strengths:**

1. **Enrollment-first paradigm** - Clear data authority, no slot drift
2. **Hybrid data model** - Minimal storage, clean separation of concerns
3. **Lazy PAUSADO evaluation** - Works within Cloudflare free tier constraints
4. **Repository pattern** - Future platform migration in 1-2 weeks if needed
5. **Preserves existing code** - Auth, security, design system all maintained

**Areas for Future Enhancement:**

1. **Real-time updates** - WebSockets/SSE for admin notifications (Phase 2)
2. **Native mobile app** - Push notifications for teachers/parents (Phase 2)
3. **WhatsApp integration** - Automated notifications (Phase 2)
4. **Zone matrix** - Travel time optimization for teacher matching (Phase 2)

### Implementation Handoff

**AI Agent Guidelines:**

1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries (no new utils/ folders)
4. Create files in the sequence defined: migration → repository → service → API → UI
5. Refer to this document for all architectural questions
6. Match existing code patterns before writing new code

**First Implementation Priority:**

```bash
# 1. Create database migration
npx wrangler d1 execute eduschedule-db --remote --file=./database/enrollments.sql

# 2. Create repository layer
# src/lib/repositories/types.ts (interfaces)
# src/lib/repositories/d1/enrollment.ts (D1 implementation)

# 3. Create service layer
# src/lib/services/enrollment-service.ts
# src/lib/services/status-machine.ts

# 4. Create API routes
# src/pages/api/enrollments/index.ts

# 5. Create admin UI
# src/pages/admin/enrollments.astro
```

**Recommended Epic Sequence:**

1. **Epic 1: Enrollment Management** - Core entity, CRUD, status changes
2. **Epic 6: Status Lifecycle** - State machine validation
3. **Epic 2: Class Instance Management** - Schedule generation, exceptions
4. **Epic 3: Teacher Schedule** - Slot computation, schedule view
5. **Epic 4: Parent Dashboard** - Class history, enrollment view
6. **Epic 5: Lead Management** - Import, matching, conversion

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2025-12-07
**Document Location:** docs/architecture.md

### Final Architecture Deliverables

**Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**

- 15+ architectural decisions made (platform, data model, patterns, structure)
- 18 implementation patterns defined (naming, structure, format, process)
- 6 architectural layers specified (API, Service, Repository, Database, Components, Pages)
- 52 functional requirements + 28 non-functional requirements fully supported

**AI Agent Implementation Guide**

- Technology stack with verified versions (Astro 5, D1, KV, Arctic)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All functional requirements are supported
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**Solid Foundation**
The existing Astro 5 + Cloudflare infrastructure and Repository + Service patterns provide a production-ready foundation following current best practices.

---

## Post-Implementation Enhancements (Data Model Hardening)

**Updated:** 2025-12-17
**Status:** Production-Ready ✅

### Database Enhancements Added

The following enhancements were added during the Data Model Hardening phase (21 issues resolved):

**Migration 013: Data Integrity Triggers**
```sql
-- Cascade delete triggers (prevent orphaned records)
trg_enrollment_cascade_exceptions
trg_enrollment_cascade_completions

-- Validation triggers (enforce constraints)
trg_enrollment_validate_rate_insert
trg_enrollment_validate_rate_update
trg_enrollment_validate_duration_insert
trg_enrollment_validate_duration_update
```

**Migration 014: Reschedule Conflict Prevention**
```sql
-- Unique index prevents double-booking via reschedules
idx_unique_reschedule_slot (teacher_id, rescheduled_to_date, rescheduled_to_time)

-- Denormalized teacher_id on enrollment_exceptions for O(1) conflict detection
```

**Migration 015: Performance Indexes**
```sql
idx_enrollments_pausado (status, pausado_started_at WHERE status = 'PAUSADO')
idx_enrollments_aviso (status, aviso_started_at WHERE status = 'AVISO')
```

**Migration 016: Status History Table**
```sql
CREATE TABLE enrollment_status_history (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  admin_override INTEGER DEFAULT 0,
  override_reason TEXT,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('user', 'system', 'auto')),
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for reporting
idx_status_history_enrollment
idx_status_history_date
idx_status_history_to_status
idx_status_history_triggered_by
idx_status_history_override
```

### Service Layer Enhancements

**Enrollment Service:**
- Status transition validation via VALID_STATUS_TRANSITIONS
- PAUSADO cooldown enforcement with PausadoCooldownError
- Status history logging on all transitions

**Completion Repository:**
- Improved duplicate detection (handles makeups via exception_id)
- findByEnrollmentAndDate method for validation

**Slot Service:**
- Minute-based blocking at 30-min intervals (was hour-based)
- getBlockedSlotTimes() helper for accurate overlap calculation

**Status Automators:**
- PAUSADO automator logs to status_history table
- AVISO automator logs to status_history table
- Both use 'auto' triggered_by for compliance tracking

**Group Billing:**
- validateCompletionRate() ensures rate matches group size
- effective_group_size calculated from database, not client input

### Reporting Capabilities Added

The status_history table enables:
- "How many times has this student paused?" - getTransitionCount()
- "Which enrollments were auto-terminated?" - findAutoTransitions()
- "Show all admin overrides this month" - findAdminOverrides()

### Architecture Metrics

| Metric | Value |
|--------|-------|
| Database triggers | 6 |
| Unique indexes | 2 (slot blocking, reschedule conflicts) |
| Performance indexes | 4 (PAUSADO, AVISO, status history) |
| Repository methods added | 8 |
| Service validation methods | 4 |
| Custom error classes | 3 |

---

**Architecture Status:** PRODUCTION-READY ✅

**MVP Implementation:** Complete - All 52 FRs implemented, 21 data model issues resolved

**Next Phase:** Phase 2+ advanced features (Epic 6) - movie theater reservations, AI rescheduling, zone matrix, etc.

**Document Maintenance:** Updated 2025-12-17 with Data Model Hardening results.

