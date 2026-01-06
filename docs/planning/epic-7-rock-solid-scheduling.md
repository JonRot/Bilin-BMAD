# Epic 7: Rock-Solid Scheduling System

**Status:** 7/9 Stories Complete (78%)
**Priority:** Critical (Post-MVP, Pre-Phase 2)
**Goal:** Make the scheduling, cancellation, and rescheduling flows bulletproof with proper notifications
**Last Updated:** 2026-01-06

---

## Epic Overview

This epic focuses on making the core scheduling workflows **rock solid** - no fluff, just reliable operations that everyone can trust. When something changes, everyone affected knows immediately.

**Core Principle:** "When a class status changes, everyone involved is notified instantly and given clear options."

---

## Implementation Status

| Story | Title | Status | Notes |
|-------|-------|--------|-------|
| 7.1 | Parent Cancellation Flow | **COMPLETE** | 24h billing, sick exemption, group cascade |
| 7.2 | Teacher Cancellation Request | **COMPLETE** | `/admin/pending-cancellations.astro` |
| 7.3 | Admin Bulk Cancellation Approval | **COMPLETE** | Bulk "Approve All Sick" action |
| 7.4 | System Closure Types | **COMPLETE** | `/admin/closures.astro` - FERIAS, WEATHER, EMERGENCY, HOLIDAY |
| 7.5 | Notification System Foundation | **COMPLETE** | 27+ notification methods, in-app bell |
| 7.6 | Real-Time Cancellation Notifications | **COMPLETE** | All scenarios covered |
| 7.7 | Parent Reschedule Slot Picker | Pending | Let parents pick new slot when cancelling |
| 7.8 | Makeup Class Tracking UI | Pending | Visual indicators for makeup status |
| 7.9 | WhatsApp Notifications | Deferred | Requires Business API setup |

---

## Completed Stories

### Story 7.1: Parent Cancellation Flow ✅ COMPLETE

**Implemented in:** Session 144 (Cancellation System Redesign)

**What's Working:**
- Parent clicks "Cancel" on upcoming class in dashboard
- **24h Warning Modal** shows:
  - If <24h: Red warning with billing amount (R$150)
  - If >24h: Green confirmation "No charge"
  - Sick exemption hint: "mention illness to avoid charge"
- GroupCancellationService handles all business logic:
  - 24h notice rule enforcement
  - Sick keyword detection (doente, sick, ill, fever, etc.)
  - Group cascade (rate changes when 2→1)
  - Location host workflow (triggers LocationChangeService)
- Success message shows billing result
- Teacher notified immediately
- Admin receives cancellation notification

**Files:**
- `src/pages/parent/index.astro` - Cancel modal with 24h warning
- `src/pages/api/parent/cancel-class.ts` - Integrated GroupCancellationService
- `src/lib/services/group-cancellation-service.ts` - Business logic

---

### Story 7.2: Teacher Cancellation Request Flow ✅ COMPLETE

**What's Working:**
- Teacher clicks "Request Cancellation" on their schedule
- Modal with reason selector (Sick, Personal, Other)
- Request creates exception with `approved_by = NULL`
- Admin sees pending request in `/admin/pending-cancellations.astro`
- Sick cancellations flagged for quick approval
- Teacher sees "Pending Approval" status

**Files:**
- `src/pages/admin/pending-cancellations.astro`
- `src/scripts/pending-cancellations-client.ts`
- `src/pages/api/admin/cancellations.ts`

---

### Story 7.3: Admin Bulk Cancellation Approval ✅ COMPLETE

**What's Working:**
- Admin dashboard shows "Pending Cancellations" badge with count
- Queue shows: Teacher name, Student name, Date/time, Reason
- Sick reasons highlighted
- **Bulk "Approve All Sick"** button
- On approval: Parent notified, teacher notified
- On rejection: Teacher notified with message

---

### Story 7.4: System Closure Types ✅ COMPLETE

**Implemented in:** Epic 6 Story 6.3 (Extended to full closure system)

**What's Working:**
- `/admin/closures.astro` - Full admin UI for managing closures
- Closure types: FERIAS, WEATHER, EMERGENCY, HOLIDAY, CUSTOM
- City-specific targeting (Florianópolis, Balneário, Itajaí, or All)
- Date range support
- Schedule generator respects closure dates
- Bulk notifications to affected families

