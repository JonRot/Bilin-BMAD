# Epic 6: Advanced Enrollment Features

**Status:** partially-complete
**Priority:** Phase 2 (Post-MVP)
**Dependencies:** Epic 2 (Enrollment Management), Epic 3 (Schedule & Class Instances)
**Reference:** `docs/planning/enrollment-rules-comprehensive.md`
**Last Updated:** 2026-01-01

---

## Epic Overview

This epic implements the advanced enrollment features identified in brainstorming sessions but deferred from MVP. These features enhance the enrollment system with sophisticated business rules, automation, and optimization capabilities.

**Business Value:**
- Prevent double-bookings with concurrent admin protection
- Automate AVISO/FÉRIAS lifecycle management
- Optimize teacher routing and reduce API costs
- Enable AI-assisted scheduling decisions
- Support group class pricing complexity

---

## Stories

### Story 6.1: Movie Theater Slot Reservation System ✅ COMPLETE

**Priority:** High
**Estimate:** 8 points
**Dependencies:** None
**Status:** ✅ Implemented in MVP

**Implementation:**
- `src/lib/services/slot-reservation-service.ts` - Full 5-min reservation logic
- `src/lib/repositories/d1/slot-reservation.ts` - Database layer
- `src/pages/api/slots/reserve.ts` - API endpoint
- `RESERVATION_DURATION_SECONDS = 300` (5 minutes)

**Description:**
Implement 5-minute slot reservation to prevent concurrent admin double-booking.

**Acceptance Criteria:**
- [ ] When admin clicks a LIVRE slot, it becomes RESERVADO for 5 minutes
- [ ] Other admins see "🔒 Reserved by [Name] - X:XX remaining"
- [ ] First click wins (database timestamp is law)
- [ ] After 5 minutes without booking, slot auto-releases to LIVRE
- [ ] Admin can manually release their reservation
- [ ] Reservation persists across page refreshes (stored in DB)

**Technical Notes:**
```sql
CREATE TABLE slot_reservations (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  reserved_by_user_id TEXT NOT NULL,
  reserved_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT DEFAULT 'reserved' -- reserved, booked, expired
);
```

**Rules Reference:** R5-R8, Section 2

---

### Story 6.2: AVISO Status with 14-Day Countdown ✅ COMPLETE

**Priority:** High
**Estimate:** 8 points
**Dependencies:** Story 2.2 (Status Machine)
**Status:** ✅ Implemented in MVP (14 days per business rules)

**Implementation:**
- `src/lib/services/aviso-automator.ts` - Auto-transition logic
- `src/lib/services/status-machine.ts` - `isAvisoExpired()`, `getAvisoDaysRemaining()`, `calculateAvisoExpiry()`
- `AVISO_MAX_DAYS = 14` in constants
- Lazy evaluation on enrollment access

**Description:**
Implement AVISO status with automatic 14-day countdown and termination.

**Acceptance Criteria:**
- [ ] Admin can set enrollment to AVISO status
- [ ] System requires "CEO Confirmed" checkbox to activate AVISO
- [ ] System calculates and displays end_date (aviso_date + 15 days)
- [ ] Countdown badge shows "X days remaining" on enrollment
- [ ] Classes CONTINUE during AVISO (charged normally)
- [ ] Slot stays BLOCKED during entire AVISO period
- [ ] Day 16: System auto-transitions to INATIVO
- [ ] Admin can reverse AVISO → ATIVO anytime during 15 days
- [ ] Slot NOT offered to waitlist until after day 16

**UI Requirements:**
- AVISO badge with countdown: "AVISO - 12 days remaining"
- Reversal button: "Cancel AVISO (Return to ATIVO)"
- Confirmation modal for reversal

**Rules Reference:** R12-R14, Section 5

---

### Story 6.3: FÉRIAS Tag System ✅ COMPLETE (Extended to Full Closures)

**Priority:** High
**Estimate:** 5 points
**Dependencies:** None
**Status:** ✅ Implemented in MVP - Extended to full closure system

**Implementation:**
- `src/pages/admin/closures.astro` - Full admin UI
- `src/pages/api/system/closures.ts` - API endpoints
- `src/lib/repositories/d1/closure.ts` - Database layer
- `src/lib/validation/closure.ts` - Zod schemas
- Closure types: FERIAS, HOLIDAY, WEATHER, EMERGENCY, CUSTOM
- City-specific targeting support

**Description:**
Implement FÉRIAS as a system-wide tag (not status) that affects class generation.

