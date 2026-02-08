# Tech Spec: Enrollment Funnel Dashboard + Family Income Tracking

**Status:** DRAFT
**Author:** Claude
**Date:** 2026-02-07
**Epic:** Funnel Analytics & Lead Qualification

---

## 1. Problem Statement

BILIN Method has no visibility into the full student lifecycle funnel. Admins manually track leads in a pipeline view but cannot answer:

- How many leads convert to enrolled students? At what rate?
- Where do leads drop off? Which stage is the bottleneck?
- How long does the average enrollment take?
- Which referral sources bring the highest-quality leads?
- Which family income brackets convert best?
- Are we retaining students? What's our churn rate?
- Are existing families referring new students?

Additionally, the cadastro form collects `family_income` but this data is **only sent to Google Sheets**, not stored in the leads database table -- making it invisible for analytics.

### Existing Pages (Overlap Analysis)

Two existing pages already cover some ground. The funnel dashboard must **complement, not duplicate** them:

| Page | What It Has | What's Missing (Funnel Fills) |
|------|------------|-------------------------------|
| **`/admin` (Painel Admin)** | Teachers/students/families count, MRR, active subscriptions, past-due count, PAUSADO overdue alert, upcoming closures, weekly classes count, recent audit log | No lead funnel, no conversion rates, no source attribution, no income data |
| **`/admin/scheduling-analytics` (Análises)** | Monthly KPIs (classes, new leads count, cancellations, pausados, avisos) with month-over-month trends. **4-tab heatmap**: free teacher slots, bookings distribution, lead demand by day/hour, lead-teacher match by neighborhood. Language filter. Business insights (language coverage, top neighborhoods, urgent actions) | No conversion funnel stages, no stage-to-stage rates, no time-in-stage, no source/income breakdowns, no aging alerts, no Easy Win vs regular comparison, no retention flow |

**Key distinction:**
- **Análises** = Scheduling/operational analytics (supply & demand of time slots, class distribution)
- **Funnel** = Sales/conversion analytics (lead journey, bottlenecks, attribution, retention)

**Overlap to avoid:**
- The **Supply vs Demand heatmap** (Section 10.1) partially overlaps with the scheduling-analytics "Leads Match!" tab. → The funnel version should focus on **aggregate gap analysis** (neighborhood-level supply gaps, not individual time slots). Link to the existing analytics page for detailed slot-level view.
- **New Leads count** exists in scheduling-analytics monthly KPIs. → The funnel dashboard shows this in the context of the **full conversion journey**, not just volume.
- **Neighborhood insights** exist in scheduling-analytics. → The funnel adds **conversion rate by neighborhood**, not just lead volume.

---

## 2. Goals

1. **Store `family_income`** on the leads table so it's queryable
2. **Display `family_income`** in the admin leads detail view
3. **Build a Funnel Dashboard** (`/admin/funnel`) with three sections:
   - KPI hero cards (top-level metrics)
   - Visual funnel with conversion rates between stages
   - Data tables with drill-down
4. **Capture additional data points** for richer analytics
5. **Provide actionable insights** for the admin, not just vanity metrics

---

## 3. Inspiration & Design Patterns

Drawing from Pipedrive, Close.com, HubSpot, and education CRMs:

### Layout (Three Zones)

```
┌──────────────────────────────────────────────────────┐
│  ZONE 1: KPI Hero Cards (4-6 cards)                  │
│  [Active Leads] [Conv. Rate] [Avg Days] [Revenue]    │
├──────────────────────────────────────────────────────┤
│  ZONE 2: Funnel Visualization                        │
│  ┌─────────────────────────────────────────────┐     │
│  │  AGUARDANDO (45) ─→ 67% ─→ EM_ANALISE (30) │     │
│  │  ─→ 80% ─→ MATCH_FOUND (24) ─→ 75% ─→     │     │
│  │  CONTRACT_SENT (18) ─→ 89% ─→ CONTRACTED   │     │
│  └─────────────────────────────────────────────┘     │
│                                                      │
│  [Period selector: 30d | 90d | 6mo | 1yr | Custom]  │
│  [Filter by: Source | Income | Language | City]      │
├──────────────────────────────────────────────────────┤
│  ZONE 3: Detail Tables + Breakdowns                  │
│  [By Source] [By Income] [By Language] [By Month]    │
│  Table with drill-down rows                          │
└──────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Pattern | Source | Why |
|---------|--------|-----|
| Hero KPI cards with trend arrows | Databox, HubSpot | Instant health check |
| Horizontal funnel with conversion % between stages | Close.com | Bottleneck identification |
| "Rotting" color coding on aging leads | Pipedrive | Prevents leads going cold |
| Click-to-filter (click a stage to filter table below) | Amplitude | Progressive disclosure |
| Period selector (30d/90d/6mo/1yr) | Universal | Trend comparison |
| Breakdown by source/income/language | HubSpot | Attribution insights |

---

## 4. Data Model Changes

### 4.1 Add `family_income` to leads table

**New migration:** `XXX_add_family_income_to_leads.sql`

```sql
ALTER TABLE leads ADD COLUMN family_income TEXT;
```

**Values (matching cadastro form):**
- `R$0 - R$5k`
- `R$5k - R$10k`
- `R$10k - R$15k`
- `R$15k - R$30k`
- `R$30k - R$50k`
- `Acima de R$50k`

### 4.2 Add `lead_source_type` for structured source tracking

**New migration:** `XXX_add_lead_source_type.sql`

```sql
ALTER TABLE leads ADD COLUMN lead_source_type TEXT DEFAULT 'WEB_FORM';
```

**Values:**
- `WEB_FORM` - Cadastro form submission
- `MANUAL` - Admin created manually
- `IMPORT` - Bulk imported (JotForm, CSV)
- `REFERRAL` - Referred by existing family (linked to student)

This differs from `referral_source` (which is "how did you hear about us?" -- Instagram, Google, etc.) by tracking the **channel** through which the lead entered the system.

### 4.3 Add `referred_by_student_id` for referral loop tracking

```sql
ALTER TABLE leads ADD COLUMN referred_by_student_id TEXT
  REFERENCES students(id) ON DELETE SET NULL;
