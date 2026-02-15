# Plan: Enrollment Date Boundaries & 1-Year Contract Max

## Context

**Problem:** Slots/classes render for any date regardless of enrollment start date, academic calendar, or contract period. There's no enforcement of date boundaries - a class created with `recurrence_start_date = 2026-03-01` still shows for weeks in February. Academic calendar dates (`classesStartDate`/`classesEndDate`) are loaded from business config but never consumed. Contracts have no explicit 1-year max validation. Neither the class details modal nor the users page student modal displays enrollment period dates.

**Outcome:** Classes outside their enrollment's active period are greyed out (not hidden). Academic calendar dates act as hard boundaries. Active/inactive periods (ATIVO/PAUSADO transitions) are derived from the existing `enrollment_status_history` table. Contracts are capped at 1 year. Enrollment dates are visible in both modals.

---

## Approach: Computed End Date (No New DB Column)

The effective end date is computed at query time:
```
effectiveEnd = MIN(classesEndDate, contract_end_date, terminated_at_as_date)
```

No `recurrence_end_date` column needed - avoids sync bugs. Active/inactive periods are derived from `enrollment_status_history` on demand.

**Key data sources:**
- `enrollments.recurrence_start_date` (TEXT NOT NULL, YYYY-MM-DD) - per-enrollment start
- `enrollments.terminated_at` (INTEGER, unix timestamp) - per-enrollment termination
- `enrollment_status_history` table - tracks every ATIVO/PAUSADO/AVISO/INATIVO transition with timestamps
- `business_config` → `classesStartDate` (2026-02-17), `classesEndDate` (2026-12-13) - academic calendar
- `contracts.contract_start_date`, `contracts.contract_end_date` - service contract period

---

## Step 1: Core Date Utility

**New file:** `src/lib/utils/enrollment-date-utils.ts`

Functions:
- `computeEffectiveStartDate(recurrenceStartDate, classesStartDate)` → `MAX(both)`
- `computeEffectiveEndDate(classesEndDate, contractEndDate?, terminatedAt?)` → `MIN(non-null values)`
- `isDateWithinBounds(date, effectiveStart, effectiveEnd)` → boolean
- `deriveActivePeriods(statusHistory[], effectiveStart, effectiveEnd)` → `{start, end, status}[]` (walks status_history entries sorted by created_at ASC to find ATIVO/PAUSADO ranges)
- `isDateInActivePeriod(date, activePeriods)` → boolean

---

## Step 2: Schedule Generator Boundary Checks

**File:** `src/lib/services/schedule-generator.ts`

### ScheduleOptions (line ~117): Add fields
```typescript
academicCalendar?: { classesStartDate: string; classesEndDate: string };
contractEndDates?: Map<string, string | null>;  // studentId -> endDate
```

### ScheduleItem (line ~69): Add fields
```typescript
isOutsideActivePeriod?: boolean;
enrollmentStartDate?: string;
enrollmentEndDate?: string;
```

### getScheduleForWeek() (line ~371): Add checks after quinzenal check, before INATIVO check

1. If `dateStr < enrollment.recurrence_start_date` → set `isOutsideActivePeriod = true`
2. If `academicCalendar` provided and `dateStr < classesStartDate` or `dateStr > classesEndDate` → set `isOutsideActivePeriod = true`
3. If `contractEndDates` has entry and `dateStr > contractEndDate` → set `isOutsideActivePeriod = true`
4. Pass `enrollmentStartDate` and `enrollmentEndDate` through to the ScheduleItem

**Key:** Grey out, don't skip. Set flag, still generate the item.

### Also update getScheduleForDateRange() (~line 917): Same boundary logic

---

## Step 3: Schedule Page Service Boundary Checks

**File:** `src/lib/services/schedule-page-service.ts`

### buildClassBlocks() (line ~643): Replace skip logic with grey-out

Currently lines 656-663 skip classes outside `student.contract_start`/`student.contract_end`. Change to:
1. Check `enrollment.recurrence_start_date` against classDate
2. Check academic calendar bounds (pass via constructor/options)
3. Instead of `continue`, set `is_outside_active_period = true` on the ClassBlock

### Accept business config: Add to constructor/options
```typescript
academicCalendar?: { classesStartDate: string; classesEndDate: string };
```

### ClassBlock type additions in `src/types/schedule.ts` (line ~12):
```typescript
is_outside_active_period?: boolean;
enrollment_start_date?: string;
enrollment_end_date?: string;
```

---

## Step 4: Contract 1-Year Max Enforcement

**File:** `src/lib/services/contract-service.ts`

### generateServiceContract() (line ~849): After calculating endDate
```typescript
// Safety: ensure contract never exceeds 1 year
const maxEnd = new Date(startDate + 'T12:00:00');
maxEnd.setFullYear(maxEnd.getFullYear() + 1);
maxEnd.setDate(maxEnd.getDate() - 1);
if (new Date(endDate + 'T12:00:00') > maxEnd) {
  throw new Error('Contrato de servico nao pode exceder 1 ano');
}
```

