# Brainstorming Session: Enrollment System Design Stress-Test
**Date:** 2025-12-06
**Facilitator:** Mary (Business Analyst)
**Participant:** Jonathan Rotert (CEO)
**Status:** All 4 Phases Complete ✅

---

## Session Overview

**Topic:** Enrollment-Based Scheduling System with Geographic/Travel Time Optimization

**Goals:**
- Break the proposed design with edge cases before implementation
- Validate data model handles all real-world scenarios
- Future-proof for Phase 2/3 features (group classes, make-up policies, material tracking)
- Solve travel time/radius complexity
- Optimize Google API costs
- Design Google Calendar sync strategy

**Approach:** AI-Recommended 4-Phase Adversarial System Design

**Techniques Selected:**
1. Phase 1: Constraint Mapping + Assumption Reversal ✅ COMPLETE
2. Phase 2: Chaos Engineering + Anti-Solution ✅ COMPLETE
3. Phase 3: Role Playing + Six Thinking Hats ✅ COMPLETE
4. Phase 4: First Principles + Morphological Analysis ✅ COMPLETE

---

## Phase 1: Constraint Mapping + Assumption Reversal

### Core Concept: Enrollment-Based Scheduling

The fundamental insight driving this design:

> **Enrollment** is the persistent relationship between a student and teacher for a specific weekly time slot. Individual class instances can be cancelled, rescheduled, or missed - but the enrollment (and the slot) remains "booked" until explicitly terminated.

This solves the problem where cancelled/rescheduled classes incorrectly showed as "LIVRE" (available) when the slot was actually still reserved for that student.

---

## 1. Enrollment Status Lifecycle

### Complete Status Diagram

```
WAITLIST ─────► ATIVO ─────► AVISO ─────► INATIVO
                  │           (15 days)    (permanent)
                  │
                  ├─────► PAUSADO ────────► ATIVO
                  │       (max 3 weeks free,  (resumes)
                  │        then pay or release)
                  │
                  ├─────► FÉRIAS ─────────► ATIVO
                  │       (company-wide,      (auto-resume)
                  │        dates set yearly)
                  │
                  └─────► INATIVO
                          (direct cancel)
```

### Status Definitions

| Status | Meaning | Slot State | Duration/Rules |
|--------|---------|------------|----------------|
| **WAITLIST** | Wants classes, no teacher/slot yet | N/A | Until matched |
| **ATIVO** | Active student taking classes | BLOCKED | Ongoing |
| **PAUSADO** | Temporary break | HELD (3 weeks free) | After 3 weeks: pay or release |
| **FÉRIAS** ⚠️ | **TAG, not status** - see Phase 2 correction | All statuses continue | Dates set by admin yearly |
| **AVISO** | Notice given, planning to stop | Still BLOCKED | 15-day countdown, then terminates |
| **INATIVO** | No longer a student | RELEASED (LIVRE) | Permanent |

---

## 2. Business Rules - Cancellation & Rescheduling

### Parent Cancellation Rules

| Reason | Notice Required | Charged? | Makeup? |
|--------|----------------|----------|---------|
| Sickness/Health | 2 hours before class | No | Optional |
| Other reasons | 24 hours before class | Yes (if late notice) | Optional |
| No-show (no notice) | N/A | Yes | No |

### Teacher Cancellation Rules

| Scenario | Action | Payment | Credits |
|----------|--------|---------|---------|
| Teacher sick (full day) | Cancel ALL classes that day | Teacher NOT paid | -15 credits (capped) |
| Teacher cancels single class | Cancel that class | Teacher NOT paid | -5 credits |

**Key Policy:** When teacher cancels, parents are NEVER charged. Company absorbs the loss.

**Notifications:** Admin manually contacts each affected parent (no auto-notification for teacher cancellations).

**Makeup Policy:** If teacher has available slots, attempt reschedule. If not, class is cancelled without makeup.

### Two Types of Reschedule

| Type | Scope | Process |
|------|-------|---------|
| **Instance Reschedule** | Move ONE class to different time | Find makeup slot, create linked makeup class |
| **Enrollment Reschedule** | Change the WEEKLY recurring slot | Negotiate with parent + teacher, update enrollment permanently |

---

## 3. PAUSADO Policy (3-Week Rule)