```

This closes the bowtie loop: existing students → new leads.

### 4.4 Add `status_changed_at` for funnel velocity

```sql
ALTER TABLE leads ADD COLUMN status_changed_at INTEGER;
```

Tracks when the status last changed, enabling "time in current stage" calculations and "rotting" detection.

### 4.5b Add `http_referrer` for precise source tracking

```sql
ALTER TABLE leads ADD COLUMN http_referrer TEXT;
```

Captured from `document.referrer` on cadastro page load. Stores the exact URL that sent the user (Instagram post link, Google search result, WhatsApp shared link, etc.). More precise than the self-reported `referral_source` dropdown.

### 4.5 Add `family_income` to students table (carry forward on conversion)

```sql
ALTER TABLE students ADD COLUMN family_income TEXT;
```

When a lead converts, `family_income` should transfer to the student record for retention analytics.

---

## 5. Type & Repository Changes

### 5.1 Update `Lead` interface in `types.ts`

Add to Lead interface:
```typescript
family_income: string | null;
lead_source_type: string | null;
referred_by_student_id: string | null;
status_changed_at: number | null;
http_referrer: string | null;
```

### 5.2 Update `CreateLeadData` and `UpdateLeadData`

Add optional fields:
```typescript
family_income?: string;
lead_source_type?: string;
referred_by_student_id?: string;
http_referrer?: string;
```

### 5.3 Update lead repository

- `mapRow()`: Add new fields to mapping
- `create()`: Include `family_income`, `lead_source_type`, `status_changed_at`
- `update()`: Handle new fields
- `updateStatus()`: Auto-set `status_changed_at = Date.now()`

### 5.4 Update register API

In `/api/public/register.ts`, add `family_income` to `leadData`:
```typescript
family_income: body.family_income?.trim() || undefined,
```

### 5.5 Update conversion logic

In `lead-service.ts` `convertToEnrollment()`, carry `family_income` to student record.

---

## 6. New API Endpoints

### 6.1 `GET /api/admin/funnel/stats`

Returns aggregated funnel data for the dashboard.

**Query params:**
- `period` - `30d` | `90d` | `6mo` | `1yr` | `custom`
- `start_date` - ISO date (for custom period)
- `end_date` - ISO date (for custom period)
- `source` - Filter by `referral_source`
- `income` - Filter by `family_income`
- `language` - Filter by language
- `city` - Filter by city

**Response:**
```json
{
  "kpis": {
    "total_leads": 142,
    "total_leads_trend": 12.5,
    "active_pipeline": 38,
    "conversion_rate": 42.3,
    "conversion_rate_trend": -2.1,
    "avg_days_to_enroll": 18.5,
    "avg_days_trend": -3.2,
    "monthly_enrollments": 8,
    "enrollments_trend": 33.3,
    "total_revenue_brl": 15200,
    "revenue_trend": 8.7
  },
  "funnel_stages": [
    {
      "status": "AGUARDANDO",
      "count": 45,
      "avg_days_in_stage": 3.2,
      "conversion_to_next": 66.7,
      "drop_off_rate": 33.3
    },
    {
      "status": "EM_ANALISE",
      "count": 30,
      "avg_days_in_stage": 5.1,
      "conversion_to_next": 80.0,
      "drop_off_rate": 20.0
    },
    {
      "status": "MATCH_FOUND",
      "count": 24,
      "avg_days_in_stage": 2.8,
      "conversion_to_next": 75.0,
      "drop_off_rate": 25.0
    },
    {
      "status": "CONTRACT_SENT",
      "count": 18,
      "avg_days_in_stage": 4.5,
      "conversion_to_next": 88.9,
      "drop_off_rate": 11.1
    },
    {
      "status": "CONTRACT_SIGNED",
      "count": 16,
      "avg_days_in_stage": 1.2,
      "conversion_to_next": 100.0,
      "drop_off_rate": 0
    },
    {
      "status": "CONTRACTED",
      "count": 60,
      "is_terminal": true
    }
  ],
  "by_source": [
    { "source": "Instagram", "leads": 45, "converted": 22, "rate": 48.9 },
    { "source": "Indicação de amigo/familiar", "leads": 30, "converted": 18, "rate": 60.0 },
    { "source": "Google", "leads": 25, "converted": 8, "rate": 32.0 },
    { "source": "Facebook", "leads": 12, "converted": 4, "rate": 33.3 }
  ],
  "by_income": [
    { "income": "R$0 - R$5k", "leads": 15, "converted": 3, "rate": 20.0 },
    { "income": "R$5k - R$10k", "leads": 28, "converted": 10, "rate": 35.7 },
    { "income": "R$10k - R$15k", "leads": 35, "converted": 18, "rate": 51.4 },
    { "income": "R$15k - R$30k", "leads": 40, "converted": 22, "rate": 55.0 },
    { "income": "R$30k - R$50k", "leads": 15, "converted": 6, "rate": 40.0 },
    { "income": "Acima de R$50k", "leads": 9, "converted": 3, "rate": 33.3 }
  ],
  "by_language": [
    { "language": "Inglês", "leads": 85, "converted": 38, "rate": 44.7 },
    { "language": "Espanhol", "leads": 35, "converted": 15, "rate": 42.9 },
    { "language": "Francês", "leads": 22, "converted": 9, "rate": 40.9 }
  ],
  "by_month": [
    { "month": "2026-01", "new_leads": 42, "converted": 12, "rate": 28.6, "avg_days": 22 },
    { "month": "2025-12", "new_leads": 38, "converted": 15, "rate": 39.5, "avg_days": 17 }
  ],
  "aging_alerts": [
    { "id": "led_xxx", "student_name": "João", "status": "EM_ANALISE", "days_in_stage": 14, "severity": "red" },
    { "id": "led_yyy", "student_name": "Maria", "status": "CONTRACT_SENT", "days_in_stage": 8, "severity": "yellow" }
  ],
  "easy_win_vs_regular": {
    "easy_win": { "total": 25, "converted": 20, "rate": 80.0, "avg_days": 8.2 },
    "regular": { "total": 117, "converted": 40, "rate": 34.2, "avg_days": 22.5 }
  },
  "returning_vs_first_time": {
    "returning": { "total": 12, "converted": 10, "rate": 83.3, "avg_days": 5.1 },
    "first_time": { "total": 130, "converted": 50, "rate": 38.5, "avg_days": 20.8 }
  },
  "family_expansion": {
    "multi_student_families": 15,
    "avg_students_per_family": 2.3,
    "trend": 12.5
  },
  "response_time": {
    "avg_hours": 6.2,
    "by_bucket": [
      { "bucket": "< 1h", "leads": 30, "converted": 18, "rate": 60.0 },
      { "bucket": "1-4h", "leads": 25, "converted": 12, "rate": 48.0 },
      { "bucket": "4-24h", "leads": 45, "converted": 15, "rate": 33.3 },
      { "bucket": "> 24h", "leads": 42, "converted": 8, "rate": 19.0 }
    ]
  },
  "slot_offers": {
    "total": 50,
    "accepted": 32,
    "declined": 10,
    "expired": 8,
    "acceptance_rate": 64.0
  },
  "retention": {
    "active": 85,
    "pausado": 12,
    "cancelled_this_period": 5,
    "recovered_from_pausado": 3,
    "churn_rate": 5.6
  },
  "by_neighborhood": [
    { "neighborhood": "Campeche", "leads": 20, "converted": 12, "rate": 60.0 },
    { "neighborhood": "Coqueiros", "leads": 15, "converted": 8, "rate": 53.3 }
  ],
  "language_trend": [
    { "month": "2026-01", "Inglês": 30, "Espanhol": 12 },
    { "month": "2025-12", "Inglês": 25, "Espanhol": 8 }
  ]
}
```

### 6.2 `GET /api/admin/funnel/retention`

Future endpoint for post-enrollment retention metrics (Phase 2 of funnel work).

---

## 7. UI Specification

### 7.1 New Page: `/admin/funnel`

**File:** `src/pages/admin/funnel.astro`
**Client script:** `src/scripts/funnel-dashboard-client.ts`
**Styles:** `src/styles/funnel-dashboard.css`

### 7.2 KPI Hero Cards Section

4 cards in a responsive row:

| Card | Value | Trend | Icon |
|------|-------|-------|------|
| **Leads Ativos** | Count of non-terminal leads | % change vs prev period | Users icon |
| **Taxa de Conversão** | % leads → CONTRACTED | % change vs prev period | TrendingUp icon |
| **Tempo Médio** | Avg days from AGUARDANDO → CONTRACTED | Change in days | Clock icon |
| **Matrículas (mês)** | Enrollments this month | % change vs prev month | CheckCircle icon |

**Design:**
- Cards use `var(--color-surface)` background, `var(--shadow-card)` shadow
- Trend arrow: green up = good, red down = bad (inverted for "Tempo Médio" -- less is better)
- Large number: `var(--font-size-2xl)`, bold
- Trend: `var(--font-size-sm)` with colored arrow

### 7.3 Funnel Visualization

**Horizontal funnel** using pure CSS (no chart library needed):

```
┌─────────────────────┐   67%   ┌──────────────────┐   80%   ┌───────────────┐
│  AGUARDANDO (45)    │ ──────→ │  EM_ANÁLISE (30) │ ──────→ │ MATCH (24)    │
│  avg: 3.2 dias      │         │  avg: 5.1 dias   │         │ avg: 2.8 dias │
└─────────────────────┘         └──────────────────┘         └───────────────┘
         ↓ 33%                         ↓ 20%                        ↓ 25%
     NOT_A_MATCH                   NOT_A_MATCH                  WAITLIST
