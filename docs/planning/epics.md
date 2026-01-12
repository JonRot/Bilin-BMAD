# Bilin - Epic Breakdown

**Author:** Jonathan
**Date:** 2025-12-07
**Last Updated:** 2026-01-12
**Project Level:** Medium-High Complexity
**Target Scale:** 12 teachers, 89 students, ~100 users
**Status:** ✅ **MVP COMPLETE** - All 52 Functional Requirements Implemented

---

## Overview

This document provides the complete epic and story breakdown for Bilin (EduSchedule Pro), decomposing the requirements from the [PRD](./prd.md) into implementable stories.

**✅ MVP Status:** All Epics 1-5 are complete, covering 100% of MVP functional requirements. The Data Model Hardening Plan (21 issues across 6 phases) has also been completed, ensuring production-ready data integrity, performance, and compliance.

**Phase 2 Status:** Epics 6-8 implement advanced features beyond MVP:
- **Epic 6:** ✅ Complete (11/11 stories) - Advanced Enrollment Features
- **Epic 7:** ✅ Complete (9/9 stories, WhatsApp deferred) - Rock-Solid Scheduling
- **Epic 8:** ✅ Complete (11/12 stories, PIX deferred) - Payment & Subscription System

### Context Validation

| Document | Status | Notes |
|----------|--------|-------|
| **PRD.md** | ✅ Complete | 52 FRs, 28 NFRs, enrollment-first architecture - ALL MVP items done |
| **Architecture.md** | ✅ Complete | Astro 5 + D1, Repository+Service pattern, complete schema |
| **Data Model Hardening** | ✅ Complete | 21 issues resolved across 6 phases - production-ready |
| **UX Design.md** | ○ Not Found | Using Architecture UI patterns |

### Epics Summary

| Epic | Title | User Value | FRs Covered | Status |
|------|-------|------------|-------------|--------|
| 1 | Foundation & Infrastructure | Enable all subsequent development | FR47-FR52 | Done |
| 2 | Enrollment Management | Admin can create/manage student enrollments | FR1-FR9, FR37-FR41, FR42-FR46 | Done |
| 3 | Schedule & Class Instances | Teachers see reliable schedules from enrollments | FR10-FR18, FR19-FR24 | Done |
| 4 | Parent Experience | Parents can view child's classes and history | FR25-FR29 | Done |
| 5 | Lead Pipeline | Admin can convert leads to enrollments | FR30-FR36 | Done |
| **6** | **Advanced Enrollment Features** | **Double-booking prevention, AVISO/FÉRIAS automation, AI suggestions** | **Phase 2** | **Done** |
| **7** | **Rock-Solid Scheduling** | **Reliable cancellation/reschedule flows with notifications** | **Phase 2** | **Done** |
| **8** | **Payment & Subscription System** | **Automated billing with Stripe integration** | **Phase 2** | **Done** |

**Phase 2 Epic Details:**
- **Epic 6:** [`epic-6-advanced-enrollment.md`](./epic-6-advanced-enrollment.md) - 11 stories: slot reservations, AVISO countdown, closures, zone matrix, AI rescheduling, group pricing, waitlist matching, teacher credits, relocation analysis
- **Epic 7:** [`epic-7-rock-solid-scheduling.md`](./epic-7-rock-solid-scheduling.md) - 9 stories: parent/teacher cancellation flows, closures, notifications, reschedule picker, makeup tracking (WhatsApp deferred)
- **Epic 8:** [`epic-8-payment-subscription-system.md`](./epic-8-payment-subscription-system.md) - 12 stories: Stripe integration, subscriptions, payment methods, auto-completion, billing dashboard

---

## Functional Requirements Inventory

### Enrollment Management (FR1-FR9)
| FR | Description | Priority |
|----|-------------|----------|
| FR1 | Admin can create a new enrollment linking student, teacher, day/time | Must Have |
| FR2 | Admin can change enrollment status (ATIVO, PAUSADO, INATIVO) | Must Have |
| FR3 | Admin can edit enrollment's assigned teacher | Must Have |
| FR4 | Admin can edit enrollment's day/time slot (with conflict checking) | Must Have |
| FR5 | Admin can terminate enrollment, releasing the slot | Must Have |
| FR6 | Admin can view all enrollments with filtering | Must Have |
| FR7 | System automatically returns PAUSADO to ATIVO after 3 weeks | Should Have |
| FR8 | System applies 5-month PAUSADO cooldown after auto-return | Should Have |
| FR9 | System blocks enrollment if slot already BLOCKED | Must Have |

### Class Instance Management (FR10-FR18)
| FR | Description | Priority |
|----|-------------|----------|
| FR10 | System generates class instances from active enrollments | Must Have |
| FR11 | Admin can cancel class instance without affecting enrollment | Must Have |
| FR12 | Parent can cancel class instance for their child | Must Have |
| FR13 | Teacher can request cancellation (requires admin approval) | Must Have |
| FR14 | Admin can approve/reject teacher cancellation requests | Must Have |
| FR15 | Teacher can mark class instance as completed | Must Have |
| FR16 | Teacher can add notes to completed class | Must Have |
| FR17 | Admin can schedule makeup class in cancelled slot | Should Have |
| FR18 | System tracks instance status (scheduled, completed, cancelled) | Must Have |

### Teacher Schedule & Availability (FR19-FR24)
| FR | Description | Priority |
|----|-------------|----------|
| FR19 | Teacher can view daily/weekly schedule from enrollments | Must Have |
| FR20 | Teacher can see which slots are LIVRE vs BLOCKED | Must Have |
| FR21 | Teacher can see cancelled instances as "available for makeup" | Should Have |
| FR22 | Teacher can view monthly completed class count | Must Have |
| FR23 | Teacher can view monthly earnings calculation | Should Have |
| FR24 | Admin can view any teacher's schedule and slot availability | Must Have |

### Parent Dashboard (FR25-FR29)
| FR | Description | Priority |
|----|-------------|----------|
| FR25 | Parent can view child's enrollment status and details | Must Have |
| FR26 | Parent can view child's class history | Must Have |
| FR27 | Parent can view teacher notes for completed classes | Should Have |
| FR28 | Parent can view upcoming scheduled classes | Must Have |
| FR29 | Parent can see invoice summary (classes completed x rate) | Should Have |

### Lead Management (FR30-FR36)
| FR | Description | Priority |
|----|-------------|----------|
| FR30 | Admin can import lead data from JotForm | Must Have |
| FR31 | Admin can view lead details including availability and location | Must Have |
| FR32 | Admin can see suggested teacher matches | Should Have |
| FR33 | Admin can convert lead to enrollment | Must Have |
| FR34 | Admin can mark lead as "Waitlist" | Must Have |
| FR35 | Admin can mark lead as "Not a Match" | Must Have |
| FR36 | Admin can view leads with filtering by status | Must Have |

### Slot & Conflict Management (FR37-FR41)
| FR | Description | Priority |
|----|-------------|----------|
| FR37 | System maintains slot status (LIVRE/BLOCKED) per teacher/day/time | Must Have |
| FR38 | System prevents conflicting enrollments | Must Have |
| FR39 | System updates slot to BLOCKED when enrollment created/reactivated | Must Have |
| FR40 | System updates slot to LIVRE only when enrollment terminated | Must Have |
| FR41 | Admin can view teacher's weekly slot grid | Must Have |

### Status Lifecycle (FR42-FR46)
| FR | Description | Priority |
|----|-------------|----------|
| FR42 | System enforces valid status transitions | Must Have |
| FR43 | System tracks PAUSADO start date for countdown | Should Have |
| FR44 | System tracks PAUSADO cooldown expiry date | Should Have |
| FR45 | System blocks PAUSADO during cooldown period | Should Have |
| FR46 | Admin can override cooldown restriction | Should Have |

### User Auth & Roles (FR47-FR52)
| FR | Description | Priority |
|----|-------------|----------|
| FR47 | Users authenticate via Google OAuth | ✅ Existing |
| FR48 | System assigns role based on email | ✅ Existing |
| FR49 | System restricts dashboard by role | ✅ Existing |
| FR50 | Admin can view/manage all data | Must Have |
| FR51 | Teacher can only view own schedule/enrollments | Must Have |
| FR52 | Parent can only view own children's data | Must Have |

---

## FR Coverage Map

| Epic | FRs Covered | Count |
|------|-------------|-------|
| Epic 1: Foundation | FR47-FR52 (existing auth extended) | 6 |
| Epic 2: Enrollment Management | FR1-FR9, FR37-FR41, FR42-FR46 | 20 |
| Epic 3: Schedule & Class Instances | FR10-FR18, FR19-FR24 | 15 |
| Epic 4: Parent Experience | FR25-FR29 | 5 |
| Epic 5: Lead Pipeline | FR30-FR36 | 7 |
| **Total** | **FR1-FR52** | **53** |

---

## Epic Structure Plan

### Epic Dependency Graph

```
Epic 1: Foundation & Database Setup
    │
    └──► Epic 2: Enrollment Management (Core)
              │
              ├──► Epic 3: Schedule & Class Instances
              │         │
              │         └──► Epic 4: Parent Experience
              │
              └──► Epic 5: Lead Pipeline
```

### Technical Context Summary

| Epic | Primary Services | Primary UI | Key Tables |
|------|-----------------|------------|------------|
| 1 | Repository interfaces, Zod schemas | None | All new tables |
| 2 | enrollment-service, slot-service, status-machine | /admin/enrollments | enrollments |
| 3 | schedule-generator, exception/completion repos | /teacher/schedule | enrollment_exceptions, class_completions |
| 4 | (reuses Epic 2-3 services) | /parent/classes | (reads existing) |
| 5 | lead-matching | /admin/leads | leads |

---

## Epic 1: Foundation & Database Setup

**Goal:** Establish the enrollment data model and core infrastructure that enables all subsequent features.

