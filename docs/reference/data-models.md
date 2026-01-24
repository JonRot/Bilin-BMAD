# Data Models - EduSchedule App

**Last Updated:** 2026-01-24
**Database:** Cloudflare D1 (SQLite-compatible)
**Project:** Bilin App - EduSchedule
**Tables:** 45 total (11 core + 34 via migrations)

## Overview

The EduSchedule database uses Cloudflare D1, a serverless SQLite database. The schema implements an **enrollment-first paradigm** where enrollments are the source of truth for scheduling, with exceptions and completions tracking per-instance changes.

### Table Summary

| Category | Tables |
|----------|--------|
| **Core** | users, teachers, students, enrollments, enrollment_exceptions, class_completions, system_closures, leads, change_requests, audit_log, sessions |
| **Availability** | teacher_availability, teacher_day_zones, teacher_availability_history |
| **Scheduling** | slot_reservations, slot_offers, makeup_classes |
| **Status Tracking** | enrollment_status_history, student_status_history |
| **Time-Off** | teacher_time_off_requests |
| **Pausado Requests** | pausado_requests |
| **Travel** | travel_time_cache, travel_time_errors, zone_travel_matrix, address_cache |
| **Notifications** | notifications, push_device_tokens |
| **Parent Links** | parent_links |
| **Teacher Credits** | teacher_credits, teacher_credit_events |
| **Cancellation Billing** | cancellation_pending_choices, cancellation_charges, location_change_requests, location_change_responses, location_host_transfer_requests |
| **Payment & Subscription** | subscription_plans, subscriptions, stripe_customers, reschedule_credits, one_time_payments, payment_transactions |
| **LGPD Compliance** | lgpd_consent, lgpd_deletion_requests, lgpd_export_requests |
| **Data Quality** | data_issues |
| **Backup System** | backup_metadata, deleted_backup_runs |

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
| address_encrypted | TEXT | | Encrypted home address (street name) |
| address_number | TEXT | | House/building number |
| address_complement | TEXT | | Apartment, unit, floor |
| neighborhood | TEXT | | Neighborhood name |
| city | TEXT | | City name |
| state | TEXT | | State abbreviation (e.g., SC, SP) |
| postal_code | TEXT | | Postal code (CEP) |
| lat | REAL | | Latitude coordinate |
| lon | REAL | | Longitude coordinate |
| location_stable | INTEGER | DEFAULT 0 | 1=geocoded address confirmed |
| birth_date | TEXT | | Birth date (ISO 8601) |
| languages | TEXT | | JSON array: `["English", "Spanish"]` |
| teaching_cities | TEXT | | JSON array of cities served |
| teaches_presencial | INTEGER | DEFAULT 1 | 1=teaches in-person |
| teaches_online | INTEGER | DEFAULT 0 | 1=teaches online |
| teaches_individual | INTEGER | DEFAULT 1 | 1=teaches individual classes |
| teaches_group | INTEGER | DEFAULT 0 | 1=teaches group classes |
| travels_by_car | INTEGER | DEFAULT 1 | 1=available for car travel |
| travels_by_walk | INTEGER | DEFAULT 1 | 1=available for walking travel |
| travels_by_transit | INTEGER | DEFAULT 1 | 1=available for public transit |
| active | INTEGER | NOT NULL, DEFAULT 1 | Active status |
| join_date | TEXT | | Date teacher joined |
| contract_date | TEXT | | Contract signing date |
| contract_end | TEXT | | Contract end date (auto-set when inactive) |
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
| address_number | TEXT | | House/building number |
| address_complement | TEXT | | Apartment, unit, floor |
| allergies_encrypted | TEXT | | Encrypted allergy info |
| student_needs | TEXT | | About the student (interests, needs) |
| teacher_id | TEXT | FOREIGN KEY | Assigned teacher ID |
| teacher_nickname | TEXT | | Denormalized teacher name |
| class_location | TEXT | CHECK | 'Presencial' or 'Online' |
| class_format | TEXT | CHECK | 'Individual' or 'Grupo' |
| class_mode | TEXT | | @deprecated - use class_location + class_format |
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
| state | TEXT | | State (e.g., SC) |
| postal_code | TEXT | | CEP postal code |
| lat | REAL | | Latitude for travel time |
| lon | REAL | | Longitude for travel time |
| **From Lead (preserved during conversion)** | | | |
| availability_windows | TEXT | | JSON array of preferred times |
| referral_source | TEXT | | How did they find us |
| referral_detail | TEXT | | Referral details |
| **Trial Tracking** | | | |
| trial_started_at | INTEGER | | When AULA_TESTE trial began |
| trial_contract_status | TEXT | | NULL, 'PENDING', 'ACCEPTED', 'DECLINED' |
| trial_contract_sent_at | INTEGER | | When contract extension was sent |
| trial_contract_responded_at | INTEGER | | When parent responded |
| trial_contract_type | TEXT | | 'MONTHLY', 'SEMESTER', 'ANNUAL' |
| **Metadata** | | | |
| notes | TEXT | | Admin notes |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| archived_at | INTEGER | | Soft delete timestamp |

