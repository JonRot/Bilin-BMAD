# API Contracts - EduSchedule App

**Last Updated:** 2025-12-17
**Project:** Bilin App - EduSchedule
**API Type:** RESTful with Astro API Routes
**Endpoints:** 80+ total

## Overview

The EduSchedule API provides endpoints for authentication, enrollment management, scheduling, lead pipeline, student/teacher management, availability, and system administration. All endpoints use JSON for request/response bodies and implement rate limiting, CSRF protection, and role-based authentication.

### Endpoint Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Authentication | 5 | OAuth, sessions, CSRF |
| Enrollments | 12+ | CRUD, status, exceptions, completions |
| Students | 8+ | CRUD, search, status |
| Teachers | 10+ | CRUD, availability, time-off |
| Users | 6+ | Management, roles |
| Leads | 6+ | Pipeline, matching, conversion |
| Schedule | 4+ | Generation, views |
| Slots | 3+ | Availability grid |
| Calendar | 4 | Google Calendar sync |
| Admin | 10+ | Settings, utilities |
| Parent | 4+ | Dashboard, students |
| Notifications | 4+ | In-app notifications |

## Authentication

All API endpoints (except `/api/auth/login`) require authentication via session cookies set during the OAuth flow.

### Rate Limiting

| Type | Limit | Window | Usage |
|------|-------|--------|-------|
| AUTH | 5 | 60s | Login, logout, OAuth |
| READ | 200 | 60s | GET requests |
| WRITE | 30 | 60s | POST, PUT, DELETE |
| CALENDAR | 50 | 60s | Google Calendar ops |

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
Update completion notes.
- **Auth:** Teacher (7-day window) or Admin
- **CSRF:** Required

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
- **Roles:** Admin (full details), Teacher (own only)
- **Query Params:** `include_weekends`, `start_hour`, `end_hour`
- **Response:**
```json
{
  "teacher_id": "tea_xxx",
  "slots": [
    { "day_of_week": 1, "time": "09:00", "status": "LIVRE" },
    { "day_of_week": 1, "time": "10:00", "status": "BLOCKED", "student_name": "Sofia" }
  ]
}
```

---

## System APIs

### GET /api/system/closures
List system closures (holidays, FÉRIAS).
- **Auth:** Required

### POST /api/system/closures
Create system closure.
- **Auth:** Admin only
- **CSRF:** Required

### GET /api/exceptions/pending
List pending teacher cancellations.
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

### POST /api/admin/cleanup-data
Clean up orphaned data.
- **Auth:** Admin only
- **CSRF:** Required

### POST /api/admin/re-encrypt-data
Re-encrypt PII with new key.
- **Auth:** Admin only
- **CSRF:** Required

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

### POST /api/parent/cancellations
Cancel class for linked student.
- **Auth:** Parent
- **CSRF:** Required
- **Body:** `{ "enrollment_id", "date", "reason" }`

---

## Notification APIs

### GET /api/notifications
List user's notifications.
- **Auth:** Required
- **Query Params:** `unread_only`, `limit`

### PUT /api/notifications/[id]/read
Mark notification as read.
- **Auth:** Required
- **CSRF:** Required

### PUT /api/notifications/read-all
Mark all notifications as read.
- **Auth:** Required
- **CSRF:** Required

### DELETE /api/notifications/[id]
Delete notification.
- **Auth:** Required
- **CSRF:** Required

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

**Last Updated:** 2025-12-17
