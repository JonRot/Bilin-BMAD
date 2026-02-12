# API Contracts - EduSchedule App

**Last Updated:** 2026-02-11
**Project:** Bilin App - EduSchedule
**API Type:** RESTful with Astro API Routes
**Endpoints:** 164 total

## Overview

The EduSchedule API provides endpoints for authentication, enrollment management, scheduling, lead pipeline, student/teacher management, availability, and system administration. All endpoints use JSON for request/response bodies and implement rate limiting, CSRF protection, and role-based authentication.

### Endpoint Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Authentication | 7 | Google/Microsoft OAuth, sessions, CSRF |
| Enrollments | 14 | CRUD, status, groups, exceptions, completions |
| Students | 10 | CRUD, search, class history, enrollments summary, timeline, t-shirt size |
| Teachers | 13 | CRUD, availability, time-off, day-zones, location-change |
| Users | 6 | Management, roles |
| Leads | 8 | Pipeline, matching, conversion, contracts |
| Offers | 5 | Waitlist auto-match offers |
| Schedule | 4 | Generation, views |
| Slots | 5 | Availability grid, reservations, matches |
| System | 5 | Closures, exceptions |
| Calendar | 4 | Google Calendar sync |
| Calendar Feed | 4 | ICS feed subscription (token management + public feed) |
| Admin | 29 | Approvals, geocoding, relocation, host-transfer, settings, stripe sync, invoice payments |
| Business Config | 3 | Runtime-configurable business settings with audit trail |
| Admin Events | 5 | Admin calendar events CRUD |
| Parent | 11 | Dashboard, cancellations, pausado, feedback, reschedule, location-host, smart suggestions, billing-profile |
| Notifications | 5 | List, read, read-all, push registration |
| Change Requests | 5 | CRUD, approve/reject |
| Settings | 6 | App configuration, theme |
| Locations | 2 | Autocomplete, reverse geocode |
| Travel Time | 3 | Calculate, matrix, travel-times |
| Contracts (Admin) | 6 | Autentique digital contract signing |
| Webhooks | 3 | JotForm, Stripe, Autentique |
| LGPD | 7 | Consent, data export, deletion |
| Subscriptions | 7 | CRUD, pause, resume |
| Payment Methods | 5 | CRUD, set default |
| Billing | 1 | Stripe Customer Portal |
| Completions | 3 | Teacher confirmation, report issues |
| Cron | 3 | Auto-completion, payment grace, feedback penalties |

## Authentication

All API endpoints (except `/api/auth/login`) require authentication via session cookies set during the OAuth flow.

### Rate Limiting

| Type | Limit | Window | Usage |
|------|-------|--------|-------|
| AUTH | 5 | 60s | Login, logout, OAuth |
| READ | 200 | 60s | GET requests |
| WRITE | 30 | 60s | POST, PUT, DELETE |
| CALENDAR | 50 | 60s | Google Calendar ops |
| WEBHOOK | 10 | 60s | Webhook endpoints (per IP) |

Rate limit responses return `429 Too Many Requests` with `Retry-After` header.

### CSRF Protection

All state-changing operations (POST, PUT, DELETE) require:
- `X-CSRF-Token` header with valid token
- Token obtained from `GET /api/auth/csrf`

---

## Authentication APIs

### GET /api/auth/login
Initiates Google OAuth 2.0 flow with PKCE.
- **Auth:** None
- **Response:** `302 Redirect` to Google OAuth

### GET /api/auth/callback
Handles OAuth callback, creates session.
- **Auth:** State validation
- **Response:** `302 Redirect` to role dashboard

### POST /api/auth/logout
Clears user session.
- **Auth:** None
- **Response:** `302 Redirect` to `/`

### GET /api/auth/csrf
Returns CSRF token for mutations.
- **Auth:** Required
- **Response:** `{ "token": "..." }`

---

## Enrollment APIs

### Status Lifecycle

Enrollments follow a state machine with these valid transitions:

| From Status | Valid Transitions | Notes |
|-------------|-------------------|-------|
| `WAITLIST` | `ATIVO`, `INATIVO` | Initial state for waitlisted students |
| `ATIVO` | `PAUSADO`, `AVISO`, `INATIVO` | Active enrollment |
| `PAUSADO` | `ATIVO`, `AVISO`, `INATIVO` | Temporary pause (max 21 days) |
| `AVISO` | `ATIVO`, `PAUSADO`, `INATIVO` | Termination warning (max 15 days) |
| `INATIVO` | _(none)_ | Terminal state |

**Edge Case Transitions:**
- **PAUSADO → AVISO:** Parent can be notified of potential termination while paused (e.g., payment issues during pause)
- **AVISO → PAUSADO:** Parent can request pause during warning period (e.g., to resolve payment/scheduling issues)

**Time-Based Auto-Transitions:**
- `PAUSADO` → `ATIVO`: Auto-transitions after 21 days (`PAUSADO_MAX_DAYS`)
- `AVISO` → `INATIVO`: Auto-transitions after 15 days (`AVISO_MAX_DAYS`)

**Cooldown Rules:**
- After exiting `PAUSADO`, a 3-month cooldown prevents re-entering (`PAUSADO_COOLDOWN_MONTHS`)
- Admins can override cooldown with `override_cooldown: true`

### GET /api/enrollments
List enrollments with filtering.
- **Auth:** Required
- **Roles:** Admin (all), Teacher (own), Parent (children)
- **Query Params:** `status`, `teacher_id`, `student_id`
- **Response:** Array of enrollments

### POST /api/enrollments
Create new enrollment.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "student_id": "stu_xxx",
  "teacher_id": "tea_xxx",
  "day_of_week": 1,
  "start_time": "14:00",
  "duration_minutes": 60,
  "language": "English",
  "hourly_rate": 150
}
```
- **Response:** `201 Created` with enrollment
- **Errors:** `409 SLOT_CONFLICT` if slot blocked

### GET /api/enrollments/[id]
Get single enrollment.
- **Auth:** Required (role-filtered)
- **Response:** Enrollment object

### PUT /api/enrollments/[id]
Update enrollment fields.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** Partial update (teacher_id, day_of_week, start_time, etc.)
  - `extend_availability`: boolean - Extend teacher availability if needed
  - `acknowledge_impact`: boolean - Proceed despite cascade impact (Story 6.5)
- **Response:** Updated enrollment OR `{ requires_confirmation: true, impact: CascadeImpact }` if changes affect other enrollments
- **Errors:** `409 SLOT_CONFLICT` if new slot blocked

### POST /api/enrollments/[id]/reschedule-preview
Preview cascade impact of proposed schedule change (Story 6.5).
- **Auth:** Admin only
- **Body:**
```json
{
  "day_of_week": 3,
  "start_time": "14:00",
  "duration_minutes": 60,
  "teacher_id": "tch_xxx"
}
```
- **Response:**
```json
{
  "has_blocking_conflicts": true,
  "has_impacts": true,
  "affected_family_count": 2,
  "affected_enrollments": [
    {
      "enrollment_id": "enr_xxx",
      "student_name": "Maria",
      "impact_type": "SLOT_CONFLICT",
      "impact_description": "Maria já tem aula neste horário"
    }
  ],
  "summary_message": "Esta alteração afeta 2 famílias..."
}
```

### PUT /api/enrollments/[id]/status
Change enrollment status.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "status": "PAUSADO",
  "reason": "Parent requested",
  "override_cooldown": false
}
```
- **Response:** Updated enrollment with pausado_details
- **Errors:** `422 PAUSADO_BLOCKED` if cooldown active

### DELETE /api/enrollments/[id]
Terminate an enrollment (soft delete).
- **Auth:** Admin only
- **CSRF:** Required
- **Response:** `{ "success": true, "message": "Enrollment terminated" }`

---

## Class Lifecycle APIs

### POST /api/enrollments/[id]/start-class
Mark when a teacher starts a class session.
- **Auth:** Teacher (own) or Admin
- **CSRF:** Required
- **Body:**
```json
{
  "class_date": "2025-12-15",
  "class_time": "14:00"
}
```
- **Response:**
```json
{
  "success": true,
  "completion": { "id": "cmp_xxx", "started_at": 1734278400, ... },
  "message": "Class started successfully. Parents have been notified."
}
```
- **Errors:**
  - `400 CLASS_DATE_NOT_TODAY` - Can only start classes scheduled for today
  - `400 CLASS_NOT_STARTED_YET` - Current time before scheduled time
  - `400 CLASS_ALREADY_STARTED` - Completion record already exists
  - `400 DUPLICATE_COMPLETION` - Already started
- **Notes:** Creates completion record with `started_at` timestamp, notifies parents

### POST /api/enrollments/[id]/complete-class
Finalize a class that was previously started.
- **Auth:** Teacher (own) or Admin
- **CSRF:** Required
- **Body:**
```json
{
  "class_date": "2025-12-15",
  "status": "COMPLETED",
  "notes": "Worked on vocabulary",
  "early_completion_reason": "STUDENT_SICK",
  "early_completion_details": "Optional details"
}
```
- **Response:**
```json
{
  "success": true,
  "completion": { "id": "cmp_xxx", "completion_type": "NORMAL", ... },
  "message": "Aula concluída com sucesso (65 minutos)."
}
```
- **Errors:**
  - `400 CLASS_NOT_STARTED` - Must start class first
  - `400 TOO_EARLY_TO_COMPLETE` - Must wait 15 minutes after start
  - `400 EARLY_COMPLETION_REASON_REQUIRED` - If <60 min, needs reason
  - `400 FEEDBACK_REQUIRED` - Normal completion needs notes
- **Early Completion Reasons:** `PARENT_NO_ANSWER`, `STUDENT_SICK`, `TECHNICAL_ISSUES`, `STUDENT_NOT_READY`, `OTHER`
- **Completion Types:** `NORMAL` (≥60 min), `EARLY` (<60 min), `NO_SHOW`

---

## Exception APIs

### GET /api/enrollments/[id]/exceptions
List exceptions for enrollment.
- **Auth:** Required (role-filtered)
- **Response:** Array of exceptions

### POST /api/enrollments/[id]/exceptions
Create exception (cancellation/reschedule).
- **Auth:** Required
- **CSRF:** Required
- **Roles:**
  - Parent: Only `CANCELLED_STUDENT`
  - Teacher: Only `CANCELLED_TEACHER` (requires approval)
  - Admin: Any type
- **Body:**
```json
{
  "exception_date": "2025-12-15",
  "exception_type": "CANCELLED_STUDENT",
  "reason": "Student sick"
}
```

### PUT /api/enrollments/[id]/exceptions/[excId]
Approve/reject teacher cancellation.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "action": "approve" }` or `{ "action": "reject" }`

---

## Reschedule Suggestions API (Story 6.7)

### GET /api/enrollments/[id]/suggestions
Get AI-powered reschedule suggestions for a cancelled class.
- **Auth:** Admin only
- **Query Params:**
  - `date` (required): Original class date being rescheduled (YYYY-MM-DD)
  - `weeks` (optional): Number of weeks to look ahead (1-4, default 2)
  - `limit` (optional): Maximum suggestions to return (1-20, default 10)
- **Response:**
```json
{
  "suggestions": [
    {
      "type": "SAME_TEACHER_FREE",
      "date": "2026-01-08",
      "day_of_week": 3,
      "start_time": "09:00",
      "end_time": "10:00",
      "teacher_id": "tea_xxx",
      "teacher_name": "Maria S.",
      "score": 92,
      "score_breakdown": {
        "travel_efficiency": 0.95,
        "parent_preference": 0.85,
        "time_proximity": 0.90,
        "conflict_free": true
      },
      "reason": "Same teacher, fits existing route on Wednesday",
      "warnings": []
    }
  ],
  "cancelled_slots": [
    {
      "type": "OTHER_CANCELLED",
      "enrollment_id": "enr_yyy",
      "student_name": "João P.",
      "date": "2026-01-08",
      "start_time": "14:00",
      "end_time": "15:00",
      "teacher_id": "tea_xxx",
      "teacher_name": "Maria S.",
      "score": 78,
      "score_breakdown": { ... },
      "reason": "Cancelled by teacher, same neighborhood",
      "warnings": []
    }
  ],
  "enrollment": {
    "id": "enr_xxx",
    "student_name": "Sofia",
    "teacher_id": "tea_xxx",
    "teacher_name": "Maria S.",
    "day_of_week": 1,
    "start_time": "14:00"
  }
}
```
- **Suggestion Types:**
  - `SAME_TEACHER_FREE`: Teacher's available (LIVRE) slots
  - `OTHER_CANCELLED`: Cancelled slots from other students nearby
  - `EXTRA_SLOT`: Additional makeup slots outside regular schedule
- **Score Algorithm:**
  - Travel efficiency (40%): How well slot fits teacher's route
  - Parent preference (30%): Matches parent's availability windows
  - Time proximity (20%): Closer to original date = higher score
  - Conflict-free bonus (10%): No scheduling conflicts
- **Errors:**
  - `400 VALIDATION_ERROR`: Invalid enrollment ID or query params
  - `404 NOT_FOUND`: Enrollment not found

---

## Completion APIs

### GET /api/enrollments/[id]/completions
List completions for enrollment.
- **Auth:** Required (role-filtered)
- **Query Params:** `start_date`, `end_date`

### POST /api/enrollments/[id]/completions
Mark class as complete.
- **Auth:** Teacher (own) or Admin
- **CSRF:** Required
- **Body:**
```json
{
  "class_date": "2025-12-15",
  "class_time": "14:00",
  "status": "COMPLETED",
  "notes": "Worked on vocabulary"
}
```

### PUT /api/enrollments/[id]/completions/[cmpId]
Update class completion details (status, notes, BILIN pillars, skill ratings).
- **Auth:** Teacher (invoice lock) or Admin (no restrictions)
- **CSRF:** Required
- **Invoice Lock:** Teachers can edit until 10th of month following the class date
- **Body:**
```json
{
  "status": "COMPLETED" | "NO_SHOW",
  "notes": "Aula focada em vocabulário...",
  "bilin_pillars": ["play", "music"],
  "skill_ratings": { "criatividade": 4, "leitura": 3 }
}
```
- **Response:** Updated completion object

### POST /api/enrollments/[id]/add-to-group
Add a student to an existing enrollment's time slot, creating a group class.
- **Auth:** Admin only
- **CSRF:** Required (X-CSRF-Token header)
- **Rate Limit:** WRITE (stricter)
- **Body:**
```json
{
  "student_id": "stu_xxx",
  "is_location_host": false,
  "hourly_rate": 120,
  "language": "English",
  "notes": "Optional notes"
}
```
- **Behavior:**
  - If source enrollment has no group_id, one is generated
  - Creates new enrollment with same teacher/day/time
  - Sets location host appropriately
- **Response (201):**
```json
{
  "success": true,
  "enrollment": { "id": "enr_xxx", ... },
  "group": {
    "group_id": "grp_xxx",
    "members": [...],
    "size": 2
  }
}
```
- **Errors:**
  - 404: Source enrollment not found
  - 409: Student already enrolled at this time (DUPLICATE_ERROR)
  - 403: Not admin or CSRF invalid

### DELETE /api/enrollments/[id]/remove-from-group
Remove a student from a group class.
- **Auth:** Admin only
- **CSRF:** Required (X-CSRF-Token header)
- **Rate Limit:** WRITE (stricter)
- **Behavior:**
  - Sets the enrollment status to TERMINADO
  - If only one member remains after removal, clears group_id and converts to individual class
  - Re-assigns location host if removed member was the host
  - Full audit logging
- **Response (200):**
```json
{
  "success": true,
  "message": "Aluno removido do grupo.",
  "group": {
    "group_id": "grp_abc123",
    "members": [...],
    "size": 2,
    "converted_to_individual": false
  }
}
```
- **Errors:**
  - 400: Not in a group, or last member in group
  - 404: Enrollment not found
  - 403: Not admin or CSRF invalid

### GET /api/enrollments/group/[groupId]/status
Get group details and effective status.
- **Auth:** Admin only
- **Response:**
```json
{
  "group_id": "grp_abc123",
  "effective_group": {
    "groupId": "grp_abc123",
    "totalMembers": 3,
    "activeMembers": [
      { "enrollmentId": "enr_1", "studentId": "stu_1", "studentName": "Ana", "status": "ATIVO" }
    ],
    "effectiveSize": 2,
    "effectiveRate": 135
  },
  "rates": {
    "group_rate": 135,
    "individual_rate": 180
  }
}
```

### POST /api/enrollments/group/[groupId]/status
Batch status change for group members.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "enrollment_ids": ["enr_1", "enr_2"],
  "status": "PAUSADO",
  "override_cooldown": false,
  "new_location_host_id": "enr_3"
}
```
- **Behavior:**
  - Changes status for selected group members
  - Calculates rate impact before/after
  - Auto-transfers location host if needed (or returns candidates for selection)
  - Notifies remaining members of rate changes