**Status Values:** `ATIVO`, `AULA_TESTE`, `PAUSADO`, `AVISO`, `INATIVO` (uppercase, syncs with enrollment status)

**Trial Period (AULA_TESTE):**
- New students from lead conversion start with `AULA_TESTE` status
- Trial period is 30 days from `trial_started_at`
- Warning sent 7 days before trial ends
- Contract types: MONTHLY (flexible), SEMESTER (6-month, 10% discount), ANNUAL (12-month, 15% discount)
- On acceptance: status → ATIVO, contract dates set
- On decline: status → INATIVO

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
| class_location | TEXT | CHECK | 'Presencial' or 'Online' |
| class_format | TEXT | CHECK | 'Individual' or 'Grupo' |
| class_mode | TEXT | | @deprecated - use class_location + class_format |
| plan_type | TEXT | DEFAULT 'Semanal' | 'Semanal' or 'Quinzenal' |
| quinzenal_week | INTEGER | DEFAULT 1 | 1 or 2 for bi-weekly scheduling |
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

**Purpose:** Proof of delivery for invoicing + BILIN learning feedback + Historical Integrity

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
| feedback_status | TEXT | DEFAULT 'PENDING' | PENDING, SUBMITTED, SKIPPED |
| feedback_submitted_at | INTEGER | NULL | Unix timestamp when feedback was submitted |
| feedback_points_awarded | INTEGER | DEFAULT 0 | Points awarded for feedback timing (0 or 1) |
| enrollment_snapshot | TEXT | NULL | JSON: enrollment state at completion time |
| student_snapshot | TEXT | NULL | JSON: student state at completion time |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**BILIN Pillar Keys:** `ACONCHEGO_EDUCATIVO`, `CONEXAO_LUDICA`, `CRESCIMENTO_NATURAL`, `CURIOSIDADE_ATENTA`, `EXPRESSAO_VIVA`, `JORNADA_UNICA`, `PROCESSO_CONTINUO`

**Skill Rating Keys:** `criatividade`, `leitura`, `escrita`, `escuta`, `atencao`, `espontaneidade` (values 0-5)

**Group Members Snapshot Format:** `[{"student_id": "xxx", "student_name": "Name", "enrollment_id": "yyy"}, ...]`

**Enrollment Snapshot Format:** `{"teacher_id": "...", "teacher_nickname": "...", "hourly_rate": 95.0, ...}`

**Student Snapshot Format:** `{"id": "...", "name": "...", "status": "ATIVO", "teacher_id": "...", "teacher_nickname": "..."}`

**Indexes:**
- `idx_completions_makeup_exception` on makeup_for_exception_id (partial)
- `idx_completions_makeup_date` on makeup_for_date (partial)
- `idx_completions_has_bilin_feedback` on (enrollment_id, class_date) WHERE bilin_pillars IS NOT NULL
- `idx_completions_feedback_pending` on (feedback_status) WHERE feedback_status = 'PENDING'

**Edit Window (FR16):** Teachers can edit notes within 7 days

**Historical Integrity:** Records older than 30 days become read-only. Feedback submission earns +1 point if within 24h of class end, 0 points if later. -1 point if missed at invoice generation

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
| address_number | TEXT | | House/building number |
| address_complement | TEXT | | Apartment, unit, floor |
| neighborhood | TEXT | | Neighborhood for matching |
| city | TEXT | NOT NULL, DEFAULT | City (default: Florianópolis) |
| state | TEXT | | State (e.g., SC) |
| postal_code | TEXT | | CEP postal code |
| lat | REAL | | Latitude |
| lon | REAL | | Longitude |
| **Preferences** | | | |
| class_format | TEXT | CHECK | 'Individual' or 'Grupo' |
| class_mode | TEXT | | @deprecated - location preference |
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
| **Returning Student** | | | |
| source_student_id | TEXT | FK | Original student if returning |
| is_returning | INTEGER | NOT NULL, DEFAULT 0 | True if returning student |
| priority_tier | INTEGER | NOT NULL, DEFAULT 2 | 1=returning (priority), 2=new |
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
1. Student record created (all fields preserved) OR reused if returning student
2. Enrollment record created (day, time, teacher, language)
3. Parent links created (both parents can log in via OAuth)
4. Lead status → CONTRACTED
5. For returning students: student status reactivated (ATIVO), contract_end cleared