```

Each stage is a clickable bar whose width is proportional to count.

**Stage colors** (using CSS variables):
- AGUARDANDO: `var(--color-info)`
- EM_ANALISE: `var(--color-warning)`
- MATCH_FOUND / CONTRACT_SENT / CONTRACT_SIGNED: `var(--color-primary)`
- CONTRACTED: `var(--color-success)`
- NOT_A_MATCH: `var(--color-text-muted)`

**Between stages:** Conversion rate badge + arrow connector

**Below stages:** Drop-off rate in small muted text

### 7.4 Period & Filter Controls

**Period selector:** Segmented button group: `30 dias | 90 dias | 6 meses | 1 ano`

**Filter chips:**
- By source: Instagram, Google, Indicação, etc.
- By income bracket: R$0-5k, R$5k-10k, etc.
- By language: Inglês, Espanhol, etc.
- By city (if multi-city)

### 7.5 Breakdown Tables

**Tabs:** `Por Fonte | Por Renda | Por Idioma | Por Mês`

Each tab shows a table:

| Fonte | Leads | Convertidos | Taxa | Tempo Médio |
|-------|-------|-------------|------|-------------|
| Instagram | 45 | 22 | 48.9% | 15 dias |
| Indicação | 30 | 18 | 60.0% | 12 dias |
| Google | 25 | 8 | 32.0% | 22 dias |

**Income table highlights:**
- Shows which income brackets have highest conversion rate
- Helps school understand their ideal customer profile
- Color-code rows: green for above-average conversion, orange for below

### 7.6 Aging Alerts Section

Below the tables, a small section showing "leads going cold":

```
⚠️ Leads Esfriando

