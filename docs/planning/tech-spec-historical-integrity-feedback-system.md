# Tech Spec: Historical Integrity & Teacher Feedback System

**Status:** Draft
**Priority:** Phase 3
**Author:** Claude (AI Assistant)
**Created:** 2026-01-13
**Dependencies:** Epic 8 (Auto-Completion), Story 6.10 (Teacher Credits)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Philosophy](#core-philosophy)
3. [Class Instance State Machine](#class-instance-state-machine)
4. [Auto-Completion System](#auto-completion-system)
5. [Teacher Feedback Point System](#teacher-feedback-point-system)
6. [Historical Immutability](#historical-immutability)
7. [UI Behavior: Class Cards & Labels](#ui-behavior-class-cards--labels)
8. [UI Behavior: Detail Modal](#ui-behavior-detail-modal)
9. [Closure System Integration](#closure-system-integration)
10. [Validation Constraints](#validation-constraints)
11. [Database Schema](#database-schema)
12. [API Specifications](#api-specifications)
13. [Edge Cases](#edge-cases)
14. [Implementation Plan](#implementation-plan)

---

## Executive Summary

This system transforms EduSchedule from a **teacher-confirmation model** to an **auto-completion model** with **immutable historical records**.

### Key Transformations

| Aspect | Current (Before) | New (After) |
|--------|------------------|-------------|
| Class completion | Teacher clicks "Complete" | System auto-completes at scheduled end time |
| Teacher role | Confirms class happened | Provides optional feedback for points |
| Past data | Mutable, affected by status changes | Immutable, frozen as it was |
| Inactive students | May disappear from views | Always visible in historical context |
| Past UI | Fully editable | Read-only (>30 days), labels replace dropdowns |

---

## Core Philosophy

### The Three Rules of Historical Data

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE THREE RULES OF HISTORICAL DATA                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  RULE 1: THE PAST IS IMMUTABLE                                          │
│  ─────────────────────────────────                                      │
│  What happened on 2025-06-15 stays exactly as it was on 2025-06-15.    │
│  Changing a student to INATIVO today does NOT hide their June classes. │
│                                                                         │
│  RULE 2: PRESENT CHANGES DON'T REWRITE HISTORY                          │
│  ───────────────────────────────────────────────                        │
│  If a teacher changes availability today, past schedules still show    │
│  their OLD availability. Past = snapshot at that moment in time.       │
│                                                                         │
│  RULE 3: AFTER 30 DAYS, NO MODIFICATIONS ALLOWED                        │
│  ─────────────────────────────────────────────────                      │
│  UI hides edit controls. API rejects changes. History is locked.       │
│  Exception: Admin can override with audit logging.                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Time Zones

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              TIME ZONES IN THE SYSTEM                          │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ◄────────── PAST ──────────┼──── PRESENT ────┼──────── FUTURE ──────────►   │
│                             │                  │                              │
│  ┌─────────────────────┐    │  ┌────────────┐ │  ┌─────────────────────┐     │
│  │   HISTORICAL ZONE   │    │  │  EDITABLE  │ │  │   SCHEDULED ZONE    │     │
│  │   (>30 days ago)    │    │  │    ZONE    │ │  │   (Tomorrow+)       │     │
│  ├─────────────────────┤    │  │ (0-30 days)│ │  ├─────────────────────┤     │
│  │ • READ-ONLY         │    │  ├────────────┤ │  │ • Fully editable    │     │
│  │ • Labels not dropdowns   │  │ • Editable │ │  │ • Cancelable        │     │
│  │ • No action buttons │    │  │ • Feedback │ │  │ • Reschedulable     │     │
│  │ • 🔒 lock indicator │    │  │ • Modify   │ │  │ • Status change OK  │     │
│  │ • Snapshots shown   │    │  └────────────┘ │  └─────────────────────┘     │
│  └─────────────────────┘    │                  │                              │
│                             │                  │                              │
│            30 days ago    TODAY             Tomorrow                          │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Class Instance State Machine

### All Possible States for a Class Instance

A class instance (a specific class on a specific date) can be in ONE of these states:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CLASS INSTANCE STATES (MUTUALLY EXCLUSIVE)               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCHEDULED STATES (Future classes)                                          │
│  ─────────────────────────────────                                          │
│  • SCHEDULED       - Normal upcoming class                                  │
│  • CANCELLED_*     - Cancelled (by student/teacher/admin)                   │
│  • RESCHEDULED     - Moved to different date/time                           │
│  • CLOSURE         - Blocked by system closure (holiday, férias, etc.)      │
│                                                                             │
│  COMPLETION STATES (Past classes)                                           │
│  ─────────────────────────────────                                          │
│  • COMPLETED       - Class happened normally (auto or manual)               │
│  • NO_SHOW         - Student was absent (faltou)                            │
│  • NOT_RECORDED    - Past class with no completion record (data gap)        │
│                                                                             │
│  ENROLLMENT STATUS STATES (Affects class generation)                        │
│  ────────────────────────────────────────────────────                       │
│  • PAUSADO         - Enrollment paused, no classes generated                │
│  • AVISO           - Notice period, classes still happen but counted        │
│  • INATIVO         - Enrollment ended, no more classes                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Determination Logic

```typescript
// Pseudocode for determining class instance state
function getClassInstanceState(
  enrollment: Enrollment,
  classDate: string,
  completion: ClassCompletion | null,
  exception: EnrollmentException | null,
  closure: SystemClosure | null,
  studentStatusHistory: StatusHistory[]
): ClassInstanceState {

  const today = getTodaySaoPaulo();
  const isPast = classDate < today;
  const isFuture = classDate > today;

  // 1. Check for system closure first (highest priority)
  if (closure && isDateInRange(classDate, closure.start_date, closure.end_date)) {
    return {
      state: 'CLOSURE',
      closureType: closure.closure_type,  // FERIAS, HOLIDAY, WEATHER, EMERGENCY, CUSTOM
      closureName: closure.name,
      displayLabel: getClosureLabel(closure.closure_type),
      canEdit: false,
      showInHistory: true
    };
  }

  // 2. Check for exception (cancellation, reschedule)
  if (exception) {
    return {
      state: exception.exception_type,  // CANCELLED_STUDENT, CANCELLED_TEACHER, etc.
      reason: exception.reason,
      displayLabel: getExceptionLabel(exception.exception_type),
      canEdit: !isHistoricallyLocked(classDate),
      showInHistory: true,
      rescheduledTo: exception.new_date  // If rescheduled
    };
  }

  // 3. Check enrollment status on that date (from history)
  const statusOnDate = getStatusOnDate(studentStatusHistory, classDate);
  if (statusOnDate === 'PAUSADO') {
    return {
      state: 'PAUSADO',
      displayLabel: 'Pausado',
      canEdit: false,
      showInHistory: true,
      wasActiveOnDate: false
    };
  }

  // 4. For past dates, check completion record
  if (isPast) {
    if (completion) {
      return {
        state: completion.status,  // COMPLETED or NO_SHOW
        displayLabel: completion.status === 'COMPLETED' ? 'Concluída' : 'Faltou',
        feedbackStatus: completion.feedback_status,
        canEdit: !isHistoricallyLocked(classDate),
        showInHistory: true,
        notes: completion.notes,
        bilinPillars: completion.bilin_pillars
      };
    } else {
      // No completion record for past class
      return {
        state: 'NOT_RECORDED',
        displayLabel: 'Sem registro',
        canEdit: !isHistoricallyLocked(classDate),
        showInHistory: true,
        canBackfill: !isHistoricallyLocked(classDate)
      };
    }
  }

  // 5. Future or today = SCHEDULED
  return {
    state: 'SCHEDULED',
    displayLabel: 'Agendada',
    canEdit: true,
    canCancel: true,
    canReschedule: true
  };
}
```

### State Display Matrix

| State | Card Label | Card Color | Badge Icon | Actions Available |
|-------|------------|------------|------------|-------------------|
| `SCHEDULED` | Agendada | Default (white) | 📅 | Cancel, Reschedule, Edit |
| `COMPLETED` | Concluída | Success (green) | ✓ | Feedback (if recent), View |
| `NO_SHOW` | Faltou | Danger (red) | ✗ | View |
| `CANCELLED_STUDENT` | Canc. Aluno | Warning (yellow) | 🚫 | View reason |
| `CANCELLED_TEACHER` | Canc. Professor | Warning (yellow) | 🚫 | View reason |
| `CANCELLED_ADMIN` | Canc. Admin | Warning (yellow) | 🚫 | View reason |
| `RESCHEDULED` | Reagendada | Info (blue) | ↔ | View new date |
| `CLOSURE:FERIAS` | Férias | Gray | 🏖️ | None |
| `CLOSURE:HOLIDAY` | Feriado | Gray | 🎄 | None |
| `CLOSURE:WEATHER` | Clima | Gray | ⛈️ | None |
| `CLOSURE:EMERGENCY` | Emergência | Gray | ⚠️ | None |
| `PAUSADO` | Pausado | Muted | ⏸️ | None |
| `NOT_RECORDED` | Sem registro | Muted dashed | ❓ | Backfill (if recent) |

---

## Auto-Completion System

### How Auto-Completion Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTO-COMPLETION FLOW (DETAILED)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: CLASS IS SCHEDULED                                                 │
│  ─────────────────────────────                                              │
│  • Enrollment exists: Student X, Teacher Y, Monday 14:00-15:00             │
│  • No completion record yet                                                 │
│  • No exception for this date                                               │
│                                                                             │
│  STEP 2: CLASS TIME PASSES (e.g., Monday 15:00)                            │
│  ───────────────────────────────────────────────                            │
│  • Cron job runs hourly (or more frequently)                               │
│  • Finds all enrollments where:                                            │
│    - scheduled_end_time < NOW                                              │
│    - no completion record exists                                           │
│    - no exception exists for that date                                     │
│    - enrollment status was ATIVO on that date                              │
│                                                                             │
│  STEP 3: AUTO-CREATE COMPLETION                                             │
│  ──────────────────────────────                                             │
│  INSERT INTO class_completions:                                             │
│    status = 'COMPLETED'                                                    │
│    auto_completed = 1                                                      │
│    feedback_status = 'PENDING'                                             │
│    enrollment_snapshot = {current enrollment state as JSON}                │
│    student_snapshot = {current student state as JSON}                      │
│                                                                             │
│  STEP 4: TEACHER FEEDBACK WINDOW OPENS                                      │
│  ─────────────────────────────────────                                      │
│  • Teacher sees "Pending Feedback" section on schedule page                │
│  • 24h countdown for bonus points                                          │
│  • Teacher can:                                                            │
│    - Submit feedback (+1 point if within 24h)                              │
│    - Mark as NO_SHOW (+1 point if within 24h)                              │
│    - Skip (no points, but no penalty until invoice)                        │
│                                                                             │
│  STEP 5: INVOICE GENERATION (End of Month)                                  │
│  ─────────────────────────────────────────                                  │
│  • System checks all completions with feedback_status = 'PENDING'          │
│  • For each pending: feedback_status = 'SKIPPED', apply -1 point penalty   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Auto-Completion Exclusion Rules

**DO NOT auto-complete if:**

```typescript
const exclusionRules = [
  // 1. Exception exists for this date
  'exception_exists',

  // 2. System closure covers this date
  'closure_covers_date',

  // 3. Enrollment was not ATIVO on that date
  'enrollment_not_ativo_on_date',

  // 4. Student status was PAUSADO on that date
  'student_pausado_on_date',

  // 5. Completion already exists (manual or previous auto)
  'completion_already_exists',

  // 6. Class is quinzenal and this is an "off" week
  'quinzenal_off_week',

  // 7. Teacher had approved time-off on that date
  'teacher_time_off',
];
```

### Auto-Completion Service

```typescript
// src/lib/services/auto-completion-service.ts

interface AutoCompletionResult {
  created: number;
  skipped: number;
  errors: string[];
}

export class AutoCompletionService {

  async runAutoCompletion(targetDate?: string): Promise<AutoCompletionResult> {
    const date = targetDate || getTodaySaoPaulo();
    const results: AutoCompletionResult = { created: 0, skipped: 0, errors: [] };

    // 1. Find all enrollments with scheduled classes on this date
    const enrollments = await this.findScheduledClasses(date);

    for (const enrollment of enrollments) {
      try {
        // 2. Check exclusion rules
        if (await this.shouldSkip(enrollment, date)) {
          results.skipped++;
          continue;
        }

        // 3. Create completion record
        await this.createAutoCompletion(enrollment, date);
        results.created++;

      } catch (error) {
        results.errors.push(`${enrollment.id}: ${error.message}`);
      }
    }

    return results;
  }

  private async shouldSkip(enrollment: Enrollment, date: string): Promise<boolean> {
    // Check all exclusion rules
    const exception = await this.exceptionRepo.findByEnrollmentAndDate(enrollment.id, date);
    if (exception) return true;

    const closure = await this.closureRepo.findByDate(date);
    if (closure) return true;

    const statusOnDate = await this.getEnrollmentStatusOnDate(enrollment.id, date);
    if (statusOnDate !== 'ATIVO') return true;

    const completion = await this.completionRepo.findByEnrollmentAndDate(enrollment.id, date);
    if (completion) return true;

    if (enrollment.plan_type === 'Quinzenal') {
      if (!this.isQuinzenalWeek(enrollment, date)) return true;
    }

    const timeOff = await this.timeOffRepo.findByTeacherAndDate(enrollment.teacher_id, date);
    if (timeOff && timeOff.status === 'APPROVED') return true;

    return false;
  }

  private async createAutoCompletion(enrollment: Enrollment, date: string): Promise<void> {
    // Capture snapshots at this moment
    const enrollmentSnapshot = await this.captureEnrollmentSnapshot(enrollment);
    const studentSnapshot = await this.captureStudentSnapshot(enrollment.student_id);

    await this.completionRepo.create({
      id: generateId('cmp'),
      enrollment_id: enrollment.id,
      class_date: date,
      class_time: enrollment.start_time,
      status: 'COMPLETED',
      auto_completed: 1,
      confirmed_by_teacher: 0,
      feedback_status: 'PENDING',
      enrollment_snapshot: JSON.stringify(enrollmentSnapshot),
      student_snapshot: JSON.stringify(studentSnapshot),
      marked_by: 'system-auto',
    });
  }
}
```

---

## Teacher Feedback Point System

### Complete Point Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TEACHER FEEDBACK POINT SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTION                              │ TIMING           │ POINTS │ NOTES   │
│  ────────────────────────────────────┼──────────────────┼────────┼─────────│
│  Submit feedback (notes/pillars)     │ Within 24h       │ +1     │ Bonus   │
│  Submit feedback (notes/pillars)     │ 24h - 30 days    │ 0      │ No bonus│
│  Submit feedback (notes/pillars)     │ >30 days         │ N/A    │ Locked  │
│  Mark NO_SHOW (faltou)               │ Within 24h       │ +1     │ Bonus   │
│  Mark NO_SHOW (faltou)               │ 24h - 30 days    │ 0      │ No bonus│
│  Skip feedback (invoice generated)   │ End of month     │ -1     │ Penalty │
│  Class auto-completed (no action)    │ Default          │ 0      │ Neutral │
│                                                                             │
│  CONSTRAINTS:                                                               │
│  • Feedback cannot be submitted for classes >30 days ago                   │
│  • NO_SHOW can only be marked by the assigned teacher                      │
│  • Points are credited to teacher_credit_events immediately                │
│  • Penalty is applied during invoice cron job                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feedback Timing Calculation

```typescript
interface FeedbackTiming {
  classEndTime: Date;           // When class was scheduled to end
  bonusDeadline: Date;          // +24h (earn +1 point)
  feedbackDeadline: Date;       // +30 days (can still submit, 0 points)
  invoiceDeadline: Date;        // End of month (avoid -1 penalty)
  isWithinBonusWindow: boolean;
  isWithinFeedbackWindow: boolean;
  hoursUntilBonusExpires: number;
  daysUntilFeedbackExpires: number;
}

function calculateFeedbackTiming(classDate: string, classEndTime: string): FeedbackTiming {
  const classEnd = parseDateTime(classDate, classEndTime);
  const now = new Date();

  const bonusDeadline = addHours(classEnd, 24);
  const feedbackDeadline = addDays(classEnd, 30);
  const invoiceDeadline = getEndOfMonth(classDate);

  return {
    classEndTime: classEnd,
    bonusDeadline,
    feedbackDeadline,
    invoiceDeadline,
    isWithinBonusWindow: now < bonusDeadline,
    isWithinFeedbackWindow: now < feedbackDeadline,
    hoursUntilBonusExpires: Math.max(0, differenceInHours(bonusDeadline, now)),
    daysUntilFeedbackExpires: Math.max(0, differenceInDays(feedbackDeadline, now)),
  };
}
```

### Feedback Credit Events

```typescript
// New event types for teacher_credit_events
const FEEDBACK_EVENT_TYPES = {
  FEEDBACK_ON_TIME: {
    points: 1,
    description: 'Feedback enviado dentro de 24h',
  },
  FEEDBACK_LATE: {
    points: 0,
    description: 'Feedback enviado após 24h',
  },
  FEEDBACK_MISSED: {
    points: -1,
    description: 'Feedback não enviado até geração da fatura',
  },
  NO_SHOW_ON_TIME: {
    points: 1,
    description: 'Falta reportada dentro de 24h',
  },
  NO_SHOW_LATE: {
    points: 0,
    description: 'Falta reportada após 24h',
  },
};
```

---

## Historical Immutability

### What Gets Snapshotted

Every time a class is completed (auto or manual), we capture the state at that moment:

```typescript
interface EnrollmentSnapshot {
  enrollment_id: string;
  teacher_id: string;
  teacher_nickname: string;
  student_id: string;
  student_name: string;
  hourly_rate: number;
  class_location: 'Presencial' | 'Online';
  class_format: 'Individual' | 'Grupo';
  group_id: string | null;
  group_members: Array<{
    student_id: string;
    student_name: string;
    enrollment_id: string;
  }>;
  language: string;
  enrollment_status: string;
  student_status: string;
  captured_at: number;  // Unix timestamp
}

interface StudentSnapshot {
  student_id: string;
  name: string;
  status: string;
  teacher_id: string;
  teacher_nickname: string;
  class_location: string;
  class_format: string;
  parent_name: string;  // Decrypted for snapshot
  captured_at: number;
}
```

### History Tables

```sql
-- 1. Student Status History (tracks all status changes)
CREATE TABLE student_status_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ATIVO', 'AULA_TESTE', 'PAUSADO', 'AVISO', 'INATIVO')),
  teacher_id TEXT REFERENCES teachers(id),
  teacher_nickname TEXT,
  class_location TEXT,
  class_format TEXT,
  valid_from TEXT NOT NULL,      -- YYYY-MM-DD when this status started
  valid_to TEXT,                 -- YYYY-MM-DD when this status ended (NULL = current)
  is_current INTEGER DEFAULT 0,  -- 1 if this is the current status
  changed_by TEXT,               -- user_id who made the change
  change_reason TEXT,            -- Why the change was made
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 2. Enrollment Status History (extends existing table)
-- Already exists as enrollment_status_history

-- 3. Teacher Availability History (tracks LIVRE/BLOCKED changes)
CREATE TABLE teacher_availability_history (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('LIVRE', 'BLOCKED', 'ENROLLED')),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  is_current INTEGER DEFAULT 0,
  changed_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 4. System Closure History (closures that affected past dates)
-- system_closures table already has this (start_date, end_date)
```

### Query: "What happened on date X?"

```typescript
async function getHistoricalState(targetDate: string): Promise<HistoricalState> {
  // 1. Get all student statuses that were active on that date
  const studentStatuses = await db.query(`
    SELECT s.id, s.name, ssh.status, ssh.teacher_nickname
    FROM students s
    LEFT JOIN student_status_history ssh ON s.id = ssh.student_id
    WHERE ssh.valid_from <= ?
      AND (ssh.valid_to IS NULL OR ssh.valid_to > ?)
  `, [targetDate, targetDate]);

  // 2. Get teacher availability as it was on that date
  const teacherAvailability = await db.query(`
    SELECT teacher_id, day_of_week, start_time, end_time, slot_type
    FROM teacher_availability_history
    WHERE valid_from <= ?
      AND (valid_to IS NULL OR valid_to > ?)
  `, [targetDate, targetDate]);

  // 3. Get all closures that affected that date
  const closures = await db.query(`
    SELECT * FROM system_closures
    WHERE start_date <= ? AND end_date >= ?
  `, [targetDate, targetDate]);

  // 4. Get all completions for that date (already have snapshots)
  const completions = await db.query(`
    SELECT * FROM class_completions
    WHERE class_date = ?
  `, [targetDate]);

  // 5. Get all exceptions for that date
  const exceptions = await db.query(`
    SELECT * FROM enrollment_exceptions
    WHERE exception_date = ?
  `, [targetDate]);

  return {
    date: targetDate,
    studentStatuses,
    teacherAvailability,
    closures,
    completions,
    exceptions,
  };
}
```

---

## UI Behavior: Class Cards & Labels

### Card Display Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLASS CARD DISPLAY RULES BY STATE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FOR FUTURE CLASSES (Tomorrow and beyond):                                  │
│  ──────────────────────────────────────────                                 │
│  • Show full action buttons (Cancel, Reschedule, Edit)                     │
│  • Status dropdown enabled                                                  │
│  • Card is interactive                                                      │
│                                                                             │
│  FOR TODAY'S CLASSES:                                                       │
│  ────────────────────                                                       │
│  • Before class time: Same as future                                       │
│  • During class: "Em andamento" label, can mark complete                   │
│  • After class time: Auto-completed, feedback prompt                       │
│                                                                             │
│  FOR RECENT PAST (1-30 days ago):                                          │
│  ─────────────────────────────────                                          │
│  • Show STATUS LABEL instead of dropdown (Concluída, Faltou, etc.)         │
│  • Feedback button visible if feedback_status = 'PENDING'                  │
│  • Can edit notes (if completion exists)                                   │
│  • Can mark NO_SHOW (if currently COMPLETED)                               │
│                                                                             │
│  FOR HISTORICAL PAST (>30 days ago):                                       │
│  ────────────────────────────────────                                       │
│  • Show STATUS LABEL (read-only)                                           │
│  • NO action buttons                                                        │
│  • 🔒 lock indicator                                                        │
│  • Click opens VIEW-ONLY modal                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Card Component Logic

```astro
---
// ClassCard.astro
interface Props {
  classInstance: ClassInstance;
  classDate: string;
  enrollment: Enrollment;
  completion: ClassCompletion | null;
  exception: EnrollmentException | null;
  closure: SystemClosure | null;
}

const { classInstance, classDate, enrollment, completion, exception, closure } = Astro.props;

// Determine time zone
const today = getTodaySaoPaulo();
const daysDiff = differenceInDays(today, parseDate(classDate));
const isFuture = daysDiff < 0;
const isToday = daysDiff === 0;
const isRecentPast = daysDiff > 0 && daysDiff <= 30;
const isHistoricalPast = daysDiff > 30;

// Determine state and display
const state = getClassInstanceState(enrollment, classDate, completion, exception, closure);
const isLocked = isHistoricalPast;
const canEdit = !isLocked && (isFuture || isRecentPast);
const canFeedback = isRecentPast && completion?.feedback_status === 'PENDING';

// CSS class for card
const cardClass = [
  'class-card',
  `state-${state.state.toLowerCase()}`,
  isLocked ? 'locked' : '',
  state.state === 'COMPLETED' ? 'completed' : '',
  state.state === 'NO_SHOW' ? 'no-show' : '',
].filter(Boolean).join(' ');
---

<div class={cardClass} data-class-date={classDate} data-enrollment-id={enrollment.id}>
  <!-- Header with time -->
  <div class="card-header">
    <span class="time">{enrollment.start_time}</span>
    {isLocked && <span class="lock-icon" title="Registro bloqueado">🔒</span>}
  </div>

  <!-- Student name -->
  <div class="student-name">{enrollment.student_name}</div>

  <!-- STATUS DISPLAY: Label for past, Dropdown for future -->
  <div class="status-display">
    {(isRecentPast || isHistoricalPast) ? (
      <!-- PAST: Show label, not dropdown -->
      <span class={`status-label status-${state.state.toLowerCase()}`}>
        {state.displayLabel}
      </span>
    ) : (
      <!-- FUTURE/TODAY: Show dropdown (if no exception/closure) -->
      {!exception && !closure ? (
        <select class="status-dropdown" disabled={isLocked}>
          <option value="SCHEDULED" selected>Agendada</option>
          <option value="CANCEL">Cancelar</option>
          <option value="RESCHEDULE">Reagendar</option>
        </select>
      ) : (
        <span class={`status-label status-${state.state.toLowerCase()}`}>
          {state.displayLabel}
        </span>
      )}
    )}
  </div>

  <!-- Action buttons -->
  <div class="card-actions">
    {/* FUTURE: Full actions */}
    {isFuture && !exception && !closure && (
      <>
        <Button size="sm" variant="ghost" onclick={`openCancelModal('${enrollment.id}', '${classDate}')`}>
          Cancelar
        </Button>
        <Button size="sm" variant="ghost" onclick={`openRescheduleModal('${enrollment.id}', '${classDate}')`}>
          Reagendar
        </Button>
      </>
    )}

    {/* TODAY (after class): Feedback/No-show */}
    {isToday && completion && completion.feedback_status === 'PENDING' && (
      <>
        <Button size="sm" variant="primary" onclick={`openFeedbackModal('${completion.id}')`}>
          📝 Feedback
        </Button>
        <Button size="sm" variant="danger" onclick={`markNoShow('${completion.id}')`}>
          ❌ Faltou
        </Button>
      </>
    )}

    {/* RECENT PAST: Feedback if pending */}
    {isRecentPast && canFeedback && (
      <>
        <Button size="sm" variant="primary" onclick={`openFeedbackModal('${completion.id}')`}>
          📝 Feedback
        </Button>
        {completion.status !== 'NO_SHOW' && (
          <Button size="sm" variant="danger" onclick={`markNoShow('${completion.id}')`}>
            ❌ Faltou
          </Button>
        )}
      </>
    )}

    {/* HISTORICAL PAST: View only */}
    {isHistoricalPast && (
      <Button size="sm" variant="ghost" onclick={`openViewModal('${completion?.id || enrollment.id}', '${classDate}')`}>
        👁️ Ver
      </Button>
    )}
  </div>

  <!-- Feedback timer (for recent past with pending feedback) -->
  {canFeedback && (
    <div class="feedback-timer">
      {calculateFeedbackTiming(classDate, enrollment.end_time).isWithinBonusWindow ? (
        <span class="bonus-timer">
          +1 ponto em {calculateFeedbackTiming(classDate, enrollment.end_time).hoursUntilBonusExpires}h
        </span>
      ) : (
        <span class="late-timer">
          Feedback disponível por mais {calculateFeedbackTiming(classDate, enrollment.end_time).daysUntilFeedbackExpires} dias
        </span>
      )}
    </div>
  )}
</div>

<style>
  .class-card {
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    transition: all var(--transition-fast);
  }

  .class-card.locked {
    opacity: 0.8;
    background: var(--color-background);
  }

  .class-card.state-completed {
    border-left: 4px solid var(--color-success);
  }

  .class-card.state-no_show {
    border-left: 4px solid var(--color-danger);
  }

  .class-card.state-cancelled_student,
  .class-card.state-cancelled_teacher,
  .class-card.state-cancelled_admin {
    border-left: 4px solid var(--color-warning);
    opacity: 0.7;
  }

  .class-card.state-closure {
    border-left: 4px solid var(--color-text-muted);
    background: var(--color-background);
  }

  .class-card.state-pausado {
    border-left: 4px solid var(--color-info);
    background: color-mix(in srgb, var(--color-info) 5%, var(--color-surface));
  }

  .status-label {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .status-label.status-completed {
    background: var(--status-ativo-bg);
    color: var(--status-ativo-text);
  }

  .status-label.status-no_show {
    background: var(--status-inativo-bg);
    color: var(--status-inativo-text);
  }

  .status-label.status-cancelled_student,
  .status-label.status-cancelled_teacher,
  .status-label.status-cancelled_admin {
    background: var(--status-pausado-bg);
    color: var(--status-pausado-text);
  }

  .status-label.status-closure {
    background: var(--color-background);
    color: var(--color-text-muted);
  }

  .lock-icon {
    font-size: var(--font-size-xs);
  }

  .feedback-timer {
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-xs);
  }

  .bonus-timer {
    color: var(--color-success);
    font-weight: 500;
  }

  .late-timer {
    color: var(--color-text-muted);
  }
</style>
```

---

## UI Behavior: Detail Modal

### Modal Behavior by Time Zone

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DETAIL MODAL BEHAVIOR BY TIME ZONE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FUTURE CLASSES - FULL EDIT MODE:                                           │
│  ─────────────────────────────────                                          │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  Detalhes da Aula - 20/01/2026                              │           │
│  ├─────────────────────────────────────────────────────────────┤           │
│  │  Aluno: [Dropdown - can change] ▼                           │           │
│  │  Horário: [Time picker - can change]                        │           │
│  │  Status: [Dropdown] Agendada ▼                              │           │
│  │  Notas: [Textarea - editable]                               │           │
│  │                                                             │           │
│  │  [Cancelar Aula] [Reagendar] [Salvar]                       │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  RECENT PAST (1-30 days) - PARTIAL EDIT MODE:                              │
│  ────────────────────────────────────────────                               │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  Detalhes da Aula - 05/01/2026                              │           │
│  ├─────────────────────────────────────────────────────────────┤           │
│  │  Aluno: João Silva (read-only text)                         │           │
│  │  Horário: 14:00 - 15:00 (read-only text)                    │           │
│  │  Status: ✓ Concluída (label, not dropdown)                  │           │
│  │  Notas: [Textarea - editable if feedback pending]           │           │
│  │  Pilares BILIN: [Checkboxes - editable if feedback pending] │           │
│  │                                                             │           │
│  │  [❌ Marcar como Faltou] [📝 Enviar Feedback]               │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  HISTORICAL PAST (>30 days) - VIEW ONLY MODE:                              │
│  ─────────────────────────────────────────────                              │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  Detalhes da Aula - 15/11/2025                    🔒        │           │
│  ├─────────────────────────────────────────────────────────────┤           │
│  │  Aluno: João Silva                                          │           │
│  │  Professor: Ana (from snapshot)                             │           │
│  │  Horário: 14:00 - 15:00                                     │           │
│  │  Status: ✓ Concluída                                        │           │
│  │  Notas: "Great progress on vocabulary..."                   │           │
│  │  Pilares: Conexão Lúdica, Crescimento Natural               │           │
│  │                                                             │           │
│  │  ──────────────────────────────────────────────             │           │
│  │  📋 Snapshot histórico (estado na época):                   │           │
│  │  • Status do aluno: ATIVO                                   │           │
│  │  • Professor: Ana (rate: R$85)                              │           │
│  │  • Status atual do aluno: INATIVO (changed 01/12/2025)      │           │
│  │                                                             │           │
│  │  [Fechar]                                                   │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modal Component

```astro
---
// ClassDetailModal.astro
interface Props {
  mode: 'future' | 'recent' | 'historical';
}
---

<Modal id="class-detail-modal" title="Detalhes da Aula">
  <div id="modal-content">
    <!-- Content loaded dynamically via JavaScript -->
  </div>
</Modal>

<script>
  interface ClassDetailData {
    classDate: string;
    enrollment: any;
    completion: any | null;
    exception: any | null;
    closure: any | null;
    mode: 'future' | 'recent' | 'historical';
    snapshot: any | null;
  }

  function renderClassDetailModal(data: ClassDetailData) {
    const container = document.getElementById('modal-content');
    if (!container) return;

    const { mode, enrollment, completion, exception, closure, classDate, snapshot } = data;

    // Header with lock icon for historical
    const header = `
      <div class="modal-header">
        <span class="date">${formatDate(classDate)}</span>
        ${mode === 'historical' ? '<span class="lock-badge">🔒 Registro histórico</span>' : ''}
      </div>
    `;

    // Student info - editable only for future
    const studentInfo = mode === 'future'
      ? `<select name="student_id" class="form-select">${renderStudentOptions(enrollment.student_id)}</select>`
      : `<span class="readonly-value">${enrollment.student_name}</span>`;

    // Time info - editable only for future
    const timeInfo = mode === 'future'
      ? `<input type="time" name="start_time" value="${enrollment.start_time}" class="form-input" />`
      : `<span class="readonly-value">${enrollment.start_time} - ${enrollment.end_time}</span>`;

    // Status display
    let statusDisplay = '';
    if (exception) {
      statusDisplay = `<span class="status-label status-exception">${getExceptionLabel(exception.exception_type)}</span>`;
    } else if (closure) {
      statusDisplay = `<span class="status-label status-closure">${closure.name}</span>`;
    } else if (completion) {
      statusDisplay = `<span class="status-label status-${completion.status.toLowerCase()}">${
        completion.status === 'COMPLETED' ? '✓ Concluída' : '✗ Faltou'
      }</span>`;
    } else if (mode === 'future') {
      statusDisplay = `
        <select name="status" class="form-select">
          <option value="SCHEDULED">Agendada</option>
        </select>
      `;
    } else {
      statusDisplay = `<span class="status-label status-missing">Sem registro</span>`;
    }

    // Notes field - editable only for future and recent with pending feedback
    const canEditNotes = mode === 'future' || (mode === 'recent' && completion?.feedback_status === 'PENDING');
    const notesField = canEditNotes
      ? `<textarea name="notes" class="form-textarea" placeholder="Observações da aula...">${completion?.notes || ''}</textarea>`
      : `<div class="readonly-notes">${completion?.notes || 'Nenhuma observação'}</div>`;

    // Action buttons based on mode
    let actionButtons = '';
    if (mode === 'future') {
      actionButtons = `
        <button type="button" class="btn btn-danger" onclick="cancelClass()">Cancelar Aula</button>
        <button type="button" class="btn btn-secondary" onclick="rescheduleClass()">Reagendar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      `;
    } else if (mode === 'recent' && completion?.feedback_status === 'PENDING') {
      actionButtons = `
        <button type="button" class="btn btn-danger" onclick="markNoShow('${completion.id}')">❌ Marcar como Faltou</button>
        <button type="submit" class="btn btn-primary">📝 Enviar Feedback</button>
      `;
    } else {
      actionButtons = `<button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>`;
    }

    // Historical snapshot section (only for historical mode)
    let snapshotSection = '';
    if (mode === 'historical' && snapshot) {
      const currentStatus = enrollment.current_student_status;
      const snapshotStatus = snapshot.student_status;
      const statusChanged = currentStatus !== snapshotStatus;

      snapshotSection = `
        <div class="snapshot-section">
          <h4>📋 Snapshot histórico (estado na época)</h4>
          <ul>
            <li>Status do aluno: <strong>${snapshotStatus}</strong></li>
            <li>Professor: ${snapshot.teacher_nickname} (R$${snapshot.hourly_rate})</li>
            ${statusChanged ? `<li class="status-changed">Status atual: ${currentStatus} (alterado depois)</li>` : ''}
          </ul>
        </div>
      `;
    }

    container.innerHTML = `
      <form id="class-detail-form" onsubmit="submitClassDetail(event)">
        ${header}

        <div class="form-group">
          <label>Aluno</label>
          ${studentInfo}
        </div>

        <div class="form-group">
          <label>Horário</label>
          ${timeInfo}
        </div>

        <div class="form-group">
          <label>Status</label>
          ${statusDisplay}
        </div>

        <div class="form-group">
          <label>Observações</label>
          ${notesField}
        </div>

        ${mode !== 'historical' && completion?.feedback_status === 'PENDING' ? `
          <div class="form-group">
            <label>Pilares BILIN (opcional)</label>
            ${renderBilinPillarCheckboxes(completion?.bilin_pillars)}
          </div>
        ` : ''}

        ${snapshotSection}

        <div class="modal-actions">
          ${actionButtons}
        </div>
      </form>
    `;
  }
</script>
```

---

## Closure System Integration

### All Closure Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOSURE TYPES AND BEHAVIOR                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TYPE          │ ICON │ LABEL PT    │ AFFECTS        │ CLASSES              │
│  ──────────────┼──────┼─────────────┼────────────────┼──────────────────────│
│  FERIAS        │ 🏖️   │ Férias      │ All teachers   │ Not generated        │
│  HOLIDAY       │ 🎄   │ Feriado     │ City-specific  │ Not generated        │
│  WEATHER       │ ⛈️   │ Clima       │ City-specific  │ Cancelled with note  │
│  EMERGENCY     │ ⚠️   │ Emergência  │ City-specific  │ Cancelled with note  │
│  CUSTOM        │ 📅   │ Fechamento  │ Configurable   │ Depends on config    │
│                                                                             │
│  BEHAVIOR DURING CLOSURE:                                                   │
│  ─────────────────────────                                                  │
│  • Classes are NOT generated for the closure period                        │
│  • Existing completions are NOT affected (historical)                      │
│  • Status countdowns (PAUSADO 21 days, AVISO 14 days) CONTINUE             │
│  • Invoices skip closure dates (no charge)                                 │
│  • Schedule view shows closure label instead of classes                    │
│                                                                             │
│  CITY-SPECIFIC CLOSURES:                                                    │
│  ───────────────────────                                                    │
│  • city_id = NULL → Affects ALL cities                                     │
│  • city_id = 'florianopolis' → Only affects Florianópolis teachers/students│
│  • Holiday example: "Aniversário de Florianópolis" on March 23             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Closure Card Display

```astro
---
// ClosureCard.astro
interface Props {
  closure: SystemClosure;
  classDate: string;
}

const { closure, classDate } = Astro.props;

const icons = {
  FERIAS: '🏖️',
  HOLIDAY: '🎄',
  WEATHER: '⛈️',
  EMERGENCY: '⚠️',
  CUSTOM: '📅',
};

const labels = {
  FERIAS: 'Férias',
  HOLIDAY: 'Feriado',
  WEATHER: 'Clima',
  EMERGENCY: 'Emergência',
  CUSTOM: 'Fechamento',
};
---

<div class="closure-card" data-closure-type={closure.closure_type}>
  <div class="closure-icon">{icons[closure.closure_type]}</div>
  <div class="closure-info">
    <span class="closure-type">{labels[closure.closure_type]}</span>
    <span class="closure-name">{closure.name}</span>
  </div>
</div>

<style>
  .closure-card {
    padding: var(--spacing-md);
    background: var(--color-background);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    opacity: 0.7;
  }

  .closure-icon {
    font-size: var(--font-size-xl);
  }

  .closure-type {
    font-weight: 500;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
  }

  .closure-name {
    display: block;
    color: var(--color-text);
  }
</style>
```

### Closure Interaction with Auto-Completion

```typescript
// In AutoCompletionService
async function shouldSkipDueToClousure(
  teacherId: string,
  classDate: string,
  cityId: string | null
): Promise<{ skip: boolean; closure: SystemClosure | null }> {

  // Find any closure that covers this date
  const closures = await this.closureRepo.findByDate(classDate);

  for (const closure of closures) {
    // Check if closure affects this teacher/city
    if (closure.affects_all) {
      return { skip: true, closure };
    }

    if (closure.city_id && closure.city_id === cityId) {
      return { skip: true, closure };
    }

    if (closure.teacher_ids) {
      const teacherIds = JSON.parse(closure.teacher_ids);
      if (teacherIds.includes(teacherId)) {
        return { skip: true, closure };
      }
    }
  }

  return { skip: false, closure: null };
}
```

---

## Validation Constraints

### Complete Constraint Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VALIDATION CONSTRAINTS MATRIX                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONSTRAINT                    │ APPLIES TO          │ ERROR CODE           │
│  ──────────────────────────────┼─────────────────────┼──────────────────────│
│                                                                             │
│  HISTORICAL LOCK (>30 days)                                                 │
│  ──────────────────────────────────────────────────────────────────────────│
│  Cannot edit completion        │ class_completions   │ HISTORICAL_LOCKED    │
│  Cannot edit exception         │ enrollment_exceptions│ HISTORICAL_LOCKED   │
│  Cannot change enrollment      │ enrollments (date)  │ HISTORICAL_LOCKED    │
│  Cannot mark NO_SHOW           │ class_completions   │ HISTORICAL_LOCKED    │
│  Cannot submit feedback        │ class_completions   │ HISTORICAL_LOCKED    │
│                                                                             │
│  FEEDBACK CONSTRAINTS                                                       │
│  ──────────────────────────────────────────────────────────────────────────│
│  Only assigned teacher         │ feedback submission │ FORBIDDEN            │
│  Completion must exist         │ feedback submission │ NOT_FOUND            │
│  Completion not already final  │ feedback submission │ INVALID_STATE        │
│  Class date must be past       │ feedback submission │ INVALID_STATE        │
│                                                                             │
│  NO_SHOW CONSTRAINTS                                                        │
│  ──────────────────────────────────────────────────────────────────────────│
│  Only assigned teacher         │ NO_SHOW marking     │ FORBIDDEN            │
│  Class must be past            │ NO_SHOW marking     │ INVALID_STATE        │
│  Not already NO_SHOW           │ NO_SHOW marking     │ INVALID_STATE        │
│  Not historically locked       │ NO_SHOW marking     │ HISTORICAL_LOCKED    │
│                                                                             │
│  AUTO-COMPLETION CONSTRAINTS                                                │
│  ──────────────────────────────────────────────────────────────────────────│
│  No existing completion        │ auto-completion     │ SKIP (not error)     │
│  No exception for date         │ auto-completion     │ SKIP (not error)     │
│  No closure for date           │ auto-completion     │ SKIP (not error)     │
│  Enrollment was ATIVO          │ auto-completion     │ SKIP (not error)     │
│  Not teacher time-off          │ auto-completion     │ SKIP (not error)     │
│  Class time has passed         │ auto-completion     │ SKIP (not error)     │
│                                                                             │
│  EXCEPTION CONSTRAINTS                                                      │
│  ──────────────────────────────────────────────────────────────────────────│
│  Cannot create for past (>30d) │ exception creation  │ HISTORICAL_LOCKED    │
│  Teacher cancel needs reason   │ CANCELLED_TEACHER   │ VALIDATION_ERROR     │
│  Reschedule needs new date     │ RESCHEDULED_*       │ VALIDATION_ERROR     │
│  New date must be future       │ RESCHEDULED_*       │ VALIDATION_ERROR     │
│  No duplicate exceptions       │ all exceptions      │ DUPLICATE_EXCEPTION  │
│                                                                             │
│  CLOSURE CONSTRAINTS                                                        │
│  ──────────────────────────────────────────────────────────────────────────│
│  End date >= start date        │ system_closures     │ VALIDATION_ERROR     │
│  Cannot delete past closure    │ system_closures     │ HISTORICAL_LOCKED    │
│  Cannot edit past closure      │ system_closures     │ HISTORICAL_LOCKED    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Constraint Implementation

```typescript
// src/lib/validation/historical-constraints.ts

export const HISTORICAL_LOCK_DAYS = 30;

export function isHistoricallyLocked(date: string | Date): boolean {
  const targetDate = typeof date === 'string' ? parseDate(date) : date;
  const cutoffDate = subDays(getTodaySaoPaulo(), HISTORICAL_LOCK_DAYS);
  return targetDate < cutoffDate;
}

export function validateHistoricalAccess(
  classDate: string,
  operation: 'edit' | 'delete' | 'feedback' | 'no_show',
  allowAdminOverride: boolean = false
): void {
  if (isHistoricallyLocked(classDate) && !allowAdminOverride) {
    throw new ApiError(
      'HISTORICAL_LOCKED',
      `Não é possível ${getOperationLabel(operation)} registros com mais de ${HISTORICAL_LOCK_DAYS} dias.`,
      403,
      { classDate, lockDays: HISTORICAL_LOCK_DAYS }
    );
  }
}

export function validateFeedbackSubmission(
  completion: ClassCompletion,
  teacherId: string,
  classDate: string
): void {
  // 1. Check historical lock
  validateHistoricalAccess(classDate, 'feedback');

  // 2. Check teacher ownership
  if (completion.teacher_id !== teacherId) {
    throw new ApiError('FORBIDDEN', 'Apenas o professor da aula pode enviar feedback.', 403);
  }

  // 3. Check completion state
  if (completion.feedback_status === 'SUBMITTED') {
    throw new ApiError('INVALID_STATE', 'Feedback já foi enviado para esta aula.', 400);
  }

  if (completion.feedback_status === 'SKIPPED') {
    throw new ApiError('INVALID_STATE', 'Prazo para feedback expirou.', 400);
  }

  // 4. Check class date is past
  if (classDate >= getTodaySaoPaulo()) {
    throw new ApiError('INVALID_STATE', 'Só é possível enviar feedback para aulas passadas.', 400);
  }
}

export function validateNoShowMarking(
  completion: ClassCompletion,
  teacherId: string,
  classDate: string
): void {
  // 1. Check historical lock
  validateHistoricalAccess(classDate, 'no_show');

  // 2. Check teacher ownership
  if (completion.teacher_id !== teacherId) {
    throw new ApiError('FORBIDDEN', 'Apenas o professor da aula pode marcar falta.', 403);
  }

  // 3. Check not already NO_SHOW
  if (completion.status === 'NO_SHOW') {
    throw new ApiError('INVALID_STATE', 'Esta aula já está marcada como falta.', 400);
  }

  // 4. Check class date is past
  if (classDate >= getTodaySaoPaulo()) {
    throw new ApiError('INVALID_STATE', 'Só é possível marcar falta para aulas passadas.', 400);
  }
}

export function validateExceptionCreation(
  enrollmentId: string,
  exceptionDate: string,
  exceptionType: string
): void {
  // 1. Check historical lock
  validateHistoricalAccess(exceptionDate, 'edit');

  // 2. Type-specific validation
  if (exceptionType === 'CANCELLED_TEACHER') {
    // Teacher cancellations need reason (validated in schema)
  }

  if (exceptionType.startsWith('RESCHEDULED')) {
    // Reschedules need new_date (validated in schema)
  }
}
```

---

## Database Schema

### Complete Migration Set

```sql
-- =============================================================================
-- Migration 060: Feedback System Fields
-- =============================================================================

-- Add feedback tracking to class_completions
ALTER TABLE class_completions ADD COLUMN feedback_status TEXT
  DEFAULT 'PENDING' CHECK (feedback_status IN ('PENDING', 'SUBMITTED', 'SKIPPED'));

ALTER TABLE class_completions ADD COLUMN feedback_submitted_at INTEGER;

ALTER TABLE class_completions ADD COLUMN feedback_points_awarded INTEGER DEFAULT 0;

-- Index for pending feedback queries (teacher schedule page)
CREATE INDEX idx_completions_feedback_pending
  ON class_completions(feedback_status, class_date)
  WHERE feedback_status = 'PENDING';

-- Index for invoice penalty calculation
CREATE INDEX idx_completions_feedback_by_month
  ON class_completions(class_date, feedback_status);

-- Backfill: Mark existing completions with feedback as SUBMITTED
UPDATE class_completions
SET feedback_status = 'SUBMITTED',
    feedback_submitted_at = created_at
WHERE notes IS NOT NULL
   OR bilin_pillars IS NOT NULL
   OR skill_ratings IS NOT NULL;


-- =============================================================================
-- Migration 061: Student Status History
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_status_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ATIVO', 'AULA_TESTE', 'PAUSADO', 'AVISO', 'INATIVO')),
  teacher_id TEXT,
  teacher_nickname TEXT,
  class_location TEXT CHECK (class_location IN ('Presencial', 'Online')),
  class_format TEXT CHECK (class_format IN ('Individual', 'Grupo')),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  is_current INTEGER DEFAULT 0 CHECK (is_current IN (0, 1)),
  changed_by TEXT,
  change_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- Indexes for efficient history queries
CREATE INDEX idx_ssh_student_date ON student_status_history(student_id, valid_from, valid_to);
CREATE INDEX idx_ssh_current ON student_status_history(student_id) WHERE is_current = 1;
CREATE INDEX idx_ssh_status ON student_status_history(status, valid_from);

-- Initialize history from current student data
INSERT INTO student_status_history (
  id, student_id, status, teacher_id, teacher_nickname,
  class_location, class_format, valid_from, is_current, created_at
)
SELECT
  'ssh_' || lower(hex(randomblob(8))),
  id, status, teacher_id, teacher_nickname,
  class_location, class_format,
  COALESCE(date(created_at, 'unixepoch'), date('now')),
  1,
  unixepoch()
FROM students
WHERE status IS NOT NULL;

-- Trigger: Auto-create history on status change
CREATE TRIGGER trg_student_status_history_insert
AFTER UPDATE OF status ON students
WHEN OLD.status IS NOT NULL AND OLD.status != NEW.status
BEGIN
  -- Close previous history record
  UPDATE student_status_history
  SET valid_to = date('now'), is_current = 0
  WHERE student_id = NEW.id AND is_current = 1;

  -- Insert new history record
  INSERT INTO student_status_history (
    id, student_id, status, teacher_id, teacher_nickname,
    class_location, class_format, valid_from, is_current
  ) VALUES (
    'ssh_' || lower(hex(randomblob(8))),
    NEW.id, NEW.status, NEW.teacher_id, NEW.teacher_nickname,
    NEW.class_location, NEW.class_format, date('now'), 1
  );
END;


-- =============================================================================
-- Migration 062: Teacher Availability History
-- =============================================================================

CREATE TABLE IF NOT EXISTS teacher_availability_history (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('LIVRE', 'BLOCKED', 'ENROLLED')),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  is_current INTEGER DEFAULT 0 CHECK (is_current IN (0, 1)),
  changed_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_tah_teacher_date ON teacher_availability_history(teacher_id, day_of_week, valid_from, valid_to);
CREATE INDEX idx_tah_current ON teacher_availability_history(teacher_id) WHERE is_current = 1;

-- Initialize from current availability
INSERT INTO teacher_availability_history (
  id, teacher_id, day_of_week, start_time, end_time, slot_type, valid_from, is_current
)
SELECT
  'tah_' || lower(hex(randomblob(8))),
  teacher_id, day_of_week, start_time, end_time,
  'LIVRE',
  date('now'), 1
FROM teacher_availability
WHERE status = 'APPROVED';


-- =============================================================================
-- Migration 063: Completion Snapshots
-- =============================================================================

-- Add snapshot columns to class_completions
ALTER TABLE class_completions ADD COLUMN enrollment_snapshot TEXT;
-- JSON: {enrollment_id, teacher_id, teacher_nickname, hourly_rate, class_location, class_format, status}

ALTER TABLE class_completions ADD COLUMN student_snapshot TEXT;
-- JSON: {student_id, name, status, teacher_id, parent_name}


-- =============================================================================
-- Migration 064: Enhanced Exceptions
-- =============================================================================

-- Add date range for recurring exceptions (e.g., PAUSADO periods)
ALTER TABLE enrollment_exceptions ADD COLUMN exception_end_date TEXT;

-- Add historical snapshot
ALTER TABLE enrollment_exceptions ADD COLUMN historical_snapshot TEXT;
-- JSON: {enrollment_status, student_status, teacher_nickname, hourly_rate}

-- Index for date range queries
CREATE INDEX idx_exc_date_range
  ON enrollment_exceptions(enrollment_id, exception_date, exception_end_date);


-- =============================================================================
-- Migration 065: New Credit Event Types
-- =============================================================================

-- Extend the CHECK constraint for event_type (if using strict typing)
-- Note: SQLite doesn't enforce CHECK on existing data, but new inserts will be validated

-- Document new event types:
-- FEEDBACK_ON_TIME (+1) - Feedback submitted within 24h
-- FEEDBACK_LATE (0) - Feedback submitted after 24h
-- FEEDBACK_MISSED (-1) - No feedback by invoice date
-- NO_SHOW_ON_TIME (+1) - NO_SHOW marked within 24h
-- NO_SHOW_LATE (0) - NO_SHOW marked after 24h
```

---

## API Specifications

### New Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/completions/[id]/feedback` | Submit feedback for completion | Teacher |
| POST | `/api/completions/[id]/no-show` | Mark completion as NO_SHOW | Teacher |
| GET | `/api/history/student/[id]/status` | Get student status history | Admin |
| GET | `/api/history/teacher/[id]/availability` | Get teacher availability history | Admin |
| GET | `/api/history/schedule` | Get historical schedule view | Admin |
| POST | `/api/cron/auto-complete` | Run auto-completion | Cron secret |
| POST | `/api/cron/feedback-penalties` | Apply feedback penalties | Cron secret |

### API: Submit Feedback

```typescript
// POST /api/completions/[id]/feedback

// Request
interface FeedbackRequest {
  notes?: string;
  bilin_pillars?: string[];  // Array of pillar keys
  skill_ratings?: {
    criatividade?: number;   // 0-5
    leitura?: number;
    escrita?: number;
    escuta?: number;
    atencao?: number;
    espontaneidade?: number;
  };
}

// Response
interface FeedbackResponse {
  success: true;
  completion_id: string;
  feedback_status: 'SUBMITTED';
  points_awarded: number;        // 0 or 1
  was_on_time: boolean;          // true if within 24h
  credit_event_id: string | null; // ID of credit event if points awarded
}

// Implementation
export async function POST({ request, params, locals }) {
  const completionId = params.id;
  const body = await request.json();
  const teacher = await getTeacherFromSession(locals);

  // 1. Get completion
  const completion = await completionRepo.findById(completionId);
  if (!completion) {
    throw new ApiError('NOT_FOUND', 'Completion not found', 404);
  }

  // 2. Validate
  validateFeedbackSubmission(completion, teacher.id, completion.class_date);

  // 3. Calculate timing
  const timing = calculateFeedbackTiming(completion.class_date, completion.class_time);
  const pointsAwarded = timing.isWithinBonusWindow ? 1 : 0;

  // 4. Update completion
  await completionRepo.update(completionId, {
    notes: body.notes,
    bilin_pillars: body.bilin_pillars ? JSON.stringify(body.bilin_pillars) : null,
    skill_ratings: body.skill_ratings ? JSON.stringify(body.skill_ratings) : null,
    feedback_status: 'SUBMITTED',
    feedback_submitted_at: Math.floor(Date.now() / 1000),
    feedback_points_awarded: pointsAwarded,
  });

  // 5. Award credit points if on time
  let creditEventId = null;
  if (pointsAwarded > 0) {
    creditEventId = await teacherCreditService.awardPoints(
      teacher.id,
      'FEEDBACK_ON_TIME',
      1,
      completionId,
      'completion'
    );
  } else {
    // Record late feedback (0 points but tracked)
    creditEventId = await teacherCreditService.recordEvent(
      teacher.id,
      'FEEDBACK_LATE',
      0,
      completionId,
      'completion'
    );
  }

  return Response.json({
    success: true,
    completion_id: completionId,
    feedback_status: 'SUBMITTED',
    points_awarded: pointsAwarded,
    was_on_time: timing.isWithinBonusWindow,
    credit_event_id: creditEventId,
  });
}
```

### API: Mark NO_SHOW

```typescript
// POST /api/completions/[id]/no-show

// Request
interface NoShowRequest {
  notes?: string;  // Optional note about the absence
}

// Response
interface NoShowResponse {
  success: true;
  completion_id: string;
  status: 'NO_SHOW';
  points_awarded: number;
  was_on_time: boolean;
}

// Implementation
export async function POST({ request, params, locals }) {
  const completionId = params.id;
  const body = await request.json();
  const teacher = await getTeacherFromSession(locals);

  // 1. Get completion
  const completion = await completionRepo.findById(completionId);
  if (!completion) {
    throw new ApiError('NOT_FOUND', 'Completion not found', 404);
  }

  // 2. Validate
  validateNoShowMarking(completion, teacher.id, completion.class_date);

  // 3. Calculate timing
  const timing = calculateFeedbackTiming(completion.class_date, completion.class_time);
  const pointsAwarded = timing.isWithinBonusWindow ? 1 : 0;

  // 4. Update completion
  await completionRepo.update(completionId, {
    status: 'NO_SHOW',
    notes: body.notes || completion.notes,
    feedback_status: 'SUBMITTED',
    feedback_submitted_at: Math.floor(Date.now() / 1000),
    feedback_points_awarded: pointsAwarded,
  });

  // 5. Award credit points
  const eventType = pointsAwarded > 0 ? 'NO_SHOW_ON_TIME' : 'NO_SHOW_LATE';
  await teacherCreditService.recordEvent(
    teacher.id,
    eventType,
    pointsAwarded,
    completionId,
    'completion'
  );

  // 6. Send notification to parent
  await notificationService.notifyParentNoShow(completion);

  return Response.json({
    success: true,
    completion_id: completionId,
    status: 'NO_SHOW',
    points_awarded: pointsAwarded,
    was_on_time: timing.isWithinBonusWindow,
  });
}
```

---

## Edge Cases

### Complete Edge Case Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE CASES AND HANDLING                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO                                    │ HANDLING                      │
│  ────────────────────────────────────────────┼───────────────────────────────│
│                                                                             │
│  AUTO-COMPLETION EDGE CASES                                                 │
│  ──────────────────────────────────────────────────────────────────────────│
│  Class scheduled during closure              │ Skip auto-complete           │
│  Teacher has time-off on that day            │ Skip auto-complete           │
│  Enrollment was PAUSADO on class date        │ Skip auto-complete           │
│  Quinzenal enrollment on "off" week          │ Skip auto-complete           │
│  Exception already exists for date           │ Skip auto-complete           │
│  Completion already exists (manual)          │ Skip (no duplicate)          │
│  Class crosses midnight (rare)               │ Use start date               │
│  Cron runs twice in same hour                │ Idempotent (skip existing)   │
│                                                                             │
│  FEEDBACK EDGE CASES                                                        │
│  ──────────────────────────────────────────────────────────────────────────│
│  Teacher changed since class                 │ Use snapshot teacher_id      │
│  Multiple teachers (sub situation)           │ Original teacher can submit  │
│  Class was on day 30 exactly                 │ Still allowed (< not <=)     │
│  Feedback at 23:59:59 of bonus deadline     │ Gets bonus (+1)              │
│  Submit twice (race condition)               │ Second request fails         │
│  Submit after marking NO_SHOW                │ Not allowed (already final)  │
│                                                                             │
│  HISTORICAL VIEW EDGE CASES                                                 │
│  ──────────────────────────────────────────────────────────────────────────│
│  Student deleted after class                 │ Show from snapshot           │
│  Teacher deleted after class                 │ Show from snapshot           │
│  No snapshot exists (legacy data)            │ Show current data + warning  │
│  Enrollment changed teacher mid-month        │ Each class shows its teacher │
│  Status changed multiple times same day      │ Show last status of day      │
│                                                                             │
│  CLOSURE EDGE CASES                                                         │
│  ──────────────────────────────────────────────────────────────────────────│
│  Closure created after classes completed     │ Don't affect past completions│
│  Closure deleted but classes showed it       │ Historical shows it existed  │
│  Overlapping closures (FERIAS + HOLIDAY)     │ Show higher priority (FERIAS)│
│  City closure + teacher time-off same day    │ Either one blocks class      │
│  Closure end date < start date (error)       │ Validation prevents this     │
│                                                                             │
│  STATUS TRANSITION EDGE CASES                                               │
│  ──────────────────────────────────────────────────────────────────────────│
│  PAUSADO started mid-week                    │ Classes before pause = normal│
│  AVISO expires during closure                │ Countdown continues          │
│  INATIVO student reactivated                 │ New history record created   │
│  Multiple status changes same day            │ Each creates history record  │
│                                                                             │
│  UI EDGE CASES                                                              │
│  ──────────────────────────────────────────────────────────────────────────│
│  Click "Feedback" on locked class (JS hack)  │ API rejects with 403        │
│  Open modal, wait 24h, try submit            │ API rechecks timing          │
│  Very old date (years ago)                   │ Same handling as >30 days    │
│  Future date passed while viewing            │ Refresh shows updated state  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (5 days)

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Create migration 060 (feedback fields) | `database/migrations/060_*.sql` |
| 1.2 | Create migration 061 (student history) | `database/migrations/061_*.sql` |
| 1.3 | Add `isHistoricallyLocked()` utility | `src/lib/utils/date.ts` |
| 1.4 | Add validation constraints | `src/lib/validation/historical-constraints.ts` |
| 1.5 | Update API error codes | `src/lib/api-errors.ts` |

### Phase 2: Auto-Completion (5 days)

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Update AutoCompletionService | `src/lib/services/auto-completion-service.ts` |
| 2.2 | Add snapshot capture on completion | `src/lib/services/snapshot-service.ts` |
| 2.3 | Update cron endpoint | `src/pages/api/cron/auto-complete.ts` |
| 2.4 | Add feedback status to completion repo | `src/lib/repositories/d1/completion.ts` |

### Phase 3: Teacher Feedback UI (5 days)

| Task | Description | Files |
|------|-------------|-------|
| 3.1 | Create `/api/completions/[id]/feedback` | `src/pages/api/completions/[id]/feedback.ts` |
| 3.2 | Create `/api/completions/[id]/no-show` | `src/pages/api/completions/[id]/no-show.ts` |
| 3.3 | Update teacher schedule page | `src/pages/teacher/schedule.astro` |
| 3.4 | Create FeedbackModal component | `src/components/FeedbackModal.astro` |
| 3.5 | Add feedback timer display | `src/scripts/teacher-schedule-client.ts` |

### Phase 4: Historical Tracking (5 days)

| Task | Description | Files |
|------|-------------|-------|
| 4.1 | Create migrations 062-064 | `database/migrations/062-064_*.sql` |
| 4.2 | Create history service | `src/lib/services/history-service.ts` |
| 4.3 | Create history API endpoints | `src/pages/api/history/*.ts` |
| 4.4 | Add triggers for auto-history | `database/migrations/` |

### Phase 5: Read-Only UI (5 days)

| Task | Description | Files |
|------|-------------|-------|
| 5.1 | Update ClassCard component | `src/components/ClassCard.astro` |
| 5.2 | Update ClassDetailModal | `src/components/ClassDetailModal.astro` |
| 5.3 | Add lock indicators to all pages | Multiple page files |
| 5.4 | Update all APIs with historical validation | Multiple API files |

### Phase 6: Feedback Penalties (3 days)

| Task | Description | Files |
|------|-------------|-------|
| 6.1 | Create feedback penalty cron | `src/pages/api/cron/feedback-penalties.ts` |
| 6.2 | Integrate with invoice generation | Invoice service |
| 6.3 | Update teacher credit service | `src/lib/services/teacher-credits.ts` |

### Phase 7: Testing & Polish (5 days)

| Task | Description | Files |
|------|-------------|-------|
| 7.1 | Write unit tests | `tests/` |
| 7.2 | Test historical queries | Manual testing |
| 7.3 | Backfill existing data | Data migration scripts |
| 7.4 | Performance optimization | Add indexes if needed |
| 7.5 | Documentation updates | `docs/` |

---

## Success Criteria

| Criteria | Target | How to Measure |
|----------|--------|----------------|
| Feedback submission rate | >80% within 24h | Database query |
| Auto-completion accuracy | 100% | No manual fixes needed |
| Historical query correctness | 100% | Spot-check audits |
| UI lock enforcement | 100% | Security testing |
| API protection | 100% | API testing |
| Teacher satisfaction | Positive | User feedback |
| Data integrity | No orphans | Weekly audit query |

---

## Glossary

| Term | Definition |
|------|------------|
| **Auto-completion** | System automatically creates completion records when class time passes |
| **Feedback** | Teacher's notes, BILIN pillars, and skill ratings for a class |
| **Historical lock** | Prevention of modifications to data older than 30 days |
| **Snapshot** | JSON capture of related entity state at a point in time |
| **Closure** | System-wide or city-specific period where classes don't happen |
| **Exception** | Per-class deviation (cancellation, reschedule, holiday) |
| **Completion** | Record proving a class happened (or didn't - NO_SHOW) |
| **Temporal data** | Data with valid_from/valid_to date ranges for historical tracking |

---

**Document Version:** 2.0
**Last Updated:** 2026-01-13
**Total Estimated Effort:** 33 days
