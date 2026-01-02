# Business Rules Validation Plan

**Date:** 2026-01-02
**Purpose:** Validate that the implementation correctly enforces ALL business rules from PRD and enrollment-rules-comprehensive.md
**Status:** ✅ IMPLEMENTED (Session 111)

---

## Executive Summary

We have 96%+ code coverage but have NOT validated that business scenarios work correctly. This document creates a **Scenario-Based Validation** approach to verify the implementation matches the business requirements.

---

## Validation Gap Analysis

### What Exists (Technical Validation)
| Type | Tests | What It Proves |
|------|-------|----------------|
| Unit tests | 3,992 | Code paths execute |
| Mutation tests | 98.33% | Tests actually verify behavior |
| Property tests | 141 | Mathematical invariants hold |
| Integration tests | 58 | Database operations work |
| Contract tests | 42 | API responses match schemas |

### What's Missing (Business Validation)
| Type | Tests | What It Would Prove |
|------|-------|---------------------|
| Scenario tests | 0 | User journeys work end-to-end |
| Time-based tests | 0 | PAUSADO 3-week, AVISO 14-day enforcement |
| Cascade tests | 0 | Status changes cascade correctly |
| Group pricing tests | 0 | R$150→R$120 pricing works |

---

## Section 1: Core Business Rules from PRD

### FR1-9: Enrollment Management

| Rule ID | Rule Description | Test Exists? | Scenario Needed |
|---------|------------------|--------------|-----------------|
| FR1 | Admin can create enrollment (student + teacher + day/time) | ✅ Unit | ⬜ E2E with conflict check |
| FR2 | Admin can change status (ATIVO, PAUSADO, INATIVO) | ✅ Unit | ⬜ E2E with history logging |
| FR3 | Admin can edit assigned teacher | ✅ Unit | ⬜ E2E with slot transfer |
| FR4 | Admin can edit day/time (with conflict checking) | ✅ Unit | ⬜ E2E overlapping time |
| FR5 | Admin can terminate enrollment (slot → LIVRE) | ✅ Unit | ⬜ E2E slot released |
| FR6 | Admin can view/filter enrollments | ✅ Unit | ⬜ E2E filtering works |
| FR7 | **PAUSADO auto-returns to ATIVO after 3 weeks** | ✅ Unit | ⬜ **TIME-BASED TEST CRITICAL** |
| FR8 | **5-month PAUSADO cooldown after auto-return** | ✅ Unit | ⬜ **COOLDOWN ENFORCEMENT** |
| FR9 | **System BLOCKS if slot already BLOCKED** | ✅ Unit | ⬜ **DOUBLE-BOOKING PREVENTION** |

### FR37-41: Slot & Conflict Management (CORE INNOVATION)

| Rule ID | Rule Description | Test Exists? | Scenario Needed |
|---------|------------------|--------------|-----------------|
| FR37 | Slot status (LIVRE/BLOCKED) maintained | ✅ Unit | ⬜ E2E slot computation |
| FR38 | **Conflict prevention at enrollment level** | ✅ Integration | ⬜ Race condition test |
| FR39 | Slot → BLOCKED when enrollment created/reactivated | ✅ Unit | ⬜ E2E PAUSADO→ATIVO |
| FR40 | **Slot → LIVRE ONLY when INATIVO** (not paused, not cancelled) | ✅ Unit | ⬜ **CRITICAL SCENARIO** |
| FR41 | Admin can view teacher's weekly slot grid | ✅ Unit | ⬜ E2E grid accuracy |

### FR42-46: Status Lifecycle (BUSINESS CRITICAL)

| Rule ID | Rule Description | Test Exists? | Scenario Needed |
|---------|------------------|--------------|-----------------|
| FR42 | Valid transitions enforced | ✅ Property | ⬜ Invalid transition rejected |
| FR43 | **PAUSADO start date tracked for 3-week countdown** | ✅ Unit | ⬜ **DAY 21 AUTO-TRANSITION** |
| FR44 | **PAUSADO cooldown expiry tracked (5 months)** | ✅ Unit | ⬜ **MONTH 5 UNBLOCK** |
| FR45 | **PAUSADO blocked during cooldown** | ✅ Unit | ⬜ **ATTEMPT DURING COOLDOWN** |
| FR46 | Admin can override cooldown | ✅ Unit | ⬜ Override checkbox works |