🔴 João Silva - EM_ANÁLISE há 14 dias (sem ação)
🟡 Maria Santos - CONTRACT_SENT há 8 dias (aguardando assinatura)
🟡 Pedro Lima - MATCH_FOUND há 7 dias (contrato não enviado)
```

Thresholds (configurable):
- Yellow: > 5 days in stage
- Red: > 10 days in stage

Each row links to the lead detail on the leads page.

### 7.7 Admin Leads Detail Update

In the existing lead detail modal (`leads-page-client.ts`), add:
- `family_income` display field (read-only badge or editable dropdown)
- Show income bracket with a color-coded badge

### 7.8 Mobile Responsiveness

- KPI cards: 2x2 grid on mobile, 4-column on desktop
- Funnel: Vertical stack on mobile (stages stacked top to bottom)
- Tables: Horizontal scroll with sticky first column
- Filters: Collapsed behind a "Filtros" button on mobile

---

## 8. Navigation

Add "Funil" item to admin sidebar, between existing navigation items.

Suggested icon: A funnel/filter icon or a bar chart icon.

---

## 9. Implementation Plan

### Phase A: Data Foundation (Backend)

1. **Migration**: Add `family_income`, `lead_source_type`, `referred_by_student_id`, `status_changed_at` to leads table
2. **Migration**: Add `family_income` to students table
3. **Types**: Update `Lead`, `CreateLeadData`, `UpdateLeadData` interfaces
4. **Repository**: Update lead repository (mapRow, create, update, updateStatus)
5. **Register API**: Include `family_income` in lead creation from cadastro form
6. **Lead service**: Auto-set `status_changed_at` on status transitions
7. **Conversion**: Carry `family_income` to student on conversion

### Phase B: Funnel API

8. **Create funnel service** (`src/lib/services/funnel-service.ts`)
   - `getFunnelStats(filters)` - aggregation queries
   - `getConversionRates(period)` - stage-to-stage rates
   - `getBreakdowns(dimension)` - by source, income, language, month
   - `getAgingAlerts(thresholds)` - stale leads
9. **Create funnel API** (`/api/admin/funnel/stats`)

### Phase C: Funnel Dashboard UI

10. **Create page** (`/admin/funnel`)
11. **Create client script** (`funnel-dashboard-client.ts`)
12. **Create styles** (`funnel-dashboard.css`)
13. **Add nav item** to admin sidebar
14. **KPI hero cards** with trend calculations
15. **Funnel visualization** (CSS-only horizontal funnel)
16. **Period selector & filters**
17. **Breakdown tables** (by source, income, language, month)
18. **Aging alerts section**

### Phase D: Lead Detail Enhancement

19. **Add family_income** to lead detail modal
20. **Add family_income** to admin lead create/edit forms
21. **Add income badge** to lead cards in pipeline view

### Phase E: EduSchedule-Specific Insights

22. **Easy Win vs Regular** comparison cards (match_score >= 85 vs regular)
23. **Returning vs First-Time** funnel split (is_returning flag)
24. **Family Expansion** metric (multi-student families from parent_links)
25. **Time-to-First-Contact** KPI (audit_log first action after lead creation)
26. **Slot Offer Acceptance Rate** (slot_offers acceptance/decline rates)
27. **Enrollment Retention Flow** (ATIVO → PAUSADO → CANCELADO from enrollment_status_history)
28. **Neighborhood Performance** table (conversion rate by bairro)
29. **Language Demand Trend** (leads by language over time)

### Phase F: Data Capture Improvements

30. **Capture `document.referrer`** on cadastro page load → store as `http_referrer` on leads
31. **Add `http_referrer`** to lead types, repository, register API
32. **Add configurable aging thresholds** to business_config (funnel_aging_yellow_days, funnel_aging_red_days)

---

## 10. EduSchedule-Specific Insights (Leveraging Existing Data)

These features leverage data the app already collects but doesn't surface yet. Organized by priority.

### 10.1 Supply vs Demand Heatmap (HIGH IMPACT)

**Data available:** `leads.availability_windows` + `teacher_availability` + `leads.neighborhood` + teacher zones

**What it shows:** A grid (days x time periods) colored by imbalance:
- Green = teacher supply matches lead demand
- Red = many leads want this slot, few teachers available
- Blue = teachers available, no leads requesting

**Broken down by neighborhood/zone** to show geographic gaps.

**Why:** A lead in WAITLIST might look like a conversion problem when it's actually a **supply problem**. This tells the school exactly where to hire the next teacher.

**API addition to `GET /api/admin/funnel/stats`:**
```json
"supply_demand": [
  {
    "day": 1,
    "period": "MANHA",
    "neighborhood": "Campeche",
    "lead_demand": 8,
    "teacher_supply": 2,
    "gap": -6,
    "severity": "critical"
  }
]
```

**SQL:**
```sql
-- Demand: count leads wanting each day/period by neighborhood
SELECT
  json_extract(value, '$.day_of_week') as day,
  CASE
    WHEN CAST(json_extract(value, '$.start_time') AS TEXT) < '12:00' THEN 'MANHA'
    WHEN CAST(json_extract(value, '$.start_time') AS TEXT) < '18:00' THEN 'TARDE'
    ELSE 'NOITE'
  END as period,
  neighborhood,
  COUNT(DISTINCT l.id) as lead_count
