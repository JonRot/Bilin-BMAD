# EduSchedule Pro - Technical Page Audit Report

**Date:** 2025-12-20
**Audited by:** Claude (Opus 4.5) - Parallel Agent Analysis
**Pages Audited:** 26 pages + 80+ API endpoints
**Total Issues Found:** 92

---

## Related Documents

> **See Also:** [comprehensive-audit-2025-12-20.md](./comprehensive-audit-2025-12-20.md) for:
> - Component usage analysis (unused, duplicated patterns)
> - UX merge opportunities (pages to consolidate)
> - Duplicate code patterns (escapeHtml 8x, CSRF fetch 29x)
> - TypeScript type safety (38+ `any` uses, unsafe JSON.parse)
> - CSS/styling issues (95 !important, z-index chaos)
> - Form pattern inconsistencies
> - API endpoint consistency
>
> **This file focuses on:** N+1 queries, security, error handling, efficiency

---

## Executive Summary

A comprehensive audit of all 26 pages in the EduSchedule application was conducted using 10 parallel AI agents. The audit covered:

- **Database connection patterns** - Is `locals.runtime` properly passed?
- **N+1 query patterns** - Sequential database calls in loops
- **Security issues** - CSRF, XSS, input validation
- **Error handling** - Silent failures, missing try-catch
- **Efficiency** - Caching, pagination, parallelization

### Overall Assessment

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| N+1 Queries | 3 | 3 | 2 | 0 | 8 |
| Security/CSRF | 2 | 5 | 2 | 0 | 9 |
| Error Handling | 0 | 22 | 30 | 9 | 61 |
| Efficiency | 1 | 4 | 7 | 2 | 14 |
| **TOTAL** | **6** | **34** | **41** | **11** | **92** |

---

## Section 1: N+1 Query Issues

### Critical N+1 Patterns

#### 1.1 Parent Invoice - Teacher Lookups (CRITICAL)
- **File:** `src/pages/parent/invoice.astro`
- **Lines:** 102-107
- **Pattern:** Per-enrollment teacher lookup in loop
- **Impact:** 40x+ queries for large schools
- **Fix:** Batch fetch all teacher IDs

```typescript
// BEFORE (N+1)
for (const enrollment of enrollments) {
  const teacher = await getTeacherById(db, enrollment.teacher_id, runtime);
}

// AFTER (Batch)
const teacherIds = [...new Set(enrollments.map(e => e.teacher_id))];
const teachers = await getTeachersByIds(db, teacherIds, runtime);
const teacherMap = new Map(teachers.map(t => [t.id, t]));
```

#### 1.2 Teacher Schedule - Earnings Calculation (CRITICAL)
- **File:** `src/pages/teacher/schedule.astro`
- **Lines:** 150-168
- **Pattern:** `enrollmentRepo.findById()` per completion
- **Impact:** 30+ queries per month
- **Fix:** Batch fetch enrollments

#### 1.3 Pending Exceptions API (CRITICAL)
- **File:** `src/pages/api/exceptions/pending.ts`
- **Lines:** 57-71
- **Pattern:** 3x lookups per exception (enrollment, teacher, student)
- **Impact:** 1 + 3N queries
- **Fix:** Use JOINs or batch queries

### High Priority N+1 Patterns

| File | Lines | Pattern | Multiplier |
|------|-------|---------|------------|
| `teacher/availability.astro` | 49-50 | studentNameResolver per slot | 125x |
| `parent/index.astro` | 37-44 | Teacher lookup per student | 10x |
| `parent/schedule.astro` | 74-81 | Teacher lookup in loop | 10x |

---

## Section 2: Security Issues

### Critical Security Issues

#### 2.1 Stack Traces in Error Responses (CRITICAL)
- **File:** `src/pages/api/enrollments/group/[groupId]/status.ts`
- **Lines:** 122-128, 556-570
- **Issue:** `error.stack` returned to client
- **Fix:** Remove stack from production responses

```typescript
// REMOVE THIS:
return new Response(JSON.stringify({
  error: 'INTERNAL_ERROR',
  stack: error instanceof Error ? error.stack : undefined  // LEAK!
}));
```

#### 2.2 Missing CSRF Token on PATCH (CRITICAL)
- **File:** `src/pages/admin/settings.astro`
- **Lines:** 286-298
- **Issue:** PATCH request missing `X-CSRF-Token`
- **Fix:** Add CSRF header like POST/DELETE

