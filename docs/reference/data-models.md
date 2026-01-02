# Data Models - EduSchedule App

**Last Updated:** 2025-12-30
**Database:** Cloudflare D1 (SQLite-compatible)
**Project:** Bilin App - EduSchedule
**Tables:** 23 total (11 core + 12 via migrations)

## Overview

The EduSchedule database uses Cloudflare D1, a serverless SQLite database. The schema implements an **enrollment-first paradigm** where enrollments are the source of truth for scheduling, with exceptions and completions tracking per-instance changes.

### Table Summary

| Category | Tables |
|----------|--------|
| **Core** | users, teachers, students, enrollments, enrollment_exceptions, class_completions, system_closures, leads, change_requests, audit_log, sessions |
| **Availability** | teacher_availability, teacher_day_zones |
| **Scheduling** | slot_reservations |
| **Status Tracking** | enrollment_status_history |
| **Time-Off** | teacher_time_off_requests |
| **Pausado Requests** | pausado_requests |
| **Travel** | travel_time_cache, travel_time_errors |
| **Notifications** | notifications, push_device_tokens |
| **Parent Links** | parent_links |
| **Teacher Credits** | teacher_credits, teacher_credit_events |

## Entity Relationship Diagram

```
users (1) ----< (many) sessions
users (1) ----< (many) audit_log

teachers (1) ----< (many) students
teachers (1) ----< (many) enrollments

students (1) ----< (many) enrollments

enrollments (1) ----< (many) enrollment_exceptions
enrollments (1) ----< (many) class_completions

leads --> (converts to) students + enrollments
```

---

## Core Tables

### 1. users

**Purpose:** User authentication and role management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique user identifier |
| email | TEXT | UNIQUE NOT NULL | User email address |
| name | TEXT | NOT NULL | User display name |
| role | TEXT | NOT NULL, CHECK | User role: 'admin', 'teacher', 'parent' |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp of creation |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp of last update |

**Indexes:** `idx_users_email`, `idx_users_role`

---

### 2. teachers

**Purpose:** Teacher profile and contact information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique teacher identifier |
| nickname | TEXT | UNIQUE NOT NULL | Teacher nickname/short name |
| full_name | TEXT | NOT NULL | Teacher full legal name |
| email | TEXT | | Teacher email (ENCRYPTED) |
| phone | TEXT | | Teacher phone (ENCRYPTED) |
| cpf_encrypted | TEXT | | Encrypted Brazilian CPF |
| pix_key_encrypted | TEXT | | Encrypted PIX payment key |
| address_encrypted | TEXT | | Encrypted home address |
| birth_date | TEXT | | Birth date (ISO 8601) |
| languages | TEXT | | JSON array: `["English", "Spanish"]` |
| teaching_cities | TEXT | | JSON array of cities served |
| active | INTEGER | NOT NULL, DEFAULT 1 | Active status |
| join_date | TEXT | | Date teacher joined |
| contract_date | TEXT | | Contract signing date |
| notes | TEXT | | Admin notes |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Relationships:** Has many `students`, `enrollments`

---

### 3. students