**Returning Student Flow:** When a student becomes INATIVO:
1. Auto-creates a priority lead (source_student_id links to original)
2. Lead shows "↩ Retornando" badge on leads page
3. Sorted first (priority_tier=1) for faster re-matching
4. Conversion reuses existing student record (no duplicate)

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

### 14. teacher_availability_history

**Purpose:** Track availability changes for historical schedule views

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | History ID (tah_xxx) |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) |
| day_of_week | INTEGER | NOT NULL, CHECK 0-6 | Day of week |
| start_time | TEXT | NOT NULL | Start time HH:MM |
| end_time | TEXT | NOT NULL | End time HH:MM |
| slot_type | TEXT | NOT NULL, CHECK | 'LIVRE', 'BLOCKED', 'ENROLLED' |
| valid_from | TEXT | NOT NULL | Start date (YYYY-MM-DD) |
| valid_to | TEXT | | End date (NULL = current) |
| is_current | INTEGER | DEFAULT 0 | 1 = current active record |
| changed_by | TEXT | | User who made change |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Type 2 SCD Pattern:** Uses valid_from/valid_to for historical point-in-time queries.

---

### 15. enrollment_status_history

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

### 15. student_status_history

**Purpose:** Audit trail for student status changes (historical integrity)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | History ID (ssh_xxx) |
| student_id | TEXT | NOT NULL, FK | References students(id) |
| status | TEXT | NOT NULL, CHECK | Student status at this point |
| teacher_id | TEXT | FK | Assigned teacher at this point |
| teacher_nickname | TEXT | | Teacher name at this point |
| class_location | TEXT | CHECK | 'Presencial' or 'Online' |
| class_format | TEXT | CHECK | 'Individual' or 'Grupo' |
| valid_from | TEXT | NOT NULL | Start date (YYYY-MM-DD) |
| valid_to | TEXT | | End date (NULL = current) |
| is_current | INTEGER | DEFAULT 0 | 1 = current active record |
| changed_by | TEXT | | User who made change |
| change_reason | TEXT | | Why the change was made |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Type 2 SCD Pattern:** Uses valid_from/valid_to for historical point-in-time queries.

**Triggers:**
- `trg_student_status_history_insert` - Auto-creates history on status change
- `trg_student_teacher_history_insert` - Auto-creates history on teacher change

---

### 16. teacher_time_off_requests

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

**Purpose:** Track travel time calculation issues for admin review and resolution

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Error ID |
| error_type | TEXT | NOT NULL, CHECK | Error classification (see below) |
| context_type | TEXT | NOT NULL, CHECK | 'enrollment_travel', 'suggestion_preview', 'lead_matching' |
| teacher_id | TEXT | FK | Related teacher |
| student_id | TEXT | FK | Related student |
| lead_id | TEXT | FK | Related lead |
| enrollment_id | TEXT | FK | Related enrollment |
| origin_description | TEXT | | e.g., "Student João's home (Trindade)" |
| origin_lat | REAL | | Origin latitude |
| origin_lon | REAL | | Origin longitude |
| dest_description | TEXT | | e.g., "Student Maria's home (Centro)" |
| dest_lat | REAL | | Destination latitude |
| dest_lon | REAL | | Destination longitude |
| error_message | TEXT | | Error details |
| api_response | TEXT | | Raw API response if applicable |
| calculated_minutes | INTEGER | | Calculated time (for anomalies) |
| expected_minutes | INTEGER | | Expected time (for anomalies) |
| status | TEXT | NOT NULL, DEFAULT 'PENDING' | 'PENDING', 'REVIEWED', 'RESOLVED', 'IGNORED' |
| resolved_by | TEXT | | Admin who resolved |
| resolved_at | INTEGER | | Resolution timestamp |
| resolution_notes | TEXT | | Admin notes |
| created_at | INTEGER | NOT NULL | Unix timestamp |

