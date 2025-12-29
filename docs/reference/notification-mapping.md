# Notification System Mapping

**Last Updated:** 2025-12-22

This document maps all notification types to their triggers, recipients, and message content.

---

## Notification Types Overview

| Type                          | Icon | Recipients      | Trigger                                 |
| ----------------------------- | ---- | --------------- | --------------------------------------- |
| `CLASS_CANCELLED_BY_PARENT`   | ❌   | Teacher         | Parent cancels a class                  |
| `CLASS_CANCELLED_BY_TEACHER`  | 🏥   | Parent          | Teacher cancellation approved           |
| `CLASS_CANCELLED_BY_ADMIN`    | ⚠️   | Teacher, Parent | Admin directly cancels a class          |
| `CLASS_CANCELLED_WEATHER`     | 🌧️   | Teacher, Parent | System closure created                  |
| `CLASS_RESCHEDULED`           | 📅   | Teacher, Parent | Class rescheduled                       |
| `CANCELLATION_APPROVED`       | ✅   | Teacher         | Admin approves teacher's cancellation   |
| `CANCELLATION_REJECTED`       | 🚫   | Teacher         | Admin rejects teacher's cancellation    |
| `CLASS_STARTED`               | 📚   | Parent          | Teacher starts a class                  |
| `CLASS_COMPLETED`             | 🎉   | Parent          | Teacher completes a class               |
| `GROUP_RATE_CHANGED`          | 💰   | Parent          | Group composition changes affecting rate|
| `NO_SHOW`                     | ⚠️   | Parent          | Teacher marks student as no-show        |
| `TIME_OFF_APPROVED`           | ✅   | Teacher         | Admin approves time-off request         |
| `TIME_OFF_REJECTED`           | 🚫   | Teacher         | Admin rejects time-off request          |
| `STATUS_CHANGED`              | 📋   | Parent          | Enrollment status changes               |

---

## Detailed Notification Flows

### 1. Parent Cancels a Class

**Trigger:** Parent creates exception with type `CANCELLED_STUDENT`

**Flow:**

```text
Parent → POST /api/enrollments/[id]/exceptions
         ↓
         notifyTeacherOfParentCancellation()
         ↓
         Teacher receives CLASS_CANCELLED_BY_PARENT notification
```

**Recipients:**

| Role    | Notification | Message Example                                                                                         |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| Teacher | ✅ Yes       | "Aula de [Student] (Segunda, 23/12/2024 às 14:00) foi cancelada pelo responsável. Motivo: Viagem"       |
| Parent  | ❌ No        | (They initiated it)                                                                                     |
| Admin   | ❌ No        | -                                                                                                       |

---

### 2. Teacher Requests Cancellation (Pending Approval)

**Trigger:** Teacher creates exception with type `CANCELLED_TEACHER`

**Flow:**

```text
Teacher → POST /api/enrollments/[id]/exceptions
          ↓
          Exception created with status=PENDING
          ↓
          (No notification yet - awaiting admin approval)
```

**Recipients:** None until approved/rejected

---

### 3. Admin Approves Teacher Cancellation

**Trigger:** Admin approves via `POST /api/admin/cancellations` with `action=approve`

**Flow:**

```text
Admin → POST /api/admin/cancellations
        ↓
        notifyTeacherOfCancellationApproved()
        notifyParentOfTeacherCancellationApproved()
        ↓
        Teacher receives CANCELLATION_APPROVED
        Parent receives CLASS_CANCELLED_BY_TEACHER
```

**Recipients:**

| Role    | Notification                   | Message Example                                                                            |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| Teacher | ✅ CANCELLATION_APPROVED       | "Seu pedido de cancelamento da aula de Segunda, 23/12/2024 às 14:00 foi aprovado."         |
| Parent  | ✅ CLASS_CANCELLED_BY_TEACHER  | "A aula com [Teacher] (Segunda, 23/12/2024 às 14:00) foi cancelada. Motivo: Doente"        |
| Admin   | ❌ No                          | (They initiated it)                                                                        |

---

### 4. Admin Rejects Teacher Cancellation

