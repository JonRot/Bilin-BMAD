# Availability Grid 15-Minute Precision Toggle - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a toggle to `HourlyAvailabilityGrid` that switches between 1-hour and 15-minute time slot granularity.

**Architecture:** Pre-render both grids (hourly + 15-min) in the DOM, show/hide with a toggle button, sync selection state between them on switch. Smart default detects existing 15-min data.

**Tech Stack:** Astro 5 component with inline `<script is:inline>` and scoped `<style>`. CSS variables from design system. No external dependencies.

**Design Doc:** `docs/plans/2026-02-12-availability-grid-precision-toggle-design.md`

---

### Task 1: Add the precision toggle prop and HTML toggle button

**Files:**
- Modify: `eduschedule-app/src/components/HourlyAvailabilityGrid.astro` (frontmatter + template)

**Step 1: Add new prop to the frontmatter interface and destructuring**

In the `Props` interface (line ~23), add:
```typescript
allowPrecisionToggle?: boolean;
```

In the destructuring (line ~33), add:
```typescript
allowPrecisionToggle = true,
```

**Step 2: Add smart default detection constant in frontmatter**

After the `HOURS` constant (line ~47), add:
```typescript
// 15-min mode: 48 sub-slots (4 per hour × 12 hours)
const QUARTER_HOURS = HOURS.flatMap(h => [0, 15, 30, 45].map(m => ({ hour: h, minute: m })));

// Auto-detect if teacher has 15-min precision data
const hasPrecisionData = initialValue.some(w => {
  const startMin = parseInt(w.start_time.split(':')[1] || '0', 10);
  const endMin = parseInt(w.end_time.split(':')[1] || '0', 10);
  return startMin !== 0 || (endMin !== 0 && w.end_time !== '20:00');
});
```

**Step 3: Add toggle button HTML**

Insert between the quick-fill buttons div (line ~61) and the grid table wrap div (line ~64), this toggle:
```astro
{allowPrecisionToggle && (
  <div class="hourly-grid__precision-toggle" data-precision-toggle>
    <button type="button" class:list={["precision-toggle-btn", { active: !hasPrecisionData }]} data-mode="hourly">
      1 hora
    </button>
    <button type="button" class:list={["precision-toggle-btn", { active: hasPrecisionData }]} data-mode="quarter">
      15 min
    </button>
  </div>
)}
```

**Step 4: Verify the component still renders without errors**

Run: `cd eduschedule-app && npm run build 2>&1 | head -30`
Expected: Build succeeds (or at minimum no Astro compilation errors for this component)

**Step 5: Commit**

```bash
git add eduschedule-app/src/components/HourlyAvailabilityGrid.astro
git commit -m "feat(availability): add precision toggle prop and button HTML"
```

---

### Task 2: Add the 15-minute grid table HTML

**Files:**
- Modify: `eduschedule-app/src/components/HourlyAvailabilityGrid.astro` (template section)

**Step 1: Wrap existing hourly table and add data attribute**

On the existing `<table class="hourly-grid__table">` (line ~65 area), add a `data-grid-mode="hourly"` attribute. Also wrap it to control visibility:
```astro
<div class="hourly-grid__mode-panel" data-mode-panel="hourly" style={hasPrecisionData ? 'display:none' : ''}>
  <table class="hourly-grid__table" data-grid-mode="hourly">
    <!-- existing hourly tbody stays unchanged -->
  </table>
</div>
```

**Step 2: Add the 15-minute grid table after the hourly panel**