- **Response:**
```json
{
  "group_id": "grp_abc123",
  "results": [
    { "enrollment_id": "enr_1", "student_name": "Ana", "previous_status": "ATIVO", "new_status": "PAUSADO", "success": true }
  ],
  "before": { "effective_size": 2, "effective_rate": 135 },
  "after": { "effective_size": 1, "effective_rate": 180, "effective_group": {...} },
  "rate_changed": true,
  "rates": { "group_rate": 135, "individual_rate": 180 },
  "host_transfer": {
    "requires_host_selection": false,
    "host_auto_transferred": { "enrollment_id": "enr_3", "student_name": "Carlos" }
  }
}
```
- **Errors:** `404 NOT_FOUND`, `400 VALIDATION_ERROR`

---

## Lead APIs

### GET /api/leads
List leads with filtering.
- **Auth:** Admin only
- **Query Params:** `status`, `neighborhood`, `language`
- **Response:** Leads array + pipeline stats

### POST /api/leads
Create new lead.
- **Auth:** Admin only
- **CSRF:** Required

### GET /api/leads/[id]
Get single lead details with decrypted address and CPF.
- **Auth:** Admin only
- **Response:**
```json
{
  "id": "lead_xxx",
  "student_name": "Ana",
  "parent_name": "Maria",
  "status": "NEW",
  "lat": -23.55,
  "lon": -46.64,
  "availability_windows_parsed": [{"day": 1, "start": "14:00", "end": "18:00"}],
  "address_decrypted": "Rua Example, 123",
  "parent_cpf": "123.456.789-00"
}
```
- **Errors:** `404 NOT_FOUND` if lead doesn't exist

### PUT /api/leads/[id]
Update lead details.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** Any fields from UpdateLeadSchema (student_name, parent_name, phone, address fields, lat, lon, etc.)
- **Response:** Updated lead object
- **Errors:** `404 NOT_FOUND`, `400 VALIDATION_ERROR`

### DELETE /api/leads/[id]
Delete a lead permanently.
- **Auth:** Admin only
- **CSRF:** Required
- **Response:** `{ deleted: true, id: "<lead_id>" }`
- **Errors:** `404 NOT_FOUND`, `400 VALIDATION_ERROR` (cannot delete CONTRACTED leads)

### GET /api/leads/[id]/matches
Get suggested teacher matches.
- **Auth:** Admin only
- **Query Params:** `limit`, `min_score`
- **Response:** Scored teacher matches

### POST /api/leads/[id]/convert
Convert lead to enrollment.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "teacher_id": "tea_xxx",
  "day_of_week": 2,
  "start_time": "15:00",
  "language": "English"
}
```
- **Response:** `201 Created` with lead, student, enrollment

### PUT /api/leads/[id]/status
Update lead status.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "status": "WAITLIST", "reason": "..." }`

---

## Offers API (Story 6.9)

Slot offers manage the waitlist auto-match workflow, sending offers to families when slots become available.

### GET /api/offers
List pending offers.
- **Auth:** Admin only
- **Query Params:** `teacher_id` (optional, filter by teacher)
- **Response:**
```json
{
  "offers": [
    {
      "id": "off_xxx",
      "teacher_id": "tea_xxx",
      "lead_id": "lea_xxx",
      "day_of_week": 1,
      "start_time": "09:00",
      "status": "pending",
      "match_score": 85,
      "student_name": "Sofia",
      "teacher_name": "Prof. Maria",
      "expires_at": 1735984800
    }
  ],
  "stats": {
    "pending": 5,
    "accepted": 12,
    "declined": 3,
    "expired": 2,
    "ghost": 1
  }
}
```

### POST /api/offers
Create a new offer from a suggestion.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "teacher_id": "tea_xxx",
  "lead_id": "lea_xxx",
  "day_of_week": 1,
  "start_time": "09:00",
  "duration_minutes": 60,
  "match_score": 85,
  "match_reason": { "type": "WAITLIST_FIT", "description": "..." }
}
```
- **Response:** `201 Created` with offer details

### GET /api/offers/[id]
Get offer details.
- **Auth:** Admin only
- **Response:** Full offer with lead and teacher details

### PUT /api/offers/[id]
Update offer status.
- **Auth:** Teacher (for teacher actions) or Admin (for admin actions)
- **CSRF:** Required
- **Body:**
```json
{
  "action": "teacher_approve",
  "reason": "optional rejection reason"
}
```

**Teacher Actions (requires teacher role):**
- `teacher_approve` - Approve offer, moves to `pending` status
- `teacher_reject` - Reject offer with optional reason

**Admin Actions (requires admin role):**
- `accept` - Accept offer, auto-creates student + enrollment
- `decline` - Family declined with optional reason
- `ghost` - Mark lead as unresponsive

**Response:** Updated offer with new status

### DELETE /api/offers/[id]
Cancel a pending offer.
- **Auth:** Admin only
- **CSRF:** Required
- **Response:** Cancelled offer with status = 'cancelled'

---

## Schedule APIs

### GET /api/schedule/[teacherId]
Get generated teacher schedule.
- **Auth:** Required
- **Query Params:** `start_date`, `end_date`
- **Response:** Array of ScheduleItem

### GET /api/schedule/student/[studentId]
Get generated student schedule.
- **Auth:** Required (parent must own student)
- **Response:** Array of ScheduleItem

---

## Slot APIs

### GET /api/slots/[teacherId]
Get teacher slot availability grid.
- **Auth:** Required
- **Roles:** Admin (full details), Teacher (own only), Parent (LIVRE slots only)
- **Query Params:** `include_weekends`, `start_hour`, `end_hour`, `start_date`, `end_date`
- **Response:**
```json
{
  "teacher_id": "tea_xxx",
  "teacher_name": "Prof. Maria",
  "slots": [
    { "day_of_week": 1, "time": "09:00", "status": "LIVRE" },
    { "day_of_week": 1, "time": "10:00", "status": "BLOCKED", "student_name": "Sofia", "enrollment_id": "enr_xxx" },
    { "day_of_week": 1, "time": "11:00", "status": "RESERVADO", "reservation_info": {
        "reservation_id": "res_xxx",
        "reserved_by_name": "Admin User",
        "expires_at": 1735380000,
        "seconds_remaining": 240,
        "time_remaining": "4:00",
        "is_own": true
      }
    }
  ]
}
```
- **Slot Statuses:** `LIVRE`, `BLOCKED`, `TEMPORARILY_AVAILABLE`, `RESERVADO`

### POST /api/slots/reserve
Reserve a slot for 5 minutes (movie theater pattern).
- **Auth:** Admin only
- **Headers:** `X-CSRF-Token` (required)
- **Request:**
```json
{
  "teacher_id": "tea_xxx",
  "day_of_week": 1,
  "start_time": "09:00",
  "duration_minutes": 60
}
```
- **Response (201):**
```json
{
  "success": true,
  "reservation": {
    "id": "res_xxx",
    "teacher_id": "tea_xxx",
    "day_of_week": 1,
    "start_time": "09:00",
    "duration_minutes": 60,
    "reserved_by_name": "Admin User",
    "reserved_at": 1735379700,
    "expires_at": 1735380000
  }
}
```
- **Response (409 - Already Reserved):**
```json
{
  "error": "ALREADY_RESERVED",
  "message": "Reservado por Admin User",
  "reserved_by_name": "Admin User",
  "expires_at": 1735380000,
  "time_remaining": "4:00"
}
```

### DELETE /api/slots/reserve
Release a slot reservation.
- **Auth:** Admin only (own reservations)
- **Headers:** `X-CSRF-Token` (required)
- **Request:**
```json
{
  "reservation_id": "res_xxx"
}
```
- **Response (200):**
```json
{
  "success": true,
  "message": "Reserva liberada"
}
```

### GET /api/slots/matches
Get smart student matches for a free slot.
- **Auth:** Admin only
- **Query Params:**
  - `teacherId` (required): Teacher ID
  - `dayOfWeek`: Day of week (0-6)
  - `startTime`: Slot start time (HH:MM)
  - `endTime`: Slot end time (HH:MM)
  - `prevLat`, `prevLon`, `prevNeighborhood`: Previous class location (optional)
  - `nextLat`, `nextLon`, `nextNeighborhood`: Next class location (optional)
  - `page`, `limit`: Pagination (default: page=1, limit=50, max=100)
- **Response:**
```json
{
  "waitlistMatches": [
    {
      "waitlist_id": "wl_xxx",
      "student_name": "João",
      "score": 85,
      "neighborhood": "Centro",
      "language": "English"
    }
  ],
  "availableStudents": [
    { "id": "stu_xxx", "name": "Maria", "neighborhood": "Jardins", "type": "existing_student" }
  ],
  "teacherLanguages": ["English", "Portuguese"],
  "slotInfo": { "dayOfWeek": 1, "startTime": "14:00", "endTime": "15:00" },
  "pagination": { "waitlist": { "total": 10, "page": 1, "hasMore": false }, ... }
}
```

### GET /api/slots/suggestions
Get waitlist suggestions for LIVRE slots with ghost/offer status (Story 6.9).
- **Auth:** Admin only
- **Query Params:**
  - `teacherId` (required): Teacher ID
  - `dayOfWeek`: Day of week (optional, returns all days if omitted)
  - `startTime`: Filter to specific slot start time HH:MM (optional)
  - `limit`: Max matches per slot (default: 5, max: 20)
  - `minScore`: Minimum match score (default: 60)
- **Response:**
```json
{
  "slotSuggestions": [
    {
      "slot_key": "1_14:00_16:00",
      "day_of_week": 1,
      "start_time": "14:00",
      "end_time": "16:00",
      "duration_minutes": 120,
      "suggestions": [
        {
          "lead_id": "wl_xxx",
          "waitlist_id": "wl_xxx",
          "student_name": "João",
          "score": 85,
          "score_breakdown": {
            "language": true,
            "zone": true,
            "schedule": true,
            "travel": "close"
          },
          "neighborhood": "Centro",
          "language": "English",
          "suggested_start": "14:00",
          "suggested_end": "15:00",
          "travel_from_prev_minutes": 15,
          "is_sequential_fit": true,
          "has_pending_offer": false,
          "is_ghost": false
        }
      ]
    }
  ],
  "totalSlots": 5,
  "totalSuggestions": 12
}
```
- **Notes:** Returns top waitlist matches with travel time calculations, ghost status, and pending offer detection for one-click offer creation

---

## System APIs

### GET /api/system/closures
List all system closures (FÉRIAS, HOLIDAY, WEATHER, EMERGENCY, CUSTOM).
- **Auth:** Admin only
- **Response:** Array of closure objects

### POST /api/system/closures
Create system closure.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "closure_type": "HOLIDAY",
  "name": "Christmas",
  "city_id": null,
  "start_date": "2025-12-25",
  "end_date": "2025-12-25"
}
```
- **Closure Types:** `FERIAS`, `HOLIDAY`, `WEATHER`, `EMERGENCY`, `CUSTOM`
- **Response:** `201 Created` with closure object

### DELETE /api/system/closures
Delete a system closure.
- **Auth:** Admin only
- **CSRF:** Required
- **Query Params:** `id` (required) - Closure ID
- **Response:** `{ "success": true }`
- **Errors:** `404 NOT_FOUND` if closure doesn't exist

### GET /api/exceptions/pending
List pending teacher cancellations awaiting approval.
- **Auth:** Admin only