**Trigger:** Admin rejects via `POST /api/admin/cancellations` with `action=reject`

**Flow:**

```text
Admin → POST /api/admin/cancellations
        ↓
        notifyTeacherOfCancellationRejected()
        ↓
        Teacher receives CANCELLATION_REJECTED
```

**Recipients:**

| Role    | Notification              | Message Example                                                                                                |
| ------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Teacher | ✅ CANCELLATION_REJECTED  | "Seu pedido de cancelamento para Segunda, 23/12/2024 às 14:00 foi negado. A aula deve ser ministrada conforme agendado." |
| Parent  | ❌ No                     | (Class not cancelled)                                                                                          |
| Admin   | ❌ No                     | (They initiated it)                                                                                            |

---

### 5. Admin Directly Cancels a Class

**Trigger:** Admin creates exception with type `CANCELLED_ADMIN`

**Flow:**

```text
Admin → POST /api/enrollments/[id]/exceptions (exception_type=CANCELLED_ADMIN)
        ↓
        notifyTeacherOfAdminCancellation()
        notifyParentOfAdminCancellation()
        ↓
        Teacher receives CLASS_CANCELLED_BY_ADMIN
        Parent receives CLASS_CANCELLED_BY_ADMIN
```

**Recipients:**

| Role    | Notification                  | Message Example                                                                                              |
| ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Teacher | ✅ CLASS_CANCELLED_BY_ADMIN   | "A aula com [Student] (Segunda, 23/12/2024 às 14:00) foi cancelada pela administração. Motivo: Conflito de agenda" |
| Parent  | ✅ CLASS_CANCELLED_BY_ADMIN   | "A aula com [Teacher] (Segunda, 23/12/2024 às 14:00) foi cancelada pela administração. Motivo: Conflito de agenda" |
| Admin   | ❌ No                         | (They initiated it)                                                                                          |

---

### 6. System Closure Created (Weather/Holiday/Emergency)

**Trigger:** Admin creates closure via `POST /api/system/closures`

**Flow:**

```text
Admin → POST /api/system/closures (WEATHER/EMERGENCY/HOLIDAY/CUSTOM)
        ↓
        notifyOfWeatherClosure()
        ↓
        All affected teachers receive CLASS_CANCELLED_WEATHER
        All affected parents receive CLASS_CANCELLED_WEATHER
```

**Recipients:**

| Role    | Notification                 | Message Example                                                              |
| ------- | ---------------------------- | ---------------------------------------------------------------------------- |
| Teacher | ✅ CLASS_CANCELLED_WEATHER   | "Todas as aulas foram canceladas no dia 23/12/2024 devido a feriado de natal." |
| Parent  | ✅ CLASS_CANCELLED_WEATHER   | "Todas as aulas foram canceladas no dia 23/12/2024 devido a feriado de natal." |
| Admin   | ❌ No                        | (They initiated it)                                                          |

**Note:** Only notifies for WEATHER, EMERGENCY, HOLIDAY, CUSTOM types. FÉRIAS (vacation) does not trigger notifications.

---

### 7. Class Started

**Trigger:** Teacher starts class via `POST /api/enrollments/[id]/start-class`

**Flow:**

```text
Teacher → POST /api/enrollments/[id]/start-class
          ↓
          notifyParentClassStarted()
          ↓
          Parent receives CLASS_STARTED
```

**Recipients:**

| Role    | Notification     | Message Example                                                        |
| ------- | ---------------- | ---------------------------------------------------------------------- |
| Teacher | ❌ No            | (They initiated it)                                                    |
| Parent  | ✅ CLASS_STARTED | "A aula com [Teacher] (Segunda, 23/12/2024 às 14:00) começou! 📚"      |
| Admin   | ❌ No            | -                                                                      |

---

### 8. Class Completed

**Trigger:** Teacher completes class via `POST /api/enrollments/[id]/complete-class` (normal completion)

**Flow:**

```text
Teacher → POST /api/enrollments/[id]/complete-class (status=COMPLETED)
          ↓
          notifyParentClassCompleted()
          ↓
          Parent receives CLASS_COMPLETED
```