---

## Section 2: Enrollment Rules Checklist (from enrollment-rules-comprehensive.md)

### Status Changes (Individual) - ALL NEED VERIFICATION

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Change ATIVO → PAUSADO | Slot stays BLOCKED, pausado_started_at set | ⬜ |
| Change PAUSADO → ATIVO (before 3 weeks) | Manual return, cooldown_until set | ⬜ |
| Change PAUSADO → ATIVO (after 3 weeks) | Auto-return, 5-month cooldown | ⬜ |
| Change ATIVO → AVISO | aviso_started_at set, 14-day countdown | ⬜ |
| Change AVISO → ATIVO | Countdown cancelled, dates cleared | ⬜ |
| AVISO expires (day 15+) | Auto → INATIVO, slot → LIVRE | ⬜ |
| Change ANY → INATIVO | Slot becomes LIVRE, terminated_at set | ⬜ |
| PAUSADO during cooldown | Should be BLOCKED by system | ⬜ |
| Admin override cooldown | Should allow PAUSADO with checkbox | ⬜ |

### Status Changes (Group) - ALL NEED VERIFICATION

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Select multiple students, change status | Batch update works | ⬜ |
| One student PAUSADO in group | Others stay ATIVO, invoice adjusts | ⬜ |
| Rate preview before status change | Shows R$120 → R$150 if degrading | ⬜ |
| Group degrades to 1 active | Invoice shows R$150 (not R$120) | ⬜ |

### Slot Booking - ALL NEED VERIFICATION

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Click LIVRE slot | Opens booking modal | ⬜ |
| Create enrollment on LIVRE | Slot becomes BLOCKED | ⬜ |
| Create enrollment on BLOCKED | Should be REJECTED | ⬜ |
| Reschedule conflicts with existing | Should be REJECTED | ⬜ |
| Cancelled class slot | Shows as MAKEUP_ONLY, not LIVRE | ⬜ |

### Cancellations & Reschedules - ALL NEED VERIFICATION

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Parent cancels (with reschedule) | Exception created, shows makeup slots | ⬜ |
| Parent cancels (no reschedule) | Exception created, slot stays BLOCKED | ⬜ |
| Teacher requests cancellation | Goes to pending approval | ⬜ |
| Admin approves teacher cancellation | Exception approved, parent notified | ⬜ |
| Admin rejects teacher cancellation | Exception removed | ⬜ |

---

## Section 3: Proposed Validation Tests

### Type 1: Scenario-Based Integration Tests

Create new test file: `src/lib/test-utils/integration/business-scenarios.integration.test.ts`

