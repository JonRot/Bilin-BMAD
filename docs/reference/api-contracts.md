# API Contracts - EduSchedule App

**Last Updated:** 2025-12-30
**Project:** Bilin App - EduSchedule
**API Type:** RESTful with Astro API Routes
**Endpoints:** 120+ total

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
| Schedule | 4 | Generation, views |
| Slots | 5 | Availability grid, reservations, matches |
| System | 5 | Closures, exceptions |
| Calendar | 4 | Google Calendar sync |
| Admin | 20+ | Approvals, geocoding, settings, utilities |
| Parent | 6 | Dashboard, cancellations, pausado, feedback |
| Notifications | 3 | List, read, read-all |
| Change Requests | 5 | CRUD, approve/reject |
| Settings | 6 | App configuration, theme |
| Locations | 2 | Autocomplete, reverse geocode |
| Travel Time | 2 | Calculate, matrix |
| Webhooks | 1 | JotForm integration |

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
- **Response:** Updated enrollment
- **Errors:** `409 SLOT_CONFLICT` if new slot blocked

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
Get ghosted waitlist suggestions for LIVRE slots.
- **Auth:** Admin only
- **Query Params:**
  - `teacherId` (required): Teacher ID
  - `dayOfWeek`: Day of week (optional, returns all days if omitted)
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
          "waitlist_id": "wl_xxx",
          "student_name": "João",
          "score": 85,
          "suggested_start": "14:00",
          "suggested_end": "15:00",
          "travel_from_prev_minutes": 15,
          "is_sequential_fit": true
        }
      ]
    }
  ],
  "totalSlots": 5,
  "totalSuggestions": 12
}
```
- **Notes:** Returns top waitlist matches with travel time calculations for sequential scheduling

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
  "total": 7
}
```

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