**Error Types:**
- `MISSING_ORIGIN_COORDS` - Origin location missing lat/lon
- `MISSING_DEST_COORDS` - Destination location missing lat/lon
- `API_ERROR` - Google Routes API failure
- `ANOMALY_HIGH_TIME` - Travel time seems too high (> 60 min)
- `ANOMALY_LOW_TIME` - Travel time seems too low (< 2 min for distant locations)
- `GEOCODE_FAILED` - Address couldn't be geocoded
- `COORDS_OUT_OF_REGION` - Coordinates too far from Florianópolis (> 150km)
- `ESTIMATE_USED` - Tier 3 Haversine estimate used (API failed)

**Indexes:** status, created_at, teacher_id, student_id

---

### 18. zone_travel_matrix

**Purpose:** Pre-calculated zone-to-zone travel times for cost optimization (Story 6.6)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Zone pair ID |
| from_zone | TEXT | NOT NULL | Source zone name |
| to_zone | TEXT | NOT NULL | Destination zone name |
| avg_travel_minutes | INTEGER | NOT NULL | Average driving time |
| distance_km | REAL | | Approximate distance |
| buffer_minutes | INTEGER | NOT NULL | Recommended scheduling buffer |
| is_same_zone | INTEGER | NOT NULL, DEFAULT 0 | 1 if same zone |
| is_adjacent | INTEGER | NOT NULL, DEFAULT 0 | 1 if zones share border |
| calculated_at | INTEGER | NOT NULL | When calculated |
| last_verified_at | INTEGER | | When admin verified |
| verified_by | TEXT | | Admin who verified |

**Index:** UNIQUE on (from_zone, to_zone)

**Notes:**
- Contains 49 entries (7 zones × 7 zones)
- Same-zone pairs use 10-minute default travel time
- Different-zone pairs calculated via LocationIQ API (one-time ~$0.50 cost)
- Buffer times: same zone = 5min, adjacent = 15min, different = 25min
- Eliminates ~90% of API calls for travel time lookups

---

### 19. notifications

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

### 24. slot_offers

**Purpose:** Offers sent to waitlist families when slots become available (Story 6.9)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Offer ID (off_xxx format) |
| teacher_id | TEXT | NOT NULL, FK | References teachers(id) |
| lead_id | TEXT | NOT NULL, FK | References leads(id) |
| day_of_week | INTEGER | NOT NULL, CHECK 0-6 | Day of the offered slot |
| start_time | TEXT | NOT NULL | Start time HH:MM |
| duration_minutes | INTEGER | NOT NULL, DEFAULT 60 | Class duration |
| status | TEXT | NOT NULL, DEFAULT 'pending_teacher' | Offer status |
| match_score | INTEGER | NOT NULL, DEFAULT 0 | AI match score (0-100) |
| match_reason | TEXT | | JSON with score breakdown |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |
| teacher_responded_at | INTEGER | | When teacher approved/rejected |
| sent_at | INTEGER | | When notification sent to family |
| responded_at | INTEGER | | When family responded |
| expires_at | INTEGER | | Auto-expire timestamp (7 days after sent) |
| notification_count | INTEGER | NOT NULL, DEFAULT 0 | Follow-up count |
| last_notification_at | INTEGER | | Last follow-up timestamp |
| enrollment_id | TEXT | FK | Created enrollment (if accepted) |
| created_by | TEXT | | Admin who created offer |
| notes | TEXT | | Internal notes |

**Status Values:**
- `pending_teacher` - Awaiting teacher approval (initial state)
- `rejected_teacher` - Teacher rejected the match
- `pending` - Teacher approved, awaiting family response
- `accepted` - Family accepted, enrollment created
- `declined` - Family explicitly declined
- `expired` - No response within 7 days
- `ghost` - Marked as unresponsive (deprioritized)
- `cancelled` - Admin cancelled the offer

**Indexes:**
- `idx_slot_offers_teacher_status` - (teacher_id, status)
- `idx_slot_offers_lead_status` - (lead_id, status)
- `idx_slot_offers_expires` - (expires_at) WHERE status = 'pending'
- `idx_slot_offers_pending_teacher` - (teacher_id, status) WHERE status = 'pending_teacher'

---

### 25. cancellation_pending_choices

Tracks pending rate change choices when a group class goes from 2→1 students.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Prefixed UUID (pc_xxx) |
| enrollment_id | TEXT FK | Remaining student's enrollment |
| triggered_by_enrollment_id | TEXT FK | Enrollment that cancelled |
| class_date | TEXT | Class date (YYYY-MM-DD) |
| original_rate | INTEGER | Rate before cancellation (e.g., 120) |
| new_rate | INTEGER | New individual rate (e.g., 150) |
| choice_deadline | INTEGER | Unix timestamp, 24h before class |
| choice_made | TEXT | 'CONTINUE', 'CANCEL', or NULL |
| location_feasible | INTEGER | 1 if travel to location is feasible |
| location_change_required | INTEGER | 1 if location host cancelled |
| notified_at | INTEGER | When parent was notified |
| responded_at | INTEGER | When parent responded (or NULL) |
| auto_resolved | INTEGER | 1 if auto-resolved to CONTINUE |
| created_at | INTEGER | Unix timestamp |