**User Value:** While not directly user-facing, this epic enables the reliable slot-blocking system that prevents double-bookings.

**PRD Coverage:** FR47-FR52 (Auth/Roles - extend existing)

**Architecture References:**
- Database schema: `database/enrollments.sql`, `database/leads.sql`
- Repository interfaces: `src/lib/repositories/types.ts`
- D1 implementations: `src/lib/repositories/d1/*.ts`
- Validation schemas: `src/lib/validation/*.ts`
- Constants: `src/constants/enrollment-statuses.ts`

**Dependencies:** None - this is the foundation

---

## Epic 2: Enrollment Management

**Goal:** Admin can create, edit, and manage student enrollments with automatic slot blocking and conflict prevention.

**User Value:** "I can see exactly which slots are BLOCKED vs LIVRE - no more guessing or manual tracking. When a parent cancels a class, the slot stays blocked because the enrollment is still ATIVO."

**PRD Coverage:**
- FR1-FR9 (Enrollment CRUD)
- FR37-FR41 (Slot & Conflict Management)
- FR42-FR46 (Status Lifecycle)

**Architecture References:**
- Service: `src/lib/services/enrollment-service.ts`
- Service: `src/lib/services/slot-service.ts`
- Service: `src/lib/services/status-machine.ts`
- Service: `src/lib/services/pausado-automator.ts`
- API: `src/pages/api/enrollments/*`
- UI: `src/pages/admin/enrollments.astro`
- Component: `src/components/SlotPicker.astro`

**Key Business Rules:**
- Slot = BLOCKED when enrollment status is ATIVO or PAUSADO
- Slot = LIVRE only when enrollment is INATIVO (terminated)
- PAUSADO auto-returns to ATIVO after 3 weeks (lazy evaluation)
- 5-month cooldown on PAUSADO after auto-return
- Conflict check: Cannot create enrollment if slot already BLOCKED

**Dependencies:** Epic 1 complete

---

## Epic 3: Schedule & Class Instance Management

**Goal:** Teachers can view reliable schedules derived from enrollments, mark classes complete with notes, and see available makeup slots.

**User Value:** "My schedule is reliable - if it shows a class, it's happening. I know which slots are truly available for new students."

**PRD Coverage:**
- FR10-FR18 (Class Instance Management)
- FR19-FR24 (Teacher Schedule & Availability)

**Architecture References:**
- Service: `src/lib/services/schedule-generator.ts`
- Repository: `src/lib/repositories/d1/exception.ts`
- Repository: `src/lib/repositories/d1/completion.ts`
- API: `src/pages/api/schedule/[teacherId].ts`
- API: `src/pages/api/enrollments/[id]/exceptions/*`
- API: `src/pages/api/enrollments/[id]/completions/*`
- UI: `src/pages/teacher/schedule.astro`
- Component: `src/components/ScheduleGrid.astro`
- Component: `src/components/EnrollmentCard.astro`

**Key Algorithm (Schedule Generation):**
```
For each enrollment:
  1. Check system_closures → status: 'CLOSURE'
  2. Check enrollment_exceptions → status: exception.type
  3. Check PAUSADO status → status: 'PAUSADO'
  4. Default → status: 'SCHEDULED'
```

**Dependencies:** Epic 2 complete

---

## Epic 4: Parent Experience

**Goal:** Parents can view their child's enrollment status, complete class history with teacher notes, and upcoming classes.

**User Value:** "Everything is in one place - class history, reschedules, and what was taught each day. No more scattered WhatsApp threads."

**PRD Coverage:** FR25-FR29 (Parent Dashboard)

**Architecture References:**
- UI: `src/pages/parent/classes.astro`
- Role filtering at repository layer
- Service: `src/lib/services/invoice-calculator.ts`
- Reuses enrollment and completion APIs with parent role filtering

**Key Features:**
- View enrollment status (ATIVO, PAUSADO, etc.)
- View class history with teacher notes
- View upcoming scheduled classes
- See invoice summary (classes completed × rate)

**Dependencies:** Epic 3 complete (needs completions)

---

## Epic 5: Lead Pipeline & Conversion

**Goal:** Admin can import leads, see teacher matching suggestions, and convert leads to enrollments seamlessly.

**User Value:** "I can match new leads to available teachers without fear of double-booking. The system shows me which teachers have LIVRE slots that match the lead's availability."

**PRD Coverage:** FR30-FR36 (Lead Management)

**Architecture References:**
- Repository: `src/lib/repositories/d1/lead.ts`
- Service: `src/lib/services/lead-matching.ts`
- API: `src/pages/api/leads/*`
- API: `src/pages/api/leads/[id]/convert.ts`
- UI: `src/pages/admin/leads.astro`
- Component: `src/components/LeadCard.astro`

**Lead Status Flow:**
```
AGUARDANDO → EM_ANALISE → WAITLIST | CONTRACTED | NOT_A_MATCH
                            ↓
                      (converts to enrollment)
```

**Dependencies:** Epic 2 complete (conversion creates enrollment)

---

## Epic 1 Stories

### Story 1.1: Create Enrollment Database Schema

As a **developer**,
I want the enrollment-related database tables created,
So that the application can persist enrollment data.

**Acceptance Criteria:**

**Given** the Cloudflare D1 database exists
**When** the migration script is executed
**Then** the following tables are created:
- `enrollments` table with all columns per Architecture schema
- `enrollment_exceptions` table for cancellations/reschedules
- `class_completions` table for completed class records
- `system_closures` table for FÉRIAS/holidays
- `leads` table for pre-enrollment pipeline

**And** all indexes are created for query performance:
- `idx_enrollments_teacher`, `idx_enrollments_student`, `idx_enrollments_status`, `idx_enrollments_day`
- `idx_exceptions_enrollment`, `idx_exceptions_date`
- `idx_completions_enrollment`, `idx_completions_date`
- `idx_closures_dates`
- `idx_leads_status`, `idx_leads_neighborhood`

**Prerequisites:** None

**Technical Notes:**
- Migration file: `database/enrollments.sql`
- Use exact schema from Architecture document section "Database Schema"
- Primary keys use TEXT with prefixed UUIDs (`enr_`, `exc_`, `cmp_`, `led_`, `cls_`)
- Timestamps as Unix integers
- Encrypted fields: `location_encrypted`, `address_encrypted`, `parent_cpf_encrypted`

---

### Story 1.2: Create Repository Interfaces and Types

As a **developer**,
I want TypeScript interfaces for all repositories defined,
So that the service layer has a clean abstraction over data access.

**Acceptance Criteria:**

**Given** the database schema is created
**When** I create the repository types file
**Then** `src/lib/repositories/types.ts` contains:

```typescript
interface IEnrollmentRepository {
  findById(id: string): Promise<Enrollment | null>
  findByTeacher(teacherId: string, statuses?: EnrollmentStatus[]): Promise<Enrollment[]>
  findByStudent(studentId: string): Promise<Enrollment[]>
  findBySlot(teacherId: string, dayOfWeek: number, startTime: string): Promise<Enrollment | null>
  create(data: CreateEnrollmentData): Promise<Enrollment>
  update(id: string, data: UpdateEnrollmentData): Promise<Enrollment>
  updateStatus(id: string, status: EnrollmentStatus, metadata?: StatusMetadata): Promise<void>
}

interface IExceptionRepository {
  findByEnrollment(enrollmentId: string): Promise<EnrollmentException[]>
  findByDateRange(enrollmentIds: string[], startDate: string, endDate: string): Promise<EnrollmentException[]>
  create(data: CreateExceptionData): Promise<EnrollmentException>
}

interface ICompletionRepository {
  findByEnrollment(enrollmentId: string): Promise<ClassCompletion[]>
  findByDateRange(enrollmentId: string, startDate: string, endDate: string): Promise<ClassCompletion[]>
  create(data: CreateCompletionData): Promise<ClassCompletion>
}

interface ILeadRepository {
  findById(id: string): Promise<Lead | null>
  findByStatus(status: LeadStatus): Promise<Lead[]>
  findAll(): Promise<Lead[]>
  create(data: CreateLeadData): Promise<Lead>
  update(id: string, data: UpdateLeadData): Promise<Lead>
  updateStatus(id: string, status: LeadStatus, reason?: string): Promise<void>
}

interface IClosureRepository {
  findByDateRange(startDate: string, endDate: string): Promise<SystemClosure[]>
  create(data: CreateClosureData): Promise<SystemClosure>
  delete(id: string): Promise<void>
}
```

**And** all entity types are defined (`Enrollment`, `EnrollmentException`, `ClassCompletion`, `Lead`, `SystemClosure`)

**Prerequisites:** Story 1.1

**Technical Notes:**
- Follow naming patterns from Architecture: `PascalCase` for types, `camelCase` for methods
- Include status enums: `EnrollmentStatus`, `ExceptionType`, `CompletionStatus`, `LeadStatus`
- Repository methods return `Promise<T>` for async D1 operations

---

### Story 1.3: Implement D1 Repository Layer

As a **developer**,
I want D1 implementations of all repository interfaces,
So that the application can read/write to Cloudflare D1.

**Acceptance Criteria:**

**Given** repository interfaces are defined
**When** I implement the D1 repositories
**Then** the following files are created:
- `src/lib/repositories/d1/enrollment.ts` - D1EnrollmentRepository
- `src/lib/repositories/d1/exception.ts` - D1ExceptionRepository
- `src/lib/repositories/d1/completion.ts` - D1CompletionRepository
- `src/lib/repositories/d1/lead.ts` - D1LeadRepository
- `src/lib/repositories/d1/closure.ts` - D1ClosureRepository

**And** each repository:
- Accepts `D1Database` in constructor
- Uses prepared statements for ALL queries (no string concatenation)
- Maps database rows to TypeScript types
- Generates prefixed UUIDs for new records (`enr_`, `exc_`, etc.)

