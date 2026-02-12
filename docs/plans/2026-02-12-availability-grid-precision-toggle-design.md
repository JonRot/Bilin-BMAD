# Design: 15-Minute Precision Toggle for Teacher Availability Grid

**Date:** 2026-02-12
**Status:** Approved
**Scope:** `HourlyAvailabilityGrid.astro` component (single file change)

---

## Problem

The teacher availability grid currently only supports 1-hour granularity (8h-9h, 9h-10h, etc.). Teachers need the ability to define availability at 15-minute precision (8:00-8:15, 8:15-8:30, etc.) for more accurate scheduling.

## Solution

Add a toggle button to the `HourlyAvailabilityGrid` component that switches between the current hourly view (12 rows) and a 15-minute precision view (48 rows). Both grids are pre-rendered in the DOM; toggling shows/hides and syncs state between them.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where | Both teacher modal + availability page | Single component used in both places |
| Default view | Smart auto-detect from data | If teacher has non-hour-boundary times, default to 15-min; otherwise hourly |
| Mode switch behavior | Auto-expand/collapse | Hourly→15min: expand each hour to 4 sub-slots. 15min→hourly: hour is "on" only if all 4 sub-slots are on |
| Label format (15-min) | Short start time only | `8:00`, `8:15`, `8:30`, `8:45` |
| Implementation approach | Dynamic DOM toggle (Approach A) | Pre-render both grids, show/hide. Simple, no re-rendering needed |

## Component Design

### New Prop

- `allowPrecisionToggle?: boolean` (default `true`) — lets consumers disable the toggle

### UI Layout

```
[Manhã] [Almoço] [Tarde] [Todos] [Limpar]

[ 1 hora | 15 min ]    ← pill-style segmented toggle

┌─────────────────────────────┐
│  Hourly OR 15-min table     │
│  (only one visible)         │
└─────────────────────────────┘

Summary: X horários selecionados
```

### Toggle Button

Pill-style segmented control with two options: "1 hora" (default) and "15 min". Uses CSS variables for styling, consistent with existing quick-fill buttons.

### Smart Default Detection

```
hasPrecisionData = initialValue.some(w =>
  w.start_time minutes !== "00" OR w.end_time minutes !== "00"
)

if hasPrecisionData → show 15-min grid
else → show hourly grid
```

| Scenario | Default view |
|----------|-------------|
| No availability data | Hourly |
| Only hour-aligned times (09:00, 10:00...) | Hourly |
| Any non-hour time (09:15, 10:30...) | 15-min |

### 15-Minute Grid Structure

- 48 rows: 4 sub-slots per hour × 12 hours (8:00-19:45)
- 5 columns: Mon-Fri
- Time labels: `8:00`, `8:15`, `8:30`, `8:45`, `9:00`...
- Visual hour separators: thicker top border every 4th row

### State Sync on Toggle

**Hourly → 15-min:**
For each selected hourly slot (e.g., `day=1, time=09:00`), select all 4 sub-slots: `09:00`, `09:15`, `09:30`, `09:45`.

**15-min → Hourly:**
For each hour, check if ALL 4 sub-slots are selected. If yes → hour selected. If no → hour deselected. Partial selections are lost.

### Value Serialization

The existing `getWindows()` compression algorithm works unchanged — consecutive selected 15-min slots merge into windows naturally:

```
Selected: 09:00, 09:15, 09:30, 09:45, 10:00, 10:15
→ Window: { start_time: "09:00", end_time: "10:30" }
```

### Quick-Fill Buttons

Operate on whichever grid is currently visible. Same time ranges (morning, lunch, afternoon).

## Data Layer

**No changes needed.**

- `teacher_availability` table already stores `start_time`/`end_time` as `HH:MM` strings
- API endpoints already accept any valid `HH:MM` time
- Repository `replaceAllForTeacher()` works with any time precision
- Zod validation already accepts `HH:MM` format

## Files Modified

| File | Change |
|------|--------|
| `src/components/HourlyAvailabilityGrid.astro` | Add toggle, second table, sync logic, styles |

## Files NOT Modified

- `AvailabilityGrid.astro` — compact grid, different use case
- API endpoints — already support arbitrary HH:MM
- Database schema — no changes
- Repository/service layer — no changes
- Teacher availability page — consumes component, no changes needed
- Admin users page — consumes component, no changes needed