**Acceptance Criteria:**
- [ ] Admin can set system-wide FÉRIAS dates (start/end)
- [ ] FÉRIAS is a TAG applied to all enrollments, not a status change
- [ ] All status countdowns CONTINUE during FÉRIAS (AVISO, PAUSADO timers keep ticking)
- [ ] No classes generated during FÉRIAS period
- [ ] Schedule generator respects FÉRIAS dates
- [ ] Enrollments show "FÉRIAS" indicator during active period
- [ ] System sends auto-notification: "Classes resume [date]"

**Technical Notes:**
```sql
-- System settings table
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
-- Keys: ferias_start_date, ferias_end_date
```

**Edge Cases:**
- Student in AVISO before FÉRIAS → Countdown continues, may terminate during break
- Student in PAUSADO before FÉRIAS → 3-week timer continues counting

**Rules Reference:** Section 6

---

### Story 6.4: Enhanced PAUSADO Automation ✅ COMPLETE

**Priority:** Medium
**Estimate:** 8 points
**Dependencies:** Story 2.4 (PAUSADO Automator)
**Status:** ✅ Implemented (Session 117)

**Implemented:**
- `src/lib/services/pausado-automator.ts` - 21-day auto-transition
- `pausado_cooldown_until` field - 30-day cooldown enforcement
- `src/pages/api/parent/pausado-request.ts` - Parent pause requests
- `src/pages/admin/pausado-approvals.astro` - Admin approval queue
- Day 18 reminder notification (PAUSADO_EXPIRING)
- Admin escalation notification after day 21 (PAUSADO_EXPIRED)
- PAUSADO OVERDUE badge on admin dashboard (clickable)

**Deferred to Phase 3:**
- "Pay to Hold" option (requires payment integration)

**Description:**
Enhance PAUSADO with notifications, escalation, and paid-hold option.

**Acceptance Criteria:**
- [ ] Day 18: Auto-send notification "Your pause ends in 3 days"
- [ ] Notification includes options: "Pay to hold" or "Release slot"
- [ ] Day 21: If no response → Admin escalation notification
- [ ] Day 22+: Admin can either start charging weekly OR release slot
- [ ] "Pay to Hold" option creates weekly charge until reactivation
- [ ] Release converts to INATIVO immediately
- [ ] Dashboard shows "PAUSADO OVERDUE" badge after day 21

**UI Requirements:**
- Parent notification (WhatsApp template + in-app)
- Admin escalation queue for overdue PAUSADO
- "Extend with Payment" vs "Release Slot" action buttons

**Rules Reference:** Section 4

---

### Story 6.5: Cascade Impact Preview

**Priority:** Medium
**Estimate:** 5 points
**Dependencies:** None

**Description:**
Show admin the impact of schedule changes before confirming.

**Acceptance Criteria:**
- [ ] When admin attempts enrollment reschedule, show affected parties
- [ ] Display: "This change affects X other families"
- [ ] List affected enrollments with details
- [ ] Admin must acknowledge impact before confirming
- [ ] Cascades limited to 1 level (existing students only)
- [ ] Existing students ALWAYS priority over new signups

**UI Requirements:**
- Impact preview modal before confirmation
- List of affected enrollments
- "Proceed Anyway" vs "Cancel" buttons

**Rules Reference:** R19-R21, Section 10

---

### Story 6.6: Zone Matrix for Travel Optimization

**Priority:** Medium
**Estimate:** 13 points
**Dependencies:** None

**Description:**
Implement zone-based travel time matrix to minimize Google API costs.

**Acceptance Criteria:**
- [ ] Define ~25-30 zones for Florianópolis
- [ ] Pre-calculate zone-to-zone travel times (one-time API calls)
- [ ] Store in `zone_travel_matrix` table
- [ ] Use zone lookup for initial filtering (FREE)
- [ ] Only call Distance Matrix API for final booking verification
- [ ] Dynamic buffer: same zone = 5min, adjacent = 15min, different = 25min

**Technical Notes:**
```sql
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city_id TEXT NOT NULL,
  polygon TEXT -- GeoJSON for boundary
);

CREATE TABLE zone_travel_matrix (
  from_zone_id TEXT NOT NULL,
  to_zone_id TEXT NOT NULL,
  avg_travel_minutes INTEGER NOT NULL,
  calculated_at INTEGER NOT NULL,
  PRIMARY KEY (from_zone_id, to_zone_id)
);
```

**Cost Savings:** Estimated < $1/month after initial $9 setup

**Rules Reference:** Section 11

---

### Story 6.7: AI-Powered Rescheduling Suggestions

