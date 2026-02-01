# Feature Maps - Cross-Cutting Impact Analysis

> **Purpose:** When modifying a feature, this document maps ALL code locations that need review. Prevents missed files during changes and helps understand how components connect.

**Last Updated:** 2026-02-01 (Added Section 40: Business Configuration System)

---

## How to Use This Document

1. **Before modifying a feature:** Find its section below
2. **Check ALL listed locations:** Every file/function listed needs review
3. **Follow the order:** Database → Types → Repositories → Services → Validation → APIs → Client Scripts → UI → Docs
4. **Add new sections:** When you discover new cross-cutting features

---

## Quick Navigation

| Feature | Key Files |
|---------|-----------|
| [Enrollment System](#1-enrollment-system) | enrollments, exceptions, completions |
| [Status Lifecycle](#2-status-lifecycle) | status-machine.ts, pausado-automator.ts |
| [Scheduling](#3-scheduling--availability) | slot-service.ts, schedule-generator.ts |
| [Travel Time](#4-travel-time-system) | travel-time-service.ts, TravelBlock.astro |
| [Lead Pipeline](#5-lead-pipeline) | lead-service.ts, leads-page-client.ts |
| [Notifications](#6-notification-system) | notification-service.ts, NotificationBell.astro |
| [Group Classes](#7-group-classes) | group-service.ts, group-cancellation-service.ts |
| [Cancellations](#8-cancellation-system) | exception.ts, GroupCancellationService |
| [Location/Address](#9-locationaddress-fields) | AddressForm.astro, address-autocomplete.ts |
| [Teacher Data](#10-teacher-data) | teacher.ts, users-page-client.ts |
| [Student/Parent Data](#11-studentparent-data) | student.ts, users-page-client.ts |
| [Payment/Billing](#12-paymentbilling) | stripe-service.ts, subscription-service.ts |
| [Trial Tracking](#13-trial-tracking-aula_teste) | trial-automator.ts |
| [Historical Integrity](#14-historical-integrity) | student_status_history, historical-constraints.ts |
| [Data Quality](#15-data-quality-system) | data-issue-service.ts, resolve-errors-client.ts |
| [Backup System](#16-backup-system) | github-service.ts, backups.astro |
| [System Closures](#17-system-closures) | closure.ts, closures.astro |
| [Time-Off Requests](#18-time-off-requests) | time-off.ts, time-off-approvals.astro |
| [Settings & Theme](#19-settings--theme) | settings.astro, theme-editor.astro |
| [Account Linking](#20-account-linking-oauth) | auth.ts, account-links.astro |
| [LGPD Compliance](#21-lgpd-compliance) | lgpd/* APIs |
| [Import/Export](#22-importexport-data) | google-sheets.ts, import-data.astro |
| [Cron Jobs](#23-cron-jobs) | cron/* APIs, automators |
| [Re-encryption](#24-re-encryption) | re-encrypt.astro |
| [Returning Students](#25-returning-students) | returning-student-service.ts |
| [BILIN Feedback](#26-bilin-feedback-system) | SkillProgressBars, class_completions |
| [Change Requests](#27-change-request-system) | change-requests.ts, profile-changes |
| [Waitlist System](#28-waitlist-system) | waitlist-matcher.ts, slot_offers |
| [Audit Logging](#29-audit-logging) | audit_log table |
| [Component Library](#30-component-library) | Button, Card, Modal, FormField |
| [Calendar Views](#31-calendar-views) | MonthCalendar, WeeklyScheduleGrid |
| [Scheduling Analytics](#32-scheduling-analytics) | scheduling-analytics.astro |
| [Invoice/Earnings](#33-invoiceearnings-calculations) | invoice.ts, billing.ts |
| [Dev Tools](#34-dev-tools) | /admin/dev/*, debug pages |
| [Pricing/Rates](#35-pricingrates) | group-service.ts, billing.ts, invoice.ts |
| [Autentique Contracts](#36-autentique-contract-signing) | contracts, autentique-service.ts |
| [Admin Calendar Events](#37-admin-calendar-events) | admin_events, admin-event.ts, enrollments.astro |
| [ICS Calendar Feed](#38-ics-calendar-feed) | calendar_feed_tokens, ics-generator.ts, settings.astro |
| [Constants & Settings Registry](#39-constants--configurable-settings-registry) | billing.ts, invoice.ts, config.ts, enrollment-statuses.ts, matching.ts |
| [Business Configuration](#40-business-configuration-system) | business-config-service.ts, business-config.ts (API + validation), settings.astro, settings-client.ts |

---

## 1. Enrollment System

**Core concept:** Enrollments are persistent student+teacher+weekly-slot commitments. Class instances are generated on-demand.

### Database Tables

| Table | Purpose | Migration |
|-------|---------|-----------|
| `enrollments` | Recurring class commitments | Base schema |
| `enrollment_exceptions` | Cancellations, reschedules, holidays | Base schema |
| `class_completions` | Completed class records + notes | Base schema |
| `enrollment_status_history` | Status change audit trail | 016 |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/repositories/types.ts` | `Enrollment`, `EnrollmentException`, `ClassCompletion` |
| `src/types/schedule.ts` | `ClassBlock`, `SlotBlock`, `GeneratedSchedule` |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/enrollment.ts` | `create()`, `update()`, `findById()`, `findByTeacher()`, `findByStudent()` |
| `src/lib/repositories/d1/exception.ts` | `create()`, `findByEnrollment()`, `findByDateRange()` |
| `src/lib/repositories/d1/completion.ts` | `create()`, `findByEnrollment()`, `findPendingConfirmation()` |
| `src/lib/repositories/d1/status-history.ts` | `create()`, `findByEnrollment()` |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/enrollment-service.ts` | CRUD, status transitions, rate calculations |
| `src/lib/services/schedule-generator.ts` | Generate class instances from enrollments |
| `src/lib/services/schedule-page-service.ts` | Build schedule views with travel times |

### Validation

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/enrollment.ts` | `CreateEnrollmentSchema`, `UpdateEnrollmentSchema` |
| `src/lib/validation/exception.ts` | `CreateExceptionSchema` |
| `src/lib/validation/completion.ts` | `CreateCompletionSchema` |

### API Endpoints

| Endpoint | File |
|----------|------|
| `GET/POST /api/enrollments` | `src/pages/api/enrollments/index.ts` |
| `GET/PUT/DELETE /api/enrollments/[id]` | `src/pages/api/enrollments/[id]/index.ts` |
| `PUT /api/enrollments/[id]/status` | `src/pages/api/enrollments/[id]/status.ts` |
| `GET/POST /api/enrollments/[id]/exceptions` | `src/pages/api/enrollments/[id]/exceptions/index.ts` |
| `GET/POST /api/enrollments/[id]/completions` | `src/pages/api/enrollments/[id]/completions/index.ts` |
| `POST /api/enrollments/[id]/start-class` | `src/pages/api/enrollments/[id]/start-class.ts` |
| `POST /api/enrollments/[id]/complete-class` | `src/pages/api/enrollments/[id]/complete-class.ts` |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/enrollments-page-client.ts` | Admin enrollment management (178KB!) |
| `src/scripts/booking-grid-client.ts` | Grid interactions, slot selection |
| `src/scripts/class-edit-client.ts` | Class editing modal |

### UI Pages

| Page | Purpose |
|------|---------|
| `/admin/enrollments` | Main enrollment management |
| `/teacher/schedule` | Teacher's weekly schedule |
| `/parent/students` | Parent's view of children's classes |

### Components

| Component | Purpose |
|-----------|---------|
| `BookingGrid.astro` | Visual schedule grid |
| `WeeklyScheduleGrid.astro` | Weekly calendar view |
| `EnrollmentCard.astro` | Enrollment summary card |
| `ClassBlock.astro` | Single class block in grid |

---

## 2. Status Lifecycle

**Status values:** `ATIVO`, `PAUSADO`, `AVISO`, `INATIVO` (enrollments) + `AULA_TESTE` (students)

### Status Transition Rules

```
ATIVO → PAUSADO (parent request)
PAUSADO → ATIVO (auto after 21 days / 3 weeks)
ATIVO → AVISO (admin marks for review)
AVISO → INATIVO (auto after 14 days / 2 weeks)
Any → INATIVO (admin can force)
```

### Duration Constants (CRITICAL - must be consistent across all files)

| Constant | Value | Business Rule |
|----------|-------|---------------|
| `PAUSADO_MAX_DAYS` | 21 | 3 weeks = 3 slots blocked |
| `AVISO_MAX_DAYS` | 14 | 2 weeks = 2 slots blocked |
| `PAUSADO_COOLDOWN_MONTHS` | 5 | Months before can pause again |

**Files that must use these constants:**
- `src/constants/enrollment-statuses.ts` - defines constants
- `src/lib/services/status-machine.ts` - expiry calculations
- `src/lib/services/pausado-automator.ts` - auto-transition
- `src/lib/services/aviso-automator.ts` - auto-transition
- `src/lib/services/schedule-page-service.ts` - week view status projection (calculateProjectedStatus)
- `src/scripts/enrollments-page-client.ts` - timeline display (uses hardcoded 21/14)
- `src/pages/admin/enrollments.astro` - warning messages
- `src/pages/admin/pausado-approvals.astro` - history display

**Status Projection in Week View:**
The `calculateProjectedStatus()` function in `schedule-page-service.ts` projects the enrollment status for future weeks. It uses the **actual class date** (weekStartDate + day_of_week) for comparisons, not the week boundaries. This ensures:
- PAUSADO shows for exactly 3 weekly slots (21 days from start)
- AVISO shows for exactly 2 weekly slots (14 days from start)
- Classes before PAUSADO/AVISO started show as ATIVO (historical view)

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/status-machine.ts` | Valid transition rules |
| `src/lib/services/pausado-automator.ts` | Auto-transition PAUSADO → ATIVO |
| `src/lib/services/aviso-automator.ts` | Auto-transition AVISO → INATIVO |
| `src/lib/services/student-status-sync-service.ts` | Sync student status from enrollments |

### Database

| Table | Purpose |
|-------|---------|
| `enrollment_status_history` | Audit trail for enrollment status |
| `student_status_history` | Audit trail for student status |
| `pausado_requests` | Parent pause requests |

### Constants

| File | Export |
|------|--------|
| `src/constants/enrollment-statuses.ts` | `ENROLLMENT_STATUSES`, `VALID_STATUS_TRANSITIONS` |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `PUT /api/enrollments/[id]/status` | Change enrollment status |
| `GET/POST /api/admin/pausado-approvals` | Pause request management |

### UI

| Page | Purpose |
|------|---------|
| `/admin/pausado-approvals` | Approve/reject pause requests |
| `StatusBadge.astro` | Colored status indicator |

---

## 3. Scheduling & Availability

**Core concept:** Teachers declare LIVRE slots. System calculates availability based on enrollments + travel time.

### Database Tables

| Table | Purpose |
|-------|---------|
| `teacher_availability` | Declared LIVRE time slots |
| `teacher_day_zones` | Per-day city assignments |
| `slot_reservations` | Temporary slot holds (5 min) |
| `slot_offers` | Waitlist slot offers |
| `teacher_availability_history` | Historical availability (Type 2 SCD) |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/slot-service.ts` | LIVRE/BLOCKED/ENROLLED slot logic |
| `src/lib/services/slot-calculator.ts` | Calculate available slots with travel |
| `src/lib/services/slot-reservation-service.ts` | Hold slots during booking |
| `src/lib/services/slot-offer-service.ts` | Manage waitlist offers |
| `src/lib/services/schedule-generator.ts` | Generate class instances |
| `src/lib/services/schedule-page-service.ts` | Build complete schedule views |
| `src/lib/services/reschedule-suggestion-service.ts` | AI-powered slot suggestions |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/teacher-availability.ts` | CRUD for availability |
| `src/lib/repositories/d1/slot-reservation.ts` | Reserve/release slots |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/slots/[teacherId]` | Get teacher's slot availability |
| `POST /api/slots/reserve` | Reserve a slot |
| `DELETE /api/slots/reserve` | Release a reservation |
| `GET /api/slots/suggestions` | Get AI slot suggestions for leads |
| `GET /api/schedule/[teacherId]` | Teacher's generated schedule |
| `GET /api/availability` | Get/set teacher availability |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/teacher-availability-client.ts` | Availability grid interactions |
| `src/scripts/smart-booking-client.ts` | Smart booking modal |
| `src/scripts/weekly-schedule-grid-client.ts` | Schedule grid interactions |

### UI

| Page | Purpose |
|------|---------|
| `/teacher/availability` | Teacher sets availability |
| `/admin/availability-approvals` | Approve availability changes |
| `/admin/scheduling-analytics` | Hot times demand analysis |

### Components

| Component | Purpose |
|-----------|---------|
| `AvailabilityGrid.astro` | LIVRE/BLOCKED slot grid |
| `SmartBookingModal.astro` | Booking flow modal |
| `WeeklyScheduleGrid.astro` | Weekly schedule display |

---

## 4. Travel Time System

**Flow:** Google Routes API → Cache (30 days) → Haversine estimate (Tier 3)

### Database Tables

| Table | Purpose |
|-------|---------|
| `travel_time_cache` | Cached driving times |
| `travel_time_errors` | API/geocoding errors |
| `zone_travel_matrix` | Pre-calculated zone-to-zone times |
| `address_cache` | Geocoded address cache |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/travel-time-service.ts` | Main travel calculation + error logging |
| `src/lib/services/geocoding/index.ts` | Geocoding provider abstraction |
| `src/lib/services/google-geocode.ts` | Google Geocoding API |
| `src/lib/services/address-autocomplete.ts` | Address autocomplete |
| `src/lib/services/route-efficiency-service.ts` | Route optimization |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/zone-matrix.ts` | Zone-to-zone travel times |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/locations/autocomplete` | Address autocomplete |
| `GET /api/locations/reverse` | Reverse geocoding |
| `POST /api/admin/geocode-single` | Geocode single address |
| `GET/PUT /api/admin/travel-errors/*` | Travel error management |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/address-form-client.ts` | Address form with autocomplete |
| `src/scripts/travel-errors-client.ts` | Error resolution UI |

### UI

| Page | Purpose |
|------|---------|
| `/admin/travel-errors` | View/resolve travel errors |
| `/admin/resolve-errors` | Unified error resolution |

### Components

| Component | Purpose |
|-----------|---------|
| `TravelBlock.astro` | Travel time display (tier indicators) |
| `AddressAutocomplete.astro` | Address input with suggestions |
| `AddressForm.astro` | Complete address form |

---

## 5. Lead Pipeline

**Flow:** JotForm → Lead (AGUARDANDO) → Match → Offer → Accept → Student + Enrollment

### Database Tables

| Table | Purpose |
|-------|---------|
| `leads` | Pre-enrollment prospects |
| `slot_offers` | Offers sent to leads |
| `students` | Used for location proximity matching (comparing lead address to existing students) |
| `enrollments` | Used to find active students for proximity matching |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/lead-service.ts` | Lead CRUD and conversion |
| `src/lib/services/lead-matching.ts` | Match leads to teachers |
| `src/lib/services/lead-readiness-service.ts` | Score lead readiness + location proximity + categorization |
| `src/lib/services/slot-offer-service.ts` | Manage slot offers |

### Constants

| File | Purpose |
|------|---------|
| `src/constants/matching.ts` | `LOCATION_PROXIMITY_WEIGHTS`, `LEAD_CATEGORIES` for scoring and categorization |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/lead.ts` | Lead CRUD |

### Validation

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/lead.ts` | `CreateLeadSchema`, `UpdateLeadSchema` |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/leads` | Lead management |
| `GET/PUT/DELETE /api/leads/[id]` | Single lead |
| `POST /api/leads/[id]/convert` | Convert to student |
| `POST /api/leads/[id]/send-contract` | Send contract |
| `POST /api/leads/[id]/mark-signed` | Mark contract signed |
| `POST /api/webhooks/jotform` | JotForm webhook |
| `GET/POST /api/offers` | Slot offers |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/leads-page-client.ts` | Tab switching, filter chips, Easy Win wizard, slot selection |

### UI Pages & Styles

| File | Purpose |
|------|---------|
| `src/pages/admin/leads.astro` | Lead management page with category tabs, filter chips, Easy Win wizard modal |
| `src/styles/leads-page.css` | Category tabs, filter chips, same-building alerts, proximity badges, wizard styles |

### Key Features

- **Location Proximity Scoring:** Same Building (40pts), Same Street (25pts), Same CEP (15pts), Same Neighborhood (10pts)
- **Smart Categorization:** 7 categories (easy_wins, need_teacher, need_lead_avail, too_far, no_language, needs_data, archived)
- **Easy Win Wizard:** 3-step contract flow for high-potential leads (same building or 85%+ score)

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/leads-page-client.ts` | Lead management (87KB) |

### UI

| Page | Purpose |
|------|---------|
| `/admin/leads` | Lead pipeline management |
| `/cadastro` | Public registration form |

### Components

| Component | Purpose |
|-----------|---------|
| `LeadMatchGrid.astro` | Teacher matching grid |

---

## 6. Notification System

**Types:** In-app notifications, push notifications, badges

### Database Tables

| Table | Purpose |
|-------|---------|
| `notifications` | In-app notification records |
| `push_device_tokens` | Mobile push tokens |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/notification-service.ts` | Create/send notifications (77KB!) |
| `src/lib/services/push-notification-service.ts` | Push to devices |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/notification.ts` | Notification CRUD |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/notifications` | List user notifications |
| `PUT /api/notifications/[id]/read` | Mark as read |
| `POST /api/notifications/read-all` | Mark all read |
| `GET /api/*/pending-counts` | Badge counts per role |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/nav-badges-client.ts` | Update nav badge counts |

### UI

| Page | Purpose |
|------|---------|
| `/notifications` | Notification center |

### Components

| Component | Purpose |
|-----------|---------|
| `NotificationBell.astro` | Nav notification icon |
| `NotificationIcon.astro` | Notification type icons |
| `Nav.astro` | Navigation with badges |

### Notification Types (from types.ts)

```typescript
CANCELLATION_REQUEST, CANCELLATION_APPROVED, CANCELLATION_REJECTED,
TIME_OFF_REQUEST, TIME_OFF_APPROVED, TIME_OFF_REJECTED,
SLOT_OFFER, SLOT_OFFER_ACCEPTED, SLOT_OFFER_DECLINED,
PAUSADO_REQUEST, PAYMENT_REMINDER, GROUP_RATE_CHANGED,
CLASS_LOCATION_CHANGED, TRAVEL_TIME_ERROR, ...
```

---

## 7. Group Classes

**Concept:** Multiple students share one enrollment slot. Rate changes based on group size.

### Database

| Column | Table | Purpose |
|--------|-------|---------|
| `group_id` | enrollments | Links group members |
| `class_format` | enrollments | 'Individual' or 'Grupo' |
| `effective_group_size` | enrollments | Calculated group size |
| `actual_rate` | enrollments | Rate based on group size |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/group-service.ts` | Group management, rate calculations |
| `src/lib/services/group-cancellation-service.ts` | Handle group cancellation cascades |

### Rate Calculation

```typescript
// From group-service.ts
Individual (Presencial): R$150/hour
Group (2+ students):     R$125/student
Online:                  R$150/hour
```

> **See also:** [Section 35. Pricing/Rates](#35-pricingrates) for complete file list when changing rates.

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/enrollments/[id]/add-to-group` | Add student to group |
| `POST /api/enrollments/[id]/remove-from-group` | Remove from group |
| `PUT /api/enrollments/group/[groupId]/status` | Update group status |

### Group Member Status Display Flow (Enrollment Details Modal)

**Data Flow:** Database → Service → BookingGrid → ClassBlock → JSON → Modal

| Step | File | Key Code | Notes |
|------|------|----------|-------|
| 1. Query | `enrollment.ts` | `findByTeacher()` | Returns enrollments with `status` field |
| 2. Project status | `schedule-page-service.ts` | `calculateProjectedStatus()` | Returns ATIVO/PAUSADO/AVISO based on week being viewed |
| 3. Build blocks | `schedule-page-service.ts` | `buildClassBlocks()` | Sets `status: displayStatus` on each ClassBlock |
| 4. Group detection | `BookingGrid.astro` | Auto-groups same day+time if no `group_id` | Assigns `auto-group-*` IDs |
| 5. Pass to component | `BookingGrid.astro` | `groupMembers={groupMembers}` | Passes ClassBlock[] as GroupMember[] |
| 6. Build click data | `ClassBlock.astro` | `clickData.groupMembers.map(m => ({...status: m.status}))` | **CRITICAL:** Must include status |
| 7. JSON serialize | `ClassBlock.astro` | `JSON.stringify(clickData)` | **WARNING:** `undefined` values are omitted! |
| 8. Parse & display | `enrollments-page-client.ts` | `member.status \|\| classData.status` | Fallback to primary if missing |

**Type Definitions (must stay in sync):**

| File | Type | groupMembers Definition |
|------|------|------------------------|
| `src/global.d.ts` | `WindowClassData` | `{ name, id?, status?, isHost?, enrollmentId? }[]` ✅ Has status |
| `src/scripts/booking-grid-client.ts` | `ClassData` | Must match WindowClassData |
| `src/scripts/enrollments-page-client.ts` | `ClassData` | Must match WindowClassData |
| `src/components/grid/ClassBlock.astro` | `GroupMember` | Local interface, `status?: string` |
| `src/types/schedule.ts` | `ClassBlock` | `status: string` (required) |

**Common Bug Pattern:**
- If `groupMembers[n].status` is `undefined` in the JSON, the modal falls back to `classData.status` (primary member's status)
- All group members then display the same status (usually ATIVO)
- Fix: Use nullish coalescing `status: m.status ?? classData.status` in ClassBlock.astro

**Auto-Grouping Logic (BookingGrid.astro lines 217-249):**
- Classes at same day+time are auto-grouped if they don't have a real `group_id`
- **Quinzenal-aware:** Grouping key includes `quinzenal_week` so students on different biweekly weeks at the same day/time are NOT auto-grouped (key format: `dayOfWeek-startTime[-qwN]`)
- Auto-generated IDs start with `auto-group-*` (vs real UUIDs from database)
- `isRealGroup` check in modal: `classData.groupId && !classData.groupId.startsWith('auto-group-')`
- **ClassBlock quinzenal fields:** `plan_type` and `quinzenal_week` are mapped from enrollment data in `schedule-page-service.ts` → `buildClassBlocks()`
- **ClassBlock QA/QB badge:** `ClassBlock.astro` shows a purple "QA" or "QB" badge for quinzenal students
- **MonthView QA/QB badge:** `MonthView.astro` shows QA/QB badge on event bars; `DisplayItem` includes `planType`/`quinzenalWeek` from `ScheduleItem`
- **DayView QA/QB badge:** `DayView.astro` shows QA/QB badge in class header; `DisplayClass` includes `planType`/`quinzenalWeek` from `ScheduleItem`
- **ScheduleItem quinzenal fields:** `schedule-generator.ts` `ScheduleItem` interface includes `planType` and `quinzenalWeek`, populated in `getScheduleForWeek()` and `getScheduleForDateRange()`

**Quinzenal (Biweekly) Schedule Filtering:**
- **Utility:** `src/lib/utils/quinzenal.ts` — `isQuinzenalActiveForDate()` uses `recurrence_start_date` as anchor, computes week parity to determine active week (even diff = 1ª Semana, odd diff = 2ª Semana)
- **Week view:** `schedule-page-service.ts` → `buildClassBlocks()` skips quinzenal enrollments on off-week
- **Month/day views:** `schedule-generator.ts` → `getScheduleForWeek()` and `getScheduleForDateRange()` skip quinzenal enrollments on off-week
- **Admin toggle:** `users.astro` has 1ª Sem. / 2ª Sem. pill toggle in Matrícula card; `users-page-client.ts` PATCHes enrollment(s)
- **API:** `/api/students/[id]/enrollments-summary` returns `quinzenalEnrollments` array with enrollment IDs and current week

**Parent Page Group Member Enrichment (`src/pages/parent/index.astro`):**

⚠️ **CRITICAL D1 Query Issue:** Running the same D1 query in a loop only returns results for the first iteration. See `CLOUDFLARE_CODING_STANDARDS.md` → "D1 Query Issues in Loops" for the caching pattern.

| Step | What Happens |
|------|--------------|
| 1. Collect unique groupIds | `[...new Set(upcomingClasses.map(c => c.groupId))]` |
| 2. Query once per unique ID | Cache results in `Map<string, GroupMemberInfo[]>` |
| 3. Use cache in enrichment loop | `groupMembersCache.get(classItem.groupId)` |
| 4. Create new objects | `{ ...classItem, groupMembers }` (don't mutate) |

---

## 8. Cancellation System

**Rules:** 24h advance notice, sick exemptions, group cascade handling

### Database Tables

| Table | Purpose |
|-------|---------|
| `enrollment_exceptions` | Cancellation records |
| `cancellation_charges` | Late cancellation fees |
| `cancellation_pending_choices` | Parent rate change decisions |
| `location_change_requests` | Location host changes |
| `location_change_responses` | Parent location responses |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/group-cancellation-service.ts` | Handle cancellation + group impact |
| `src/lib/services/location-change-service.ts` | Location change workflow |

### Exception Types

```typescript
CANCELLED_STUDENT, CANCELLED_TEACHER, CANCELLED_ADMIN,
RESCHEDULED, RESCHEDULED_BY_STUDENT, RESCHEDULED_BY_TEACHER,
HOLIDAY
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/enrollments/[id]/exceptions` | Create cancellation |
| `GET /api/admin/cancellations` | Pending cancellations |
| `POST /api/exceptions/batch` | Batch cancel (Cancel Day) |

### UI

| Page | Purpose |
|------|---------|
| `/admin/pending-cancellations` | Cancellation management |
| `/parent/cancel-choice` | Parent rate decision |
| `/parent/location-change` | Location approval |

### Client Scripts

| File | Impact |
|------|--------|
| `src/scripts/enrollments-page-client.ts` | Modal group display, format tags, rate preview |
| `src/scripts/weekly-schedule-grid-client.ts` | Slot modal with cancelled students |

### UI Components Affected by Cancellations

When a student cancels for a specific date, these displays need to filter/adjust:

| Component | File | What Changes |
|-----------|------|--------------|
| **Week View Group Card** | `WeeklyScheduleGrid.astro`, `BookingGrid.astro` | Show only active members, transfer host if cancelled |
| **Enrollment Details Modal** | `enrollments-page-client.ts` | Show all members with cancel tags, active count for format |
| **Group Member Count** | `enrollments-page-client.ts:membersCount` | Shows "X alunos ativos" |
| **Format Tag** | `enrollments-page-client.ts:formatTag` | Based on stored format (not active count) |
| **Location Host Display** | `enrollments-page-client.ts:locationHostEl` | Transfer to active member if host cancelled |
| **Rate Preview** | `enrollments-page-client.ts:ratePreview` | Uses `currentGroupData.effectiveSize` from API |
| **Student Card Status** | `enrollments-page-client.ts` | Maps cancelled to ATIVO dropdown + cancel tag |
| **Parent Invoice** | `parent/invoice.astro` | Shows cancellation charges with reasons |
| **Admin Invoices** | `admin/invoices.astro` | Shows cancellation charges |

### Helper Function

```typescript
// src/scripts/enrollments-page-client.ts
const CANCELLED_STATUSES = ['CANCELLED_STUDENT', 'CANCELLED_TEACHER', 'RESCHEDULED_BY_STUDENT',
                            'RESCHEDULED_BY_TEACHER', 'RESCHEDULED', 'HOLIDAY', 'NO_SHOW'];

function getActiveGroupMembers(members) {
  return members.filter(m => !CANCELLED_STATUSES.includes(m.status || ''));
}
```

---

## 9. Location/Address Fields

**Fields:** `address`, `address_number`, `address_complement`, `neighborhood`, `city`, `state`, `postal_code`, `lat`, `lon`

### Entities with Location

| Entity | Table | Special Columns |
|--------|-------|-----------------|
| Teachers | `teachers` | `location_stable`, `home_lat`, `home_lon` |
| Students | `students` | `lat`, `lon` |
| Leads | `leads` | `lat`, `lon` |

### TypeScript Interfaces

| File | Interfaces |
|------|------------|
| `src/lib/repositories/types.ts` | `Teacher`, `Student`, `Lead` + Create/Update variants |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/teacher.ts` | Address field handling |
| `src/lib/repositories/d1/student.ts` | Address field handling |
| `src/lib/repositories/d1/lead.ts` | Address field handling |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/address-autocomplete.ts` | Address suggestions |
| `src/lib/services/google-geocode.ts` | Geocode addresses |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/address-form-client.ts` | Address form with autocomplete |
| `src/scripts/users-page-client.ts` | Teacher/student forms |
| `src/scripts/leads-page-client.ts` | Lead forms |

### Components

| Component | Purpose |
|-----------|---------|
| `AddressForm.astro` | Reusable address form |
| `AddressAutocomplete.astro` | Autocomplete input |

---

## 10. Teacher Data

**Includes:** Profile, preferences, availability, credits, earnings

### Database Tables

| Table | Purpose |
|-------|---------|
| `teachers` | Teacher profiles |
| `teacher_availability` | LIVRE slots |
| `teacher_day_zones` | Per-day city assignments |
| `teacher_time_off_requests` | Vacation/sick requests |
| `teacher_credits` | Gamification points |
| `teacher_credit_events` | Credit event history |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/teacher.ts` | Full teacher CRUD |
| `src/lib/repositories/d1/teacher-availability.ts` | Availability CRUD |
| `src/lib/repositories/d1/time-off.ts` | Time-off requests |
| `src/lib/repositories/d1/credit-event.ts` | Credit tracking |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/teacher-credits.ts` | Tier system, points |
| `src/lib/services/relocation-impact-service.ts` | Address change impact |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/users-page-client.ts` | Teacher management (125KB!) |
| `src/scripts/teacher-schedule-client.ts` | Schedule interactions |
| `src/scripts/teacher-availability-client.ts` | Availability grid |

### UI

| Page | Purpose |
|------|---------|
| `/admin/users` | Teacher management (tab) |
| `/teacher/profile` | Teacher self-edit |
| `/teacher/availability` | Set availability |
| `/teacher/schedule` | View schedule |
| `/teacher/invoice` | View earnings |
| `/admin/time-off-approvals` | Approve time-off |

---

## 11. Student/Parent Data

**Includes:** Student profile, parent contacts (encrypted), BILIN feedback, Lixeira (trash/soft-delete)

### Database Tables

| Table | Purpose |
|-------|---------|
| `students` | Student profiles (with `archived_at` for soft-delete) |
| `parent_links` | OAuth email → student links |
| `student_status_history` | Status audit trail |

### Encrypted Fields

```typescript
parent_name_encrypted, parent_phone_encrypted, parent_email_encrypted,
parent_cpf_encrypted, parent2_*_encrypted, address_encrypted, allergies_encrypted
```

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/student.ts` | Student CRUD with encryption |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/student-status-sync-service.ts` | Sync from enrollments |

### Lixeira (Trash) System

Students are soft-deleted via `archived_at` timestamp. Original status is preserved for restoration.

| File | Purpose |
|------|---------|
| `src/lib/database.ts` | `archiveStudent()`, `restoreStudent()`, `getTrashedStudents()`, `deleteArchivedStudents()` |
| `src/pages/api/students/index.ts` | `?include=trashed` returns archived students, lazy auto-purge >90 days |
| `src/pages/api/students/[id]/restore.ts` | POST restore endpoint (clears `archived_at`) |
| `src/scripts/users-page-client.ts` | Lixeira tab UI: `loadTrashedStudents()`, `renderTrashedStudents()`, `restoreStudentFromTrash()`, `moveStudentToTrash()` |
| `src/styles/admin-users.css` | `.student-card--trashed`, `.trash-days--*`, `.btn-restore` |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/users-page-client.ts` | Student management + Lixeira tab |

### UI

| Page | Purpose |
|------|---------|
| `/admin/users` | Student management (tabs: active, aula_teste, pausado, aviso, archived, lixeira) |
| `/admin/parent-links` | Link OAuth emails |
| `/parent/profile` | Parent self-edit |
| `/parent/students` | View children |

---

## 12. Payment/Billing

**Stack:** Stripe SDK, Subscriptions, Invoices

### Database Tables

| Table | Purpose |
|-------|---------|
| `subscription_plans` | Plan templates |
| `subscriptions` | Active subscriptions |
| `stripe_customers` | User → Stripe mapping |
| `reschedule_credits` | Monthly reschedule credits |
| `one_time_payments` | PIX/Boleto payments |
| `payment_transactions` | Payment audit log |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/stripe-service.ts` | Stripe SDK wrapper |
| `src/lib/services/stripe-customer-service.ts` | Customer management |
| `src/lib/services/stripe-webhook-service.ts` | Webhook handling |
| `src/lib/services/subscription-service.ts` | Subscription logic |
| `src/lib/services/payment-grace-service.ts` | Grace period handling |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/subscription.ts` | Subscription CRUD |
| `src/lib/repositories/d1/stripe-customer.ts` | Customer mapping |
| `src/lib/repositories/d1/subscription-plan.ts` | Plan definitions |

### Validation

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/subscription.ts` | Subscription schemas |

### Constants

| File | Purpose |
|------|---------|
| `src/constants/billing.ts` | Plan types, pricing |
| `src/constants/invoice.ts` | Invoice constants |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/subscriptions` | Subscription management |
| `POST /api/subscriptions/[id]/pause` | Pause subscription |
| `POST /api/subscriptions/[id]/resume` | Resume subscription |
| `GET/POST /api/payment-methods` | Card/Boleto management |
| `POST /api/billing/portal-session` | Stripe portal |
| `POST /api/webhooks/stripe` | Stripe webhooks |

### UI

| Page | Purpose |
|------|---------|
| `/admin/billing` | Billing dashboard |
| `/admin/billing/subscriptions` | Subscription list |
| `/admin/billing/transactions` | Transaction history |
| `/admin/invoices` | Invoice management |
| `/parent/billing` | Parent billing view |
| `/parent/billing/subscribe` | New subscription flow |
| `/teacher/invoice` | Teacher earnings |

---

## 13. Trial Tracking (AULA_TESTE)

**Flow:** Lead → AULA_TESTE student → 30 days → Contract sent → Accept/Decline → ATIVO/INATIVO

### Database Columns (students table)

| Column | Purpose |
|--------|---------|
| `trial_started_at` | When trial began |
| `trial_contract_status` | NULL, PENDING, ACCEPTED, DECLINED |
| `trial_contract_sent_at` | When contract was sent |
| `trial_contract_responded_at` | When parent responded |
| `trial_contract_type` | MONTHLY, SEMESTER, ANNUAL |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/trial-automator.ts` | Trial period logic |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/trial-contracts` | List trial students |
| `POST /api/trial-contracts/:studentId` | Send contract |
| `PUT /api/trial-contracts/:studentId` | Accept/decline |

### UI

| Page | Purpose |
|------|---------|
| `/admin/users` | "Aula Teste" tab |

---

## 14. Historical Integrity

**Pattern:** Type 2 SCD (Slowly Changing Dimension) with valid_from/valid_to

### Database Tables

| Table | Purpose |
|-------|---------|
| `enrollment_status_history` | Enrollment status audit |
| `student_status_history` | Student status audit |
| `teacher_availability_history` | Availability audit |

### Validation

| File | Purpose |
|------|---------|
| `src/lib/validation/historical-constraints.ts` | Historical lock rules |

### Rules

- Classes >30 days old are locked (cannot edit)
- Feedback must be submitted within 24h for bonus
- Snapshots captured at completion time

---

## 15. Data Quality System

**Purpose:** Track and resolve data issues across entities

### Database Tables

| Table | Purpose |
|-------|---------|
| `data_issues` | Unified issue tracking |
| `travel_time_errors` | Travel-specific errors |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/data-issue-service.ts` | Issue management |
| `src/lib/services/travel-time-service.ts` | Error logging |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET/PUT /api/admin/data-issues/*` | Issue management |
| `GET/PUT /api/admin/travel-errors/*` | Travel error management |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/resolve-errors-client.ts` | Error resolution UI |
| `src/scripts/travel-errors-client.ts` | Travel error UI |

### UI

| Page | Purpose |
|------|---------|
| `/admin/resolve-errors` | Unified error resolution |
| `/admin/travel-errors` | Travel-specific errors |

---

## 16. Backup System

**Purpose:** Database backups via GitHub Actions with manual triggers and restore capability

### Database Tables

| Table | Purpose |
|-------|---------|
| `backup_metadata` | Track backup records, status, type |
| `deleted_backup_runs` | Prevent re-import of deleted backups |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/github-service.ts` | GitHub Actions API integration |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/backups` | List all backups |
| `POST /api/backups` | Trigger manual backup |
| `GET /api/backups/status` | Get backup statistics |
| `POST /api/backups/restore` | Trigger restore workflow |
| `DELETE /api/backups/[id]` | Delete backup record |
| `POST /api/webhooks/backup-status` | GitHub webhook for status updates |

### UI

| Page | Purpose |
|------|---------|
| `/admin/backups` | Backup management dashboard |

### GitHub Workflows

| File | Purpose |
|------|---------|
| `.github/workflows/backup-daily.yml` | Scheduled daily backups |
| `.github/workflows/restore-backup.yml` | Database restoration |

---

## 17. System Closures

**Purpose:** School holidays, closures that cancel all classes on specific dates. City-specific closures only affect students in that city.

### Database Tables

| Table | Purpose |
|-------|---------|
| `system_closures` | Closure dates with optional city filter |
| `students` | Student city field used for closure matching |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/closure.ts` | CRUD for closures |

### Validation

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/closure.ts` | `CreateClosureSchema` |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/closures` | List closures |
| `POST /api/admin/closures` | Create closure |
| `DELETE /api/admin/closures/[id]` | Delete closure |

### UI

| Page | Purpose |
|------|---------|
| `/admin/closures` | Closure management |

### Components

| Component | Purpose |
|-----------|---------|
| `ClosureIcon.astro` | Holiday indicator in schedule |

### Integration Points

- `schedule-generator.ts` - Filters closures by student city (not teacher day zones)
  - Uses `normalizeCity()` and `citiesMatch()` for city comparison
  - Requires `studentCities` map in schedule options
- `exception.ts` - Creates HOLIDAY exceptions automatically

### City Matching Logic

Closures use `city_id` (e.g., "balneario", "florianopolis") while students use full names (e.g., "Balneário Camboriú", "Florianópolis"). The system normalizes and matches:
- Removes accents: "Florianópolis" → "florianopolis"
- Supports prefix matching: "balneario" matches "Balneário Camboriú"

---

## 18. Time-Off Requests

**Purpose:** Teacher vacation and sick day requests with approval workflow

### Database Tables

| Table | Purpose |
|-------|---------|
| `teacher_time_off_requests` | Request records with status |

### Repositories

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/time-off.ts` | CRUD for time-off requests |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/teacher/time-off` | List teacher's requests |
| `POST /api/teacher/time-off` | Submit new request |
| `GET /api/admin/time-off-requests` | List pending requests |
| `PUT /api/admin/time-off-requests/[id]` | Approve/reject request |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/time-off-approvals-client.ts` | Admin approval UI |
| `src/scripts/teacher-schedule-client.ts` | Teacher request submission |

### UI

| Page | Purpose |
|------|---------|
| `/admin/time-off-approvals` | Approve/reject requests |
| `/teacher/time-off` | Teacher's request history |
| `/teacher/schedule` | Request submission modal |

### Integration Points

- Creates enrollment exceptions for approved dates
- Notifications sent on approval/rejection

---

## 19. Settings & Theme

**Purpose:** Application settings and theme customization

### Database Tables

| Table | Purpose |
|-------|---------|
| `app_settings` | Key-value settings store |

### Constants

| File | Purpose |
|------|---------|
| `src/constants/theme.ts` | Theme variable definitions |
| `src/constants/config.ts` | App configuration |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/settings` | Get all settings |
| `PUT /api/settings` | Update settings |
| `GET /api/settings/theme` | Get theme settings |
| `PUT /api/settings/theme` | Update theme |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/settings-client.ts` | Settings page interactions |
| `src/scripts/theme-editor-client.ts` | Theme customization UI |

### UI

| Page | Purpose |
|------|---------|
| `/admin/settings` | Application settings |
| `/admin/theme-editor` | Visual theme customization |

### Styles

| File | Purpose |
|------|---------|
| `src/styles/theme.css` | CSS variable definitions |
| `src/styles/global.css` | Global styles using variables |

---

## 20. Account Linking (OAuth)

**Purpose:** Google/Microsoft OAuth login and parent-student linking

### Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with OAuth provider |
| `sessions` | Active login sessions |
| `parent_links` | OAuth email → student relationships |

### Auth Flow

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Session management, role checks |
| `src/middleware.ts` | Route protection |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/auth/login` | Initiate OAuth flow |
| `GET /api/auth/callback/google` | Google OAuth callback |
| `GET /api/auth/callback/microsoft` | Microsoft OAuth callback |
| `POST /api/auth/logout` | End session |
| `GET /api/auth/csrf` | Get CSRF token |
| `GET /api/admin/account-links` | List parent-student links |
| `POST /api/admin/account-links` | Create manual link |
| `DELETE /api/admin/account-links/[id]` | Remove link |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/account-links-client.ts` | Link management UI |

### UI

| Page | Purpose |
|------|---------|
| `/login` | OAuth login page |
| `/admin/account-links` | Parent-student link management |

---

## 21. LGPD Compliance

**Purpose:** Brazilian data protection law compliance - data export and deletion

### Database Tables

| Table | Purpose |
|-------|---------|
| `lgpd_consent` | User consent records |
| `lgpd_deletion_requests` | Data deletion requests |
| `lgpd_export_requests` | Data export requests |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/lgpd/my-data` | Export user's data |
| `POST /api/lgpd/deletion-request` | Request data deletion |
| `GET /api/admin/lgpd/deletion-requests` | List pending deletions |
| `POST /api/admin/lgpd/deletion-requests/[id]/process` | Process deletion |
| `GET /api/admin/lgpd/export-requests` | List export requests |

### Integration Points

- All PII fields are encrypted (see #9 Location/Address)
- Audit log tracks all data access
- Parent portal shows consent status

---

## 22. Import/Export Data

**Purpose:** Bulk data import from spreadsheets, export to Google Sheets

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/google-sheets.ts` | Google Sheets API integration |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/import/teachers` | Bulk import teachers |
| `POST /api/admin/import/students` | Bulk import students |
| `POST /api/admin/import/leads` | Bulk import leads |
| `GET /api/admin/export/enrollments` | Export to CSV |
| `POST /api/admin/sync-sheets` | Sync with Google Sheets |

### UI

| Page | Purpose |
|------|---------|
| `/admin/import-data` | Import wizard |

### Validation

- Import validates all rows before committing
- Duplicate detection by email/phone
- Error report for failed rows

---

## 23. Cron Jobs

**Purpose:** Scheduled background tasks

### API Endpoints (Cron Triggers)

| Endpoint | Purpose | Schedule |
|----------|---------|----------|
| `POST /api/cron/auto-complete` | Auto-complete past classes | Every 15 min |
| `POST /api/cron/pausado-check` | Transition PAUSADO → ATIVO | Daily |
| `POST /api/cron/aviso-check` | Transition AVISO → INATIVO | Daily |
| `POST /api/cron/trial-warnings` | Send trial expiry warnings | Daily |
| `POST /api/cron/payment-reminders` | Send payment reminders | Daily |
| `POST /api/cron/feedback-penalties` | Apply feedback penalties | Daily |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/auto-completion-service.ts` | Class auto-completion logic |
| `src/lib/services/pausado-automator.ts` | PAUSADO status transitions |
| `src/lib/services/aviso-automator.ts` | AVISO status transitions |
| `src/lib/services/trial-automator.ts` | Trial period management |

### Cloudflare Configuration

| File | Purpose |
|------|---------|
| `wrangler.toml` | Cron trigger definitions |

---

## 24. Re-encryption

**Purpose:** Rotate encryption keys for PII data

### UI

| Page | Purpose |
|------|---------|
| `/admin/re-encrypt` | Key rotation wizard |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/re-encrypt/preview` | Preview affected records |
| `POST /api/admin/re-encrypt/execute` | Execute re-encryption |

### Process

1. Set new `ENCRYPTION_KEY_NEW` in environment
2. Preview shows count of records to re-encrypt
3. Execute decrypts with old key, encrypts with new
4. Swap `ENCRYPTION_KEY` and `ENCRYPTION_KEY_NEW`
5. Remove old key

### Affected Tables

- `teachers` (email, phone, cpf, pix_key, address)
- `students` (address, allergies, parent_*, parent2_*)
- `leads` (address, parent_cpf)

---

## 25. Returning Students

**Purpose:** Re-enrollment workflow for previously inactive students

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/returning-student-service.ts` | Re-enrollment logic |

### Workflow

1. Find inactive student by email/phone
2. Preserve historical data
3. Create new enrollment with fresh status
4. Link to same parent account

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/students/[id]/reactivate` | Reactivate student |
| `GET /api/admin/students/returning` | List potential returners |

### Integration Points

- Lead conversion checks for existing inactive students
- Maintains enrollment history for reporting

---

## 26. BILIN Feedback System

**Purpose:** Track student language skills with 5-pillar assessment (Speaking, Listening, Reading, Writing, Grammar)

### Database Columns (class_completions table)

| Column | Purpose |
|--------|---------|
| `bilin_pilar` | Which pillar was focused on |
| `bilin_pilar_score` | Score 1-5 for focused pillar |
| `bilin_speaking`, `bilin_listening`, etc. | Individual pillar scores |
| `bilin_notes` | Teacher notes on progress |
| `feedback_status` | PENDING, SUBMITTED, SKIPPED |
| `feedback_submitted_at` | When feedback was given |

### Components

| Component | Purpose |
|-----------|---------|
| `src/components/SkillProgressBars.astro` | Visual progress bars for each pillar |
| `src/components/SkillRatingInput.astro` | Star/number rating input |
| `src/components/PillarBadges.astro` | Pillar indicator badges |
| `src/components/PillarSelector.astro` | Pillar selection UI |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/completions/[id]/feedback` | Submit BILIN feedback |
| `GET /api/students/[id]/progress` | Get student's skill history |
| `GET /api/teacher/feedback-pending` | List classes needing feedback |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/class-edit-client.ts` | Feedback form in class edit modal |
| `src/scripts/teacher-schedule-client.ts` | Quick feedback submission |

### UI Integration

| Page | Purpose |
|------|---------|
| `/teacher/schedule` | Feedback prompt after class completion |
| `/teacher/student/[id]` | Student progress history |
| `/parent/students` | Parent view of child's progress |

### Business Rules

- Feedback bonus: +1 credit point if submitted within 24h
- Feedback penalty: -1 credit point if skipped after 48h
- BILIN scores contribute to student progress reports

---

## 27. Change Request System

**Purpose:** Track and approve profile changes from teachers and parents

### Database Tables

| Table | Purpose |
|-------|---------|
| `change_requests` | Pending change requests |

### Services

| File | Purpose |
|------|---------|
| `src/lib/change-requests.ts` | Change request utilities, field mappings |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/change-requests` | List pending requests |
| `POST /api/change-requests` | Submit change request |
| `PUT /api/change-requests/[id]` | Approve/reject request |
| `GET /api/admin/profile-changes` | Admin view of all changes |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/profile-changes-client.ts` | Admin approval UI |
| `src/scripts/approvals-client.ts` | General approval handling |

### UI

| Page | Purpose |
|------|---------|
| `/admin/profile-changes` | View/approve profile changes |
| `/admin/approvals` | Legacy approval page |
| `/teacher/profile` | Submit profile changes |
| `/parent/profile` | Submit parent info changes |

### Change Types

- **Teacher**: Address, phone, email, banking (CPF/PIX), teaching preferences
- **Student**: Address, parent info, class preferences
- **Auto-approved**: Non-critical changes (notes, etc.)
- **Requires approval**: Address (affects travel), banking info

---

## 28. Waitlist System

**Purpose:** Automatic matching of waitlisted leads to available teacher slots

### Database Tables

| Table | Purpose |
|-------|---------|
| `leads` | Leads with `status = 'WAITLIST'` |
| `slot_offers` | Offers sent to waitlisted leads |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/waitlist-matcher.ts` | Auto-match algorithm |
| `src/lib/services/slot-offer-service.ts` | Create/manage offers |
| `src/lib/services/lead-matching.ts` | Score teacher-lead compatibility |

### Matching Algorithm

1. Find WAITLIST leads with availability windows
2. Find teachers with matching LIVRE slots
3. Score by: travel time, language match, format match, schedule fit
4. Create slot offers for top matches
5. Teacher approves → Parent accepts → Convert to enrollment

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/cron/waitlist-match` | Trigger matching job |
| `GET /api/offers` | List offers |
| `PUT /api/offers/[id]` | Accept/decline offer |

### Offer Statuses

```
pending_teacher → teacher_approved → pending_parent → accepted/declined
                → teacher_rejected
```

---

## 29. Audit Logging

**Purpose:** Track all data changes for compliance and debugging

### Database Tables

| Table | Purpose |
|-------|---------|
| `audit_log` | All tracked changes |

### Logged Events

| Event Type | What's Logged |
|------------|---------------|
| `CREATE` | New records (enrollments, students, etc.) |
| `UPDATE` | Field changes with old/new values |
| `DELETE` | Record deletions |
| `STATUS_CHANGE` | Status transitions |
| `LOGIN` | User authentication |
| `EXPORT` | Data exports (LGPD) |

### Schema

| Column | Purpose |
|--------|---------|
| `id` | Unique log ID |
| `user_id` | Who made the change |
| `action` | CREATE, UPDATE, DELETE, etc. |
| `entity_type` | Table/entity affected |
| `entity_id` | Record ID |
| `old_value` | JSON of previous state |
| `new_value` | JSON of new state |
| `ip_address` | Request origin |
| `created_at` | Timestamp |

### Integration

- All repository methods log changes automatically
- Middleware captures user context
- Retention: 2 years (LGPD requirement)

---

## 30. Component Library

**Purpose:** Reusable UI components following design system

### Form Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `FormField.astro` | Input wrapper with label/error | type, name, label, required, error |
| `Button.astro` | Styled button | variant, size, disabled, loading |
| `CheckboxGroup.astro` | Multiple checkboxes | options, name, selected |
| `BirthdayPicker.astro` | Date picker for DOB | value, name |

### Layout Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `Card.astro` | Content container | title, padding |
| `Modal.astro` | Dialog overlay | id, title, size |
| `StepperModal.astro` | Multi-step modal | steps, currentStep |
| `EmptyState.astro` | No data placeholder | icon, message, action |

### Data Display

| Component | Purpose | Props |
|-----------|---------|-------|
| `Table.astro` | Data table | columns, data, sortable |
| `FilterableTable.astro` | Table with filters | columns, data, filters |
| `StatusBadge.astro` | Colored status pill | status, size |
| `StatsCard.astro` | Metric display | label, value, trend |

### Navigation

| Component | Purpose | Props |
|-----------|---------|-------|
| `Nav.astro` | Main navigation | role, currentPath |
| `NotificationBell.astro` | Notification indicator | count |
| `ActionCard.astro` | Clickable action card | title, description, href |

### Design System Integration

```css
/* All components use CSS variables */
--color-primary, --color-secondary, --color-surface
--spacing-xs, --spacing-sm, --spacing-md, --spacing-lg
--radius-sm, --radius-md, --radius-lg
--shadow-sm, --shadow-md, --shadow-card
```

See `src/styles/theme.css` for full variable list.

---

## 31. Calendar Views

**Purpose:** Monthly and weekly calendar displays for scheduling

### Components

| Component | Purpose |
|-----------|---------|
| `MonthCalendar.astro` | Monthly grid view |
| `WeeklyScheduleGrid.astro` | Weekly time grid |
| `WeeklySchedulePreview.astro` | Compact week preview |
| `BookingGrid.astro` | Interactive booking calendar |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/calendar/[teacherId]` | Teacher's calendar data |
| `GET /api/calendar/month` | Monthly overview |
| `GET /api/schedule/[teacherId]` | Generated schedule |

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/weekly-schedule-grid-client.ts` | Grid interactions |
| `src/scripts/booking-grid-client.ts` | Booking selection |

### Data Structure

```typescript
interface CalendarDay {
  date: string;           // YYYY-MM-DD
  classes: ClassBlock[];  // Scheduled classes
  closures: Closure[];    // Holidays
  available: boolean;     // Has LIVRE slots
}
```

---

## 32. Scheduling Analytics

**Purpose:** Analyze demand patterns and optimize teacher schedules

### UI

| Page | Purpose |
|------|---------|
| `/admin/scheduling-analytics` | Analytics dashboard |

### Metrics Tracked

| Metric | Purpose |
|--------|---------|
| Hot Times | Most requested time slots |
| Cold Times | Underutilized slots |
| Teacher Utilization | % of LIVRE slots filled |
| Zone Distribution | Classes by neighborhood |
| Cancellation Patterns | When/why classes are cancelled |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/analytics/hot-times` | Demand heatmap data |
| `GET /api/admin/analytics/utilization` | Teacher utilization |
| `GET /api/admin/analytics/cancellations` | Cancellation stats |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/route-efficiency-service.ts` | Route optimization analysis |

---

## 33. Invoice/Earnings Calculations

**Purpose:** Calculate teacher earnings and parent invoices

### Constants

| File | Purpose |
|------|---------|
| `src/constants/invoice.ts` | Rate tables, billing rules |
| `src/constants/billing.ts` | Plan pricing |

### Teacher Earnings

| Factor | Calculation |
|--------|-------------|
| Base Rate | `hourly_rate` from enrollment |
| Group Discount | Individual=100%, Group of 2=78%, Group of 3+=64% |
| Tier Bonus | Based on credit points (1-5% bonus) |
| Cancellation Credit | 50% if student cancels <24h |

### Parent Billing

| Factor | Calculation |
|--------|-------------|
| Monthly Fee | Sum of (weekly_classes × 4.33 × rate) |
| Individual Rate | R$150 per class |
| Group Rate | R$125 per student (2+ students) |
| Online Rate | R$150 per class |
| Reschedule Credits | 2/month included |
| Late Cancel Fee | Charged at student's current rate |

> **See also:** [Section 35. Pricing/Rates](#35-pricingrates) for complete file list when changing rates.

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/teacher/invoice/[month]` | Teacher's monthly earnings |
| `GET /api/parent/invoice/[month]` | Parent's monthly invoice |
| `GET /api/admin/invoices` | All invoices |

### UI

| Page | Purpose |
|------|---------|
| `/teacher/invoice` | Teacher earnings view |
| `/parent/invoice` | Parent billing view |
| `/admin/invoices` | Invoice management |

---

## 34. Dev Tools

**Purpose:** Development and debugging utilities

### UI

| Page | Purpose |
|------|---------|
| `/admin/dev/notifications` | Test notification sending |
| `/debug-session` | View session/auth info |
| `/design-system` | Component showcase |
| `/test/address-autocomplete` | Test address lookup |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/dev/send-test-notification` | Send test notification |
| `GET /api/dev/session` | Debug session info |
| `POST /api/dev/reset-demo` | Reset demo data |

### Environment Checks

```typescript
// Only available when ENVIRONMENT !== 'production'
if (import.meta.env.ENVIRONMENT === 'development') {
  // Dev tools enabled
}
```

### Useful Debug Pages

- `/flows` - Visual flow diagrams
- `/design-system` - All components with examples

---

## 35. Pricing/Rates

**Purpose:** Central mapping of all files containing class pricing/rate constants. **Update ALL these files when rates change.**

### Current Rates (as of 2026-01-22)

| Class Type | Parent Rate | In Centavos |
|------------|-------------|-------------|
| **Individual (Presencial)** | R$150 | 15000 |
| **Group (2+ students)** | R$125/student | 12500 |
| **Online** | R$150 | 15000 |

### Primary Constants Files (MUST UPDATE)

| File | Constants | Purpose |
|------|-----------|---------|
| `src/lib/services/group-service.ts` | `GROUP_RATE`, `INDIVIDUAL_RATE` | Core rate calculations |
| `src/constants/billing.ts` | `PRICING.GROUP_CLASS_CENTAVOS`, `PRICING.INDIVIDUAL_CLASS_CENTAVOS` | Billing in centavos |
| `src/constants/invoice.ts` | `PARENT_GROUP_RATE`, `PARENT_INDIVIDUAL_RATE` | Invoice display |

### Related Services (Use Constants)

| File | Purpose |
|------|---------|
| `src/lib/services/group-cancellation-service.ts` | Late cancellation billing (uses `original_rate` for fairness) |
| `src/lib/services/enrollment-service.ts` | Rate calculations for enrollments |
| `src/lib/services/reschedule-suggestion-service.ts` | Reschedule billing |

### Tests to Update

| File | What to Update |
|------|----------------|
| `src/lib/services/group-service.test.ts` | `GROUP_RATE` assertions, mock `hourly_rate` values |
| `src/lib/services/group-cancellation-service.test.ts` | Billing amount expectations |
| `src/lib/repositories/d1/completion.test.ts` | `actual_rate` mock values |
| `src/lib/contracts/api-contracts.test.ts` | `hourly_rate` in mock data |
| `src/tests/api/enrollments/group/[groupId]/status.test.ts` | `GROUP_RATE` mock |
| `src/tests/api/enrollments/[id]/start-class.test.ts` | `actual_rate` mock values |
| `src/tests/api/enrollments/[id]/completions/index.test.ts` | `actual_rate` mock values |

### Documentation to Update

| File | Section |
|------|---------|
| `docs/reference/feature-maps.md` | Section 7, 33, 35 (this section) |
| `eduschedule-app/project-context.md` | Recent Changes |

### Rate Change Billing Rules

**Group 2→1 Scenario (rate change workflow):**
- When one student cancels from group of 2, remaining student faces rate change
- If remaining student cancels LATE (<24h): **Charged at ORIGINAL group rate (R$125)**
- NOT charged at new individual rate (R$150) - fairness rule
- Code: `group-cancellation-service.ts` uses `pendingChoice.original_rate`

### Checklist for Rate Changes

```
□ Update src/lib/services/group-service.ts (GROUP_RATE, INDIVIDUAL_RATE)
□ Update src/constants/billing.ts (PRICING.GROUP_CLASS_CENTAVOS)
□ Update src/constants/invoice.ts (PARENT_GROUP_RATE)
□ Update all test files (search for old rate values)
□ Update docs/reference/feature-maps.md (sections 7, 33, 35)
□ Update eduschedule-app/project-context.md (Recent Changes)
□ Run tests: npm run test
```

---

## 36. Autentique Contract Signing

Digital contract signing for MATRICULA / REMATRICULA enrollment terms via Autentique GraphQL API.

### Database Tables
- `contracts` - Contract records with Autentique integration data

### TypeScript Interfaces
- `src/lib/repositories/types.ts` - `Contract`, `ContractDocStatus`, `ContractType`, `CreateContractData`, `IContractRepository`, `ContractNotFoundError`
- `src/lib/contracts/types.ts` - `SendStudentContractData`, `AutentiqueConfig`

### Repositories
- `src/lib/repositories/d1/contract.ts` - `D1ContractRepository`

### Services
- `src/lib/services/contract-service.ts` - `ContractService` (generate, send, batch, poll, webhook, cancel, preview)
- `src/lib/services/matricula-service.ts` - `getOrCreateMatriculaNumber()` (assigns persistent structured matricula number on first contract)

### Database (Matricula)
- `students.matricula_number` - Persistent matricula number (e.g. `Nº12260001`)
- `matricula_sequence` table - Global counter for sequential number assignment

### Providers
- `src/lib/contracts/autentique-provider.ts` - `AutentiqueContractProvider` (GraphQL + multipart upload)
- `src/lib/contracts/templates/termo-matricula.ts` - HTML template for PDF contract rendering (`ContractTemplateData` includes `planType` for quinzenal-aware frequency display)
- `src/lib/contracts/templates/bilin-logo.ts` - Base64-encoded Bilin logo for contract PDF

### Validation
- `src/lib/validation/contract.ts` - `CreateContractsSchema`, `BatchSendSchema`, `ContractIdSchema`

### API Endpoints
- `src/pages/api/admin/contracts/index.ts` - GET (list) / POST (create DRAFT)
- `src/pages/api/admin/contracts/preview.ts` - GET preview rendered HTML (no DB record)
- `src/pages/api/admin/contracts/[id]/index.ts` - GET single contract
- `src/pages/api/admin/contracts/[id]/send.ts` - POST send to Autentique
- `src/pages/api/admin/contracts/[id]/cancel.ts` - POST cancel contract
- `src/pages/api/admin/contracts/[id]/poll-status.ts` - GET poll status
- `src/pages/api/admin/contracts/batch-send.ts` - POST batch generate + send
- `src/pages/api/webhooks/autentique.ts` - Webhook handler (HMAC-SHA256)

### Client Scripts
- `src/scripts/contracts-page-client.ts` - Search, multi-select, batch send, contract preview, Autentique dashboard link

### UI
- `src/pages/admin/contracts.astro` - Admin contracts page
- `src/styles/admin-contracts.css` - Page styles (CSS variables only)

### Constants
- `src/constants/ui.ts` - `CONTRACT_STATUS_LABELS`, `CONTRACT_TYPE_LABELS`, NAV_LINKS entry

### Key Behaviors
- **Auto-cancel:** Sending a new contract auto-cancels older SENT/VIEWED contracts for the same student (DB + Autentique API)
- **Deduplication:** Admin UI shows only the latest contract per student in main table; older contracts in collapsed section
- **Webhook-driven status:** Autentique webhooks update VIEWED/SIGNED/REJECTED status automatically (no manual polling)
- **Signing URL:** Autentique returns `link: null` for email delivery method; dashboard link used instead
- **Frequency display:** Template shows "Frequência mensal:" with "Quinzenal (1ª Semana)" or "Quinzenal (2ª Semana)" for quinzenal plan_type (using `quinzenalWeek`), or "N aula(s) por semana" for semanal
- **Contract quinzenal_week:** `contract-service.ts` queries `quinzenal_week` from enrollments and passes it to `ContractTemplateData.quinzenalWeek`
- **Contract modality:** Uses `group_id` (not `class_format` text) to determine Individual vs Grupo for accurate modality display

### Environment
- `wrangler.toml` - `AUTENTIQUE_SANDBOX` env var
- Secrets: `AUTENTIQUE_API_TOKEN`, `AUTENTIQUE_WEBHOOK_SECRET`

---

## 37. Admin Calendar Events

**Core concept:** Admin-created calendar events with one-time, weekly, or date-range recurrence. Events use a many-to-many model via `admin_event_members` junction table, allowing shared events between admins. Displayed across all admin calendar views (week, month, day, all-admins). Supports all-day events and timed events. Click-for-details modal with edit and delete capability. Individual admin views filter to show events where that admin is a member.

### Database
- **`admin_events`** table - Stores events with recurrence type, time range, all-day flag. Legacy `admin_id` column kept for SQLite compat.
- **`admin_event_members`** table - Junction table for many-to-many admin membership. Composite PK (event_id, admin_id). ON DELETE CASCADE.
- Migrations: `087_admin_events.sql`, `090_admin_events_all_day.sql`, `091_admin_events_color.sql`, `092_admin_event_members.sql`

### TypeScript / Repository
- `src/lib/repositories/d1/admin-event.ts` - `D1AdminEventRepository`. `AdminEvent` has `admin_ids: string[]` from junction table. All queries use `GROUP_CONCAT` join. `create()` / `update()` sync junction rows.
- `src/constants/enrollment-statuses.ts` - `ID_PREFIXES.ADMIN_EVENT = 'evt_'`

### Validation
- `src/lib/validation/admin-event.ts` - `CreateAdminEventSchema` / `UpdateAdminEventSchema` use `admin_ids: z.array(z.string()).min(1)`. Conditional refinements per recurrence type.

### Services
- `src/lib/services/admin-event-expander.ts` - `expandAdminEvents()` expands raw DB events into concrete date instances. `ExpandedAdminEvent` has `admin_ids: string[]`.

### API Endpoints
- `src/pages/api/admin/events/index.ts` - GET (list/filter by `admin_ids.includes()`), POST (create with `admin_ids[]`)
- `src/pages/api/admin/events/[id].ts` - GET, PUT (accepts `admin_ids[]`), DELETE

### UI Pages
- `src/pages/admin/enrollments.astro` - "+ Adicionar" button, event creation modal (sends single POST with `admin_ids[]`), event detail modal (shows multiple admin chips), edit mode (pre-populates all admins), admin filtering (`.filter(e => e.admin_ids.includes(adminFilter))`)

### UI Components (Modified)
- `src/components/views/AdminWeekView.astro` - Banner row with all-day tags + closure badges, timed event blocks, `data-event-json` click targets
- `src/components/views/AdminMonthView.astro` - All-day solid bars, timed event bars, `data-event-json` click targets
- `src/components/views/AdminDayView.astro` - All-day banner section, timed event cards, `data-event-json` click targets
- `src/components/views/AllAdminsView.astro` - All-day events fill full day column (7-18h) in mini-week grids

### Styles
- `src/styles/booking-page.css` - `.admin-cal-event` block styles (cursor pointer), `.admin-events-toolbar`
- Each view component has scoped styles for admin event rendering (indigo #6366f1 theme), all-day tags/bars/banners

---

## 38. ICS Calendar Feed

**Purpose:** Subscribable ICS feed URL for viewing admin calendar events in external apps (Google Calendar, Apple Calendar, Outlook).

### Database Tables

| Table | Purpose |
|-------|---------|
| `calendar_feed_tokens` | SHA-256 hashed tokens for feed auth (one per admin) |

### Repository

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/calendar-feed-token.ts` | `create()`, `findByAdminId()`, `findByTokenHash()`, `deleteByAdminId()` |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/ics-generator.ts` | Generate RFC 5545 ICS strings from expanded events |
| `src/lib/services/admin-event-expander.ts` | Expand recurring events to concrete dates (shared with calendar views) |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/calendar-feed` | Check if admin has active token |
| `POST /api/admin/calendar-feed` | Generate new token (replaces old) |
| `DELETE /api/admin/calendar-feed` | Revoke token |
| `GET /api/calendar/feed.ics?token=<raw>` | Public ICS feed (token auth) |

### Client Scripts

| File | Functions |
|------|-----------|
| `src/scripts/settings-client.ts` | `generateCalendarFeed()`, `regenerateCalendarFeed()`, `revokeCalendarFeed()`, `copyCalendarFeedUrl()` |

### UI

| Page | Purpose |
|------|---------|
| `/admin/settings` | "Calendário Externo" section with generate/copy/revoke UI |

---

## 39. Constants & Configurable Settings Registry

**Purpose:** Master registry of ALL business constants, where they're defined, where they're consumed, and known hardcoded duplicates. Use this to ensure consistency when changing any business rule or rate.

> **When adding a new constant:** Add it here. When finding a hardcoded value: check here first, then add the file to the consumer list.

### 39.1 Pricing — Parent Rates

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `PARENT_INDIVIDUAL_RATE` | 150 (R$) | `constants/invoice.ts` | Individual presencial rate |
| `PARENT_GROUP_RATE` | 125 (R$) | `constants/invoice.ts` | Group presencial rate per student |
| `PARENT_INDIVIDUAL_ONLINE_RATE` | 120 (R$) | `constants/invoice.ts` | Individual online rate |
| `PARENT_GROUP_ONLINE_RATE` | 120 (R$) | `constants/invoice.ts` | Group online rate per student |
| `INDIVIDUAL_CLASS_CENTAVOS` | 15000 | `constants/billing.ts` | Individual presencial (centavos) |
| `GROUP_CLASS_CENTAVOS` | 12500 | `constants/billing.ts` | Group presencial (centavos) |
| `INDIVIDUAL_RATE` | 150 | `services/group-service.ts` | Used in rate calculations |
| `GROUP_RATE` | 125 | `services/group-service.ts` | Used in rate calculations |
| `getParentRate()` | function | `constants/invoice.ts` | Returns correct rate by online+group flags |

**Consumers:**

| File | How It's Used |
|------|---------------|
| `pages/admin/invoices.astro` | Invoice calculations via `getParentRate()` |
| `services/group-service.ts` | `calculateEffectiveRate()` |
| `services/group-cancellation-service.ts` | Late cancellation billing (uses `original_rate`) |
| `services/enrollment-service.ts` | Rate calculations for new enrollments |
| `services/contract-service.ts` | Contract pricing display |
| `contracts/templates/termo-matricula.ts` | Contract PDF rate display |
| `pages/parent/invoice.astro` | Parent billing display |
| `pages/parent/cancel-choice.astro` | Rate change decision UI |
| `lib/stripe/config.ts` | Stripe subscription pricing |

**⚠️ Known Hardcoded Duplicates (need fixing):**

| File | Line | Value | Issue |
|------|------|-------|-------|
| `scripts/enrollments-page-client.ts` | ~3813 | `GROUP_RATE = 125; INDIVIDUAL_RATE = 150` | Duplicated from constants (client-side) |
| `scripts/enrollments-page-client.ts` | ~1059 | `classData.hourlyRate \|\| 150` | Fallback should use constant |
| `pages/parent/cancel-choice.astro` | ~574 | `data.amount \|\| 150` | Fallback should use constant |
| `pages/parent/index.astro` | ~1578 | `'R$ 150'` | Hardcoded string |
| `pages/api/enrollments/[id]/start-class.ts` | ~209 | `actualRate = 150` | Should use INDIVIDUAL_RATE |

---

### 39.2 Pricing — Teacher Tier Rates

| Tier | Score Range | Individual | Group (per student) | Defined In |
|------|-----------|-----------|---------------------|-----------|
| NEW | 0–499 | R$79 | R$50 | `services/teacher-credits.ts` |
| STANDARD | 500–699 | R$85 | R$58 | `services/teacher-credits.ts` |
| PREMIUM | 700–899 | R$90 | R$65 | `services/teacher-credits.ts` |
| ELITE | 900–1000 | R$95 | R$70 | `services/teacher-credits.ts` |

**Legacy centavos (ELITE only):**

| Constant | Value | Defined In |
|----------|-------|-----------|
| `TEACHER_INDIVIDUAL_CENTAVOS` | 9500 | `constants/billing.ts` |
| `TEACHER_GROUP_CENTAVOS` | 7000 | `constants/billing.ts` |

**Consumers:**

| File | How It's Used |
|------|---------------|
| `services/teacher-credits.ts` | `getTierForScore()`, `getRatesForTier()` |
| `constants/invoice.ts` | Teacher pay calculations |
| `pages/admin/invoices.astro` | Teacher payroll calculations |
| `pages/teacher/invoice.astro` | Teacher earnings display |

---

### 39.3 Pricing — Enrollment Fee & Discounts

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| Matrícula fee | R$150 (15000 centavos) | `contracts/templates/termo-matricula.ts` | Contract enrollment fee |
| `PLAN_DISCOUNTS.monthly` | 0% | `constants/billing.ts` | Monthly plan — no discount |
| `PLAN_DISCOUNTS.semester` | 10% | `constants/billing.ts` | Semester plan discount |
| `PLAN_DISCOUNTS.annual` | 15% | `constants/billing.ts` | Annual plan discount |

**Consumers:** `lib/stripe/config.ts`, `constants/billing.ts` (`calculateDiscount()`, `calculateFinalAmount()`)

---

### 39.4 Pricing — Stripe Payment Fees

| Constant | Value | Defined In |
|----------|-------|-----------|
| `CREDIT_CARD_PERCENT` | 3.99% | `constants/billing.ts` |
| `CREDIT_CARD_FIXED_CENTAVOS` | 39 (R$0.39) | `constants/billing.ts` |
| `BOLETO_FIXED_CENTAVOS` | 349 (R$3.49) | `constants/billing.ts` |
| `PIX_PERCENT` | 0.99% | `constants/billing.ts` |

**Consumers:** `lib/stripe/config.ts`, billing display components

---

### 39.5 Status Durations

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `PAUSADO_MAX_DAYS` | 21 | `constants/enrollment-statuses.ts` | 3 weeks max pause |
| `AVISO_MAX_DAYS` | 14 | `constants/enrollment-statuses.ts` | 2 weeks warning period |
| `PAUSADO_COOLDOWN_MONTHS` | 5 | `constants/enrollment-statuses.ts` | Months before can pause again |
| `TRIAL_DURATION_DAYS` | 30 | `constants/enrollment-statuses.ts` | Trial class period |
| `TRIAL_WARNING_DAYS` | 7 | `constants/enrollment-statuses.ts` | Days before trial expiry warning |

**Consumers:**

| File | How It's Used |
|------|---------------|
| `services/status-machine.ts` | Expiry calculations |
| `services/pausado-automator.ts` | Auto-transition PAUSADO → ATIVO |
| `services/aviso-automator.ts` | Auto-transition AVISO → INATIVO |
| `services/schedule-page-service.ts` | `calculateProjectedStatus()` week projection |
| `scripts/enrollments-page-client.ts` | Timeline display (⚠️ uses hardcoded 21/14) |
| `pages/admin/enrollments.astro` | Warning messages |
| `pages/admin/pausado-approvals.astro` | History display |
| `services/trial-automator.ts` | Trial period management |

---

### 39.6 Billing Rule Constants

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `CANCELLATION_NOTICE_HOURS` | 24 | `constants/billing.ts` | Hours required for free cancellation |
| `MAX_RESCHEDULE_CREDITS_PER_MONTH` | 1 | `constants/billing.ts` | Monthly reschedule limit |
| `RESCHEDULE_CREDIT_EXPIRY_DAYS` | 30 | `constants/billing.ts` | Days before credit expires |
| `PAYMENT_GRACE_PERIOD_DAYS` | 7 | `constants/billing.ts` | Days before subscription paused |
| `AUTO_COMPLETION_OFFSET_HOURS` | 0 | `constants/billing.ts` | Hours before class end to auto-complete |
| `TEACHER_CONFIRMATION_WINDOW_HOURS` | 48 | `constants/billing.ts` | Hours teacher has to confirm class |
| `TRIAL_PERIOD_DAYS` | 30 | `constants/billing.ts` | Paid trial period |
| `MIN_GROUP_SIZE_FOR_GROUP_RATE` | 2 | `constants/billing.ts` | Minimum students for group pricing |
| `FREE_CANCELLATION_REASONS` | array | `constants/billing.ts` | Reasons that never get charged |

**Consumers:** `services/group-cancellation-service.ts`, `services/auto-completion-service.ts`, `services/payment-grace-service.ts`, `pages/api/parent/reschedule-class.ts`, `pages/api/enrollments/[id]/exceptions/*`

---

### 39.7 Teacher Credit & Gamification Points

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `CLASS_COMPLETED` | +5 | `services/teacher-credits.ts` | Points for completing a class |
| `CLASS_CONFIRMED_EARLY` | +3 | `services/teacher-credits.ts` | Early confirmation bonus |
| `CLASS_CONFIRMED_LATE` | -2 | `services/teacher-credits.ts` | Late confirmation penalty |
| `PARENT_FEEDBACK_POSITIVE` | +10 | `services/teacher-credits.ts` | Positive parent feedback |
| `PARENT_FEEDBACK_NEGATIVE` | -15 | `services/teacher-credits.ts` | Negative parent feedback |
| `PUNCTUALITY_BONUS` | +2 | `services/teacher-credits.ts` | On-time start bonus |
| `PUNCTUALITY_PENALTY` | -5 | `services/teacher-credits.ts` | Late start penalty |
| `FEEDBACK_ON_TIME` | +1 | `services/teacher-credits.ts` | BILIN feedback submitted on time |
| `FEEDBACK_LATE` | 0 | `services/teacher-credits.ts` | BILIN feedback submitted late |
| `FEEDBACK_MISSED` | -1 | `services/teacher-credits.ts` | BILIN feedback not submitted |
| `NO_SHOW_ON_TIME` | +1 | `services/teacher-credits.ts` | No-show reported on time |
| `NO_SHOW_LATE` | 0 | `services/teacher-credits.ts` | No-show reported late |
| `DEFAULT_NEW_TEACHER_SCORE` | 300 | `services/teacher-credits.ts` | Starting score for new teachers |
| Grandfathered teacher score | 950 (ELITE) | `services/teacher-credits.ts` | Existing teachers default |

**Tier Score Thresholds:** NEW 0–499, STANDARD 500–699, PREMIUM 700–899, ELITE 900–1000

**Consumers:** `services/teacher-credits.ts`, `pages/teacher/invoice.astro`, `pages/admin/invoices.astro`

---

### 39.8 Travel & Matching Constants

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `MAX_TRAVEL_MINUTES` | 45 | `constants/matching.ts` | Maximum acceptable travel time |
| `CLOSE_TRAVEL_MINUTES` | 15 | `constants/matching.ts` | "Close" travel threshold |
| `WARNING_TRAVEL_MINUTES` | 30 | `constants/matching.ts` | Warning threshold |
| `MIN_GAP_BETWEEN_CLASSES` | 15 | `constants/matching.ts` | Minimum gap minutes |
| `TIME_ROUNDING_MINUTES` | 15 | `constants/matching.ts` | Round travel to nearest N min |
| `TRAVEL_BUFFER_MINUTES` | 5 | `constants/matching.ts` | Extra buffer per direction |
| `MIN_SLOT_FOR_BOOKING` | 60 | `constants/matching.ts` | Minimum slot size for booking |
| `DEFAULT_CLASS_DURATION` | 60 | `constants/matching.ts` | Standard class length |
| `MAX_DISTANCE_FROM_CENTER_KM` | 150 | `services/travel-time-service.ts` | Region bounds from Florianópolis |
| `CACHE_DURATION_DAYS` | 30 | `services/travel-time-service.ts` | Travel time cache TTL |
| `ANOMALY_HIGH_TIME_MINUTES` | 60 | `services/travel-time-service.ts` | Flag suspiciously high times |
| `ANOMALY_LOW_TIME_MINUTES` | 2 | `services/travel-time-service.ts` | Flag suspiciously low times |
| `SLOT_DURATION_MINUTES` | 60 | `services/slot-service.ts` | Default slot size |
| `SLOT_INCREMENT_MINUTES` | 30 | `services/slot-service.ts` | Slot grid increment |
| `RESERVATION_DURATION_SECONDS` | 300 | `services/slot-reservation-service.ts` | 5-min slot hold |
| `OFFER_EXPIRY_DAYS` | 7 | `services/slot-offer-service.ts` | Slot offer validity |
| `ADDRESS_CACHE_TTL` | 7 days | `services/address-autocomplete.ts` | Address cache TTL |

**Consumers:** `services/travel-time-service.ts`, `services/route-efficiency-service.ts`, `services/reschedule-suggestion-service.ts`, `services/slot-service.ts`, `services/slot-calculator.ts`, `services/lead-readiness-service.ts`, `pages/api/reschedule-suggestions/*`

**⚠️ Known Local Constants (not exported):**

| File | Constant | Value |
|------|----------|-------|
| `services/travel-time-service.ts` | `BATCH_SIZE` | 5 (API batch limit) |
| `services/route-efficiency-service.ts` | `BUFFER_ROUNDING` | 5 (minutes) |

---

### 39.9 Lead Matching & Scoring Weights

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `SAME_BUILDING` | 40 pts | `constants/matching.ts` | Location proximity — same building |
| `SAME_STREET` | 25 pts | `constants/matching.ts` | Location proximity — same street |
| `SAME_CEP_PREFIX` | 15 pts | `constants/matching.ts` | Location proximity — same CEP |
| `SAME_NEIGHBORHOOD` | 10 pts | `constants/matching.ts` | Location proximity — same neighborhood |
| `SAME_ZONE` | 5 pts | `constants/matching.ts` | Location proximity — same zone |
| `SCORE_THRESHOLD_HIGH` | 70 | `constants/matching.ts` | High match threshold |
| `SCORE_THRESHOLD_MEDIUM` | 40 | `constants/matching.ts` | Medium match threshold |

**Zone Buffers:** Same zone 5min, Adjacent 15min, Different 25min (in `constants/matching.ts`)

**Consumers:** `services/lead-readiness-service.ts`, `pages/admin/leads.astro`, `scripts/leads-page-client.ts`

---

### 39.10 Calendar & Schedule Settings

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `DAYS_AHEAD` | 90 | `constants/config.ts` | Calendar lookahead |
| `DAYS_BEHIND` | 7 | `constants/config.ts` | Calendar lookback |
| `MAX_EVENTS_PER_QUERY` | 250 | `constants/config.ts` | Query limit |
| `DEFAULT_EVENT_DURATION_MINUTES` | 60 | `constants/config.ts` | Default class length |
| `MIN_BUFFER_TIME_MINUTES` | 15 | `constants/config.ts` | Minimum travel buffer |
| `MAX_BUFFER_TIME_MINUTES` | 60 | `constants/config.ts` | Maximum travel buffer |
| `DEFAULT_BUFFER_TIME_MINUTES` | 30 | `constants/config.ts` | Default travel buffer |
| `DEFAULT_CLASS_DURATION_MINUTES` | 60 | `constants/enrollment-statuses.ts` | Standard class length |
| ICS feed lookback | 1 month | `pages/api/calendar/feed.ics.ts` | ICS feed range start |
| ICS feed lookahead | 12 months | `pages/api/calendar/feed.ics.ts` | ICS feed range end |

**⚠️ ICS feed window (1 month / 12 months) is hardcoded in `feed.ics.ts`, not in a constants file.**

---

### 39.11 Session, Rate Limits & Security

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `SESSION.MAX_AGE_DAYS` | 7 | `constants/config.ts` | Session duration |
| `SESSION.REFRESH_THRESHOLD_MS` | 300000 (5min) | `constants/config.ts` | Session refresh window |
| `RATE_LIMITS.AUTH` | 5 per 15min | `constants/config.ts` | Login attempt limit |
| `RATE_LIMITS.READ` | 60 per 60s | `constants/config.ts` | API read limit |
| `RATE_LIMITS.WRITE` | 30 per 60s | `constants/config.ts` | API write limit |
| `ENCRYPTION.ALGORITHM` | AES-GCM | `constants/config.ts` | Encryption algorithm |
| `ENCRYPTION.KEY_LENGTH` | 256 bits | `constants/config.ts` | Key length |

---

### 39.12 Validation Limits

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `MAX_NAME_LENGTH` | 100 | `constants/config.ts` | Name field max |
| `MAX_EMAIL_LENGTH` | 255 | `constants/config.ts` | Email field max |
| `MAX_PHONE_LENGTH` | 20 | `constants/config.ts` | Phone field max |
| `MAX_NOTES_LENGTH` | 1000 | `constants/config.ts` | Notes/text max |
| `MAX_ADDRESS_LENGTH` | 500 | `constants/config.ts` | Address field max |
| `MAX_FILE_SIZE_MB` | 5 | `constants/config.ts` | Upload file size limit |
| `PAGINATION.DEFAULT_PAGE_SIZE` | 20 | `constants/config.ts` | Default items per page |
| `PAGINATION.MAX_PAGE_SIZE` | 100 | `constants/config.ts` | Max items per page |
| `PAGINATION.MIN_PAGE_SIZE` | 5 | `constants/config.ts` | Min items per page |
| `MIN_AGE` | 0 | `constants/config.ts` | Student min age |
| `MAX_AGE` | 120 | `constants/config.ts` | Student max age |

---

### 39.13 Trash & Data Retention

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| Trash auto-purge | 90 days | `pages/api/students/index.ts` | ⚠️ **HARDCODED** — not in constants |
| Historical lock | 30 days | `validation/historical-constraints.ts` | Classes >30 days can't be edited |
| Feedback bonus window | 24h | `services/teacher-credits.ts` | Bonus for timely BILIN feedback |
| Feedback penalty delay | 48h | `services/teacher-credits.ts` | Penalty for missed feedback |
| Audit log retention | 2 years | (not enforced in code) | LGPD requirement |

---

### 39.14 Holiday & Closure Configuration

| Setting | Value | Defined In | Purpose |
|---------|-------|-----------|---------|
| Carnaval extension | -3d / +1d from Tuesday | `pages/api/admin/sync-holidays.ts` | Saturday–Wednesday |
| Semana Santa extension | -1d from Friday | `pages/api/admin/sync-holidays.ts` | Thursday–Friday |
| SC State Holiday | Aug 11 | `pages/api/admin/sync-holidays.ts` | Data Magna de SC |
| Florianópolis municipal | Mar 23 | `pages/api/admin/sync-holidays.ts` | City holiday |
| Balneário Camboriú municipal | Jul 20 | `pages/api/admin/sync-holidays.ts` | City holiday |
| Itajaí municipal | Jun 15 | `pages/api/admin/sync-holidays.ts` | City holiday |
| São José municipal | Mar 19 | `pages/api/admin/sync-holidays.ts` | City holiday |

**⚠️ All holiday configs are hardcoded in the sync endpoint, not in a constants file or database settings.**

---

### 39.15 Locale & Regional

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `TIMEZONE` | America/Sao_Paulo | `constants/config.ts` | App timezone |
| `DEFAULT_CITY` | Florianópolis | `constants/config.ts` | Default city |
| `DATE_FORMAT` | DD/MM/YYYY | `constants/config.ts` | Brazilian date format |
| `CURRENCY` | BRL | `constants/config.ts` | Brazilian Real |
| `LOCALE` | pt-BR | `constants/config.ts` | Language locale |

---

### 39.16 UI Timing & Debounce

| Constant | Value | Defined In | Purpose |
|----------|-------|-----------|---------|
| `DEBOUNCE.SEARCH` | 300ms | `constants/config.ts` | Search input delay |
| `DEBOUNCE.FILTER` | 200ms | `constants/config.ts` | Filter input delay |
| `DEBOUNCE.SAVE` | 1000ms | `constants/config.ts` | Auto-save delay |
| `TIMEOUTS.DEFAULT` | 30s | `constants/config.ts` | API call timeout |
| `TIMEOUTS.LONG` | 60s | `constants/config.ts` | Long operation timeout |
| `TIMEOUTS.NOTIFICATION` | 5s | `constants/config.ts` | Toast display time |
| `RETRY.MAX_ATTEMPTS` | 3 | `constants/config.ts` | API retry limit |
| `RETRY.INITIAL_DELAY_MS` | 1000 | `constants/config.ts` | First retry delay |
| `RETRY.MAX_DELAY_MS` | 10000 | `constants/config.ts` | Max retry delay |

---

### 39.17 Database-Backed Settings (Admin Configurable)

These are stored in the `app_settings` table and managed via `/admin/settings`:

| Setting Key | Source | Admin UI |
|-------------|--------|----------|
| `languages` | `constants/languages.ts` (60+ options) | ✅ Add/toggle/delete |
| `cities` | IBGE API (cascading state→city) | ✅ Add/toggle/delete |
| `class_modes` | `constants/class-settings.ts` | Category exists |
| `plan_types` | `constants/class-settings.ts` | Category exists |

**API:** `GET/POST/PUT/PATCH/DELETE /api/settings`
**Database:** `app_settings` table (`setting_key`, `setting_value`, `active`, `display_order`)

**Business Config (57 settings):** See [Section 40](#40-business-configuration-system) for the runtime-configurable `business_config` table system covering pricing, status durations, billing rules, travel, matching weights, and data retention.

---

### 39.18 Feature Flags

| Flag | Default | Defined In | Purpose |
|------|---------|-----------|---------|
| `PWA` | false | `constants/config.ts` | Progressive Web App |
| `OFFLINE_MODE` | false | `constants/config.ts` | Offline support |
| `ANALYTICS` | false | `constants/config.ts` | Usage analytics |
| `SERVICE_WORKER` | false | `constants/config.ts` | SW registration |
| `VIRTUAL_SCROLLING` | false | `constants/config.ts` | Large list optimization |
| `WEBSOCKETS` | false | `constants/config.ts` | Real-time updates |

---

### Constants File Index

| File | Categories Covered |
|------|--------------------|
| `src/constants/billing.ts` | Parent pricing (centavos), billing rules, plan discounts, Stripe fees, refund policy |
| `src/constants/invoice.ts` | Parent rates (R$), teacher pay tiers, invoice calculation helpers |
| `src/constants/enrollment-statuses.ts` | Status values, transitions, durations (PAUSADO/AVISO/trial), class duration |
| `src/constants/config.ts` | Session, rate limits, validation limits, calendar, pagination, locale, debounce, timeouts, retry, feature flags |
| `src/constants/matching.ts` | Location proximity weights, travel limits, zone buffers, scoring thresholds |
| `src/constants/theme.ts` | CSS variables, brand colors, component tokens |
| `src/constants/ui.ts` | Nav links, messages, labels, weekdays, cancellation reasons |
| `src/constants/languages.ts` | 72+ world languages with Portuguese labels |
| `src/constants/bilin.ts` | 7 pedagogical pillars, 6 skill dimensions, rating scale |
| `src/constants/class-settings.ts` | Class format (Individual/Grupo) and location (Presencial/Online) options |
| `src/constants/validation-messages.ts` | Zod error messages in Portuguese |
| `src/constants/user-forms.ts` | Form field metadata |
| `src/constants/api.ts` | API route paths, Google API URLs |
| `src/lib/services/teacher-credits.ts` | Teacher tier thresholds, tier rates, gamification point values |
| `src/lib/services/travel-time-service.ts` | Cache TTL, anomaly thresholds, region bounds |
| `src/lib/services/slot-service.ts` | Slot duration, increment |
| `src/lib/services/slot-reservation-service.ts` | Reservation hold duration |
| `src/lib/services/slot-offer-service.ts` | Offer expiry |
| `src/pages/api/admin/sync-holidays.ts` | Holiday extensions, municipal holiday dates |

---

## 40. Business Configuration System

**Core concept:** 57 runtime-configurable business settings stored in `business_config` table, replacing hardcoded constants for pricing, status durations, billing rules, travel/scheduling, lead matching weights, and data retention. All changes audited.

### Database Tables

| Table | Purpose | Migration |
|-------|---------|-----------|
| `business_config` | 57 settings across 8 categories with typed values and min/max bounds | 094 |
| `business_config_audit` | Change history with old/new values, admin email, timestamp | 094 |

### Categories (8)

| Category ID | Label | Settings |
|-------------|-------|----------|
| `pricing_parent` | Taxas de Pais | 5 (individual/group/online rates, enrollment fee) |
| `pricing_teacher` | Taxas de Professores | 12 (NEW/STANDARD/PREMIUM/ELITE tier rates + thresholds) |
| `plan_discounts` | Descontos por Plano | 3 (monthly/semester/annual discounts) |
| `status_durations` | Durações de Status | 5 (PAUSADO/AVISO days, cooldown, trial period) |
| `billing_rules` | Regras de Cobrança | 6 (cancellation window, reschedule credits, grace period) |
| `travel_scheduling` | Viagem e Agendamento | 5 (max travel, buffer, min gap, class duration) |
| `lead_matching` | Pesos de Matching | 5 (building/street/cep/neighborhood/zone weights) |
| `data_retention` | Retenção de Dados | 3 (trash purge, historical lock, feedback bonus) |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/services/business-config-service.ts` | `BusinessConfigRow`, `BusinessConfigAuditRow`, `CategoryMeta`, `GroupedBusinessConfig` |

### Service Layer

| File | Class/Function |
|------|----------------|
| `src/lib/services/business-config-service.ts` | `BusinessConfigService` — `getNumber()`, `getString()`, `getBoolean()`, `getAllGrouped()`, `setValue()`, `getAuditHistory()` |

### Validation

| File | Schema |
|------|--------|
| `src/lib/validation/business-config.ts` | `UpdateBusinessConfigSchema`, `AuditQuerySchema` |

### API Endpoints

| File | Endpoints |
|------|-----------|
| `src/pages/api/admin/business-config.ts` | `GET` (all grouped / audit history), `PUT` (update with validation) |

### Client Script

| File | Functions |
|------|-----------|
| `src/scripts/settings-client.ts` | `loadBusinessConfig()`, `renderBconfigCategory()`, `bconfigStartEdit()`, `bconfigSave()`, `bconfigShowAudit()` |

### UI

| File | Section |
|------|---------|
| `src/pages/admin/settings.astro` | Business Configuration section — 8 category tabs with inline editing and audit history modal |

### Cross-References

- **Section 39** — Constants that overlap with business_config values (pricing, durations, billing rules)
- **Section 19** — Settings page also manages languages, cities, calendar feed, data maintenance

---

## Quick Reference: Change Patterns

### Adding a new field to an entity

```
1. Migration:   database/migrations/NNN_add_field.sql
2. Types:       src/lib/repositories/types.ts (interface + CreateData + UpdateData)
3. Repository:  src/lib/repositories/d1/{entity}.ts (CRUD methods)
4. Validation:  src/lib/validation/{entity}.ts (Zod schema)
5. API:         src/pages/api/{entity}/... (endpoints)
6. Client:      src/scripts/{page}-client.ts (form handling)
7. UI:          src/pages/{role}/{page}.astro (display)
8. Docs:        docs/reference/data-models.md
```

### Adding a new status value

```
1. Constants:   src/constants/enrollment-statuses.ts (add to enum)
2. Database:    Migration to update CHECK constraint
3. UI:          StatusBadge.astro (add color/label)
4. Validation:  Update allowed values in schema
5. Services:    Update status-machine.ts transitions
```

### Adding a new notification type

```
1. Database:    Migration to update CHECK constraint on notifications
2. Types:       src/lib/repositories/types.ts (NotificationType enum)
3. Service:     src/lib/services/notification-service.ts (add method)
4. UI:          NotificationIcon.astro (add icon)
```

### Adding a new API endpoint

```
1. Route:       src/pages/api/{path}.ts
2. Validation:  src/lib/validation/{entity}.ts (if new schema)
3. Types:       Define request/response types
4. Docs:        docs/reference/api-contracts.md
```

---

## File Size Reference (Largest Files)

Understanding which files are most complex helps with maintenance:

| File | Size | Purpose |
|------|------|---------|
| `enrollments-page-client.ts` | 178KB | Admin enrollment management |
| `users-page-client.ts` | 125KB | Teacher/student management |
| `leads-page-client.ts` | 87KB | Lead pipeline |
| `teacher-schedule-client.ts` | 85KB | Teacher schedule |
| `notification-service.ts` | 77KB | Notification creation |
| `weekly-schedule-grid-client.ts` | 48KB | Schedule grid |
| `smart-booking-client.ts` | 43KB | Booking modal |

---

## Related Documentation

| Document | When to Use |
|----------|-------------|
| `data-models.md` | Database schema details |
| `api-contracts.md` | API endpoint documentation |
| `application-flows-v3.md` | System flow diagrams |
| `architecture.md` | System architecture |
| `business-context.md` | Business rules |
| `enrollment-rules-comprehensive.md` | Enrollment business logic |

---

**Last Updated:** 2026-01-31
