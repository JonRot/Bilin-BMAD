# Tech-Spec: Scheduling Enhancements (Buffer Times + Time-Off Requests)

**Created:** 2025-12-12
**Status:** Ready for Development
**Author:** BMAD Workflow + Jonathan

---

## Overview

### Problem Statement

1. **Buffer Times Issue:** When suggesting slots for leads, the system uses 5-minute rounding which creates awkward times like "16:41". Need 15-minute rounding for cleaner schedules (e.g., 16:45).

2. **Leads with Missing Data:** Leads without valid location data are being suggested for matching, wasting admin time. Need "ready for matching" filter.

3. **Teacher Time-Off:** Teachers have no way to request vacation days, sick days, or weeks off. Admin must manually manage this outside the system.

### Solution

1. **Smart Buffer Calculation:** Change rounding from 5min to 15min. Buffer = travel time + padding to round to nearest 15 minutes.

2. **Ready for Matching Status:** Add computed field/filter for leads with complete location data. Hide incomplete leads from matching suggestions.

3. **Time-Off Request System:** New request/approval flow similar to existing availability approvals. Teachers request time off, admins approve/deny.

### Scope

**In Scope:**
- Change TIME_ROUNDING_MINUTES from 5 to 15
- Add "ready_for_matching" computed property to leads
- Filter incomplete leads from waitlist matcher
- Add visual indicator on leads page
- New `teacher_time_off_requests` table
- Time-off request form in teacher calendar
- Admin approval page for time-off requests

**Out of Scope:**
- Drag-and-drop (not needed - AI suggestions are the differentiator)
- Calendar sync with Google
- Additional calendar views (Agenda/Resource/Month) - future enhancement

---

## Context for Development

### Codebase Patterns

| Pattern | Example File |
|---------|--------------|
| Request/Approval Flow | `src/pages/api/admin/availability-approvals.ts` |
| Pending Items Page | `src/pages/admin/pending-cancellations.astro` |
| Teacher Schedule Page | `src/pages/teacher/schedule.astro` |
| Waitlist Matching | `src/lib/services/waitlist-matcher.ts` |
| Lead Service | `src/lib/services/lead-service.ts` |

### Files to Modify

**Buffer Times:**
- `src/lib/services/waitlist-matcher.ts` - Change TIME_ROUNDING_MINUTES to 15

**Ready for Matching:**
- `src/lib/services/waitlist-matcher.ts` - Add filter for leads with missing location
- `src/pages/admin/leads.astro` - Add visual indicator and filter
- `src/constants/enrollment-statuses.ts` - Add LEAD_DATA_STATUS constants (optional)

**Time-Off Requests:**
- `database/migrations/008-teacher-time-off.sql` (NEW)
- `src/lib/repositories/d1/time-off.ts` (NEW)
- `src/lib/repositories/types.ts` - Add interfaces
- `src/pages/api/teacher/time-off.ts` (NEW)
- `src/pages/api/admin/time-off-approvals.ts` (NEW)
- `src/pages/teacher/schedule.astro` - Add "Request Time Off" button
- `src/pages/admin/time-off-approvals.astro` (NEW)
- `src/constants/ui.ts` - Add nav link

### Technical Decisions

1. **15-Minute Rounding:** Round UP after adding travel time (e.g., 16:30 + 11min travel = 16:41 → round to 16:45)

2. **Ready for Matching Criteria:**
   - Has lat/lon coordinates
   - Has neighborhood
   - Has availability_windows
   - Status in ['EM_ANALISE', 'WAITLIST'] (already filtered)

3. **Time-Off Request Model:**
   - Similar to exception model but for DATE RANGES
   - Blocks all classes on those dates
   - Admin approval required
   - Can be full day or partial (future)

---

## Implementation Plan

### Task 1: Buffer Time Rounding (15 minutes)

**File:** `src/lib/services/waitlist-matcher.ts`

```typescript
// Change line ~135
const TIME_ROUNDING_MINUTES = 15; // Was 5

// The existing roundUpToNearest() function already works with any value
```

**Acceptance Criteria:**
- [ ] When travel time is 11 min from 16:30, suggested start is 16:45 (not 16:41)
- [ ] All slot suggestions use 15-minute boundaries