---

## Calendar APIs

### GET /api/calendar/events
List Google Calendar events.
- **Auth:** Required
- **Query Params:** `teacherId`, `studentId`, `timeMin`, `timeMax`

### POST /api/calendar/events
Create calendar event.
- **Auth:** Required
- **CSRF:** Required

### PUT /api/calendar/events
Update calendar event.
- **Auth:** Required
- **CSRF:** Required

### DELETE /api/calendar/events
Delete calendar event.
- **Auth:** Required
- **CSRF:** Required
- **Query Params:** `id`

---

## Admin APIs

### GET /api/admin/sync-holidays
Preview Brazilian holidays (national + regional SC) for a given year.
- **Auth:** Admin only
- **Query Params:**
  - `year` (optional) - defaults to current year
  - `cities` (optional) - comma-separated city IDs: `florianopolis,balneario,itajai,sao_jose`
  - `includeNational` (optional) - defaults to `true`
- **Response:**
```json
{
  "year": 2026,
  "holidays": [
    { "date": "2026-01-01", "name": "Confraternização mundial", "type": "national", "exists": false },
    { "date": "2026-03-23", "name": "Aniversário de Florianópolis", "type": "municipal", "cityId": "florianopolis", "exists": false },
    { "date": "2026-08-11", "name": "Data Magna de Santa Catarina", "type": "state", "exists": true }
  ],
  "total": 15,
  "existing": 2,
  "toAdd": 13,
  "availableCities": ["florianopolis", "balneario", "itajai", "sao_jose"]
}
```
- **Notes:** National holidays from [BrasilAPI](https://brasilapi.com.br). SC state/municipal holidays stored locally.

### POST /api/admin/sync-holidays
Sync Brazilian holidays from BrasilAPI + local SC data and create closures.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "years": [2026, 2027],
  "includeNational": true,
  "cities": ["florianopolis", "itajai"]
}
```
- **Response:**
```json
{
  "success": true,
  "message": "15 feriado(s) adicionado(s) com sucesso!",
  "added": 15,
  "skipped": 0,
  "errors": 0,
  "holidays": ["Confraternização mundial (2026-01-01)", "Aniversário de Florianópolis (florianopolis) (2026-03-23)", "..."],
  "skippedHolidays": []
}
```
- **Notes:** Municipal holidays are created with `city_id` set. State holiday (Aug 11) added for any selected SC city. Skips existing closures.

### POST /api/admin/cancellations
Approve or reject teacher cancellation requests.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "action": "approve",
  "exception_id": "exc_xxx"
}
```
- **Actions:**
  - `approve` - Approve single cancellation (requires `exception_id`)
  - `reject` - Reject and delete cancellation (requires `exception_id`)
  - `approve_all_sick` - Bulk approve all cancellations with sick-related reasons
- **Response:** `{ "success": true, "message": "Cancellation approved" }`
- **Notes:** Sends notifications to both teacher and parent on approval/rejection

### POST /api/admin/geocode-single
Geocode a single address using Google Maps API.
- **Auth:** Admin only
- **CSRF:** Required
- **Query Params:** `address` (required) - Address to geocode (min 3 chars)
- **Response:**
```json
{
  "formatted": "Rua Augusta, 1234 - Consolação, São Paulo - SP",
  "street": "Rua Augusta",
  "number": "1234",
  "neighborhood": "Consolação",
  "city": "São Paulo",
  "state": "São Paulo",
  "state_code": "SP",
  "country": "Brazil",
  "postal_code": "01310-100",
  "lat": -23.5505,
  "lon": -46.6333
}
```
- **Errors:** `404` if no results found

### POST /api/admin/geocode-locations
Batch geocode multiple student/teacher locations.
- **Auth:** Admin only
- **CSRF:** Required
- **Notes:** Processes locations missing lat/lon coordinates

### POST /api/admin/stabilize-locations
Stabilize location coordinates in the database.
- **Auth:** Admin only
- **CSRF:** Required
- **Notes:** Normalizes and validates existing coordinate data

### POST /api/admin/validate-locations
Validate location data integrity.
- **Auth:** Admin only
- **CSRF:** Required
- **Notes:** Checks for invalid or inconsistent location data

### POST /api/admin/relocation-preview
Preview impact of teacher/student address change before applying.
- **Auth:** Admin only
- **Body:**
```json
{
  "entityType": "teacher|student",
  "entityId": "xxx",
  "newAddress": "Rua...",
  "newLat": -27.5954,
  "newLon": -48.5480,
  "newNeighborhood": "Centro"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "entityType": "teacher",
    "entityId": "xxx",
    "entityName": "Teacher Name",
    "oldLocation": { "lat": -27.59, "lon": -48.55, "neighborhood": "Trindade", "zone": "CENTRAL" },
    "newLocation": { "lat": -27.60, "lon": -48.54, "neighborhood": "Centro", "zone": "CENTRAL" },
    "totalEnrollments": 5,
    "affectedEnrollments": 2,
    "unaffectedEnrollments": 3,
    "impacts": [
      {
        "enrollmentId": "enr_xxx",
        "studentId": "stu_xxx",
        "studentName": "Student Name",
        "teacherId": "tea_xxx",
        "teacherName": "Teacher Name",
        "oldTravelMinutes": 25,
        "newTravelMinutes": 50,
        "travelChange": 25,
        "impactType": "OUT_OF_RANGE",
        "severity": "critical",
        "otherPartyLocation": { "neighborhood": "Ingleses", "zone": "NORTH" }
      }
    ],
    "suggestions": [
      {
        "enrollmentId": "enr_xxx",
        "suggestionType": "TRANSFER_TEACHER",
        "alternativeTeacherId": "tea_yyy",
        "alternativeTeacherName": "Alt Teacher",
        "alternativeTravelMinutes": 20,
        "reason": "Transfer to Alt Teacher (20min travel)"
      }
    ]
  }
}
```
- **Notes:** Used to preview relocation impact before updating teacher/student address. Called automatically when address changes in PUT /api/teachers/[id] or PUT /api/students/[id].

### POST /api/admin/import-students
Import students from CSV data.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** CSV data or file upload
- **Notes:** Bulk import with validation and duplicate detection

### POST /api/admin/cleanup-data
Clean up orphaned data.
- **Auth:** Admin only
- **CSRF:** Required

### POST /api/admin/re-encrypt-data
Re-encrypt PII with new key.
- **Auth:** Admin only
- **CSRF:** Required

### POST /api/admin/jotform-sync
Sync leads from JotForm CADASTRO BILIN form.
- **Auth:** Admin only
- **CSRF:** Required
- **Response:**
```json
{
  "success": true,
  "imported": 5,
  "skipped": 10,
  "errors": 0,
  "message": "Imported 5 new leads, skipped 10 existing"
}
```
- **Notes:** Fetches all submissions from JotForm and imports as leads, skipping duplicates by submission ID

### GET /api/admin/conflicts
Scan for scheduling conflicts across all active enrollments.
- **Auth:** Admin only
- **Response:**
```json
{
  "conflicts": [
    {
      "teacher_id": "tea_xxx",
      "teacher_name": "John",
      "day_of_week": 1,
      "day_label": "Segunda-feira",
      "enrollments": [
        { "id": "enr_1", "student_name": "Sofia", "start_time": "14:00", "end_time": "15:00" },
        { "id": "enr_2", "student_name": "Lucas", "start_time": "14:30", "end_time": "15:30" }
      ],
      "overlap_description": "14:30-15:00 overlap (30 min)"
    }
  ],
  "total_conflicts": 1
}
```

### GET /api/admin/hot-times-stats
Scheduling analytics: time slot demand vs supply analysis.
- **Auth:** Admin only
- **Response:**
```json
{
  "supply": {
    "byDay": { "1": 45, "2": 38, ... },
    "byPeriod": { "morning": 40, "afternoon": 80 },
    "total": 150
  },
  "demand": {
    "byDay": { "1": 60, "2": 45, ... },
    "byPeriod": { "morning": 80, "afternoon": 60 },
    "total": 180
  },
  "capacity": { ... },
  "gapAnalysis": { ... }
}
```
- **Notes:** Analyzes enrollment distribution (supply) vs lead availability windows (demand)

### GET /api/admin/waitlist-stats
Waitlist analytics for AI optimization panel.
- **Auth:** Admin only
- **Response:**
```json
{
  "total_active_leads": 45,
  "leads_by_status": { "WAITLIST": 30, "EM_ANALISE": 15 },
  "data_quality": {
    "with_coordinates": 35,
    "without_coordinates": 10,
    "with_availability": 40,
    "without_availability": 5
  },
  "matching_potential": {
    "ready_for_matching": 30,
    "needs_geocoding": 5,
    "needs_availability": 5
  }
}
```

### GET /api/admin/funnel/stats
Aggregated funnel analytics for the enrollment funnel dashboard.
- **Auth:** Admin only
- **Query Params:**
  - `period`: `30d` | `90d` | `6mo` | `1yr` | `custom` (default: 30d)
  - `start_date` (optional): ISO date for custom period
  - `end_date` (optional): ISO date for custom period
  - `source` (optional): Filter by referral_source
  - `income` (optional): Filter by family_income bracket
  - `language` (optional): Filter by language
  - `city` (optional): Filter by city
- **Response:** KPIs, funnel stages with conversion rates, breakdowns by source/income/language/neighborhood/month, aging alerts, Easy Win vs Regular, Returning vs First-Time, Family Expansion, Response Time, Retention stats, Language Trend

### GET /api/admin/monthly-stats
Monthly metrics for scheduling analytics dashboard.
- **Auth:** Admin only
- **Query Params:**
  - `year` (optional): Year to query (default: current year)
  - `month` (optional): Month to query, 1-12 (default: current month)
- **Response:**
```json
{
  "year": 2026,
  "month": 1,
  "monthLabel": "Janeiro 2026",
  "totalClasses": 245,
  "groupClasses": 80,
  "individualClasses": 145,
  "onlineClasses": 20,
  "presencialClasses": 225,
  "newLeads": 18,
  "totalCancellations": 12,
  "studentCancellations": 6,
  "teacherCancellations": 4,
  "adminCancellations": 2,
  "currentPausado": 5,
  "currentAviso": 3,
  "currentAtivo": 78,
  "comparison": {
    "classesChange": 8,
    "leadsChange": -5,
    "cancellationsChange": 20
  },
  "generated_at": 1706400000
}
```
- **Notes:** Provides monthly class counts (by format/location), new leads, cancellations, and current enrollment status counts. Includes month-over-month comparison percentages.

### GET /api/admin/optimizer
Global lead-teacher schedule optimizer. Optimizes all Easy Win leads simultaneously.
- **Auth:** Admin only
- **Query Params:**
  - `language` (optional): Filter leads by language (e.g., "Inglês")
- **Response:**
```json
{
  "proposals": [{
    "leadId": "led_xxx", "leadName": "João", "leadNeighborhood": "Trindade", "leadLanguage": "Inglês",
    "teacherId": "t_001", "teacherName": "Maria", "dayOfWeek": 2, "startTime": "14:00",
    "compositeScore": 85,
    "scoreBreakdown": { "language": 30, "location": 25, "route": 20, "sequential": 5, "priority": 5 },
    "travelFromPrev": 5, "travelToNext": 15, "routeQuality": "excellent"
  }],
  "unplaceable": [{ "leadId": "led_yyy", "leadName": "Ana", "reason": "Todos os slots compatíveis já foram alocados" }],
  "conflicts": [{ "slot": "Maria Ter 14:00", "competingLeads": [{ "leadId": "led_xxx", "leadName": "João", "score": 85, "assigned": true }] }],
  "summary": { "totalLeads": 12, "totalPlaced": 8, "totalUnplaceable": 4, "avgScore": 72, "avgTravelMinutes": 12 }
}
```
- **Notes:** Uses greedy assignment with composite scoring (language 30, location 25, route 25, sequential 10, priority 10). Identifies Easy Win leads via readiness scoring + batch slot matching. Approve proposals via `POST /api/leads/[id]/convert`.

### POST /api/admin/update-lead-statuses
Bulk update lead statuses from spreadsheet export.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "data": [
    { "ID": "led_xxx", "STATUS": "Agendado" },
    { "ID": "led_yyy", "STATUS": "Lista de Espera" }
  ]
}
```
- **Status Mapping:**
  - "Agendado" → CONTRACTED
  - "Aguardando Análise" → AGUARDANDO
  - "Atendimento Encerrado" → NOT_A_MATCH
  - "Follow Up" → EM_ANALISE
  - "Lista de Espera" → WAITLIST
- **Response:** `{ "success": true, "updated": 5, "skipped": 2 }`

---

## Backup APIs

### GET /api/backups
List all backup records.
- **Auth:** Admin only
- **Response:**
```json
{
  "backups": [
    {
      "id": "bkp_1234567890_abc123",
      "backup_type": "full",
      "description": "Backup Automático Diário - 16/01/2026",
      "status": "completed",
      "trigger_type": "scheduled",
      "github_run_id": "12345678901",
      "file_size": 1048576,
      "created_at": 1737043200
    }
  ]
}
```

### POST /api/backups
Create a new manual backup (triggers GitHub Actions workflow).
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "backup_type": "full",
  "description": "Manual backup before update",
  "tables_included": ["all"]
}
```
- **Response:** `{ "success": true, "backup_id": "bkp_xxx", "message": "Backup iniciado via GitHub Actions" }`

### DELETE /api/backups/[id]
Delete a backup record.
- **Auth:** Admin only
- **CSRF:** Required
- **Notes:** Records GitHub run ID in `deleted_backup_runs` table to prevent re-sync
- **Response:** `{ "success": true, "message": "Backup excluído com sucesso" }`