```
Week 1-3: FREE HOLD
├── Slot held for family
├── Teacher not paid (no class happening)
├── No charge to family
└── System tracks: pause_start_date

Week 4+: PAID HOLD OR RELEASE
├── Option A: Pay per class to keep slot → Charged weekly
└── Option B: Release slot → Enrollment TERMINATED, slot becomes LIVRE

NO EXCEPTIONS. 3 weeks max free hold.
```

**System Automations:**
- Day 18: Auto-notify parent "Your pause ends in 3 days. Choose: pay to hold or release slot"
- Day 21: If no response → Admin escalation
- Day 22+: Either charging weekly OR slot released

---

## 4. AVISO Policy (15-Day Countdown)

```
"Thinking about stopping" → NOT valid Aviso
├── Schedule call with CEO (Damaris)
└── Status stays ATIVO until confirmed

CONFIRMED Aviso:
├── aviso_date = today
├── end_date = aviso_date + 15 days
├── Classes continue for 15 days (charged normally)
└── Day 16: Enrollment → TERMINATED, slot → LIVRE

15 DAYS. NO EXTENSIONS.
```

**Requirements:**
- Aviso must be confirmed by CEO
- System tracks: `confirmed_by_ceo: true`, `aviso_confirmed_date`
- Auto-calculate `enrollment_end_date`

---

## 5. FÉRIAS (Seasonal Break) Policy

### ⚠️ PHASE 2 CORRECTION: FÉRIAS is a TAG, Not a Status

```
WRONG:  ATIVO → FÉRIAS → ATIVO (status change)
RIGHT:  ATIVO + [FÉRIAS tag] → still ATIVO, just no classes scheduled

All statuses continue their logic during FÉRIAS:
- AVISO countdown: CONTINUES (15 days keeps ticking)
- PAUSADO timer: CONTINUES (3-week limit keeps counting)
- Company still operates (reduced admin hours)
```

**Different from regular PAUSADO:**
- Company-wide break (not individual choice)
- Dates set by admin each year
- No classes scheduled during this period
- No charges during break
- Company still runs: moves processed, waitlist managed, events planned

**System Settings (set annually):**
```
ferias_start_date: 2025-12-20
ferias_end_date: 2026-01-15
```

**Automatic Behavior:**
- System adds FÉRIAS tag to all enrollments
- Classes not scheduled during period
- Auto-send to all parents: "Classes resume [date] at [time]"

**Edge Cases:**
- Student in AVISO before férias → Countdown CONTINUES, may terminate during break
- Student in PAUSADO before férias → 3-week timer CONTINUES counting
- Teacher sick during FÉRIAS → No credit loss (no classes to miss)

---

## 6. Teacher Credit System (Gamification)

### ⚠️ PHASE 3 CORRECTION: Credit System Restructured

**Key Principle:** Sickness is PROTECTED (no penalty). Unprofessional behavior is PENALIZED.

### Credit Tiers (with Pay Rates)

| Tier | Credits | Pay/Class | Status |
|------|---------|-----------|--------|
| 🥉 Bronze | 0-149 | R$79 | New teacher starting rate |
| 🥈 Silver | 150-299 | R$87 | Progressing |
| 🥇 Gold | 300-599 | R$91 | Established |
| 💎 Platinum | 600+ | R$95 | Master (current rate for existing teachers) |

**Grandfathering:** Existing long-term teachers start at Platinum (600+ credits).

**Tier Changes:** Evaluated monthly. Drop below threshold → demote next month.

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
| **Sick (verified)** | +0 | **PROTECTED - no penalty, just miss earnings** |
| Cancel same-day (not sick) | -15 | Unprofessional |
| Late arrival (>10 min) | -2 | Unprofessional |
| No-show without notice | -20 | Seriously unprofessional |
| Late report card | -5/week | Missed deadline |

### Report Card Quality Control

| Score | Result |
|-------|--------|
| 0-2 (Low quality) | Rejected, must redo, NO credits |
| 3-5 (Acceptable+) | Approved, credits awarded |

**Review Process (Scalable):**
- Layer 1: AI reads and scores all report cards
- Layer 2: City owner/franchise reviews flagged reports
- Layer 3: CEO sees aggregate metrics only