**Purpose:** Student enrollment and parent information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique student identifier |
| name | TEXT | NOT NULL | Student name |
| status | TEXT | NOT NULL, CHECK | See status values below |
| birth_date | TEXT | | Birth date |
| address_encrypted | TEXT | | Encrypted student address |
| allergies_encrypted | TEXT | | Encrypted allergy info |
| student_needs | TEXT | | About the student (interests, needs) |
| teacher_id | TEXT | FOREIGN KEY | Assigned teacher ID |
| teacher_nickname | TEXT | | Denormalized teacher name |
| class_mode | TEXT | | Presencial Individual, Dupla/Grupo, Online |
| plan_type | TEXT | | Semanal, Quinzenal, Trimestral |
| level | TEXT | | Student proficiency level |
| **Primary Parent** | | | |
| parent_name_encrypted | TEXT | | Encrypted parent name |
| parent_phone_encrypted | TEXT | | Encrypted parent phone |
| parent_email_encrypted | TEXT | | Encrypted parent email |
| parent_instagram | TEXT | | Parent Instagram handle |
| parent_cpf_encrypted | TEXT | | Encrypted Brazilian CPF |
| **Second Parent (Optional)** | | | |
| parent2_name_encrypted | TEXT | | Encrypted second parent name |
| parent2_phone_encrypted | TEXT | | Encrypted second parent phone |
| parent2_email_encrypted | TEXT | | Second parent email (auto-creates login) |
| **Contract & Location** | | | |
| contract_status | TEXT | | Active, Pending, etc. |
| contract_start | TEXT | | Contract start date |
| contract_end | TEXT | | Contract end date |
| payment_status | TEXT | | Current payment status |
| image_permission | INTEGER | | Can post student photos (0/1) |
| neighborhood | TEXT | | Student neighborhood |
| city | TEXT | | Student city |
| lat | REAL | | Latitude for travel time |
| lon | REAL | | Longitude for travel time |
| **From Lead (preserved during conversion)** | | | |
| availability_windows | TEXT | | JSON array of preferred times |
| referral_source | TEXT | | How did they find us |
| referral_detail | TEXT | | Referral details |
| **Metadata** | | | |
| notes | TEXT | | Admin notes |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| archived_at | INTEGER | | Soft delete timestamp |

**Status Values:** `ATIVO`, `AULA_TESTE`, `PAUSADO`, `AVISO`, `INATIVO` (uppercase, syncs with enrollment status)

**Second Parent Login:** Both parent emails can log in via Google/Microsoft OAuth. The system auto-creates `parent_links` entries during Lead→Student conversion.

---

## Enrollment System Tables

### 4. enrollments

**Purpose:** Persistent recurring class commitments (student + teacher + weekly slot)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Format: `enr_xxx` |
| student_id | TEXT | NOT NULL, FK | References students(id) |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) |
| day_of_week | INTEGER | NOT NULL, CHECK 0-6 | 0=Sunday, 1=Monday, etc. |
| start_time | TEXT | NOT NULL | Format: "HH:MM" (24h) |
| duration_minutes | INTEGER | NOT NULL, DEFAULT 60 | Class duration |
| language | TEXT | NOT NULL | English, Spanish, etc. |
| hourly_rate | REAL | NOT NULL | Rate in BRL (R$) |
| status | TEXT | NOT NULL, DEFAULT 'ATIVO' | See status lifecycle |
| pausado_at | INTEGER | | Unix timestamp when paused |
| pausado_started_at | INTEGER | | When pause began (for tracking) |
| pausado_reason | TEXT | | Reason for pause |
| pausado_cooldown_until | INTEGER | | Unix timestamp when cooldown ends |
| recurrence_start_date | TEXT | NOT NULL | When enrollment began (YYYY-MM-DD) |
| google_calendar_event_id | TEXT | | Linked calendar event |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Indexes:**
- `idx_enrollments_student_id`
- `idx_enrollments_teacher_id`
- `idx_enrollments_status`
- `idx_enrollments_day_time` on (teacher_id, day_of_week, start_time)

**Status Lifecycle:**
```
ATIVO <--> PAUSADO --> CANCELADO
  |          |
  +----------+ (auto-return after 3 weeks max)
```

**PAUSADO Rules (FR42-46):**
- Maximum duration: 3 weeks
- Cooldown: 5 months before re-pausing
- Auto-return via lazy evaluation (no cron jobs)
- Admin can override cooldown

---

### 5. enrollment_exceptions