FROM leads l, json_each(l.availability_windows)
WHERE l.status NOT IN ('CONTRACTED', 'NOT_A_MATCH')
  AND l.availability_windows IS NOT NULL
GROUP BY day, period, neighborhood;

-- Supply: count available teacher slots by day/zone
-- (join teacher_availability with teacher zones)
```

### 10.2 Easy Win Conversion Rate vs Regular (HIGH IMPACT)

**Data available:** `leads.match_score`, `leads.match_factors` (JSON with proximity data)

**What it shows:** Two parallel conversion metrics:
- Easy Win leads (match_score >= 85 or same building): X% conversion, Y avg days
- Regular leads: X% conversion, Y avg days

**Why:** Validates the matching algorithm investment. If Easy Wins convert at 80% vs 30% for regular leads, it quantifies the ROI of proximity-based matching and justifies prioritizing same-building leads.

**UI:** Side-by-side comparison cards in the funnel dashboard.

**SQL:**
```sql
SELECT
  CASE WHEN match_score >= 85 THEN 'easy_win' ELSE 'regular' END as lead_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) / COUNT(*), 1) as rate,
  AVG(CASE WHEN converted_at IS NOT NULL THEN (converted_at - created_at) / 86400.0 END) as avg_days
FROM leads
WHERE created_at >= ? AND created_at <= ?
GROUP BY lead_type;
```

### 10.3 Returning vs First-Time Funnel Split (HIGH IMPACT)

**Data available:** `leads.is_returning`, `leads.source_student_id`

**What it shows:** Separate funnel metrics for:
- First-time leads: Volume, conversion rate, avg days
- Returning students: Volume, conversion rate, avg days

**Why:** Returning students almost certainly convert faster and at higher rates. Quantifying this could justify a "win-back" campaign for churned students. Different cohorts need different handling.

**SQL:**
```sql
SELECT
  CASE WHEN is_returning = 1 THEN 'returning' ELSE 'first_time' END as cohort,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) / COUNT(*), 1) as rate,
  AVG(CASE WHEN converted_at IS NOT NULL THEN (converted_at - created_at) / 86400.0 END) as avg_days