Insert a second panel right after the hourly panel closing `</div>`, still inside `.hourly-grid__table-wrap`:
```astro
<div class="hourly-grid__mode-panel" data-mode-panel="quarter" style={hasPrecisionData ? '' : 'display:none'}>
  <table class="hourly-grid__table hourly-grid__table--quarter" data-grid-mode="quarter">
    <thead>
      <tr>
        <th class="hourly-grid__corner"></th>
        {DAYS.map((_, i) => (
          <th class="hourly-grid__day-header">{DAY_LABELS[i]}</th>
        ))}
      </tr>
      {showZoneSelectors && cities.length > 0 && hasPrecisionData && (
        <tr class="hourly-grid__zone-row">
          <th class="hourly-grid__corner"></th>
          {DAYS.map((day) => (
            <th class="hourly-grid__zone-cell" data-day={day}>
              <div class="zone-dropdown" data-day={day}>
                <button type="button" class="zone-dropdown__trigger" data-day={day}>
                  Cidades…
                </button>
                <div class="zone-dropdown__panel">
                  {(cities as string[]).map((city) => (
                    <label class="zone-dropdown__option">
                      <input
                        type="checkbox"
                        class="zone-dropdown__checkbox"
                        data-day={day}
                        data-city={city}
                      />
                      <span>{city}</span>
                    </label>
                  ))}
                </div>
              </div>
            </th>
          ))}
        </tr>
      )}
    </thead>
    <tbody>
      {QUARTER_HOURS.map(({ hour, minute }) => {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const isHourBoundary = minute === 0;
        return (
          <tr class:list={[{ 'hourly-grid__hour-boundary': isHourBoundary && hour !== 8 }]}>
            <td class:list={["hourly-grid__time-label", "hourly-grid__time-label--quarter", { 'hourly-grid__time-label--hour': isHourBoundary }]}>
              {timeStr}
            </td>
            {DAYS.map((day) => (
              <td class="hourly-grid__cell hourly-grid__cell--quarter">
                <button
                  type="button"
                  class="hourly-slot-btn hourly-slot-btn--quarter"
                  data-day={day}
                  data-time={timeStr}
                  data-grid-mode="quarter"
                  aria-label={`${DAY_LABELS[day - 1]} ${timeStr}`}
                >
                  <span class="hourly-slot-btn__x">&times;</span>
                  <span class="hourly-slot-btn__check">&#10003;</span>
                </button>
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
```

**Step 3: Verify the component still renders**

Run: `cd eduschedule-app && npm run build 2>&1 | head -30`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add eduschedule-app/src/components/HourlyAvailabilityGrid.astro
git commit -m "feat(availability): add 15-minute grid table HTML with quarter-hour rows"
```

---

### Task 3: Add CSS styles for toggle button and 15-min grid

**Files:**
- Modify: `eduschedule-app/src/components/HourlyAvailabilityGrid.astro` (scoped `<style>` block)

**Step 1: Add toggle button styles**

Add inside the existing `<style>` block, after the quick-fill button styles (after `.hourly-quick-btn--clear:hover`):
```css
/* Precision toggle */
.hourly-grid__precision-toggle {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
}

.precision-toggle-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  background: var(--color-background);
  color: var(--color-text-muted);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.precision-toggle-btn:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.precision-toggle-btn.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-weight: 600;
}

.precision-toggle-btn:hover:not(.active) {
  background: var(--color-surface);
  color: var(--color-text);
}
```

**Step 2: Add 15-min grid-specific styles**

Add after the toggle styles:
```css
/* 15-min grid specifics */
.hourly-grid__cell--quarter {
  padding: 1px 2px;
}

.hourly-slot-btn--quarter {
  height: 20px;
  font-size: var(--font-size-xs);
}

.hourly-slot-btn--quarter .hourly-slot-btn__x {
  font-size: 0.65rem;
}

.hourly-slot-btn--quarter .hourly-slot-btn__check {
  font-size: 0.55rem;
}

.hourly-grid__time-label--quarter {
  font-size: 0.6rem;
  color: var(--color-text-muted);
}

.hourly-grid__time-label--hour {
  font-weight: 700;
  color: var(--color-text);
}

.hourly-grid__hour-boundary td {
  border-top: 2px solid var(--color-border);
}

/* Responsive for 15-min grid */
@media (max-width: 639px) {
  .hourly-slot-btn--quarter {
    height: 22px;
  }
  .hourly-grid__time-label--quarter {
    font-size: 0.5rem;
  }
}