**Purpose:** Per-instance deviations (cancellations, reschedules)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Format: `exc_xxx` |
| enrollment_id | TEXT | NOT NULL, FK | References enrollments(id) |
| teacher_id | TEXT | NOT NULL | Teacher ID (denormalized from enrollment for performance) |
| exception_date | TEXT | NOT NULL | Date affected (YYYY-MM-DD) |
| exception_type | TEXT | NOT NULL | See types below |
| original_time | TEXT | | Original start time |
| new_date | TEXT | | Rescheduled date |
| new_time | TEXT | | Rescheduled time |
| reason | TEXT | | Reason for exception |
| requested_by | TEXT | NOT NULL | User role who requested |
| approved_by | TEXT | | Admin who approved |
| approved_at | INTEGER | | Approval timestamp |
| status | TEXT | NOT NULL, DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED |
| is_sick_protected | INTEGER | DEFAULT 0 | 1 if sick cancellation (no penalty) |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Exception Types:**
- `CANCELLED_STUDENT` - Student/parent cancelled (not billed)
- `CANCELLED_TEACHER` - Teacher cancelled (requires approval)
- `CANCELLED_ADMIN` - Admin cancelled on behalf of student/teacher
- `RESCHEDULED` - Moved to different date/time (legacy)
- `RESCHEDULED_BY_STUDENT` - Rescheduled by student/parent
- `RESCHEDULED_BY_TEACHER` - Rescheduled by teacher
- `HOLIDAY` - System closure

**Note:** `NO_SHOW` is a `class_completions.status` value, not an exception type.

**Approval Flow (FR14):**
- Parent cancellations: Auto-approved
- Teacher cancellations: Require admin approval
- Admin cancellations: Auto-approved

---

### 6. class_completions

**Purpose:** Proof of delivery for invoicing + BILIN learning feedback

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Format: `cmp_xxx` |
| enrollment_id | TEXT | NOT NULL, FK | References enrollments(id) |
| class_date | TEXT | NOT NULL | Date of class (YYYY-MM-DD) |
| class_time | TEXT | NOT NULL | Actual start time |
| status | TEXT | NOT NULL | COMPLETED, NO_SHOW |
| notes | TEXT | | Teacher notes (visible to parents) |
| bilin_pillars | TEXT | NULL | JSON array of 1-3 BILIN pillar keys |
| skill_ratings | TEXT | NULL | JSON object with 6 skill ratings (0-5) |
| marked_by | TEXT | NOT NULL | Teacher who marked |
| actual_rate | REAL | NULL | Rate charged for this class (for group billing) |
| effective_group_size | INTEGER | NULL | Number of active group members at completion time |
| group_id | TEXT | NULL | Group ID at completion time (temporal snapshot) |
| group_members_snapshot | TEXT | NULL | JSON array of group members at completion time |
| makeup_for_date | TEXT | NULL | Date this makeup class is for (YYYY-MM-DD) |
| makeup_for_exception_id | TEXT | NULL, FK | Links to cancelled class exception |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**BILIN Pillar Keys:** `ACONCHEGO_EDUCATIVO`, `CONEXAO_LUDICA`, `CRESCIMENTO_NATURAL`, `CURIOSIDADE_ATENTA`, `EXPRESSAO_VIVA`, `JORNADA_UNICA`, `PROCESSO_CONTINUO`

**Skill Rating Keys:** `criatividade`, `leitura`, `escrita`, `escuta`, `atencao`, `espontaneidade` (values 0-5)

**Group Members Snapshot Format:** `[{"student_id": "xxx", "student_name": "Name", "enrollment_id": "yyy"}, ...]`

**Indexes:**
- `idx_completions_makeup_exception` on makeup_for_exception_id (partial)
- `idx_completions_makeup_date` on makeup_for_date (partial)
- `idx_completions_has_bilin_feedback` on (enrollment_id, class_date) WHERE bilin_pillars IS NOT NULL

**Edit Window (FR16):** Teachers can edit notes within 7 days

---

### 7. system_closures

**Purpose:** Holidays and FÉRIAS periods

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Format: `cls_xxx` |
| closure_type | TEXT | NOT NULL | FERIAS, HOLIDAY, WEATHER, EMERGENCY, CUSTOM |
| start_date | TEXT | NOT NULL | Start date (YYYY-MM-DD) |
| end_date | TEXT | NOT NULL | End date (YYYY-MM-DD) |
| name | TEXT | NOT NULL | Display name |
| affects_all | INTEGER | NOT NULL, DEFAULT 1 | 1=all teachers |
| city_id | TEXT | FK | References cities(id), NULL = all cities |
| teacher_ids | TEXT | | JSON array if not all |
| created_by | TEXT | NOT NULL | Admin who created |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

---

### 8. leads