```typescript
/**
 * Business Scenario Tests
 *
 * These tests verify end-to-end business scenarios from PRD,
 * NOT just code paths. Each test simulates real user actions.
 */

describe('PRD Business Scenarios', () => {

  // FR40: Cancelled instance ≠ Released slot (CORE INNOVATION)
  describe('Enrollment-First Architecture', () => {
    it('cancelled class does NOT release slot', async () => {
      // 1. Create enrollment (slot becomes BLOCKED)
      // 2. Cancel a class instance
      // 3. Verify slot is STILL BLOCKED
      // 4. Verify slot type is MAKEUP_ONLY, not LIVRE
    });

    it('only INATIVO releases the slot', async () => {
      // 1. Create enrollment (BLOCKED)
      // 2. Change to PAUSADO (BLOCKED)
      // 3. Change to AVISO (BLOCKED)
      // 4. Change to INATIVO (LIVRE)
    });
  });

  // FR7-8: PAUSADO automation
  describe('PAUSADO 3-Week Rule', () => {
    it('auto-transitions to ATIVO after 21 days', async () => {
      // 1. Create enrollment ATIVO
      // 2. Change to PAUSADO
      // 3. Fast-forward time to day 22
      // 4. Access enrollment
      // 5. Verify status is now ATIVO
      // 6. Verify cooldown_until is set to 5 months from now
    });

    it('blocks PAUSADO requests during cooldown', async () => {
      // 1. Set up enrollment with cooldown_until = 3 months from now
      // 2. Try to change to PAUSADO
      // 3. Expect PausadoCooldownError
    });

    it('admin can override cooldown with checkbox', async () => {
      // 1. Set up enrollment with cooldown_until = 3 months from now
      // 2. Change to PAUSADO with override_cooldown: true
      // 3. Should succeed
    });
  });

  // FR42-43: AVISO countdown
  describe('AVISO 14-Day Countdown', () => {
    it('auto-transitions to INATIVO after 14 days', async () => {
      // 1. Create enrollment ATIVO
      // 2. Change to AVISO
      // 3. Fast-forward time to day 15
      // 4. Access enrollment
      // 5. Verify status is now INATIVO
      // 6. Verify slot is now LIVRE
    });

    it('AVISO can be reversed anytime during 14 days', async () => {
      // 1. Set up enrollment in AVISO (day 10)
      // 2. Change back to ATIVO
      // 3. Verify countdown is cleared
    });
  });

  // FR9, FR38: Double-booking prevention
  describe('Double-Booking Prevention', () => {
    it('prevents booking same slot twice', async () => {
      // 1. Create enrollment at Monday 10:00
      // 2. Try to create another enrollment at Monday 10:00
      // 3. Expect SlotConflictError
    });

    it('allows group classes at same slot', async () => {
      // 1. Create group class with 2 students at Monday 10:00
      // 2. Both should succeed with same group_id
    });

    it('prevents time overlap (not just exact match)', async () => {
      // 1. Create enrollment at 10:00-11:00
      // 2. Try to create at 10:30-11:30
      // 3. Expect SlotConflictError
    });
  });
});
```

### Type 2: Time-Based Validation Tests

Create new test file: `src/lib/test-utils/integration/time-based.integration.test.ts`

```typescript
/**
 * Time-Based Business Rule Tests
 *
 * These tests use mocked time to verify countdowns and auto-transitions.
 */

describe('Time-Based Business Rules', () => {

  describe('PAUSADO 21-Day Limit', () => {
    it('day 1-20: stays PAUSADO', async () => {
      const enrollment = await createEnrollmentWithStatus('PAUSADO');

      // Fast-forward 20 days
      vi.setSystemTime(addDays(new Date(), 20));

      const result = await getEnrollment(enrollment.id);
      expect(result.status).toBe('PAUSADO');
    });

    it('day 21: transitions to ATIVO', async () => {
      const enrollment = await createEnrollmentWithStatus('PAUSADO');

      // Fast-forward 21 days
      vi.setSystemTime(addDays(new Date(), 21));

      const result = await getEnrollment(enrollment.id);
      expect(result.status).toBe('ATIVO');
    });
  });

  describe('AVISO 14-Day Countdown', () => {
    it('day 1-14: stays AVISO with countdown', async () => {
      const enrollment = await createEnrollmentWithStatus('AVISO');

      vi.setSystemTime(addDays(new Date(), 10));

      const result = await getEnrollment(enrollment.id);
      expect(result.status).toBe('AVISO');
      expect(result.avisoDaysRemaining).toBe(4);
    });

    it('day 15: transitions to INATIVO', async () => {
      const enrollment = await createEnrollmentWithStatus('AVISO');

      vi.setSystemTime(addDays(new Date(), 15));

      const result = await getEnrollment(enrollment.id);
      expect(result.status).toBe('INATIVO');
    });
  });

  describe('PAUSADO 5-Month Cooldown', () => {
    it('month 1-4: blocks PAUSADO requests', async () => {
      const enrollment = await createEnrollmentWithCooldown(monthsFromNow(4));

      await expect(changeStatus(enrollment.id, 'PAUSADO'))
        .rejects.toThrow('PAUSADO unavailable');
    });

    it('month 6: allows PAUSADO requests', async () => {
      const enrollment = await createEnrollmentWithCooldown(monthsAgo(1));

      await expect(changeStatus(enrollment.id, 'PAUSADO'))
        .resolves.toBeDefined();
    });
  });
});
```

### Type 3: Group Pricing Validation Tests

Create new test file: `src/lib/test-utils/integration/group-pricing.integration.test.ts`