**Recipients:**

| Role    | Notification       | Message Example                                                                                                  |
| ------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Teacher | ❌ No              | (They initiated it)                                                                                              |
| Parent  | ✅ CLASS_COMPLETED | "A aula com [Teacher] (Segunda, 23/12/2024 às 14:00) foi concluída com sucesso! ✅ Feedback do professor: 'Worked on vocabulary'" |
| Admin   | ❌ No              | -                                                                                                                |

---

### 9. Student No-Show (Falta)

**Trigger:** Teacher marks no-show via `POST /api/enrollments/[id]/complete-class` with `status=NO_SHOW`

**Flow:**

```text
Teacher → POST /api/enrollments/[id]/complete-class (status=NO_SHOW)
          ↓
          notifyParentNoShow()
          ↓
          Parent receives NO_SHOW
```

**Recipients:**

| Role    | Notification | Message Example                                                                                                        |
| ------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Teacher | ❌ No        | (They initiated it)                                                                                                    |
| Parent  | ✅ NO_SHOW   | "[Student] foi marcado(a) como falta na aula com [Teacher] (Segunda, 23/12/2024 às 14:00). O professor aguardou mas não conseguiu realizar a aula." |
| Admin   | ❌ No        | -                                                                                                                      |

---

### 10. Group Rate Changed

**Trigger:** Group composition changes via enrollment status change affecting rate

**Flow:**

```text
Admin → PUT /api/enrollments/group/[groupId]/status
        ↓
        notifyGroupRateChange()
        ↓
        Remaining ATIVO parents receive GROUP_RATE_CHANGED
```

**Recipients:**

| Role             | Notification           | Message Example                                                                                        |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Teacher          | ❌ No                  | -                                                                                                      |
| Parent (affected)| ✅ GROUP_RATE_CHANGED  | "O grupo de aulas foi alterado. [Student] saiu do grupo. O novo valor por aula será R$ 85,00 (antes: R$ 75,00)." |
| Admin            | ❌ No                  | (They initiated it)                                                                                    |

---

### 11. Time-Off Request Approved

**Trigger:** Admin approves time-off via `POST /api/admin/time-off-approvals` with `action=approve`

**Flow:**

```text
Admin → POST /api/admin/time-off-approvals (action=approve)
        ↓
        notifyTeacherTimeOffApproved()
        ↓
        Teacher receives TIME_OFF_APPROVED
```

**Recipients:**

| Role    | Notification          | Message Example                                                       |
| ------- | --------------------- | --------------------------------------------------------------------- |
| Teacher | ✅ TIME_OFF_APPROVED  | "Sua solicitação de folga para 23/12/2024 a 25/12/2024 foi aprovada." |
| Parent  | ❌ No                 | -                                                                     |
| Admin   | ❌ No                 | (They initiated it)                                                   |

---

### 12. Time-Off Request Rejected

**Trigger:** Admin rejects time-off via `POST /api/admin/time-off-approvals` with `action=reject`

**Flow:**

```text
Admin → POST /api/admin/time-off-approvals (action=reject)
        ↓
        notifyTeacherTimeOffRejected()
        ↓
        Teacher receives TIME_OFF_REJECTED
```

**Recipients:**

| Role    | Notification          | Message Example                                                                      |
| ------- | --------------------- | ------------------------------------------------------------------------------------ |
| Teacher | ✅ TIME_OFF_REJECTED  | "Sua solicitação de folga para 23/12/2024 foi negada. Motivo: Muitas aulas agendadas"|
| Parent  | ❌ No                 | -                                                                                    |
| Admin   | ❌ No                 | (They initiated it)                                                                  |

---

### 13. Enrollment Status Changed

**Trigger:** Admin changes enrollment status via `PUT /api/enrollments/[id]/status`

**Flow:**

```text
Admin → PUT /api/enrollments/[id]/status
        ↓
        notifyParentStatusChange() (for PAUSADO/AVISO/INATIVO/SEM_CONTRATO/ATIVO)
        ↓
        Parent receives STATUS_CHANGED
```