**Purpose:** Pre-enrollment pipeline management (from cadastro.astro registration)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Format: `led_xxx` |
| status | TEXT | NOT NULL, DEFAULT 'AGUARDANDO' | See pipeline stages |
| **Primary Parent** | | | |
| parent_name | TEXT | NOT NULL | Parent/guardian name |
| parent_email | TEXT | NOT NULL | Contact email |
| parent_phone | TEXT | | WhatsApp number |
| parent_instagram | TEXT | | Instagram handle |
| parent_cpf_encrypted | TEXT | | Encrypted Brazilian CPF |
| **Second Parent (Optional)** | | | |
| parent2_name | TEXT | | Second parent name |
| parent2_phone | TEXT | | Second parent phone |
| parent2_email | TEXT | | Second parent email (auto-creates login) |
| **Student Info** | | | |
| student_name | TEXT | NOT NULL | Prospective student name |
| student_birth_date | TEXT | | Birth date YYYY-MM-DD |
| student_needs | TEXT | | About the student (interests, needs) |
| student_allergies | TEXT | | Allergy information |
| student_in_school | INTEGER | | Currently in school (0/1) |
| **Location** | | | |
| address_encrypted | TEXT | | Encrypted home address |
| neighborhood | TEXT | | Neighborhood for matching |
| city | TEXT | NOT NULL, DEFAULT | City (default: Florianópolis) |
| state | TEXT | | State (e.g., SC) |
| postal_code | TEXT | | CEP postal code |
| lat | REAL | | Latitude |
| lon | REAL | | Longitude |
| **Preferences** | | | |
| class_mode | TEXT | | Presencial, Online, Ambos |
| language | TEXT | | English, Spanish, etc. |
| availability_windows | TEXT | | JSON array of time slots |
| **Referral** | | | |
| referral_source | TEXT | | How did they find us |
| referral_detail | TEXT | | Referral details |
| **Matching & Conversion** | | | |
| matched_teacher_id | TEXT | FK | Matched teacher |
| matched_at | INTEGER | | When matched |
| rejection_reason | TEXT | | If rejected |
| converted_to_enrollment_id | TEXT | FK | After conversion |
| converted_at | INTEGER | | Conversion timestamp |
| jotform_submission_id | TEXT | | JotForm sync tracking |
| **Metadata** | | | |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Pipeline Stages:**
```
AGUARDANDO --> EM_ANALISE --> WAITLIST --> CONTRACTED
                   |
                   +--> NOT_A_MATCH
```

**Conversion Flow:** When a class is scheduled with a teacher, the lead automatically converts:
1. Student record created (all fields preserved)
2. Enrollment record created (day, time, teacher, language)
3. Parent links created (both parents can log in via OAuth)
4. Lead status → CONTRACTED

---

## Support Tables

### 9. change_requests

**Purpose:** Workflow approval queue

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Request identifier |
| request_type | TEXT | NOT NULL | TEACHER_CANCEL, etc. |
| resource_type | TEXT | NOT NULL | enrollment, exception |
| resource_id | TEXT | NOT NULL | ID of affected resource |
| requested_by | TEXT | NOT NULL | User who requested |
| requested_by_role | TEXT | NOT NULL | Role of requester |
| status | TEXT | NOT NULL, DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED |
| data | TEXT | | JSON request data |
| approved_by | TEXT | | Admin who resolved |
| approved_at | INTEGER | | Resolution timestamp |
| rejection_reason | TEXT | | If rejected |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

---

### 10. audit_log

**Purpose:** Security and compliance audit trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Log ID |
| user_id | TEXT | | User who performed action |
| user_email | TEXT | | User email (denormalized) |
| action | TEXT | NOT NULL | Action type |
| resource_type | TEXT | | enrollment, exception, etc. |
| resource_id | TEXT | | ID of affected resource |
| ip_address | TEXT | | Request IP |
| user_agent | TEXT | | Browser info |
| success | INTEGER | NOT NULL, DEFAULT 1 | 1=success, 0=failure |
| error_message | TEXT | | Error if failed |
| metadata | TEXT | | JSON context |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Action Types:** `login`, `logout`, `create_enrollment`, `update_enrollment`, `create_exception`, `approve_exception`, `mark_complete`, `convert_lead`, etc.

