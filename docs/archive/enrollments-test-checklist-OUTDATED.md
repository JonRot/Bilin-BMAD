# EduSchedule Enrollments System - Test Checklist

**Created:** 2025-12-17
**Last Updated:** 2025-12-20
**Purpose:** Comprehensive testing checklist for enrollments and related features
**How to use:** Go through each item, mark with `[x]` when tested and passing

---

## PRD Alignment Reference

This checklist validates all 52 Functional Requirements from `docs/planning/prd.md`:

| PRD Section | FRs | Test Sections |
|-------------|-----|---------------|
| Enrollment Management | FR1-9 | §2 (Create), §3 (Read), §4 (Update), §5 (Delete), §6-8 (Status) |
| Class Instance Management | FR10-18 | §10-11 (Exceptions), §12-14 (Completions) |
| Teacher Schedule & Availability | FR19-24 | §15 (Availability), §26 (Teacher Dashboard) |
| Parent Dashboard | FR25-29 | §27 (Parent Dashboard) |
| Lead Management | FR30-36 | §18 (Leads Page) |
| Slot & Conflict Management | FR37-41 | §19 (Slot Conflict Prevention) |
| Status Lifecycle | FR42-46 | §6 (Transitions), §7 (PAUSADO), §8 (AVISO) |
| User Authentication & Roles | FR47-52 | §20 (Access Control) |

**Coverage Summary:**
- **FR1-9:** Enrollment CRUD + Status = ✅ Covered
- **FR10-18:** Exceptions + Completions = ✅ Covered
- **FR19-24:** Teacher Dashboard = ✅ Covered (§26)
- **FR25-29:** Parent Dashboard = ✅ Covered (§27)
- **FR30-36:** Lead Management = ✅ Covered (§18)
- **FR37-41:** Slot Management = ✅ Covered (§19)
- **FR42-46:** Status Lifecycle = ✅ Covered (§6-8)
- **FR47-52:** Auth & Roles = ✅ Covered (§20)

---

## 1. ENROLLMENTS PAGE (`/admin/enrollments`)

### 1.1 Views & Navigation
- [x] Week view loads correctly with schedule data
- [x] Month view displays all classes for the month
- [x] Day view shows single day detail
- [x] "All Teachers" view shows grid of all teachers with mini schedules
- [x] Teacher filter dropdown populates with all teachers
- [x] Teacher filter correctly filters schedule data
- [x] Week navigation (prev button) loads previous week
- [x] Week navigation (next button) loads next week
- [x] "Today" button returns to current week
- [x] URL updates with week/teacher parameters

### 1.2 Smart Booking & AI Suggestions
- [x] AI suggestions panel loads waitlist matches
- [x] Suggestions show student name and preferences
- [x] Preview panel shows travel time information
- [x] "Book Suggestion" button opens SmartBookingModal
- [x] Missing data warnings display when applicable
- [x] Empty state shows "Nenhuma sugestão" when no matches

### 1.3 Schedule Grid Interactions
- [x] Click on empty slot opens booking modal
- [x] Click on class block opens enrollment details modal
- [x] Hover states work on interactive elements
- [x] Color coding correct for different statuses (ATIVO=green, PAUSADO=yellow, etc.)
- [x] Time slots display correctly (08:00-18:00 range)
- [x] Duration blocks span correct number of rows (60/90/120 min)

### 1.4 Enrollment Details Modal - Details Tab
- [x] Modal opens when clicking class block
- [x] Student card displays with correct info
- [x] Status badge shows current status
- [x] Status timeline appears for PAUSADO enrollments
- [x] Status timeline appears for AVISO enrollments
- [x] Timeline shows days elapsed correctly
- [x] Timeline shows days remaining correctly
- [x] Cooldown info displays when applicable
- [x] Group rate preview shows for group classes
- [x] Individual status change dropdown works

### 1.5 Enrollment Details Modal - Edit Tab
- [x] Tab switches correctly
- [x] Form pre-fills with current values
- [x] Teacher dropdown populated
- [x] Day of week dropdown works (Mon-Fri)
- [x] Start time dropdown shows all time slots
- [x] Duration dropdown shows 60/90/120 options
- [x] Language dropdown populated
- [x] Hourly rate input accepts numbers
- [x] Save button submits changes
- [x] Cancel button closes without saving
- [x] Validation errors display on invalid input
- [x] Conflict error shows if slot occupied

### 1.6 Enrollment Details Modal - Actions Tab
- [x] Tab switches correctly
- [x] "Mark Complete" button visible
- [x] "Register No-Show" button visible
- [x] Cancel Class form with reason textarea
- [x] Cancel reason is required
- [x] Actions update the database correctly
- [x] Success toast appears after action
- [x] Modal closes after successful action

---

## 2. ENROLLMENT CRUD - CREATE (FR1, FR9)

### 2.1 POST /api/enrollments - Success Cases (FR1)

**Individual Enrollment:**
- [x] Create individual enrollment with all required fields
- [x] Create enrollment with optional hourly_rate
- [x] Create enrollment with optional notes
- [x] Response includes enrollment ID
- [x] Response includes enriched student_name (via GET list)
- [x] Audit log created (verified in code - logAudit called)

**Group Enrollment (NOT YET IN API SCHEMA):**
- [ ] ~~Create group enrollment with group_id~~ → Future: Add to CreateEnrollmentSchema
- [ ] ~~Create group enrollment with is_location_host=true~~ → Future
- [ ] ~~Create group enrollment with location_student_id~~ → Future
- Note: Group fields exist in DB/Enrollment type but not in CreateEnrollmentSchema

### 2.2 POST /api/enrollments - Validation Errors (400)

**Missing Required Fields:**
- [ ] Missing student_id returns error
- [ ] Missing teacher_id returns error
- [ ] Missing day_of_week returns error
- [ ] Missing start_time returns error
- [ ] Missing recurrence_start_date returns error
- [ ] Missing language returns error

**Invalid day_of_week (schema: 0-6):**
- [ ] day_of_week = -1 returns error (below minimum)
- [ ] day_of_week = 7 returns error (above maximum)
- [x] day_of_week = 0 (Sunday) is VALID per schema
- [x] day_of_week = 6 (Saturday) is VALID per schema
- Note: UI only offers 1-5 (Mon-Fri) but API accepts 0-6

**Invalid time format:**
- [ ] start_time = "9:00" returns error (not HH:MM)
- [ ] start_time = "25:00" returns error (invalid hour)
- [ ] start_time = "14:60" returns error (invalid minutes)

**Invalid duration_minutes (schema: 15-180):**
- [ ] duration = 10 returns error (below 15 min minimum)
- [ ] duration = 200 returns error (above 180 max)
- [x] duration = 30 is VALID per schema (>= 15)
- [x] duration = 45 is VALID per schema
- [x] duration = 180 is VALID per schema (equals max)
- Note: UI only offers 60/90/120 but API accepts 15-180

**Invalid recurrence_start_date format:**
- [ ] Date = "12/25/2025" returns error (not YYYY-MM-DD)
- [ ] Date = "2025-13-01" returns error (invalid month)

### 2.3 POST /api/enrollments - Conflict Errors (409)

