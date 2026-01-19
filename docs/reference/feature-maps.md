# Feature Maps - Cross-Cutting Impact Analysis

> **Purpose:** When modifying a feature, this document maps ALL code locations that need review. Prevents missed files during changes and helps understand how components connect.

**Last Updated:** 2026-01-20

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

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/lead-service.ts` | Lead CRUD and conversion |
| `src/lib/services/lead-matching.ts` | Match leads to teachers |
| `src/lib/services/lead-readiness-service.ts` | Score lead readiness |
| `src/lib/services/slot-offer-service.ts` | Manage slot offers |

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
Individual: R$140/hour
Group of 2: R$110/student
Group of 3+: R$90/student
```

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

**Auto-Grouping Logic (BookingGrid.astro lines 217-246):**
- Classes at same day+time are auto-grouped if they don't have a real `group_id`
- Auto-generated IDs start with `auto-group-*` (vs real UUIDs from database)
- `isRealGroup` check in modal: `classData.groupId && !classData.groupId.startsWith('auto-group-')`

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

**Includes:** Student profile, parent contacts (encrypted), BILIN feedback

### Database Tables

| Table | Purpose |
|-------|---------|
| `students` | Student profiles |
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

### Client Scripts

| File | Purpose |
|------|---------|
| `src/scripts/users-page-client.ts` | Student management |

### UI

| Page | Purpose |
|------|---------|
| `/admin/users` | Student management (tab) |
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

**Purpose:** School holidays, closures that cancel all classes on specific dates

### Database Tables

| Table | Purpose |
|-------|---------|
| `system_closures` | Closure dates with optional city filter |

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

- `schedule-generator.ts` - Skips classes on closure dates
- `exception.ts` - Creates HOLIDAY exceptions automatically

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
| Group Rate | 2 students=R$110, 3+=R$90 per student |
| Reschedule Credits | 2/month included |
| Late Cancel Fee | 50% of class rate |

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

**Last Updated:** 2026-01-20