### Leaderboards & Categories
- Most Classes Completed (monthly)
- Highest Parent Ratings
- Most Reliable (lowest cancel rate)
- Best Report Cards
- Rising Star (most improved)

---

## 7. Travel Time & Geographic Constraints

### Teacher Travel Preferences (Per-Teacher, Flexible)

| Preference | Value | Notes |
|-----------|-------|-------|
| Max travel FROM home to first area | 15-45 min | Teacher-specific setting |
| Preferred travel BETWEEN classes | 5-15 min ideal, up to 25 min ok | Depends on clustering |
| Would travel 45 min if... | 3+ classes clustered in that area | ROI-based decision |
| Company value | **FLEXIBILITY** | Teachers expected to be adaptable |

### Dynamic Buffer Concept

Instead of fixed 15-min buffer:
- Same neighborhood → 5 min buffer
- Adjacent neighborhoods → 15 min buffer
- Different zones → 25-30 min buffer
- Calculated ONCE at booking time (not daily)

### Cluster-Aware Booking

Key insight: Travel time tolerance is CONTEXTUAL
- 45 min to reach an area with 3 students = WORTH IT
- 45 min between two random classes = NOT WORTH IT
- System should track teacher's "cluster days" (which days in which areas)

---

## 8. Address Accuracy & Verification

### The Problem
- Wrong addresses → wrong travel calculations
- Large neighborhoods with rivers/obstacles → misleading proximity
- CEP (postal code) too imprecise
- Some locations have no neighborhood name

### Current Process
1. Filter by neighborhood first (rough proximity)
2. Verify with Google Maps (actual travel time)
3. Manual check catches issues

### Proposed Solution: Multi-Layer Verification

**On Address Entry:**
1. Google Places Autocomplete (validates format)
2. Show map with pin for visual confirmation
3. User can drag pin if location is wrong
4. Store: lat, lng, formatted_address, neighborhood, cep, zone_id

**Storage:**
```sql
locations:
- latitude, longitude (CRITICAL - exact coords)
- zone_id (for cheap lookups)
- neighborhood (for filtering)
- cep (for grouping)
- verified_at, verification_method
```

---

## 9. Relocation Policies

### Teacher Moves (30-Day Notice Required)

**Workflow:**
1. Teacher submits new address + move date
2. System calculates: Which students now OUT OF RANGE?
3. Admin gets report: "8 of 12 students affected"
4. For each affected student:
   - Try to find another teacher in student's area
   - If found → Transfer enrollment
   - If not found → Parent chooses: Waitlist or INATIVO

### Student Moves (Notice Required or Pay)

**Enhanced Logic:**
1. Can current teacher still reach them?
2. Does teacher have OTHER students in new area? (cluster check)
3. Can we RESCHEDULE to fit the teacher's "area day"?
4. If all fail → Find other teacher or Waitlist/INATIVO

**No Notice = Pay:** If parent moves without telling us, they pay for classes until formal notice given.

---

## 10. Waitlist Management

### Priority System
- Base: First come, first served (`waitlist_date`)
- Filtered by: Location match, schedule match, language preference

### Offer Process
- Day 0: Send offer (WhatsApp primary, email backup)
- Day 1-3: Follow-up attempts
- Day 4-6: Final attempts with deadline
- Day 7: Offer expires

### Ghost Handling
- 1 week no response → Bottom of list for THAT SLOT (stay top for others)
- 2 weeks no response → Bottom of GENERAL waitlist
- Flag as "unresponsive"

### New Teacher Onboarding Distribution

When multiple new teachers + waitlist families:
1. Score each (waitlist, teacher) pair by: distance, availability, language, age
2. Assign in balanced rounds (not all easy students to one teacher)
3. Goal: Burn the waitlist as fast as possible!

---

## 11. Group Class Rules

### Pricing (Corrected in Phase 3)

**What Parent Pays:**
| Class Type | Parent Pays |
|------------|-------------|
| Individual | R$150 |
| Group (2+) | R$120/each |

**What Teacher Receives:**
| Class Type | Teacher Gets |
|------------|--------------|
| Individual | R$95 (Platinum rate) |
| Group | R$70/student |

### Degradation Policy

| Students | Status | Parent Price |
|----------|--------|--------------|
| 3+ students | Group class | R$120/student |
| 2 students | Still group | R$120/student |
| 1 student | Converts to individual | R$150 |

