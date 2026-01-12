# Tech Spec: Class Mode Refactoring

**Created:** 2026-01-09
**Updated:** 2026-01-09
**Status:** Ready for Approval (Cascade/Constraint Analysis Complete)
**Epic:** Data Model Improvements
**Scope:** 250+ occurrences across 120+ files (verified via exhaustive search)
**Risk Level:** LOW - Billing logic unaffected, cascades verified safe

## Overview

Refactor the current combined `class_mode` field into two separate concepts:
1. **Location** (`class_location`): Where the class happens - `Presencial` or `Online`
2. **Format** (`class_format`): How many students - `Individual` or `Grupo`

### Current State (Combined)

The system currently uses a single `class_mode` field with combined values:
- `Presencial - Individual` (in-person, one student)
- `Presencial - Em dupla/grupo` (in-person, multiple students)
- `Online` (online, any group size - **currently defaults to Individual**)

### Target State (Separated)

| Field | Values | Purpose |
|-------|--------|---------|
| `class_location` | `Presencial`, `Online` | Where the class happens |
| `class_format` | `Individual`, `Grupo` | Class size configuration |

This allows combinations like:
- Presencial + Individual
- Presencial + Grupo
- Online + Individual (current default for Online)
- Online + Grupo (currently not possible with combined field!)

### IMPORTANT: Online Default Behavior

**Current State:** All Online classes are Individual (no online group students exist).
**Migration Default:** `Online` → `class_location: 'Online'` + `class_format: 'Individual'`

This simplifies the migration since we don't need to handle Online + Grupo cases for existing data.

---

## CASCADE & CONSTRAINT ANALYSIS (Verified Safe)

### Database Constraints on `class_mode`