### POST /api/backups/restore
Restore database from a backup (triggers GitHub Actions workflow).
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "backup_id": "bkp_xxx",
  "confirmation": true
}
```
- **Response:**
```json
{
  "message": "Restauração iniciada via GitHub Actions. Isso pode levar alguns minutos.",
  "backup_id": "bkp_xxx",
  "safety_backup_id": "safety_xxx",
  "warning": "Um backup de segurança será criado automaticamente antes da restauração."
}
```
- **Notes:** Creates a safety backup before restore. Monitor progress in GitHub Actions.

### POST /api/backups/restore-webhook
Webhook endpoint for GitHub Actions to report restore status.
- **Auth:** GitHub webhook (X-GitHub-Event header required)
- **Body:**
```json
{
  "backup_id": "bkp_xxx",
  "status": "completed",
  "github_run_id": "12345678901",
  "message": "Database restored successfully"
}
```
- **Response:** `{ "success": true, "restore_log_id": "restore_xxx" }`

### POST /api/backups/sync
Sync GitHub workflow runs to backup_metadata table.
- **Auth:** Admin only
- **Notes:** Imports missing backup records from GitHub. Excludes deleted runs.
- **Response:**
```json
{
  "message": "Synced 5 backup(s) from GitHub",
  "synced": 5,
  "skipped": 0,
  "total_in_github": 15,
  "already_in_db": 8,
  "deleted_excluded": 2
}
```

---

## Admin Invoice APIs

### GET /api/admin/invoices/summary
Monthly invoice summary with revenue, payroll, and margin.
- **Auth:** Admin only
- **Query Params:** `year` (default: current), `month` (default: current)
- **Response:**
```json
{
  "year": 2026,
  "month": 1,
  "revenue": 15000,
  "payroll": 9500,
  "margin": 5500,
  "marginPercent": 36.67,
  "totalClasses": 85,
  "individualClasses": 50,
  "groupClasses": 35,
  "groupStudents": 78,
  "cancelledStudent": 5,
  "cancelledTeacher": 2,
  "cancelledAdmin": 1,
  "noShows": 3,
  "pausadoCount": 4,
  "avisoCount": 2,
  "comparison": {
    "revenueChange": 1200,
    "revenuePercent": 8.7,
    "payrollChange": 500,
    "payrollPercent": 5.5,
    "classesChange": 5,
    "classesPercent": 6.2,
    "prevRevenue": 13800,
    "prevPayroll": 9000,
    "prevClasses": 80
  }
}
```
- **Notes:**
  - Revenue = parent billing (R$150 individual, R$120 group per student)
  - Payroll = teacher earnings (tiered rates by teacher tier)
  - Margin = revenue - payroll
  - Comparison is null if no data for previous month

### GET /api/admin/invoices/parents
Parent billing breakdown for a given month.
- **Auth:** Admin only
- **Query Params:** `year`, `month`
- **Response:**
```json
{
  "year": 2026,
  "month": 1,
  "parents": [
    {
      "parentEmail": "joh***@email.com",
      "parentName": "João Silva",
      "studentCount": 2,
      "students": [
        {
          "studentId": "stu_xxx",
          "studentName": "Sofia",
          "teacherId": "tea_xxx",
          "teacherName": "Maria",
          "language": "Inglês",
          "dayOfWeek": 1,
          "startTime": "14:00",
          "status": "ATIVO",
          "completed": 4,
          "noShows": 1,
          "cancelledStudent": 0,
          "cancelledTeacher": 0,
          "cancelledAdmin": 0,
          "individualClasses": 3,
          "groupClasses": 2,
          "individualTotal": 450,
          "groupTotal": 240,
          "totalAmount": 690
        }
      ],
      "totalDue": 1380,
      "paymentStatus": "PENDENTE"
    }
  ],
  "totalFamilies": 25,
  "totalRevenue": 15000
}
```
- **Notes:** Parent emails are masked for display (e.g., `joh***@email.com`)

### GET /api/admin/invoices/teachers
Teacher payroll breakdown for a given month.
- **Auth:** Admin only
- **Query Params:** `year`, `month`
- **Response:**
```json
{
  "year": 2026,
  "month": 1,
  "teachers": [
    {
      "teacherId": "tea_xxx",
      "teacherName": "Maria Santos",
      "tier": "ELITE",
      "tierLabel": "Elite",
      "creditScore": 950,
      "individualRate": 95,
      "groupRate": 70,
      "pixKey": "****1234",
      "individualClasses": 20,
      "groupClasses": 10,
      "groupStudents": 25,
      "noShows": 2,
      "cancelledTeacher": 1,
      "cancelledStudent": 2,
      "individualTotal": 1900,
      "groupTotal": 1750,
      "totalEarnings": 3650,
      "statusImpacts": [
        {
          "studentId": "stu_xxx",
          "studentName": "Lucas",
          "status": "PAUSADO",
          "dayOfWeek": 3,
          "startTime": "15:00",
          "language": "Inglês"
        }
      ],
      "activeEnrollments": 15,
      "pausadoCount": 1,
      "avisoCount": 0
    }
  ],
  "totalTeachers": 8,
  "totalPayroll": 9500
}
```
- **Notes:**
  - PIX keys are masked (only last 4 digits shown)
  - Group earnings = groupRate × groupStudents (deduplicated by time slot)
  - statusImpacts shows students affecting teacher income

### GET /api/admin/invoice-payments
Get payment statuses for parent invoices in a given month.
- **Auth:** Admin only
- **Query Params:** `year` (required), `month` (required, 1-12)
- **Response:**
```json
{
  "payments": [
    {
      "id": "pay_xxx",
      "parent_email_hash": "sha256hash...",
      "year": 2026,
      "month": 1,
      "amount_due": 1500.00,
      "amount_paid": 1500.00,
      "status": "PAID",
      "paid_at": 1706400000,
      "paid_by": "admin@example.com",
      "notes": "Pago via PIX",
      "created_at": 1706300000,
      "updated_at": 1706400000
    }
  ],
  "year": 2026,
  "month": 1
}
```

### POST /api/admin/invoice-payments
Create or update payment status for a parent invoice.
- **Auth:** Admin only
- **Body:**
```json
{
  "parentEmail": "parent@example.com",
  "year": 2026,
  "month": 1,
  "amountDue": 1500.00,
  "amountPaid": 1500.00,
  "status": "PAID",
  "notes": "Pago via PIX"
}
```
- **Response:** `200 OK` (update) or `201 Created` (new)
```json
{
  "message": "Payment status updated",
  "id": "pay_xxx",
  "status": "PAID"
}
```
- **Notes:**
  - Parent email is hashed (SHA-256) before storage for privacy
  - Status auto-calculated if not provided: PAID if amountPaid >= amountDue, PARTIAL if amountPaid > 0, PENDING otherwise
  - paid_at and paid_by automatically set when status becomes PAID

---

## Student APIs

### GET /api/students
List students with filtering.
- **Auth:** Required
- **Roles:** Admin (all), Teacher (assigned), Parent (linked)
- **Query Params:** `status`, `teacher_id`, `search`
- **Response:** Array of students

### POST /api/students
Create new student.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** Student data with encrypted PII fields
- **Response:** `201 Created` with student

### GET /api/students/[id]
Get single student.
- **Auth:** Required (role-filtered)
- **Response:** Student with enrollment info

### PUT /api/students/[id]
Update student.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** Partial update
- **Response:** Updated student

### DELETE /api/students/[id]
Soft delete student.
- **Auth:** Admin only
- **CSRF:** Required

### PUT /api/students/[id]/status
Update student status.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "status": "Pausado", "reason": "..." }`

### GET /api/students/search
Search students by name/email.
- **Auth:** Admin, Teacher
- **Query Params:** `q` (search term), `limit`

### GET /api/students/[id]/enrollments
List student's enrollments.
- **Auth:** Required (role-filtered)

### GET /api/students/[id]/class-history
List completed classes for a student with completion details.
- **Auth:** Admin, Teacher (own students), Parent (own children)
- **Query Params:** `start_date`, `end_date` (YYYY-MM-DD, defaults to 3 months)
- **Response:**
```json
{
  "classes": [{
    "completion_id": "cmp_xxx",
    "enrollment_id": "enr_xxx",
    "class_date": "2024-12-20",
    "class_time": "15:00",
    "status": "COMPLETED",
    "notes": "Vocabulary lesson...",
    "bilin_pillars": ["play", "music"],
    "skill_ratings": { "criatividade": 4 },
    "teacher_nickname": "Teacher",
    "language": "Inglês",
    "is_editable": true
  }],
  "stats": { "completed": 10, "noShows": 1, "total": 11 }
}
```

### GET /api/students/[id]/enrollments-summary
Get enrollment-derived data for student edit modal display (read-only fields).
- **Auth:** Admin, Teacher, Parent
- **Response:**
```json
{
  "status": "ATIVO",
  "teachers": [
    { "id": "tch_xxx", "nickname": "Maria" }
  ],
  "languages": ["English", "Spanish"],
  "classModes": ["Presencial", "Online"],
  "planTypes": ["Semanal"],
  "enrollmentCount": 2,
  "hasActiveEnrollment": true
}
```
- **Notes:** Status is derived from active enrollments (ATIVO > PAUSADO > AVISO). Excludes WAITLIST and INATIVO enrollments. classModes and planTypes are unique values from all active enrollments.

### GET /api/students/[id]/enrollment-timeline
Get complete enrollment history with status change timeline for a student.
- **Auth:** Admin only
- **Response:**
```json
{
  "studentId": "stu_xxx",
  "studentName": "João Silva",
  "enrollments": [
    {
      "enrollmentId": "enr_xxx",
      "dayOfWeek": 1,
      "dayLabel": "Seg",
      "startTime": "14:00",
      "teacherName": "Maria",
      "language": "Inglês",
      "currentStatus": "ATIVO",
      "groupId": "grp_xxx",
      "groupMembers": ["Ana", "Pedro"],
      "createdAt": 1736640000,
      "terminatedAt": null,
      "timeline": [
        {
          "date": 1736640000,
          "event": "CREATED",
          "fromStatus": null,
          "toStatus": "ATIVO",
          "reason": null,
          "triggeredBy": "user",
          "createdBy": null
        },
        {
          "date": 1737244800,
          "event": "STATUS_CHANGE",
          "fromStatus": "ATIVO",
          "toStatus": "PAUSADO",
          "reason": "Férias de verão",
          "triggeredBy": "user",
          "createdBy": "adm_xxx"
        }
      ]
    }
  ]
}
```
- **Notes:** Returns all enrollments (including INATIVO) with their complete status change history. Timeline events include CREATED, STATUS_CHANGE, and TERMINATED. Sorted by status (ATIVO first) then by day of week.

### PATCH /api/students/[id]/tshirt-size
Save t-shirt size to student record.
- **Auth:** Admin (canEditStudents)
- **CSRF:** Required
- **Request Body:**
```json
{
  "tshirt_size": "M (adulto)"
}
```
- **Response:**
```json
{
  "id": "stu_xxx",
  "tshirt_size": "M (adulto)"
}
```
- **Notes:** Saves immediately on dropdown change from contracts page. Empty string clears the value.

### GET /api/students/[id]/exceptions
List all exceptions for a student's enrollments.
- **Auth:** Admin, Teacher (own students), Parent (own children)
- **Query Params:** `start_date`, `end_date` (optional YYYY-MM-DD)
- **Response:**
```json
{
  "exceptions": [
    {
      "id": "exc_xxx",
      "enrollment_id": "enr_xxx",
      "exception_date": "2025-01-15",
      "exception_type": "CANCELLED_STUDENT",
      "reason": "Student is sick",
      "status": "APPROVED",
      "is_sick_protected": true,
      "new_date": null,
      "new_time": null
    }
  ],
  "total": 5
}
```
- **Notes:** Returns all cancelled and rescheduled classes across all enrollments for tracking and history

---

## ~~Trial Contracts APIs~~ (REMOVED 2026-02-03)

The trial contracts API endpoints (`/api/trial-contracts`) were removed along with the AULA_TESTE status and trial system. Lead conversions now create students directly as ATIVO. See migration 095.

### GET /api/admin/host-transfer/[id]
Get host selection candidates for a pending host transfer request.
- **Auth:** Admin only
- **Response:**
```json
{
  "request": {
    "id": "htr_xxx",
    "group_key": "tea_xxx:1:14:00",
    "from_enrollment_id": "enr_xxx",
    "to_enrollment_id": "enr_yyy",
    "request_type": "PAUSADO_ADMIN",
    "status": "PENDING"
  },
  "candidates": [
    {
      "enrollment_id": "enr_yyy",
      "student_id": "stu_yyy",
      "student_name": "Maria",
      "address": "Rua das Flores, 123, Centro",
      "travel_impact_minutes": 5,
      "travel_warning_level": "NONE"
    }
  ],
  "teacher": { "id": "tea_xxx", "name": "Prof. Ana" },
  "day_of_week": 1,
  "start_time": "14:00"
}
```

### POST /api/admin/host-transfer/[id]
Admin selects new location host for a 3+ person group.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "new_host_enrollment_id": "enr_yyy"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Novo local definido com sucesso"
}
```
- **Notes:** Approves the request, updates enrollment's is_location_host flag, sends notifications

---

## Teacher APIs

### GET /api/teachers
List teachers with filtering.
- **Auth:** Required
- **Query Params:** `active`, `language`, `city`
- **Response:** Array of teachers

### POST /api/teachers
Create new teacher.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** Teacher data with encrypted PII

### GET /api/teachers/[id]
Get single teacher.
- **Auth:** Required
- **Response:** Teacher with availability

### PUT /api/teachers/[id]
Update teacher.
- **Auth:** Admin only
- **CSRF:** Required

### DELETE /api/teachers/[id]
Soft delete teacher.
- **Auth:** Admin only
- **CSRF:** Required

### GET /api/teachers/[id]/availability
Get teacher's weekly availability slots.
- **Auth:** Required

### PUT /api/teachers/[id]/availability
Update teacher availability (admin sets slots for a teacher).
- **Auth:** Admin (canEditTeachers)
- **CSRF:** Required
- **Body:** `{ slots: [{ day_of_week: number, start_time: string, end_time: string }] }`

### GET /api/teachers/[id]/students
List teacher's assigned students.
- **Auth:** Admin, Teacher (own)

### GET /api/teachers/[id]/time-off
List teacher's time-off requests.
- **Auth:** Admin, Teacher (own)

### POST /api/teachers/[id]/time-off
Create time-off request.
- **Auth:** Teacher (own)
- **CSRF:** Required
- **Body:** `{ "start_date", "end_date", "reason" }`

### GET /api/teachers/[id]/class-mode-enrollments
Get which class modes have active enrollments for a teacher.
- **Auth:** Admin only
- **Response:** `{ "teacherId", "hasActiveEnrollments": { "individual": bool, "group": bool, "online": bool }, "totalActive": number }`
- Used to prevent unchecking teaching preferences when active enrollments exist

### POST /api/teacher/location-change/[id]
Teacher approves or rejects a parent's request to become location host.
- **Auth:** Teacher (own groups only)
- **CSRF:** Required
- **Body:**
```json
{
  "action": "approve"  // or "reject"
}
```
- **Response (approve):**
```json
{
  "success": true,
  "message": "Solicitação aprovada"
}
```
- **Response (reject):**
```json
{
  "success": true,
  "message": "Solicitação recusada"
}
```
- **Notes:** Updates location host flag, sends notifications to parent and admin

---

## User APIs

### GET /api/users
List all users.
- **Auth:** Admin only
- **Query Params:** `role`, `status`

### POST /api/users
Create new user.
- **Auth:** Admin only
- **CSRF:** Required

### GET /api/users/[id]
Get single user.
- **Auth:** Admin only

### PUT /api/users/[id]
Update user.
- **Auth:** Admin only
- **CSRF:** Required

### DELETE /api/users/[id]
Delete user.
- **Auth:** Admin only
- **CSRF:** Required

### PUT /api/users/[id]/role
Change user role.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "role": "teacher" }`