**And** the enrollment repository includes role-based filtering:
```typescript
async findByRole(userId: string, role: Role): Promise<Enrollment[]> {
  if (role === 'admin') return this.findAll()
  if (role === 'teacher') return this.findByTeacher(userId)
  if (role === 'parent') return this.findByParent(userId)
}
```

**Prerequisites:** Story 1.2

**Technical Notes:**
- Access D1 via `locals.runtime.env.DB`
- Use `crypto.randomUUID()` for ID generation with prefix
- Handle `null` results from `.first()` queries
- Log errors but don't expose internal details to API responses

---

### Story 1.4: Create Zod Validation Schemas

As a **developer**,
I want Zod schemas for all enrollment-related inputs,
So that API routes can validate incoming data consistently.

**Acceptance Criteria:**

**Given** the entity types are defined
**When** I create validation schemas
**Then** the following files are created:
- `src/lib/validation/enrollment.ts`
- `src/lib/validation/exception.ts`
- `src/lib/validation/completion.ts`
- `src/lib/validation/lead.ts`

**And** enrollment schema validates:
```typescript
const createEnrollmentSchema = z.object({
  student_id: z.string().startsWith('stu_'),
  teacher_id: z.string().startsWith('tea_'),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().default(60),
  language: z.enum(['Inglês', 'Espanhol']),
  hourly_rate: z.number().optional(),
  notes: z.string().optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['ATIVO', 'PAUSADO', 'INATIVO']),
  reason: z.string().optional(),
})
```

**And** all schemas follow Architecture patterns:
- Input validation at API boundary only
- Services assume valid input
- Error messages are user-friendly

**Prerequisites:** Story 1.2

**Technical Notes:**
- Use `.safeParse()` in API routes
- Return 400 with `{ error: 'VALIDATION_ERROR', message: '...' }` on failure
- Time format: "HH:MM" (24-hour)
- Date format: "YYYY-MM-DD" for API transport

---

### Story 1.5: Create Enrollment Status Constants

As a **developer**,
I want status constants and transition rules defined,
So that status changes are validated consistently across the application.

**Acceptance Criteria:**

**Given** the enrollment status lifecycle is defined in PRD
**When** I create the status constants file
**Then** `src/constants/enrollment-statuses.ts` contains:

```typescript
export const ENROLLMENT_STATUSES = {
  WAITLIST: 'WAITLIST',
  ATIVO: 'ATIVO',
  PAUSADO: 'PAUSADO',
  AVISO: 'AVISO',
  INATIVO: 'INATIVO',
} as const

export const EXCEPTION_TYPES = {
  CANCELLED_STUDENT: 'CANCELLED_STUDENT',
  CANCELLED_TEACHER: 'CANCELLED_TEACHER',
  RESCHEDULED: 'RESCHEDULED',
  HOLIDAY: 'HOLIDAY',
} as const

export const COMPLETION_STATUSES = {
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const

export const LEAD_STATUSES = {
  AGUARDANDO: 'AGUARDANDO',
  EM_ANALISE: 'EM_ANALISE',
  WAITLIST: 'WAITLIST',
  CONTRACTED: 'CONTRACTED',
  NOT_A_MATCH: 'NOT_A_MATCH',
} as const

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  WAITLIST: ['ATIVO', 'INATIVO'],
  ATIVO: ['PAUSADO', 'AVISO', 'INATIVO'],
  PAUSADO: ['ATIVO', 'INATIVO'],
  AVISO: ['ATIVO', 'INATIVO'],
  INATIVO: [], // Terminal state
}

export const PAUSADO_MAX_DAYS = 21 // 3 weeks
export const PAUSADO_COOLDOWN_MONTHS = 5
```

**And** the constants are exported from `src/constants/index.ts`

**Prerequisites:** None (can be done in parallel with other stories)

**Technical Notes:**
- Use `as const` for type inference
- Status values in SCREAMING_SNAKE_CASE per Architecture patterns
- Portuguese status names match PRD (ATIVO, PAUSADO, etc.)

---

### Epic 1 Summary

| Metric | Value |
|--------|-------|
| Stories Created | 5 |
| FR Coverage | FR47-FR52 (foundation for role-based access) |
| Key Deliverables | Database schema, Repository layer, Validation schemas, Status constants |

---

## Epic 2 Stories

### Story 2.1: Implement Enrollment Service Core

As a **developer**,
I want a service layer for enrollment business logic,
So that enrollment operations follow business rules consistently.

**Acceptance Criteria:**

**Given** the repository layer is complete
**When** I create the enrollment service
**Then** `src/lib/services/enrollment-service.ts` provides:

- `createEnrollment(data)` - Creates enrollment with conflict checking
- `updateEnrollment(id, data)` - Updates enrollment details
- `getEnrollmentById(id)` - Gets single enrollment with auto-PAUSADO check
- `getEnrollmentsByTeacher(teacherId)` - Lists teacher's enrollments
- `getEnrollmentsByStudent(studentId)` - Lists student's enrollments
- `terminateEnrollment(id)` - Sets status to INATIVO, releases slot

**And** createEnrollment includes conflict checking:

```typescript
async createEnrollment(data: CreateEnrollmentData): Promise<Enrollment> {
  // Check for existing enrollment at same slot
  const existing = await this.enrollmentRepo.findBySlot(
    data.teacher_id,
    data.day_of_week,
    data.start_time
  )
  if (existing && ['ATIVO', 'PAUSADO'].includes(existing.status)) {
    throw new SlotConflictError(data.teacher_id, data.day_of_week, data.start_time)
  }
  return this.enrollmentRepo.create({ ...data, status: 'ATIVO' })
}
```

**Prerequisites:** Story 1.3 (D1 Repository Layer)

**Technical Notes:**

- Service receives repository via constructor (dependency injection)
- Pure TypeScript - no D1/platform code in service
- Throw typed errors: `SlotConflictError`, `EnrollmentNotFoundError`
- Add audit log entries for all mutations

---

### Story 2.2: Implement Status Machine Service

As a **developer**,
I want a status machine that validates enrollment transitions,
So that invalid status changes are prevented.

**Acceptance Criteria:**

**Given** status constants are defined
**When** I create the status machine service
**Then** `src/lib/services/status-machine.ts` provides:

- `canTransition(from, to)` - Returns boolean if transition is valid
- `validateTransition(from, to)` - Throws if invalid
- `getValidTransitions(status)` - Returns array of valid next statuses

**And** the following transitions are enforced:

| From | Valid To |
|------|----------|
| WAITLIST | ATIVO, INATIVO |
| ATIVO | PAUSADO, AVISO, INATIVO |
| PAUSADO | ATIVO, INATIVO |
| AVISO | ATIVO, INATIVO |
| INATIVO | (none - terminal) |

**And** invalid transitions throw `InvalidStatusTransitionError`:

```typescript
throw new InvalidStatusTransitionError(
  currentStatus,
  requestedStatus,
  `Cannot transition from ${currentStatus} to ${requestedStatus}`
)
```

**Prerequisites:** Story 1.5 (Status Constants)

**Technical Notes:**

- Use VALID_STATUS_TRANSITIONS constant
- Error includes both statuses for debugging
- Admin override capability planned for Story 2.4

---

### Story 2.3: Implement Slot Service

As a **developer**,
I want a service that computes slot availability,
So that LIVRE/BLOCKED status is always accurate.

**Acceptance Criteria:**

**Given** enrollments exist in the database
**When** I query slot status
**Then** `src/lib/services/slot-service.ts` provides:

- `getSlotStatus(teacherId, dayOfWeek, time)` - Returns 'LIVRE' or 'BLOCKED'
- `getTeacherSlots(teacherId)` - Returns all slots with status for a teacher
- `getAvailableSlots(teacherId)` - Returns only LIVRE slots

**And** slot status is computed (not stored):

```typescript
async getSlotStatus(
  teacherId: string,
  dayOfWeek: number,
  time: string
): Promise<'LIVRE' | 'BLOCKED'> {
  const enrollment = await this.enrollmentRepo.findBySlot(
    teacherId,
    dayOfWeek,
    time
  )
  // BLOCKED if ATIVO or PAUSADO enrollment exists
  if (enrollment && ['ATIVO', 'PAUSADO'].includes(enrollment.status)) {
    return 'BLOCKED'
  }
  return 'LIVRE'
}
```

**And** getTeacherSlots returns a weekly grid:

```typescript
interface SlotGrid {
  teacherId: string
  slots: Array<{
    dayOfWeek: number
    time: string
    status: 'LIVRE' | 'BLOCKED'
    enrollmentId?: string
    studentName?: string
  }>
}
```

**Prerequisites:** Story 2.1 (Enrollment Service)

**Technical Notes:**

- Slots computed on-demand = no drift from enrollment state
- Time slots: 08:00 to 20:00 in 1-hour increments
- Include enrollment details for BLOCKED slots (for UI display)

---

### Story 2.4: Implement PAUSADO Automator

As a **developer**,
I want PAUSADO enrollments to auto-return to ATIVO after 3 weeks,
So that paused slots are automatically released per business rules.

**Acceptance Criteria:**

**Given** an enrollment is in PAUSADO status
**When** 21 days have passed since PAUSADO started
**Then** on next access, the enrollment automatically transitions to ATIVO

**And** `src/lib/services/pausado-automator.ts` provides:

```typescript
async checkAndAutoTransition(enrollment: Enrollment): Promise<Enrollment> {
  if (enrollment.status !== 'PAUSADO' || !enrollment.pausado_started_at) {
    return enrollment
  }

  const threeWeeksMs = 21 * 24 * 60 * 60 * 1000
  const pausadoExpiry = enrollment.pausado_started_at * 1000 + threeWeeksMs

  if (Date.now() > pausadoExpiry) {
    // Auto-transition to ATIVO
    const fiveMonthsMs = 5 * 30 * 24 * 60 * 60 * 1000
    const cooldownUntil = Math.floor((Date.now() + fiveMonthsMs) / 1000)

    await this.enrollmentRepo.updateStatus(enrollment.id, 'ATIVO', {
      pausado_cooldown_until: cooldownUntil,
      pausado_started_at: null,
    })

    await this.auditLog('PAUSADO_AUTO_RETURN', enrollment.id, 'system')

    return { ...enrollment, status: 'ATIVO', pausado_cooldown_until: cooldownUntil }
  }

  return enrollment
}
```

**And** 5-month cooldown is applied after auto-return
**And** cooldown prevents new PAUSADO requests during that period

**Prerequisites:** Story 2.2 (Status Machine)

**Technical Notes:**

- Lazy evaluation: runs on every enrollment access
- No cron jobs needed (Cloudflare free tier constraint)
- Timestamps in Unix seconds (not milliseconds)
- Audit log captures system-initiated transitions

---

### Story 2.5: Create Enrollment API Routes

As a **developer**,
I want REST API endpoints for enrollment operations,
So that the admin UI can manage enrollments.

**Acceptance Criteria:**

**Given** the enrollment service is complete
**When** I create API routes
**Then** the following endpoints exist:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enrollments` | GET | List enrollments (filtered by role) |
| `/api/enrollments` | POST | Create new enrollment |
| `/api/enrollments/[id]` | GET | Get single enrollment |
| `/api/enrollments/[id]` | PUT | Update enrollment |
| `/api/enrollments/[id]/status` | PUT | Change enrollment status |

**And** GET /api/enrollments supports query params:

- `?status=ATIVO` - Filter by status
- `?teacher_id=tea_xxx` - Filter by teacher
- `?student_id=stu_xxx` - Filter by student

**And** POST /api/enrollments validates with Zod:

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  const session = await getSession(locals)
  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 })
  }

  const body = await request.json()
  const parsed = createEnrollmentSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues[0].message
    }), { status: 400 })
  }

  try {
    const enrollment = await enrollmentService.createEnrollment(parsed.data)
    return new Response(JSON.stringify(enrollment), { status: 201 })
  } catch (error) {
    if (error instanceof SlotConflictError) {
      return new Response(JSON.stringify({
        error: 'SLOT_CONFLICT',
        message: error.message
      }), { status: 409 })
    }
    throw error
  }
}
```

**And** role-based filtering is applied automatically

**Prerequisites:** Story 2.1 (Enrollment Service), Story 1.4 (Zod Schemas)

**Technical Notes:**

- Admin sees all enrollments
- Teacher sees only their enrollments
- Parent sees only their children's enrollments
- CSRF protection on all mutations
- Return JSON with snake_case fields (matches database)

---

### Story 2.6: Create Slot Availability API

As a **developer**,
I want an API endpoint for slot availability,
So that the admin can see which teacher slots are LIVRE.

**Acceptance Criteria:**

**Given** the slot service is complete
**When** I create the slots API
**Then** `/api/slots/[teacherId]` returns:

```json
{
  "teacher_id": "tea_xxx",
  "teacher_name": "Maria Silva",
  "slots": [
    { "day_of_week": 1, "time": "09:00", "status": "BLOCKED", "student_name": "João" },
    { "day_of_week": 1, "time": "10:00", "status": "LIVRE" },
    { "day_of_week": 1, "time": "11:00", "status": "BLOCKED", "student_name": "Ana" }
  ]
}
```

**And** response includes student name for BLOCKED slots (admin only)
**And** teachers can only view their own slots
**And** time range covers 08:00-20:00 in 1-hour increments

**Prerequisites:** Story 2.3 (Slot Service)

**Technical Notes:**

- File: `src/pages/api/slots/[teacherId].ts`
- Join with students table to get student_name
- Admin can view any teacher; teacher can only view self

---

### Story 2.7: Create Admin Enrollments Page

As an **admin**,
I want a page to view and manage all enrollments,
So that I can create, edit, and terminate student enrollments.

**Acceptance Criteria:**

**Given** I am logged in as admin
**When** I navigate to `/admin/enrollments`
**Then** I see a table of all enrollments with columns:

- Student Name
- Teacher Name
- Day/Time (e.g., "Monday 15:00")
- Status (with StatusBadge component)
- Actions (Edit, Change Status, Terminate)

**And** I can filter by:

- Status dropdown (All, ATIVO, PAUSADO, INATIVO)
- Teacher dropdown
- Search by student name

**And** I can click "New Enrollment" to open a modal with:

- Student selector (dropdown of existing students)
- Teacher selector (dropdown of teachers)
- Day of week selector (Mon-Sun)
- Time slot picker (showing LIVRE slots only)
- Language selector (Inglês, Espanhol)
- Hourly rate input
- Notes textarea

**And** the slot picker shows real-time LIVRE/BLOCKED status
**And** form submission creates enrollment via POST /api/enrollments
**And** success shows toast notification and refreshes table

**Prerequisites:** Story 2.5 (API Routes), Story 2.6 (Slots API)

**Technical Notes:**

- File: `src/pages/admin/enrollments.astro`
- Use existing BILIN Design System components (Card, Table, Modal, Button, FormField)
- Create new SlotPicker.astro component for time selection
- Mobile-responsive but desktop-optimized (admin uses computer)

---

### Story 2.8: Implement Enrollment Status Change UI

As an **admin**,
I want to change an enrollment's status from the enrollments page,
So that I can pause, reactivate, or terminate enrollments.

**Acceptance Criteria:**

**Given** I am viewing an enrollment on the admin page
**When** I click "Change Status" action
**Then** a modal opens showing:

- Current status with badge
- Dropdown of valid next statuses (from status machine)
- Reason/notes textarea
- Cancel and Confirm buttons

**And** if changing to PAUSADO:

- Show warning: "PAUSADO will auto-return to ATIVO after 3 weeks"
- Show cooldown status if applicable: "PAUSADO unavailable until May 2025"

**And** if terminating (INATIVO):

- Show confirmation: "This will release the slot. This action cannot be undone."
- Require typing "TERMINATE" to confirm

**And** successful status change:

- Updates enrollment via PUT /api/enrollments/[id]/status
- Refreshes the table row
- Shows success toast

**Prerequisites:** Story 2.7 (Admin Enrollments Page)

**Technical Notes:**

- Modal shows only valid transitions per status-machine
- Cooldown check: if `pausado_cooldown_until > now`, disable PAUSADO option
- Admin can override cooldown with explicit checkbox (FR46)
- Audit log entry created for all status changes

---

### Story 2.9: Create Teacher Weekly Slot Grid View

As an **admin**,
I want to view a teacher's weekly slot grid,
So that I can see all LIVRE and BLOCKED slots at a glance.

**Acceptance Criteria:**

**Given** I am on the admin enrollments page
**When** I click "View Slots" for a teacher
**Then** a modal displays a weekly grid:

```
         Mon    Tue    Wed    Thu    Fri
08:00    [ ]    [X]    [ ]    [ ]    [ ]
09:00    [X]    [ ]    [ ]    [X]    [ ]
10:00    [ ]    [ ]    [X]    [ ]    [ ]
...
```

Where:
- `[ ]` = LIVRE (green/available)
- `[X]` = BLOCKED (red/occupied, shows student name on hover)

**And** clicking a LIVRE slot opens the "New Enrollment" modal pre-filled with:

- Teacher (selected teacher)
- Day of week (clicked day)
- Time (clicked time)

**And** clicking a BLOCKED slot shows enrollment details in a popover

**Prerequisites:** Story 2.6 (Slots API)

**Technical Notes:**