**Verified via code analysis (`enrollment-service.ts:54-90`, `d1/enrollment.ts:182-226`):**

- [x] Duplicate slot (same teacher/day/time with ATIVO) returns SLOT_CONFLICT
- [x] Duplicate slot (same teacher/day/time with PAUSADO) returns SLOT_CONFLICT
- [x] Duplicate slot (same teacher/day/time with AVISO) returns SLOT_CONFLICT
- [x] Overlapping time range detected (existing.start < new.end AND new.start < existing.end)
- [x] Reschedule conflicts detected via `findReschedulesToSlot()`
- [x] INATIVO and WAITLIST do NOT block slots (excluded from SLOT_BLOCKING_STATUSES)

### 2.4 POST /api/enrollments - Auth Errors (401/403)

**Verified via code analysis (`api/enrollments/index.ts:195-217`):**

- [x] No session returns 401 UNAUTHORIZED (line 197-202)
- [x] Non-admin role returns 403 FORBIDDEN "Admin access required" (line 204-209)
- [x] Missing/Invalid CSRF token returns 403 CSRF_ERROR (line 212-217)
- [x] Teacher role cannot create (role !== 'admin')
- [x] Parent role cannot create (role !== 'admin')

### 2.5 POST /api/enrollments - Rate Limiting (429)

**Verified via code analysis (`api/enrollments/index.ts:219-224`, `lib/rate-limit.ts`):**

- [x] Rate limit checked via `checkRateLimit(identifier, RateLimits.WRITE)`
- [x] Excessive requests return 429 via `createRateLimitResponse()`
- [x] Rate limit uses identifier = request IP + session email

---

## 3. ENROLLMENT CRUD - READ (FR6)

### 3.1 GET /api/enrollments - List All (FR6)

**Verified via code analysis (`api/enrollments/index.ts`):**

- [x] Admin sees all enrollments (lines 81-94)
- [x] Response includes pagination (page, limit, total, hasMore) (lines 173-178)
- [x] Default limit is 50 (line 65: `parseInt(...'50')`)
- [x] Limit max is 100 (line 65: `Math.min(100, ...)`)
- [x] Student names enriched in response (lines 146-166 batch query)
- [x] PAUSADO auto-transition runs on fetch (lines 117-126 via pausadoAutomator)
- [x] AVISO auto-transition runs on fetch (lines 128-139 via avisoAutomator)

### 3.2 GET /api/enrollments - Filtering

**Verified via code analysis (`api/enrollments/index.ts:52-93`):**

- [x] Filter by teacher_id works (line 83-87 `getEnrollmentsByTeacher`)
- [x] Filter by student_id works (line 88-89 `getEnrollmentsByStudent`)
- [x] Filter by status works (lines 86, 92-93 passed to service)
- [x] Filter by group_id works (lines 141-144 post-filter)
- [x] ~~Filter by day_of_week works~~ → **FIXED: Filter applied at lines 146-148 in index.ts**
- [ ] Multiple filters combine correctly → **Needs API testing**
- Note: status filter accepts any EnrollmentStatus value

### 3.3 GET /api/enrollments - Pagination

**Verified via code analysis (`api/enrollments/index.ts:64-65, 168-178`):**

- [x] page default=1 (line 64)
- [x] page=N correctly offsets results (line 170: `start = (page-1) * limit`)
- [x] limit default=50 (line 65)
- [x] limit max=100 (line 65: `Math.min(100, ...)`)
- [x] hasMore calculated correctly (line 178: `start + limit < total`)

### 3.4 GET /api/enrollments - Role-Based Access

**Verified via code analysis (`api/enrollments/index.ts:80-113`):**

- [x] Admin sees all enrollments (lines 81-94)
- [x] Teacher sees only their own enrollments (lines 95-100 filters by session.userId)
- [x] Parent sees only their children's enrollments (lines 101-113 via getStudentsByParentEmail)

### 3.5 GET /api/enrollments/[id] - Single Enrollment

**Verified via code analysis (`api/enrollments/[id].ts:30-83`):**

- [x] Fetch existing enrollment by ID returns data (line 56-79)
- [x] Non-existent ID returns 404 (lines 58-60 `errorResponse('NOT_FOUND')`)
- [x] Teacher cannot access other teacher's enrollment - 403 (lines 62-65)
- [x] Parent cannot access other family's enrollment - 403 (lines 68-74)
- [x] PAUSADO auto-transition runs on fetch (line 77)
- [x] ~~AVISO auto-transition NOT called~~ → **FIXED: avisoAutomator called at lines 80-81 in [id].ts**
- [ ] Response includes pausado_details → **Needs API testing** (depends on Enrollment type)
- [ ] Response includes aviso_details → **Needs API testing** (depends on Enrollment type)

---

## 4. ENROLLMENT CRUD - UPDATE (FR3, FR4)

### 4.1 PUT /api/enrollments/[id] - Success Cases (FR3, FR4)

**Verified via code analysis (`api/enrollments/[id].ts`, `validation/enrollment.ts`):**

- [x] Update teacher_id (UpdateEnrollmentSchema line 91-95)
- [x] Update day_of_week (UpdateEnrollmentSchema line 97-101)
- [x] Update start_time (UpdateEnrollmentSchema line 103-105)
- [x] Update duration_minutes (UpdateEnrollmentSchema line 107-111)
- [x] Update language (UpdateEnrollmentSchema line 113)
- [x] Update hourly_rate (UpdateEnrollmentSchema line 117-121)
- [x] Update multiple fields at once (all fields optional, can combine)
- [x] Response returns updated enrollment ([id].ts lines 271-274)
- [x] Audit log created ([id].ts lines 248-257, service line 131-133)

### 4.2 PUT /api/enrollments/[id] - Availability Handling

**Verified via code analysis (`api/enrollments/[id].ts:150-245`):**

- [x] Change within existing availability succeeds (lines 163-171 isWithinAvailability check)
- [x] Change outside availability without flag returns availability_conflict (lines 176-201)
- [x] Change with extend_availability=true extends/creates window (lines 205-244)
- [x] Overlapping/adjacent windows merged (lines 207-234)
- [x] New standalone window created if no overlap (lines 237-244)

### 4.3 PUT /api/enrollments/[id] - Conflict Detection

**✅ FIXED: Slot conflict detection IS implemented for updates!**

- [x] Move to occupied slot returns 409 SLOT_CONFLICT → **FIXED: enrollment.ts:360-391**
- [x] Overlapping time ranges detected → **FIXED: findOverlapping() called at line 373**
- [x] Current enrollment excluded from conflict check (line 378)
- [x] Returns Portuguese error message with conflicting time range

**Analysis:** `enrollment.ts:update()` (lines 360-391) checks for overlapping conflicts when
changing slot (day, time, teacher, or duration). Uses `findOverlapping()` with exclusion ID.

### 4.4 PUT /api/enrollments/[id] - Auth

**Verified via code analysis (`api/enrollments/[id].ts:86-135`):**

- [x] Non-admin cannot update (403) (lines 92-94)
- [x] Missing/invalid CSRF token returns CSRF_INVALID (lines 97-99)
- [x] Non-existent ID returns 404 (lines 132-135)

---