**Indexes:**
- `idx_pending_choices_deadline` - (choice_deadline) WHERE choice_made IS NULL

---

### 26. cancellation_charges

Tracks billable cancellation charges for invoicing.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Prefixed UUID (chg_xxx) |
| exception_id | TEXT FK | Related enrollment_exception |
| enrollment_id | TEXT FK | Enrollment that was cancelled |
| student_id | TEXT FK | Student being billed |
| class_date | TEXT | Class date (YYYY-MM-DD) |
| amount | INTEGER | Charge amount in BRL |
| reason | TEXT | 'late_cancellation', 'no_show', etc. |
| invoice_id | TEXT | Invoice ID when added (or NULL) |
| created_at | INTEGER | Unix timestamp |

**Indexes:**
- `idx_cancellation_charges_pending` - (invoice_id) WHERE invoice_id IS NULL

---

### 27. location_change_requests

Tracks location change workflow when location host cancels.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Prefixed UUID (lcr_xxx) |
| triggered_by_exception_id | TEXT FK | Exception that triggered this |
| class_date | TEXT | Class date (YYYY-MM-DD) |
| group_id | TEXT FK | Group being relocated |
| old_location_student_id | TEXT FK | Original host (who cancelled) |
| new_location_student_id | TEXT FK | Suggested new host |
| new_location_address | TEXT | Display address for parents |
| travel_minutes | INTEGER | Travel time to new location |
| status | TEXT | 'pending', 'approved', 'rejected', 'expired' |
| approval_deadline | INTEGER | Unix timestamp, 24h before class |
| approved_at | INTEGER | When all parents approved (or NULL) |
| rejected_at | INTEGER | When any parent declined (or NULL) |
| created_at | INTEGER | Unix timestamp |

**Indexes:**
- `idx_location_change_pending` - (status, approval_deadline) WHERE status = 'pending'

---

### 28. location_change_responses

Tracks individual parent responses to location changes.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Prefixed UUID (lcrsp_xxx) |
| request_id | TEXT FK | Parent location_change_request |
| enrollment_id | TEXT FK | Parent's enrollment |
| student_id | TEXT FK | Parent's student |
| parent_email | TEXT | Parent's email address |
| response | TEXT | 'approve', 'decline', or NULL |
| responded_at | INTEGER | When parent responded (or NULL) |
| created_at | INTEGER | Unix timestamp |

**Behavior:**
- ALL must approve → Location change finalized
- ANY decline → Class cancelled for ALL (no charge)
- Expired without all approvals → Class cancelled for ALL

---

### 29. location_host_transfer_requests

**Purpose:** Tracks location host transfer requests when host goes PAUSADO or parent requests to become host

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Prefixed UUID (htr_xxx) |
| group_key | TEXT NOT NULL | Group identifier (teacher_id:day:time) |
| from_enrollment_id | TEXT FK | Current host's enrollment |
| to_enrollment_id | TEXT FK | New host's enrollment |
| request_type | TEXT NOT NULL | 'PAUSADO_AUTO', 'PAUSADO_ADMIN', 'PARENT_REQUEST' |
| status | TEXT NOT NULL | 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED' |
| requested_by | TEXT NOT NULL | User who initiated the request |
| approved_by | TEXT | Admin/teacher who approved |
| travel_impact_minutes | INTEGER | Travel time change for teacher |
| travel_warning_level | TEXT | 'NONE', 'MODERATE', 'HIGH' |
| rejection_reason | TEXT | Reason if rejected |
| notes | TEXT | Additional notes |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

**Request Types:**
- `PAUSADO_AUTO` - Auto-transfer when 2-person group host goes PAUSADO
- `PAUSADO_ADMIN` - Admin selects new host for 3+ person groups
- `PARENT_REQUEST` - Parent requests to become location host

**Travel Warning Levels:**
- `NONE` - ≤5 min impact on teacher travel
- `MODERATE` - 6-15 min impact
- `HIGH` - >15 min impact

**Indexes:**
- `idx_lht_group_key` - (group_key)
- `idx_lht_status` - (status)

---

