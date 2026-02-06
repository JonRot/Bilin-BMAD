# Tech Spec: Contract Lifecycle & Renewal System

**Status:** Draft
**Date:** 2026-02-05
**Scope:** Contract expiry → AVISO automation, academic calendar settings, "Reservando Vaga" badge, contract type changes

---

## 1. Problem Statement

Students sign a matrícula (once/year) and then a service contract (Mensal/Semestral/Anual). Currently, when a service contract expires, nothing happens automatically. We need:

1. **Automatic AVISO** when a contract expires without renewal
2. **Configurable academic calendar** (rematrícula window, class start/end dates)
3. **Notification chain** before contract expiry (30/14/7/0 days)
4. **"Reservando Vaga" badge** on enrollment cards for 1 month post-matrícula
5. **Contract type changes** (e.g., Mensal → Anual) via new contract + signature

---

## 2. Business Rules

### 2.1 Contract Expiry Flow

```
Contract signed → Active period → Notifications begin
                                    ├── 30 days before: Admin + Parent notification
                                    ├── 14 days before: Reminder notification
                                    ├── 7 days before: "Last week" warning to parent
                                    │   (Parent should confirm: continue or stop)
                                    └── Day 0 (expiry): No renewal?
                                         └── All linked enrollments → AVISO
                                              └── 14 days AVISO (existing logic)
                                                   └── INATIVO
```

### 2.2 Key Rules

| Rule | Detail |
|------|--------|
| **No auto-renew** | Parent must actively decide to continue. Renewal = new contract + Autentique signature |
| **AVISO obligation** | If parent decides to stop, they owe 2 weeks of classes during AVISO period (charged normally) |
| **All enrollments affected** | When contract expires, ALL enrollments for that student become AVISO (not just one) |
| **Mensal = trial** | Monthly contracts are basically trial periods. Most students will be Semestral or Anual |
| **Contract type change** | Allowed at any time — new contract, new signature, new dates |
| **Payments** | Based on actual class events (completions). Existing cancellation/pause rules apply |

### 2.3 Academic Calendar

| Setting | Description | Typical Value |
|---------|-------------|---------------|
| `classes_end_date` | Last day of classes | Mid-December |
| `rematricula_start_date` | Rematrícula window opens | Mid-January |
| `rematricula_end_date` | Rematrícula window closes | Mid-February |
| `classes_start_date` | First day of classes | Mid-February |

These are set per year in admin settings. Between `classes_end_date` and `classes_start_date` is the vacation period (handled by existing system closures).

### 2.4 "Reservando Vaga" Badge

- Shown on enrollment cards (ClassBlock) in admin enrollments page (month/week/day views)
- Appears for 1 month after matrícula/rematrícula signing
- Indicates student has committed for the year but classes may not have started yet
- Different from contract status — this is about the matrícula commitment

---

## 3. Data Model Changes

### 3.1 New Business Config Settings (9 new settings)

Category: `academic_calendar` (new category)

| Key | Type | Default | Label (PT) | Description |
|-----|------|---------|------------|-------------|
| `academic_calendar.classes_start_date` | string | `2026-02-17` | Data início das aulas | First day of classes (YYYY-MM-DD) |
| `academic_calendar.classes_end_date` | string | `2026-12-13` | Data fim das aulas | Last day of classes (YYYY-MM-DD) |
| `academic_calendar.rematricula_start_date` | string | `2027-01-13` | Início rematrícula | Rematrícula window opens (YYYY-MM-DD) |
| `academic_calendar.rematricula_end_date` | string | `2027-02-14` | Fim rematrícula | Rematrícula window closes (YYYY-MM-DD) |
| `academic_calendar.academic_year` | number | `2026` | Ano letivo | Current academic year |

Category: `contract_lifecycle` (new category)

| Key | Type | Default | Label (PT) | Description |
|-----|------|---------|------------|-------------|
| `contract_lifecycle.expiry_warning_days` | number | `30` | Dias aviso de vencimento | Notification sent N days before contract expiry |
| `contract_lifecycle.expiry_reminder_days` | number | `14` | Dias lembrete de vencimento | Reminder notification N days before |
| `contract_lifecycle.expiry_urgent_days` | number | `7` | Dias aviso urgente | Urgent warning N days before |
| `contract_lifecycle.reserva_badge_days` | number | `30` | Dias badge reserva | How long "Reservando Vaga" badge shows after matrícula |

### 3.2 Migration: `102_contract_lifecycle_settings.sql`