---

### 11. sessions

**Purpose:** Server-side session storage

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Session identifier |
| user_id | TEXT | NOT NULL, FK | User who owns session |
| user_email | TEXT | NOT NULL | User email |
| data_encrypted | TEXT | NOT NULL | AES-256-GCM encrypted data |
| expires_at | INTEGER | NOT NULL | Expiration timestamp |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

---

## Data Encryption Strategy

### Encrypted Fields (AES-256-GCM)

**Teachers:**
- `email` - Contact email
- `phone` - Contact phone
- `cpf_encrypted` - Brazilian tax ID
- `pix_key_encrypted` - Payment key
- `address_encrypted` - Home address

**Students:**
- `address_encrypted` - Home address
- `allergies_encrypted` - Medical info
- `parent_name_encrypted` - Primary parent name
- `parent_phone_encrypted` - Primary parent contact
- `parent_email_encrypted` - Primary parent email
- `parent_cpf_encrypted` - Primary parent CPF
- `parent2_name_encrypted` - Second parent name
- `parent2_phone_encrypted` - Second parent contact
- `parent2_email_encrypted` - Second parent email

**Sessions:**
- `data_encrypted` - Complete session data

### Encryption Notes

1. **Algorithm:** AES-256-GCM with random IV
2. **Key Storage:** Cloudflare environment variables
3. **Searchability:** Encrypted fields require full table scan with in-memory filtering
4. **Performance Trade-off:** Acceptable for <100 teachers, <500 students

---

## Slot Computation Logic

Slots are **computed, not stored**. The `slot-service.ts` derives LIVRE/BLOCKED status:

```typescript
// Pseudo-logic for slot status
function getSlotStatus(teacherId, dayOfWeek, time) {
  const enrollment = findEnrollment(teacherId, dayOfWeek, time);

  if (!enrollment) return 'LIVRE';
  if (enrollment.status === 'CANCELADO') return 'LIVRE';
  if (enrollment.status === 'ATIVO' || enrollment.status === 'PAUSADO') {
    return 'BLOCKED';
  }
  return 'LIVRE';
}
```

**Key Rule:** Both ATIVO and PAUSADO enrollments block slots (slot is held during pause).

---

## Common Query Patterns

### Get teacher schedule for date range
```sql
SELECT e.*, s.name as student_name
FROM enrollments e
JOIN students s ON e.student_id = s.id
WHERE e.teacher_id = ?
  AND e.status IN ('ATIVO', 'PAUSADO')
  AND e.day_of_week = strftime('%w', ?)
ORDER BY e.start_time;
```

### Get pending teacher cancellations
```sql
SELECT ee.*, e.student_id, e.teacher_id
FROM enrollment_exceptions ee
JOIN enrollments e ON ee.enrollment_id = e.id
WHERE ee.exception_type = 'CANCELLED_TEACHER'
  AND ee.status = 'PENDING'
ORDER BY ee.exception_date;
```

### Calculate monthly invoice
```sql
SELECT
  COUNT(CASE WHEN cc.status = 'COMPLETED' THEN 1 END) as completed,
  COUNT(CASE WHEN cc.status = 'NO_SHOW' THEN 1 END) as no_shows,
  e.hourly_rate
FROM class_completions cc
JOIN enrollments e ON cc.enrollment_id = e.id
WHERE e.student_id = ?
  AND cc.class_date BETWEEN ? AND ?
GROUP BY e.id;
```

### Find PAUSADO enrollments due for auto-return
```sql
SELECT * FROM enrollments
WHERE status = 'PAUSADO'
  AND pausado_return_date <= unixepoch();
```

---

---

## Additional Tables (Added via Migrations)

### 12. teacher_availability

**Purpose:** Teacher weekly availability slots

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Availability ID |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) |
| day_of_week | INTEGER | NOT NULL, CHECK 0-6 | 0=Sunday, etc. |
| start_time | TEXT | NOT NULL | Start time HH:MM |
| end_time | TEXT | NOT NULL | End time HH:MM |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Note:** Availability slots are created/deleted, not toggled (no is_active flag).

---

### 13. teacher_day_zones