### Per-Class Reality Pricing

Each class is invoiced based on WHO ATTENDED that day:
- 3 students attend → R$120 each
- 2 students attend → R$120 each
- 1 student attends → R$150
- No averaging, no waiting for month end
- Price change notification sent to parent proactively

**When degraded to individual:**
- Notify remaining family
- Explain price change
- Family can accept or request different arrangement

**When paused student returns:**
- Check if compatible slots exist
- If yes → Rejoin group, price reverts
- If no → Treat as new enrollment

### Group Class Formation (Future Feature)

Parents can flag "open to group classes" for:
- Cheaper pricing
- Social learning benefits
- System can suggest compatible groupings

---

## 12. Google API Cost Optimization

### Cost-Efficient Hierarchy

| Level | Method | When to Use | Cost |
|-------|--------|-------------|------|
| 1 | Database lookup | Filter by neighborhood/zone | FREE |
| 2 | Zone matrix | Pre-calculated zone-to-zone times | FREE (after setup) |
| 3 | Geocoding | New addresses only (once per address) | $5/1000 |
| 4 | Distance Matrix | Final booking verification only | $10/1000 |

### Zone Matrix Strategy
- Divide Florianópolis into ~25-30 zones
- Pre-calculate zone-to-zone travel times (one-time: ~900 API calls)
- Store in DB: `zone_travel_matrix(from_zone, to_zone, avg_minutes)`
- Future lookups are FREE

### Estimated Monthly Cost: < $1/month
(After initial zone matrix setup of ~$9)

---

## 13. Schedule Change Philosophy

**Core Principle:** "We are flexible, but cascades stop at 1 level"

- Parent A wants change → We try to accommodate
- If that affects Parent B → Parent B must adapt
- We do NOT cascade to Parent C, D, E...
- No infinite reshuffling

**System shows admin:** "This change affects 2 other families"
**Admin decides:** Worth the disruption? Or decline request?

---

## 14. Data Model Implications

### Core Entities Identified

```
teachers
├── id, name, email, etc.
├── home_location_id (FK to locations)
├── max_travel_minutes
├── credits_balance
├── tier (bronze/silver/gold/platinum)
└── status

students
├── id, name, parent_id, etc.
├── location_id (FK to locations)
├── status (waitlist/ativo/pausado/ferias/aviso/inativo)
└── language_preference

enrollments
├── id
├── student_id, teacher_id
├── day_of_week, start_time, end_time
├── status (active/paused/aviso/terminated)
├── pause_start_date, aviso_confirmed_date, end_date
├── group_id (for group classes)
└── created_at, updated_at

class_instances
├── id, enrollment_id
├── scheduled_date, start_time, end_time
├── status (scheduled/completed/cancelled_excused/cancelled_charged/
│           cancelled_by_teacher/rescheduled/no_show)
├── cancellation_reason
├── rescheduled_to_id (FK to makeup_classes)
└── google_event_id

locations
├── id, entity_type, entity_id
├── formatted_address, neighborhood, cep
├── latitude, longitude
├── zone_id
├── verified_at, verification_method
└── is_current, superseded_by

zone_travel_matrix
├── from_zone_id, to_zone_id
├── avg_travel_minutes
└── calculated_at

waitlist_entries
├── id, student_id
├── general_priority, waitlist_date
├── status (active/offer_pending/unresponsive)
├── last_offer_date, offers_ignored_count
└── location_id, language_preference, availability_json

teacher_credits_log
├── id, teacher_id
├── action, credits_change
├── balance_after
└── created_at, notes
```

---

## 15. Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Source of truth | Database (not Google Calendar) | Calendar is display only |
| PAUSADO limit | 3 weeks free, then pay or release | Protect teacher income |
| AVISO countdown | 15 days, no extensions | Clear expectations |
| Teacher sick day | Teacher bears financial loss | Protect parents |
| Waitlist offer window | 1 week | Balance fairness and efficiency |
| Ghost penalty | 2 weeks unresponsive → bottom of list | Keep list moving |
| Travel buffer | Dynamic by zone (not fixed 15 min) | More accurate |
| API strategy | Zone matrix + cache | Minimize costs |
| Cascade limit | 1 level only | Prevent chaos |

---

