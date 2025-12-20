# Comprehensive Enrollment Rules & Scenarios

**Created:** 2025-12-09
**Source:** Brainstorm sessions (2025-11-28, 2025-12-06), PRD, Architecture docs
**Status:** Reference Document for Implementation

---

## 1. CORE ARCHITECTURE RULES

### Enrollment-First Paradigm
| Rule | Description |
|------|-------------|
| **R1** | Enrollment is the PERSISTENT entity; class instances are EPHEMERAL |
| **R2** | Cancelled class instance ≠ Released slot (slot stays BLOCKED) |
| **R3** | Database is source of truth; Google Calendar is display-only (one-way sync) |
| **R4** | Slots are computed dynamically from enrollments (never stored separately) |

---

## 2. SLOT BOOKING & DOUBLE-BOOKING PREVENTION

### The "Movie Theater Model" (10-Minute Reservation)
```
SLOT STATUS FLOW:
LIVRE → RESERVADO (10 min hold) → BOOKED
         ↓ (timeout)
       LIVRE (released back)

- Admin clicks slot → 10-minute reservation timer starts
- Other admins see: "🔒 Reserved by Maria - 8:42 remaining"
- First click wins (database timestamp is law)
- Prevents concurrent booking conflicts
```

### Conflict Prevention Rules
| Rule | Description |
|------|-------------|
| **R5** | System BLOCKS enrollment creation if slot already BLOCKED |
| **R6** | Slot is BLOCKED when enrollment status = ATIVO or PAUSADO |
| **R7** | Slot becomes LIVRE ONLY when enrollment = INATIVO (terminated) |
| **R8** | AVISO slots stay BLOCKED until day 15 (don't offer to waitlist early) |

---

## 3. ENROLLMENT STATUS LIFECYCLE

### Status Diagram
```
WAITLIST ─────► ATIVO ─────► AVISO ─────► INATIVO
                  │           (14 days)    (permanent)
                  │
                  ├─────► PAUSADO ────────► ATIVO
                  │       (max 3 weeks)     (auto-returns)
                  │
                  └─────► INATIVO
                          (direct cancel)

[FÉRIAS is a TAG, not a status - applied to any status]
```

### Status Transition Rules
| From | To | Rule |
|------|-----|------|
| WAITLIST | ATIVO | When matched to teacher + slot |
| ATIVO | PAUSADO | Parent request (up to 3 weeks free) |
| PAUSADO | ATIVO | Auto-return after 3 weeks OR manual reactivation |
| ATIVO | AVISO | CEO-confirmed notice given (14-day countdown / 2 weeks) |
| AVISO | INATIVO | Auto-terminate after 14 days (2 weeks) |
| AVISO | ATIVO | Reversible anytime during 14 days (CEO confirms) |
| ANY | INATIVO | Direct termination by admin |

---

## 4. PAUSADO RULES (3-Week Policy)

```
Week 1-3: FREE HOLD
├── Slot BLOCKED (held for family)
├── Teacher NOT paid (no class happening)
├── Family NOT charged
└── System tracks: pause_start_date

Week 4+: PAY OR RELEASE
├── Option A: Pay per class to keep slot → Charged weekly
└── Option B: Release slot → INATIVO, slot → LIVRE

NO EXCEPTIONS. 3 weeks max free hold.
```

### PAUSADO Automation
| Day | Action |
|-----|--------|
| Day 18 | Auto-notify: "Your pause ends in 3 days. Choose: pay to hold or release slot" |
| Day 21 | If no response → Admin escalation |
| Day 22+ | Either charging weekly OR slot released |

### PAUSADO Cooldown
| Rule | Description |
|------|-------------|
| **R9** | After auto-return to ATIVO, 5-month cooldown on next PAUSADO |
| **R10** | System BLOCKS PAUSADO requests during cooldown |
| **R11** | Admin can override cooldown with explicit checkbox |

---

## 5. AVISO RULES (14-Day / 2-Week Countdown)

```
"Thinking about stopping" → NOT valid Aviso
├── Schedule call with CEO
└── Status stays ATIVO until confirmed

CONFIRMED Aviso:
├── aviso_date = today
├── end_date = aviso_date + 14 days (2 weeks)
├── Classes CONTINUE for 14 days (charged normally)
├── Slot stays BLOCKED entire time
└── Day 15: Enrollment → INATIVO, slot → LIVRE

14 DAYS (2 WEEKS). NO EXTENSIONS.
```

### AVISO Reversal
| Rule | Description |
|------|-------------|
| **R12** | AVISO reversible ANYTIME during 14 days |
| **R13** | CEO confirms reversal: AVISO → ATIVO |
| **R14** | Slot NEVER offered to waitlist during AVISO period |

---

## 6. FÉRIAS RULES (Seasonal Break)

### Critical: FÉRIAS is a TAG, Not a Status
```
WRONG:  ATIVO → FÉRIAS → ATIVO (status change)
RIGHT:  ATIVO + [FÉRIAS tag] → still ATIVO, just no classes scheduled

All status countdowns CONTINUE during FÉRIAS:
- AVISO countdown: CONTINUES (14 days keeps ticking)
- PAUSADO timer: CONTINUES (3-week limit keeps counting)
- Company still operates (reduced admin hours)
```

### FÉRIAS System Settings
```sql
ferias_start_date: 2025-12-20
ferias_end_date: 2026-01-15
```

### FÉRIAS Edge Cases
| Scenario | Behavior |
|----------|----------|
| Student in AVISO before férias | Countdown CONTINUES, may terminate during break |
| Student in PAUSADO before férias | 3-week timer CONTINUES counting |
| Teacher sick during FÉRIAS | No credit loss (no classes to miss) |

---

## 7. CANCELLATION RULES

### Parent Cancellation
| Reason | Notice Required | Charged? | Makeup? |
|--------|----------------|----------|---------|
| Sickness/Health | 2 hours before | No | Optional |
| Other reasons | 24 hours before | Yes (if late notice) | Optional |
| No-show (no notice) | N/A | Yes | No |

### Teacher Cancellation
| Scenario | Action | Payment | Credits |
|----------|--------|---------|---------|
| Teacher sick (verified) | Cancel classes | NOT paid | **PROTECTED (no penalty)** |
| Cancel same-day (not sick) | Cancel class | NOT paid | -15 credits |
| Cancel single class (not sick) | Cancel that class | NOT paid | -5 credits |
| No-show without notice | Major incident | NOT paid | -20 credits |
| Late arrival (>10 min) | Warning | Paid | -2 credits |

**Key Policy:** When teacher cancels, parents are NEVER charged. Company absorbs the loss.

---

## 8. RESCHEDULING / MAKEUP RULES

### Two Types of Reschedule
| Type | Scope | Process |
|------|-------|---------|
| **Instance Reschedule** | Move ONE class to different time | Find makeup slot, create linked makeup class |
| **Enrollment Reschedule** | Change the WEEKLY recurring slot | Negotiate with parent + teacher, update enrollment permanently |

### Makeup Policy
| Priority | Option |
|----------|--------|
| 1 | Reschedule to different day/time |
| 2 | Extended class (90 min for 2 weeks) |
| 3 | Group: case-by-case (join other group, individual makeup, or credit) |

### AI-Powered Suggestions (Future Feature)
```
When admin looks for makeup slot, system suggests:
1. Teacher's other LIVRE slots that week
2. Cancelled slots from other enrollments (if location works)
3. Slot proximity to teacher's existing route that day
4. Conflict warnings if suggestion affects other families
```

---

## 9. TEACHER AVAILABILITY & VISIBILITY RULES

### Slot Status Visibility
| Slot State | Meaning | Shown To |
|------------|---------|----------|
| **LIVRE** | No active enrollment | Admin, Teacher |
| **BLOCKED** | Active enrollment (ATIVO or PAUSADO) | Admin, Teacher |
| **RESERVED** | 10-min admin hold (movie theater model) | Admin only |
| **CANCELLED (available for makeup)** | Instance cancelled but slot blocked | Admin, Teacher |

### Weekly Grid View Requirements
```
Admin sees for each teacher:
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Monday  │ Tuesday │Wednesday│Thursday │ Friday  │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 08:00   │ LIVRE   │ 🟢      │ LIVRE   │ BLOCKED │
│ 09:00   │ BLOCKED │ Maria   │ BLOCKED │ Pedro   │
│ 10:00   │ Lucas   │ 🟢      │ Sofia   │ 🟢      │
│ ...     │         │         │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┘

🟢 = LIVRE (clickable to create enrollment)
Student name = BLOCKED (click to view enrollment)
🔒 = RESERVED by another admin
```

### Teacher Schedule Requirements
| Requirement | Description |
|-------------|-------------|
| **R15** | Teacher sees only THEIR schedule (not other teachers) |
| **R16** | Teacher sees cancelled slots marked "available for makeup" |
| **R17** | Teacher can suggest makeup time but ADMIN confirms |
| **R18** | Teacher CANNOT directly book or modify slots |

---

## 10. CASCADE & CHANGE MANAGEMENT RULES

### Core Philosophy: "Mover Bears the Burden"
```
- Parent A wants change → We try to accommodate
- If that affects Parent B → Parent B must adapt
- We do NOT cascade to Parent C, D, E...
- No infinite reshuffling

System shows admin: "This change affects 2 other families"
Admin decides: Worth the disruption? Or decline request?
```

### Cascade Limit
| Rule | Description |
|------|-------------|
| **R19** | Cascades stop at 1 level maximum |
| **R20** | Existing students ALWAYS priority over new signups |
| **R21** | System shows impact before admin confirms change |

---

## 11. TRAVEL TIME & GEOGRAPHIC RULES

### Teacher Travel Preferences (Per-Teacher, Flexible)
| Preference | Value | Notes |
|-----------|-------|-------|
| Max travel FROM home to first area | 15-45 min | Teacher-specific |
| Preferred travel BETWEEN classes | 5-15 min ideal, up to 25 min ok | Depends on clustering |
| Would travel 45 min if... | 3+ classes clustered in that area | ROI-based |

### Dynamic Buffer Concept
```
Instead of fixed 15-min buffer:
- Same neighborhood → 5 min buffer
- Adjacent neighborhoods → 15 min buffer
- Different zones → 25-30 min buffer
- Calculated ONCE at booking time (not daily)
```

### Zone Matrix Strategy (API Cost Optimization)
| Level | Method | When to Use | Cost |
|-------|--------|-------------|------|
| 1 | Database lookup | Filter by neighborhood/zone | FREE |
| 2 | Zone matrix | Pre-calculated zone-to-zone times | FREE |
| 3 | Geocoding | New addresses only | $5/1000 |
| 4 | Distance Matrix | Final booking verification only | $10/1000 |

---

## 12. GROUP CLASS RULES

### Pricing
| Class Type | Parent Pays | Teacher Gets |
|------------|-------------|--------------|
| Individual | R$150 | R$95 (Platinum) |
| Group (2+) | R$120/each | R$70/student |

### Degradation Policy
| Students | Status | Parent Price |
|----------|--------|--------------|
| 3+ students | Group class | R$120/student |
| 2 students | Still group | R$120/student |
| 1 student | Converts to individual | R$150 |

### Per-Class Reality Pricing
```
Each class invoiced based on WHO ATTENDED that day:
- 3 students attend → R$120 each
- 2 students attend → R$120 each
- 1 student attends → R$150
- No averaging, no waiting for month end
- Price change notification sent proactively
```

---

## 13. WAITLIST MANAGEMENT RULES

### Priority System
| Factor | Weight |
|--------|--------|
| waitlist_date | First come, first served |
| Location match | Geographic proximity |
| Schedule match | Available times |
| Language preference | Portuguese/English |

### Offer Process
| Day | Action |
|-----|--------|
| Day 0 | Send offer (WhatsApp primary, email backup) |
| Day 1-3 | Follow-up attempts |
| Day 4-6 | Final attempts with deadline |
| Day 7 | Offer expires |

### Ghost Handling
| Duration | Penalty |
|----------|---------|
| 1 week no response | Bottom of list for THAT SLOT (stay top for others) |
| 2 weeks no response | Bottom of GENERAL waitlist |
| Flag | Mark as "unresponsive" |

---

## 14. RELOCATION RULES

### Teacher Moves (30-Day Notice Required)
```
1. Teacher submits new address + move date
2. System calculates: Which students now OUT OF RANGE?
3. Admin gets report: "8 of 12 students affected"
4. For each affected student:
   - Try to find another teacher in student's area
   - If found → Transfer enrollment
   - If not found → Parent chooses: Waitlist or INATIVO
```

### Student Moves (Notice Required or Pay)
```
1. Can current teacher still reach them?
2. Does teacher have OTHER students in new area? (cluster check)
3. Can we RESCHEDULE to fit teacher's "area day"?
4. If all fail → Find other teacher or Waitlist/INATIVO

No Notice = Pay: If parent moves without telling us,
they pay for classes until formal notice given.
```

---

## 15. COMMUNICATION RULES

### Teacher-Parent Separation
```
Teachers ←✕→ Parents (NO direct contact)

CORRECT:
Parent ←→ Admin/Company ←→ Teacher

Why:
├── Teacher protection (no 9pm messages)
├── Company protection (no side deals)
├── Audit trail for issues
└── Contract enforcement
```

### Hybrid Communication System
| Channel | Use For |
|---------|---------|
| **WhatsApp** | Same-day cancellations, "Running 5 min late", Quick confirmations |
| **Portal/System** | Schedule viewing, Invoice history, AVISO/PAUSADO requests, All auditable actions |

---

## 16. CRISIS TRIAGE ORDER

```
🔴 CRITICAL - Same Day
1. REBOOKING orphaned students (communicate first!)
2. FIX DATA BUGS (double-bookings)

🟡 URGENT - Within 48 Hours
3. PAUSADO OVERDUE (past 3 weeks)
4. AVISO COMPLETED (process termination)

🟢 IMPORTANT - This Week
5. WAITLIST OFFERS (after dust settles)
```

---

## 17. TEACHER CREDIT SYSTEM (Future - Phase 2+)

### Credit Tiers (with Pay Rates)
| Tier | Credits | Pay/Class | Status |
|------|---------|-----------|--------|
| Bronze | 0-149 | R$79 | New teacher starting rate |
| Silver | 150-299 | R$87 | Progressing |
| Gold | 300-599 | R$91 | Established |
| Platinum | 600+ | R$95 | Master (current rate for existing teachers) |

### Credit Earning
| Action | Credits |
|--------|---------|
| Sign contract (onboarding) | +100 |
| Complete a class | +1 |
| Complete 6-month report card on time | +10 |
| Perfect week (no cancels, on-time) | +5 BONUS |
| 5-star progress rating from parent | +3 |
| Accept difficult schedule | +2 |

### Credit Losing (Unprofessional Behavior Only)
| Action | Credits | Notes |
|--------|---------|-------|
| **Sick (verified)** | +0 | **PROTECTED - no penalty** |
| Cancel same-day (not sick) | -15 | Unprofessional |
| Late arrival (>10 min) | -2 | Unprofessional |
| No-show without notice | -20 | Seriously unprofessional |
| Late report card | -5/week | Missed deadline |

---

## 18. IMPLEMENTATION STATUS

**Last Updated:** 2025-12-17

### ✅ Fully Implemented

- [x] Enrollment CRUD operations
- [x] Status machine (ATIVO, PAUSADO, AVISO, INATIVO transitions)
- [x] Slot availability computation (LIVRE/BLOCKED)
- [x] PAUSADO automation (lazy evaluation on access)
- [x] PAUSADO cooldown (5-month block after return to ATIVO)
- [x] AVISO status with 15-day countdown
- [x] Admin enrollments page with grid/list/month/day views
- [x] Group class dynamic pricing (R$120 group / R$150 individual)
- [x] Individual status changes within groups
- [x] Per-class reality pricing on invoices
- [x] System closures (HOLIDAY, WEATHER, EMERGENCY, CUSTOM)
- [x] Teacher time-off requests (VACATION, SICK, PERSONAL)
- [x] Teacher cancellation request flow (requires admin approval)
- [x] Parent cancellation with reschedule option
- [x] Admin bulk cancellation approval
- [x] Travel time calculation and caching
- [x] Waitlist lead matching with suggestions
- [x] Double-booking prevention (recurring + reschedule conflicts)
- [x] Slot type classification (LIVRE vs MAKEUP_ONLY)

### 🚧 Partially Implemented / Needs Testing

- [ ] FÉRIAS as a tag (system-wide) - closures exist but FÉRIAS tag not separate
- [ ] PAUSADO 3-week timer notifications (Day 18, 21 alerts)
- [ ] Waitlist offer workflow (7-day expiration, ghost handling)
- [ ] Makeup slot suggestions (AI-powered)

### ❌ Not Yet Implemented

- [ ] Movie theater reservation model (10-min holds for concurrent admins)
- [ ] Zone matrix for travel optimization (pre-calculated zone-to-zone)
- [ ] Teacher credit gamification system
- [ ] Cascade impact preview ("This change affects 2 families")
- [ ] Relocation impact analysis (teacher/student moves)

---

## 19. TESTING CHECKLIST

### Status Changes (Individual)

| Test | Expected | Status |
|------|----------|--------|
| Change ATIVO → PAUSADO | Slot stays BLOCKED, cooldown starts | ⬜ |
| Change PAUSADO → ATIVO (before 3 weeks) | Manual return, cooldown set | ⬜ |
| Change PAUSADO → ATIVO (after 3 weeks) | Auto-return, 5-month cooldown | ⬜ |
| Change ATIVO → AVISO | 15-day countdown starts, slot BLOCKED | ⬜ |
| Change AVISO → ATIVO | Countdown cancelled, stays BLOCKED | ⬜ |
| AVISO expires (day 16) | Auto → INATIVO, slot → LIVRE | ⬜ |
| Change ANY → INATIVO | Slot becomes LIVRE | ⬜ |
| PAUSADO during cooldown | Should be BLOCKED by system | ⬜ |
| Admin override cooldown | Should allow PAUSADO | ⬜ |

### Status Changes (Group)

| Test | Expected | Status |
|------|----------|--------|
| Select multiple students, change status | Batch update works | ⬜ |
| One student PAUSADO in group | Group shows "Multiple" tag | ⬜ |
| Rate preview before status change | Shows R$120 → R$150 impact | ⬜ |
| Group degrades to 1 active | Invoice shows R$150 | ⬜ |

### Slot Booking

| Test | Expected | Status |
|------|----------|--------|
| Click LIVRE slot | Opens booking modal | ⬜ |
| Create enrollment on LIVRE | Slot becomes BLOCKED | ⬜ |
| Create enrollment on BLOCKED | Should be REJECTED | ⬜ |
| Create enrollment conflicting with reschedule | Should be REJECTED | ⬜ |
| Cancelled class slot | Shows as MAKEUP_ONLY, not LIVRE | ⬜ |

### Cancellations & Reschedules

| Test | Expected | Status |
|------|----------|--------|
| Parent cancels (with reschedule) | Exception created, shows makeup slots | ⬜ |
| Parent cancels (no reschedule) | Exception created, slot stays BLOCKED | ⬜ |
| Teacher requests cancellation | Goes to pending approval | ⬜ |
| Admin approves teacher cancellation | Exception approved | ⬜ |
| Admin rejects teacher cancellation | Exception removed | ⬜ |
| Bulk approve sick days | All sick requests approved | ⬜ |

### Views & Display

| Test | Expected | Status |
|------|----------|--------|
| Week view shows correct statuses | Colors match ATIVO/PAUSADO/AVISO | ⬜ |
| Month view past days | Muted appearance | ⬜ |
| Month view exception badges | Visible at 11px size | ⬜ |
| Day view gap indicator | Shows buffer time between classes | ⬜ |
| Day view travel time | Shows driving minutes | ⬜ |
| Suggestions panel | Shows up to 5 waitlist matches | ⬜ |
| Auto-select preselected lead | Scrolls to and selects match | ⬜ |
| Cooldown info in sidebar | Shows when PAUSADO blocked | ⬜ |

### Navigation & Access

| Test | Expected | Status |
|------|----------|--------|
| Admin → Settings → Data Warnings | Link works | ⬜ |
| Travel errors page loads | Shows data quality issues | ⬜ |

---

## References

- `docs/archive/brainstorm-session-2025-11-28.md` - Original brainstorm
- `eduschedule-app/docs/analysis/brainstorming-session-2025-12-06.md` - Stress-test session
- `docs/planning/prd.md` - Product Requirements Document
- `docs/architecture.md` - Technical Architecture