**Purpose:** Teacher geographic zones per day (for travel optimization)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Zone ID |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) |
| day_of_week | INTEGER | NOT NULL, CHECK 0-6 | Day of week |
| city | TEXT | NOT NULL | City/zone name for that day |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Note:** Single zone per day enforced (no priority needed).

---

### 14. enrollment_status_history

**Purpose:** Audit trail for enrollment status changes (compliance)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | History ID |
| enrollment_id | TEXT | NOT NULL, FK | References enrollments(id) |
| old_status | TEXT | | Previous status |
| new_status | TEXT | NOT NULL | New status |
| changed_by | TEXT | NOT NULL | User who changed |
| reason | TEXT | | Reason for change |
| override_cooldown | INTEGER | DEFAULT 0 | Admin override flag |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

---

### 15. teacher_time_off_requests

**Purpose:** Teacher vacation/time-off requests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Request ID |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) |
| start_date | TEXT | NOT NULL | Start date YYYY-MM-DD |
| end_date | TEXT | NOT NULL | End date YYYY-MM-DD |
| reason | TEXT | | Reason for request |
| status | TEXT | DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED |
| approved_by | TEXT | | Admin who approved |
| approved_at | INTEGER | | Approval timestamp |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

---

### 16. travel_time_cache

**Purpose:** Cache for Google Maps travel time calculations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Cache ID |
| origin | TEXT | NOT NULL | Origin address/coords |
| destination | TEXT | NOT NULL | Destination address/coords |
| travel_time_minutes | INTEGER | NOT NULL | Calculated travel time |
| distance_km | REAL | | Distance in kilometers |
| cached_at | INTEGER | NOT NULL | When cached |
| expires_at | INTEGER | NOT NULL | Cache expiration |

**Index:** UNIQUE on (origin, destination)

---

### 17. travel_time_errors

**Purpose:** Track failed travel time API calls

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Error ID |
| origin | TEXT | NOT NULL | Origin that failed |
| destination | TEXT | NOT NULL | Destination that failed |
| error_code | TEXT | NOT NULL | API error code |
| error_message | TEXT | | Error details |
| created_at | INTEGER | NOT NULL | Unix timestamp |

---

### 18. notifications

**Purpose:** In-app notification system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Notification ID |
| user_id | TEXT | NOT NULL, FK | Target user |
| type | TEXT | NOT NULL | Notification type |
| title | TEXT | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification body |
| link | TEXT | | Optional action link |
| read | INTEGER | DEFAULT 0 | Read status |
| created_at | INTEGER | NOT NULL | Unix timestamp |

---

### 18b. push_device_tokens

**Purpose:** Store FCM device tokens for push notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Token ID (pdt_xxx) |
| user_id | TEXT | NOT NULL, FK | References users(id) |
| fcm_token | TEXT | NOT NULL, UNIQUE | Firebase Cloud Messaging token |
| platform | TEXT | NOT NULL | Platform: 'ios', 'android', 'web' |
| device_name | TEXT | | Human-readable device name |
| is_active | INTEGER | NOT NULL, DEFAULT 1 | Token active status |
| created_at | INTEGER | NOT NULL | Unix timestamp |
| updated_at | INTEGER | NOT NULL | Unix timestamp |
| last_used_at | INTEGER | | Last successful push timestamp |

**Indexes:**
- UNIQUE on `fcm_token` - prevents duplicate registrations
- On `user_id` for listing user's devices
- On `is_active` for filtering active tokens

**Business Rules:**
- FCM token is unique across all users (device can only belong to one account)
- Tokens are deactivated (not deleted) when invalid response from FCM
- Only active tokens receive push notifications
- One user can have multiple devices (web, mobile, etc.)

---

### 19. parent_links

**Purpose:** Link parent email addresses to students for OAuth login access

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Link ID |
| auth_email | TEXT | NOT NULL | Parent email (lowercase) |
| student_id | TEXT | NOT NULL, FK | Student ID |
| created_by | TEXT | | Who created: 'system', admin ID |
| created_at | INTEGER | NOT NULL | Unix timestamp |

**Index:** UNIQUE on (auth_email, student_id)