---

## Availability APIs

### GET /api/availability/[teacherId]
Get teacher availability grid.
- **Auth:** Required
- **Query Params:** `week_start`

### PUT /api/availability/[teacherId]
Update teacher availability.
- **Auth:** Admin, Teacher (own)
- **CSRF:** Required

### GET /api/availability/approvals
List pending availability changes.
- **Auth:** Admin only

### PUT /api/availability/approvals/[id]
Approve/reject availability change.
- **Auth:** Admin only
- **CSRF:** Required

### GET /api/admin/time-off-approvals
List pending teacher time-off requests.
- **Auth:** Admin only
- **Response:** Array of time-off requests with teacher info
```json
[{
  "id": "tor_xxx",
  "teacher_id": "tea_xxx",
  "teacher_name": "John Smith",
  "teacher_nickname": "John",
  "start_date": "2025-01-15",
  "end_date": "2025-01-20",
  "reason": "Vacation",
  "status": "PENDING",
  "created_at": 1705320000
}]
```

### POST /api/admin/time-off-approvals
Approve or reject a teacher time-off request.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "request_id": "tor_xxx",
  "action": "approve",
  "admin_notes": "Approved for vacation"
}
```
- **Actions:** `approve` or `reject` (rejection requires `admin_notes`)
- **Response:** `{ "success": true, "message": "Time-off request approved" }`

### GET /api/admin/pausado-approvals
List pending parent pausado (pause) requests for enrollments.
- **Auth:** Admin only
- **Response:** Array of pausado requests with student and enrollment info
```json
{
  "requests": [{
    "id": "psr_xxx",
    "enrollment_id": "enr_xxx",
    "student_id": "stu_xxx",
    "student_name": "Maria Silva",
    "parent_email": "parent@example.com",
    "requested_start_date": "2025-01-15",
    "reason": "Family vacation",
    "status": "PENDING",
    "requested_at": 1735200000,
    "day_of_week": 1,
    "start_time": "09:00",
    "language": "Inglês",
    "teacher_name": "John Smith"
  }]
}
```

### POST /api/admin/pausado-approvals
Approve or reject a parent pausado request.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "request_id": "psr_xxx",
  "action": "approve",
  "admin_notes": "Approved for vacation period"
}
```
- **Actions:** `approve` (transitions enrollment to PAUSADO) or `reject` (requires `admin_notes`)
- **Response:** `{ "success": true, "message": "Solicitação aprovada. Matrícula pausada." }`

### GET /api/parent/pausado-request
List pausado requests for parent's students.
- **Auth:** Parent only
- **Query:** `?studentId=stu_xxx` (optional, defaults to all students)
- **Response:** Array of pausado requests

### POST /api/parent/pausado-request
Create a new pausado request for an enrollment.
- **Auth:** Parent only
- **CSRF:** Required
- **Body:**
```json
{
  "enrollment_id": "enr_xxx",
  "requested_start_date": "2025-01-15",
  "reason": "Family vacation"
}
```
- **Validation:**
  - Enrollment must be ATIVO status
  - Not in 5-month cooldown period
  - No existing PENDING request for this enrollment
  - Date must be in the future
- **Response:** Created pausado request object

### GET /api/admin/availability-approvals
List pending teacher availability submissions with comparison data.
- **Auth:** Admin only
- **Response:** Grouped by teacher with current/pending slots
```json
[{
  "teacher_id": "tea_xxx",
  "teacher_nickname": "John",
  "teacher_full_name": "John Smith",
  "pending_slots": [{ "day_of_week": 1, "start_time": "09:00", "end_time": "12:00" }],
  "pending_removals": [],
  "current_slots": [{ "day_of_week": 2, "start_time": "14:00", "end_time": "18:00" }],
  "booked_slots": [{ "day_of_week": 2, "time": "14:00" }]
}]
```

### POST /api/admin/availability-approvals
Approve or reject a teacher's availability changes.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "teacher_id": "tea_xxx",
  "action": "approve",
  "reason": "Rejection reason (required for reject)"
}
```
- **Actions:** `approve` or `reject` (rejection requires `reason`)
- **Response:** `{ "success": true, "message": "Availability approved" }`

### GET /api/admin/conflicts
Scan for scheduling conflicts (overlapping enrollments).
- **Auth:** Admin only
- **Response:**
```json
{
  "conflicts": [{
    "teacher_id": "tea_xxx",
    "teacher_name": "John",
    "day_of_week": 1,
    "day_label": "Segunda-feira",
    "enrollments": [
      { "id": "enr_1", "student_name": "Alice", "start_time": "14:00", "end_time": "15:00" },
      { "id": "enr_2", "student_name": "Bob", "start_time": "14:30", "end_time": "15:30" }
    ],
    "overlap_description": "Alice (14:00-15:00) overlaps with Bob (14:30-15:30)"
  }],
  "totalConflicts": 1,
  "scannedEnrollments": 150
}
```

### PATCH /api/admin/travel-errors/[id]/status
Update the status of a travel time error.
- **Auth:** Admin only
- **Body:**
```json
{
  "status": "RESOLVED",
  "resolution_notes": "Fixed address formatting"
}
```
- **Statuses:** `PENDING`, `REVIEWED`, `RESOLVED`, `IGNORED`
- **Response:** `{ "success": true, "id": "...", "status": "RESOLVED" }`
- **Errors:** `404 NOT_FOUND` if error doesn't exist

### GET /api/admin/parent-links
List all parent account links.
- **Auth:** Admin only
- **Response:**
```json
{
  "links": [
    {
      "id": "uuid",
      "auth_email": "parent@example.com",
      "student_id": "uuid",
      "student_name": "Alice",
      "created_at": 1704067200,
      "created_by": "admin@example.com"
    }
  ]
}
```

### POST /api/admin/parent-links
Create a new parent-student link.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "auth_email": "parent@example.com",
  "student_id": "uuid"
}
```
- **Response:** `201 Created` with link object
- **Errors:** `400 VALIDATION_ERROR` if email/student_id invalid

### DELETE /api/admin/parent-links
Delete a parent-student link.
- **Auth:** Admin only
- **CSRF:** Required
- **Query Params:** `id` (link ID to delete)
- **Response:** `{ "success": true }`
- **Errors:** `400 VALIDATION_ERROR` if id missing

### GET /api/admin/teacher-links
List all teacher account links.
- **Auth:** Admin only
- **Response:**
```json
{
  "links": [
    {
      "id": "uuid",
      "auth_email": "teacher@example.com",
      "teacher_id": "uuid",
      "teacher_nickname": "João",
      "created_at": 1704067200,
      "created_by": "admin@example.com"
    }
  ]
}
```