**Recipients:**

| Role    | Notification      | Message Example                    |
| ------- | ----------------- | ---------------------------------- |
| Teacher | ❌ No             | -                                  |
| Parent  | ✅ STATUS_CHANGED | Status-specific messages (see below)|
| Admin   | ❌ No             | (They initiated it)                |

**Status-Specific Messages:**

| New Status         | Title            | Message                                                                                      |
| ------------------ | ---------------- | -------------------------------------------------------------------------------------------- |
| PAUSADO            | "Aulas Pausadas" | "As aulas de [Student] foram pausadas temporariamente. Entre em contato com a escola para mais informações." |
| AVISO              | "Aviso Importante"| "Há um aviso pendente sobre as aulas de [Student]. Entre em contato com a escola para regularizar a situação." |
| INATIVO/SEM_CONTRATO| "Aulas Encerradas"| "As aulas de [Student] foram encerradas. Entre em contato com a escola se desejar retomar."  |
| ATIVO              | "Aulas Retomadas" | "As aulas de [Student] foram retomadas! O cronograma normal está ativo novamente."           |

---

### 14. Class Rescheduled

**Trigger:** Reschedule exception created

**Flow:**

```text
User → POST /api/enrollments/[id]/exceptions (RESCHEDULED/RESCHEDULED_BY_*)
       ↓
       notifyTeacherOfReschedule() (if by student)
       notifyParentOfReschedule() (if by teacher/admin)
       ↓
       Relevant party receives CLASS_RESCHEDULED
```

**Recipients:**

| Scenario           | Teacher      | Parent            |
| ------------------ | ------------ | ----------------- |
| Parent reschedules | ✅ Notified  | ❌ No (initiated) |
| Teacher reschedules| ❌ No (initiated)| ✅ Notified    |
| Admin reschedules  | ✅ Notified  | ✅ Notified       |

---

## Summary by Role

### Admin Receives

**Currently: No notifications**

Admins do not receive in-app notifications. They see pending counts via badges:

- Pending change requests
- Pending availability approvals
- Pending time-off requests
- Pending teacher cancellations

### Teacher Receives

| Notification              | When                                    |
| ------------------------- | --------------------------------------- |
| CLASS_CANCELLED_BY_PARENT | Parent cancels class                    |
| CLASS_CANCELLED_BY_ADMIN  | Admin cancels class                     |
| CLASS_CANCELLED_WEATHER   | System closure created                  |
| CANCELLATION_APPROVED     | Admin approves their cancellation request|
| CANCELLATION_REJECTED     | Admin rejects their cancellation request|
| CLASS_RESCHEDULED         | Admin/parent reschedules                |
| TIME_OFF_APPROVED         | Admin approves their time-off           |
| TIME_OFF_REJECTED         | Admin rejects their time-off            |

### Parent Receives

| Notification              | When                         |
| ------------------------- | ---------------------------- |
| CLASS_CANCELLED_BY_TEACHER| Teacher cancellation approved|
| CLASS_CANCELLED_BY_ADMIN  | Admin cancels class          |
| CLASS_CANCELLED_WEATHER   | System closure created       |
| CLASS_RESCHEDULED         | Teacher/admin reschedules    |
| CLASS_STARTED             | Teacher starts class         |
| CLASS_COMPLETED           | Teacher completes class      |
| NO_SHOW                   | Teacher marks student absent |
| GROUP_RATE_CHANGED        | Group composition changes    |
| STATUS_CHANGED            | Enrollment status changes    |

---

## Potential Gaps / Future Considerations

1. **Admin Notifications**: Admins currently don't receive any in-app notifications. Consider adding notifications for:
   - New lead submissions
   - New teacher cancellation requests
   - New time-off requests
   - Failed class starts/completions

2. **Availability Approval**: Teachers don't get notified when their availability changes are approved/rejected

3. **Lead Status Changes**: Parents (leads) don't get notified when their status changes in the pipeline

4. **Multiple Parents**: All linked parents receive notifications (via `parent_links` table lookup)