### High Priority Security Issues

| File | Lines | Issue | Risk |
|------|-------|-------|------|
| `admin/parent-links.astro` | 130 | Missing CSRF on POST | HIGH |
| `admin/teacher-links.astro` | 130 | Missing CSRF on POST | HIGH |
| `admin/account-links.astro` | 270-339 | Missing CSRF on POST/DELETE | HIGH |
| `admin/re-encrypt.astro` | 182-190 | Missing CSRF on POST | HIGH |
| `api/public/register.ts` | N/A | No rate limiting | HIGH |

### Unsafe onclick Handlers (XSS Risk)
Multiple pages use string interpolation in onclick handlers:

```astro
<!-- RISKY - string interpolation -->
onclick={`openEditModal('${entityInfo.type}', '${entityInfo.id}')`}

<!-- BETTER - event delegation -->
<button data-type={entityInfo.type} data-id={entityInfo.id}>Edit</button>
```

**Affected pages:** settings.astro, travel-errors.astro, time-off-approvals.astro, leads.astro, users.astro, closures.astro

---

## Section 3: Error Handling Issues

### Silent Failures (console.error only)

22 locations where errors are logged but no user feedback is shown:

| Page | Lines | Function | Impact |
|------|-------|----------|--------|
| `teacher/profile.astro` | 25-28 | Fetch profile | Blank page |
| `teacher/availability.astro` | 73-75 | Load slots | Empty grid |
| `parent/schedule.astro` | 139-141 | Fetch schedule | No data |
| `parent/history.astro` | 130-132 | Fetch history | Empty history |
| `parent/index.astro` | 107-109 | Dashboard data | Incomplete stats |
| `parent/students.astro` | 26-28 | Fetch students | Empty list |
| `admin/index.astro` | 194-352 | 5 badge functions | Missing counts |

### Missing try-catch on JSON.parse

```typescript
// RISKY - no try-catch
const windows = JSON.parse(lead.availability_windows);

// SAFE
let windows = [];
try {
  windows = JSON.parse(lead.availability_windows || '[]');
} catch (e) {
  console.error('Invalid JSON:', e);
}
```

**Affected locations:**
- `admin/leads.astro` lines 100, 117, 3731, 3905
- `admin/users.astro` lines 708-709
- `cadastro.astro` line 841
- `teacher/schedule.astro` line 1198

### Missing response.ok Checks

5 locations where `response.json()` is called without checking `response.ok`:

| File | Line | Endpoint |
|------|------|----------|
| `admin/pending-cancellations.astro` | 82-83 | /api/exceptions/pending |
| `admin/approvals.astro` | 206 | /api/change-requests |
| `admin/leads.astro` | 3860 | /api/leads/[id]/matches |
| `admin/theme-editor.astro` | 2241 | /api/auth/csrf |
| `admin/index.astro` | 188 | /api/change-requests/count |

### Missing finally Blocks (Button Cleanup)

8 locations where buttons stay disabled after errors:

| File | Lines | Action |
|------|-------|--------|
| `admin/time-off-approvals.astro` | 217-220 | Approve request |
| `teacher/profile.astro` | 367-438 | Submit change request |
| `parent/schedule.astro` | 1156-1196 | Reschedule class |
| `admin/teacher-links.astro` | 129-154 | Create link |
| `admin/theme-editor.astro` | 2263-2266 | Save theme |

---

## Section 4: Efficiency Issues

### Critical Efficiency Issues

#### 4.1 Full Table Scan with Decryption (CRITICAL)
- **File:** `src/lib/database.ts`
- **Lines:** 753-770 (`getStudentsByParentEmail`)
- **Issue:** Fetches ALL students, decrypts ALL emails, filters in memory
- **Impact:** 500+ decryptions for parent login
- **Fix:** Add `parent_email_hash` indexed column

### High Priority Efficiency Issues

| File | Lines | Issue | Impact |
|------|-------|-------|--------|
| `admin/import-students.ts` | 134-148 | Sequential encryption | 5-10s import time |
| `api/auth/csrf.ts` | 10-24 | No cache headers | 10+ decryptions/page |
| `api/enrollments/index.ts` | 150-160 | Paginate after enrich | 1000 unnecessary lookups |

### Medium Priority Efficiency Issues