@media (max-width: 400px) {
  .hourly-slot-btn--quarter {
    height: 18px;
  }
}
```

**Step 3: Commit**

```bash
git add eduschedule-app/src/components/HourlyAvailabilityGrid.astro
git commit -m "style(availability): add CSS for precision toggle and 15-min grid"
```

---

### Task 4: Add JavaScript toggle and state sync logic

**Files:**
- Modify: `eduschedule-app/src/components/HourlyAvailabilityGrid.astro` (inline `<script>` block)

This is the core logic task. Modify the inline `<script is:inline>` block inside `initHourlyAvailabilityGrids()`.

**Step 1: Add toggle button click handlers**

After the zone dropdown logic section (~line 546), add a new section:
```javascript
// ---------------------------------------------------------------
// Precision toggle (hourly ↔ 15-min)
// ---------------------------------------------------------------
var toggleBtns = container.querySelectorAll('.precision-toggle-btn');
var hourlyPanel = container.querySelector('[data-mode-panel="hourly"]');
var quarterPanel = container.querySelector('[data-mode-panel="quarter"]');
var hourlySlotBtns = container.querySelectorAll('.hourly-slot-btn:not([data-grid-mode="quarter"])');
var quarterSlotBtns = container.querySelectorAll('.hourly-slot-btn[data-grid-mode="quarter"]');
var currentMode = quarterPanel && quarterPanel.style.display !== 'none' ? 'quarter' : 'hourly';

toggleBtns.forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var mode = this.getAttribute('data-mode');
    if (mode === currentMode) return;

    // Sync state before switching
    if (mode === 'quarter') {
      syncHourlyToQuarter();
    } else {
      syncQuarterToHourly();
    }

    // Toggle visibility
    if (hourlyPanel) hourlyPanel.style.display = mode === 'hourly' ? '' : 'none';
    if (quarterPanel) quarterPanel.style.display = mode === 'quarter' ? '' : 'none';

    // Update active button
    toggleBtns.forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');

    currentMode = mode;
    updateValue();
  });
});
```

**Step 2: Add state sync functions**

Add right after the toggle handler code:
```javascript
function syncHourlyToQuarter() {
  // For each selected hourly slot, select all 4 quarter sub-slots
  quarterSlotBtns.forEach(function(qBtn) { qBtn.classList.remove('selected'); });
  hourlySlotBtns.forEach(function(hBtn) {
    if (!hBtn.classList.contains('selected')) return;
    var day = hBtn.getAttribute('data-day');
    var time = hBtn.getAttribute('data-time');
    var hour = parseInt(time.split(':')[0], 10);
    // Select all 4 sub-slots for this hour
    [0, 15, 30, 45].forEach(function(m) {
      var qTime = (hour < 10 ? '0' : '') + hour + ':' + (m < 10 ? '0' : '') + m;
      var qBtn = container.querySelector('.hourly-slot-btn[data-grid-mode="quarter"][data-day="' + day + '"][data-time="' + qTime + '"]');
      if (qBtn) qBtn.classList.add('selected');
    });
  });
}