**How it works:**
1. When parent logs in via Google/Microsoft OAuth, their email is checked against `parent_links`
2. If found, they can access that student's data
3. Auto-created during Lead→Student conversion for both parent emails
4. Both parents (primary + secondary) can log in if both emails provided

---

### 20. pausado_requests

**Purpose:** Parent-initiated pause requests for enrollments (requires admin approval)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Request ID (psr_xxx) |
| enrollment_id | TEXT | NOT NULL, FK | References enrollments(id) |
| student_id | TEXT | NOT NULL, FK | References students(id) |
| parent_email | TEXT | NOT NULL | Requesting parent email |
| requested_start_date | TEXT | NOT NULL | When pausado should start YYYY-MM-DD |
| reason | TEXT | | Optional reason for pause |
| status | TEXT | NOT NULL, DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED |
| requested_at | INTEGER | NOT NULL | Unix timestamp of request |
| reviewed_by | TEXT | FK | Admin who reviewed |
| reviewed_at | INTEGER | | Review timestamp |
| admin_notes | TEXT | | Admin notes on decision |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Indexes:**
- On `status` for filtering pending requests
- On `enrollment_id` for lookups
- On `student_id` for parent queries

**Business Rules:**
- Only ATIVO enrollments can have pausado requests
- 5-month cooldown period between pauses enforced
- When approved, enrollment transitions to PAUSADO on requested_start_date
- 21-day maximum pause period before auto-return to ATIVO

---

### 21. teacher_credits

**Purpose:** Teacher scoring and tiered pay rate system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Credit ID (tcr_xxx) |
| teacher_id | TEXT | NOT NULL, UNIQUE, FK | References teachers(id) |
| credit_score | INTEGER | NOT NULL, DEFAULT 700 | Score 0-1000 |
| tier | TEXT | NOT NULL, DEFAULT 'STANDARD' | NEW, STANDARD, PREMIUM, ELITE |
| individual_rate | REAL | NOT NULL, DEFAULT 85 | Pay rate for individual classes |
| group_rate | REAL | NOT NULL, DEFAULT 58 | Pay rate for group classes |
| total_classes_taught | INTEGER | DEFAULT 0 | Lifetime class count |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Tier Mapping:**
| Tier | Score Range | Individual Rate | Group Rate |
|------|-------------|-----------------|------------|
| NEW | 0-499 | R$79 | R$50 |
| STANDARD | 500-699 | R$85 | R$58 |
| PREMIUM | 700-899 | R$90 | R$65 |
| ELITE | 900-1000 | R$95 | R$70 |

**Indexes:**
- On `teacher_id` (unique)
- On `tier` for filtering

**Business Rules:**
- Each teacher has exactly one credit record
- Existing teachers are grandfathered at ELITE tier (score 950)
- New teachers start at NEW tier (score 300)
- Scores updated based on performance events (see teacher_credit_events)
- Rates are used for teacher earnings, NOT client billing

---

### 22. teacher_credit_events

**Purpose:** Audit log of all teacher credit score changes for gamification

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Event ID (tce_xxx) |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) |
| event_type | TEXT | NOT NULL | CLASS_COMPLETED, PARENT_FEEDBACK_POSITIVE, etc. |
| points_change | INTEGER | NOT NULL | Points added/deducted (+5, -15, etc.) |
| score_before | INTEGER | NOT NULL | Score before this event |
| score_after | INTEGER | NOT NULL | Score after this event |
| tier_before | TEXT | NOT NULL | Tier before this event |
| tier_after | TEXT | NOT NULL | Tier after this event (may differ if threshold crossed) |
| reference_id | TEXT | | ID of related entity (completion_id, feedback_id) |
| reference_type | TEXT | | completion, feedback, manual, system |
| notes | TEXT | | Optional notes for manual adjustments |
| created_by | TEXT | | user_id or 'system' |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Event Types:**
| Type | Points | Trigger |
|------|--------|---------|
| CLASS_COMPLETED | +5 | Teacher marks class complete |
| CLASS_CONFIRMED_EARLY | +3 | Confirmation >24h before class |
| CLASS_CONFIRMED_LATE | -2 | Confirmation <2h before class |
| PARENT_FEEDBACK_POSITIVE | +10 | 4-5 star feedback |
| PARENT_FEEDBACK_NEGATIVE | -15 | 1-2 star feedback |
| PUNCTUALITY_BONUS | +2 | Started on time |
| PUNCTUALITY_PENALTY | -5 | Started late |
| TIER_ADJUSTMENT | varies | Manual admin adjustment |
| INITIAL_SCORE | varies | Score when teacher record created |