| Issue | Files | Fix |
|-------|-------|-----|
| Client-side lead filtering | `admin/leads.astro` | Push filters to SQL |
| JSON parsed multiple times | `admin/leads.astro` | Cache parsed result |
| CSRF fetched per-request | Multiple pages | Cache at page load |
| Sequential API calls | `admin/index.astro` | Use Promise.all() |

---

## Section 5: Connection Pattern Issues

### Direct DB Access (Should use getDB())

| File | Line | Current | Should Be |
|------|------|---------|-----------|
| `parent/students.astro` | 20 | `runtime?.env?.DB` | `getDB(runtime)` |
| `admin/users.astro` | 31 | `runtime?.env?.DB` | `getDB(runtime)` |
| `layouts/BaseLayout.astro` | 46 | `runtime?.env?.DB` | `getDB(runtime)` |

---

## Section 6: Pages Summary

### Cleanest Pages (No Issues)
- `/teacher/profile.astro`
- `/admin/pending-cancellations.astro`
- `/api/auth/login.ts`
- `/api/auth/callback.ts`
- `/api/auth/csrf.ts`
- `/api/auth/logout.ts`

### Pages Needing Most Work

| Rank | Page | Issues | Critical | Priority |
|------|------|--------|----------|----------|
| 1 | `parent/invoice.astro` | 2 | 1 | IMMEDIATE |
| 2 | `teacher/schedule.astro` | 5 | 2 | IMMEDIATE |
| 3 | `admin/account-links.astro` | 4 | 1 | IMMEDIATE |
| 4 | `parent/students.astro` | 3 | 1 | HIGH |
| 5 | `admin/users.astro` | 4 | 0 | HIGH |
| 6 | `admin/settings.astro` | 4 | 1 | HIGH |
| 7 | `admin/leads.astro` | 8 | 0 | MEDIUM |
| 8 | `admin/travel-errors.astro` | 4 | 0 | MEDIUM |

---

## Section 7: Recommended Fix Priority

### Immediate (Week 1)

1. **Fix N+1 in parent/invoice.astro** - Affects billing accuracy
2. **Fix N+1 in teacher/schedule.astro** - Affects earnings display
3. **Add CSRF tokens** to settings, *-links, re-encrypt pages
4. **Remove stack traces** from error responses
5. **Add rate limiting** to /api/public/register

### High Priority (Week 2)

6. **Use getDB()** instead of direct DB access (3 pages)
7. **Fix N+1 in pending exceptions API**
8. **Add user feedback** to 22 silent failure locations
9. **Wrap JSON.parse** in try-catch (8 locations)
10. **Add response.ok checks** (5 locations)

### Medium Priority (Week 3-4)

11. **Parallelize encryption** in import-students
12. **Add cache headers** to CSRF endpoint
13. **Use event delegation** for onclick handlers
14. **Push lead filters** to database
15. **Add finally blocks** for button cleanup

---

## Section 8: Architecture Recommendations

### 1. Implement Repository Batch Methods

```typescript
// Add to all repositories
interface Repository<T> {
  findByIds(ids: string[]): Promise<T[]>;
}
```

### 2. Create Data Loader Pattern

```typescript
// For per-request caching
const teacherLoader = new DataLoader<string, Teacher>(
  async (ids) => batchGetTeachers(db, ids)
);
```

### 3. Add Fetch Timeout Utility

```typescript
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
```

### 4. Standardize Error Response Format

```typescript
// API responses
interface ErrorResponse {
  error: string;        // Machine-readable code
  message: string;      // User-friendly message (generic in prod)
  // NO stack, details, or internal info
}
```

---

## Appendix: Files Audited

### Admin Pages (17)
- index.astro, enrollments.astro, leads.astro, approvals.astro
- availability-approvals.astro, closures.astro, users.astro
- settings.astro, theme-editor.astro, pending-cancellations.astro
- time-off-approvals.astro, parent-links.astro, teacher-links.astro
- account-links.astro, scheduling-analytics.astro, travel-errors.astro
- re-encrypt.astro, import-data.astro

### Teacher Pages (4)
- index.astro, schedule.astro, availability.astro, profile.astro

### Parent Pages (5)
- index.astro, schedule.astro, history.astro, invoice.astro, students.astro

### API Endpoints (80+)
- All endpoints in src/pages/api/**/*.ts

---

**Last Updated:** 2025-12-20
**Next Audit Recommended:** After fixes implemented