### getContractSummary(): Add warning for existing contracts > 1 year
Add `maxDurationWarning?: string` to summary response. Calculate days between start/end; if > 366 set warning.

### Add `enrollmentDates` to summary response:
```typescript
enrollmentDates?: {
  start: string;        // recurrence_start_date
  effectiveEnd: string; // computed
  academicStart: string;
  academicEnd: string;
}
```
Requires fetching the student's enrollment(s) and computing effective dates.

---

## Step 5: Contract Summary API Update

**File:** `src/pages/api/students/[id]/contract-summary.ts`

Pass `classesStartDate`/`classesEndDate` to the contract service. Include `enrollmentDates` in response. Already has access to `config` via `context.locals.config`.

---

## Step 6: Contract Batch-Send Validation

**File:** `src/pages/api/admin/contracts/batch-send.ts`

Add 1-year max enforcement to batch contract creation. Currently `contractStartDate` is passed through without date bounds validation. Add:
- Validate `contract_start_date >= classesStartDate` (if within academic year)
- Validate computed end date does not exceed 1 year from start

---

## Step 7: ClassBlock Greyed-Out Styling

**File:** `src/components/grid/ClassBlock.astro`

### ClassBlockData interface (~line 26): Add fields
- `is_outside_active_period?: boolean`
- `enrollment_start_date?: string`
- `enrollment_end_date?: string`

### Button element (~line 342): Add CSS class
```
${classData.is_outside_active_period ? 'class-block--outside-period' : ''}
```

### Scoped CSS (~line 409): Add styles (follows existing `--on-closure-day` pattern at line 519)
```css
.class-block--outside-period {
  opacity: 0.4;
  filter: grayscale(0.8);
  pointer-events: auto;
}
.class-block--outside-period:hover {
  opacity: 0.55;
  filter: grayscale(0.5);
}
```

### Click data (~line 284): Include enrollment dates for modal display

---

## Step 8: DayView & MonthView Grey-Out

**File:** `src/components/views/DayView.astro`
- Check `scheduleItem.isOutsideActivePeriod` and add opacity class to `.day-view__class` button

**File:** `src/components/views/MonthView.astro`
- Check `is_outside_active_period` on class bar elements, apply reduced opacity

---

## Step 9: WindowClassData Type Update

**File:** `src/global.d.ts`

Add to `WindowClassData` interface (~line 42):
```typescript
enrollmentStartDate?: string;  // YYYY-MM-DD
enrollmentEndDate?: string;    // YYYY-MM-DD
isOutsideActivePeriod?: boolean;
```

This enables the class details modal to access enrollment date info from click data.

---

## Step 10: Class Details Modal - Show Enrollment Dates

**File:** `src/pages/admin/enrollments.astro` (~line 1235)
- Add row to `.class-details-card__grid`:
```html
<div class="class-details-card__item">
  <span class="class-details-card__label">Periodo da Matricula</span>
  <span class="class-details-card__value" id="enrollment_period">--</span>
</div>
```

**File:** `src/scripts/enrollments-page-client.ts` (~line 875)
- Populate `enrollment_period` from click data (`enrollmentStartDate` / `enrollmentEndDate`)
- Format as DD/MM/YYYY - DD/MM/YYYY

---

## Step 11: Users Page Student Modal - Show Enrollment Dates

**File:** `src/pages/admin/users.astro` (~line 757)
- Add row to contract info card:
```html
<div class="info-item">
  <span class="info-item__label">Periodo Matricula</span>
  <span class="info-item__value" id="contractCardEnrollmentPeriod">-</span>
</div>
```

**File:** `src/scripts/users-page-client.ts` (~line 2231)
- Populate from updated contract-summary API response `enrollmentDates`

---

## Step 12: Smart Booking Modal - Default Start Date

**File:** `src/components/SmartBookingModal.astro` (~line 196)

Currently the `recurrence_start_date` input has no default. Changes:
- Pass `classesStartDate` from business config as a prop
- Set as `min` attribute on the date input
- Default value to `classesStartDate` or today (whichever is later)

**File:** `src/scripts/smart-booking-client.ts` (~line 1174)
- Validate `recurrence_start_date >= classesStartDate` before submission

---

## Step 13: Lead Conversion - Fix Hard-Coded Date

**File:** `src/lib/services/lead-service.ts` (~line 483)

Currently hard-codes `recurrence_start_date: today`. Changes:
- Accept `recurrence_start_date` in `ConvertLeadData` interface
- Use provided value, or default to `MAX(today, classesStartDate)`
- Lead service needs access to business config for `classesStartDate`

**File:** `src/pages/api/leads/[id]/convert.ts`
- Pass `recurrence_start_date` from request body to lead service