**Indexes:**
- On `teacher_id` for teacher history queries
- On `event_type` for filtering
- On `created_at` for chronological queries
- On `(reference_type, reference_id)` for duplicate prevention

**Business Rules:**
- Events are append-only (no updates/deletes)
- Score is always clamped to 0-1000
- Tier boundaries checked after each event
- INITIAL_SCORE created automatically for new teachers

---

### 23. slot_reservations

**Purpose:** Movie theater pattern for slot booking - prevents concurrent double-booking by temporarily reserving slots

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Reservation ID (res_xxx) |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) ON DELETE CASCADE |
| day_of_week | INTEGER | NOT NULL, CHECK 0-6 | Day of week (0=Sunday) |
| start_time | TEXT | NOT NULL | Time in HH:MM format |
| duration_minutes | INTEGER | NOT NULL, DEFAULT 60 | Slot duration |
| reserved_by_user_id | TEXT | NOT NULL, FK | References users(id) |
| reserved_by_name | TEXT | NOT NULL | Display name of reserving user |
| reserved_at | INTEGER | NOT NULL | Unix timestamp of reservation |
| expires_at | INTEGER | NOT NULL | Unix timestamp when reservation expires |
| status | TEXT | NOT NULL, DEFAULT 'reserved' | reserved, booked, released, expired |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Indexes:**
- UNIQUE on `(teacher_id, day_of_week, start_time, duration_minutes) WHERE status = 'reserved'` - enforces first-click-wins
- On `teacher_id` for teacher slot queries
- On `reserved_by_user_id` for user reservation queries
- On `status, expires_at` for cleanup queries

**Business Rules:**
- Only ONE active reservation allowed per slot (enforced by unique partial index)
- Reservations expire after 5 minutes (300 seconds)
- Status transitions: reserved → booked (enrollment created) OR released (user cancelled) OR expired (timeout)
- Stale reservations are cleaned up automatically on slot queries
- Only admins can create/release reservations
- Users can only release their own reservations

---

## Database Triggers

The following triggers enforce business rules and data integrity:

### Cascade Delete Triggers

| Trigger | On Table | Action |
|---------|----------|--------|
| `trg_enrollment_cascade_exceptions` | enrollments | DELETE → Deletes related enrollment_exceptions |
| `trg_enrollment_cascade_completions` | enrollments | DELETE → Deletes related class_completions |
| `trg_enrollment_cascade_status_history` | enrollments | DELETE → Deletes related enrollment_status_history |

### Timestamp Update Triggers

Auto-update `updated_at` on record changes:
- `update_users_timestamp`, `update_teachers_timestamp`, `update_enrollments_timestamp`
- `update_leads_timestamp`, `update_availability_timestamp`, `update_approvals_timestamp`
- `update_app_settings_timestamp`, `update_teacher_credits_timestamp`, `update_slot_reservation_timestamp`

### Validation Triggers

| Trigger | On Table | Validation |
|---------|----------|------------|
| `trg_enrollment_validate_rate_insert/update` | enrollments | hourly_rate between 1-500 |
| `trg_enrollment_validate_duration_insert/update` | enrollments | duration_minutes between 15-180 |
| `trg_exception_set_teacher_id` | enrollment_exceptions | Ensures enrollment exists |

---

## Security Considerations

1. **Prepared Statements:** All queries use parameterized queries
2. **Role-Based Access:** Enforced at application layer
3. **IDOR Prevention:** Parent/teacher data filtered by ownership
4. **Audit Trail:** All modifications logged
5. **Session Expiry:** Automatic cleanup of expired sessions
6. **Status History:** Enrollment changes tracked for compliance

---

**Last Updated:** 2025-12-30