## Payment & Subscription Tables (Epic 8)

### 29. subscription_plans

**Purpose:** Templates for different billing options (Monthly, Semester, Annual)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Plan identifier (e.g., 'plan_monthly') |
| name | TEXT | Display name ('Mensal', 'Semestral', 'Anual') |
| slug | TEXT UNIQUE | URL-safe identifier ('monthly', 'semester', 'annual') |
| billing_interval | TEXT | Always 'month' |
| billing_interval_count | INTEGER | 1, 6, or 12 months |
| discount_percent | INTEGER | 0, 10, or 15 |
| reschedule_credits_per_month | INTEGER | Default 1 |
| stripe_product_id | TEXT | Stripe product ID |
| stripe_price_id_individual | TEXT | Stripe price for individual classes |
| stripe_price_id_group | TEXT | Stripe price for group classes |
| is_active | INTEGER | Whether plan is available |
| created_at, updated_at | INTEGER | Unix timestamps |

**Seed Data:** 3 plans seeded (monthly, semester, annual)

---

### 30. stripe_customers

**Purpose:** Links users to Stripe customer accounts

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| user_id | TEXT FK | Reference to users table |
| stripe_customer_id | TEXT UNIQUE | Stripe customer ID (cus_xxx) |
| default_payment_method | TEXT | 'credit_card' or 'boleto' |
| stripe_payment_method_id | TEXT | Default payment method in Stripe |
| email | TEXT | Customer email for Stripe |
| created_at, updated_at | INTEGER | Unix timestamps |

**Indexes:** `idx_stripe_customers_user`, `idx_stripe_customers_stripe`

---

### 31. subscriptions

**Purpose:** Active subscriptions for students

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| student_id | TEXT FK | Reference to students |
| enrollment_id | TEXT FK | Reference to enrollments |
| plan_id | TEXT FK | Reference to subscription_plans |
| stripe_subscription_id | TEXT UNIQUE | Stripe subscription ID |
| stripe_customer_id | TEXT | Stripe customer ID |
| payment_method | TEXT | 'credit_card', 'boleto', 'pix' |
| status | TEXT | 'pending', 'active', 'paused', 'cancelled', 'past_due', 'trialing' |
| current_period_start | INTEGER | Period start timestamp |
| current_period_end | INTEGER | Period end timestamp |
| cancel_at_period_end | INTEGER | Whether to cancel at period end |
| cancelled_at | INTEGER | When cancelled |
| cancellation_reason | TEXT | Why cancelled |
| pause_start, pause_end | INTEGER | Pause period timestamps |
| base_amount_centavos | INTEGER | Monthly amount before discount |
| discount_amount_centavos | INTEGER | Discount amount |
| final_amount_centavos | INTEGER | Amount after discount |
| classes_per_week | INTEGER | Classes included per week |
| trial_end | INTEGER | Trial end timestamp |
| metadata | TEXT | JSON for additional data |
| created_at, updated_at | INTEGER | Unix timestamps |

**Indexes:** student, enrollment, status, stripe_subscription_id, period_end

---

### 32. reschedule_credits

**Purpose:** Monthly reschedule credits for subscription plans

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| subscription_id | TEXT FK | Reference to subscriptions |
| enrollment_id | TEXT FK | Reference to enrollments |
| month_year | TEXT | 'YYYY-MM' format |
| credits_granted | INTEGER | Credits given (default 1) |
| credits_used | INTEGER | Credits consumed |
| expires_at | INTEGER | When credits expire |
| created_at | INTEGER | Unix timestamp |

**Indexes:** subscription, lookup (subscription + month_year), expiry

---

### 33. one_time_payments

**Purpose:** PIX/Boleto one-time payments for pay-per-class

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| student_id | TEXT FK | Reference to students |
| enrollment_id | TEXT FK | Reference to enrollments |
| completion_id | TEXT FK | Reference to class_completions |
| stripe_payment_intent_id | TEXT UNIQUE | Stripe PaymentIntent ID |
| stripe_invoice_id | TEXT | Stripe Invoice ID |
| payment_method | TEXT | 'pix', 'boleto', 'credit_card' |
| amount_centavos | INTEGER | Payment amount |
| fee_centavos | INTEGER | Stripe fee |
| net_centavos | INTEGER | After fees |
| status | TEXT | 'pending', 'processing', 'succeeded', 'failed', 'refunded', 'expired' |
| pix_qr_code | TEXT | PIX QR code data |
| pix_copy_paste | TEXT | PIX copy-paste code |
| pix_expiration | INTEGER | PIX expiry timestamp |
| boleto_url | TEXT | Boleto PDF URL |
| boleto_barcode | TEXT | Boleto barcode |
| boleto_expiration | INTEGER | Boleto due date |
| paid_at | INTEGER | When paid |
| failure_reason | TEXT | Why payment failed |
| refunded_at | INTEGER | When refunded |
| refund_amount_centavos | INTEGER | Refund amount |
| metadata | TEXT | JSON for additional data |
| created_at, updated_at | INTEGER | Unix timestamps |