function syncQuarterToHourly() {
  // For each hour, check if ALL 4 sub-slots are selected
  hourlySlotBtns.forEach(function(hBtn) {
    var day = hBtn.getAttribute('data-day');
    var time = hBtn.getAttribute('data-time');
    var hour = parseInt(time.split(':')[0], 10);
    var allSelected = true;
    [0, 15, 30, 45].forEach(function(m) {
      var qTime = (hour < 10 ? '0' : '') + hour + ':' + (m < 10 ? '0' : '') + m;
      var qBtn = container.querySelector('.hourly-slot-btn[data-grid-mode="quarter"][data-day="' + day + '"][data-time="' + qTime + '"]');
      if (!qBtn || !qBtn.classList.contains('selected')) allSelected = false;
    });
    if (allSelected) {
      hBtn.classList.add('selected');
    } else {
      hBtn.classList.remove('selected');
    }
  });
}
```

**Step 3: Add click handlers for 15-min slot buttons**

The existing `slotBtns.forEach` toggle handler (line ~469) uses `container.querySelectorAll('.hourly-slot-btn')` which will capture ALL slot buttons (both grids). This is correct — clicking any slot button toggles it and calls `updateValue()`. No change needed for the click handlers.

However, the `slotBtns` variable at the top needs to stay as-is (selecting all `.hourly-slot-btn`), since the click handler just toggles `.selected` class and calls `updateValue()`.

**Step 4: Update `updateValue()` to use the active grid**

Replace the existing `updateValue()` function body to be mode-aware:
```javascript
function updateValue() {
  var windows;
  if (currentMode === 'quarter') {
    windows = getWindowsFromButtons(quarterSlotBtns, 15);
  } else {
    windows = getWindowsFromButtons(hourlySlotBtns, 60);
  }
  if (hiddenInput) hiddenInput.value = JSON.stringify(windows);
  var count = 0;
  var activeBtns = currentMode === 'quarter' ? quarterSlotBtns : hourlySlotBtns;
  activeBtns.forEach(function(b) { if (b.classList.contains('selected')) count++; });
  if (summaryText) {
    summaryText.textContent = count > 0
      ? count + ' horário' + (count > 1 ? 's' : '') + ' selecionado' + (count > 1 ? 's' : '')
      : 'Nenhum horário selecionado';
  }
  container.dispatchEvent(new CustomEvent('availability-change', { detail: { windows: windows }, bubbles: true }));
}
```

**Step 5: Add generic `getWindowsFromButtons()` function**

Replace the existing `getWindows()` function with a more generic version that accepts a button set and increment:
```javascript
function getWindowsFromButtons(btns, incrementMinutes) {
  var byDay = {};
  btns.forEach(function(btn) {
    if (!btn.classList.contains('selected')) return;
    var day = parseInt(btn.getAttribute('data-day'), 10);
    var time = btn.getAttribute('data-time');
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(time);
  });
  var windows = [];
  for (var day in byDay) {
    var times = byDay[day].sort();
    var rangeStart = null;
    var rangeEndMins = null;
    for (var i = 0; i < times.length; i++) {
      var parts = times[i].split(':');
      var hour = parseInt(parts[0], 10);
      var min = parseInt(parts[1], 10);
      var timeMins = hour * 60 + min;
      if (rangeStart === null) {
        rangeStart = times[i];
        rangeEndMins = timeMins + incrementMinutes;
      } else if (timeMins === rangeEndMins) {
        rangeEndMins = timeMins + incrementMinutes;
      } else {
        windows.push({ day_of_week: parseInt(day, 10), start_time: rangeStart, end_time: fmtTime(rangeEndMins) });
        rangeStart = times[i];
        rangeEndMins = timeMins + incrementMinutes;
      }
    }
    if (rangeStart !== null) {
      windows.push({ day_of_week: parseInt(day, 10), start_time: rangeStart, end_time: fmtTime(rangeEndMins) });
    }
  }
  return windows;
}