**Priority:** Low
**Estimate:** 13 points
**Dependencies:** Story 6.6 (Zone Matrix)

**Description:**
Suggest optimal makeup slots when admin reschedules a class.

**Acceptance Criteria:**
- [ ] When admin opens reschedule modal, show AI suggestions
- [ ] Rank suggestions by: travel efficiency, teacher availability, parent preference
- [ ] Show teacher's LIVRE slots for that week
- [ ] Highlight slots near teacher's existing route that day
- [ ] Show cancelled slots from other enrollments (if location works)
- [ ] Display conflict warnings if suggestion affects others
- [ ] Admin can accept suggestion or choose manually

**Suggestion Algorithm:**
1. Find all LIVRE slots for teacher this week
2. Score by: same day as other classes (+10), same zone (+5), parent's preferred times (+3)
3. Sort by score, show top 5

**Rules Reference:** Section 8

---

### Story 6.8: Group Class Dynamic Pricing

**Priority:** Low
**Estimate:** 8 points
**Dependencies:** None

**Description:**
Implement per-class pricing based on actual attendance for group classes.

**Acceptance Criteria:**
- [ ] Track `actual_attendees` on each class instance
- [ ] Calculate `price_charged` based on attendance:
  - 3+ students → R$120/each
  - 2 students → R$120/each
  - 1 student → R$150 (individual rate)
- [ ] Auto-notify parent when price changes due to attendance
- [ ] Invoice reflects actual per-class pricing (no averaging)
- [ ] Group enrollment shows "Group" badge with current member count

**Degradation Flow:**
- When group drops to 1 student, notify remaining family
- Family can accept individual pricing or request different arrangement
- If paused student returns, check compatibility and potentially rejoin group

**Rules Reference:** Section 12

---

### Story 6.9: Waitlist Auto-Matching

**Priority:** Medium
**Estimate:** 8 points
**Dependencies:** Story 6.6 (Zone Matrix)

**Description:**
Automatically suggest best matches when slots become available.

**Acceptance Criteria:**
- [ ] When slot becomes LIVRE, system checks waitlist
- [ ] Score matches by: waitlist_date, location proximity, schedule match, language
- [ ] Show admin ranked suggestions: "Best matches for this slot"
- [ ] Include match score breakdown (why this family ranked high)
- [ ] One-click to send offer to family
- [ ] Track offer status: pending, accepted, declined, expired
- [ ] Ghost handling: 1 week no response → bottom for that slot

**Offer Flow:**
- Day 0: Send offer (WhatsApp + email)
- Day 1-3: Follow-up attempts
- Day 4-6: Final attempts with deadline
- Day 7: Offer expires, move to next match

**Rules Reference:** Section 13

---

### Story 6.10: Teacher Credit Gamification 🟡 PARTIALLY COMPLETE

**Priority:** Low
**Estimate:** 13 points
**Dependencies:** None
**Status:** 🟡 Foundation implemented, tracking remaining

**Implemented:**
- `src/lib/services/teacher-credits.ts` - Tier system and rate calculation
- Tiers: NEW (R$79), STANDARD (R$85), PREMIUM (R$90), ELITE (R$95)
- `getTierFromScore()`, `getRatesForTier()`, `calculateTotalEarnings()`
- Grandfathered existing teachers at ELITE tier (score: 950)
- Score event types defined (CLASS_COMPLETED, PUNCTUALITY_BONUS, etc.)

**Remaining:**
- Credit history table and tracking
- Event-triggered score updates
- Teacher dashboard with tier/progress display
- Leaderboards

**Description:**
Implement teacher credit system with tiers and pay rates.

**Acceptance Criteria:**
- [ ] Track credit balance per teacher
- [ ] Credit earning: class completion (+1), report card (+10), perfect week (+5), 5-star rating (+3)
- [ ] Credit losing: same-day cancel (-15), late arrival (-2), no-show (-20)
- [ ] Sick days are PROTECTED (no penalty, just missed earnings)
- [ ] Tiers: Bronze (0-149), Silver (150-299), Gold (300-599), Platinum (600+)
- [ ] Pay rates per tier: R$79, R$87, R$91, R$95
- [ ] Grandfather existing teachers at Platinum
- [ ] Monthly tier evaluation (drop below threshold → demote next month)
- [ ] Leaderboards: Most Classes, Highest Ratings, Most Reliable

**UI Requirements:**
- Teacher dashboard shows credit balance and tier
- Progress bar to next tier
- Leaderboard page
- Credit history log

**Rules Reference:** Section 17

---