---

### Task 2: Ready for Matching Filter

**File:** `src/lib/services/waitlist-matcher.ts`

Add filter at start of `findMatches()`:

```typescript
// After getting candidates, filter for "ready for matching"
filteredCandidates = filteredCandidates.filter(c => {
  // Must have coordinates
  if (!c.lat || !c.lon) return false;
  // Must have neighborhood (for zone matching)
  if (!c.neighborhood) return false;
  // Must have availability windows
  if (!c.availability_windows) return false;
  return true;
});
```

**File:** `src/pages/admin/leads.astro`

Add visual indicator:

```html
<!-- In lead card -->
{!lead.lat || !lead.lon ? (
  <span class="badge badge--warning" title="Missing location data">
    Needs Location
  </span>
) : (
  <span class="badge badge--success">Ready for Matching</span>
)}
```

Add filter dropdown:
- All Leads
- Ready for Matching (has location)
- Needs Data (missing location)

**Acceptance Criteria:**
- [ ] Leads without lat/lon are NOT shown in waitlist suggestions
- [ ] Leads page shows "Needs Location" badge for incomplete leads
- [ ] Admin can filter to see only leads needing attention

---

### Task 3: Time-Off Request Database Schema

**File:** `database/migrations/008-teacher-time-off.sql`

```sql
-- Teacher time-off requests (vacation, sick days, etc.)
CREATE TABLE IF NOT EXISTS teacher_time_off_requests (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  start_date TEXT NOT NULL,        -- YYYY-MM-DD
  end_date TEXT NOT NULL,          -- YYYY-MM-DD (same as start for single day)
  request_type TEXT NOT NULL,      -- 'VACATION' | 'SICK' | 'PERSONAL' | 'OTHER'
  reason TEXT,                     -- Teacher's explanation
  status TEXT DEFAULT 'PENDING',   -- 'PENDING' | 'APPROVED' | 'REJECTED'
  admin_notes TEXT,                -- Admin's response/reason
  approved_by TEXT,                -- Admin email who approved/rejected
  approved_at INTEGER,             -- Unix timestamp
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE INDEX idx_time_off_teacher ON teacher_time_off_requests(teacher_id);
CREATE INDEX idx_time_off_status ON teacher_time_off_requests(status);
CREATE INDEX idx_time_off_dates ON teacher_time_off_requests(start_date, end_date);
```

**Acceptance Criteria:**
- [ ] Migration runs successfully
- [ ] Indexes created for common queries

---

### Task 4: Time-Off Request API

**File:** `src/pages/api/teacher/time-off.ts` (NEW)

```typescript
// GET - List teacher's own time-off requests
// POST - Create new time-off request

export const GET: APIRoute = async ({ cookies, locals }) => {
  // Return teacher's requests (all statuses)
};

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // Validate: start_date, end_date, request_type
  // Check for overlapping requests
  // Create with status = 'PENDING'
  // (Optional) Send notification to admin
};
```

**File:** `src/pages/api/admin/time-off-approvals.ts` (NEW)

```typescript
// GET - List all pending time-off requests
// POST - Approve or reject request

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // Validate admin role
  // Validate CSRF
  // Update status to APPROVED or REJECTED
  // Set approved_by, approved_at, admin_notes
  // (Future) Auto-create exceptions for affected enrollments
};
```

**Acceptance Criteria:**
- [ ] Teacher can GET their own requests
- [ ] Teacher can POST new requests
- [ ] Admin can GET all pending requests
- [ ] Admin can approve/reject with notes
- [ ] CSRF protected on POST

---

### Task 5: Teacher Time-Off Request UI

**File:** `src/pages/teacher/schedule.astro`

Add button in schedule header:

```html
<Button variant="secondary" onclick="openTimeOffModal()">
  Request Time Off
</Button>
```

Add modal:

```html
<Modal id="timeOffModal" title="Request Time Off">
  <form id="timeOffForm">
    <!-- Date range picker -->
    <FormField type="date" name="start_date" label="From" required />
    <FormField type="date" name="end_date" label="To" required />

    <!-- Request type -->
    <FormField type="select" name="request_type" label="Type" required>
      <option value="VACATION">Vacation</option>
      <option value="SICK">Sick Day</option>
      <option value="PERSONAL">Personal</option>
      <option value="OTHER">Other</option>
    </FormField>

    <!-- Reason -->
    <FormField type="textarea" name="reason" label="Notes (optional)" />

    <Button type="submit" variant="primary">Submit Request</Button>
  </form>
</Modal>
```

Show pending requests with status badges.

**Acceptance Criteria:**
- [ ] Button visible on teacher schedule page
- [ ] Modal opens with date range picker
- [ ] Form submits and shows success message
- [ ] Pending requests shown with status badge

---

### Task 6: Admin Time-Off Approvals Page

**File:** `src/pages/admin/time-off-approvals.astro` (NEW)

Pattern: Copy from `pending-cancellations.astro`

- Page header with pending count badge
- Card for each pending request showing:
  - Teacher name
  - Date range
  - Request type
  - Reason (if provided)
  - "Approve" and "Reject" buttons
- Reject modal with reason textarea

**File:** `src/constants/ui.ts`

Add nav link under "Approvals" dropdown:

```typescript
{ href: '/admin/time-off-approvals', label: 'Time Off' },
```

**Acceptance Criteria:**
- [ ] Page accessible at /admin/time-off-approvals
- [ ] Shows all pending requests
- [ ] Approve button works
- [ ] Reject requires reason
- [ ] Nav link added to Approvals dropdown

---

### Task 7: Block Classes During Approved Time-Off

**File:** `src/lib/services/schedule-generator.ts`

When generating schedule, check for approved time-off:

```typescript
// In getScheduleForWeek or similar
const approvedTimeOff = await db.prepare(`
  SELECT * FROM teacher_time_off_requests
  WHERE teacher_id = ?
  AND status = 'APPROVED'
  AND start_date <= ?
  AND end_date >= ?
`).bind(teacherId, weekEnd, weekStart).all();

// For each day in time-off range, mark classes as blocked/cancelled
```

**Acceptance Criteria:**
- [ ] Classes during approved time-off show as "Teacher Off" or similar
- [ ] Slots during time-off are not suggested for new bookings

---

## Additional Context

### Dependencies

- Existing availability approval pattern
- Existing pending cancellations pattern
- Schedule generator service

### Testing Strategy

1. **Unit Tests:**
   - Time rounding function (15-min boundaries)
   - Ready-for-matching filter logic

2. **Integration Tests:**
   - Time-off request creation
   - Approval flow
   - Schedule blocking

3. **Manual Testing:**
   - Teacher requests vacation
   - Admin approves
   - Classes show as blocked
   - Waitlist suggestions respect time-off

### Notes

- Consider future enhancement: partial day time-off (e.g., "off after 2pm")
- Consider future enhancement: auto-create exceptions for existing enrollments
- Time-off should be checked in slot suggestions to avoid suggesting during teacher vacation

### Constants to Add

```typescript
// src/constants/enrollment-statuses.ts

export const TIME_OFF_REQUEST_TYPES = {
  VACATION: 'VACATION',
  SICK: 'SICK',
  PERSONAL: 'PERSONAL',
  OTHER: 'OTHER',
} as const;

export const TIME_OFF_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const TIME_OFF_TYPE_LABELS: Record<string, string> = {
  VACATION: 'Vacation',
  SICK: 'Sick Day',
  PERSONAL: 'Personal',
  OTHER: 'Other',
};
```

---

## Summary

| Task | Effort | Priority |
|------|--------|----------|
| 1. Buffer Time Rounding | 15 min | P0 |
| 2. Ready for Matching Filter | 1 hour | P0 |
| 3. Time-Off Database Schema | 30 min | P1 |
| 4. Time-Off Request API | 2 hours | P1 |
| 5. Teacher Time-Off UI | 2 hours | P1 |
| 6. Admin Approvals Page | 2 hours | P1 |
| 7. Block Classes During Time-Off | 1 hour | P1 |

**Total Estimated Effort:** ~8 hours

---

**Ready for Development!**