```sql
-- Add academic calendar category
INSERT INTO business_config (config_key, config_value, value_type, category, label_pt, description_pt, display_order)
VALUES
  ('academic_calendar.classes_start_date', '2026-02-17', 'string', 'academic_calendar', 'Data início das aulas', 'Primeiro dia de aulas do ano letivo (YYYY-MM-DD)', 1),
  ('academic_calendar.classes_end_date', '2026-12-13', 'string', 'academic_calendar', 'Data fim das aulas', 'Último dia de aulas do ano letivo (YYYY-MM-DD)', 2),
  ('academic_calendar.rematricula_start_date', '2027-01-13', 'string', 'academic_calendar', 'Início rematrícula', 'Data de abertura do período de rematrícula (YYYY-MM-DD)', 3),
  ('academic_calendar.rematricula_end_date', '2027-02-14', 'string', 'academic_calendar', 'Fim rematrícula', 'Data de encerramento do período de rematrícula (YYYY-MM-DD)', 4),
  ('academic_calendar.academic_year', '2026', 'number', 'academic_calendar', 'Ano letivo', 'Ano letivo atual', 5);

-- Add contract lifecycle category
INSERT INTO business_config (config_key, config_value, value_type, category, label_pt, description_pt, min_value, max_value, unit, display_order)
VALUES
  ('contract_lifecycle.expiry_warning_days', '30', 'number', 'contract_lifecycle', 'Dias aviso de vencimento', 'Notificação enviada N dias antes do vencimento do contrato', 7, 90, 'dias', 1),
  ('contract_lifecycle.expiry_reminder_days', '14', 'number', 'contract_lifecycle', 'Dias lembrete de vencimento', 'Lembrete enviado N dias antes do vencimento', 3, 30, 'dias', 2),
  ('contract_lifecycle.expiry_urgent_days', '7', 'number', 'contract_lifecycle', 'Dias aviso urgente', 'Aviso urgente ao responsável N dias antes do vencimento', 1, 14, 'dias', 3),
  ('contract_lifecycle.reserva_badge_days', '30', 'number', 'contract_lifecycle', 'Dias badge reserva', 'Quantos dias o badge "Reservando Vaga" aparece após matrícula', 7, 90, 'dias', 4);
```

### 3.3 Runtime Business Config Extension

Add to `BusinessConfig` interface:

```typescript
// --- academic_calendar (5 settings) ---
classesStartDate: string;
classesEndDate: string;
rematriculaStartDate: string;
rematriculaEndDate: string;
academicYear: number;

// --- contract_lifecycle (4 settings) ---
expiryWarningDays: number;
expiryReminderDays: number;
expiryUrgentDays: number;
reservaBadgeDays: number;
```

---

## 4. Backend Implementation

### 4.1 Contract Expiry Automator Service

**New file:** `src/lib/services/contract-expiry-automator.ts`

Uses lazy evaluation pattern (same as `PausadoAutomatorService` and `AvisoAutomatorService`).

```typescript
class ContractExpiryAutomatorService {
  /**
   * Check all students with active service contracts.
   * For any contract that has expired (contract_end_date < today):
   *   1. Find all ATIVO enrollments for that student
   *   2. Set them to AVISO (aviso_started_at = now)
   *   3. The existing AvisoAutomator handles AVISO → INATIVO after 14 days
   */
  async processExpiredContracts(): Promise<ExpiredContractResult[]>;

  /**
   * Called on each request (lazy evaluation) — checks if current student
   * has an expired contract and needs AVISO transition.
   */
  async checkStudentContractExpiry(studentId: string): Promise<void>;
}
```

**Trigger points (lazy evaluation):**
- When loading enrollment data in `GET /api/enrollments`
- When opening student modal (contract summary fetch)
- When viewing schedule pages

### 4.2 Contract Expiry Notification Service

**New methods in `NotificationService`:**

```typescript
// New notification types
CONTRACT_EXPIRING_30 = 'CONTRACT_EXPIRING_30'
CONTRACT_EXPIRING_14 = 'CONTRACT_EXPIRING_14'
CONTRACT_EXPIRING_7 = 'CONTRACT_EXPIRING_7'
CONTRACT_EXPIRED = 'CONTRACT_EXPIRED'

// Methods
notifyContractExpiring(studentId, daysRemaining, parentUserId, adminUserIds): Promise<void>
notifyContractExpired(studentId, parentUserId, adminUserIds): Promise<void>
```

**Notification trigger:** Same lazy evaluation — when loading contract summary, check if notifications should be sent. Use a `contract_notification_sent_at` column or similar to avoid duplicate sends.

### 4.3 Contract Summary API Enhancement

Update `getContractSummary()` to include:

```typescript
interface ContractSummary {
  // ... existing fields ...

  // NEW
  isInRematriculaWindow: boolean;  // Are we in the rematrícula period?
  reservaVagaBadge: boolean;       // Should "Reservando Vaga" badge show?
  reservaVagaUntil: string | null; // Badge expiry date (YYYY-MM-DD)
  contractExpiringIn: number | null; // Days until contract expires (null if no active contract)
}
```

### 4.4 Settings Page Updates

Add two new sections to admin settings:
- **Calendário Acadêmico** — Academic year, class dates, rematrícula window
- **Ciclo de Contratos** — Expiry warning thresholds, badge duration