### Story 6.11: Relocation Impact Analysis

**Priority:** Low
**Estimate:** 5 points
**Dependencies:** Story 6.6 (Zone Matrix)

**Description:**
Analyze impact when teacher or student moves to new location.

**Acceptance Criteria:**
- [ ] Teacher move: Calculate which students now OUT OF RANGE
- [ ] Generate report: "8 of 12 students affected"
- [ ] For each affected: suggest transfer to another teacher OR waitlist
- [ ] Student move: Check if current teacher can still reach them
- [ ] Check if teacher has cluster in new area (could reschedule)
- [ ] If all fail → Find other teacher or Waitlist/INATIVO
- [ ] 30-day notice required for teacher moves

**Rules Reference:** Section 14

---

## Implementation Status Summary

| Story | Status | Notes |
|-------|--------|-------|
| 6.1 Movie Theater Reservation | ✅ COMPLETE | 5-min slot reservation system |
| 6.2 AVISO Countdown | ✅ COMPLETE | 14-day auto-transition |
| 6.3 FÉRIAS/Closures | ✅ COMPLETE | Extended to full closure system |
| 6.4 Enhanced PAUSADO | ✅ COMPLETE | Day 18 reminder + admin escalation + dashboard badge + notifications |
| 6.5 Cascade Impact | ⬜ NOT STARTED | |
| 6.6 Zone Matrix | ⬜ NOT STARTED | |
| 6.7 AI Rescheduling | ⬜ NOT STARTED | |
| 6.8 Group Pricing | ⬜ NOT STARTED | |
| 6.9 Waitlist Auto-Match | ⬜ NOT STARTED | |
| 6.10 Teacher Credits | 🟡 PARTIAL | Tier/rate system done, tracking pending |
| 6.11 Relocation Analysis | ⬜ NOT STARTED | |

## Remaining Story Prioritization

### Phase 2A (Next Sprint)
| Story | Points | Priority | Notes |
|-------|--------|----------|-------|
| 6.4 Enhanced PAUSADO (remaining) | 3 | Medium | Just notifications |
| 6.5 Cascade Impact | 5 | Medium | |
| **Total** | **8** | | |

### Phase 2B (Following Sprint)
| Story | Points | Priority |
|-------|--------|----------|
| 6.9 Waitlist Auto-Match | 8 | Medium |
| 6.10 Teacher Credits (remaining) | 5 | Low |
| **Total** | **13** | |

### Phase 2C (Future)
| Story | Points | Priority |
|-------|--------|----------|
| 6.6 Zone Matrix | 13 | Medium |
| 6.7 AI Rescheduling | 13 | Low |
| 6.8 Group Pricing | 8 | Low |
| 6.11 Relocation Analysis | 5 | Low |
| **Total** | **39** | |

---

## Technical Dependencies

```
Story 6.1 (Reservation) ──────────────────────────────────────►
Story 6.2 (AVISO) ────────────────────────────────────────────►
Story 6.3 (FÉRIAS) ───────────────────────────────────────────►
Story 6.4 (PAUSADO+) ─────────────────────────────────────────►
Story 6.5 (Cascade) ──────────────────────────────────────────►
Story 6.6 (Zone Matrix) ──┬───────────────────────────────────►
                          │
Story 6.7 (AI Reschedule) ┴───────────────────────────────────►
Story 6.8 (Group Pricing) ────────────────────────────────────►
Story 6.9 (Waitlist) ─────┬───────────────────────────────────►
                          │
Story 6.10 (Credits) ─────┴───────────────────────────────────►
Story 6.11 (Relocation) ──────────────────────────────────────►
```

---

## Success Metrics

| Metric | Current | Phase 2A Target | Phase 2C Target |
|--------|---------|-----------------|-----------------|
| Double-bookings/month | 0 (manual) | 0 (automated) | 0 (automated) |
| AVISO processing time | Manual | Automated | Automated |
| Google API cost/month | ~$10 | ~$5 | < $1 |
| Waitlist offer time | Hours | Minutes | Minutes |
| Admin coordination hours | 15-20 | 10-12 | 5-8 |

---

## Open Questions

1. **PAUSADO paid-hold pricing:** What rate for "pay to keep slot"? Same as class rate or discounted?
2. **Zone boundaries:** Need to define exact zone polygons for Florianópolis
3. **Credit system launch:** Grandfather all existing teachers or just long-term?
4. **WhatsApp integration:** Use official API or continue manual for Phase 2?

---

*Epic created: 2025-12-09*
*Reference: docs/planning/enrollment-rules-comprehensive.md*
