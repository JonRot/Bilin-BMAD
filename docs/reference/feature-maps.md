# Feature Maps (Change Impact Maps)

> **Purpose:** When modifying cross-cutting features, this document maps ALL code locations that need updates. Prevents missed files during feature changes.

---

## How to Use This Document

1. **Before modifying a feature:** Find its section below
2. **Check ALL listed locations:** Every file/function listed needs review
3. **Follow the order:** Database → Types → Repositories → Validation → APIs → UI → Docs
4. **Add new sections:** When you discover new cross-cutting features

---

## 1. Location/Address Fields

**Fields:** `address`, `address_number`, `address_complement`, `neighborhood`, `city`, `state`, `postal_code`, `lat`, `lon`

### Database (Migrations)

| Entity | Table | Migration |
|--------|-------|-----------|
| Teachers | `teachers` | 073 |
| Students | `students` | 074 |
| Leads | `leads` | 075 |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/repositories/types.ts` | `Teacher`, `CreateTeacherData`, `UpdateTeacherData` |
| `src/lib/repositories/types.ts` | `Student`, `CreateStudentData`, `UpdateStudentData` |
| `src/lib/repositories/types.ts` | `Lead`, `CreateLeadData`, `UpdateLeadData` |

### Repository Methods

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/teacher.ts` | `create()`, `update()`, `findById()` |
| `src/lib/repositories/d1/student.ts` | `create()`, `update()`, `findById()` |
| `src/lib/repositories/d1/lead.ts` | `create()`, `update()`, `findById()` |

### Validation Schemas

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/teacher.ts` | `CreateTeacherSchema`, `UpdateTeacherSchema` |
| `src/lib/validation/student.ts` | `CreateStudentSchema`, `UpdateStudentSchema` |
| `src/lib/validation/lead.ts` | `CreateLeadSchema`, `UpdateLeadSchema` |

### Client-Side Form Handlers

| File | Functions |
|------|-----------|
| `src/scripts/teachers-page-client.ts` | `populateAddressForm()`, form submit handlers |
| `src/scripts/students-page-client.ts` | `populateAddressForm()`, form submit handlers |
| `src/scripts/leads-page-client.ts` | `populateAddressForm()`, form submit handlers |
| `src/scripts/shared/address-form.ts` | `parseStreetAndNumber()`, address utilities |

### API Endpoints

| Endpoint | File |
|----------|------|
| `POST /api/admin/teachers` | `src/pages/api/admin/teachers/index.ts` |
| `PUT /api/admin/teachers/[id]` | `src/pages/api/admin/teachers/[id].ts` |
| `POST /api/admin/students` | `src/pages/api/admin/students/index.ts` |
| `PUT /api/admin/students/[id]` | `src/pages/api/admin/students/[id].ts` |
| `POST /api/admin/leads` | `src/pages/api/admin/leads/index.ts` |
| `PUT /api/admin/leads/[id]` | `src/pages/api/admin/leads/[id].ts` |

### UI Components

| File | Component |
|------|-----------|
| `src/components/AddressForm.astro` | Reusable address form fields |

### Documentation

| File | Section |
|------|---------|
| `docs/reference/data-models.md` | teachers, students, leads tables |
| `docs/reference/api-contracts.md` | Teacher, Student, Lead endpoints |

---

## 2. Parent/Guardian Information

**Fields:** `parent_name`, `parent_email`, `parent_phone`, `parent_cpf`

### Database

| Entity | Table | Columns |
|--------|-------|---------|
| Students | `students` | `parent_name`, `parent_email_encrypted`, `parent_phone_encrypted`, `parent_cpf_encrypted` |
| Leads | `leads` | `parent_name`, `parent_email_encrypted`, `parent_phone_encrypted`, `parent_cpf_encrypted` |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/repositories/types.ts` | `Student`, `CreateStudentData`, `UpdateStudentData` |
| `src/lib/repositories/types.ts` | `Lead`, `CreateLeadData`, `UpdateLeadData` |

### Repository Methods

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/student.ts` | `create()`, `update()`, `findById()` |
| `src/lib/repositories/d1/lead.ts` | `create()`, `update()`, `findById()` |

### Validation Schemas

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/student.ts` | `CreateStudentSchema`, `UpdateStudentSchema` |
| `src/lib/validation/lead.ts` | `CreateLeadSchema`, `UpdateLeadSchema` |

