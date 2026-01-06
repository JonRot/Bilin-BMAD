# API Contracts - EduSchedule App

**Last Updated:** 2026-01-06
**Project:** Bilin App - EduSchedule
**API Type:** RESTful with Astro API Routes
**Endpoints:** 129+ total

## Overview

The EduSchedule API provides endpoints for authentication, enrollment management, scheduling, lead pipeline, student/teacher management, availability, and system administration. All endpoints use JSON for request/response bodies and implement rate limiting, CSRF protection, and role-based authentication.

### Endpoint Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Authentication | 7 | Google/Microsoft OAuth, sessions, CSRF |
| Enrollments | 14 | CRUD, status, groups, exceptions, completions |
| Students | 8+ | CRUD, search, class history |
| Teachers | 12 | CRUD, availability, time-off, day-zones |
| Users | 6+ | Management, roles |
| Leads | 6+ | Pipeline, matching, conversion |
| Offers | 5 | Waitlist auto-match offers |
| Schedule | 4 | Generation, views |
| Slots | 5 | Availability grid, reservations, matches |
| System | 5 | Closures, exceptions |
| Calendar | 4 | Google Calendar sync |
| Admin | 20+ | Approvals, geocoding, settings, utilities |
| Parent | 6 | Dashboard, cancellations, pausado, feedback |
| Notifications | 5 | List, read, read-all, push registration |
| Change Requests | 5 | CRUD, approve/reject |
| Settings | 6 | App configuration, theme |
| Locations | 2 | Autocomplete, reverse geocode |
| Travel Time | 2 | Calculate, matrix |
| Webhooks | 1 | JotForm integration |
| LGPD | 7 | Consent, data export, deletion |

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
Update teacher availability.
- **Auth:** Admin, Teacher (own)
- **CSRF:** Required
- **Body:** Array of availability slots

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

**Last Updated:** 2025-12-30