**Indexes:** student, status, stripe_payment_intent_id, completion

---

### 34. payment_transactions

**Purpose:** Audit log for all payment events

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| subscription_id | TEXT FK | Reference to subscriptions |
| one_time_payment_id | TEXT FK | Reference to one_time_payments |
| student_id | TEXT FK | Reference to students |
| stripe_payment_intent_id | TEXT | Stripe PaymentIntent ID |
| stripe_invoice_id | TEXT | Stripe Invoice ID |
| stripe_charge_id | TEXT | Stripe Charge ID |
| type | TEXT | 'subscription', 'one_time', 'refund', 'adjustment' |
| payment_method | TEXT | 'credit_card', 'boleto', 'pix' |
| amount_centavos | INTEGER | Transaction amount |
| fee_centavos | INTEGER | Stripe fee |
| net_centavos | INTEGER | After fees |
| status | TEXT | 'pending', 'succeeded', 'failed', 'refunded' |
| failure_reason | TEXT | Why transaction failed |
| description | TEXT | Human-readable description |
| metadata | TEXT | JSON for additional data |
| created_at | INTEGER | Unix timestamp |

**Indexes:** subscription, one_time, student, status, created_at, type

---

## Scheduling Tables (Additional)

### 35. makeup_classes

**Purpose:** Tracks rescheduled makeup classes

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| enrollment_id | TEXT FK | Reference to enrollments |
| original_date | TEXT | Original cancelled date (YYYY-MM-DD) |
| makeup_date | TEXT | New makeup date (YYYY-MM-DD) |
| makeup_time | TEXT | New makeup time (HH:MM) |
| status | TEXT | 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW' |
| source_exception_id | TEXT FK | Reference to enrollment_exceptions |
| completed_at | INTEGER | When marked complete |
| notes | TEXT | Admin/teacher notes |
| created_at, updated_at | INTEGER | Unix timestamps |

**Indexes:** enrollment, status, makeup_date, original_date

---

## Travel Tables (Additional)

### 36. address_cache

**Purpose:** Cache address autocomplete queries for performance

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| query_hash | TEXT UNIQUE | Hash of query for lookup |
| query_text | TEXT | Original query text |
| query_type | TEXT | 'address' or 'cep' |
| results_json | TEXT | Cached results |
| hit_count | INTEGER | How many times accessed |
| created_at | INTEGER | Unix timestamp |
| last_accessed_at | INTEGER | Last access timestamp |

**Indexes:** query_hash, created_at

---

## LGPD Compliance Tables

### 37. lgpd_consent

**Purpose:** Track user consent for data processing (LGPD compliance)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| user_id | TEXT FK | Reference to users |
| consent_type | TEXT | 'data_processing', 'marketing', 'third_party_sharing', 'analytics' |
| granted | INTEGER | 0 = revoked, 1 = granted |
| granted_at | INTEGER | When consent was granted |
| revoked_at | INTEGER | When consent was revoked |
| ip_address | TEXT | IP at time of consent |
| user_agent | TEXT | Browser/device info |
| created_at, updated_at | INTEGER | Unix timestamps |

**Indexes:** user, consent_type, unique(user_id, consent_type)

---

### 38. lgpd_deletion_requests

**Purpose:** Track data deletion/anonymization requests

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| user_id | TEXT FK | Reference to users |
| user_email | TEXT | Preserved email for record-keeping |
| request_type | TEXT | 'full_deletion', 'anonymization', 'partial_deletion' |
| status | TEXT | 'pending', 'approved', 'completed', 'rejected' |
| categories | TEXT | JSON array of categories (for partial) |
| reason | TEXT | User's reason for request |
| admin_notes | TEXT | Admin notes on decision |
| processed_by | TEXT FK | Admin who processed |
| processed_at | INTEGER | When processed |
| created_at, updated_at | INTEGER | Unix timestamps |

**Indexes:** user, status

---

### 39. lgpd_export_requests