FROM leads
WHERE created_at >= ? AND created_at <= ?
GROUP BY cohort;
```

### 10.4 Family Expansion Metric (HIGH IMPACT)

**Data available:** `leads.sibling_student_id`, `parent_links` table

**What it shows:**
- KPI card: "Famílias com 2+ alunos" (count + trend)
- Growth rate of multi-student families
- Average revenue per family vs per student

**Why:** Families adding siblings is the strongest satisfaction signal. A growing number means word-of-mouth is working. A shrinking number may indicate quality issues.

**SQL:**
```sql
-- Families with multiple students
SELECT
  COUNT(*) as multi_student_families,
  AVG(student_count) as avg_students_per_family
FROM (
  SELECT parent_user_id, COUNT(DISTINCT student_id) as student_count
  FROM parent_links
  GROUP BY parent_user_id
  HAVING student_count >= 2
);
```

### 10.5 Time-to-First-Contact (HIGH IMPACT)

**Data available:** `leads.created_at` + `audit_log` (tracks all admin actions per lead)

**What it shows:**
- KPI card: "Tempo Médio de Resposta" (avg hours from lead creation to first admin action)
- Trend over time
- Correlation with conversion: leads contacted within 1h vs 24h vs 48h

**Why:** Industry data consistently shows leads contacted within 1 hour convert 7x better than those contacted after 24 hours. This single metric can change admin behavior.

**SQL:**
```sql
SELECT
  l.id,
  l.student_name,
  MIN(a.created_at) as first_action_at,
  ROUND((MIN(a.created_at) - l.created_at) / 3600.0, 1) as hours_to_first_contact
FROM leads l
LEFT JOIN audit_log a ON a.resource_id = l.id
  AND a.resource_type = 'lead'
  AND a.action NOT IN ('public.register')
WHERE l.created_at >= ? AND l.created_at <= ?
GROUP BY l.id;

-- Aggregate: avg hours and conversion rate by response speed bucket
SELECT
  CASE
    WHEN hours <= 1 THEN '< 1h'
    WHEN hours <= 4 THEN '1-4h'
    WHEN hours <= 24 THEN '4-24h'
    ELSE '> 24h'
  END as response_bucket,
  COUNT(*) as leads,
  SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) / COUNT(*), 1) as rate
FROM (
  SELECT l.id, l.status,
    ROUND((MIN(a.created_at) - l.created_at) / 3600.0, 1) as hours
  FROM leads l
  LEFT JOIN audit_log a ON a.resource_id = l.id
    AND a.resource_type = 'lead'
    AND a.action NOT IN ('public.register')
  WHERE l.created_at >= ? AND l.created_at <= ?
  GROUP BY l.id
)
GROUP BY response_bucket;
```

### 10.6 Capture `document.referrer` on Cadastro (MEDIUM IMPACT)

**Data needed:** New field `http_referrer` on leads table.

**Change:** In `cadastro.astro` script, capture `document.referrer` on page load and send it with form submission. Much more precise than the self-reported "Como nos conheceu?" dropdown -- it stores the exact URL (Instagram post, Google search, WhatsApp shared link, etc.).

**Migration:**
```sql
ALTER TABLE leads ADD COLUMN http_referrer TEXT;
```

**Cadastro change:**
```typescript
// Add to form submission body:
http_referrer: document.referrer || undefined,
```

### 10.7 Slot Offer Acceptance Rate (MEDIUM IMPACT)

**Data available:** `slot_offers` table (status: PENDING, ACCEPTED, DECLINED, EXPIRED, CANCELLED)

**What it shows:**
- Offer sent → accepted rate (overall and per teacher/neighborhood)
- Avg time from offer sent to response
- Declined reasons (if tracked)

**Why:** Low acceptance rates mean the matching algorithm is suggesting poor fits. High rates validate the approach. Can be broken down by teacher to identify which teachers' offers get declined most.

**SQL:**
```sql
SELECT
  COUNT(*) as total_offers,
  SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted,
  SUM(CASE WHEN status = 'DECLINED' THEN 1 ELSE 0 END) as declined,
  SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
  ROUND(100.0 * SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as acceptance_rate
FROM slot_offers
WHERE created_at >= ? AND created_at <= ?;
```

### 10.8 Enrollment Retention Flow (MEDIUM IMPACT)

**Data available:** `enrollment_status_history`, `enrollments.status` (ATIVO, PAUSADO, CANCELADO)

**What it shows:** The bowtie right side:
- ATIVO → PAUSADO rate (pausing)
- PAUSADO → ATIVO rate (recovery)
- ATIVO/PAUSADO → CANCELADO rate (churn)
- Average student lifetime (enrollment start to cancellation)

**Why:** This is the retention half of the bowtie. The leads funnel shows acquisition; this shows whether you're keeping students. A rising PAUSADO rate is an early warning.

**SQL:**
```sql
-- Current status distribution
SELECT status, COUNT(*) as count
FROM enrollments
GROUP BY status;

-- Monthly churn: enrollments that went CANCELADO each month
SELECT
  strftime('%Y-%m', datetime(h.changed_at, 'unixepoch')) as month,
  COUNT(*) as cancellations
FROM enrollment_status_history h
WHERE h.new_status = 'CANCELADO'
GROUP BY month
ORDER BY month DESC;

-- Recovery: PAUSADO → ATIVO transitions
SELECT COUNT(*) as recoveries
FROM enrollment_status_history
WHERE old_status = 'PAUSADO' AND new_status = 'ATIVO'
  AND changed_at >= ? AND changed_at <= ?;
```

### 10.9 Neighborhood Performance (NICE-TO-HAVE)

**Data available:** `leads.neighborhood`, `leads.status`

**What it shows:** Two tables:
- "Top 5 bairros por taxa de conversão" (where leads convert best)
- "Top 5 bairros por volume" (where most leads come from)

**Why:** Guides where to focus Instagram ads and flyer distribution. If Campeche has high volume but low conversion (no teachers there), that's a hiring signal. If Coqueiros has low volume but high conversion, that's an ad targeting opportunity.

**SQL:**
```sql
SELECT
  neighborhood,
  COUNT(*) as total_leads,
  SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) / COUNT(*), 1) as rate