**File:** `src/lib/validation/lead.ts` (ConvertLeadSchema)
- Add optional `recurrence_start_date` field

---

## Step 14: Pass Academic Calendar Through the Stack

**File:** `src/pages/admin/enrollments.astro`
- Already has `const config = Astro.locals.config`
- Pass `classesStartDate`/`classesEndDate` to schedule-page-service and schedule-generator
- Add to `clientConfig` JSON for client-side awareness

---

## Not In Scope (Low Priority / Optional)

| Area | Reason |
|------|--------|
| AllTeachersView mini-week | Uses colored status boxes, not ClassBlock. Low visual impact. |
| AdminWeekView (admin events) | Shows admin events, not enrollment class blocks. Different system. |
| Parent dashboard | Uses flat class list, not grid. No ClassBlock component. |
| Teacher schedule | Uses ScheduleItem list, not visual grid. Greyed text could be added later. |
| Slot service | Slots are computed from enrollments already loaded by callers. Callers handle filtering. |

---

## Implementation Order

1. `enrollment-date-utils.ts` (new utility - foundation)
2. `schedule.ts` types (add fields to ClassBlock)
3. `global.d.ts` (add fields to WindowClassData)
4. `schedule-generator.ts` (add boundary checks + flags)
5. `schedule-page-service.ts` (replace skip with grey-out)
6. `contract-service.ts` (1-year max + enrollmentDates in summary)
7. `contract-summary.ts` API (include enrollmentDates)
8. `batch-send.ts` (1-year max validation)
9. `ClassBlock.astro` (interface + CSS + click data)
10. `DayView.astro` + `MonthView.astro` (grey-out styling)
11. `enrollments.astro` + `enrollments-page-client.ts` (modal dates + calendar config passthrough)
12. `users.astro` + `users-page-client.ts` (modal dates)
13. `SmartBookingModal.astro` + `smart-booking-client.ts` (default date + validation)
14. `lead-service.ts` + `convert.ts` + lead validation (fix hard-coded date)

---

## Files Summary (19 files)

| File | Change |
|------|--------|
| `src/lib/utils/enrollment-date-utils.ts` | **NEW** - date computation utilities |
| `src/types/schedule.ts` | Add 3 fields to ClassBlock interface |
| `src/global.d.ts` | Add 3 fields to WindowClassData |
| `src/lib/services/schedule-generator.ts` | Add options, boundary checks, ScheduleItem fields |
| `src/lib/services/schedule-page-service.ts` | Replace skip with grey-out, accept calendar config |
| `src/lib/services/contract-service.ts` | 1-year max, enrollmentDates in summary, warning |
| `src/lib/services/lead-service.ts` | Accept recurrence_start_date, use classesStartDate default |
| `src/pages/api/students/[id]/contract-summary.ts` | Pass calendar config, include enrollmentDates |
| `src/pages/api/admin/contracts/batch-send.ts` | 1-year max validation |
| `src/pages/api/leads/[id]/convert.ts` | Pass recurrence_start_date |
| `src/lib/validation/lead.ts` | Add optional recurrence_start_date to ConvertLeadSchema |
| `src/components/grid/ClassBlock.astro` | Interface + CSS + click data |
| `src/components/views/DayView.astro` | Grey-out styling for outside-period |
| `src/components/views/MonthView.astro` | Grey-out styling for outside-period |
| `src/components/SmartBookingModal.astro` | Default date + min attribute |
| `src/scripts/smart-booking-client.ts` | Date validation |
| `src/pages/admin/enrollments.astro` | Modal row + pass calendar config |
| `src/scripts/enrollments-page-client.ts` | Populate enrollment period |
| `src/pages/admin/users.astro` | Modal row for enrollment period |
| `src/scripts/users-page-client.ts` | Populate from API |

### Documentation Updates
- `eduschedule-app/project-context.md` - session changes
- `docs/reference/api-contracts.md` - updated contract-summary response
- `docs/reference/feature-maps.md` - new enrollment-date-utils file

---

## Verification

1. **Dev server:** `npm run dev:remote` in eduschedule-app/
2. **Week view:** Select a teacher. Verify classes before `recurrence_start_date` or after `classesEndDate` appear greyed out (40% opacity, grayscale)
3. **Day view:** Switch to day view, verify greyed classes show with reduced opacity
4. **Month view:** Verify compact bars show reduced opacity for outside-period
5. **Class details modal:** Click a class block, verify "Periodo da Matricula" row shows DD/MM/YYYY - DD/MM/YYYY
6. **Users page:** Open student modal, verify enrollment period shows in contract card
7. **Contract creation:** Create a service contract - verify ANUAL works, manually crafted > 1 year is rejected
8. **Existing contracts:** View a student with existing contract - verify warning if > 1 year
9. **Smart booking:** Open smart booking modal, verify date defaults to classesStartDate and has min constraint
10. **Lead conversion:** Convert a lead, verify recurrence_start_date respects classesStartDate