---

## 5. Frontend Implementation

### 5.1 "Reservando Vaga" Badge on ClassBlock

**File:** `src/components/grid/ClassBlock.astro`

Add badge after the quinzenal badge (line ~358):

```html
{showReservaBadge && (
  <span class="class-block__reserva-badge" title="Reservando Vaga">
    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  </span>
)}
```

**Data source:** The ClassBlock needs to know if the student has a recent matrícula. Options:
- A. Denormalize `matricula_signed_at` onto enrollments (simplest, avoids extra queries)
- B. Batch-fetch from contract summary during schedule generation

**Recommendation:** Option A — add `matricula_signed_at INTEGER` to enrollments table. Backfill from contracts. Badge shows when `matricula_signed_at` is within `reservaBadgeDays` of today.

### 5.2 Contract Expiry Warning in Student Modal

The contract info-card (already implemented in today's work) shows days remaining with color-coded urgency. This naturally serves as the expiry warning. No additional modal UI needed.

### 5.3 Settings Page — New Sections

Add "Calendário Acadêmico" and "Ciclo de Contratos" sections to the settings page with appropriate form fields for the 9 new config values.

---

## 6. Implementation Order

### Phase A: Foundation (Settings + Data Model)
1. Migration 102: Add 9 business config settings
2. Update `BusinessConfig` interface + `loadBusinessConfig()` + category metadata
3. Settings page UI for academic calendar + contract lifecycle sections
4. **Verify:** Settings page shows new sections, values save correctly

### Phase B: Contract Expiry → AVISO
5. Create `ContractExpiryAutomatorService`
6. Integrate lazy evaluation into enrollment loading paths
7. Test: expired contract → all student enrollments go AVISO → INATIVO after 14 days
8. **Verify:** Alice with expired contract → her enrollments show AVISO

### Phase C: Notifications
9. Add notification types for contract expiry
10. Integrate notification checks into contract summary loading
11. Add deduplication logic (don't send same notification twice)
12. **Verify:** Notifications appear at 30/14/7/0 day thresholds

### Phase D: Reservando Vaga Badge
13. Migration: Add `matricula_signed_at` to enrollments + backfill
14. Update ClassBlock component with badge
15. **Verify:** Recently matriculated students show star badge on enrollment cards

### Phase E: Contract Type Changes
16. Add UI to change contract type (new contract flow with pre-filled data)
17. **Verify:** Can upgrade Mensal → Anual, creates new contract for signing

---

## 7. Files Affected

| File | Change |
|------|--------|
| `database/migrations/102_contract_lifecycle_settings.sql` | New — settings + columns |
| `src/lib/runtime-business-config.ts` | Add 9 new config properties |
| `src/lib/services/business-config-service.ts` | Add 2 new categories |
| `src/lib/services/contract-expiry-automator.ts` | New — expiry → AVISO logic |
| `src/lib/services/notification-service.ts` | 4 new notification types |
| `src/lib/services/contract-service.ts` | Enhanced `getContractSummary()` |
| `src/pages/admin/settings.astro` | New settings sections UI |
| `src/scripts/settings-client.ts` | Settings form handling |
| `src/components/grid/ClassBlock.astro` | "Reservando Vaga" badge |
| `src/styles/grid.css` | Badge styles |
| `src/pages/api/enrollments/index.ts` | Contract expiry check integration |
| `src/constants/enrollment-statuses.ts` | New notification type constants |
| `src/lib/repositories/types.ts` | `matricula_signed_at` on Enrollment |
| `src/lib/repositories/d1/enrollment.ts` | Mapper + INSERT for new column |
| `docs/reference/data-models.md` | Document new columns/settings |
| `eduschedule-app/project-context.md` | Session changelog |

---

## 8. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Student has multiple enrollments (Mon + Wed) | All go AVISO together when contract expires |
| Student is already PAUSADO when contract expires | Contract expiry takes priority — transition to AVISO |
| Contract expires during system closure (vacation) | AVISO starts on expiry date regardless; AVISO timer still ticks during closure |
| Student renews contract while in AVISO | Enrollments return to ATIVO, `aviso_started_at` cleared |
| Mid-contract type change | Old contract stays as-is (historical record), new contract starts immediately |
| No service contract exists (only matrícula) | No expiry logic applies — student stays ATIVO |
| Rematrícula window passes without renewal | Admin notification, but no auto-action (handled by contract expiry flow) |
| Multiple service contracts for same student | Only the latest active one matters for expiry |

---

## 9. Not In Scope

- **Auto-renew toggle** — Decided against. Parent must actively renew
- **PIX payment integration** — Deferred per Phase 2 decisions
- **Parent-facing renewal flow** — Future: parent portal self-service renewal
- **WhatsApp notifications** — Deferred per Phase 2 decisions