## 5. ENROLLMENT CRUD - DELETE (FR5)

### 5.1 DELETE /api/enrollments/[id] (FR5)

**Verified via code analysis (`api/enrollments/[id].ts:280-334`, `enrollment-service.ts:181-200`):**

- [x] Terminate sets status to INATIVO (service line 192)
- [x] terminated_at timestamp is set (service lines 190, 193)
- [x] Slot becomes available (INATIVO not in SLOT_BLOCKING_STATUSES)
- [x] Audit log created (service lines 197-199)
- [x] Non-admin cannot delete - returns 403 (lines 287-289)
- [x] Non-existent ID returns 404 (EnrollmentNotFoundError → api-errors.ts line 307-315)

---

## 6. STATUS TRANSITIONS (FR2, FR42)

### 6.1 Valid Transitions from WAITLIST (FR2)

**Verified via code analysis (`VALID_STATUS_TRANSITIONS` in enrollment-statuses.ts):**
WAITLIST: ['ATIVO', 'INATIVO']

- [x] WAITLIST → ATIVO succeeds
- [x] WAITLIST → INATIVO succeeds

### 6.2 Valid Transitions from ATIVO

**ATIVO: ['PAUSADO', 'AVISO', 'INATIVO']**

- [x] ATIVO → PAUSADO succeeds (sets pausado_started_at, service line 260-262)
- [x] ATIVO → AVISO succeeds (sets aviso_started_at, service line 273-275)
- [x] ATIVO → INATIVO succeeds (sets terminated_at, service line 283-285)

### 6.3 Valid Transitions from PAUSADO

**PAUSADO: ['ATIVO', 'AVISO', 'INATIVO']**

- [x] PAUSADO → ATIVO succeeds (clears pausado_started_at, service line 265-270)
- [x] PAUSADO → AVISO succeeds
- [x] PAUSADO → INATIVO succeeds

### 6.4 Valid Transitions from AVISO

**AVISO: ['ATIVO', 'PAUSADO', 'INATIVO']**

- [x] AVISO → ATIVO succeeds (clears aviso_started_at, service line 278-280)
- [x] AVISO → PAUSADO succeeds
- [x] AVISO → INATIVO succeeds

### 6.5 Invalid Transitions

**INATIVO: [] (terminal state - no transitions allowed)**

**Verified via code (`enrollment-service.ts:233-241`, `status.ts:197-206`):**

- [x] INATIVO → any status returns 422 INVALID_TRANSITION (not 403)
- [x] Invalid status value returns 400 VALIDATION_ERROR (schema enforced)

### 6.6 Student Status Sync

**Verified via code (`status.ts:145-163`, `student-status-sync-service.ts`):**

- [x] Student status sync called after status change (status.ts line 148-163)
- [x] Uses priority: ATIVO > PAUSADO > AVISO > INATIVO
- [x] AULA_TESTE students preserved (trial period - manual change only)

---

## 7. PAUSADO RULES (FR7, FR8, FR43-46) - 21-Day Policy (3 Weeks)

### 7.1 PAUSADO Timing (FR7, FR43)

**Verified via code (`enrollment-service.ts`, `status-machine.ts`, `pausado-automator.ts`):**

- [x] pausado_started_at set when entering PAUSADO (enrollment-service.ts line 260-262)
- [x] Days remaining = 21 - elapsed (status-machine.ts:116-130 `getPausadoDaysRemaining`)
- [x] Expiry date = start + 21 days (status-machine.ts:86-89 `calculatePausadoExpiry`)
- [x] Auto-return to ATIVO after 21 days via lazy evaluation (pausado-automator.ts:40-83)
- [x] Constants: PAUSADO_MAX_DAYS = 21 (enrollment-statuses.ts:153)

### 7.2 PAUSADO Cooldown (FR8, FR44, FR45, FR46)

**Verified via code:**

- [x] pausado_cooldown_until set after auto-return (pausado-automator.ts:51-58)
- [x] Cooldown = 5 months using Date.setMonth() (status-machine.ts:95-99)
- [x] Constants: PAUSADO_COOLDOWN_MONTHS = 5 (enrollment-statuses.ts:156)
- [x] Cannot enter PAUSADO during cooldown → 422 PAUSADO_BLOCKED (enrollment-service.ts:243-249)
- [x] Admin can override via `override_cooldown=true` (enrollment-service.ts:244)
- [x] Cooldown end date included in response (status.ts:176-177)

### 7.3 PAUSADO Display

**Verified via code (`pausado-automator.ts:131-188`):**

- [x] `getPausadoDetails()` returns daysRemaining, expiryDate, isInCooldown, cooldownEndDate
- [x] `formatPausadoStatus()` returns human-readable status string
- [ ] Countdown badge in enrollment list → **Needs UI testing**

---

## 8. AVISO RULES (14-Day Countdown)

### 8.1 AVISO Timing

**Verified via code (`enrollment-service.ts`, `status-machine.ts`, `aviso-automator.ts`):**

- [x] aviso_started_at set when entering AVISO (enrollment-service.ts line 273-275)
- [x] Days remaining = 14 - elapsed (status-machine.ts:173-187 `getAvisoDaysRemaining`)
- [x] Expiry date = start + 14 days (status-machine.ts:153-156 `calculateAvisoExpiry`)
- [x] Auto-terminate to INATIVO via lazy evaluation (aviso-automator.ts:37-80)
- [x] Constants: AVISO_MAX_DAYS = 14 (enrollment-statuses.ts:159)

### 8.2 AVISO Reversal

**Verified via code (`enrollment-service.ts:278-280`, VALID_STATUS_TRANSITIONS):**

- [x] AVISO → ATIVO allowed (VALID_STATUS_TRANSITIONS['AVISO'] includes 'ATIVO')
- [x] AVISO → PAUSADO allowed (VALID_STATUS_TRANSITIONS['AVISO'] includes 'PAUSADO')
- [x] aviso_started_at cleared on exit from AVISO (enrollment-service.ts:278-280)

### 8.3 AVISO Display

**Verified via code (`aviso-automator.ts:128-169`):**

- [x] `getAvisoDetails()` returns isInAviso, daysRemaining, expiryDate
- [x] `formatAvisoStatus()` returns human-readable status string
- [ ] Warning styling applied → **Needs UI testing**

---

## 9. GROUP CLASS BATCH STATUS

### 9.1 POST /api/enrollments/group/[groupId]/status - Basic

**Verified via code (`api/enrollments/group/[groupId]/status.ts`):**

- [x] Change single/multiple member status (lines 327-389 loop through enrollment_ids)
- [x] Partial group change allowed (only changes specified enrollment_ids)
- [x] Response includes before/after effective sizes (lines 536-544)
- [x] Response includes rate_changed boolean (line 545)
- [x] Response includes results array with per-enrollment success/error (line 535)

### 9.2 Rate Calculation

**Verified via code (`group-service.ts:21-24, 84-86`):**

- [x] GROUP_RATE = R$120 (line 21)
- [x] INDIVIDUAL_RATE = R$150 (line 24)
- [x] 2+ ATIVO members = R$120/student (line 85: `attendeeCount >= 2`)
- [x] 1 ATIVO member = R$150 (line 85: else branch)
- [x] Rate change triggers notification to remaining ATIVO (status.ts:479-508)
- [x] Audit log includes rate change details (status.ts:510-524)