FROM leads
WHERE neighborhood IS NOT NULL
  AND created_at >= ? AND created_at <= ?
GROUP BY neighborhood
HAVING total_leads >= 3
ORDER BY rate DESC
LIMIT 10;
```

### 10.10 Language Demand Trend (NICE-TO-HAVE)

**Data available:** `leads.language`, `leads.created_at`

**What it shows:** Line chart of new leads per language over time (monthly).

**Why:** If Spanish inquiries are spiking, you need more Spanish teachers before they hit the WAITLIST wall. Trend data reveals demand shifts before they become bottlenecks.

**SQL:**
```sql
SELECT
  strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
  language,
  COUNT(*) as new_leads
FROM leads
WHERE language IS NOT NULL
  AND created_at >= ?
GROUP BY month, language
ORDER BY month DESC, new_leads DESC;
```

### 10.11 Future Data Capture Opportunities

| Data Point | Where to Capture | Value |
|-----------|-----------------|-------|
| **UTM parameters** | Add `utm_source`, `utm_medium`, `utm_campaign` to cadastro URL and leads table | Tie leads to specific ad campaigns |
| **Device/platform** | Capture user agent on registration | Mobile vs desktop conversion rates |
| **Trial class attendance** | Future: add trial/demo class tracking | Key conversion predictor |
| **NPS / satisfaction** | Future: post-class survey | Predict churn, drive referrals |
| **Parent portal engagement** | Track portal logins, schedule views | Early churn warning |

---

## 11. SQL Queries (Key Aggregations)

### Funnel Stage Counts
```sql
SELECT status, COUNT(*) as count
FROM leads
WHERE created_at >= ? AND created_at <= ?
GROUP BY status;
```

### Conversion Rate (Stage to Stage)
```sql
-- Leads that reached each stage in the period
SELECT
  SUM(CASE WHEN status IN ('AGUARDANDO','EM_ANALISE','MATCH_FOUND','CONTRACT_SENT','CONTRACT_SIGNED','CONTRACTED') THEN 1 ELSE 0 END) as reached_aguardando,
  SUM(CASE WHEN status IN ('EM_ANALISE','MATCH_FOUND','CONTRACT_SENT','CONTRACT_SIGNED','CONTRACTED') THEN 1 ELSE 0 END) as reached_em_analise,
  SUM(CASE WHEN status IN ('MATCH_FOUND','CONTRACT_SENT','CONTRACT_SIGNED','CONTRACTED') THEN 1 ELSE 0 END) as reached_match,
  SUM(CASE WHEN status IN ('CONTRACT_SENT','CONTRACT_SIGNED','CONTRACTED') THEN 1 ELSE 0 END) as reached_contract_sent,
  SUM(CASE WHEN status IN ('CONTRACT_SIGNED','CONTRACTED') THEN 1 ELSE 0 END) as reached_signed,
  SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as reached_contracted
FROM leads
WHERE created_at >= ? AND created_at <= ?;
```

### Average Days to Convert
```sql
SELECT AVG((converted_at - created_at) / 86400.0) as avg_days
FROM leads
WHERE status = 'CONTRACTED'
  AND converted_at IS NOT NULL
  AND created_at >= ? AND created_at <= ?;
```

### Breakdown by Source
```sql
SELECT
  referral_source,
  COUNT(*) as total_leads,
  SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) / COUNT(*), 1) as conversion_rate,
  AVG(CASE WHEN converted_at IS NOT NULL THEN (converted_at - created_at) / 86400.0 END) as avg_days
