# Epic 7: Rock-Solid Scheduling System

**Status:** Draft
**Priority:** Critical (Post-MVP, Pre-Phase 2)
**Goal:** Make the scheduling, cancellation, and rescheduling flows bulletproof with proper notifications

---

## Epic Overview

This epic focuses on making the core scheduling workflows **rock solid** - no fluff, just reliable operations that everyone can trust. When something changes, everyone affected knows immediately.

**Core Principle:** "When a class status changes, everyone involved is notified instantly and given clear options."

---

## Key Workflows to Perfect

### 1. Parent Cancellation Flow
```
Parent clicks "Cancel Class"
    ↓
Modal: "Are you sure? Would you like to reschedule instead?"
    ↓
[Yes, Reschedule] → Show available slots this week/next week
[No, Just Cancel] → Confirm cancellation
    ↓
Notification sent to:
  - Teacher (immediately)
  - Admin (dashboard badge)
    ↓
Slot marked as "Available for Makeup"
```

### 2. Teacher Cancellation Flow
```
Teacher clicks "Request Cancellation"
    ↓
Modal: "Reason for cancellation?"
  - Sick (protected, no credit penalty)
  - Personal emergency
  - Other (requires note)
    ↓
Request sent to Admin for approval
    ↓
Admin approves/rejects
    ↓
If approved:
  - Parent notified immediately
  - Class marked cancelled
  - Slot available for makeup
```

### 3. Admin Cancellation Flow (Single Class)
```
Admin clicks "Cancel Class" on any enrollment
    ↓
Modal: "This will cancel [Student]'s class on [Date]"
  - Reason dropdown
  - Notify parent? [checkbox, default: yes]
  - Notify teacher? [checkbox, default: yes]
    ↓
Cancellation created
Notifications sent
```

### 4. System Closure Flow (Weather/Emergency)
```
Admin clicks "Create System Closure"
    ↓
Modal:
  - Closure Type: [FÉRIAS | WEATHER | EMERGENCY | HOLIDAY]
  - City/Region: [All | Florianópolis | Balneário | etc.]
  - Date Range: [start] to [end]
  - Reason: "Storm warning - classes cancelled"
    ↓
System marks ALL enrollments in region as "CLOSURE" for those dates
    ↓
Bulk notification to:
  - All affected parents
  - All affected teachers
```

### 5. Rescheduling Flow
```
Class cancelled (any reason)
    ↓
System shows "Available for Makeup" indicator
    ↓
Admin/Parent can request reschedule
    ↓
Show available slots:
  - Same teacher's LIVRE slots this week
  - Same teacher's LIVRE slots next week
  - Cancelled slots from other students (same teacher)
    ↓
Select new date/time
    ↓
Makeup class created, linked to original
    ↓
Both parties notified
```

---

## Stories

### Story 7.1: Parent Cancellation with Reschedule Option

**Priority:** Critical
**Estimate:** 8 points

**Description:**
When a parent cancels a class, give them the option to reschedule immediately instead of just cancelling.

**Acceptance Criteria:**
- [ ] Parent clicks "Cancel" on upcoming class
- [ ] Modal shows two clear options:
  - "Reschedule to another day" (primary action)
  - "Cancel without rescheduling" (secondary)
- [ ] If reschedule selected:
  - Show teacher's available slots for next 2 weeks
  - Parent can select new date/time
  - Confirmation creates exception + makeup class
- [ ] If cancel selected:
  - Confirm: "This class will be cancelled. You may contact admin later to reschedule."
  - Create CANCELLED_STUDENT exception
- [ ] Teacher notified immediately of cancellation/reschedule
- [ ] Slot marked "Available for Makeup" in teacher view