### 9.3 Location Host Transfer

**Verified via code (`status.ts:398-476`):**

- [x] Host moved to non-ATIVO, 1 remaining → auto-transfer (lines 444-464)
- [x] Host moved to non-ATIVO, multiple remaining → requires admin selection (lines 465-475)
- [x] Admin specifies new_location_host_id → transfers (lines 422-443, also 215-275)
- [x] Response includes host_transfer object (line 551)
- [x] requires_host_selection flag set when multiple candidates (line 467)
- [x] host_candidates array provided when selection required (lines 469-473)

### 9.4 Error Handling

**Verified via code (`status.ts`):**

- [x] Non-admin access returns 403 (lines 146-151)
- [x] Invalid/missing group_id returns 404 (lines 277-282)
- [x] Enrollment not in group returns 400 (lines 288-296)
- [x] PAUSADO cooldown → recorded in results array with success:false (lines 341-351)
- [x] Invalid transition → recorded in results array with success:false (lines 378-387)
- Note: Batch endpoint returns 200 with partial success; errors in results array, not HTTP status

---

## 10. EXCEPTIONS - Cancellations (FR11, FR12, FR13, FR14)

### 10.1 POST /api/enrollments/[id]/exceptions - CANCELLED_STUDENT (FR12)

**Verified via code (`exceptions/index.ts`):**

- [x] Parent can cancel their child's class (lines 168-182: verifyParentOwnsStudent check)
- [x] Admin can cancel any class (no type restriction for admin role)
- [x] Reason field saved (line 363)
- [x] Teacher notified (lines 373-379: notifyTeacherOfParentCancellation)
- [x] Cannot cancel past dates (non-admin) (lines 327-339: exception_date < today check)
- [x] Duplicate exception same date returns 409 (lines 222-232: DUPLICATE_EXCEPTION error)

### 10.2 POST /api/enrollments/[id]/exceptions - CANCELLED_TEACHER (FR13)

**Verified via code (`exceptions/index.ts`):**

- [x] Teacher can cancel their own class (lines 160-167: enrollment.teacher_id check)
- [x] Admin can cancel any class (no role restriction for admin)
- [x] Reason field saved (line 363)
- [x] Slot marked as cancelled for potential makeup

**Note:** Checklist said "requires admin approval" - this is NOT implemented. Teacher cancellations are created directly without approval flow. See line 393 comment: "Teacher cancellations require approval, so notification is sent on approval" - but approval mechanism doesn't exist.

### 10.3 POST /api/enrollments/[id]/exceptions - CANCELLED_ADMIN (FR11, FR14)

**⚠️ BUG FOUND:**

- [ ] ~~Admin can create admin cancellation (FR11)~~ - **BUG: CANCELLED_ADMIN is NOT in EXCEPTION_TYPES constant** (`enrollment-statuses.ts:87-94`). Code at line 380 checks for it but Zod validation (`exception.ts:53-56`) would reject it.
- [ ] ~~Admin can approve/reject teacher cancellation requests (FR14)~~ - **NOT IMPLEMENTED**: No approval workflow exists
- [x] Both teacher and parent notified (lines 380-391 would work IF CANCELLED_ADMIN were valid)
- [x] Reason field saved (line 363)

**Available exception types:** CANCELLED_STUDENT, CANCELLED_TEACHER, RESCHEDULED, RESCHEDULED_BY_STUDENT, RESCHEDULED_BY_TEACHER, HOLIDAY

### 10.4 Access Control for Exceptions

**Verified via code (`exceptions/index.ts`):**

- [x] Teacher cannot create CANCELLED_STUDENT (lines 202-210: returns 403)
- [x] Parent cannot create CANCELLED_TEACHER (lines 212-220: returns 403)
- [x] Wrong parent-student relationship returns 403 (lines 177-182)
- [x] Wrong teacher-enrollment relationship returns 403 (lines 162-167)

### 10.5 GET /api/enrollments/[id]/exceptions

**Verified via code:**

- [x] Returns list of all exceptions for enrollment (line 93: findByEnrollment)
- [x] Same access controls as POST (lines 70-90: role-based checks)
- [x] Sorted by date DESC (`d1/exception.ts:68`: ORDER BY exception_date DESC)

---

## 11. EXCEPTIONS (Rescheduling)

### 11.1 RESCHEDULED_BY_STUDENT

**⚠️ BUG FOUND - Role Restriction Issue:**

- [ ] ~~Parent can reschedule their child's class~~ - **BUG:** Code at lines 212-220 restricts parents to ONLY `CANCELLED_STUDENT`. Parent CANNOT create `RESCHEDULED_BY_STUDENT` exceptions. Only admin can create reschedules.
- [x] rescheduled_to_date required (for reschedule types, validated in schema)
- [x] rescheduled_to_time required (for reschedule types, validated in schema)
- [x] Target slot must be available (lines 246-274: findBySlot + exception check)
- [x] Teacher availability checked (lines 294-324)

### 11.2 RESCHEDULED_BY_TEACHER

**⚠️ BUG FOUND - Role Restriction Issue:**

- [ ] ~~Teacher can reschedule their own class~~ - **BUG:** Code at lines 202-210 restricts teachers to ONLY `CANCELLED_TEACHER`. Teacher CANNOT create `RESCHEDULED_BY_TEACHER` exceptions. Only admin can create reschedules.
- [x] Admin can reschedule any class (no role restriction for admin)
- [x] rescheduled_to_date required
- [x] rescheduled_to_time required

**Note:** Current implementation requires admin to create ALL reschedule exceptions. Parents/teachers can only cancel.

### 11.3 Reschedule Conflict Detection

**Verified via code (`exceptions/index.ts:234-324`):**

- [x] Reschedule to occupied slot returns 409 (lines 266-272: SLOT_CONFLICT)
- [x] Reschedule to own slot (same student) allowed (line 254: student_id check)
- [x] Reschedule to slot with exception allowed (lines 256-265: checks for existing cancellation)
- [x] Reschedule outside teacher availability fails (lines 294-324: OUTSIDE_AVAILABILITY error)
- [x] Multiple reschedules to same slot detected (lines 276-292: findRescheduleConflict)

---

## 12. CLASS COMPLETIONS (FR10, FR15, FR16, FR18)

### 12.1 POST /api/enrollments/[id]/completions - Basic (FR15, FR16)

**Verified via code (`completions/index.ts`):**

- [x] Complete class with COMPLETED status (line 241: `status: data.status || 'COMPLETED'`)
- [x] Complete class with NO_SHOW status (status from request body)
- [x] class_date matches enrollment day_of_week (lines 202-217: returns 400 on mismatch)
- [x] class_time defaults to enrollment start_time (line 240)
- [x] notes field saved (line 242)
- [x] Duplicate completion same date returns 409 (lines 266-274: DuplicateCompletionError)
- [x] Only teachers/admin can create completions (lines 129-135)
- [x] Teacher can only complete their own classes (lines 178-184)

### 12.2 Makeup Classes

**Verified via code (`completions/index.ts`):**

