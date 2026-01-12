# Teacher Cancellation Approval Workflow

## Overview

EduSchedule Pro implements a comprehensive teacher cancellation workflow that requires admin approval for all teacher-initiated cancellations. This ensures proper tracking, maintains schedule integrity, and protects teachers who cancel due to illness.

## Features

### 1. Teacher Cancellation Request
**Location:** `/teacher/schedule`

Teachers can request cancellations through their schedule page:

- **Quick Cancel Button:** Available on each scheduled class card
- **Cancellation Modal:** Provides three reason categories:
  - **I'm sick** - Automatically marked as protected (no penalty)
  - **Personal emergency** - Standard cancellation
  - **Other** - Requires detailed explanation

**Sick Protection:**
- When teachers select "I'm sick", a reassurance message appears: "Health comes first. No penalty for sick days."
- The reason is prefixed with `[SICK]` for easy identification
- The cancellation is flagged as `is_sick_protected = true` in the database

**Pending Status Indicators:**
- Once submitted, the class shows a yellow "Pending Approval" badge
- The cancel button is hidden to prevent duplicate requests
- Teachers can still complete the class if approved before class time

### 2. Admin Approval Interface
**Location:** `/admin/pending-cancellations`

Admins have a dedicated page to review all pending teacher cancellation requests:

**Visual Indicators:**
- **Pending Badge:** Shows total count of pending cancellations
- **Sick Cancellations:** Highlighted with red border and "SICK - NO PENALTY" badge
- **Health Notice:** Green info box states "Health-related cancellation - Teacher will not be penalized"

**Bulk Actions:**
- **Approve All Sick Button:** Appears when sick cancellations exist
- One-click approval of all sick-related cancellations
- Confirmation dialog prevents accidental bulk approvals

**Individual Actions:**
- **Approve:** Marks cancellation as approved, sends notifications
- **Reject:** Deletes the cancellation request, notifies teacher

**Information Displayed:**
- Teacher name and student name
- Language being taught
- Date, day of week, and time
- Submission timestamp
- Cancellation reason
- Sick protection status

### 3. API Endpoints

#### GET `/api/exceptions/pending`
Returns all pending teacher cancellations (admin only):
```json
{
  "count": 3,
  "exceptions": [
    {
      "id": "exc_...",
      "teacher_name": "John Doe",
      "student_name": "Student Name",
      "exception_date": "2025-12-15",
      "class_time": "14:00",
      "day_of_week": 1,
      "language": "English",
      "reason": "[SICK] Feeling unwell",
      "is_sick_protected": true,
      "created_at": 1733774400
    }
  ]
}
```

#### POST `/api/admin/cancellations`
Handles approval/rejection actions:

**Action: approve**
```json
{
  "action": "approve",
  "exception_id": "exc_..."
}
```
- Sets `approved_by` and `approved_at` fields
- Sends notification to parent
- Logs audit trail

**Action: reject**
```json
{
  "action": "reject",
  "exception_id": "exc_..."
}
```
- Sends notification to teacher
- Deletes the exception record
- Logs audit trail

**Action: approve_all_sick**
```json
{
  "action": "approve_all_sick"
}
```
- Approves all cancellations with sick-related reasons
- Sends notifications to all affected parents
- Returns count of approved cancellations

### 4. Notification System

**Approval Notifications:**
When a cancellation is approved, parents receive:
```
Title: Aula Cancelada
Message: A aula de [day], [date] às [time] foi cancelada.
         O professor não poderá comparecer. Motivo: [reason]
Link: /parent/schedule
```

**Rejection Notifications:**
When a cancellation is rejected, teachers receive:
```
Title: Cancelamento Não Aprovado
Message: Seu pedido de cancelamento da aula de [student]
         ([day], [date] às [time]) não foi aprovado.
         Por favor, entre em contato com a administração.
Link: /teacher/schedule
```

### 5. Database Schema

**enrollment_exceptions table:**
```sql
CREATE TABLE enrollment_exceptions (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL,
  exception_date TEXT NOT NULL,
  exception_type TEXT NOT NULL,
  reason TEXT,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at INTEGER,
  is_sick_protected INTEGER DEFAULT 0,  -- New field
  created_at INTEGER NOT NULL
);
```

**Migration Required:**
Run `/database/migrations/add-is-sick-protected.sql` to add the new field and backfill existing data.

### 6. Sick Protection Logic

The system identifies sick cancellations using:
- **Explicit marking:** When teacher selects "I'm sick" option
- **Reason detection:** Checks for keywords in reason field:
  - Case-insensitive search for: `[sick]`, `sick`, `doente`
  - Regex pattern: `/\[sick\]|sick|doente/i`

**Protection Benefits:**
- Visual indication in admin interface
- Separate tracking for reporting/analytics
- Future integration with teacher performance metrics
- No penalty policies can be enforced

## User Flows

### Teacher Requesting Cancellation

1. Navigate to `/teacher/schedule`
2. Find the class to cancel
3. Click "Cancel" button
4. Select cancellation reason:
   - "I'm sick" → Sees reassurance message
   - "Personal emergency" → Optional notes
   - "Other" → Required detailed explanation
5. Submit request
6. Class shows "Pending Approval" badge
7. Receive notification when approved/rejected

### Admin Reviewing Cancellations

1. Navigate to `/admin/pending-cancellations`
2. Review pending count badge
3. Scan list of requests
4. Identify sick cancellations (red border, "NO PENALTY" badge)
5. Options:
   - Click "Approve All Sick" for bulk approval
   - Click individual "Approve" buttons
   - Click "Reject" for denied requests
6. System sends notifications automatically
7. Cards fade out after processing

## Best Practices

### For Teachers
- Submit cancellation requests as early as possible
- Be honest about sick vs. other reasons
- Provide clear explanations for "other" cancellations
- Check schedule regularly for approval status

### For Admins
- Review cancellations promptly (same day if possible)
- Use bulk "Approve All Sick" for efficiency
- Reject only when absolutely necessary
- Consider patterns for teacher reliability metrics

## Technical Notes

### Rate Limiting
- Read operations: Standard rate limit
- Write operations: Standard rate limit
- Applies per user session

### CSRF Protection
All POST requests require valid CSRF token from session.

### Audit Trail
All approve/reject actions are logged:
```typescript
{
  user_email: session.email,
  action: 'APPROVE_CANCELLATION' | 'REJECT_CANCELLATION' | 'BULK_APPROVE_SICK_CANCELLATIONS',
  resource_type: 'exception',
  resource_id: exception_id,
  success: true
}
```

### Error Handling
- Failed notifications don't block approval/rejection
- Errors logged to console for debugging
- User sees success message even if notification fails

## Future Enhancements

Potential improvements:
- Teacher penalty tracking dashboard
- Sick day quota monitoring
- Pattern analysis for frequent cancellations
- Automated approval for verified sick notes
- Integration with teacher absence management
- Historical cancellation reports