## Phase 2: Chaos Engineering + Anti-Solution ✅

### Chaos Scenarios Tested

11 chaos scenarios were thrown at the system. Key discoveries:

### New Rules from Phase 2

| # | Rule | Source Scenario |
|---|------|-----------------|
| 1 | FÉRIAS is a TAG, not a status - all countdowns continue | Perfect Storm |
| 2 | Teacher credits only lost for ACTUAL missed class days | Perfect Storm |
| 3 | Company operates during FÉRIAS (reduced hours) | Perfect Storm |
| 4 | Existing students > new signups (always) | Cascade Bomb |
| 5 | "Mover bears the burden" - who caused change absorbs disruption | Time Paradox |
| 6 | Movie theater reservation model (10-min hold on slots) | Double-Booking Disaster |
| 7 | AVISO reversible anytime during 15 days, slot stays BLOCKED until done | AVISO Regret |
| 8 | 6-month non-compete in teacher contracts | Teacher Poaching |
| 9 | No rush hiring - waitlist > bad teacher | Teacher Poaching |
| 10 | Post-pay model (invoice for classes that happened) | Payment Paradox |
| 11 | Makeup credits expire in 2-3 months (future prepay) | Payment Paradox |
| 12 | Crisis triage order: Rebook → Fix bugs → Overdue policies → Waitlist | Ultimate Stress Test |

### Slot Reservation System ("Movie Theater Model")

```
Slot Status Flow:
LIVRE → RESERVADO (10 min hold) → BOOKED
         ↓ (timeout)
       LIVRE (released back)

- Admin clicks slot → 10-minute reservation timer starts
- Other admins see: "🔒 Reserved by Maria - 8:42 remaining"
- First click wins (database timestamp is law)
- System does 80% of work with AI-powered suggestions
```

### AVISO Slot Protection

```
Day 1-15 of AVISO:
├── Slot status: BLOCKED (not LIVRE!)
├── Classes continue, charged normally
├── DO NOT offer to waitlist yet
├── Parent can reverse decision anytime
└── CEO confirms reversal: AVISO → ATIVO

Day 16:
├── AVISO expires
├── Enrollment → INATIVO
├── Slot → LIVRE
└── NOW offer to waitlist
```

### Crisis Triage Order

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

## Phase 3: Role Playing + Six Thinking Hats ✅

### Stakeholders Stress-Tested

| Role | Key Concerns | Resolution |
|------|--------------|------------|
| 😤 Frustrated Parent | Price yo-yo, makeup availability, communication | Proactive notifications, 30-min extended class option, hybrid comms |
| 😩 Burned-out Teacher | Bad clustering, credit punishment, unpaid labor | Clustering fix, sick=protected, no direct parent contact |
| 😰 Overwhelmed Admin | Spreadsheet chaos, waitlist guilt, FÉRIAS panic | 80% automation, 2-week waitlist checks, auto-resume messages |
| 💰 CFO | PAUSADO leak, sick day costs, tier bonuses | 3 weeks OK, cost of business, tier restructure saves money |
| 👨‍👩‍👧 Teacher's Spouse | Income swings, FÉRIAS income, gas costs | Contractor reality, optional events, clustering protects profitability |
| 🤔 Skeptical Parent | Lock-in fear, quality guarantee, hidden fees | 1-month trial, free switching, transparent pricing |
| 🦊 Competitor | Price undercut, teacher poaching, online threat | Value>price, community>pay, online only 14+ |

### Communication Model

```
Teachers ←✕→ Parents (NO direct contact)

RIGHT:
Parent ←→ Admin/Company ←→ Teacher

Why:
├── Teacher protection (no 9pm messages)
├── Company protection (no side deals)
├── Audit trail for issues
└── Contract enforcement
```

### Hybrid Communication System

```
WhatsApp (urgent, personal):
├── Same-day cancellations
├── "Running 5 min late"
├── Quick confirmations

Portal/System (formal, records):
├── Schedule viewing
├── Invoice history
├── Enrollment changes
├── AVISO/PAUSADO requests
└── All auditable actions
```

### Makeup Policy (Realistic)

```
Primary: Reschedule to different day/time
Fallback: Extended class (90 min for 2 weeks)
Group: Case-by-case (join other group, individual makeup, or credit)
```

### New Parent Offer