### POST /api/admin/teacher-links
Create a new teacher account link.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "auth_email": "teacher@example.com",
  "teacher_id": "uuid"
}
```
- **Response:** `201 Created` with link object
- **Errors:** `400 VALIDATION_ERROR` if email/teacher_id invalid

### DELETE /api/admin/teacher-links
Delete a teacher account link.
- **Auth:** Admin only
- **CSRF:** Required
- **Query Params:** `id` (link ID to delete)
- **Response:** `{ "success": true }`
- **Errors:** `400 VALIDATION_ERROR` if id missing

---

## Parent APIs

### GET /api/parent/billing-profile
Get parent's billing profile for invoicing.
- **Auth:** Parent
- **Response:**
```json
{
  "billing_name": "Maria Silva",
  "billing_email": "maria@example.com",
  "billing_phone": "(48) 99999-9999",
  "document": "12345678901",
  "document_type": "CPF",
  "document_formatted": "123.456.789-01",
  "billing_street": "Rua das Flores",
  "billing_number": "123",
  "billing_complement": "Apto 101",
  "billing_neighborhood": "Centro",
  "billing_city": "Florianópolis",
  "billing_state": "SC",
  "billing_cep": "88010-000",
  "billing_lat": -27.5969,
  "billing_lon": -48.5480
}
```
- **Notes:**
  - Returns empty fields (null) if no profile exists
  - `document_type` auto-detected: CPF (11 digits) or CNPJ (14 digits)
  - `document_formatted` has mask applied for display

### PUT /api/parent/billing-profile
Update parent's billing profile.
- **Auth:** Parent
- **CSRF:** Required
- **Body:**
```json
{
  "billing_name": "Maria Silva",
  "billing_email": "maria@example.com",
  "billing_phone": "(48) 99999-9999",
  "document": "12345678901",
  "billing_street": "Rua das Flores",
  "billing_number": "123",
  "billing_complement": "Apto 101",
  "billing_neighborhood": "Centro",
  "billing_city": "Florianópolis",
  "billing_state": "SC",
  "billing_cep": "88010-000",
  "billing_lat": -27.5969,
  "billing_lon": -48.5480
}
```
- **Validation:**
  - `document`: CPF (11 digits) or CNPJ (14 digits), formatted or raw
  - `billing_phone`: Brazilian format (XX) XXXXX-XXXX or raw digits
  - `billing_cep`: XXXXX-XXX or raw 8 digits
  - All fields optional except none required
- **Response:** Same as GET (updated profile)
- **Errors:**
  - `400 VALIDATION_ERROR` - Invalid document/phone/CEP format

---

### GET /api/parent/dashboard
Get parent dashboard data.
- **Auth:** Parent
- **Response:** Linked students + upcoming classes

### GET /api/parent/students
List parent's linked students.
- **Auth:** Parent

### GET /api/parent/students/[id]/schedule
Get student schedule.
- **Auth:** Parent (must be linked)
- **Query Params:** `start_date`, `end_date`

### POST /api/parent/cancel-class
Cancel or reschedule a class for linked student.
- **Auth:** Parent only
- **CSRF:** Required
- **Body:**
```json
{
  "enrollment_id": "enr_xxx",
  "class_date": "2025-12-15",
  "reason": "Student is sick",
  "reschedule_to_date": "2025-12-17",
  "reschedule_to_time": "14:00"
}
```
- **Notes:**
  - `reschedule_to_date` and `reschedule_to_time` are optional (for cancellation only)
  - If rescheduling, both date and time must be provided
  - Cannot cancel classes in the past
  - IDOR protection: Parent can only cancel for their own students
- **Response:**
```json
{
  "success": true,
  "exception": { "id": "exc_xxx", "exception_type": "CANCELLED_STUDENT", ... },
  "message": "Class on 2025-12-15 has been cancelled"
}
```
- **Errors:**
  - `403 FORBIDDEN` - Not parent role or doesn't own student
  - `404 NOT_FOUND` - Enrollment not found
  - `409 DUPLICATE_EXCEPTION` - Exception already exists for this date
  - `400 VALIDATION_ERROR` - Invalid input or past date

### GET /api/parent/feedback
Get BILIN learning feedback for parent's children.
- **Auth:** Parent only
- **Query Params:**
  - `student_id` (optional) - Filter by specific student
  - `start_date` (optional) - Start date YYYY-MM-DD (default: 3 months ago)
  - `end_date` (optional) - End date YYYY-MM-DD (default: today)
  - `limit` (optional) - Max results per page (default: 50, max: 100)
  - `offset` (optional) - Pagination offset (default: 0)
- **Response:**
```json
{
  "feedbackItems": [
    {
      "id": "cmp_xxx",
      "class_date": "2025-12-15",
      "class_time": "14:00",
      "student_id": "stu_xxx",
      "student_name": "Sofia",
      "teacher_name": "John",
      "notes": "Worked on vocabulary",
      "bilin_pillars": ["ACONCHEGO_EDUCATIVO", "CONEXAO_LUDICA"],
      "skill_ratings": {
        "criatividade": 4, "leitura": 3, "escrita": 3,
        "escuta": 5, "atencao": 4, "espontaneidade": 4
      }
    }
  ],
  "aggregatedProgress": [
    {
      "student_id": "stu_xxx",
      "student_name": "Sofia",
      "pillarCounts": {
        "ACONCHEGO_EDUCATIVO": 5, "CONEXAO_LUDICA": 3, ...
      },
      "avgSkillRatings": {
        "criatividade": 4.2, "leitura": 3.5, ...
      },
      "totalClasses": 12,
      "classesWithFeedback": 10
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```
- **Pillar Keys:** `ACONCHEGO_EDUCATIVO`, `CONEXAO_LUDICA`, `CRESCIMENTO_NATURAL`, `CURIOSIDADE_ATENTA`, `EXPRESSAO_VIVA`, `JORNADA_UNICA`, `PROCESSO_CONTINUO`
- **Skill Keys:** `criatividade`, `leitura`, `escrita`, `escuta`, `atencao`, `espontaneidade` (0-5 scale)
- **Errors:**
  - `401 UNAUTHORIZED` - Not authenticated
  - `403 FORBIDDEN` - Not parent role
  - `404 NOT_FOUND` - Student not found or not linked to parent

### POST /api/parent/location-host-request
Parent requests to become the location host for their child's group class.
- **Auth:** Parent only
- **CSRF:** Required
- **Body:**
```json
{
  "enrollment_id": "enr_xxx"
}
```
- **Response:**
```json
{
  "success": true,
  "request_id": "htr_xxx",
  "message": "Solicitação enviada ao professor"
}
```
- **Notes:**
  - Only for group classes where parent is NOT the current host
  - Teacher receives notification and must approve/reject
  - Shows travel impact for teacher's itinerary
- **Errors:**
  - `403 FORBIDDEN` - Not parent's enrollment
  - `400 ALREADY_HOST` - Already the location host
  - `400 NOT_GROUP_CLASS` - Only valid for group classes
  - `400 PENDING_REQUEST` - Already has pending request

---

## Notification APIs

### GET /api/notifications
List user's notifications with pagination.
- **Auth:** Required
- **Query Params:** `unread_only` (boolean), `limit` (default 20, max 100), `offset` (default 0)
- **Response:**
```json
{
  "notifications": [...],
  "total": 42,
  "unreadCount": 5,
  "limit": 20,
  "offset": 0
}
```

### POST /api/notifications/[id]/read
Mark notification as read.
- **Auth:** Required
- **CSRF:** Required
- **Response:** `{ "success": true }` or `{ "success": true, "alreadyRead": true }`
- **Errors:** `404 NOT_FOUND` if notification doesn't exist or doesn't belong to user

### POST /api/notifications/read-all
Mark all user's notifications as read.
- **Auth:** Required
- **CSRF:** Required
- **Response:** `{ "success": true, "markedAsRead": 5 }`

### POST /api/notifications/read-by-type
Mark all notifications of a specific type as read for the authenticated user.
- **Auth:** Required
- **CSRF:** Required
- **Body:**
```json
{
  "type": "ADMIN_CANCELLATION_ALERT"
}
```
- **Response:** `{ "success": true, "updated": 3 }`
- **Errors:** `400 VALIDATION_ERROR` if type not provided, `404 NOT_FOUND` if user not found
- **Notes:** Used by cancellations page to auto-mark notifications as read when viewing

---

## Push Notification APIs

### POST /api/push/register
Register a device for FCM push notifications.
- **Auth:** Required
- **CSRF:** Required
- **Body:**
```json
{
  "fcmToken": "eKDfg3...",
  "platform": "web",
  "deviceName": "Chrome"
}
```
- **Validation:**
  - `fcmToken`: string, required
  - `platform`: enum `['ios', 'android', 'web']`, required
  - `deviceName`: string, optional
- **Response:**
```json
{
  "success": true,
  "deviceId": "pdt_abc123...",
  "pushEnabled": true
}
```
- **Errors:** `401` if not authenticated, `400` if validation fails

### DELETE /api/push/register
Unregister a device from push notifications.
- **Auth:** Required
- **CSRF:** Required
- **Body:**
```json
{
  "tokenId": "uuid-of-device-token"
}
```
- **Response:** `{ "success": true }`
- **Errors:** `401` if not authenticated, `400` if invalid UUID

### Push Notification Flow

1. Client initializes Firebase SDK and service worker
2. Client requests notification permission
3. Client gets FCM token and calls `POST /api/push/register`
4. Server stores token in `push_device_tokens` table
5. When notification created, server sends push via FCM HTTP v1 API
6. FCM delivers to registered devices

**Environment Variables Required:**
- `FCM_PROJECT_ID`: Firebase project ID
- `FCM_SERVICE_ACCOUNT_EMAIL`: Service account email
- `FCM_PRIVATE_KEY`: Service account private key (PEM format)

---

## Pending Counts APIs (Badge System)

### GET /api/admin/pending-counts
Get counts of all pending items for admin badge display.
- **Auth:** Admin only
- **Response:**
```json
{
  "changeRequests": 2,
  "availabilityApprovals": 1,
  "timeOffRequests": 1,
  "cancellations": 3,
  "unreadNotifications": 5,
  "groupsAtRisk": 2,
  "degradedGroups": 1,
  "total": 7
}
```
- **Story 6.8 Fields:**
  - `groupsAtRisk`: Groups with exactly 2 ATIVO members (fragile - if one leaves, rate changes)
  - `degradedGroups`: Groups with 1 ATIVO but other non-ATIVO members (paying individual rate)

### GET /api/teacher/pending-counts
Get teacher's pending request counts.
- **Auth:** Teacher only
- **Response:**
```json
{
  "pendingAvailability": 1,
  "pendingTimeOff": 0,
  "total": 1
}
```

### GET /api/teacher/availability
Get logged-in teacher's availability slots.
- **Auth:** Teacher only
- **Response:**
```json
{
  "slots": [
    { "day_of_week": 1, "start_time": "08:00", "end_time": "12:00" },
    { "day_of_week": 1, "start_time": "14:00", "end_time": "18:00" }
  ]
}
```

### POST /api/teacher/availability
Set logged-in teacher's availability slots (replaces all).
- **Auth:** Teacher only
- **CSRF:** Required
- **Body:**
```json
{
  "slots": [
    { "day_of_week": 1, "start_time": "08:00", "end_time": "12:00" },
    { "day_of_week": 2, "start_time": "14:00", "end_time": "18:00" }
  ]
}
```
- **Validation:**
  - `day_of_week`: 0-6 (0=Sunday)
  - `start_time`, `end_time`: HH:MM format
  - `start_time` must be before `end_time`
- **Response:** `{ "success": true, "slots": [...] }`

### GET /api/teacher/time-off
Get logged-in teacher's time-off requests.
- **Auth:** Teacher only
- **Response:** Array of time-off request objects
```json
[
  {
    "id": "tor_xxx",
    "teacher_id": "tea_xxx",
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "request_type": "VACATION",
    "reason": "Family trip",
    "status": "PENDING",
    "created_at": 1704067200
  }
]
```

### POST /api/teacher/time-off
Create a new time-off request.
- **Auth:** Teacher only
- **CSRF:** Required
- **Body:**
```json
{
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "request_type": "VACATION",
  "reason": "Family trip"
}
```
- **Request Types:** `VACATION`, `SICK_LEAVE`, `PERSONAL`, `OTHER`
- **Response:** `201 Created` with time-off request object
- **Errors:** `409 CONFLICT` if overlapping request exists

### DELETE /api/teacher/time-off
Cancel a pending time-off request.
- **Auth:** Teacher only
- **CSRF:** Required
- **Query Params:** `id` (request ID to cancel)
- **Response:** `{ "success": true }`
- **Errors:** `404 NOT_FOUND`, `403 FORBIDDEN` (if not owner), `400 VALIDATION_ERROR` (if not pending)

### GET /api/parent/pending-counts
Get parent's pending cancellation counts.
- **Auth:** Parent only
- **Response:**
```json
{
  "pendingCancellations": 1,
  "total": 1
}
```

---

## Dashboard/Stats APIs

### GET /api/admin/stats
Get admin dashboard statistics.
- **Auth:** Admin only
- **Response:** Enrollment counts, completion rates, revenue

### GET /api/admin/recent-activity
Get recent system activity.
- **Auth:** Admin only
- **Query Params:** `limit`

### GET /api/teacher/stats
Get teacher dashboard statistics.
- **Auth:** Teacher
- **Response:** Weekly classes, completion rates

---

## Cancellation APIs

### GET /api/cancellations/pending
List all pending cancellation requests.
- **Auth:** Admin only

### PUT /api/cancellations/[id]/approve
Approve cancellation.
- **Auth:** Admin only
- **CSRF:** Required

### PUT /api/cancellations/[id]/reject
Reject cancellation.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "reason": "..." }`

### GET /api/cancellations/pending-choice
Get parent's pending rate change choices (when group goes 2→1).
- **Auth:** Parent
- **Response:**
```json
{
  "pendingChoices": [{
    "id": "pc_xxx",
    "enrollment_id": "enr_xxx",
    "class_date": "2024-06-20",
    "original_rate": 120,
    "new_rate": 150,
    "choice_deadline": 1718870400,
    "student_name": "João Silva"
  }]
}
```

### POST /api/cancellations/pending-choice
Submit parent's rate change decision.
- **Auth:** Parent
- **CSRF:** Required
- **Body:**
```json
{
  "pending_choice_id": "pc_xxx",
  "choice": "CONTINUE"  // or "CANCEL"
}
```
- **Billing:** If CANCEL and past deadline, parent is billed at new rate

### GET /api/cancellations/auto-resolve
Trigger auto-resolution of expired pending choices and location change requests.
- **Auth:** Admin or Cron
- **Response:** `{ "resolved": 3, "message": "..." }`

### POST /api/cancellations/auto-resolve
Same as GET, for cron services that require POST.
- **Auth:** Admin or Cron

### GET /api/location-change/[id]/respond
Get location change request details for parent response.
- **Auth:** Parent (must be participant)
- **Response:**
```json
{
  "request": {
    "id": "lcr_xxx",
    "class_date": "2024-06-20",
    "new_location_address": "123 New Street",
    "travel_minutes": 25,
    "approval_deadline": 1718870400,
    "responses": [{
      "student_name": "João",
      "response": "approve"
    }]
  },
  "myResponseId": "lcrsp_xxx",
  "alreadyResponded": false
}
```

### POST /api/location-change/[id]/respond
Submit parent's location change approval/decline.
- **Auth:** Parent (must be participant)
- **CSRF:** Required
- **Body:** `{ "response": "approve" }` or `{ "response": "decline" }`
- **Behavior:**
  - If ALL approve → Location change finalized, class continues
  - If ANY decline → Class cancelled for ALL (no charge)
  - If expired → Class cancelled for ALL

---

## Change Request APIs

### GET /api/change-requests
List change requests with filtering.
- **Auth:** Required (Admin sees all, others see own)
- **Query Params:** `status`, `request_type`, `requester_id`, `resource_id`, `id` (for single)
- **Response:** Array of change requests

### POST /api/change-requests
Create a new change request.
- **Auth:** Required
- **CSRF:** Required
- **Body:**
```json
{
  "request_type": "teacher",
  "resource_id": "tea_xxx",
  "old_values": { "nickname": "Old Name" },
  "new_values": { "nickname": "New Name" }
}
```
- **Request Types:** `teacher`, `student`
- **Response:** `201 Created` with change request

### GET /api/change-requests/count
Get count of pending change requests.
- **Auth:** Admin only
- **Response:** `{ "count": 5 }`

### PUT /api/change-requests/[id]/approve
Approve a change request.
- **Auth:** Admin only
- **CSRF:** Required
- **Response:** Updated change request with `status: "APPROVED"`

### PUT /api/change-requests/[id]/reject
Reject a change request.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "reason": "Rejection reason" }`
- **Response:** Updated change request with `status: "REJECTED"`

---

## Settings APIs

### GET /api/settings
Get settings by key.
- **Auth:** Required (any role)
- **Query Params:**
  - `key` (required): Setting key (e.g., `languages`, `cities`, `class_modes`, `plan_types`)
  - `details` (optional): If `true`, returns full setting objects with id, active, displayOrder
- **Response (values only):** `["English", "Spanish", "Portuguese"]`
- **Response (with details):**
```json
[
  { "id": 1, "key": "languages", "value": "English", "active": true, "displayOrder": 1 },
  { "id": 2, "key": "languages", "value": "Spanish", "active": true, "displayOrder": 2 }
]
```

### POST /api/settings
Add a new setting value.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "key": "languages", "value": "French", "displayOrder": 3 }`
- **Response:** `201 Created` with setting object
- **Errors:** `409 CONFLICT` if value already exists

### PUT /api/settings
Update a setting.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "id": 1, "value": "Updated Value", "displayOrder": 2, "active": true }`

### DELETE /api/settings
Delete a setting.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "id": 1 }`

### PATCH /api/settings
Toggle setting active status.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ "id": 1 }`
- **Response:** `{ "success": true, "active": false }`

### GET /api/settings/theme
Get theme settings.
- **Auth:** Required
- **Response:** Theme configuration object

### PUT /api/settings/theme
Update theme settings.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** Theme configuration

---

## Teacher Day Zones APIs

### GET /api/teacher/day-zones
Get teacher's geographic zones per day of week.
- **Auth:** Required (Admin or Teacher own)
- **Query Params:** `teacher_id` (required for admin, auto-detected for teacher)
- **Response:**
```json
[
  { "day_of_week": 1, "neighborhood": "Centro" },
  { "day_of_week": 2, "neighborhood": "Jardins" }
]
```

### POST /api/teacher/day-zones
Update teacher's day zones.
- **Auth:** Admin or Teacher (own)
- **CSRF:** Required
- **Body:**
```json
{
  "teacher_id": "tea_xxx",
  "zones": [
    { "day_of_week": 1, "neighborhood": "Centro" },
    { "day_of_week": 2, "neighborhood": "Jardins" }
  ]
}
```
- **Response:** `{ "success": true, "message": "Day zones updated" }`

### GET /api/teacher/month-calendar
Get teacher's month calendar view.
- **Auth:** Teacher only
- **Query Params:** `month`, `year`
- **Response:** Calendar data with classes per day

---

## Location APIs

### GET /api/admin/ibge-locations
Fetch Brazilian states and cities from IBGE API (proxied with caching).
- **Auth:** Admin only
- **Query Params:**
  - `type=states` - Returns all Brazilian states
  - `type=cities&uf=SC` - Returns all cities for a state (UF code required)
- **Response (states):**
```json
[
  { "uf": "SC", "name": "Santa Catarina" },
  { "uf": "SP", "name": "São Paulo" }
]
```
- **Response (cities):**
```json
[
  { "id": 4205407, "name": "Florianópolis" },
  { "id": 4209102, "name": "Joinville" }
]
```
- **Notes:** Results are cached for 24 hours. Used for city selection in settings.

### GET /api/locations/autocomplete
Autocomplete location search using Google Places API.
- **Auth:** Required
- **Query Params:** `query` (min 3 chars)
- **Response:** Array of location suggestions

### GET /api/locations/reverse
Reverse geocode coordinates to address.
- **Auth:** Required
- **Query Params:** `lat`, `lon`
- **Response:** Address details

---

## Travel Time APIs

### GET /api/travel-time
Calculate travel time between two locations.
- **Auth:** Required
- **Query Params:** `origin`, `destination`
- **Response:** `{ "travel_time_minutes": 25, "distance_km": 12.5 }`

### GET /api/travel-time/matrix
Calculate travel time matrix for multiple locations.
- **Auth:** Admin only
- **Query Params:** `origins`, `destinations`
- **Response:** Matrix of travel times

### GET /api/travel-times
Fetch travel times for a teacher's schedule with specified travel mode.
- **Auth:** Admin only
- **Query Params:**
  - `teacher_id` (required): Teacher ID
  - `week_start` (required): Week start date (YYYY-MM-DD)
  - `mode` (optional): Travel mode - `DRIVE` (default), `WALK`, or `TRANSIT`
- **Response:**
```json
{
  "travel_mode": "DRIVE",
  "buffer_minutes": 10,
  "travel_blocks": [
    {
      "id": "travel_enr_xxx_enr_yyy",
      "from_enrollment_id": "enr_xxx",
      "to_enrollment_id": "enr_yyy",
      "day_of_week": 1,
      "start_time": "09:00",
      "end_time": "09:25",
      "travel_minutes": 25,
      "from_neighborhood": "Centro",
      "to_neighborhood": "Lagoa",
      "source": "api",
      "travel_mode": "DRIVE"
    }
  ]
}
```

**Buffer Times by Mode:**
- WALK: 5 minutes
- DRIVE: 10 minutes
- TRANSIT: 15 minutes

---

## Zone Matrix APIs

Pre-calculated zone-to-zone travel times for cost optimization. Uses zone centroids instead of individual location lookups. Reduces LocationIQ API costs by ~90%.

### GET /api/admin/zone-matrix
List all zone matrix entries.
- **Auth:** Admin only
- **Response:**
```json
{
  "entries": [
    {
      "id": "zm_xxx",
      "from_zone": "Centro",
      "to_zone": "Norte",
      "avg_travel_minutes": 35,
      "distance_km": 18.5,
      "buffer_minutes": 25,
      "is_same_zone": false,
      "is_adjacent": false,
      "calculated_at": 1735689600
    }
  ],
  "count": 49,
  "populated": true,
  "expectedCount": 49
}
```

### DELETE /api/admin/zone-matrix
Clear all zone matrix entries (for repopulation).
- **Auth:** Admin only
- **Response:**
```json
{
  "success": true,
  "message": "Zone matrix cleared",
  "entriesDeleted": 49
}
```

### POST /api/admin/zone-matrix/populate
One-time population of zone matrix using LocationIQ API. Calculates travel times between all 7 zone centroids (49 pairs).
- **Auth:** Admin only
- **Cost:** ~$0.50 (42 API calls for different-zone pairs)
- **Response:**
```json
{
  "success": true,
  "message": "Zone matrix populated successfully",
  "entriesCreated": 49,
  "apiCallsMade": 42,
  "estimatedCost": "~$0.50"
}
```
- **Notes:**
  - Returns 409 Conflict if matrix already populated
  - Same-zone pairs use 10min default (no API call)
  - Run DELETE first to repopulate

### GET /api/admin/zone-matrix/lookup
Look up travel info between zones or neighborhoods.
- **Auth:** Admin only
- **Query Params (zone pair):** `from_zone`, `to_zone`
- **Query Params (neighborhood pair):** `from_neighborhood`, `to_neighborhood`
- **Response (zone query):**
```json
{
  "query": { "type": "zone", "from": "Centro", "to": "Norte" },
  "result": {
    "fromZone": "Centro",
    "toZone": "Norte",
    "avgTravelMinutes": 35,
    "bufferMinutes": 25,
    "isSameZone": false,
    "isAdjacent": false,
    "source": "matrix"
  }
}
```
- **Response (neighborhood query):**
```json
{
  "query": { "type": "neighborhood", "from": "Ingleses", "to": "Lagoa da Conceição" },
  "mappedZones": { "from": "Norte", "to": "Leste" },
  "result": {
    "fromZone": "Norte",
    "toZone": "Leste",
    "avgTravelMinutes": 40,
    "bufferMinutes": 25,
    "isSameZone": false,
    "isAdjacent": false,
    "source": "matrix"
  }
}
```
- **Notes:**
  - Returns 400 if no query parameters provided
  - Neighborhoods are mapped to zones via `ZONES` constant

---

## Microsoft OAuth APIs

### GET /api/auth/microsoft/login
Initiates Microsoft OAuth 2.0 flow.
- **Auth:** None
- **Response:** `302 Redirect` to Microsoft OAuth

### GET /api/auth/microsoft/callback
Handles Microsoft OAuth callback, creates session.
- **Auth:** State validation
- **Response:** `302 Redirect` to role dashboard

---

## Public APIs

### POST /api/public/register
Public lead registration (from cadastro page).
- **Auth:** None (public)
- **Body:** Lead registration data
- **Response:** `201 Created` with lead reference

### GET /api/public/hot-slots
Returns available teacher time slots for a neighborhood and language.
Used by cadastro form to highlight suggested slots where teachers are available.
- **Auth:** None (public)
- **Query Params:**
  - `neighborhood` (required): Neighborhood name to check
  - `language` (optional): Filter by language (e.g., "Inglês", "Espanhol")
- **Response:**
```json
{
  "hotSlots": [
    { "day": 1, "period": "morning1", "teacherCount": 2 },
    { "day": 1, "period": "afternoon1", "teacherCount": 1 }
  ],
  "filters": {
    "neighborhood": "Centro",
    "language": "Inglês",
    "teachersInArea": 3
  }
}
```
- **Notes:**
  - Periods: morning1 (8-10), morning2 (10-12), lunch (12-14), afternoon1 (14-16), afternoon2 (16-18)
  - Only counts slots with ≥60 minutes free time
  - Teachers must have active students in the neighborhood

---

## Webhook APIs

### POST /api/webhooks/jotform
JotForm webhook for lead submissions.
- **Auth:** Rate limited (10 req/min per IP)
- **Body:** JotForm form-urlencoded or JSON submission data
- **Response:**
```json
{
  "status": "created",
  "lead_id": "led_xxx"
}
```
- **Notes:**
  - Form ID validated against configured CADASTRO BILIN form
  - Duplicate submissions skipped by jotform_submission_id
  - Availability windows parsed from day-specific time fields
  - Sensitive fields (CPF, address) encrypted before storage

### GET /api/webhooks/jotform
Webhook health check.
- **Auth:** None (public)
- **Response:**
```json
{
  "status": "active",
  "webhook": "JotForm CADASTRO BILIN",
  "form_id": "252266949174064"
}
```

---

## LGPD (Data Protection) APIs

### GET /api/lgpd/consent
Get current user's consent status for all types.
- **Auth:** Required (any role)
- **Response:**
```json
{
  "consents": {
    "data_processing": { "granted": true, "grantedAt": 1735649000, "revokedAt": null },
    "marketing": { "granted": false, "grantedAt": null, "revokedAt": null },
    "third_party_sharing": { "granted": true, "grantedAt": 1735649000, "revokedAt": null },
    "analytics": { "granted": true, "grantedAt": 1735649000, "revokedAt": null }
  }
}
```

### POST /api/lgpd/consent
Update consent for a specific type.
- **Auth:** Required (any role)
- **CSRF:** Required
- **Body:**
```json
{
  "consent_type": "marketing",
  "granted": true
}
```
- **Consent Types:** `data_processing`, `marketing`, `third_party_sharing`, `analytics`

### GET /api/lgpd/export
Download all personal data as JSON file.
- **Auth:** Required (any role)
- **Response:** JSON file download with Content-Disposition header
- **Data Included:** User profile, encrypted fields (decrypted), enrollments, consents, audit log

### POST /api/lgpd/export
Request data export (creates audit record).
- **Auth:** Required (any role)
- **CSRF:** Required

### GET /api/lgpd/deletion
Check status of deletion requests.
- **Auth:** Required (any role)
- **Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "request_type": "full_deletion",
      "status": "pending",
      "reason": "...",
      "created_at": 1735649000
    }
  ]
}
```