**Purpose:** Track data portability requests

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Internal ID |
| user_id | TEXT FK | Reference to users |
| status | TEXT | 'pending', 'processing', 'ready', 'downloaded', 'expired' |
| file_path | TEXT | Path to generated export file |
| expires_at | INTEGER | When download link expires |
| downloaded_at | INTEGER | When user downloaded |
| created_at, updated_at | INTEGER | Unix timestamps |

**Indexes:** user, status

---

## Data Quality Tables

### 42. data_issues

**Purpose:** Unified tracking of data quality issues across all entity types

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Issue ID |
| entity_type | TEXT | NOT NULL, CHECK | 'lead', 'student', 'teacher' |
| entity_id | TEXT | NOT NULL | ID of the affected entity |
| category | TEXT | NOT NULL, CHECK | Issue category (see below) |
| error_type | TEXT | NOT NULL | Specific error type within category |
| error_message | TEXT | | Human-readable error description |
| severity | TEXT | NOT NULL, DEFAULT 'warning' | 'critical', 'warning', 'info' |
| status | TEXT | NOT NULL, DEFAULT 'PENDING' | 'PENDING', 'RESOLVED' |
| resolved_at | INTEGER | | Resolution timestamp |
| resolved_by | TEXT | | User who resolved |
| context | TEXT | | JSON additional context |
| created_at | INTEGER | NOT NULL, DEFAULT | Unix timestamp |

**Categories:**
- `location` - Missing coordinates, geocoding failures, address issues
- `contact` - Missing phone, email, or WhatsApp
- `incomplete` - Missing parent name, student name, etc.
- `invalid` - Invalid formats (phone, email, dates)
- `travel` - Anomalies in travel time calculations

**Error Types by Category:**
- Location: `MISSING_COORDS`, `GEOCODE_FAILED`, `INVALID_ADDRESS`, `COORDS_OUT_OF_REGION`, `ESTIMATE_USED`
- Contact: `MISSING_PHONE`, `MISSING_EMAIL`, `MISSING_WHATSAPP`
- Incomplete: `MISSING_PARENT_NAME`, `MISSING_STUDENT_NAME`, `MISSING_AVAILABILITY`
- Invalid: `INVALID_PHONE_FORMAT`, `INVALID_EMAIL_FORMAT`, `INVALID_DATE`
- Travel: `ANOMALY_HIGH_TIME`, `ANOMALY_LOW_TIME`, `API_ERROR`

**Unique Constraint:** (entity_type, entity_id, error_type)

**Indexes:** entity, category, status, severity, pending+category, created_at

---

## Backup Tables

### 43. backup_metadata

**Purpose:** Track database backup records and their metadata

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Backup ID (e.g., bkp_1234567890_abc123) |
| backup_type | TEXT | 'full', 'core', 'config', 'financial', 'restore' |
| description | TEXT | Human-readable description |
| created_by | TEXT | User ID who created |
| created_by_email | TEXT | Email of creator |
| created_at | INTEGER | Unix timestamp |
| status | TEXT | 'pending', 'in_progress', 'completed', 'failed' |
| trigger_type | TEXT | 'manual', 'scheduled', 'restore', 'restore-safety' |
| github_run_id | TEXT | GitHub Actions workflow run ID |
| file_size | INTEGER | Size in bytes |
| error_message | TEXT | Error details if failed |
| notes | TEXT | Additional notes |

**Indexes:** created_at DESC, status, trigger_type

---

### 44. deleted_backup_runs

**Purpose:** Track deleted backup GitHub run IDs to prevent re-import after sync

| Column | Type | Description |
|--------|------|-------------|
| github_run_id | TEXT PK | GitHub Actions run ID |
| deleted_at | INTEGER | Unix timestamp when deleted |
| deleted_by | TEXT | User ID who deleted |
| deleted_by_email | TEXT | Email of deleter |

**Indexes:** deleted_at DESC

---

## Database Triggers

The following triggers enforce business rules and data integrity:

### Cascade Delete Triggers

| Trigger | On Table | Action |
|---------|----------|--------|
| `trg_enrollment_cascade_exceptions` | enrollments | DELETE → Deletes related enrollment_exceptions |
| `trg_enrollment_cascade_completions` | enrollments | DELETE → Deletes related class_completions |
| `trg_enrollment_cascade_status_history` | enrollments | DELETE → Deletes related enrollment_status_history |
| `trg_student_status_history_insert` | students | UPDATE status → Creates student_status_history record |
| `trg_student_teacher_history_insert` | students | UPDATE teacher_id → Creates student_status_history record |

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

**Last Updated:** 2026-01-17