**UI Mockup:**
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
│  └─────────────────────────────────┘    │
│                                         │
│  [Back]                                 │
└─────────────────────────────────────────┘
```

---

### Story 7.2: Teacher Cancellation Request Flow

**Priority:** Critical
**Estimate:** 5 points

**Description:**
Streamline teacher cancellation requests with proper sick day protection.

**Acceptance Criteria:**
- [ ] Teacher clicks "Request Cancellation" on their schedule
- [ ] Modal shows:
  - Class details (student, date, time)
  - Reason selector:
    - "I'm sick" (protected - shows reassurance message)
    - "Personal emergency"
    - "Other" (requires explanation)
  - Notes field
- [ ] Request creates exception with `approved_by = NULL`
- [ ] Admin sees pending request in dashboard
- [ ] Teacher sees "Pending Approval" status on their schedule
- [ ] Sick cancellations show: "Health comes first. No penalty for sick days."

**Technical Notes:**
- Sick = `is_sick_protected: true` flag on exception
- No credit deduction for sick-protected cancellations
- Same-day non-sick cancellations note for admin review

---

### Story 7.3: Admin Bulk Cancellation Approval

**Priority:** High
**Estimate:** 5 points

**Description:**
Admin can efficiently approve/reject multiple teacher cancellation requests.

**Acceptance Criteria:**
- [ ] Admin dashboard shows "Pending Cancellations" badge with count
- [ ] Clicking opens queue of pending requests
- [ ] Each request shows:
  - Teacher name
  - Student name
  - Date/time
  - Reason (highlighted if sick)
  - Approve / Reject buttons
- [ ] Bulk actions: "Approve All Sick" button
- [ ] On approval:
  - Exception updated with `approved_by`, `approved_at`
  - Parent notified automatically
  - Teacher notified of approval
- [ ] On rejection:
  - Exception deleted
  - Teacher notified: "Cancellation not approved - please contact admin"

---

### Story 7.4: System Closure Types (Weather/Emergency)

**Priority:** Critical
**Estimate:** 8 points

**Description:**
Extend FÉRIAS concept to support weather closures, emergencies, and holidays with city-specific targeting.

**Acceptance Criteria:**
- [ ] New closure types beyond FÉRIAS:
  - WEATHER - Storm, flooding, etc.
  - EMERGENCY - City-wide emergency
  - HOLIDAY - National/local holiday
  - CUSTOM - Admin-defined reason
- [ ] Closures can target:
  - All cities (system-wide)
  - Specific city (Florianópolis, Balneário, Itajaí)
  - Specific neighborhoods (future)
- [ ] Admin can create closure from:
  - Admin dashboard "Create Closure" button
  - Quick action: "Cancel all classes today in [city]"
- [ ] Closure affects:
  - All ATIVO enrollments in target area
  - Schedule generator shows "CLOSURE" status
  - No classes generated for closure dates

**Database:**
```sql
CREATE TABLE system_closures (
  id TEXT PRIMARY KEY,
  closure_type TEXT NOT NULL, -- FERIAS, WEATHER, EMERGENCY, HOLIDAY, CUSTOM
  city_id TEXT, -- NULL = all cities
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

**UI:**
```
┌─────────────────────────────────────────┐
│  Create System Closure                  │
├─────────────────────────────────────────┤
│                                         │
│  Type: [Weather ▼]                      │
│                                         │
│  Affected Area:                         │
│  ○ All cities                           │
│  ● Specific city: [Florianópolis ▼]     │
│                                         │
│  Dates:                                 │
│  From: [2025-01-10] To: [2025-01-10]    │
│                                         │
│  Reason:                                │
│  [Storm warning - heavy rain expected]  │
│                                         │
│  ☑ Notify all affected parents          │
│  ☑ Notify all affected teachers         │
│                                         │
│  [Cancel]              [Create Closure] │
└─────────────────────────────────────────┘
```

---

### Story 7.5: Notification System Foundation

**Priority:** Critical
**Estimate:** 13 points

**Description:**
Build the notification infrastructure that powers all cancellation/change alerts.

**Acceptance Criteria:**
- [ ] Notification service that can:
  - Queue notifications for delivery
  - Track delivery status
  - Support multiple channels (in-app first, WhatsApp later)
- [ ] In-app notifications:
  - Bell icon in nav with unread count
  - Dropdown shows recent notifications
  - Click to see full message
- [ ] Notification types:
  - CLASS_CANCELLED_BY_PARENT
  - CLASS_CANCELLED_BY_TEACHER
  - CLASS_CANCELLED_BY_ADMIN
  - CLASS_CANCELLED_WEATHER
  - CLASS_RESCHEDULED
  - CANCELLATION_APPROVED
  - CANCELLATION_REJECTED
- [ ] Each notification includes:
  - Title (e.g., "Class Cancelled")
  - Message (e.g., "Your Monday 15:00 class has been cancelled due to weather")
  - Link to relevant page
  - Timestamp
  - Read/unread status

**Database:**
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

**Technical Notes:**
- Start with in-app notifications only
- WhatsApp integration in Phase 2 (requires Business API setup)
- Email as fallback (using existing email capability if any)

---

### Story 7.6: Real-Time Cancellation Notifications

**Priority:** Critical
**Estimate:** 8 points

**Description:**
When any cancellation happens, notify all affected parties immediately.

**Acceptance Criteria:**

**Parent cancels:**
- [ ] Teacher receives notification: "[Student] cancelled their class on [Date]"
- [ ] Admin sees in dashboard activity feed

**Teacher cancels (after approval):**
- [ ] Parent receives notification: "Your class on [Date] has been cancelled. [Reason]"
- [ ] Notification includes: "Contact us to reschedule"

**Admin cancels:**
- [ ] Parent receives notification: "Your class on [Date] has been cancelled. [Reason]"
- [ ] Teacher receives notification: "[Student]'s class on [Date] has been cancelled"

**Weather/System closure:**
- [ ] All affected parents receive: "Classes cancelled on [Date] due to [Reason]"
- [ ] All affected teachers receive: "Your classes on [Date] are cancelled due to [Reason]"
- [ ] Notification includes closure reason and any instructions

**Delivery:**
- [ ] In-app notification created immediately
- [ ] Bell icon updates with new count
- [ ] Most important notifications (weather) could trigger email (if configured)

---

### Story 7.7: Makeup Class Tracking

**Priority:** High
**Estimate:** 5 points

**Description:**
Track the relationship between cancelled classes and their makeup classes.

**Acceptance Criteria:**
- [ ] Cancelled classes show "Needs Makeup" indicator
- [ ] When makeup is scheduled, link to original:
  - `makeup_for_date` field on completion
  - `makeup_for_exception_id` field (optional, for precise linking)
- [ ] Teacher schedule shows:
  - Original cancelled slot: "Cancelled - Makeup scheduled for [Date]"
  - Makeup slot: "Makeup class for [Original Date]"
- [ ] Parent view shows:
  - "Cancelled class rescheduled to [New Date]"
- [ ] Admin can see makeup status:
  - "Cancelled - No makeup scheduled"
  - "Cancelled - Makeup on [Date]"
  - "Cancelled - Makeup completed"

---

### Story 7.8: Reschedule Slot Picker

**Priority:** High
**Estimate:** 8 points

**Description:**
Smart slot picker for rescheduling that shows the best available options.

**Acceptance Criteria:**
- [ ] When rescheduling, show available slots organized by:
  1. **This Week** - Teacher's LIVRE slots remaining this week
  2. **Next Week** - Teacher's LIVRE slots next week
  3. **Available Cancellations** - Other students' cancelled slots (same teacher)
- [ ] Each slot shows:
  - Day and time
  - "Regular slot" or "From cancelled class"
- [ ] Slots sorted by proximity to original class time
- [ ] Can't select slots that would create conflicts
- [ ] After selection:
  - Exception created for original date
  - Makeup class/completion entry prepared for new date
  - Both parties notified

**UI:**
```
┌─────────────────────────────────────────┐
│  Reschedule to when?                    │
├─────────────────────────────────────────┤
│                                         │
│  📅 This Week                           │
│  ┌─────────────────────────────────┐    │
│  │ Wed Jan 8 at 14:00              │    │
│  │ Fri Jan 10 at 15:00             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📅 Next Week                           │
│  ┌─────────────────────────────────┐    │
│  │ Mon Jan 13 at 15:00 (same time) │    │
│  │ Wed Jan 15 at 14:00             │    │
│  │ Thu Jan 16 at 10:00             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Cancel]              [Confirm]        │
└─────────────────────────────────────────┘
```

---

## Story Prioritization

### Week 1: Core Cancellation Flows
| Story | Points | Focus |
|-------|--------|-------|
| 7.1 | 8 | Parent cancellation with reschedule option |
| 7.2 | 5 | Teacher cancellation request |
| 7.4 | 8 | System closure types (weather/emergency) |
| **Total** | **21** | |

### Week 2: Notifications & Admin Tools
| Story | Points | Focus |
|-------|--------|-------|
| 7.5 | 13 | Notification system foundation |
| 7.3 | 5 | Admin bulk approval |
| **Total** | **18** | |

### Week 3: Polish & Tracking
| Story | Points | Focus |
|-------|--------|-------|
| 7.6 | 8 | Real-time notifications for all scenarios |
| 7.7 | 5 | Makeup class tracking |
| 7.8 | 8 | Reschedule slot picker |
| **Total** | **21** | |

---

## Success Criteria

| Scenario | Expected Behavior |
|----------|-------------------|
| Parent cancels class | Teacher notified within seconds, slot shows as available for makeup |
| Teacher calls in sick | Admin sees request, approves, parent notified automatically |
| Storm hits Florianópolis | Admin creates weather closure, all 40 affected families notified at once |
| Parent wants to reschedule | See available slots, pick one, both parties notified |
| Admin cancels class | Both teacher and parent notified with reason |

---

## Technical Dependencies

```
Story 7.5 (Notifications) ──────────────────────────────────────►
           │
Story 7.1 ─┴──► Story 7.6 (Real-time notifications)
Story 7.2 ─┴──► Story 7.3 (Bulk approval)
Story 7.4 ─┴──► Story 7.6
           │
Story 7.7 ─┴──► Story 7.8 (Slot picker)
```

---

## Open Questions

1. **WhatsApp timing:** When do we add WhatsApp notifications? (Requires Business API setup)
2. **Email fallback:** Should critical notifications (weather closures) also send email?
3. **Notification preferences:** Should users be able to mute certain notification types?
4. **Reschedule window:** How far in advance can parents reschedule? 2 weeks? 1 month?

---

*Epic created: 2025-12-09*
*Focus: Make scheduling bulletproof before adding advanced features*