// Keep getWindows() as a backward-compat wrapper
function getWindows() {
  if (currentMode === 'quarter') {
    return getWindowsFromButtons(quarterSlotBtns, 15);
  }
  return getWindowsFromButtons(hourlySlotBtns, 60);
}
```

**Step 6: Update quick-fill to work on the active grid**

Modify the quick-fill click handler to target the active grid's buttons. Replace the existing `slotBtns.forEach` inside the quick-fill handler with mode-aware logic:
```javascript
quickBtns.forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var action = this.getAttribute('data-action');
    var hours = [];

    if (action === 'morning') hours = MORNING_HOURS;
    else if (action === 'lunch') hours = LUNCH_HOURS;
    else if (action === 'afternoon') hours = AFTERNOON_HOURS;
    else if (action === 'all') hours = MORNING_HOURS.concat(LUNCH_HOURS).concat(AFTERNOON_HOURS);
    else if (action === 'clear') {
      var clearBtns = currentMode === 'quarter' ? quarterSlotBtns : hourlySlotBtns;
      clearBtns.forEach(function(s) { s.classList.remove('selected'); });
      updateValue();
      return;
    }

    if (currentMode === 'quarter') {
      // In 15-min mode, select all sub-slots for each hour in the range
      quarterSlotBtns.forEach(function(s) {
        var time = s.getAttribute('data-time');
        var h = time.split(':')[0] + ':00';
        if (hours.indexOf(h) !== -1) {
          s.classList.add('selected');
        }
      });
    } else {
      hourlySlotBtns.forEach(function(s) {
        var time = s.getAttribute('data-time');
        if (hours.indexOf(time) !== -1) {
          s.classList.add('selected');
        }
      });
    }
    updateValue();
  });
});
```

**Step 7: Update `expandWindowsToSlots()` to handle both grids**

Replace the existing `expandWindowsToSlots()` function:
```javascript
function expandWindowsToSlots(windows) {
  // Clear both grids
  hourlySlotBtns.forEach(function(s) { s.classList.remove('selected'); });
  quarterSlotBtns.forEach(function(s) { s.classList.remove('selected'); });

  for (var i = 0; i < windows.length; i++) {
    var w = windows[i];
    var startParts = w.start_time.split(':');
    var endParts = w.end_time.split(':');
    var startH = parseInt(startParts[0], 10);
    var startM = parseInt(startParts[1], 10);
    var endH = parseInt(endParts[0], 10);
    var endM = parseInt(endParts[1], 10);
    var startMins = startH * 60 + startM;
    var endMins = endH * 60 + endM;

    // Expand into hourly grid
    var firstHour = Math.floor(startMins / 60);
    var lastHour = endMins % 60 === 0 ? Math.floor(endMins / 60) - 1 : Math.floor(endMins / 60);
    for (var hour = firstHour; hour <= lastHour; hour++) {
      var timeStr = (hour < 10 ? '0' : '') + hour + ':00';
      var btn = container.querySelector('.hourly-slot-btn:not([data-grid-mode="quarter"])[data-day="' + w.day_of_week + '"][data-time="' + timeStr + '"]');
      if (btn) btn.classList.add('selected');
    }

    // Expand into 15-min grid
    for (var mins = startMins; mins < endMins; mins += 15) {
      var qTime = fmtTime(mins);
      var qBtn = container.querySelector('.hourly-slot-btn[data-grid-mode="quarter"][data-day="' + w.day_of_week + '"][data-time="' + qTime + '"]');
      if (qBtn) qBtn.classList.add('selected');
    }
  }
  updateValue();
}
```

**Step 8: Update `setAvailability` public API**

The existing `container.setAvailability` calls `expandWindowsToSlots` which now populates both grids. No change needed.

**Step 9: Verify build succeeds**

Run: `cd eduschedule-app && npm run build 2>&1 | head -30`
Expected: Build succeeds

**Step 10: Commit**

```bash
git add eduschedule-app/src/components/HourlyAvailabilityGrid.astro
git commit -m "feat(availability): add JS toggle logic and state sync between hourly/15-min grids"
```

---

### Task 5: Run existing tests and verify no regressions

**Files:**
- No files modified

**Step 1: Run the full test suite**

Run: `cd eduschedule-app && npm test 2>&1 | tail -30`
Expected: All existing tests pass (4597+ tests). This component has no unit tests (inline script in Astro), but API tests for availability endpoints must still pass since we didn't change any API/service/repository code.

**Step 2: Run the availability-specific API tests**

Run: `cd eduschedule-app && npx vitest run src/tests/api/teacher/availability.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All availability API tests pass

**Step 3: Commit (if any test fixes were needed)**

No commit expected — this is a verification step.

---

### Task 6: Manual verification and dev server test

**Files:**
- No files modified

**Step 1: Start the dev server**

Run: `cd eduschedule-app && npm run dev`

**Step 2: Verify in browser**

Navigate to the teacher availability page and the admin users page (teacher modal). Verify:

1. Toggle button appears between quick-fill buttons and the grid
2. Default is "1 hora" when teacher has hourly data
3. Clicking "15 min" switches to the 15-minute grid with 48 rows
4. Selected hourly slots expand to 4 sub-slots in 15-min view
5. Switching back to "1 hora" collapses — only full hours stay selected
6. Quick-fill buttons work in both modes
7. Saving availability in 15-min mode sends correct HH:MM windows to the API
8. Hour boundary lines are visible every 4 rows in 15-min mode
9. Zone selectors work in both modes

**Step 3: Final commit if any fixes were applied**

```bash
git add eduschedule-app/src/components/HourlyAvailabilityGrid.astro
git commit -m "fix(availability): polish precision toggle after manual testing"
```

---

### Task 7: Update documentation

**Files:**
- Modify: `eduschedule-app/project-context.md`

**Step 1: Add to Recent Changes section**

Add entry:
```markdown
### 2026-02-12 — Availability Grid 15-Minute Precision Toggle
- Added toggle to `HourlyAvailabilityGrid` component switching between 1-hour and 15-minute granularity
- Smart default: auto-detects if teacher has 15-min precision data and opens in that mode
- New prop: `allowPrecisionToggle` (default `true`)
- No database or API changes — `teacher_availability` table already supports HH:MM precision
```

**Step 2: Commit**

```bash
git add eduschedule-app/project-context.md
git commit -m "docs: add availability grid precision toggle to project context"
```