- Component: `src/components/SlotPicker.astro`
- Reusable in enrollment creation and lead matching
- Color scheme: LIVRE = olive/success, BLOCKED = coral/danger
- Saturday/Sunday optional (most teachers don't work weekends)

---

### Epic 2 Summary

| Metric | Value |
|--------|-------|
| Stories Created | 9 |
| FR Coverage | FR1-FR9 (Enrollment), FR37-FR41 (Slots), FR42-FR46 (Status) |
| Key Deliverables | Enrollment service, Status machine, Slot service, Admin UI |

---

## Epic 3 Stories

### Story 3.1: Implement Schedule Generator Service

As a **developer**,
I want a service that generates weekly schedules from enrollments,
So that teachers see computed schedules rather than stored calendar events.

**Acceptance Criteria:**

**Given** enrollments exist with various statuses
**When** I request a teacher's schedule for a week
**Then** `src/lib/services/schedule-generator.ts` returns schedule items:

```typescript
interface ScheduleItem {
  date: string              // YYYY-MM-DD
  time: string              // HH:MM
  enrollmentId: string
  studentId: string
  studentName: string
  status: 'SCHEDULED' | 'PAUSADO' | 'CLOSURE' | 'CANCELLED_STUDENT' | 'CANCELLED_TEACHER' | 'COMPLETED'
  exception?: EnrollmentException
  completion?: ClassCompletion
}

async function getScheduleForWeek(
  teacherId: string,
  weekStart: Date
): Promise<ScheduleItem[]>
```

**And** the algorithm follows this priority:

1. Check `system_closures` for the date → status: 'CLOSURE'
2. Check `enrollment_exceptions` for the date → status: exception.type
3. Check `class_completions` for the date → status: 'COMPLETED'
4. Check enrollment.status === 'PAUSADO' → status: 'PAUSADO'
5. Default → status: 'SCHEDULED'

**And** only ATIVO and PAUSADO enrollments generate schedule items

**Prerequisites:** Story 2.1 (Enrollment Service)

**Technical Notes:**

- Week starts on Monday (Brazilian convention)
- Generate for each enrollment's day_of_week within the week
- Join with students table for student_name
- Results sorted by date, then time

---

### Story 3.2: Create Exception Repository Methods

As a **developer**,
I want methods to create and query enrollment exceptions,
So that cancellations and reschedules are tracked.

**Acceptance Criteria:**

**Given** the exception repository exists
**When** I enhance it with full functionality
**Then** `src/lib/repositories/d1/exception.ts` provides:

- `create(data)` - Creates exception with type and reason
- `findByEnrollment(enrollmentId)` - All exceptions for an enrollment
- `findByDateRange(enrollmentIds, start, end)` - Exceptions within date range
- `findByDate(enrollmentId, date)` - Single exception for specific date
- `delete(id)` - Remove exception (for undo functionality)

**And** exception types are validated:

- CANCELLED_STUDENT - Student/parent cancelled
- CANCELLED_TEACHER - Teacher cancelled (requires approval)
- RESCHEDULED - Class moved to different date/time
- HOLIDAY - System-wide closure applied

**And** reschedules track the new date/time:

```typescript
interface CreateExceptionData {
  enrollment_id: string
  exception_date: string        // Original date
  exception_type: ExceptionType
  reason?: string
  rescheduled_to_date?: string  // For RESCHEDULED type
  rescheduled_to_time?: string
  created_by: 'student' | 'teacher' | 'admin' | 'system'
}
```

**Prerequisites:** Story 1.3 (D1 Repository Layer)

**Technical Notes:**

- Exception date format: YYYY-MM-DD
- Reschedule creates exception on original date + completion-eligible entry on new date
- Teacher cancellations require `approved_by` and `approved_at` fields

---

### Story 3.3: Create Completion Repository Methods

As a **developer**,
I want methods to create and query class completions,
So that completed classes are tracked for history and invoicing.

**Acceptance Criteria:**

**Given** the completion repository exists
**When** I enhance it with full functionality
**Then** `src/lib/repositories/d1/completion.ts` provides:

- `create(data)` - Records class completion with notes
- `findByEnrollment(enrollmentId)` - All completions for an enrollment
- `findByDateRange(enrollmentId, start, end)` - Completions within period
- `findByTeacherAndMonth(teacherId, year, month)` - For earnings calculation
- `update(id, data)` - Update notes after creation

**And** completion data includes:

```typescript
interface CreateCompletionData {
  enrollment_id: string
  class_date: string          // YYYY-MM-DD
  class_time: string          // HH:MM
  status: 'COMPLETED' | 'NO_SHOW'
  notes?: string              // What was taught
  is_makeup: boolean
  makeup_for_date?: string    // If this is a makeup class
}
```

**And** NO_SHOW status tracks when student didn't attend (still billable per business rules)

**Prerequisites:** Story 1.3 (D1 Repository Layer)

**Technical Notes:**

- Completion = proof of delivery for invoicing
- Notes field for teacher's class summary
- `is_makeup` flag for tracking makeup classes
- `google_event_id` stored for calendar sync reference

---

### Story 3.4: Create Schedule API Endpoint

As a **developer**,
I want an API endpoint for teacher schedules,
So that the teacher UI can display their weekly schedule.

**Acceptance Criteria:**

**Given** the schedule generator is complete
**When** I create the schedule API
**Then** `GET /api/schedule/[teacherId]` returns:

```json
{
  "teacher_id": "tea_xxx",
  "teacher_name": "Maria Silva",
  "week_start": "2025-01-06",
  "schedule": [
    {
      "date": "2025-01-06",
      "time": "09:00",
      "enrollment_id": "enr_xxx",
      "student_name": "João Silva",
      "status": "SCHEDULED"
    },
    {
      "date": "2025-01-06",
      "time": "10:00",
      "enrollment_id": "enr_yyy",
      "student_name": "Ana Costa",
      "status": "CANCELLED_STUDENT",
      "exception": {
        "reason": "Student sick",
        "created_at": 1704556800
      }
    }
  ]
}
```

**And** supports query parameters:

- `?week=2025-01-06` - Specific week (defaults to current week)
- `?include_completed=true` - Include past completions

**And** teachers can only view their own schedule
**And** admin can view any teacher's schedule

**Prerequisites:** Story 3.1 (Schedule Generator)

**Technical Notes:**

- File: `src/pages/api/schedule/[teacherId].ts`
- Default week = current Monday
- Include location_encrypted (decrypted) for teacher's reference
- Filter by role at API level

---

### Story 3.5: Create Exception API Endpoints

As a **developer**,
I want API endpoints for managing class exceptions,
So that cancellations can be recorded.

**Acceptance Criteria:**

**Given** the exception repository is complete
**When** I create exception API routes
**Then** the following endpoints exist:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enrollments/[id]/exceptions` | GET | List exceptions for enrollment |
| `/api/enrollments/[id]/exceptions` | POST | Create new exception |
| `/api/enrollments/[id]/exceptions/[excId]` | DELETE | Remove exception |

**And** POST creates exception with validation:

```typescript
const createExceptionSchema = z.object({
  exception_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exception_type: z.enum(['CANCELLED_STUDENT', 'CANCELLED_TEACHER', 'RESCHEDULED']),
  reason: z.string().optional(),
  rescheduled_to_date: z.string().optional(),
  rescheduled_to_time: z.string().optional(),
})
```

**And** teacher cancellations (CANCELLED_TEACHER) set `approved_by = null` initially
**And** admin can create any exception type
**And** parent can only create CANCELLED_STUDENT for their child's enrollments

**Prerequisites:** Story 3.2 (Exception Repository)

**Technical Notes:**

- Teacher cancellation workflow: create with pending approval, admin approves later
- Validate exception_date is in the future (can't cancel past classes)
- Validate rescheduled_to fields are present for RESCHEDULED type

---

### Story 3.6: Create Completion API Endpoints

As a **developer**,
I want API endpoints for marking classes complete,
So that teachers can record completed classes with notes.

**Acceptance Criteria:**

**Given** the completion repository is complete
**When** I create completion API routes
**Then** the following endpoints exist:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enrollments/[id]/completions` | GET | List completions for enrollment |
| `/api/enrollments/[id]/completions` | POST | Mark class as complete |
| `/api/enrollments/[id]/completions/[cmpId]` | PUT | Update completion notes |

**And** POST creates completion:

```typescript
const createCompletionSchema = z.object({
  class_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  class_time: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(['COMPLETED', 'NO_SHOW']).default('COMPLETED'),
  notes: z.string().max(1000).optional(),
  is_makeup: z.boolean().default(false),
  makeup_for_date: z.string().optional(),
})
```

**And** only the assigned teacher can mark their classes complete
**And** admin can create completions for any enrollment
**And** duplicate completion for same date is prevented

**Prerequisites:** Story 3.3 (Completion Repository)

**Technical Notes:**

- Validate class_date matches enrollment's day_of_week
- Validate no existing completion for this enrollment+date
- Notes can be updated within 7 days of creation

---

### Story 3.7: Create Teacher Schedule Page

As a **teacher**,
I want to view my weekly schedule,
So that I know which classes I have and their details.

**Acceptance Criteria:**

**Given** I am logged in as a teacher
**When** I navigate to `/teacher/schedule`
**Then** I see my weekly schedule with:

- Week navigation (< Previous | Current Week | Next >)
- Day columns (Monday through Friday, optionally Saturday)
- Time slots showing my classes

**And** each class card shows:

- Student name
- Time (e.g., "09:00 - 10:00")
- Status badge (Scheduled, Completed, Cancelled, Pausado)
- Location hint (neighborhood, e.g., "Trindade")

**And** I can click a scheduled class to see:

- Full student details (name, age)
- Full address (decrypted)
- Any notes from previous classes
- "Complete Class" button

**And** cancelled slots show "Available for Makeup" indicator
**And** I can navigate between weeks to see past/future schedule

**Prerequisites:** Story 3.4 (Schedule API)

**Technical Notes:**

- File: `src/pages/teacher/schedule.astro`
- Mobile-first design (teachers use phones)
- Large touch targets for "Complete Class" button
- Use ScheduleGrid.astro component
- Color coding: Scheduled=blue, Completed=green, Cancelled=gray, Pausado=yellow

---

### Story 3.8: Implement Class Completion Flow

As a **teacher**,
I want to mark a class as complete and add notes,
So that the class is recorded for the student's history.

**Acceptance Criteria:**

**Given** I am viewing a scheduled class on my schedule
**When** I click "Complete Class"
**Then** a modal opens with:

- Class details (student, date, time)
- Status selector: Completed / No-Show
- Notes textarea with placeholder: "What did you work on today?"
- Cancel and Submit buttons

**And** on successful submission:

- Completion is created via POST /api/enrollments/[id]/completions
- Class card updates to show "Completed" status with green badge
- Toast notification: "Class marked as complete"
- Notes are saved and visible to parents

**And** I can add/edit notes for a completed class within 7 days

**Prerequisites:** Story 3.7 (Teacher Schedule Page), Story 3.6 (Completion API)

**Technical Notes:**

- Modal pre-fills date/time from schedule
- Notes support basic formatting (line breaks preserved)
- NO_SHOW requires confirmation: "Mark student as no-show? This will still count for billing."
- Completed classes cannot be "uncompleted" (create exception instead)

---

### Story 3.9: Implement Class Cancellation Flow (Teacher)

As a **teacher**,
I want to request cancellation of a class,
So that I can notify admin when I cannot teach.

**Acceptance Criteria:**

**Given** I am viewing a scheduled class on my schedule
**When** I click "Request Cancellation"
**Then** a modal opens with:

- Class details (student, date, time)
- Reason textarea (required)
- Submit button

**And** on submission:

- Exception created with type=CANCELLED_TEACHER, approved_by=null
- Class card updates to show "Cancellation Pending" status
- Admin receives notification (or sees in approval queue)
- Toast: "Cancellation request submitted for admin approval"

**And** I can see pending cancellation requests on my schedule
**And** I cannot cancel a class that's already completed

**Prerequisites:** Story 3.7 (Teacher Schedule Page), Story 3.5 (Exception API)

**Technical Notes:**

- Teacher cancellation requires admin approval (FR13, FR14)
- Pending cancellations show in admin approval queue
- Approved cancellations update exception with approved_by and approved_at
- Class slot becomes "available for makeup" after approval

---

### Story 3.10: Create Teacher Cancellation Approval Flow

As an **admin**,
I want to approve or reject teacher cancellation requests,
So that I can manage schedule changes.

**Acceptance Criteria:**

**Given** a teacher has requested a class cancellation
**When** I view the approvals page
**Then** I see pending teacher cancellation requests with:

- Teacher name
- Student name
- Class date/time
- Reason provided
- Approve / Reject buttons

**And** when I click Approve:

- Exception updated with approved_by=my email, approved_at=now
- Teacher sees "Cancelled" status on their schedule
- Parent sees "Cancelled by Teacher" on their view
- Toast: "Cancellation approved"

**And** when I click Reject:

- Exception is deleted
- Teacher sees "Scheduled" status (cancellation rejected)
- Teacher notified (or sees rejection in UI)
- Toast: "Cancellation rejected"

**Prerequisites:** Story 3.9 (Teacher Cancellation Flow)

**Technical Notes:**

- Extend existing `/admin/approvals.astro` page
- Or create new section on admin dashboard
- Filter: show only exceptions where approved_by IS NULL and type=CANCELLED_TEACHER
- Notify affected parents when cancellation is approved (future: WhatsApp)

---

### Story 3.11: Display Teacher Monthly Summary

As a **teacher**,
I want to see my monthly class count and earnings,
So that I can track my work and expected payment.

**Acceptance Criteria:**

**Given** I am on my schedule page
**When** I view the monthly summary section
**Then** I see:

- Total classes completed this month
- Total classes scheduled remaining
- Estimated earnings (completed × hourly rate)
- Breakdown by student (optional detail view)

**And** the summary shows:

```
December 2025
━━━━━━━━━━━━━━━━━━━━━
Completed:     24 classes
Scheduled:      8 classes
No-Shows:       2 classes
━━━━━━━━━━━━━━━━━━━━━
Estimated Earnings: R$ 2,600
```

**And** I can click to see per-student breakdown
**And** I can navigate to previous months

**Prerequisites:** Story 3.7 (Teacher Schedule Page), Story 3.3 (Completion Repository)

**Technical Notes:**

- Query completions for teacher by month
- Sum (completions.count × enrollment.hourly_rate) for each enrollment
- Display in sidebar or collapsible section on schedule page
- FR22, FR23 coverage

---

### Epic 3 Summary

| Metric | Value |
|--------|-------|
| Stories Created | 11 |
| FR Coverage | FR10-FR18 (Class Instances), FR19-FR24 (Teacher Schedule) |
| Key Deliverables | Schedule generator, Exception/Completion tracking, Teacher UI, Cancellation workflow |

---

## Epic 4 Stories

### Story 4.1: Create Parent Classes API Endpoint

As a **developer**,
I want an API endpoint for parent class data,
So that parents can view their children's enrollment and class history.

**Acceptance Criteria:**

**Given** the enrollment and completion repositories exist
**When** I create the parent classes API
**Then** `GET /api/parent/classes` returns:

```json
{
  "children": [
    {
      "student_id": "stu_xxx",
      "student_name": "João Silva",
      "enrollments": [
        {
          "enrollment_id": "enr_xxx",
          "teacher_name": "Maria Costa",
          "day_of_week": 1,
          "start_time": "15:00",
          "language": "Inglês",
          "status": "ATIVO",
          "upcoming_classes": [
            { "date": "2025-01-06", "status": "SCHEDULED" },
            { "date": "2025-01-13", "status": "SCHEDULED" }
          ],
          "recent_completions": [
            {
              "date": "2024-12-30",
              "status": "COMPLETED",
              "notes": "Worked on past tense verbs. Great progress!"
            }
          ]
        }
      ]
    }
  ]
}
```

**And** parents can only see their own children's data
**And** data is filtered by parent's student associations
**And** includes 4 weeks of upcoming classes and 4 weeks of history

**Prerequisites:** Story 3.1 (Schedule Generator), Story 3.3 (Completion Repository)

**Technical Notes:**

- File: `src/pages/api/parent/classes.ts`
- Parent-student relationship via `students.parent_email` field
- Reuse schedule generator for upcoming classes
- Join with teachers table for teacher_name

---

### Story 4.2: Create Parent Dashboard Page

As a **parent**,
I want to see my child's enrollment status and upcoming classes,
So that I know what's scheduled and can plan accordingly.

**Acceptance Criteria:**

**Given** I am logged in as a parent
**When** I navigate to `/parent` or `/parent/classes`
**Then** I see my children listed with their enrollment status:

- Child's name and age
- Teacher's name
- Schedule (e.g., "Mondays at 15:00")
- Language (Inglês or Espanhol)
- Status badge (Ativo, Pausado)

**And** for each child I see upcoming classes:

- Next 4 scheduled classes with dates
- Any cancelled classes with reason shown
- Any closures/holidays marked

**And** if I have multiple children, each child has their own section
**And** the page is mobile-optimized (parents use phones)

**Prerequisites:** Story 4.1 (Parent Classes API)

**Technical Notes:**

- File: `src/pages/parent/classes.astro`
- Use Card component for each child
- Use StatusBadge for enrollment status
- Simple, clean layout - parents are not tech-focused
- BILIN brand colors (coral primary)

---

### Story 4.3: Display Class History with Teacher Notes

As a **parent**,
I want to see my child's class history with teacher notes,
So that I know what was taught in each class.

**Acceptance Criteria:**

**Given** I am viewing my child's enrollment on the parent dashboard
**When** I scroll down or click "View History"
**Then** I see completed classes with:

- Date of class
- Status (Completed or No-Show)
- Teacher's notes about the class
- Expandable/collapsible for long notes

**And** the history shows most recent classes first
**And** I can load more history (pagination or infinite scroll)
**And** cancelled classes appear in history with cancellation reason

Example display:

```
📚 Class History

December 30, 2024 - Completed ✓
"Worked on past tense verbs. João did great with
irregular verbs! Homework: practice worksheet."

December 23, 2024 - Cancelled (Holiday)
"Recesso de Natal"

December 16, 2024 - Completed ✓
"Reviewed vocabulary chapter 5. Started new
conversation exercises."
```

**Prerequisites:** Story 4.2 (Parent Dashboard)

**Technical Notes:**

- Show last 10 completions by default, "Load More" for history
- Notes displayed with line breaks preserved
- Cancelled classes show exception reason
- Visual distinction: completed=green check, cancelled=gray, no-show=yellow

---

### Story 4.4: Implement Parent Class Cancellation

As a **parent**,
I want to cancel an upcoming class for my child,
So that the teacher knows my child won't attend.

**Acceptance Criteria:**

**Given** I am viewing upcoming classes for my child
**When** I click "Cancel Class" on a scheduled class
**Then** a modal opens with:

- Class details (date, time, teacher)
- Reason dropdown: "Sick", "Travel", "Family event", "Other"
- Notes textarea (optional)
- Cancel and Confirm buttons

**And** on confirmation:

- Exception created with type=CANCELLED_STUDENT
- Class shows as "Cancelled by you" in upcoming list
- Teacher sees cancellation on their schedule
- Toast: "Class cancelled"

**And** I cannot cancel:

- Classes that already happened
- Classes less than 2 hours away (configurable)
- Classes already cancelled

**Prerequisites:** Story 4.2 (Parent Dashboard), Story 3.5 (Exception API)

**Technical Notes:**

- Minimum cancellation notice: 2 hours (configurable)
- Parent cancellations don't require admin approval
- Exception recorded with created_by='student'
- Slot becomes "available for makeup" after cancellation

---

### Story 4.5: Display Invoice Summary

As a **parent**,
I want to see a monthly invoice summary,
So that I understand how much I owe for classes.

**Acceptance Criteria:**

**Given** I am viewing my child's enrollment
**When** I click "Invoice" or view the invoice section
**Then** I see a monthly summary:

```
January 2025 Invoice Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Classes Completed:    4
No-Shows (billable):  1
Cancelled (you):      1 (not billed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rate per class:       R$ 100,00
Total:                R$ 500,00
```

**And** I can view previous months
**And** cancelled-by-student classes are not billed
**And** no-shows are billed (student didn't attend but class was held)
**And** cancelled-by-teacher classes are not billed

**Prerequisites:** Story 4.2 (Parent Dashboard), Story 3.3 (Completion Repository)

**Technical Notes:**

- Query completions for student by month
- Calculate: (COMPLETED count + NO_SHOW count) × hourly_rate
- Cancelled by student/teacher = not billed (no completion record)
- Display is informational - actual billing handled externally
- FR29 coverage

---

### Epic 4 Summary

| Metric | Value |
|--------|-------|
| Stories Created | 5 |
| FR Coverage | FR25-FR29 (Parent Dashboard) |
| Key Deliverables | Parent classes API, Dashboard, History view, Class cancellation, Invoice summary |

---

## Epic 5 Stories

### Story 5.1: Create Lead Repository and Service

As a **developer**,
I want a repository and service for managing leads,
So that lead data can be stored and processed.

**Acceptance Criteria:**

**Given** the lead database table exists
**When** I implement the lead repository and service
**Then** `src/lib/repositories/d1/lead.ts` provides:

- `create(data)` - Creates new lead from JotForm data
- `findById(id)` - Gets single lead
- `findAll()` - Gets all leads
- `findByStatus(status)` - Filter leads by status
- `findByNeighborhood(neighborhood)` - Filter by location
- `update(id, data)` - Updates lead details
- `updateStatus(id, status, reason?)` - Changes lead status

**And** `src/lib/services/lead-service.ts` provides:

```typescript
interface LeadService {
  createFromJotForm(jotFormData: JotFormSubmission): Promise<Lead>
  getLead(id: string): Promise<Lead>
  getLeadsByStatus(status: LeadStatus): Promise<Lead[]>
  updateLeadStatus(id: string, status: LeadStatus, reason?: string): Promise<Lead>
  convertToEnrollment(leadId: string, enrollmentData: CreateEnrollmentData): Promise<Enrollment>
}
```

**And** lead statuses follow the defined flow:

- AGUARDANDO → EM_ANALISE → WAITLIST | CONTRACTED | NOT_A_MATCH

**Prerequisites:** Story 1.3 (D1 Repository Layer)

**Technical Notes:**

- Lead data includes encrypted sensitive fields
- JotForm webhook integration planned (or manual CSV import)
- Conversion creates both student record and enrollment
- FR30, FR33 coverage

---

### Story 5.2: Implement Lead Matching Service

As a **developer**,
I want a service that suggests teacher matches for leads,
So that admin can see which teachers have compatible availability.

**Acceptance Criteria:**

**Given** a lead has availability preferences
**When** I request matching teachers
**Then** `src/lib/services/lead-matching.ts` provides:

```typescript
interface TeacherMatch {
  teacher_id: string
  teacher_name: string
  match_score: number         // 0-100
  matching_slots: Array<{
    day_of_week: number
    time: string
    status: 'LIVRE'
  }>
  distance_km?: number        // If location matching enabled
}

async function findMatchingTeachers(lead: Lead): Promise<TeacherMatch[]>
```

**And** matching algorithm considers:

1. **Availability overlap** - Lead's available times vs teacher's LIVRE slots
2. **Location proximity** - Lead's neighborhood vs teacher's service area (if available)
3. **Language** - Lead's desired language vs teacher's languages

**And** results are sorted by match_score (highest first)
**And** only shows teachers with at least one LIVRE slot matching lead's availability

**Prerequisites:** Story 2.3 (Slot Service), Story 5.1 (Lead Service)

**Technical Notes:**

- Match score formula: (matching_slots × 20) + (location_match × 30) + (language_match × 50)
- Location matching uses neighborhood (bairro) string matching initially
- Future: Geocoding for distance calculation
- FR32 coverage

---

### Story 5.3: Create Lead API Endpoints

As a **developer**,
I want API endpoints for lead management,
So that the admin UI can interact with lead data.

**Acceptance Criteria:**

**Given** the lead service is complete
**When** I create API routes
**Then** the following endpoints exist:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leads` | GET | List all leads (filterable) |
| `/api/leads` | POST | Create new lead (admin or webhook) |
| `/api/leads/[id]` | GET | Get single lead with matches |
| `/api/leads/[id]` | PUT | Update lead details |
| `/api/leads/[id]/status` | PUT | Change lead status |
| `/api/leads/[id]/convert` | POST | Convert lead to enrollment |
| `/api/leads/[id]/matches` | GET | Get teacher matches for lead |

**And** GET /api/leads supports query params:

- `?status=AGUARDANDO` - Filter by status
- `?neighborhood=Trindade` - Filter by neighborhood

**And** POST /api/leads/[id]/convert:

```typescript
// Request body
{
  "teacher_id": "tea_xxx",
  "day_of_week": 1,
  "start_time": "15:00",
  "language": "Inglês",
  "hourly_rate": 100
}

// Creates:
// 1. Student record (if not exists)
// 2. Enrollment with ATIVO status
// 3. Updates lead status to CONTRACTED
```

**Prerequisites:** Story 5.1 (Lead Service), Story 5.2 (Lead Matching)

**Technical Notes:**

- Only admin can access lead endpoints
- Convert endpoint validates slot is LIVRE before creating enrollment
- Webhook endpoint for JotForm integration (separate auth)
- FR30-FR36 coverage

---

### Story 5.4: Create Admin Leads Page

As an **admin**,
I want a page to view and manage leads,
So that I can process new student inquiries.

**Acceptance Criteria:**

**Given** I am logged in as admin
**When** I navigate to `/admin/leads`
**Then** I see a list of leads with columns:

- Student Name
- Parent Name
- Neighborhood
- Preferred Times (summary)
- Language
- Status (with StatusBadge)
- Actions (View, Update Status)

**And** I can filter by:

- Status dropdown (All, Aguardando, Em Análise, Waitlist, etc.)
- Neighborhood search/dropdown
- Language filter

**And** I can click a lead to see full details:

- All contact information
- Complete availability grid
- Location details
- Notes/comments
- Suggested teacher matches

**And** the list shows most recent leads first (by created_at)

**Prerequisites:** Story 5.3 (Lead API)

**Technical Notes:**

- File: `src/pages/admin/leads.astro`
- Use existing BILIN Design System components
- Lead card shows summary; modal/detail view shows full info
- Status badges use color coding: Aguardando=blue, Em Análise=yellow, Waitlist=orange, Contracted=green, Not a Match=gray

---

### Story 5.5: Display Teacher Match Suggestions

As an **admin**,
I want to see suggested teacher matches when viewing a lead,
So that I can quickly find compatible teachers.

**Acceptance Criteria:**

**Given** I am viewing a lead's detail
**When** I look at the "Suggested Teachers" section
**Then** I see matching teachers ranked by compatibility:

```
🎯 Suggested Teachers for João

1. Maria Silva - 85% match
   ✓ 3 matching slots: Mon 15:00, Wed 15:00, Fri 15:00
   ✓ Same neighborhood: Trindade
   ✓ Teaches: Inglês
   [Select Teacher]

2. Carlos Santos - 60% match
   ✓ 1 matching slot: Mon 16:00
   ○ Different area: Centro (2.5km)
   ✓ Teaches: Inglês
   [Select Teacher]

No more matching teachers found.
```

**And** clicking "Select Teacher" pre-fills the conversion form
**And** I can expand each teacher to see their full slot grid
**And** matches update if I change the lead's availability preferences

**Prerequisites:** Story 5.4 (Admin Leads Page), Story 5.2 (Lead Matching)

**Technical Notes:**

- Display top 5 matches by default
- Show match score breakdown (why this score?)
- "Select Teacher" opens conversion modal with teacher pre-selected
- Real-time: if teacher gets booked, match disappears

---

### Story 5.6: Implement Lead to Enrollment Conversion

As an **admin**,
I want to convert a lead to an enrollment,
So that the student starts classes with an assigned teacher.

**Acceptance Criteria:**

**Given** I am viewing a lead's detail
**When** I click "Convert to Enrollment"
**Then** a modal opens with:

- Lead summary (student name, parent info)
- Teacher selector (pre-filled if from match suggestion)
- Day/Time slot picker (shows only LIVRE slots for selected teacher)
- Language selector
- Hourly rate input (default from teacher's rate)
- Notes textarea

**And** on submission:

1. **Student record created** (if student email/CPF doesn't exist)
2. **Enrollment created** with ATIVO status
3. **Lead status updated** to CONTRACTED
4. **Slot becomes BLOCKED**
5. Toast: "Lead converted successfully! Enrollment created."

**And** the form validates:

- Selected slot is still LIVRE (real-time check)
- Required fields are filled
- Teacher teaches the selected language

**And** I'm redirected to the new enrollment detail

**Prerequisites:** Story 5.5 (Match Suggestions), Story 2.1 (Enrollment Service)

**Technical Notes:**

- Transaction: create student + enrollment + update lead atomically
- If student exists (by parent_email), link to existing
- Audit log: "Lead led_xxx converted to enrollment enr_xxx"
- FR33 coverage

---

### Story 5.7: Implement Lead Status Management

As an **admin**,
I want to update lead statuses,
So that I can track leads through the pipeline.

**Acceptance Criteria:**

**Given** I am viewing a lead
**When** I click "Update Status"
**Then** I can change status to:

| Current | Can Change To |
|---------|---------------|
| AGUARDANDO | EM_ANALISE, NOT_A_MATCH |
| EM_ANALISE | WAITLIST, NOT_A_MATCH, (CONTRACTED via convert) |
| WAITLIST | EM_ANALISE, NOT_A_MATCH, (CONTRACTED via convert) |
| CONTRACTED | (terminal) |
| NOT_A_MATCH | EM_ANALISE (reopen) |

**And** changing to NOT_A_MATCH requires a reason:

- "No matching availability"
- "Outside service area"
- "Price mismatch"
- "Other" (with notes)

**And** WAITLIST shows on a separate "Waitlist" tab for easy access
**And** status history is tracked (when changed, by whom)

**Prerequisites:** Story 5.4 (Admin Leads Page)

**Technical Notes:**

- Status changes update `status_changed_at` timestamp
- Store `status_reason` for NOT_A_MATCH and WAITLIST
- Waitlist leads shown prominently when new slots open
- FR34, FR35 coverage

---

### Epic 5 Summary

| Metric | Value |
|--------|-------|
| Stories Created | 7 |
| FR Coverage | FR30-FR36 (Lead Management) |
| Key Deliverables | Lead service, Teacher matching, Lead management UI, Conversion workflow |

---

## FR Coverage Matrix

### Complete FR to Story Mapping

| FR | Description | Story | Status |
|----|-------------|-------|--------|
| **Enrollment Management** |
| FR1 | Admin can create enrollment | 2.7 | ✓ |
| FR2 | Admin can change enrollment status | 2.8 | ✓ |
| FR3 | Admin can edit enrollment teacher | 2.7 | ✓ |
| FR4 | Admin can edit enrollment day/time | 2.7 | ✓ |
| FR5 | Admin can terminate enrollment | 2.8 | ✓ |
| FR6 | Admin can view enrollments with filtering | 2.7 | ✓ |
| FR7 | PAUSADO auto-returns after 3 weeks | 2.4 | ✓ |
| FR8 | 5-month PAUSADO cooldown | 2.4 | ✓ |
| FR9 | Block enrollment if slot BLOCKED | 2.1 | ✓ |
| **Class Instance Management** |
| FR10 | System generates class instances | 3.1 | ✓ |
| FR11 | Admin can cancel class instance | 3.5 | ✓ |
| FR12 | Parent can cancel class instance | 4.4 | ✓ |
| FR13 | Teacher can request cancellation | 3.9 | ✓ |
| FR14 | Admin approves teacher cancellations | 3.10 | ✓ |
| FR15 | Teacher marks class complete | 3.8 | ✓ |
| FR16 | Teacher adds notes to completed class | 3.8 | ✓ |
| FR17 | Admin schedules makeup class | 3.5 | ✓ |
| FR18 | System tracks instance status | 3.1 | ✓ |
| **Teacher Schedule & Availability** |
| FR19 | Teacher views daily/weekly schedule | 3.7 | ✓ |
| FR20 | Teacher sees LIVRE vs BLOCKED slots | 3.7 | ✓ |
| FR21 | Teacher sees cancelled as makeup-available | 3.7 | ✓ |
| FR22 | Teacher views monthly class count | 3.11 | ✓ |
| FR23 | Teacher views monthly earnings | 3.11 | ✓ |
| FR24 | Admin views any teacher's schedule | 2.9 | ✓ |
| **Parent Dashboard** |
| FR25 | Parent views enrollment status | 4.2 | ✓ |
| FR26 | Parent views class history | 4.3 | ✓ |
| FR27 | Parent views teacher notes | 4.3 | ✓ |
| FR28 | Parent views upcoming classes | 4.2 | ✓ |
| FR29 | Parent sees invoice summary | 4.5 | ✓ |
| **Lead Management** |
| FR30 | Admin imports lead data | 5.1 | ✓ |
| FR31 | Admin views lead details | 5.4 | ✓ |
| FR32 | Admin sees teacher matches | 5.5 | ✓ |
| FR33 | Admin converts lead to enrollment | 5.6 | ✓ |
| FR34 | Admin marks lead as Waitlist | 5.7 | ✓ |
| FR35 | Admin marks lead as Not a Match | 5.7 | ✓ |
| FR36 | Admin views leads with filtering | 5.4 | ✓ |
| **Slot & Conflict Management** |
| FR37 | System maintains slot status | 2.3 | ✓ |
| FR38 | System prevents conflicts | 2.1 | ✓ |
| FR39 | Slot BLOCKED on enrollment create | 2.1 | ✓ |
| FR40 | Slot LIVRE on enrollment terminate | 2.1 | ✓ |
| FR41 | Admin views teacher slot grid | 2.9 | ✓ |
| **Status Lifecycle** |
| FR42 | System enforces valid transitions | 2.2 | ✓ |
| FR43 | System tracks PAUSADO start date | 2.4 | ✓ |
| FR44 | System tracks cooldown expiry | 2.4 | ✓ |
| FR45 | System blocks PAUSADO during cooldown | 2.4 | ✓ |
| FR46 | Admin can override cooldown | 2.8 | ✓ |
| **User Auth & Roles** |
| FR47 | Google OAuth authentication | Existing | ✓ |
| FR48 | System assigns role by email | Existing | ✓ |
| FR49 | Dashboard restricted by role | Existing | ✓ |
| FR50 | Admin views all data | 2.5, 2.7 | ✓ |
| FR51 | Teacher views own data only | 3.4 | ✓ |
| FR52 | Parent views children's data only | 4.1 | ✓ |

### Coverage Summary

| Category | FRs | Covered | Percentage |
|----------|-----|---------|------------|
| Enrollment Management | FR1-FR9 | 9/9 | 100% |
| Class Instances | FR10-FR18 | 9/9 | 100% |
| Teacher Schedule | FR19-FR24 | 6/6 | 100% |
| Parent Dashboard | FR25-FR29 | 5/5 | 100% |
| Lead Management | FR30-FR36 | 7/7 | 100% |
| Slot Management | FR37-FR41 | 5/5 | 100% |
| Status Lifecycle | FR42-FR46 | 5/5 | 100% |
| Auth & Roles | FR47-FR52 | 6/6 | 100% |
| **Total** | **FR1-FR52** | **52/52** | **100%** |

---

## Summary

### Epic Overview

| Epic | Stories | FRs | Key Deliverables |
|------|---------|-----|------------------|
| 1. Foundation | 5 | 6 | Database schema, Repositories, Validation, Constants |
| 2. Enrollment Management | 9 | 20 | Enrollment CRUD, Status machine, Slot service, Admin UI |
| 3. Schedule & Instances | 11 | 15 | Schedule generator, Exceptions, Completions, Teacher UI |
| 4. Parent Experience | 5 | 5 | Parent dashboard, History, Cancellation, Invoice |
| 5. Lead Pipeline | 7 | 7 | Lead management, Matching, Conversion workflow |
| **Total** | **37** | **52** | |

### Story Dependency Chain

```text
Epic 1 (Foundation)
├── 1.1 Database Schema
├── 1.2 Repository Interfaces ─────────────┐
├── 1.3 D1 Repository Layer ◄──────────────┤
├── 1.4 Zod Validation ◄───────────────────┤
└── 1.5 Status Constants                   │
                                           │
Epic 2 (Enrollment) ◄──────────────────────┘
├── 2.1 Enrollment Service ◄── 1.3
├── 2.2 Status Machine ◄── 1.5
├── 2.3 Slot Service ◄── 2.1
├── 2.4 PAUSADO Automator ◄── 2.2
├── 2.5 Enrollment API ◄── 2.1, 1.4
├── 2.6 Slots API ◄── 2.3
├── 2.7 Admin Enrollments Page ◄── 2.5, 2.6
├── 2.8 Status Change UI ◄── 2.7
└── 2.9 Slot Grid View ◄── 2.6

Epic 3 (Schedule) ◄── Epic 2
├── 3.1 Schedule Generator ◄── 2.1
├── 3.2 Exception Repository ◄── 1.3
├── 3.3 Completion Repository ◄── 1.3
├── 3.4 Schedule API ◄── 3.1
├── 3.5 Exception API ◄── 3.2
├── 3.6 Completion API ◄── 3.3
├── 3.7 Teacher Schedule Page ◄── 3.4
├── 3.8 Completion Flow ◄── 3.7, 3.6
├── 3.9 Teacher Cancellation ◄── 3.7, 3.5
├── 3.10 Cancellation Approval ◄── 3.9
└── 3.11 Monthly Summary ◄── 3.7, 3.3

Epic 4 (Parent) ◄── Epic 3
├── 4.1 Parent Classes API ◄── 3.1, 3.3
├── 4.2 Parent Dashboard ◄── 4.1
├── 4.3 Class History ◄── 4.2
├── 4.4 Parent Cancellation ◄── 4.2, 3.5
└── 4.5 Invoice Summary ◄── 4.2, 3.3

Epic 5 (Leads) ◄── Epic 2
├── 5.1 Lead Repository/Service ◄── 1.3
├── 5.2 Lead Matching ◄── 2.3, 5.1
├── 5.3 Lead API ◄── 5.1, 5.2
├── 5.4 Admin Leads Page ◄── 5.3
├── 5.5 Match Suggestions ◄── 5.4, 5.2
├── 5.6 Lead Conversion ◄── 5.5, 2.1
└── 5.7 Lead Status Management ◄── 5.4
```

### Implementation Recommendations

1. **Start with Epic 1** - Foundation enables everything
2. **Epic 2 is the core** - Enrollment management is the main innovation
3. **Epics 3-5 can partially parallel** - Different teams could work on Teacher UI vs Parent UI vs Lead pipeline
4. **Reuse components** - SlotPicker, StatusBadge, ScheduleGrid used across multiple pages
5. **Mobile-first for parents/teachers** - Admin can be desktop-optimized

### Technical Architecture Alignment

All stories align with the Architecture document:

- **Repository Pattern** - Services use interfaces, D1 implements
- **Computed Slots** - No slot table, derived from enrollments
- **Lazy PAUSADO** - No cron jobs, evaluated on access
- **Role-based Filtering** - Applied at API layer
- **BILIN Design System** - All UI uses existing components

---

## MVP Completion Summary

**All MVP work is complete as of 2025-12-17:**

| Area | Status | Details |
|------|--------|---------|
| **Epic 1: Foundation** | ✅ Complete | Database schema, repositories, validation, constants |
| **Epic 2: Enrollment Management** | ✅ Complete | CRUD, status machine, slot service, admin UI |
| **Epic 3: Schedule & Instances** | ✅ Complete | Schedule generator, exceptions, completions, teacher UI |
| **Epic 4: Parent Experience** | ✅ Complete | Parent dashboard, history, cancellation, invoice |
| **Epic 5: Lead Pipeline** | ✅ Complete | Lead management, matching, conversion workflow |
| **Data Model Hardening** | ✅ Complete | 21 issues resolved (cascade deletes, race conditions, validation, indexes, status history) |

**Production Readiness:**
- ✅ Zero double-bookings possible (unique index enforcement)
- ✅ Status lifecycle with history tracking
- ✅ Minute-based slot blocking at 30-min intervals
- ✅ Cascade deletes prevent orphaned records
- ✅ PAUSADO/AVISO auto-transitions with logging
- ✅ Group billing validation

---

_Document generated: 2025-12-07_
_Last updated: 2025-12-17 (MVP Complete)_
_For Phase 2+ implementation: See Epic 6 in [epic-6-advanced-enrollment.md](./epic-6-advanced-enrollment.md)_