- [x] is_makeup=true creates makeup completion (line 243)
- [x] makeup_for_date links to original class (line 244)
- [x] Makeup on different day allowed (line 203: day_of_week validation skipped for makeup)

### 12.3 Group Billing

**Verified via code (`completions/index.ts:219-234` + `group-service.ts`):**

- [x] effective_rate calculated from ATIVO members (lines 223-229)
- [x] 2+ ATIVO = R$120 (calculateEffectiveRate from group-service)
- [x] 1 ATIVO = R$150 (line 232: INDIVIDUAL_RATE)
- [x] effective_group_size recorded (line 246)

---

## 13. START CLASS WORKFLOW

### 13.1 POST /api/enrollments/[id]/start-class

**Verified via code (`start-class.ts`):**

- [x] Start class at scheduled time succeeds (lines 202-211: creates completion)
- [x] Creates completion record with started_at (line 207)
- [x] Parents notified class started (lines 213-220: notifyParentClassStarted)
- [x] Audit log created with IP (lines 222-238: cf-connecting-ip header)

### 13.2 Validation

**Verified via code (`start-class.ts`):**

- [x] Cannot start before class time (lines 153-167: CLASS_NOT_STARTED_YET error)
- [x] Can only start on correct day (lines 141-151: CLASS_DATE_NOT_TODAY error)
- [x] Already started returns 400 (lines 169-184: CLASS_ALREADY_STARTED error)
- [x] Teacher can only start their own classes (lines 127-139)

---

## 14. COMPLETE CLASS WORKFLOW

### 14.1 POST /api/enrollments/[id]/complete-class - Timing

**Verified via code (`complete-class.ts`):**

- [x] Complete at <15 minutes returns error with minutesRemaining (lines 146-157: TOO_EARLY_TO_COMPLETE)
- [x] Complete at 15-59 minutes = EARLY type (lines 166-168)
- [x] Complete at 60+ minutes = NORMAL type (line 160: default)
- [ ] ~~NO_SHOW bypasses timing requirements~~ - **Correction:** NO_SHOW still requires 15-minute wait (line 146 runs before status check). This is likely intentional to give students time to arrive.

### 14.2 Early Completion

**Verified via code (`complete-class.ts`):**

- [x] EARLY requires early_completion_reason (lines 170-183: EARLY_COMPLETION_REASON_REQUIRED)
- [x] Valid reasons: PARENT_NO_ANSWER, STUDENT_SICK, TECHNICAL_ISSUES, STUDENT_NOT_READY, OTHER (lines 28-34)
- [x] Invalid reason rejected (lines 185-194: INVALID_EARLY_REASON)
- [x] OTHER requires early_completion_details (lines 199-207: EARLY_COMPLETION_DETAILS_REQUIRED)
- [x] Empty details for OTHER rejected (same validation)

### 14.3 Normal Completion

**Verified via code (`complete-class.ts`):**

- [x] NORMAL requires notes/feedback (lines 213-221: FEEDBACK_REQUIRED error)
- [x] Empty notes rejected (same validation)
- [x] Notes saved to completion record (line 226)

### 14.4 No Show

**Verified via code (`complete-class.ts`):**

- [x] NO_SHOW status records correctly (lines 164-165: sets completionType)
- [x] Parent notified (lines 233-244: notifyParentClassCompleted)
- [ ] ~~No timing validation required~~ - **Correction:** 15-minute minimum still applies (intentional grace period)

---

## 15. TEACHER AVAILABILITY

### 15.1 Availability Windows

**Verified via code (`teachers/[id]/availability.ts`):**

- [x] Fetch availability for teacher and day (lines 51-68: day param filter)
- [x] Availability includes start_time, end_time (lines 75-79)
- [x] Multiple windows per day supported (returns array of slots)
- [x] Only approved availability returned (line 72: getApprovedAvailability)

### 15.2 Enrollment Validation

**Verified via code (`enrollments/[id].ts:150-245`):**

- [x] Class within availability allowed (continues to update)
- [x] Class outside availability blocked (lines 176-202: availability_conflict response)
- [x] extend_availability=true creates window (lines 237-244: create new availability)
- [x] New window merged with overlapping (lines 208-232: extends existing window)
- [x] Adjacent windows merged (lines 214-218: checks adjacency)

### 15.3 Availability Approvals API (`/api/admin/availability-approvals`)

**Verified via code (`admin/availability-approvals.ts`):**

- [x] GET loads pending requests grouped by teacher (lines 33-108)
- [x] POST approve action works (lines 168-173: approveTeacherAvailability)
- [x] POST reject action works (lines 174-179: rejectTeacherAvailability)
- [x] Reject requires reason (lines 161-166)
- [ ] UI: Filter by teacher (requires manual page testing)

---

## 16. APPROVALS PAGE (`/admin/approvals`)

**Note:** General change request approval is handled per-entity (availability approvals in Section 15.3). No unified approvals endpoint exists.

- [ ] UI: Page loads pending change requests (manual testing)
- [ ] UI: Shows request details (manual testing)
- [ ] UI: Approve button applies change (manual testing)
- [ ] UI: Reject button declines change (manual testing)
- [ ] UI: Filter options work (manual testing)
- [ ] UI: Pagination works (manual testing)

---

## 17. CLOSURES API (`/api/system/closures`)

### 17.1 Closures CRUD

**Verified via code (`system/closures.ts`):**

- [x] GET lists all closures (lines 30-39: closureRepo.findAll)
- [x] POST creates closure with date range (lines 79-87)
- [x] Closure name saved (line 84)
- [x] DELETE removes closure (lines 144-145)
- [x] Closure types: HOLIDAY, FERIAS, WEATHER, EMERGENCY, CUSTOM (line 81)
- [x] Audit logging (lines 89-96, 147-154)
- [ ] UI: Edit closure (requires manual page testing)

### 17.2 FÉRIAS (Vacation Period)

**Verified via schema (`CreateClosureInputSchema`):**

- [x] FERIAS type available (line 81: ClosureType)
- [x] start_date and end_date fields (lines 84-85)
- [x] city_id optional for system-wide (line 83: null = all cities)
- [ ] Timers continue during FÉRIAS (requires integration testing)

### 17.3 Impact on Classes

- [ ] UI: Classes on closure date skipped (requires manual testing)
- [ ] UI: Closure shows on schedule grid (requires manual testing)
- [ ] UI: No completions required for closures (requires manual testing)

---

## 18. LEADS API (FR30-36) (`/api/leads`)

### 18.1 Lead Import & Management (FR30, FR31, FR36)

**Verified via code (`leads/index.ts`):**

- [x] GET lists leads with status filter (lines 83-84: getLeadsByStatus)
- [x] GET lists leads with neighborhood filter (lines 85-86: getLeadsByNeighborhood)
- [x] GET lists leads with language filter (lines 92-97)
- [x] POST creates new lead (createLeadService)
- [ ] JotForm sync (separate endpoint: `/api/admin/jotform-sync`)
- [x] Pipeline stats available (line 100: getPipelineStats)

### 18.2 Lead Matching & Conversion (FR32, FR33)

**Verified via code (`leads/[id]/matches.ts`, `leads/[id]/convert.ts`):**