---

## Session Change Log (2025-12-22)

### Summary of Changes

This session completed a comprehensive audit and implementation of the notification system, fixing critical gaps and adding missing functionality.

### New Notification Types Added

| Type                | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `NO_SHOW`           | Parent notification when teacher marks student absent |
| `TIME_OFF_APPROVED` | Teacher notification when admin approves time-off|
| `TIME_OFF_REJECTED` | Teacher notification when admin rejects time-off |
| `STATUS_CHANGED`    | Parent notification when enrollment status changes|

### Methods Wired Up

The following notification methods existed but were never called ("orphaned"). They are now properly triggered:

| Method                         | Now Triggered In                                              |
| ------------------------------ | ------------------------------------------------------------- |
| `notifyOfWeatherClosure()`     | `POST /api/system/closures`                                   |
| `notifyParentNoShow()`         | `POST /api/enrollments/[id]/complete-class` (when status=NO_SHOW)|
| `notifyParentStatusChange()`   | `PUT /api/enrollments/[id]/status`                            |
| `notifyTeacherTimeOffApproved()`| `POST /api/admin/time-off-approvals` (action=approve)        |
| `notifyTeacherTimeOffRejected()`| `POST /api/admin/time-off-approvals` (action=reject)         |

### Bug Fixes

#### 500 Errors on Pending Counts APIs

All three pending-counts APIs (`/api/admin/pending-counts`, `/api/teacher/pending-counts`, `/api/parent/pending-counts`) were returning 500 errors due to a race condition in Promise.all.

**Root Cause:** Conditional expressions inside Promise.all array were evaluated during array construction, causing issues with async user lookups.

**Fix:** Separated notification count queries from main Promise.all with independent try/catch blocks:

```typescript
// Before (broken):
const [...results, notifResult] = await Promise.all([
  ...queries,
  userResult?.id ? db.prepare(...).first() : Promise.resolve({ count: 0 })
]);

// After (fixed):
const [...results] = await Promise.all([...queries]);

let unreadNotifications = 0;
try {
  const userResult = await db.prepare('SELECT id FROM users...').first();
  if (userResult?.id) {
    const notifResult = await db.prepare('SELECT COUNT(*)...').first();
    unreadNotifications = notifResult?.count ?? 0;
  }
} catch (notifError) {
  console.error('Error fetching notifications:', notifError);
}
```

### Icons Added to NotificationBell

The following icons were added to `NotificationBell.astro`:

| Type                 | Icon |
| -------------------- | ---- |
| `CLASS_STARTED`      | 📚   |
| `CLASS_COMPLETED`    | 🎉   |
| `GROUP_RATE_CHANGED` | 💰   |
| `TIME_OFF_APPROVED`  | ✅   |
| `TIME_OFF_REJECTED`  | 🚫   |
| `STATUS_CHANGED`     | 📋   |
| `NO_SHOW`            | ⚠️   |

### Files Modified

| File                                                | Changes                                    |
| --------------------------------------------------- | ------------------------------------------ |
| `src/lib/repositories/types.ts`                     | Added 4 new NotificationType enum values   |
| `src/lib/services/notification-service.ts`          | Added 4 new notification methods           |
| `src/pages/api/system/closures.ts`                  | Wired closure notifications                |
| `src/pages/api/enrollments/[id]/complete-class.ts`  | Wired NO_SHOW notification                 |
| `src/pages/api/enrollments/[id]/status.ts`          | Added status change notifications          |
| `src/pages/api/admin/time-off-approvals.ts`         | Added time-off approval/rejection notifications |
| `src/pages/api/admin/pending-counts.ts`             | Fixed 500 error, added unread count        |
| `src/pages/api/teacher/pending-counts.ts`           | Fixed 500 error, added unread count        |
| `src/pages/api/parent/pending-counts.ts`            | Fixed 500 error, added unread count        |
| `src/components/NotificationBell.astro`             | Added 7 missing icons                      |

### Deployment

Changes deployed to production: [eduschedule-app.pages.dev](https://eduschedule-app.pages.dev)