### POST /api/lgpd/deletion
Request account deletion or anonymization.
- **Auth:** Required (any role)
- **CSRF:** Required
- **Body:**
```json
{
  "request_type": "full_deletion",
  "reason": "No longer using the service"
}
```
- **Request Types:** `full_deletion`, `anonymization`, `partial_deletion`
- **Notes:** Requires admin approval before processing

### PUT /api/lgpd/deletion
Process deletion request (admin only).
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
```json
{
  "request_id": "uuid",
  "action": "approve",
  "admin_notes": "Verified user request"
}
```

---

## Subscription APIs (Epic 8)

### GET /api/subscriptions
Lists subscriptions. Admin sees all; parents see only their children's subscriptions.
- **Auth:** Admin, Parent
- **Query:** `?status=active&student_id=xxx`
- **Response:** `{ subscriptions: Subscription[] }`

### POST /api/subscriptions
Creates a new subscription for a student.
- **Auth:** Admin, Parent
- **Body:** `{ student_id, plan_id, payment_method, enrollment_id? }`
- **Response:** `201 { subscription: Subscription, client_secret?: string }`

### GET /api/subscriptions/[id]
Gets subscription details.
- **Auth:** Admin, Parent (own children only)
- **Response:** `{ subscription: Subscription }`

### PUT /api/subscriptions/[id]
Updates subscription (change plan).
- **Auth:** Admin, Parent
- **Body:** `{ plan_id }`
- **Response:** `{ subscription: Subscription }`

### DELETE /api/subscriptions/[id]
Cancels a subscription.
- **Auth:** Admin, Parent
- **Body:** `{ reason?, cancel_immediately? }`
- **Response:** `{ success: true }`

### POST /api/subscriptions/[id]/pause
Pauses a subscription.
- **Auth:** Admin, Parent
- **Body:** `{ pause_end?: number }`
- **Response:** `{ subscription: Subscription }`

### POST /api/subscriptions/[id]/resume
Resumes a paused subscription.
- **Auth:** Admin, Parent
- **Response:** `{ subscription: Subscription }`

---

## Payment Methods APIs (Epic 8)

### GET /api/payment-methods
Lists saved payment methods for the current user.
- **Auth:** Admin, Parent
- **Response:** `{ payment_methods: PaymentMethod[], default_payment_method_id?: string }`

### POST /api/payment-methods
Creates a SetupIntent for adding a new payment method.
- **Auth:** Admin, Parent
- **Response:** `{ client_secret: string }`

### GET /api/payment-methods/[id]
Gets payment method details.
- **Auth:** Admin, Parent
- **Response:** `{ payment_method: PaymentMethod }`

### DELETE /api/payment-methods/[id]
Removes a saved payment method.
- **Auth:** Admin, Parent
- **Response:** `{ success: true }`

### POST /api/payment-methods/[id]/default
Sets a payment method as the default.
- **Auth:** Admin, Parent
- **Response:** `{ success: true }`

---

## Billing APIs (Epic 8)

### POST /api/billing/portal-session
Creates a Stripe Customer Portal session for self-service management.
- **Auth:** Parent
- **Body:** `{ return_url?: string }`
- **Response:** `{ url: string }`

---

## Completions APIs (Epic 8)

### GET /api/completions/pending-confirmation
Gets classes pending teacher confirmation.
- **Auth:** Teacher
- **Response:** `{ completions: PendingConfirmation[] }`

### POST /api/completions/[id]/confirm
Teacher confirms an auto-completed class.
- **Auth:** Teacher
- **Body:** `{ notes?: string }`
- **Response:** `{ success: true }`

### POST /api/completions/[id]/report-issue
Teacher reports an issue with auto-completed class.
- **Auth:** Teacher
- **Body:** `{ issue_type: 'NO_SHOW' | 'EARLY_END', reason: string, notes?: string }`
- **Response:** `{ success: true }`

### POST /api/completions/[id]/feedback
Submit teacher feedback for a completed class.
- **Auth:** Teacher
- **Validation:** Class must be COMPLETED, not historically locked (>30 days), teacher must own enrollment
- **Body:** `{ notes?: string, bilin_pillars?: BilinPillar[], skill_ratings?: SkillRatings }`
- **Response:**
  ```json
  {
    "completion": {
      "id": "string",
      "enrollment_id": "string",
      "class_date": "YYYY-MM-DD",
      "class_time": "HH:MM",
      "feedback_status": "SUBMITTED",
      "feedback_submitted_at": 1234567890,
      "feedback_points_awarded": 1
    },
    "credit": {
      "event_type": "FEEDBACK_ON_TIME" | "FEEDBACK_LATE",
      "points": 0 | 1
    }
  }
  ```

### POST /api/completions/[id]/no-show
Mark a class completion as NO_SHOW (student did not attend).
- **Auth:** Teacher
- **Validation:** Class must be in the past, not historically locked (>30 days), teacher must own enrollment
- **Body:** `{ notes?: string }`
- **Response:**
  ```json
  {
    "completion": {
      "id": "string",
      "enrollment_id": "string",
      "class_date": "YYYY-MM-DD",
      "class_time": "HH:MM",
      "status": "NO_SHOW",
      "feedback_status": "SUBMITTED",
      "feedback_submitted_at": 1234567890,
      "feedback_points_awarded": 1
    },
    "credit": {
      "event_type": "NO_SHOW_ON_TIME" | "NO_SHOW_LATE",
      "points": 0 | 1
    }
  }
  ```

---

## Cron APIs (Epic 8)

### POST /api/cron/auto-complete
Auto-marks classes as completed (called by external cron service).
- **Auth:** `x-cron-secret` header
- **Response:** `{ processed: number, confirmed: number }`

### POST /api/cron/payment-grace
Enforces payment grace periods and sends reminders.
- **Auth:** `x-cron-secret` header
- **Response:** `{ reminders_sent: number, subscriptions_paused: number }`