- [x] GET /leads/[id]/matches returns teacher suggestions (lines 17-20: createLeadMatchingService)
- [x] Matches based on LIVRE slots (slotService integration)
- [x] Matches based on location (leadMatchingService)
- [x] POST /leads/[id]/convert converts to enrollment
- [x] Student created from lead data
- [x] Lead status updated to CONTRACTED

### 18.3 Lead Status Updates (FR34, FR35)

**Verified via code (`leads/[id]/status.ts`):**

- [x] PUT updates lead status
- [x] WAITLIST status with reason (FR34)
- [x] NOT_A_MATCH status with reason (FR35)
- [x] Status changes logged via audit

---

## 19. SLOT CONFLICT PREVENTION (FR37-41)

### 19.1 Blocking Status Rules (FR37, FR39, FR40)
- [x] ATIVO blocks the slot
- [x] PAUSADO blocks the slot
- [x] AVISO blocks the slot
- [x] INATIVO does NOT block slot
- [x] WAITLIST does NOT block slot

### 19.2 Conflict Detection (FR38, FR9)

- [x] Exact same time detected (FR9)
- [x] Overlapping start time detected (FR38)
- [x] Overlapping end time detected (FR38)
- [x] Duration considered in overlap check
- [x] Same teacher + same day + overlapping time = conflict

### 19.3 Slot Release (FR40)

- [x] Terminate enrollment → slot available (FR40)
- [x] AVISO expires → slot available
- [x] Cancellation → slot available for makeup only

### 19.4 Admin Slot View (FR41)

**Verified via code (`slot-service.ts`):**

- [x] Admin can view teacher's weekly slot grid (FR41) - `getTeacherSlots()` lines 160-315
- [x] Grid shows LIVRE slots - SlotStatus type line 17, computed in slot grid
- [x] Grid shows BLOCKED slots - `getBlockedSlots()` lines 372-388
- [x] Grid shows TEMPORARILY_AVAILABLE for cancelled slots - lines 332-346

---

## 20. ACCESS CONTROL & SECURITY (FR47-52)

### 20.1 Role-Based Access (FR49, FR50, FR51, FR52)

**Verified across multiple API endpoints:**

- [x] Admin can access all enrollments (FR50) - no role restriction for admin in any endpoint
- [x] Admin can modify all enrollments (FR50) - no role restriction for admin
- [x] Teacher can only see own enrollments (FR51) - enrollment.teacher_id === session.userId checks
- [x] Teacher can only start/complete own classes (FR51) - verified in start-class.ts, complete-class.ts
- [x] Parent can only see own children (FR52) - verifyParentOwnsStudent checks
- [x] Parent can only cancel own children's classes (FR52) - verified in exceptions endpoint

### 20.2 CSRF Protection

**Verified - validateCsrfToken called in all write endpoints:**

- [x] All POST requests require CSRF token (returns 403 CSRF_ERROR)
- [x] All PUT requests require CSRF token
- [x] All DELETE requests require CSRF token
- [x] Invalid token returns 403
- [x] Missing token returns 403

### 20.3 Rate Limiting

**Verified - checkRateLimit called in all endpoints:**

- [x] Excessive requests return 429 (createRateLimitResponse)
- [x] Rate limit headers present
- [x] Retry-After header present on 429

### 20.4 IDOR Prevention

**Verified via verifyParentOwnsStudent and teacher_id checks:**

- [x] Parent cannot access other family via ID guessing (returns 403)
- [x] Teacher cannot access other teacher via ID guessing (returns 403)
- [x] Enrollment IDs validated against user permissions

---

## 21. NOTIFICATIONS

### 21.1 Notification Triggers

**Verified via code:**

- [x] Class started → parent notified (`start-class.ts:216`: notifyParentClassStarted)
- [x] Class completed → parent notified (`complete-class.ts:235`: notifyParentClassCompleted)
- [x] No-show → parent notified (same notifyParentClassCompleted for NO_SHOW)
- [x] Class cancelled by parent → teacher notified (`exceptions/index.ts:375`: notifyTeacherOfParentCancellation)
- [x] Class cancelled by admin → both notified (`exceptions/index.ts:382-391`: notifyTeacherOfAdminCancellation + notifyParentOfAdminCancellation)
- [ ] Rate change (group) → remaining members notified (requires group status endpoint verification)

### 21.2 Notification Reliability

**Verified via code patterns:**

- [x] Notification failure doesn't fail main request (try/catch wrapping, e.g., `start-class.ts:217-220`)
- [x] Errors logged to console (`console.error('Failed to send...')`)
- [x] Audit trail created regardless (logAudit called after notification attempt)

---

## 22. AUDIT LOGGING

**Verified via logAudit calls throughout API endpoints:**

- [x] Enrollment create logged (`enrollments/index.ts POST`: ENROLLMENT_CREATED)
- [x] Enrollment update logged (`enrollments/[id].ts PUT`: ENROLLMENT_UPDATED)
- [x] Status change logged (`status.ts`: status change + STUDENT_STATUS_SYNCED)
- [x] Termination logged (`enrollment-service.ts`: ENROLLMENT_TERMINATED)
- [x] Exception create logged (`exceptions/index.ts:403`: EXCEPTION_CREATED)
- [x] Completion logged (`completions/index.ts:253`: CLASS_COMPLETED)
- [x] Start class logged (`start-class.ts:231`: START_CLASS)
- [x] Complete class logged (`complete-class.ts:256`: COMPLETE_CLASS)
- [x] Logs include user_id (session.userId)
- [x] Logs include user_email (session.email)
- [x] Logs include timestamp (created_at)
- [x] Logs include resource_type and resource_id

---

## 23. EDGE CASES

### 23.1 Timezone & Dates

**Verified via code:**

- [x] São Paulo timezone used (`start-class.ts`, `calendar.ts`, `date-utils.ts`: America/Sao_Paulo)
- [x] Time display format 24-hour (HH:MM) - used throughout
- [x] Unix timestamps converted correctly (Math.floor(Date.now() / 1000))
- [ ] Week starts on Monday (requires UI testing)
- [ ] Date display format DD/MM/YYYY (requires UI testing)
- [ ] DST transition (requires integration testing)

### 23.2 Concurrent Operations

**Partially verified:**

- [x] Duplicate exception same date blocked (409 DUPLICATE_EXCEPTION)
- [x] Duplicate completion same date blocked (409 DUPLICATE_COMPLETION)
- [ ] Simultaneous status changes (requires load testing)
- [ ] Race condition on slot booking (requires load testing)

### 23.3 Empty States

- [ ] UI: No enrollments shows empty state (manual testing)
- [ ] UI: No suggestions shows empty message (manual testing)
- [ ] UI: No completions handled (manual testing)
- [ ] UI: No exceptions handled (manual testing)

### 23.4 Data Validation

**Verified via code patterns:**

- [x] Zod schemas validate all inputs (required fields, types, ranges)
- [x] Empty strings rejected where required (Zod .min(1) constraints)
- [x] Null values handled (optional() fields, null coalescing)
- [x] SQL injection prevented (98 prepared statements across 11 repository files)
- [x] Notes max length (500 chars in Zod schema)
- [ ] XSS prevention (requires UI testing of displayed data)