```
- 1-month trial contract
- No hidden fees (materials included)
- Teacher switching available (no penalty)
- Pay only for classes that happen
```

### Competitive Defense

```
Against Price Undercut:
└── Compete on VALUE, not price. Plan to charge MORE over time.

Against Teacher Poaching:
├── Community, events, gifts (beyond pay)
├── Zero admin burden
└── 6-month non-compete clause

Against Online Convenience:
└── Online only for 14+ (VALUES stance against screen time for kids)
```

---

## Phase 4: First Principles + Morphological Analysis ✅

### Bedrock Truths (Validated)

**Value Exchange:**
1. Parents pay money → Children receive education
2. Teachers give time → Teachers receive money
3. Company provides matching + admin → Company takes margin

**Physical Reality:**
4. Teacher must physically travel to student's home
5. Travel takes time
6. Only one teacher can be in one place at one time
7. A class occupies a specific time slot

**Human Reality:**
8. People get sick (unpredictable)
9. People's schedules change
10. People move homes
11. Relationships require trust and communication

**Business Reality:**
12. Revenue must exceed costs
13. Teacher supply must meet student demand
14. Reputation determines growth
15. Systems must be simple enough to operate

### Morphological Matrix (Key Decisions)

| # | Parameter | Choice | Why |
|---|-----------|--------|-----|
| 1 | Enrollment Model | Weekly recurring | Predictability for all parties |
| 2 | Payment Timing | Post-pay monthly | Invoice = reality, no refunds |
| 3 | Teacher Relationship | Contractor | Scalable, flexible, simple |
| 4 | Communication | Hybrid (WhatsApp + Portal) | Best of both worlds |
| 5 | Geographic Scope | Multi-city → Franchise | Current: Floripa, Balneário, Itajaí. Goal: Franchise model |
| 6 | Class Format | Hybrid by age | In-home (kids), Online option (14+) |
| 7 | Pricing Model | Fixed per-class | Transparent, simple, fair |
| 8 | Quality Control | AI + City Owner + Parent ratings | Scalable for franchise |
| 9 | Makeup Policy | Reschedule first, extend if needed | Flexible, practical |
| 10 | Data Ownership | Database is truth, Calendar is display | Full control, one-way sync |

### Franchise-Ready Architecture Requirement

```
Must build for multi-tenant:
├── Each city/franchise = separate "unit"
├── Shared platform, separate data
├── Centralized materials/training
├── Local scheduling/teachers
└── Consolidated reporting for HQ
```

### Business Summary Statement

> **EduSchedule matches contractor English teachers with families for weekly in-home classes (online for 14+), charges per-class post-pay, maintains quality through AI-assisted report cards and parent ratings, and plans to franchise this model across Brazilian cities.**

---

## 16. Updated Data Model Implications

### Core Entities (Updated from all phases)