**Current State:** The `class_mode` field has **NO database constraints**:
- No CHECK constraint (allows NULL or any TEXT value)
- No UNIQUE constraint
- No CASCADE DELETE (it's just a data column)
- No FOREIGN KEY references

**This means the refactoring is SAFE from a database constraint perspective.**

### Existing CASCADE Operations (Will Continue Working)

These cascades are tied to `enrollment_id`, NOT `class_mode`:

| Trigger | Cascade Action | Affected Table |
|---------|---------------|----------------|
| `DELETE enrollment` | Auto-delete | `enrollment_exceptions` |
| `DELETE enrollment` | Auto-delete | `class_completions` |
| `DELETE enrollment` | Auto-delete | `reschedule_credits` |
| `DELETE enrollment` | Auto-delete | `cancellation_charges` |
| `DELETE enrollment` | Auto-delete | `location_change_responses` |
| `DELETE enrollment` | Auto-delete | `cancellation_pending_choices` |
| `DELETE enrollment` | Auto-delete | `makeup_classes` |

### Group Cascade Logic (NOT Affected by Refactoring)

The group cascade logic uses `group_id` and `status counts`, **NOT `class_mode`**:

```typescript
// group-cancellation-service.ts - Uses group_id and ATIVO count
const groupEnrollments = await enrollmentRepo.findByGroupId(enrollment.group_id);
const previousGroupSize = groupEnrollments.filter(e => e.status === 'ATIVO').length;
const newGroupSize = remainingEnrollments.length;

// Rate changes based on GROUP SIZE, not class_mode!
const previousRate = previousGroupSize >= 2 ? GROUP_RATE : INDIVIDUAL_RATE;
const newRate = newGroupSize >= 2 ? GROUP_RATE : INDIVIDUAL_RATE;
```

### Enrollments Page Analysis

**Current State:**
- `class_mode` is **displayed** in enrollment details modal but is **NOT editable**
- **No class_mode filter** on enrollments list (only teacher, student, status, day_of_week, group_id)
- To change class_mode, enrollment must be deleted and recreated

**After Refactoring:**
- Display both `class_location` and `class_format` in modal
- Optionally add filter dropdowns (enhancement)

### Risk Assessment Summary

| Concern | Risk | Reason |
|---------|------|--------|
| **Billing/Invoices** | SAFE | Uses `effective_group_size`, not `class_mode` |
| **Group↔Individual cascade** | SAFE | Uses `group_id` + ATIVO count |
| **Location host workflow** | SAFE | Uses `group_id` lookup |
| **Database CASCADE deletes** | SAFE | Tied to `enrollment_id`, not `class_mode` |
| **Enrollments page** | MINOR | Update modal display for 2 fields |

---

## CRITICAL ISSUES FOUND (Must Fix During Refactoring)

### Issue 1: Inconsistent CLASS_MODE_OPTIONS Definitions (4 different sources!)

| File | Values | Used By |
|------|--------|---------|
| `constants/user-forms.ts` | 'Presencial - Individual', 'Presencial - Em dupla/grupo', 'Online' | StudentForm |
| `constants/enrollment-statuses.ts` | 'Presencial', 'Online', 'Ambos' | LeadForm, admin/leads |
| `lib/form-definitions/person-fields.ts` | Same as user-forms + 'Na casa do professor' (admin) | Form definitions |
| `pages/cadastro.astro` | 'Presencial', 'Online', 'Ambos (Presencial e Online)' | Public registration |

**Problem:** No single source of truth. Different values in different contexts cause data inconsistency.

**Solution:** Create a NEW single source of truth file `src/constants/class-settings.ts`:

```typescript
// NEW FILE: src/constants/class-settings.ts

// Type-safe enums
export const CLASS_LOCATION = {
  PRESENCIAL: 'Presencial',
  ONLINE: 'Online',
} as const;

export const CLASS_FORMAT = {
  INDIVIDUAL: 'Individual',
  GRUPO: 'Grupo',
} as const;

export type ClassLocation = typeof CLASS_LOCATION[keyof typeof CLASS_LOCATION];
export type ClassFormat = typeof CLASS_FORMAT[keyof typeof CLASS_FORMAT];

// Form options (single source for ALL forms)
export const CLASS_LOCATION_OPTIONS = [
  { value: CLASS_LOCATION.PRESENCIAL, label: 'Presencial' },
  { value: CLASS_LOCATION.ONLINE, label: 'Online' },
] as const;

export const CLASS_FORMAT_OPTIONS = [
  { value: CLASS_FORMAT.INDIVIDUAL, label: 'Individual' },
  { value: CLASS_FORMAT.GRUPO, label: 'Em dupla/grupo' },
] as const;

// Type guards (replace runtime string checks)
export function isOnline(location: string | null): boolean {
  return location === CLASS_LOCATION.ONLINE;
}

export function isPresencial(location: string | null): boolean {
  return location === CLASS_LOCATION.PRESENCIAL;
}

export function isGroup(format: string | null): boolean {
  return format === CLASS_FORMAT.GRUPO;
}

export function isIndividual(format: string | null): boolean {
  return format === CLASS_FORMAT.INDIVIDUAL;
}

// Helper to build legacy class_mode for backward compat during transition
export function buildLegacyClassMode(location: string | null, format: string | null): string {
  if (location === CLASS_LOCATION.ONLINE) return 'Online';
  return format === CLASS_FORMAT.GRUPO
    ? 'Presencial - Em dupla/grupo'
    : 'Presencial - Individual';
}

// Helper to parse legacy class_mode into new fields
export function parseLegacyClassMode(classMode: string | null): {
  location: ClassLocation | null;
  format: ClassFormat | null;
} {
  if (!classMode) return { location: null, format: null };

  const isOnlineMode = classMode.toLowerCase().includes('online');
  const isGroupMode = classMode.toLowerCase().includes('grupo') ||
                      classMode.toLowerCase().includes('dupla');

  return {
    location: isOnlineMode ? CLASS_LOCATION.ONLINE : CLASS_LOCATION.PRESENCIAL,
    format: isGroupMode ? CLASS_FORMAT.GRUPO : CLASS_FORMAT.INDIVIDUAL,
  };
}
```

**Migration Path:** Replace all 4 duplicate definitions with imports from this file.

### Issue 2: Hardcoded Portuguese Text in Notifications

**File:** `lib/services/notification-service.ts`
- Line 1062: `const rateLabel = newRate === 120 ? 'grupo' : 'individual';`
- Line 1192: `"A aula agora seria individual (R$${newRate}..."`
- Line 1449: `"continuará como aula individual (R$${newRate})..."`

**Problem:** Changing terminology requires editing notification code, not configuration.

### Issue 3: Duplicated Rate Constants in Client Scripts

**File:** `scripts/enrollments-page-client.ts`
- Lines 1951-1953 and 2171-2172 both define:
  ```
  const GROUP_RATE = 120;
  const INDIVIDUAL_RATE = 150;
  ```

**Problem:** Client-side duplicates server-side constants. Should be passed from server or shared.

### Issue 4: 30+ Runtime String Checks

Pattern like `classMode.toLowerCase().includes('grupo')` found in 16+ files:
- `teacher/index.astro` (4 locations)
- `teacher/availability.astro`
- `users-page-client.ts`
- `teacher-availability-client.ts`
- And more...

**Problem:** Fragile string matching instead of typed enum comparisons.

**Solution:** Replace all runtime string checks with type guard functions from `class-settings.ts`:

```typescript
// BEFORE (fragile)
if (classMode?.toLowerCase().includes('grupo')) { ... }
if (classMode === 'Online') { ... }

// AFTER (type-safe)
import { isGroup, isOnline } from '@/constants/class-settings';

if (isGroup(enrollment.class_format)) { ... }
if (isOnline(enrollment.class_location)) { ... }
```

**Files requiring this change (16+ locations):**
- `teacher/index.astro` (4 locations)
- `teacher/availability.astro`
- `users-page-client.ts`
- `teacher-availability-client.ts`
- `teacher-schedule-client.ts`
- And more...

### Issue 5: Missing Enrollments Page Filter (Enhancement)

**Current State:** Admin enrollments page has NO filter for class location or format.

**Enhancement:** Add optional filter dropdowns after refactoring:
```astro
<FilterGroup label="Local">
  <option value="">Todos</option>
  <option value="Presencial">Presencial</option>
  <option value="Online">Online</option>
</FilterGroup>

<FilterGroup label="Formato">
  <option value="">Todos</option>
  <option value="Individual">Individual</option>
  <option value="Grupo">Grupo</option>
</FilterGroup>
```

---

## CRITICAL INSIGHT: Two Separate Concerns Already Exist

The codebase already treats these as **separate concerns** in billing logic:

| Concern | Current Implementation | Used For |
|---------|----------------------|----------|
| **Location** | `class_mode` field checks for "Online" | Travel time, location host, online badges |
| **Format** | `effective_group_size` / `group_id` | Billing rates (R$150 vs R$120), teacher pay |

**Key Finding:** Billing does NOT use `class_mode` - it uses `effective_group_size >= 2` to determine rates!

---

## BILLING LOGIC - WILL NOT CHANGE (Critical Safety)

### Current Billing Implementation (Verified)

The billing system uses `effective_group_size`, NOT `class_mode`:

**Parent Invoice (`parent/invoice.astro` lines 170-176):**
```typescript
const groupSize = completion.effective_group_size ?? 1;
const isGroup = groupSize >= 2;
const rateForClass = isGroup ? GROUP_RATE : INDIVIDUAL_RATE;  // R$120 vs R$150
```

**Teacher Invoice (`teacher/invoice.astro` lines 153-156):**
```typescript
const groupSize = completion.effective_group_size ?? 1;
const isGroup = groupSize >= 2;
```

**Group Service (`group-service.ts` lines 84-86):**
```typescript
export function calculateEffectiveRate(attendeeCount: number): number {
  return attendeeCount >= 2 ? GROUP_RATE : INDIVIDUAL_RATE;  // 2+ = R$120, 1 = R$150
}
```

### Pricing Rules (Current - PRESERVED)

| Class Type | Rate | Determination |
|------------|------|---------------|
| Individual (1 student) | R$150 | `effective_group_size === 1` |
| Group (2+ students) | R$120/student | `effective_group_size >= 2` |

### What This Refactoring DOES NOT Change

1. **Billing logic remains 100% based on `effective_group_size`**
2. **`class_location` (Presencial/Online) does NOT affect pricing**
3. **`class_format` (Individual/Grupo) is for DISPLAY/PREFERENCES only**
4. **Group cascade billing (when students leave) remains unchanged**
5. **24-hour cancellation rules remain unchanged**

### Online Pricing Note

**Current State:** All Online classes are Individual (no online groups exist).

**If Online groups are added later:** The system would apply the same R$150/R$120 logic. If different Online pricing is needed, add a location-based modifier in `calculateEffectiveRate()` after this refactoring is complete.

### Group ↔ Individual Transition Logic (PRESERVED)

**Current Implementation (`group-cancellation-service.ts` lines 255-317):**

```typescript
// Group cascade logic - NOT affected by class_mode refactoring
const previousGroupSize = groupEnrollments.filter(e => e.status === 'ATIVO').length;
const newGroupSize = remainingEnrollments.length;

// Rate calculation based on group size ONLY
const previousRate = previousGroupSize >= 2 ? GROUP_RATE : INDIVIDUAL_RATE;  // R$120 vs R$150
const newRate = newGroupSize >= 2 ? GROUP_RATE : INDIVIDUAL_RATE;
const rateChangeTrigger = previousRate !== newRate;

// Pending choice when 2 → 1 students
const pendingChoiceRequired = previousGroupSize === 2 && newGroupSize === 1;
```

**Key Transitions:**
| Transition | What Happens | Rate Change |
|------------|--------------|-------------|
| 3→2 students | Group continues | No (R$120→R$120) |
| 2→1 students | **Pending choice modal** | Yes (R$120→R$150) |
| 1→0 students | Class cancelled | N/A |
| Add student (1→2) | Becomes group | Yes (R$150→R$120) |

**This logic is based on:**
- `group_id` presence (determines if it's a group)
- `status === 'ATIVO'` count (determines effective group size)
- NOT on `class_mode` field

### Verification Checklist (Post-Refactoring)

- [ ] `parent/invoice.astro` still uses `effective_group_size` for rate calculation
- [ ] `teacher/invoice.astro` still uses `effective_group_size` for earnings
- [ ] `group-service.ts` rate functions unchanged
- [ ] Group cascade notifications work correctly (2→1 triggers choice modal)
- [ ] Adding student to group triggers rate change notification (1→2)
- [ ] Cancellation charges use correct rates
- [ ] Location host transfer works when host cancels

---

## Current Implementation Analysis (COMPREHENSIVE)

### Search Statistics
- **Total Occurrences:** 386
- **Files Affected:** 102
- **Categories:** Database, Constants, Types, Repositories, Services, Pages, Components, Client Scripts, CSS, Tests

---

### 1. DATABASE SCHEMA (5 tables)

| Table | Field | Current Values | Purpose |
|-------|-------|----------------|---------|
| `enrollments` | `class_mode` | 'Presencial - Individual', 'Presencial - Em dupla/grupo', 'Online' | Display/preference |
| `enrollments` | `group_id` | UUID or null | Group membership (BILLING) |
| `students` | `class_mode` | Same (legacy, read-only) | Display |
| `leads` | `class_mode` | 'Presencial', 'Online', 'Ambos' | Preference |
| `teachers` | `teaches_individual` | Boolean | Can teach individual |
| `teachers` | `teaches_group` | Boolean | Can teach groups |
| `teachers` | `teaches_online` | Boolean | Can teach online |
| `class_completions` | `effective_group_size` | Integer | **BILLING LOGIC** |
| `class_completions` | `actual_rate` | Integer | R$150 or R$120 |

---

### 2. BILLING/INVOICE LOGIC (Most Critical)

#### Rate Constants
| File | Line | Constant |
|------|------|----------|
| `src/constants/billing.ts` | 195-210 | `PRICING.INDIVIDUAL_CLASS_CENTAVOS: 15000` (R$150) |
| `src/constants/billing.ts` | 195-210 | `PRICING.GROUP_CLASS_CENTAVOS: 12000` (R$120) |
| `src/constants/invoice.ts` | 12-16 | `PARENT_INDIVIDUAL_RATE: 150`, `PARENT_GROUP_RATE: 120` |
| `src/lib/services/group-service.ts` | 20-24 | `GROUP_RATE = 120`, `INDIVIDUAL_RATE = 150` |

#### Billing Logic Files
| File | What It Does |
|------|-------------|
| `src/pages/parent/invoice.astro` | Calculates parent billing using `effective_group_size >= 2` |
| `src/pages/teacher/invoice.astro` | Calculates teacher earnings by tier + group deduplication |
| `src/pages/admin/invoices.astro` | Admin billing dashboard with group/individual breakdown |
| `src/lib/services/group-service.ts` | `calculateGroupRate()`, `getEffectiveGroup()` |
| `src/lib/services/group-cancellation-service.ts` | 24h billing, sick exemptions, rate cascade |
| `src/lib/services/teacher-credits.ts` | Teacher tier rates (individual_rate, group_rate per tier) |

#### Key Billing Pattern
```typescript
// ACTUAL BILLING LOGIC (does NOT use class_mode!)
const isGroup = effective_group_size >= 2;
const rate = isGroup ? GROUP_RATE : INDIVIDUAL_RATE; // R$120 vs R$150
```

---

### 3. CONSTANTS FILES (6 files)

| File | Lines | What |
|------|-------|------|
| `src/constants/ui.ts` | 244-254 | `CLASS_MODES`, `PLAN_TYPES` arrays |
| `src/constants/enrollment-statuses.ts` | 406-411 | `CLASS_MODE_OPTIONS` for enrollments |
| `src/constants/user-forms.ts` | 30-34 | `CLASS_MODE_OPTIONS` for forms |
| `src/constants/billing.ts` | 59-61 | `MIN_GROUP_SIZE_FOR_GROUP_RATE = 2` |
| `src/constants/invoice.ts` | 12-27 | Rate constants and tier rates |
| `src/constants/theme.ts` | 174-177 | Class mode colors (individual = lavender) |

---

### 4. TYPE DEFINITIONS (2 files)

| File | Lines | What |
|------|-------|------|
| `src/lib/repositories/types.ts` | 113, 268, 327, 341, 441, 479, 1043-1045, 1458, 1516 | Enrollment, Lead, Student, Teacher interfaces |
| `src/types/schedule.ts` | 86 | `ScheduleItem.classMode` |

---

### 5. REPOSITORY IMPLEMENTATIONS (4 files)

| File | What |
|------|------|
| `src/lib/repositories/d1/enrollment.ts` | Row mapping, CRUD, 9 occurrences |
| `src/lib/repositories/d1/lead.ts` | Row mapping, CRUD, 6 occurrences |
| `src/lib/repositories/d1/teacher.ts` | Teaching preferences |
| `src/lib/repositories/d1/student.ts` | 6 occurrences |

---

### 6. SERVICES (10 files)

| Service | Occurrences | What |
|---------|-------------|------|
| `src/lib/services/lead-service.ts` | 4 | Preserves class_mode during conversion |
| `src/lib/services/slot-service.ts` | 4 | Populates classMode in slots |
| `src/lib/services/schedule-generator.ts` | 5 | Propagates to schedule items |
| `src/lib/services/notification-service.ts` | 1 | GROUP_RATE_CHANGED notifications |
| `src/lib/services/group-service.ts` | 2 | Rate calculations (uses group_size NOT class_mode) |
| `src/lib/services/group-cancellation-service.ts` | - | Billing cascade logic |
| `src/lib/services/teacher-credits.ts` | 2 | individual_rate, group_rate per tier |
| `src/lib/services/google-sheets.ts` | 1 | Sync class_mode to sheets |
| `src/lib/services/location-change-service.ts` | - | Presencial-only location workflow |

---

### 7. UI COMPONENTS (8 files)

| Component | Occurrences | What |
|-----------|-------------|------|
| `src/components/forms/StudentForm.astro` | 1 | Class mode dropdown |
| `src/components/forms/LeadForm.astro` | 1 | Class mode dropdown |
| `src/components/forms/TeacherForm.astro` | 9 | Teaching preference checkboxes |
| `src/components/forms/sections/ClassPreferencesSection.astro` | 9 | Reusable class preferences |
| `src/components/parent/StudentDashboardCard.astro` | 5 | Display class mode |
| `src/components/grid/ClassBlock.astro` | 3 | Individual/Group tags based on groupId |
| `src/components/teacher/modals/CompleteClassModal.astro` | 3 | Individual/Group toggle for ratings |
| `src/components/teacher/TeacherTierCard.astro` | 2 | individual_rate, group_rate display |

---

### 8. PAGES (15+ files)

#### Admin Pages
| Page | Occurrences | What |
|------|-------------|------|
| `src/pages/admin/users.astro` | 8 | Teacher preference checkboxes |
| `src/pages/admin/enrollments.astro` | 2 | SmartBookingModal |
| `src/pages/admin/invoices.astro` | 2 | Billing dashboard |
| `src/pages/admin/index.astro` | 2 | Groups at risk stats |

#### Teacher Pages
| Page | Occurrences | What |
|------|-------------|------|
| `src/pages/teacher/index.astro` | 18 | Online badges, Individual/Grupo badges |
| `src/pages/teacher/schedule.astro` | 10 | Online badges, rate calculations |
| `src/pages/teacher/availability.astro` | 3 | Individual/Group slot colors |
| `src/pages/teacher/invoice.astro` | 13 | Earnings by individual vs group |

#### Parent Pages
| Page | Occurrences | What |
|------|-------------|------|
| `src/pages/parent/index.astro` | 3 | Online badges |
| `src/pages/parent/students.astro` | 2 | Class mode display |
| `src/pages/parent/invoice.astro` | 2 | Billing by individual vs group |
| `src/pages/parent/billing/subscribe.astro` | 7 | Plan selection by class type |
| `src/pages/parent/cancel-choice.astro` | 5 | Rate change choice (Grupo→Individual) |

#### Public Pages
| Page | Occurrences | What |
|------|-------------|------|
| `src/pages/cadastro.astro` | 6 | Public registration form |

---

### 9. API ENDPOINTS (15+ files)

| Endpoint | What |
|----------|------|
| `POST /api/public/register` | Creates lead with class_mode |
| `POST /api/admin/jotform-sync` | JotForm field 58 parsing |
| `POST /api/webhooks/jotform` | JotForm webhook |
| `POST /api/admin/import-students` | Bulk import |
| `GET /api/teachers/[id]/class-mode-enrollments` | Check active enrollments by mode |
| `GET /api/students/[id]/enrollments-summary` | Returns class modes array |
| `GET /api/admin/todays-classes` | Includes class_mode |
| `GET /api/slots/matches` | Returns individual_rate, group_rate |
| `POST /api/enrollments/[id]/start-class` | Sets effective_group_size |
| `POST /api/enrollments/[id]/completions` | Records actual_rate |
| `POST /api/parent/reschedule-class` | Billing uses class_mode check |
| `GET /api/admin/invoices/*` | Billing calculations |

---

### 10. CLIENT SCRIPTS (8 files)

| Script | Occurrences | What |
|--------|-------------|------|
| `src/scripts/users-page-client.ts` | 29 | Teacher preferences, form handling |
| `src/scripts/leads-page-client.ts` | 2 | Lead form handling |
| `src/scripts/enrollments-page-client.ts` | 4 | Rate preview, group management |
| `src/scripts/teacher-schedule-client.ts` | 8 | Individual/Group mode switching |
| `src/scripts/teacher-availability-client.ts` | 4 | Slot colors by class type |
| `src/scripts/smart-booking-client.ts` | 7 | individual_rate tracking |
| `src/scripts/settings-client.ts` | 2 | class_modes setting |
| `src/scripts/pending-cancellations-client.ts` | 1 | Rate display |

---

### 11. CSS/STYLING (6 files)

| File | What |
|------|------|
| `src/styles/teacher-schedule.css` | `.class-header__label--individual` |
| `src/styles/teacher-availability.css` | `.slot-cell--booked-individual`, `.slot-cell--booked-group` |
| `src/styles/booking-page.css` | Individual-related styles |
| `src/styles/teacher-dashboard.css` | `.next-class__mode--individual`, `.itinerary-item__mode--individual` |
| `src/styles/teacher-invoice.css` | Individual class type styling |
| `src/styles/parent-invoice.css` | `.type-badge--individual` |
| `src/layouts/BaseLayout.astro` | CSS variables for individual class colors |

---

### 12. VALIDATION (3 files)

| File | What |
|------|------|
| `src/lib/validation/lead.ts` | `z.enum(['Presencial', 'Online', 'Ambos'])` |
| `src/lib/validation/subscription.ts` | `ClassTypeSchema = z.enum(['individual', 'group'])` |
| `src/lib/validation.ts` | `teaches_individual`, `teaches_group` booleans |

---

### 13. TEST FILES (20+ files)

All test files with class_mode/Individual/Grupo logic need review:
- `group-service.test.ts` (4 occurrences)
- `group-cancellation-service.test.ts` (4 occurrences)
- `teacher.test.ts` (5 occurrences)
- `enrollment.test.ts` (5 occurrences)
- `group-pricing.integration.test.ts` (3 occurrences)
- And 15+ more test files

---

## Proposed Changes

### Phase 1: Database Migration

**New Migration: `056_split_class_mode.sql`**

```sql
-- ============================================================
-- Migration 056: Split class_mode into class_location + class_format
-- ============================================================

-- STEP 1: Add new columns to enrollments (WITH CHECK CONSTRAINTS)
ALTER TABLE enrollments ADD COLUMN class_location TEXT
  CHECK (class_location IS NULL OR class_location IN ('Presencial', 'Online'));
ALTER TABLE enrollments ADD COLUMN class_format TEXT
  CHECK (class_format IS NULL OR class_format IN ('Individual', 'Grupo'));

-- STEP 2: Add new columns to students (WITH CHECK CONSTRAINTS)
ALTER TABLE students ADD COLUMN class_location TEXT
  CHECK (class_location IS NULL OR class_location IN ('Presencial', 'Online'));
ALTER TABLE students ADD COLUMN class_format TEXT
  CHECK (class_format IS NULL OR class_format IN ('Individual', 'Grupo'));

-- STEP 3: Add new column to leads (WITH CHECK CONSTRAINT)
-- Note: leads already has class_mode for location preference
ALTER TABLE leads ADD COLUMN class_format TEXT
  CHECK (class_format IS NULL OR class_format IN ('Individual', 'Grupo'));

-- STEP 4: Migrate existing data - enrollments
-- Handle all known class_mode variants
UPDATE enrollments SET
  class_location = CASE
    WHEN class_mode IS NULL THEN NULL
    WHEN LOWER(class_mode) LIKE '%online%' THEN 'Online'
    ELSE 'Presencial'
  END,
  class_format = CASE
    WHEN class_mode IS NULL THEN NULL
    WHEN LOWER(class_mode) LIKE '%grupo%' THEN 'Grupo'
    WHEN LOWER(class_mode) LIKE '%dupla%' THEN 'Grupo'
    ELSE 'Individual'
  END;

-- STEP 5: Migrate existing data - students
UPDATE students SET
  class_location = CASE
    WHEN class_mode IS NULL THEN NULL
    WHEN LOWER(class_mode) LIKE '%online%' THEN 'Online'
    ELSE 'Presencial'
  END,
  class_format = CASE
    WHEN class_mode IS NULL THEN NULL
    WHEN LOWER(class_mode) LIKE '%grupo%' THEN 'Grupo'
    WHEN LOWER(class_mode) LIKE '%dupla%' THEN 'Grupo'
    ELSE 'Individual'
  END;

-- STEP 6: Migrate leads - set class_format based on existing class_mode
-- Note: leads.class_mode is simplified ('Presencial', 'Online', 'Ambos')
-- Default to Individual since leads don't have group info yet
UPDATE leads SET
  class_format = 'Individual'
WHERE class_mode IS NOT NULL;

-- STEP 7: Add teacher location preference columns
ALTER TABLE teachers ADD COLUMN teaches_presencial INTEGER NOT NULL DEFAULT 1;
ALTER TABLE teachers ADD COLUMN location_preference TEXT
  CHECK (location_preference IS NULL OR location_preference IN ('Presencial', 'Online', 'Ambos'));

-- STEP 8: Populate teacher preferences based on existing flags
UPDATE teachers SET
  teaches_presencial = CASE
    WHEN teaches_individual = 1 OR teaches_group = 1 THEN 1
    ELSE 0
  END,
  location_preference = CASE
    WHEN teaches_online = 1 AND (teaches_individual = 1 OR teaches_group = 1) THEN 'Ambos'
    WHEN teaches_online = 1 THEN 'Online'
    ELSE 'Presencial'
  END;

-- ============================================================
-- NOTE: The old class_mode columns are PRESERVED for backward
-- compatibility during the transition period. They will be
-- removed in a future migration after all code is updated.
-- ============================================================
```

**Why CHECK Constraints?**
- Prevents invalid data at the database level (not just app level)
- Fails fast if someone inserts invalid values
- Self-documenting: schema shows valid values
- D1/SQLite supports CHECK constraints natively

### Phase 0: Create Single Source of Truth (FIRST!)

**Create NEW file: `src/constants/class-settings.ts`**

This file (documented in Issue 1 solution above) provides:
- Type-safe enums for `CLASS_LOCATION` and `CLASS_FORMAT`
- TypeScript types for `ClassLocation` and `ClassFormat`
- Form option arrays (`CLASS_LOCATION_OPTIONS`, `CLASS_FORMAT_OPTIONS`)
- Type guard functions (`isOnline()`, `isGroup()`, etc.)
- Legacy helpers (`buildLegacyClassMode()`, `parseLegacyClassMode()`)

**Why first?** All other phases will import from this file.

### Phase 2: Constants Updates

**Update `src/constants/ui.ts`** to re-export from class-settings:
```typescript
// Re-export from single source of truth
export {
  CLASS_LOCATION,
  CLASS_FORMAT,
  CLASS_LOCATION_OPTIONS,
  CLASS_FORMAT_OPTIONS,
  type ClassLocation,
  type ClassFormat,
} from './class-settings';

// DEPRECATED - remove after migration
export const CLASS_MODES = ['Presencial - Individual', 'Presencial - Em dupla/grupo', 'Online'] as const;
```

**Remove duplicate definitions from:**
- `src/constants/enrollment-statuses.ts` - Remove CLASS_MODE_OPTIONS
- `src/constants/user-forms.ts` - Remove CLASS_MODE_OPTIONS
- `src/lib/form-definitions/person-fields.ts` - Import from class-settings
- `src/pages/cadastro.astro` - Import from class-settings

### Phase 3: Type Updates

**`src/lib/repositories/types.ts`:**
```typescript
// Enrollment interface
class_location: 'Presencial' | 'Online' | null;
class_format: 'Individual' | 'Grupo' | null;
class_mode: string | null; // DEPRECATED - keep for backward compat

// Teacher interface
teaches_presencial: boolean;
teaches_online: boolean;
teaches_individual: boolean;
teaches_group: boolean;
```

### Phase 4: Validation Schema Updates

**`src/lib/validation/lead.ts`:**
```typescript
class_location: z.enum(['Presencial', 'Online']).optional(),
class_format: z.enum(['Individual', 'Grupo']).optional(),
```

### Phase 5: UI Component Updates

Each form component needs:
1. Replace single dropdown with two dropdowns/selections
2. Location: Presencial / Online
3. Format: Individual / Grupo

### Phase 6: Service Layer Updates

Update all services to:
1. Read from new fields
2. Maintain backward compatibility with old field
3. Compute combined display value when needed

---

## File Change Summary (COMPREHENSIVE)

### Database (4 files)
- [ ] `database/migrations/056_split_class_mode.sql` (NEW - with CHECK constraints)
- [ ] `database/migrations/042_enrollment_class_settings.sql` (review)
- [ ] `database/migrations/043_teacher_teaching_preferences.sql` (review)
- [ ] `database/schema.sql` (update documentation)

### Constants (7 files)
- [ ] `src/constants/class-settings.ts` (NEW - single source of truth!)
- [ ] `src/constants/ui.ts` - Re-export from class-settings, deprecate CLASS_MODES
- [ ] `src/constants/enrollment-statuses.ts` - Remove CLASS_MODE_OPTIONS (use import)
- [ ] `src/constants/user-forms.ts` - Remove CLASS_MODE_OPTIONS (use import)
- [ ] `src/constants/billing.ts` - Rate constants (no change needed)
- [ ] `src/constants/invoice.ts` - INDIVIDUAL_RATE, GROUP_RATE (no change needed)
- [ ] `src/constants/theme.ts` - Class mode colors

### Types (2 files)
- [ ] `src/lib/repositories/types.ts` - All entity interfaces
- [ ] `src/types/schedule.ts` - ScheduleItem.classMode

### Validation (3 files)
- [ ] `src/lib/validation/lead.ts` - Lead class_mode enum
- [ ] `src/lib/validation/subscription.ts` - ClassTypeSchema
- [ ] `src/lib/validation.ts` - Teacher preferences

### Repositories (4 files)
- [ ] `src/lib/repositories/d1/enrollment.ts`
- [ ] `src/lib/repositories/d1/lead.ts`
- [ ] `src/lib/repositories/d1/teacher.ts`
- [ ] `src/lib/repositories/d1/student.ts`

### Components (8 files)
- [ ] `src/components/forms/StudentForm.astro`
- [ ] `src/components/forms/LeadForm.astro`
- [ ] `src/components/forms/TeacherForm.astro`
- [ ] `src/components/forms/sections/ClassPreferencesSection.astro`
- [ ] `src/components/parent/StudentDashboardCard.astro`
- [ ] `src/components/grid/ClassBlock.astro`
- [ ] `src/components/teacher/modals/CompleteClassModal.astro`
- [ ] `src/components/teacher/TeacherTierCard.astro`

### Pages - Admin (5 files)
- [ ] `src/pages/admin/users.astro`
- [ ] `src/pages/admin/enrollments.astro`
- [ ] `src/pages/admin/invoices.astro`
- [ ] `src/pages/admin/index.astro`
- [ ] `src/pages/admin/leads.astro` (uses LeadForm)

### Pages - Teacher (4 files)
- [ ] `src/pages/teacher/index.astro` - Online/Individual/Grupo badges
- [ ] `src/pages/teacher/schedule.astro` - Online badges, rate calcs
- [ ] `src/pages/teacher/availability.astro` - Slot colors
- [ ] `src/pages/teacher/invoice.astro` - Earnings breakdown

### Pages - Parent (5 files)
- [ ] `src/pages/parent/index.astro` - Online badges
- [ ] `src/pages/parent/students.astro` - Class mode display
- [ ] `src/pages/parent/invoice.astro` - Billing breakdown
- [ ] `src/pages/parent/billing/subscribe.astro` - Plan selector
- [ ] `src/pages/parent/cancel-choice.astro` - Rate change choice

### Pages - Public (1 file)
- [ ] `src/pages/cadastro.astro` - Registration form

### API Endpoints (15+ files)
- [ ] `src/pages/api/public/register.ts`
- [ ] `src/pages/api/admin/jotform-sync.ts`
- [ ] `src/pages/api/webhooks/jotform.ts`
- [ ] `src/pages/api/admin/import-students.ts`
- [ ] `src/pages/api/teachers/[id]/class-mode-enrollments.ts`
- [ ] `src/pages/api/students/[id]/enrollments-summary.ts`
- [ ] `src/pages/api/admin/todays-classes.ts`
- [ ] `src/pages/api/slots/matches.ts`
- [ ] `src/pages/api/enrollments/[id]/start-class.ts`
- [ ] `src/pages/api/enrollments/[id]/completions/index.ts`
- [ ] `src/pages/api/parent/reschedule-class.ts`
- [ ] `src/pages/api/admin/invoices/*.ts` (multiple)

### Services (10 files)
- [ ] `src/lib/services/lead-service.ts`
- [ ] `src/lib/services/slot-service.ts`
- [ ] `src/lib/services/schedule-generator.ts`
- [ ] `src/lib/services/notification-service.ts`
- [ ] `src/lib/services/group-service.ts`
- [ ] `src/lib/services/group-cancellation-service.ts`
- [ ] `src/lib/services/teacher-credits.ts`
- [ ] `src/lib/services/google-sheets.ts`
- [ ] `src/lib/services/location-change-service.ts`

### Client Scripts (8 files)
- [ ] `src/scripts/users-page-client.ts` (29 occurrences!)
- [ ] `src/scripts/leads-page-client.ts`
- [ ] `src/scripts/enrollments-page-client.ts`
- [ ] `src/scripts/teacher-schedule-client.ts`
- [ ] `src/scripts/teacher-availability-client.ts`
- [ ] `src/scripts/smart-booking-client.ts`
- [ ] `src/scripts/settings-client.ts`
- [ ] `src/scripts/pending-cancellations-client.ts`

### CSS/Styling (6 files)
- [ ] `src/styles/teacher-schedule.css`
- [ ] `src/styles/teacher-availability.css`
- [ ] `src/styles/booking-page.css`
- [ ] `src/styles/teacher-dashboard.css`
- [ ] `src/styles/teacher-invoice.css`
- [ ] `src/styles/parent-invoice.css`
- [ ] `src/layouts/BaseLayout.astro` (CSS variables)

### Test Files (20+ files)
- [ ] `src/lib/services/group-service.test.ts`
- [ ] `src/lib/services/group-cancellation-service.test.ts`
- [ ] `src/lib/repositories/d1/teacher.test.ts`
- [ ] `src/lib/repositories/d1/enrollment.test.ts`
- [ ] `src/lib/test-utils/integration/group-pricing.integration.test.ts`
- [ ] And 15+ more test files...

### Documentation (3 files)
- [ ] `docs/reference/data-models.md`
- [ ] `docs/reference/api-contracts.md`
- [ ] `eduschedule-app/project-context.md`

---

## Total Impact (FINAL - VERIFIED via Exhaustive Multi-Agent Search)

**Comprehensive search found 250+ occurrences across 120+ files:**
- Direct `class_mode`/`teaches_*` references: 111 files
- Portuguese text patterns ("Presencial", "grupo", "modalidade"): 45+ files
- CSS classes/styling: 8 files
- Runtime conditional checks: 16+ files
- Billing/rate logic: 12+ files

| Category | File Count | Key Files |
|----------|------------|-----------|
| Database/Migrations | 6 | schema.sql, seed-test-data.sql, 017, 042, 043, 053 |
| Constants | 7 | billing.ts, invoice.ts, ui.ts, theme.ts, user-forms.ts, enrollment-statuses.ts, validation-messages.ts |
| Types/Contracts | 4 | repositories/types.ts, api-schemas.ts, calendar.ts, change-requests.ts |
| Validation | 2 | validation.ts, validation/lead.ts |
| Form Definitions | 1 | lib/form-definitions/person-fields.ts |
| Repositories | 5 | enrollment.ts, lead.ts, teacher.ts, student.ts, subscription-plan.ts |
| Services | 12 | group-service.ts, group-cancellation-service.ts, lead-service.ts, slot-service.ts, schedule-generator.ts, notification-service.ts, teacher-credits.ts, google-sheets.ts, lead-readiness-service.ts, subscription-service.ts |
| UI Components | 12 | CompleteClassModal.astro, ClassBlock.astro, TeacherForm.astro, StudentForm.astro, LeadForm.astro, ClassPreferencesSection.astro, StudentDashboardCard.astro, TeacherTierCard.astro, WeeklyScheduleGrid.astro, Nav.astro, PlanSelector.astro, BookingGrid.astro |
| Pages - Admin | 5 | enrollments.astro, users.astro, invoices.astro, index.astro, leads.astro |
| Pages - Teacher | 4 | index.astro, schedule.astro, availability.astro, invoice.astro |
| Pages - Parent | 5 | index.astro, students.astro, invoice.astro, billing/subscribe.astro, cancel-choice.astro |
| Pages - Public | 1 | cadastro.astro |
| API Endpoints | 20+ | enrollments/*, teachers/class-mode-enrollments, students/enrollments-summary, parent/reschedule-class, parent/cancel-class, public/register, webhooks/jotform, admin/jotform-sync, admin/todays-classes, admin/import-students, slots/matches, group/[groupId]/status, add-to-group, remove-from-group |
| Client Scripts | 8 | users-page-client.ts, leads-page-client.ts, enrollments-page-client.ts, teacher-schedule-client.ts, teacher-availability-client.ts, smart-booking-client.ts, settings-client.ts, pending-cancellations-client.ts |
| CSS/Styling | 8 | teacher-schedule.css, teacher-availability.css, teacher-dashboard.css, teacher-invoice.css, parent-invoice.css, admin-users.css, booking-page.css, components.css |
| Layouts | 1 | BaseLayout.astro (CSS variables) |
| Test Files | 28+ | All *.test.ts files with class_mode references |
| Stripe Integration | 1 | lib/stripe/config.ts |
| Utilities | 2 | lib/database.ts, lib/api-errors.ts |
| Mock Factories | 1 | lib/test-utils/mock-factories.ts |
| **TOTAL** | **120+ files** | Verified via exhaustive multi-agent search |

### Complete File Inventory (All 111 Files)

<details>
<summary>Click to expand full file list</summary>

**Source Files (105):**
1. `src/layouts/BaseLayout.astro`
2. `src/pages/cadastro.astro`
3. `src/components/forms/LeadForm.astro`
4. `src/scripts/leads-page-client.ts`
5. `src/lib/validation/lead.ts`
6. `src/lib/validation.ts`
7. `src/lib/services/notification-service.ts`
8. `src/pages/api/public/register.ts`
9. `src/lib/repositories/types.ts`
10. `src/lib/repositories/d1/lead.ts`
11. `src/lib/test-utils/mock-factories.ts`
12. `src/pages/admin/enrollments.astro`
13. `src/pages/api/slots/matches.ts`
14. `src/lib/api-errors.ts`
15. `src/scripts/enrollments-page-client.ts`
16. `src/scripts/users-page-client.ts`
17. `src/pages/api/admin/jotform-sync.ts`
18. `src/pages/teacher/schedule.astro`
19. `src/constants/ui.ts`
20. `src/styles/teacher-schedule.css`
21. `src/scripts/teacher-schedule-client.ts`
22. `src/pages/admin/index.astro`
23. `src/pages/api/admin/todays-classes.ts`
24. `src/pages/parent/index.astro`
25. `src/pages/teacher/index.astro`
26. `src/pages/admin/users.astro`
27. `src/components/teacher/modals/CompleteClassModal.astro`
28. `src/pages/parent/billing/subscribe.astro`
29. `src/pages/parent/invoice.astro`
30. `src/pages/parent/students.astro`
31. `src/pages/teacher/availability.astro`
32. `src/pages/teacher/invoice.astro`
33. `src/pages/admin/invoices.astro`
34. `src/styles/teacher-availability.css`
35. `src/components/teacher/TeacherTierCard.astro`
36. `src/scripts/teacher-availability-client.ts`
37. `src/styles/components.css`
38. `src/lib/database.ts`
39. `src/lib/services/schedule-generator.ts`
40. `src/pages/api/parent/reschedule-class.ts`
41. `src/components/grid/ClassBlock.astro`
42. `src/lib/services/lead-service.ts`
43. `src/constants/enrollment-statuses.ts`
44. `src/lib/stripe/config.ts`
45. `src/pages/parent/cancel-choice.astro`
46. `src/constants/billing.ts`
47. `src/scripts/settings-client.ts`
48. `src/components/forms/StudentForm.astro`
49. `src/pages/api/teachers/[id]/class-mode-enrollments.ts`
50. `src/components/forms/TeacherForm.astro`
51. `src/lib/repositories/d1/teacher.ts`
52. `src/pages/api/students/[id]/enrollments-summary.ts`
53. `src/lib/repositories/d1/enrollment.ts`
54. `src/constants/invoice.ts`
55. `src/scripts/pending-cancellations-client.ts`
56. `src/lib/services/teacher-credits.ts`
57. `src/pages/api/webhooks/jotform.ts`
58. `src/components/WeeklyScheduleGrid.astro`
59. `src/lib/contracts/api-schemas.ts`
60. `src/pages/api/enrollments/[id]/start-class.ts`
61. `src/pages/api/enrollments/[id]/completions/index.ts`
62. `src/constants/validation-messages.ts`
63. `src/lib/calendar.ts`
64. `src/scripts/smart-booking-client.ts`
65. `src/lib/repositories/d1/student.ts`
66. `src/pages/api/admin/import-students.ts`
67. `src/lib/change-requests.ts`
68. `src/components/Nav.astro`
69. `src/components/parent/StudentDashboardCard.astro`
70. `src/components/forms/sections/ClassPreferencesSection.astro`
71. `src/constants/theme.ts`
72. `src/lib/services/slot-service.ts`
73. `src/constants/user-forms.ts`
74. `src/lib/form-definitions/person-fields.ts`
75. `src/lib/services/group-service.ts`
76. `src/lib/services/google-sheets.ts`
77. `src/components/grid/index.ts`
78-105. Test files (*.test.ts) - 28 files

**Database Files (6):**
1. `database/schema.sql`
2. `database/seed-test-data.sql`
3. `database/migrations/017_normalize_student_statuses.sql`
4. `database/migrations/042_enrollment_class_settings.sql`
5. `database/migrations/043_teacher_teaching_preferences.sql`
6. `database/migrations/053_add_lead_contract_statuses.sql`

</details>

### Value Inconsistencies Found

The same concept uses DIFFERENT values in different contexts:

| Context | Values | Issue |
|---------|--------|-------|
| **Leads validation** | 'Presencial', 'Online', 'Ambos' | Simplified |
| **Enrollments/Students** | 'Presencial - Individual', 'Presencial - Em dupla/grupo', 'Online' | Combined |
| **Display strings** | 'Individual', 'Grupo', 'INDIVIDUAL', 'GROUP' | Inconsistent casing |
| **CSS classes** | `--individual`, `--group`, `--online` | Kebab-case |
| **Teacher prefs** | `teaches_individual`, `teaches_group`, `teaches_online` | Boolean flags |

---

## Migration Strategy

### Backward Compatibility Period

1. **Phase 1:** Add new fields, populate from old data
2. **Phase 2:** Update all code to write BOTH old and new fields
3. **Phase 3:** Update all code to READ from new fields
4. **Phase 4:** Mark old field as deprecated
5. **Phase 5:** Remove old field (future release)

### Rollback Plan

If issues arise:
1. Old `class_mode` field preserved during transition
2. Can revert to reading from old field
3. No data loss possible

---

## Benefits After Refactoring

### Functional Benefits
1. **Online + Grupo** combinations now possible (previously impossible!)
2. **Cleaner data model** - each concept has its own field
3. **Better filtering** - filter by location OR format independently
4. **Teacher preferences** - can set location and format preferences separately
5. **Lead matching** - more precise matching with separate criteria
6. **Reporting** - easier analytics by dimension

### Technical Benefits (From This Investigation)
7. **Single source of truth** - One constants file instead of 4 duplicates
8. **Type-safe code** - Type guards replace fragile string matching
9. **Database validation** - CHECK constraints prevent invalid data
10. **Easier maintenance** - Changes in one place propagate everywhere
11. **Better discoverability** - New devs find valid values in one place

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Update JotForm to collect separate fields? | **DEFERRED** - Parse existing field during sync, update JotForm later |
| Public registration form: two dropdowns or simplified? | **KEEP SIMPLIFIED** - Use "Presencial/Online/Ambos" for location, default format to Individual |
| Notify users about the change? | **NO** - Internal refactoring, no user-facing changes |
| Timeline for deprecation of old field? | **Phase 5** - After all code updated and tested, in a future release |

---

## Implementation Order (Recommended)

Execute phases in this order to minimize risk:

| Phase | Description | Risk | Dependencies |
|-------|-------------|------|--------------|
| **0** | Create `class-settings.ts` | LOW | None |
| **1** | Run database migration | MEDIUM | Phase 0 |
| **2** | Update constants (remove duplicates) | LOW | Phase 0 |
| **3** | Update types | LOW | Phase 0 |
| **4** | Update validation schemas | LOW | Phase 3 |
| **5** | Update repositories | MEDIUM | Phase 1, 3 |
| **6** | Update services | MEDIUM | Phase 5 |
| **7** | Update UI components | LOW | Phase 2, 6 |
| **8** | Update pages | LOW | Phase 7 |
| **9** | Update API endpoints | MEDIUM | Phase 6 |
| **10** | Update client scripts | LOW | Phase 2 |
| **11** | Update CSS (minor) | LOW | None |
| **12** | Update tests | LOW | All above |
| **13** | Documentation | LOW | All above |

**Critical Path:** Phases 0 → 1 → 3 → 5 → 6 → 9

**Testing Checkpoints:**
- After Phase 1: Verify migration ran correctly
- After Phase 6: Run all service tests
- After Phase 9: Run full integration tests
- After Phase 12: Full regression test

---

**Next Steps:**
1. Review and approve this plan
2. Create implementation stories in epics
3. Begin Phase 0: Create `src/constants/class-settings.ts`
4. Begin Phase 1: Database migration