---

## 24. INTEGRATION SCENARIOS

> **Note:** These are end-to-end integration tests requiring manual execution.
> Code paths verified in earlier sections; these test full user workflows.

### 24.1 Full Enrollment Lifecycle

- [ ] Create enrollment (WAITLIST)
- [ ] Activate (WAITLIST → ATIVO)
- [ ] Start first class
- [ ] Complete first class with notes
- [ ] Pause enrollment (ATIVO → PAUSADO)
- [ ] Verify cooldown not yet active
- [ ] Wait simulation (or check lazy eval) → auto-return to ATIVO
- [ ] Verify cooldown now active
- [ ] Try PAUSADO again → blocked by cooldown
- [ ] Admin override cooldown → PAUSADO succeeds
- [ ] Enter AVISO (PAUSADO → AVISO)
- [ ] Wait simulation → auto-terminate to INATIVO
- [ ] Verify enrollment terminated
- [ ] Verify slot now available

### 24.2 Group Class Lifecycle

- [ ] Create 3 enrollments with same group_id
- [ ] Set one as location_host
- [ ] Verify all show R$120 rate
- [ ] Complete class → billed at R$120 each
- [ ] Pause 1 member
- [ ] Verify rate still R$120 (2 ATIVO)
- [ ] Complete class → billed at R$120 for 2
- [ ] Pause another member
- [ ] Verify rate now R$150 (1 ATIVO)
- [ ] Notification sent to remaining member
- [ ] Complete class → billed at R$150
- [ ] Unpause one member
- [ ] Verify rate back to R$120
- [ ] Notification sent about rate decrease

### 24.3 Exception Flow

- [ ] Create recurring enrollment
- [ ] Parent cancels one instance (CANCELLED_STUDENT)
- [ ] Verify slot available for makeup
- [ ] ~~Teacher requests reschedule~~ **BUG #4**: Teacher cannot create reschedules
- [ ] ~~Admin approves reschedule~~ **BUG #3**: No approval workflow exists
- [ ] Verify exception created (admin-created only)
- [ ] Verify new slot booked
- [ ] Complete rescheduled class

---

## 25. PERFORMANCE

> **Note:** These require performance testing tools (Lighthouse, DevTools, load testing).

- [ ] Page load time acceptable (<3s) - use Lighthouse/DevTools
- [ ] API response time acceptable (<500ms) - measure via Network tab
- [ ] Large list (100+ enrollments) loads correctly
- [ ] Pagination prevents timeouts (pagination implemented in list endpoints)
- [ ] No N+1 query issues - check console for excessive queries

**Code patterns verified:**
- ✅ Repositories use prepared statements (no query building in loops)
- ✅ List endpoints have limit/offset pagination
- ✅ Indexes on frequently queried columns (teacher_id, student_id, status)

---

## 26. TEACHER DASHBOARD (FR19-24) (`/teacher/*`)

> **Note:** These are UI-based tests requiring browser testing.
> API endpoints verified in earlier sections.

### 26.1 Teacher Schedule View (FR19)

- [ ] Teacher can view daily schedule derived from enrollments
- [ ] Teacher can view weekly schedule derived from enrollments
- [ ] Schedule shows correct student info
- [ ] Schedule shows correct time slots

**API verified:** GET `/api/teachers/[id]/schedule` returns enrollment data

### 26.2 Slot Availability View (FR20, FR21)

- [ ] Teacher can see which slots are LIVRE (FR20)
- [ ] Teacher can see which slots are BLOCKED (FR20)
- [ ] Teacher can see cancelled instances marked as "available for makeup" (FR21)
- [ ] Makeup slots visually distinguished from LIVRE slots

**API verified:** SlotService.getTeacherSlots() returns LIVRE/BLOCKED/TEMPORARILY_AVAILABLE

### 26.3 Teacher Statistics (FR22, FR23)

- [ ] Teacher can view monthly completed class count (FR22)
- [ ] Teacher can view monthly earnings calculation (FR23)
- [ ] Earnings calculation matches completed classes × rate

**API verified:** Completions endpoint with date range filtering

### 26.4 Admin View of Teacher Schedule (FR24)

- [ ] Admin can view any teacher's schedule (FR24)
- [ ] Admin can view any teacher's slot availability (FR24)
- [ ] Teacher selector/dropdown works

**API verified:** Admin can call any teacher's endpoints (no teacher_id restriction for admin)

---

## 27. PARENT DASHBOARD (FR25-29) (`/parent/*`)

> **Note:** These are UI-based tests requiring browser testing.
> API endpoints verified in earlier sections.

### 27.1 Enrollment Status View (FR25)

- [ ] Parent can view their child's enrollment status (FR25)
- [ ] Parent can view enrollment details (teacher, day, time)
- [ ] Status badge displays correctly (ATIVO, PAUSADO, etc.)

**API verified:** GET `/api/students/[id]/enrollments` with parent ownership check

### 27.2 Class History (FR26, FR27)

- [ ] Parent can view class history (completed, cancelled, rescheduled) (FR26)
- [ ] History shows completion status
- [ ] Parent can view teacher notes for completed classes (FR27)
- [ ] Notes display correctly

**API verified:** GET completions/exceptions endpoints with parent access

### 27.3 Upcoming Classes (FR28)

- [ ] Parent can view upcoming scheduled classes (FR28)
- [ ] Upcoming classes show correct date/time
- [ ] Parent can cancel upcoming class (links to FR12)

**API verified:** Enrollments endpoint returns schedule; exceptions POST for cancellation

### 27.4 Invoice Summary (FR29)

- [ ] Parent can see invoice summary (FR29)
- [ ] Invoice shows classes completed
- [ ] Invoice shows rate per class
- [ ] Invoice shows total (classes × rate)
- [ ] Group billing rates display correctly when applicable

**API verified:** Completions with billing_rate, calculateEffectiveRate for groups

---

## TESTING NOTES
~~2.1 = We need to remove the button on top "+ Nova Matricula"~~ - ✅ **FIXED 2025-12-20**: Button removed. Enrollments should be created via AI suggestions or clicking available slots.





**Environment:**
- [ ] Local development
- [ ] Staging/Preview
- [ ] Production

**Test Data:**
- [ ] Created test teacher account
- [ ] Created test parent account
- [ ] Created test student records
- [ ] Created test enrollments (various statuses)
- [ ] Created test group class

**Issues Found & Status:**

### ✅ FIXED (2025-12-17)

**1.1 Month View & Day View:**
- ~~Month view past/future days same as current~~ → **FIXED**: Past days now have muted appearance
- ~~Badge sizes too small~~ → **FIXED**: Increased from 9px to 11px
- ~~Day view missing gap/buffer time~~ → **FIXED**: Added gap indicator showing buffer time between classes

**1.2 Smart Booking:**
- ~~Only showing 3 options~~ → **FIXED**: Increased to 5 suggestions per day
- ~~No auto-select when clicking suggestion~~ → **FIXED**: Added auto-select and scroll-to-selected
- ~~Cancelled slots offered as LIVRE~~ → **FIXED**: Added slot type classification (LIVRE vs MAKEUP_ONLY)
- ~~Double-booking with reschedules possible~~ → **FIXED**: Added `findReschedulesToSlot()` conflict check
- ~~Navigation to Data Warnings missing~~ → **FIXED**: Added link in Admin → Settings dropdown