FROM leads
WHERE created_at >= ? AND created_at <= ?
GROUP BY referral_source
ORDER BY total_leads DESC;
```

### Breakdown by Income
```sql
SELECT
  family_income,
  COUNT(*) as total_leads,
  SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN status = 'CONTRACTED' THEN 1 ELSE 0 END) / COUNT(*), 1) as conversion_rate
FROM leads
WHERE created_at >= ? AND created_at <= ?
  AND family_income IS NOT NULL
GROUP BY family_income
ORDER BY
  CASE family_income
    WHEN 'R$0 - R$5k' THEN 1
    WHEN 'R$5k - R$10k' THEN 2
    WHEN 'R$10k - R$15k' THEN 3
    WHEN 'R$15k - R$30k' THEN 4
    WHEN 'R$30k - R$50k' THEN 5
    WHEN 'Acima de R$50k' THEN 6
  END;
```

### Aging Alerts
```sql
SELECT id, student_name, status, status_changed_at,
  CAST((strftime('%s','now') - status_changed_at) / 86400 AS INTEGER) as days_in_stage
FROM leads
WHERE status NOT IN ('CONTRACTED', 'NOT_A_MATCH')
  AND status_changed_at IS NOT NULL
  AND (strftime('%s','now') - status_changed_at) > (5 * 86400)
ORDER BY days_in_stage DESC
LIMIT 20;
```

---

## 12. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `database/migrations/XXX_add_funnel_fields.sql` | DB migration |
| `src/lib/services/funnel-service.ts` | Funnel aggregation queries |
| `src/pages/api/admin/funnel/stats.ts` | Funnel stats API endpoint |
| `src/pages/admin/funnel.astro` | Dashboard page |
| `src/scripts/funnel-dashboard-client.ts` | Client-side interactivity |
| `src/styles/funnel-dashboard.css` | Dashboard styles |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/repositories/types.ts` | Add `family_income`, `lead_source_type`, `referred_by_student_id`, `status_changed_at`, `http_referrer` to Lead types |
| `src/lib/repositories/d1/lead.ts` | Update mapRow, create, update, updateStatus |
| `src/lib/validation/lead.ts` | Add `family_income` to schemas |
| `src/lib/validation/index.ts` | Add `family_income` to PublicRegistrationSchema (may already be there) |
| `src/pages/api/public/register.ts` | Include `family_income` and `http_referrer` in leadData |
| `src/lib/services/lead-service.ts` | Auto-set `status_changed_at`, carry income on conversion |
| `src/scripts/leads-page-client.ts` | Show `family_income` in lead detail modal |
| `src/pages/admin/leads.astro` | Pass income data for display |
| `src/pages/cadastro.astro` | Capture `document.referrer` and send with form |
| `src/lib/validation/index.ts` | Add `http_referrer` to PublicRegistrationSchema |
| Admin layout/nav component | Add "Funil" nav item |

---

## 13. Decisions (Resolved)

1. **Aging thresholds → Configurable** via `business_config` table (keys: `funnel_aging_yellow_days`, `funnel_aging_red_days`). Defaults: 5 and 10 days.
2. **Historical backfill → No.** `family_income` was just added to the cadastro form this week. No meaningful data to backfill.
3. **Revenue → Real collected data only.** Use actual `payment_transactions` data, not estimates.
4. **Access control → Admin only** for now. Standard admin auth check.
5. **Export → Not needed** for initial release.

---

## 14. Success Criteria

### Data Foundation
- [ ] `family_income` stored in leads table from cadastro form
- [ ] `family_income` visible in admin lead detail modal
- [ ] `http_referrer` captured from cadastro page and stored on leads
- [ ] `status_changed_at` auto-updated on status transitions
- [ ] `family_income` carried to student record on conversion

### Core Funnel Dashboard
- [ ] Funnel dashboard accessible at `/admin/funnel`
- [ ] KPI cards show real-time metrics with trend indicators
- [ ] Funnel visualization shows conversion rates between stages
- [ ] Breakdowns by source, income, language, month work correctly
- [ ] Aging alerts surface stale leads with configurable thresholds
- [ ] Period selector (30d/90d/6mo/1yr) filters all data

### EduSchedule-Specific Insights
- [ ] Easy Win vs Regular conversion comparison displayed
- [ ] Returning vs First-Time funnel split displayed
- [ ] Family Expansion metric (multi-student families) displayed
- [ ] Time-to-First-Contact KPI with response bucket breakdown
- [ ] Slot Offer acceptance rate displayed
- [ ] Enrollment retention flow (ATIVO → PAUSADO → CANCELADO) displayed
- [ ] Neighborhood performance table (conversion rate by bairro)
- [ ] Language demand trend over time

### Quality
- [ ] No overlap with existing `/admin/scheduling-analytics` heatmaps
- [ ] All styles use CSS variables (no hardcoded values)
- [ ] Mobile responsive
- [ ] Admin-only access (standard auth check)