### Client-Side Form Handlers

| File | Functions |
|------|-----------|
| `src/scripts/students-page-client.ts` | Form populate/submit for parent fields |
| `src/scripts/leads-page-client.ts` | Form populate/submit for parent fields |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST/PUT /api/admin/students/*` | Student CRUD |
| `POST/PUT /api/admin/leads/*` | Lead CRUD |

---

## 3. Teaching Preferences

**Fields:** `teaches_individual`, `teaches_group`, `teaches_online`, `teaches_presencial`, `location_preference`, `teaching_cities`, `languages`, `hourly_rate`

### Database

| Entity | Table |
|--------|-------|
| Teachers | `teachers` |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/repositories/types.ts` | `Teacher`, `CreateTeacherData`, `UpdateTeacherData` |

### Repository Methods

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/teacher.ts` | `create()`, `update()`, `findById()`, `findByFilters()` |

### Validation Schemas

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/teacher.ts` | `CreateTeacherSchema`, `UpdateTeacherSchema` |

### Client-Side Form Handlers

| File | Functions |
|------|-----------|
| `src/scripts/teachers-page-client.ts` | Teaching preference checkboxes, selects |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST/PUT /api/admin/teachers/*` | Teacher CRUD |
| `GET /api/admin/teachers` | Filter by teaching preferences |

---

## 4. Enrollment/Subscription Status

**Fields:** `status`, `subscription_type`, `start_date`, `end_date`, `cancellation_date`, `cancellation_reason`

### Database

| Entity | Table |
|--------|-------|
| Enrollments | `enrollments` |
| Enrollment Status History | `enrollment_status_history` |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/repositories/types.ts` | `Enrollment`, `EnrollmentStatusHistory` |
| `src/constants/enrollment.ts` | `EnrollmentStatus`, `SubscriptionType` enums |

### Repository Methods

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/enrollment.ts` | `create()`, `updateStatus()`, `cancel()` |

### Validation Schemas

| File | Schema(s) |
|------|-----------|
| `src/lib/validation/enrollment.ts` | Enrollment validation |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/enrollments` | Create enrollment |
| `PUT /api/admin/enrollments/[id]/status` | Update status |
| `POST /api/admin/enrollments/[id]/cancel` | Cancel enrollment |

### UI Pages

| Page | Purpose |
|------|---------|
| `/admin/enrollments` | Enrollment management |
| `/admin/students/[id]` | Student's enrollments |

---

## 5. Scheduling (Lessons/Classes)

**Fields:** `scheduled_date`, `scheduled_time`, `duration_minutes`, `status`, `lesson_type`, `modality`

### Database

| Entity | Table |
|--------|-------|
| Lessons | `lessons` |
| Lesson Status History | `lesson_status_history` |
| Teacher Availability | `teacher_availability` |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/repositories/types.ts` | `Lesson`, `LessonStatusHistory`, `TeacherAvailability` |
| `src/constants/lesson.ts` | `LessonStatus`, `LessonType`, `Modality` enums |

### Repository Methods

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/lesson.ts` | `create()`, `update()`, `updateStatus()`, `findByDate()` |
| `src/lib/repositories/d1/teacher-availability.ts` | `findByTeacher()`, `findAvailableSlots()` |

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/scheduling.ts` | Conflict detection, slot availability |
| `src/lib/services/travel-time.ts` | Travel time calculations |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/lessons` | Create lesson |
| `PUT /api/admin/lessons/[id]` | Update lesson |
| `GET /api/admin/lessons/availability` | Check availability |
| `POST /api/admin/lessons/[id]/status` | Update status |

### UI Pages

| Page | Purpose |
|------|---------|
| `/admin/calendar` | Calendar view |
| `/admin/lessons` | Lesson management |
| `/teacher/calendar` | Teacher schedule |

---

## 6. Payment Information

**Fields:** `amount`, `due_date`, `payment_date`, `status`, `payment_method`, `pix_key`

### Database

| Entity | Table |
|--------|-------|
| Invoices | `invoices` |
| Payments | `payments` |
| Teacher Payroll | `teacher_payroll` |

### TypeScript Interfaces

| File | Interface(s) |
|------|--------------|
| `src/lib/repositories/types.ts` | `Invoice`, `Payment`, `TeacherPayroll` |
| `src/constants/payment.ts` | `PaymentStatus`, `PaymentMethod` enums |

### Repository Methods

| File | Methods |
|------|---------|
| `src/lib/repositories/d1/invoice.ts` | Invoice CRUD |
| `src/lib/repositories/d1/payment.ts` | Payment CRUD |
| `src/lib/repositories/d1/teacher-payroll.ts` | Payroll CRUD |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST/PUT /api/admin/invoices/*` | Invoice management |
| `POST /api/admin/payments` | Record payment |
| `GET /api/admin/payroll` | Teacher payroll |

### UI Pages

| Page | Purpose |
|------|---------|
| `/admin/invoices` | Invoice management |
| `/admin/payments` | Payment tracking |
| `/admin/payroll` | Teacher payroll |

---

## 7. Encrypted/Sensitive Fields

**Pattern:** Fields ending in `_encrypted` require special handling.

### Encryption/Decryption

| File | Purpose |
|------|---------|
| `src/lib/crypto/encryption.ts` | `encrypt()`, `decrypt()` functions |
| `src/lib/crypto/pii.ts` | PII-specific encryption utilities |

### Affected Fields (by entity)

| Entity | Encrypted Fields |
|--------|------------------|
| Teachers | `email_encrypted`, `phone_encrypted`, `cpf_encrypted`, `pix_key_encrypted`, `address_encrypted` |
| Students | `email_encrypted`, `phone_encrypted`, `cpf_encrypted`, `parent_email_encrypted`, `parent_phone_encrypted`, `parent_cpf_encrypted` |
| Leads | `email_encrypted`, `phone_encrypted`, `cpf_encrypted`, `parent_email_encrypted`, `parent_phone_encrypted`, `parent_cpf_encrypted` |
| Users | `email_encrypted` |

### Repository Pattern

All repositories must:
1. Encrypt fields before INSERT/UPDATE
2. Decrypt fields after SELECT
3. Use `runtime.env.ENCRYPTION_KEY` for encryption

---

## 8. Status Fields with History Tracking

**Pattern:** Status changes that require audit trail.

### Entities with Status History

| Entity | Status Table | History Table |
|--------|--------------|---------------|
| Lessons | `lessons.status` | `lesson_status_history` |
| Enrollments | `enrollments.status` | `enrollment_status_history` |
| Invoices | `invoices.status` | `invoice_status_history` |
| Leads | `leads.status` | `lead_status_history` |

### Required Actions on Status Change

1. Update main table status
2. Insert record into history table with:
   - `previous_status`
   - `new_status`
   - `changed_by` (user ID)
   - `changed_at` (timestamp)
   - `reason` (optional)

---

## Quick Reference: Common Change Patterns

### Adding a new field to an entity

1. **Migration:** Create new migration adding column
2. **Types:** Update interface + Create/Update data types
3. **Repository:** Update create/update/find methods
4. **Validation:** Update Zod schemas
5. **API:** Ensure endpoints handle new field
6. **Client:** Update form handlers (populate + submit)
7. **UI:** Add field to form component
8. **Docs:** Update data-models.md and api-contracts.md

### Adding a new status value

1. **Constants:** Add to status enum
2. **Database:** Update CHECK constraint if applicable
3. **UI:** Add status badge color/label
4. **Validation:** Update allowed values in schema
5. **Business Logic:** Handle new status in workflows

### Adding encryption to a field

1. **Migration:** Rename column to `{field}_encrypted`
2. **Repository:** Add encrypt/decrypt calls
3. **Types:** Keep original field name in interface (decrypted value)
4. **Search:** Cannot search encrypted fields directly

---

## Template: Adding a New Feature Map

```markdown
## N. [Feature Name]

**Fields:** `field1`, `field2`, `field3`

### Database
| Entity | Table | Columns |
|--------|-------|---------|

### TypeScript Interfaces
| File | Interface(s) |
|------|--------------|

### Repository Methods
| File | Methods |
|------|---------|

### Validation Schemas
| File | Schema(s) |
|------|-----------|

### Client-Side Form Handlers
| File | Functions |
|------|-----------|

### API Endpoints
| Endpoint | Purpose |
|----------|---------|

### UI Pages/Components
| File | Purpose |
|------|---------|

### Documentation
| File | Section |
|------|---------|
```

---

**Last Updated:** 2026-01-17