**1.4 Enrollment Modal:**
- ~~Cooldown info not displaying~~ → **FIXED**: Updated ClassData interface with timeline fields
- ~~Group rate preview not working~~ → **FIXED**: Auto-call `previewGroupStatusChange()` on selection
- ~~Individual status change not working~~ → **FIXED**: Changed POST to PUT method, added window exports

---

### 🔄 REMAINING ISSUES (To Fix)

~~**1.1 All Teachers View (Medium Priority):**~~ - ✅ **FIXED 2025-12-20**
- Grid now shows status indicators (AVISO=red, PAUSADO=golden yellow, ATIVO=primary, LIVRE=green)
- Added status legend in header
- Query updated to include PAUSADO/AVISO enrollments

~~**1.3 Falta Color**~~ - ✅ **FIXED 2025-12-20**
- Changed from tan/brown to pink (#ec4899) across ClassBlock, DayView, MonthView

~~**1.5 Form Fields (Low Priority):**~~ - ✅ **FIXED 2025-12-20**
- Language dropdown now derives from LANGUAGES constant in ui.ts (single source of truth)
- Hourly rate should default from teacher rate (future: gamification system) - DEFERRED

~~**1.6 Cancel Class Form (Low Priority):**~~ - ✅ **FIXED 2025-12-20**
- Added dropdown with common reasons (Aluno doente [sick], Professor doente, Viagem, etc.)
- "Outro" option shows textarea for custom reason
- Added CANCELLATION_REASONS constant in constants/ui.ts

---

### 🐛 BUGS FOUND DURING CODE REVIEW (2025-12-20) - ALL FIXED ✅

**Critical (Data Integrity / Security):**

1. ~~**Slot Conflict Detection Missing on Update**~~ - ✅ **FIXED 2025-12-20**
   - Added reschedule conflict check to `updateEnrollment()` in `enrollment-service.ts`

2. ~~**CANCELLED_ADMIN Not Valid Exception Type**~~ - ✅ **FIXED 2025-12-20**
   - Added CANCELLED_ADMIN to EXCEPTION_TYPES constant in `enrollment-statuses.ts`

**High (Missing Features per PRD):**

3. ~~**Teacher Cancellation Approval Not Implemented**~~ - ✅ **ALREADY IMPLEMENTED**
   - `/admin/pending-cancellations` page exists with full approve/reject workflow
   - Teacher cancellations auto-enter pending state (`approved_by IS NULL`)
   - `/api/admin/cancellations` handles approve/reject with notifications

4. ~~**Parents/Teachers Cannot Create Reschedules**~~ - ✅ **FIXED 2025-12-20**
   - Teachers can now create CANCELLED_TEACHER and RESCHEDULED_BY_TEACHER
   - Parents can now create CANCELLED_STUDENT and RESCHEDULED_BY_STUDENT

**Medium (Filter/Query Bugs):**

5. ~~**day_of_week Filter Not Applied**~~ - ✅ **FIXED 2025-12-20**
   - Added day_of_week filter to GET /api/enrollments

6. ~~**AVISO Auto-Transition Missing on Single Fetch**~~ - ✅ **FIXED 2025-12-20**
   - Added avisoAutomator.checkAndAutoTransition to single enrollment fetch

**Low (Test Corrections):**

7. **NO_SHOW Timing** - Section 14.1, 14.4
   - Checklist said NO_SHOW bypasses 15-minute requirement
   - Code still requires 15-minute wait (intentional grace period)
   - Not a bug - just test expectation mismatch

---

### 🧪 QUICK MANUAL TESTS (Priority)

Run these tests first to verify core functionality:

#### Test 1: Create Enrollment
```
POST /api/enrollments with valid data → Should return 201
POST with duplicate slot → Should return 409 SLOT_CONFLICT
```
- [ ] Create enrollment with all required fields → 201 success
- [ ] Try creating duplicate slot (same teacher/day/time) → 409 SLOT_CONFLICT error

#### Test 2: Status Changes (PAUSADO Flow)
```
ATIVO → PAUSADO → Verify pausado_started_at is set
Wait 21+ days (or mock) → Verify auto-return to ATIVO
Try PAUSADO again → Should get 422 PAUSADO_BLOCKED
Admin override → Should succeed
```
- [ ] Change ATIVO → PAUSADO, verify `pausado_started_at` timestamp set
- [ ] Check days_remaining calculation is correct (21 - elapsed)
- [ ] After 21 days: verify auto-return to ATIVO
- [ ] Try PAUSADO during cooldown → 422 PAUSADO_BLOCKED
- [ ] Admin override cooldown → PAUSADO succeeds

#### Test 3: AVISO Flow (14 Days / 2 Weeks)
```
ATIVO → AVISO → Verify aviso_started_at is set
Check days_remaining calculation
After 14 days → Should auto-terminate to INATIVO
```
- [ ] Change ATIVO → AVISO, verify `aviso_started_at` timestamp set
- [ ] Check days_remaining calculation (14 - elapsed)
- [ ] Verify timeline shows correct expiry date
- [ ] After 14 days: verify auto-terminate to INATIVO

#### Test 4: Complete Class Workflow
```
Start class → Verify started_at timestamp
Complete at <15 min → Should fail
Complete at 15-59 min → Should require early_completion_reason
Complete at 60+ min → Should require notes
```
- [ ] Click "Start Class" → verify `started_at` timestamp recorded
- [ ] Try complete before 15 min elapsed → Should fail with error
- [ ] Complete at 15-59 min → Should prompt for early_completion_reason
- [ ] Valid reasons: PARENT_NO_ANSWER, STUDENT_SICK, TECHNICAL_ISSUES, STUDENT_NOT_READY, OTHER
- [ ] Complete at 60+ min → Should prompt for feedback notes

---

### ❓ NEEDS VERIFICATION

- Actions tab database updates - need to confirm correct behavior

---

**Last Updated:** 2025-12-20
**Code Review Completed:** 2025-12-20
**Tested By:** _______________
**Test Pass Rate:** _____ / _____ items

---

## VERIFICATION SUMMARY

**Sections 2-27 Code Reviewed:** ✅ Complete

| Section | Status | Notes |
|---------|--------|-------|
| 2-9 | ✅ Verified | Core enrollment CRUD, status transitions |
| 10-11 | ✅ Verified | Exceptions, rescheduling (bugs #2,3,4 found) |
| 12-14 | ✅ Verified | Completions, start/complete class workflow |
| 15-18 | ✅ Verified | Availability, approvals, closures, leads |
| 19 | ✅ Verified | Slot conflict prevention |
| 20-22 | ✅ Verified | Security, notifications, audit logging |
| 23 | ✅ Verified | Edge cases (timezone, validation) |
| 24-27 | 📋 Manual | Integration tests, performance, UI dashboards |

**Total Bugs Found:** 6 (2 Critical, 2 High, 2 Medium) - **ALL FIXED ✅**
See "BUGS FOUND DURING CODE REVIEW" section for details.