**Database:**
```sql
CREATE TABLE system_closures (
  id TEXT PRIMARY KEY,
  closure_type TEXT NOT NULL,
  city_id TEXT,  -- NULL = all cities
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

---

### Story 7.5: Notification System Foundation ✅ COMPLETE

**What's Working:**
- `notifications` table with proper indexes
- NotificationService with 27+ methods covering:
  - CLASS_CANCELLED_BY_PARENT
  - CLASS_CANCELLED_BY_TEACHER
  - CLASS_CANCELLED_BY_ADMIN
  - CLASS_CANCELLED_WEATHER
  - CLASS_RESCHEDULED
  - CANCELLATION_APPROVED / REJECTED
  - RATE_CHOICE_REQUIRED (group 2→1)
  - LOCATION_CHANGE_REQUIRED
  - PAUSADO_EXPIRING / EXPIRED
  - And many more...
- In-app bell icon with unread count
- Dropdown shows recent notifications
- Click to navigate to relevant page

**Files:**
- `src/lib/services/notification-service.ts`
- `src/lib/repositories/d1/notification.ts`
- `src/components/NotificationBell.astro`

---

### Story 7.6: Real-Time Cancellation Notifications ✅ COMPLETE

**What's Working:**

| Scenario | Who's Notified |
|----------|----------------|
| Parent cancels | Teacher (immediately), Admin (dashboard) |
| Teacher cancels (approved) | Parent with reason, Teacher confirmation |
| Admin cancels | Both parent and teacher |
| Weather/System closure | All affected parents and teachers |
| Group cascade (2→1) | Remaining student (rate choice required) |
| Location host cancels | All remaining students (location approval) |
| Late cancellation | Parent (billing charged), Admin |

---

## Remaining Stories

### Story 7.7: Parent Reschedule Slot Picker

**Priority:** High
**Estimate:** 8 points
**Status:** Pending

**Description:**
Currently, when a parent cancels a class, they can only cancel - not reschedule inline. Add "Reschedule" option that shows available slots.

**Acceptance Criteria:**
- [ ] Parent cancellation modal has TWO options:
  - "Reschedule to another day" (primary)
  - "Cancel without rescheduling" (secondary)
- [ ] If reschedule selected:
  - Show teacher's LIVRE slots for next 2 weeks
  - Parent selects new date/time
  - System creates RESCHEDULED_BY_STUDENT exception
  - Makeup class entry created for new date
- [ ] Both parties notified of reschedule
- [ ] 24h rule still applies to original slot

**UI Flow:**
```
┌─────────────────────────────────────────┐
│  Cancel Class - Monday, Jan 6 at 15:00  │
├─────────────────────────────────────────┤
│                                         │
│  Would you like to reschedule this      │
│  class to another day?                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📅 Reschedule to another day    │    │
│  │    See available times          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ❌ Cancel without rescheduling  │    │
│  │    (24h rule may apply)         │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**Technical Notes:**
- Reuse existing `rescheduled_to_date`, `rescheduled_to_time` fields
- Use `RESCHEDULED_BY_STUDENT` exception type
- Fetch teacher's LIVRE slots via existing `/api/slots/[teacherId]`
- Group by "This Week" and "Next Week"

---

### Story 7.8: Makeup Class Tracking UI

**Priority:** Medium
**Estimate:** 5 points
**Status:** Pending

**Description:**
Add visual indicators for makeup class status throughout the app.

**Acceptance Criteria:**
- [ ] Teacher schedule shows:
  - Cancelled slot: "Cancelled - Makeup on [Date]" or "Needs Makeup"
  - Makeup slot: "Makeup for [Original Date]"
- [ ] Parent view shows:
  - "Cancelled - Rescheduled to [New Date]"
  - Or "Cancelled - Contact admin to reschedule"
- [ ] Admin enrollments page shows makeup status column:
  - "No makeup needed"
  - "Makeup pending"
  - "Makeup scheduled [Date]"
  - "Makeup completed"

**Technical Notes:**
- Use existing `rescheduled_to_date` field
- Add `makeup_completed` status tracking if needed
- Filter options: "Show needing makeup"

---

### Story 7.9: WhatsApp Notifications (Deferred)

**Priority:** Low (Phase 3)
**Status:** Deferred

**Description:**
Add WhatsApp as notification channel for critical alerts.

**Why Deferred:**
- Requires WhatsApp Business API setup
- Needs template approval from Meta
- Current in-app notifications working well
- Can add later when user demand justifies cost

**When to Implement:**
- After payment system (Epic 8) is live
- If users request WhatsApp notifications
- As part of Phase 3 communication enhancements

---

## What's NOT in Epic 7 (Moved Elsewhere)

| Feature | Where It Is |
|---------|-------------|
| Group cancellation cascade | ✅ Cancellation System (Session 144) |
| Location host workflow | ✅ LocationChangeService |
| 24h billing enforcement | ✅ GroupCancellationService |
| Rate choice for remaining student | ✅ `/parent/cancel-choice.astro` |
| Location change approval | ✅ `/parent/location-change.astro` |
| Cancellation charges on invoice | ✅ `/parent/invoice.astro` |

---

## Success Criteria

| Scenario | Status |
|----------|--------|
| Parent cancels class | ✅ Teacher notified, 24h billing applied |
| Parent cancels <24h (sick) | ✅ No charge, billing exempted |
| Teacher calls in sick | ✅ Admin approves, parent notified |
| Storm hits Florianópolis | ✅ Weather closure, bulk notifications |
| Group class 2→1 | ✅ Remaining student gets rate choice |
| Location host cancels | ✅ LocationChangeService handles workflow |
| Parent wants to reschedule | ⏳ Pending - Story 7.7 |

---

## Dependencies

```
Story 7.7 (Reschedule Picker) ────► Uses existing LIVRE slot API
Story 7.8 (Makeup Tracking) ──────► Uses existing rescheduled_to_date
Story 7.9 (WhatsApp) ─────────────► Deferred to Phase 3
```

---

## Next Steps

1. **Story 7.7** - Add reschedule picker to parent cancellation modal
2. **Story 7.8** - Add makeup status indicators to UI
3. Then proceed to **Epic 8** (Payment & Subscription System)

---

*Epic created: 2025-12-09*
*Last major update: 2026-01-06 (Post-Cancellation System implementation)*
*Focus: Complete remaining 2 stories, then move to payments*