```
teachers
├── id, name, email, etc.
├── home_location_id (FK to locations)
├── max_travel_minutes
├── credits_balance
├── tier (bronze/silver/gold/platinum)
├── pay_rate (R$79/87/91/95 based on tier)
├── status
└── contract_end_date, non_compete_expires

students
├── id, name, parent_id, etc.
├── location_id (FK to locations)
├── status (waitlist/ativo/pausado/aviso/inativo)
├── language_preference
├── age (for online eligibility: 14+)
└── trial_end_date (1-month trial tracking)

enrollments
├── id
├── student_id, teacher_id
├── day_of_week, start_time, end_time, duration_minutes
├── status (active/paused/aviso/terminated)
├── pause_start_date, aviso_confirmed_date, end_date
├── group_id (for group classes)
├── ferias_tag (boolean - is FÉRIAS period active)
└── created_at, updated_at

class_instances
├── id, enrollment_id
├── scheduled_date, start_time, end_time, duration_minutes
├── actual_attendees (for group pricing)
├── price_charged (R$120 or R$150)
├── status (scheduled/completed/cancelled_excused/cancelled_charged/
│           cancelled_by_teacher_sick/cancelled_by_teacher_other/
│           rescheduled/no_show)
├── cancellation_reason
├── is_makeup, makeup_for_instance_id
├── rescheduled_to_id
└── google_event_id

slot_reservations (NEW - Movie Theater Model)
├── id
├── teacher_id, day_of_week, start_time
├── reserved_by_admin_id
├── reserved_at
├── expires_at (reserved_at + 10 minutes)
└── status (reserved/booked/expired)

locations
├── id, entity_type, entity_id
├── formatted_address, neighborhood, cep
├── latitude, longitude
├── zone_id
├── city_id (for multi-city/franchise)
├── verified_at, verification_method
└── is_current, superseded_by

cities (NEW - Franchise Support)
├── id, name
├── owner_id (franchise owner)
├── ferias_start_date, ferias_end_date
└── status (active/onboarding)

zone_travel_matrix
├── from_zone_id, to_zone_id
├── avg_travel_minutes
└── calculated_at

waitlist_entries
├── id, student_id
├── general_priority, waitlist_date
├── status (active/offer_pending/unresponsive)
├── last_offer_date, offers_ignored_count
├── slot_reservation_id (if offer pending)
└── location_id, language_preference, availability_json

teacher_credits_log
├── id, teacher_id
├── action_type (class_completed/perfect_week/report_card/
│               same_day_cancel/late_arrival/no_show)
├── credits_change
├── balance_after
├── is_sick_protected (boolean)
└── created_at, notes

report_cards
├── id, teacher_id, student_id
├── period_start, period_end
├── content
├── ai_score (0-5)
├── status (pending_review/approved/rejected)
├── reviewed_by (city owner or CEO)
└── submitted_at, reviewed_at

parent_ratings (NEW)
├── id, class_instance_id
├── parent_id, teacher_id
├── rating (1-5 stars)
├── feedback_text
└── created_at
```

---

## 17. Key Decisions Summary (All Phases)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Source of truth | Database (not Google Calendar) | Calendar is display only, one-way sync |
| FÉRIAS handling | TAG not status | All countdowns continue during break |
| PAUSADO limit | 3 weeks free, then pay or release | Protect teacher income |
| AVISO countdown | 15 days, reversible, slot stays BLOCKED | Clear expectations, relationship preservation |
| Teacher sick day | Protected (no credit loss) | Health ≠ punishment |
| Unprofessional behavior | Credit penalties apply | Same-day cancel, late, no-show = lose credits |
| Waitlist offer window | 1 week | Balance fairness and efficiency |
| Ghost penalty | 2 weeks unresponsive → bottom of list | Keep list moving |
| Travel buffer | Dynamic by zone (not fixed 15 min) | More accurate |
| API strategy | Zone matrix + cache | Minimize costs |
| Cascade limit | 1 level only | Prevent chaos |
| Slot booking | Movie theater reservation (10 min hold) | Prevent double-booking |
| Payment model | Post-pay monthly | Invoice = reality |
| Teacher-parent communication | NO direct contact | Through company only |
| Communication channels | Hybrid (WhatsApp + Portal) | Urgent vs. formal |
| Geographic scope | Multi-city → Franchise | Floripa, Balneário, Itajaí → scale |
| Online classes | 14+ only | Screen time values stance |
| Quality control | AI + City Owner + Ratings | Scalable for franchise |
| Pricing | Fixed per-class (R$150 individual, R$120 group) | Simple, transparent |
| Teacher pay | Tier-based (R$79-95) | New teachers earn up, existing grandfathered |
| New parent offer | 1-month trial, no hidden fees | Low barrier to entry |
| Crisis priority | Rebook → Bugs → Overdue → Waitlist | Existing students first |

---

## Session Notes

**Key Insights (All Phases):**
1. Enrollment is the persistent entity; class instances are ephemeral
2. Teacher credit system enables gamification while tracking reliability
3. Zone-based travel calculation dramatically reduces API costs
4. Address verification is critical - bad addresses break everything
5. FÉRIAS is a TAG, not a status - life continues during holidays
6. "Deal with the cards dealt" philosophy prevents infinite cascades
7. Existing students always take priority over new signups
8. Movie theater model prevents double-booking chaos
9. Teachers never communicate directly with parents
10. Franchise-ready architecture required from day one

**Parking Lot (Future Considerations):**
- Material lending/tracking system
- WhatsApp Business API integration
- AI-powered predictive scheduling
- Public teacher marketplace
- Prepay credit system with expiry

---

*Document Status: All 4 Phases Complete ✅*
*Last Updated: 2025-12-06*