### POST /api/cron/feedback-penalties
Applies penalties for missed teacher feedback. Runs daily, marks PENDING feedback as SKIPPED after 30 days and applies -1 point penalty to teacher.
- **Auth:** `x-cron-secret` header
- **Schedule:** Daily (recommended 2:00 AM)
- **Response:** `{ success: true, result: { processed: number, penaltiesApplied: number, errors: number } }`

### GET /api/cron/feedback-penalties
Returns endpoint documentation and status.
- **Response:** `{ endpoint: string, method: string, description: string, schedule: string, feedbackDeadlineDays: 30 }`

---

## Admin Events APIs

### GET /api/admin/events
List admin calendar events with optional filters.
- **Auth:** Admin only
- **Query Parameters:**
  - `start` (optional) - Start date YYYY-MM-DD
  - `end` (optional) - End date YYYY-MM-DD
  - `adminId` (optional) - Filter by admin user ID
- **Response:** `{ events: ExpandedAdminEvent[] }` (expanded if date range provided) or `{ events: AdminEvent[] }` (raw if no range)

### POST /api/admin/events
Create a new admin calendar event.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
  - `title` (string, required, max 100) - Event title
  - `description` (string, optional, max 500) - Event description
  - `admin_id` (string, required) - Admin user ID
  - `recurrence` (string, required) - `one_time` | `weekly` | `date_range`
  - `event_date` (string) - YYYY-MM-DD (required for `one_time`)
  - `day_of_week` (number, 1-7) - Mon=1..Sun=7 (required for `weekly`)
  - `range_start` (string) - YYYY-MM-DD (required for `date_range`)
  - `range_end` (string) - YYYY-MM-DD (required for `date_range`)
  - `start_time` (string, required) - HH:MM format
  - `end_time` (string, required) - HH:MM format
- **Response:** `201 Created` with `{ event: AdminEvent }`

### GET /api/admin/events/[id]
Get a single admin calendar event by ID.
- **Auth:** Admin only
- **Response:** `{ data: AdminEvent }`
- **Error:** `404` if event not found

### PUT /api/admin/events/[id]
Update an admin calendar event.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** Same fields as POST (except `created_by` which stays fixed)
  - `title`, `description`, `admin_id`, `recurrence`, `is_all_day`
  - Conditional: `event_date`, `day_of_week`, `range_start`, `range_end`, `start_time`, `end_time`
- **Response:** `{ data: AdminEvent }`
- **Error:** `404` if event not found

### DELETE /api/admin/events/[id]
Delete an admin calendar event.
- **Auth:** Admin only
- **CSRF:** Required
- **Response:** `{ success: true }`
- **Error:** `404` if event not found

## Calendar Feed APIs

### GET /api/admin/calendar-feed
Check if the current admin has an active calendar feed token.
- **Auth:** Admin session
- **Response (has token):** `{ hasToken: true, createdAt: 1738300000 }`
- **Response (no token):** `{ hasToken: false }`

### POST /api/admin/calendar-feed
Generate a new feed token (replaces any existing one). Returns the raw token once.
- **Auth:** Admin session
- **CSRF:** Required
- **Response (201):** `{ feedUrl: "https://eduschedule-app.pages.dev/api/calendar/feed.ics?token=abc123...", token: "abc123..." }`
- **Notes:** Raw token is shown once and never stored. Only the SHA-256 hash is persisted.

### DELETE /api/admin/calendar-feed
Revoke the admin's feed token.
- **Auth:** Admin session
- **CSRF:** Required
- **Response:** `{ revoked: true }`

### GET /api/calendar/feed.ics
Public ICS calendar feed endpoint. No session auth required — authenticates via token query parameter.
- **Auth:** Token in `?token=<raw-token>` query param (SHA-256 hashed and looked up)
- **Query Params:** `token` (required) — raw feed token
- **Response:** `text/calendar; charset=utf-8` — RFC 5545 iCalendar content
- **Error:** `401` if token missing or invalid
- **Range:** Events from 1 month ago to 12 months ahead
- **Notes:** Returns admin events (one-time, weekly, date-range) expanded to concrete dates with BRT→UTC time conversion

---

### POST /api/admin/import-calendar
Import admin events from a Google Calendar ICS export.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:** `{ ics: string, clear_existing?: boolean }`
- **Response:** `{ success: true, stats: { total_vevents, skipped_cancelled, skipped_exceptions, skipped_no_admin, skipped_parse_error, created, deleted_before } }`
- **Notes:** Maps ATTENDEE emails to registered admin users. Cleans descriptions (removes Google Meet, Participantes, Reservado por). Creates one event per matched admin attendee.

---

## Business Config APIs

Runtime-configurable business settings (pricing, status durations, billing rules, etc.) stored in `business_config` table with full audit trail. Replaces hardcoded constants for 57 settings across 8 categories.

### GET /api/admin/business-config
Returns all 57 settings grouped by category for the admin UI.
- **Auth:** Admin only
- **Response:** `{ categories: [{ category: { id, label_pt, icon }, settings: BusinessConfigRow[] }] }`

### GET /api/admin/business-config?audit=KEY
Returns change history for a specific config key.
- **Auth:** Admin only
- **Query Parameters:**
  - `audit` (string, required) - Config key to get history for
  - `limit` (number, optional, default 20, max 100) - Number of entries
- **Response:** `{ key: string, history: BusinessConfigAuditRow[] }`

### PUT /api/admin/business-config
Update a single business config value. Validates against min/max bounds per value type.
- **Auth:** Admin only
- **CSRF:** Required
- **Body:**
  - `config_key` (string, required) - Setting key (e.g. `pricing_parent.individual_presencial`)
  - `config_value` (string, required) - New value as string
- **Response:** `{ success: true, key: string, value: string }`
- **Errors:**
  - `VALIDATION_ERROR` - Key not found, value out of bounds, or invalid type
- **Notes:** Creates audit trail entry with old/new values and admin email. Values validated against `value_type` (number/string/boolean) and `min_value`/`max_value` bounds.

---

## Webhook APIs

### POST /api/webhooks/jotform
Handles JotForm form submissions for lead intake.
- **Auth:** JotForm signature
- **Body:** JotForm submission payload
- **Response:** `200 OK`

### POST /api/webhooks/stripe
Handles Stripe webhook events for subscription and payment updates.
- **Auth:** Stripe webhook signature (`stripe-signature` header)
- **Events Handled:**
  - `customer.subscription.created/updated/deleted`
  - `invoice.paid/payment_failed`
  - `payment_intent.succeeded`
- **Response:** `200 OK`

### POST /api/webhooks/autentique
Handles Autentique webhook events when contracts are viewed, signed, or rejected.
- **Auth:** HMAC-SHA256 signature via `x-autentique-signature` header
- **Events Handled:**
  - `signature.viewed` → status = VIEWED
  - `signature.accepted` → status = SIGNED
  - `signature.rejected` → status = REJECTED
  - `document.finished` → final confirmation
- **Response:** `200 OK` (always, to prevent retries)

---

## Contract APIs (Admin)

### GET /api/admin/contracts
List contracts with optional filters.
- **Auth:** Admin (`canEditSchedules`)
- **Query Params:** `year` (integer), `status` (string), `category` (`matricula` | `service` | `all`), `limit` (integer), `offset` (integer)
- **Response:** `{ contracts: Contract[], total: number }`

### POST /api/admin/contracts
Create DRAFT contracts for selected students.
- **Auth:** Admin (`canEditSchedules`) + CSRF
- **Body:**
```json
{
  "student_ids": ["stu_abc", "stu_def"],
  "contract_year": 2026,
  "overrides": {
    "stu_abc": { "contract_type": "MATRICULA", "tshirt_size": "M" }
  }
}
```
- **Response:** `{ contracts: Contract[] }`

### GET /api/admin/contracts/preview
Preview rendered contract HTML for a student (no DB record created).
- **Auth:** Admin
- **Query Params:**
  - `student_id` (required): Student ID
  - `contract_type` (optional): `MATRICULA` or `REMATRICULA` (auto-detected if omitted)
  - `tshirt_size` (optional): T-shirt size (PP, P, M, G, GG)
  - `duration` (optional): `MENSAL`, `SEMESTRAL`, or `ANUAL` (if provided, renders service contract template)
  - `image_authorization` (optional): `true`/`false` (default: true, for service contracts)
  - `contract_start_date` (optional): `YYYY-MM-DD` (for service contracts, default: today)
- **Response:** Raw HTML (`Content-Type: text/html`)

### GET /api/admin/contracts/[id]
Get single contract detail with student name.
- **Auth:** Admin (`canEditSchedules`)
- **Response:** `Contract` with `student_name`

### POST /api/admin/contracts/[id]/send
Send a DRAFT contract to Autentique for signing. Auto-cancels any older SENT/VIEWED contracts for the same student (both in DB and on Autentique).
- **Auth:** Admin (`canEditSchedules`) + CSRF
- **Response:** `Contract` with updated status
- **Note:** Autentique returns `link: null` for email-delivered signers (DELIVERY_METHOD_EMAIL). Signing URL is not available via API.

### POST /api/admin/contracts/[id]/cancel
Cancel a contract (locally + on Autentique).
- **Auth:** Admin (`canEditSchedules`) + CSRF
- **Response:** `{ success: true }`

### GET /api/admin/contracts/[id]/poll-status
Poll Autentique for latest contract status.
- **Auth:** Admin (`canEditSchedules`)
- **Response:** `Contract` with updated status

### POST /api/admin/contracts/batch-send
Batch generate and send contracts for multiple students. Supports both matrícula and service contracts.
- **Auth:** Admin (`canEditSchedules`) + CSRF
- **Body (matrícula):**
```json
{
  "student_ids": ["stu_abc", "stu_def"],
  "contract_year": 2026,
  "overrides": {
    "stu_abc": { "contract_type": "REMATRICULA", "tshirt_size": "G" }
  }
}
```
- **Body (service contract — has `duration` field):**
```json
{
  "student_ids": ["stu_abc", "stu_def"],
  "duration": "ANUAL",
  "image_authorization": true,
  "contract_start_date": "2026-02-01",
  "overrides": {
    "stu_abc": { "duration": "SEMESTRAL", "image_authorization": false }
  }
}
```
- **Response:** `{ batch_id: string, results: [{ student_id, success, contract?, error? }] }`
- **Note:** Each student's older SENT/VIEWED contracts are auto-cancelled before sending the new one. Service contracts require a signed matrícula.

### GET /api/students/[id]/contract-summary
Returns contract summary for a student (matrícula status, active service contract, days remaining, history, enrollment dates).
- **Auth:** Any authenticated user
- **Response:**
```json
{
  "hasMatricula": true,
  "matriculaNumber": "Nº12260001",
  "latestMatricula": { "id": "...", "contract_type": "MATRICULA", "status": "SIGNED", "signed_at": 1706745600 },
  "activeServiceContract": { "id": "...", "duration": "ANUAL", "status": "SIGNED", "contract_start_date": "2026-02-01", "contract_end_date": "2027-02-01", "signed_at": 1706832000, "days_remaining": 362, "urgency_level": "green" },
  "maxDurationWarning": "Contrato excede 1 ano (372 dias)",
  "enrollmentDates": {
    "start": "2026-02-17",
    "effectiveEnd": "2026-12-13",
    "academicStart": "2026-02-17",
    "academicEnd": "2026-12-13"
  },
  "contractHistory": [...]
}
```

---

## Parent APIs (Additional)

### GET /api/reschedule-suggestions/[enrollmentId]
Returns intelligent slot suggestions for rescheduling a class.
- **Auth:** Parent (must own the student linked to enrollment)
- **Query Params:** None
- **Features:**
  - Considers teacher availability (real schedules, not just open slots)
  - Calculates travel times between classes (zone-based matrix, no API costs)
  - Identifies makeup slots from cancelled classes (TEMPORARILY_AVAILABLE)
  - Detects extended class options (+30min, +60min when adjacent slots are free)
  - Scores and ranks slots (travel efficiency, parent preference, time proximity)
- **Response:**
```json
{
  "enrollmentId": "enr_abc123",
  "studentName": "Maria Silva",
  "teacherName": "Prof. João",
  "currentSlot": {
    "dayOfWeek": "Segunda",
    "startTime": "14:00",
    "duration": 60
  },
  "suggestions": [
    {
      "date": "2026-01-20",
      "dayOfWeek": "Segunda",
      "startTime": "14:00",
      "endTime": "15:00",
      "score": 85,
      "isMakeupSlot": false,
      "travelTimeMinutes": 10,
      "extendedOptions": { "plus30": true, "plus60": false },
      "reason": "mesmo dia da semana, mesmo horário",
      "isRecommended": true
    }
  ],
  "totalAvailable": 15
}
```
- **Errors:**
  - `401 UNAUTHORIZED` - Not authenticated
  - `403 FORBIDDEN` - Parent doesn't own this student
  - `404 NOT_FOUND` - Enrollment not found

### POST /api/parent/reschedule-class
Reschedules a class to a different time slot.
- **Auth:** Parent
- **Body:** `{ enrollment_id, original_date, new_date, new_time, reason? }`
- **Response:** `{ success: true, exceptionId: string, makeupId: string, message: string, billing: {...} }`

---

## Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `CSRF_INVALID` | 403 | Invalid CSRF token |
| `NOT_FOUND` | 404 | Resource not found |
| `SLOT_CONFLICT` | 409 | Enrollment slot blocked |
| `PAUSADO_BLOCKED` | 422 | PAUSADO cooldown active |
| `RELOCATION_IMPACT` | 422 | Address change affects enrollments (requires acknowledgment) |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `RATE_LIMITED` | 429 | Too many requests |

---

## Security Features

1. **OAuth 2.0 + PKCE** - Secure authentication flow
2. **CSRF Protection** - Token validation on all mutations
3. **Rate Limiting** - Per-endpoint and per-user limits
4. **Role-Based Access** - Admin/Teacher/Parent permissions
5. **IDOR Prevention** - Parent/Teacher filtered data access
6. **PII Encryption** - AES-256-GCM for sensitive fields
7. **SQL Injection Prevention** - Prepared statements only
8. **XSS Prevention** - Input sanitization + CSP headers

---

**Last Updated:** 2026-01-07