```typescript
/**
 * Group Pricing Business Rule Tests
 *
 * Validates dynamic pricing based on who attends each class.
 */

describe('Group Class Pricing Rules', () => {

  describe('Per-Class Reality Pricing', () => {
    it('3+ students = R$120 each', async () => {
      const group = await createGroupClass(3);
      const completion = await completeClass(group.id, [1, 2, 3]); // all 3 attend

      expect(completion.rate_per_student).toBe(120);
      expect(completion.total_billed).toBe(360);
    });

    it('2 students = R$120 each', async () => {
      const group = await createGroupClass(3);
      const completion = await completeClass(group.id, [1, 2]); // only 2 attend

      expect(completion.rate_per_student).toBe(120);
      expect(completion.total_billed).toBe(240);
    });

    it('1 student = R$150 (degrades to individual)', async () => {
      const group = await createGroupClass(3);
      const completion = await completeClass(group.id, [1]); // only 1 attends

      expect(completion.rate_per_student).toBe(150);
      expect(completion.total_billed).toBe(150);
    });
  });

  describe('Group Status Changes', () => {
    it('one student PAUSADO does not affect others', async () => {
      const group = await createGroupClass(3);

      await changeStatus(group.enrollments[0].id, 'PAUSADO');

      // Other two should still be ATIVO
      expect(await getStatus(group.enrollments[1].id)).toBe('ATIVO');
      expect(await getStatus(group.enrollments[2].id)).toBe('ATIVO');

      // Next class should bill at R$120 for 2 active students
      const completion = await completeClass(group.id);
      expect(completion.rate_per_student).toBe(120);
    });
  });
});
```

---

## Section 4: Manual Validation Checklist

For scenarios that require UI verification:

### Admin Dashboard

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Slot grid accuracy | Open /admin/enrollments → Week view | Colors match ATIVO/PAUSADO/AVISO | ⬜ |
| Conflict prevention | Try to book BLOCKED slot | Error message shown | ⬜ |
| PAUSADO cooldown display | View enrollment with cooldown | Shows cooldown date | ⬜ |
| Group status change preview | Select multiple → Status | Shows rate change preview | ⬜ |

### Teacher Dashboard

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Schedule accuracy | Open /teacher/schedule | Shows all enrollments | ⬜ |
| Cancelled slots marked | Cancel a class | Shows "Makeup Available" | ⬜ |
| Time-off request | Submit vacation request | Goes to pending | ⬜ |

### Parent Dashboard

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Class history | Open /parent/students | Shows completed classes | ⬜ |
| Cancel class | Cancel upcoming class | Exception created, slot still blocked | ⬜ |
| Invoice accuracy | View invoice | Matches classes completed | ⬜ |

---

## Section 5: Implementation Priority

### Priority 1: Critical Business Rules (Do First)

1. **Slot stays BLOCKED after cancellation** - Core innovation test
2. **PAUSADO 3-week auto-transition** - Time-based test
3. **PAUSADO 5-month cooldown enforcement** - Cooldown test
4. **Double-booking prevention** - Race condition test
5. **Group pricing degradation** - Billing accuracy test

### Priority 2: Status Lifecycle

6. **AVISO 14-day auto-transition**
7. **Status transition validation**
8. **Admin cooldown override**

### Priority 3: Edge Cases

9. **Time overlap detection (not just exact match)**
10. **MAKEUP_ONLY vs LIVRE slot types**
11. **Reschedule conflict detection**

---

## Section 6: Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Business scenario coverage | 100% | All checkboxes in Section 2 verified |
| Time-based rule accuracy | 100% | PAUSADO/AVISO transitions work correctly |
| Pricing accuracy | 100% | Group pricing tests pass |
| Conflict prevention | 100% | No double-bookings possible |

---

## Next Steps

1. **Create scenario tests** (Section 3) - 4-6 hours
2. **Create time-based tests** (Section 3) - 2-3 hours
3. **Create group pricing tests** (Section 3) - 2-3 hours
4. **Run manual validation** (Section 4) - 2-3 hours
5. **Update enrollment-rules-comprehensive.md** with results

---

**Document Created:** 2026-01-02
**Status:** Ready for Implementation
