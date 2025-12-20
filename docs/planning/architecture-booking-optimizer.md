# Architecture Addendum: AI-Optimized Booking System

**Parent Document:** `docs/architecture.md`
**Status:** PROPOSED
**Created:** 2025-12-09
**Author:** Winston (Architect Agent)

---

## Executive Summary

This addendum extends the existing EduSchedule Pro architecture with an **AI-Optimized Booking System** that introduces:

1. **BookingGrid Component** - Absolute-positioned visual schedule with pixel-perfect time accuracy
2. **Travel Time Engine** - Real driving times via Routes API with intelligent caching
3. **AI Schedule Optimizer** - Suggests schedule improvements, waitlist fits, and availability extensions
4. **Teacher Request System** - Automated suggestions sent to teachers for approval

This system transforms scheduling from manual slot-filling to **intelligent route-optimized placement**.

---

## Problem Statement

### Current State
- Teachers set availability windows (e.g., 09:00-16:00)
- Classes are manually placed without travel awareness
- 30-minute slot grid cannot represent real travel gaps (17 min, 23 min, etc.)
- Waitlist students matched manually without location optimization
- No visibility into potential schedule improvements

### Desired State
- AI analyzes teacher routes and suggests optimizations
- Waitlist students automatically matched when they fit geographically
- Teachers notified when small availability extensions unlock new students
- Visual grid shows exact class durations and travel gaps
- System maximizes student capacity while minimizing teacher travel

---

## Architectural Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI-OPTIMIZED BOOKING SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   INPUTS    │    │   ENGINE    │    │  OUTPUTS    │    │   ACTIONS   │  │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤    ├─────────────┤  │
│  │ Enrollments │───▶│ Travel Time │───▶│ Suggestions │───▶│ Apply Auto  │  │
│  │ Waitlist    │    │ Calculator  │    │ List        │    │ (no approval│  │
│  │ Addresses   │    │             │    │             │    │  needed)    │  │
│  │ Availability│───▶│ Route       │───▶│ Revenue     │───▶│             │  │
│  │ Windows     │    │ Optimizer   │    │ Projections │    │ Request     │  │
│  │             │    │             │    │             │    │ Teacher     │  │
│  │ Teacher     │───▶│ Waitlist    │───▶│ Teacher     │    │ Approval    │  │
│  │ Preferences │    │ Matcher     │    │ Requests    │    │             │  │
│  └─────────────┘    │             │    └─────────────┘    └─────────────┘  │
│                     │ AI          │                                         │
│                     │ Suggestion  │    ┌─────────────────────────────────┐  │
│                     │ Generator   │───▶│        BOOKING GRID             │  │
│                     └─────────────┘    │  (Absolute Positioning)         │  │
│                                        │  - Pixel-perfect time display   │  │
│                                        │  - Travel gaps visualized       │  │
│                                        │  - Click to book/modify         │  │
│                                        └─────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: BookingGrid Component (Absolute Positioning)

### Design Decision

**Choice:** CSS absolute positioning within day columns
**Rationale:**
- Enables any start time (08:07, 09:23) - not locked to 15/30-min increments
- Travel gaps render naturally proportional to duration
- AI can suggest "shift 5 minutes" and it displays correctly
- Foundation for drag-and-drop (future)

### Visual Specification

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Monday 09/12                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│  08:00 ─────────────────────────────────────────────────────────────────│
│         ┌─────────────────────────────────────────────────────────┐     │
│  09:00  │  João Silva                                             │     │
│         │  09:00 - 10:00 (1h)                                     │     │
│         │  📍 Trindade                                            │     │
│  10:00  └─────────────────────────────────────────────────────────┘     │
│         ┌─────────────────────────┐                                     │
│  10:00  │ 🚗 20 min → Itacorubi   │  ← Travel indicator                 │
│  10:20  └─────────────────────────┘                                     │
│         ┌─────────────────────────────────────────────────────────┐     │
│  10:20  │  Ana Costa                                              │     │
│         │  10:20 - 11:20 (1h)                                     │     │
│         │  📍 Itacorubi                                           │     │
│  11:20  └─────────────────────────────────────────────────────────┘     │
│         ┌───────────────────────────────────────────────────────────┐   │
│  11:20  │  LIVRE - 2h 40min available                               │   │
│         │  ✨ Lucas (Waitlist) fits here! (+R$95/week)              │   │
│  14:00  └───────────────────────────────────────────────────────────┘   │
│         ┌─────────────────────────────────────────────────────────┐     │
│  14:00  │  Pedro Santos                                           │     │
│         │  14:00 - 15:00 (1h)                                     │     │
│         │  📍 Centro                                              │     │
│  15:00  └─────────────────────────────────────────────────────────┘     │
│  16:00 ───────────────────────────────────────── End of availability ───│
└──────────────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

```typescript
// Constants
const PX_PER_MINUTE = 1.5;  // 1 hour = 90px (adjustable)
const DAY_START = '08:00';
const DAY_END = '20:00';

// Position calculation
function getBlockStyle(startTime: string, durationMin: number): CSSProperties {
  const startMinutes = timeToMinutes(startTime) - timeToMinutes(DAY_START);
  return {
    position: 'absolute',
    top: `${startMinutes * PX_PER_MINUTE}px`,
    height: `${durationMin * PX_PER_MINUTE}px`,
    left: '4px',
    right: '4px',
  };
}

// Travel indicator positioning
function getTravelBlockStyle(
  prevEndTime: string,
  nextStartTime: string,
  travelMinutes: number
): CSSProperties {
  const gapStart = timeToMinutes(prevEndTime) - timeToMinutes(DAY_START);
  return {
    position: 'absolute',
    top: `${gapStart * PX_PER_MINUTE}px`,
    height: `${travelMinutes * PX_PER_MINUTE}px`,
    // Visual styling for travel indicator
  };
}
```

### Component Structure

```
src/components/
├── BookingGrid.astro           # Main grid container
├── BookingDayColumn.astro      # Single day column (relative positioning)
├── BookingClassBlock.astro     # Class block (absolute positioned)
├── BookingTravelBlock.astro    # Travel time indicator
├── BookingLivreBlock.astro     # Available slot with suggestions
└── BookingTimeRuler.astro      # Left-side time labels
```

### Data Flow

```typescript
interface BookingGridProps {
  teacherId: string;
  weekStartDate: Date;
  // Data passed from page
  enrollments: EnrollmentWithLocation[];
  travelTimes: TravelTimeMatrix;
  suggestions?: ScheduleSuggestion[];
}

interface EnrollmentWithLocation {
  id: string;
  student_name: string;
  day_of_week: number;
  start_time: string;          // "09:00"
  duration_minutes: number;    // 60
  status: string;
  // Location data
  lat: number;
  lon: number;
  neighborhood: string;
  address: string;
}

interface TravelTimeMatrix {
  // Key: "fromEnrollmentId-toEnrollmentId"
  // Value: travel minutes
  [key: string]: number;
}
```

---

## Phase 2: Travel Time Engine

### Data Model Extensions

```sql
-- Travel time cache (Routes API results)
CREATE TABLE travel_time_cache (
  id TEXT PRIMARY KEY,
  origin_lat REAL NOT NULL,
  origin_lon REAL NOT NULL,
  dest_lat REAL NOT NULL,
  dest_lon REAL NOT NULL,
  travel_minutes INTEGER NOT NULL,
  distance_km REAL,
  route_polyline TEXT,           -- For optional map display
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,   -- Cache for 30 days

  UNIQUE(origin_lat, origin_lon, dest_lat, dest_lon)
);

CREATE INDEX idx_travel_cache_coords ON travel_time_cache(origin_lat, origin_lon, dest_lat, dest_lon);
CREATE INDEX idx_travel_cache_expires ON travel_time_cache(expires_at);

-- Teacher home base (starting point for route optimization)
ALTER TABLE teachers ADD COLUMN home_lat REAL;
ALTER TABLE teachers ADD COLUMN home_lon REAL;
ALTER TABLE teachers ADD COLUMN home_neighborhood TEXT;
```

### Service Layer

```typescript
// src/lib/services/travel-time-service.ts

interface ITravelTimeService {
  // Get travel time between two points (uses cache or fetches)
  getTravelTime(
    origin: { lat: number; lon: number },
    dest: { lat: number; lon: number }
  ): Promise<number>;

  // Get travel matrix for a teacher's day
  getTravelMatrixForDay(
    teacherId: string,
    dayOfWeek: number,
    date: string
  ): Promise<TravelTimeMatrix>;

  // Batch fetch and cache travel times
  prefetchTravelTimes(
    pairs: Array<{ origin: LatLon; dest: LatLon }>
  ): Promise<void>;
}

// Implementation priorities:
// 1. Check cache first (< 10ms)
// 2. If miss, fetch from Routes API
// 3. Cache result for 30 days
// 4. Fallback: Haversine estimate * 1.4 (road factor)
```

### API Integration

**Option A: LocationIQ Directions API** (already have API key)
```typescript
// Already using LocationIQ for geocoding
const LOCATIONIQ_KEY = 'pk.53d28e80ac661e82577bf32461f20a5d';

async function fetchDrivingTime(origin: LatLon, dest: LatLon): Promise<number> {
  const url = `https://us1.locationiq.com/v1/directions/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?key=${LOCATIONIQ_KEY}&overview=false`;
  const response = await fetch(url);
  const data = await response.json();
  return Math.ceil(data.routes[0].duration / 60); // Convert seconds to minutes
}
```

**Option B: Google Routes API** (more accurate, requires billing)
```typescript
// Future option if LocationIQ insufficient
```

### Caching Strategy

```
Request: getTravelTime(Trindade → Itacorubi)
    │
    ▼
┌─────────────────────────────────────────┐
│  1. Check travel_time_cache             │
│     - Round coords to 4 decimals        │
│     - Query by origin/dest              │
│     - If found & not expired → return   │
└─────────────────────────────────────────┘
    │ Cache miss
    ▼
┌─────────────────────────────────────────┐
│  2. Fetch from Routes API               │
│     - LocationIQ Directions API         │
│     - Returns: minutes, km, polyline    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  3. Store in cache                      │
│     - Set expires_at = now + 30 days    │
│     - Return travel_minutes             │
└─────────────────────────────────────────┘
```

---

## Phase 3: AI Schedule Optimizer

### Suggestion Types

| Type | Description | Requires Approval |
|------|-------------|-------------------|
| `WAITLIST_FIT` | Waitlist student fits in existing gap | No (if no changes needed) |
| `WAITLIST_FIT_EXTEND` | Waitlist student fits if availability extended | Yes (teacher) |
| `ROUTE_OPTIMIZE` | Reorder classes to reduce travel | Yes (teacher) |
| `SHIFT_CLASS` | Move class 5-15 min to improve flow | Yes (affected parties) |
| `GAP_ALERT` | Gap too short for travel | Informational |

### Data Model

```sql
-- AI optimization suggestions
CREATE TABLE schedule_suggestions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  day_of_week INTEGER NOT NULL,

  suggestion_type TEXT NOT NULL,
  -- 'WAITLIST_FIT', 'WAITLIST_FIT_EXTEND', 'ROUTE_OPTIMIZE', 'SHIFT_CLASS', 'GAP_ALERT'

  suggestion_json TEXT NOT NULL,  -- Full details (see below)

  -- Impact metrics
  revenue_increase_weekly INTEGER,  -- R$ per week
  travel_time_saved INTEGER,        -- Minutes per week
  students_added INTEGER,           -- Count

  -- Approval tracking
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approval_request_sent_at INTEGER,
  approved_by TEXT,
  approved_at INTEGER,
  rejected_by TEXT,
  rejected_at INTEGER,
  rejection_reason TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending', 'approved', 'rejected', 'applied', 'expired'

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER  -- Suggestions expire after 7 days
);

CREATE INDEX idx_suggestions_teacher ON schedule_suggestions(teacher_id, status);
CREATE INDEX idx_suggestions_type ON schedule_suggestions(suggestion_type);

-- Teacher AI preferences
CREATE TABLE teacher_ai_preferences (
  teacher_id TEXT PRIMARY KEY REFERENCES teachers(id),

  -- Constraints
  max_travel_between_classes INTEGER DEFAULT 30,  -- Minutes
  min_break_minutes INTEGER DEFAULT 15,
  willing_to_extend_minutes INTEGER DEFAULT 15,   -- How much earlier/later

  -- Preferences
  preferred_neighborhoods TEXT,  -- JSON array
  avoid_neighborhoods TEXT,      -- JSON array
  prefer_clustered_schedule BOOLEAN DEFAULT true,

  -- Notification settings
  notify_on_waitlist_fit BOOLEAN DEFAULT true,
  notify_on_route_optimize BOOLEAN DEFAULT true,
  auto_accept_no_change_fits BOOLEAN DEFAULT true,  -- Auto-apply waitlist fits

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### Suggestion JSON Schema

```typescript
interface WaitlistFitSuggestion {
  type: 'WAITLIST_FIT' | 'WAITLIST_FIT_EXTEND';
  waitlist_student: {
    id: string;
    name: string;
    neighborhood: string;
    lat: number;
    lon: number;
  };
  proposed_slot: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  };
  fits_between: {
    before_enrollment_id: string | null;
    after_enrollment_id: string | null;
  };
  travel_context: {
    travel_from_previous: number | null;  // Minutes
    travel_to_next: number | null;
  };
  extension_required?: {
    direction: 'earlier' | 'later';
    minutes: number;
    new_availability_start?: string;
    new_availability_end?: string;
  };
  impact: {
    revenue_weekly: number;
    travel_added: number;
  };
}

interface RouteOptimizeSuggestion {
  type: 'ROUTE_OPTIMIZE';
  current_order: Array<{
    enrollment_id: string;
    student_name: string;
    start_time: string;
    neighborhood: string;
  }>;
  proposed_order: Array<{
    enrollment_id: string;
    student_name: string;
    new_start_time: string;
    neighborhood: string;
  }>;
  impact: {
    travel_saved_minutes: number;
    travel_saved_km: number;
  };
}
```

### AI Engine Service

```typescript
// src/lib/services/schedule-optimizer.ts

interface IScheduleOptimizer {
  // Run full analysis for a teacher
  analyzeTeacherSchedule(teacherId: string): Promise<ScheduleSuggestion[]>;

  // Check if a waitlist student fits anywhere
  findWaitlistFits(waitlistStudentId: string): Promise<WaitlistFitSuggestion[]>;

  // Optimize route for a specific day
  optimizeRoute(teacherId: string, dayOfWeek: number): Promise<RouteOptimizeSuggestion | null>;

  // Apply a suggestion (after approval if needed)
  applySuggestion(suggestionId: string, approvedBy: string): Promise<void>;
}
```

### Optimization Algorithm

```typescript
async function findWaitlistFits(waitlistStudent: Lead): Promise<WaitlistFitSuggestion[]> {
  const suggestions: WaitlistFitSuggestion[] = [];

  // 1. Get all teachers with availability
  const teachers = await getTeachersWithAvailability();

  for (const teacher of teachers) {
    // 2. For each day, get enrollments sorted by time
    for (const day of [1, 2, 3, 4, 5]) {
      const enrollments = await getEnrollmentsForDay(teacher.id, day);
      const availability = await getAvailabilityForDay(teacher.id, day);

      if (!availability) continue;

      // 3. Find gaps
      const gaps = findGaps(enrollments, availability);

      for (const gap of gaps) {
        // 4. Check if gap fits a 1h class + travel
        const travelToPrev = gap.prevEnrollment
          ? await getTravelTime(gap.prevEnrollment, waitlistStudent)
          : 0;
        const travelToNext = gap.nextEnrollment
          ? await getTravelTime(waitlistStudent, gap.nextEnrollment)
          : 0;

        const requiredMinutes = 60 + travelToPrev + travelToNext;

        if (gap.durationMinutes >= requiredMinutes) {
          // Fits without extension!
          suggestions.push({
            type: 'WAITLIST_FIT',
            waitlist_student: { ... },
            proposed_slot: {
              day_of_week: day,
              start_time: addMinutes(gap.start, travelToPrev),
              end_time: addMinutes(gap.start, travelToPrev + 60),
            },
            // ...
          });
        } else if (gap.durationMinutes + teacher.willing_to_extend >= requiredMinutes) {
          // Fits with small extension
          const extensionNeeded = requiredMinutes - gap.durationMinutes;
          suggestions.push({
            type: 'WAITLIST_FIT_EXTEND',
            extension_required: {
              direction: gap.isAtStart ? 'earlier' : 'later',
              minutes: extensionNeeded,
            },
            // ...
          });
        }
      }
    }
  }

  return suggestions;
}
```

---

## Phase 4: Teacher Request System

### Notification Flow

```
AI finds suggestion: "Lucas fits on Tuesday if Maria starts 15min earlier"
    │
    ▼
┌─────────────────────────────────────────┐
│  1. Create schedule_suggestions record  │
│     status: 'pending'                   │
│     requires_approval: true             │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. Send notification to teacher        │
│     - In-app notification badge         │
│     - Email (optional)                  │
│     - WhatsApp (Phase 2)                │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  3. Teacher reviews in dashboard        │
│     /teacher/suggestions                │
│     - See current schedule              │
│     - See proposed change               │
│     - See revenue impact                │
│     [Accept] [Reject]                   │
└─────────────────────────────────────────┘
    │
    ▼ (Accept)
┌─────────────────────────────────────────┐
│  4. Apply changes                       │
│     - Update availability window        │
│     - Convert waitlist to enrollment    │
│     - Notify admin                      │
│     - Update suggestion status          │
└─────────────────────────────────────────┘
```

### Teacher Dashboard UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🤖 Schedule Optimization Suggestions                              3 new    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ✨ New Student Opportunity - Tuesday                    +R$380/month │  │
│  │                                                                       │  │
│  │  Lucas Oliveira (Trindade) can be added to your Tuesday schedule.     │  │
│  │                                                                       │  │
│  │  Lucas lives just 3 minutes from your student João.                   │  │
│  │                                                                       │  │
│  │  To fit Lucas, would you be able to start 15 minutes earlier          │  │
│  │  on Tuesdays? (08:45 instead of 09:00)                                │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Current          →        Proposed                             │  │  │
│  │  │  09:00 João              08:45 Lucas (NEW)                      │  │  │
│  │  │  10:15 Ana               10:00 João                             │  │  │
│  │  │                          11:15 Ana                              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  [Yes, I can start earlier!]              [No, keep my schedule]      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  🚗 Route Optimization - Wednesday                     Save 25 min    │  │
│  │                                                                       │  │
│  │  Reordering your Wednesday classes would save 25 minutes of travel.   │  │
│  │                                                                       │  │
│  │  [View Details]                      [Apply] [Dismiss]                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: BookingGrid Foundation (Week 1-2)

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Create BookingGrid component structure | `components/BookingGrid.astro` |
| 1.2 | Implement absolute positioning logic | `components/BookingDayColumn.astro` |
| 1.3 | Create class block component | `components/BookingClassBlock.astro` |
| 1.4 | Create LIVRE block component | `components/BookingLivreBlock.astro` |
| 1.5 | Create time ruler component | `components/BookingTimeRuler.astro` |
| 1.6 | Create test page | `pages/admin/booking-test.astro` |
| 1.7 | Add click handlers (view, book, modify) | Client-side JS |
| 1.8 | Style with BILIN Design System | CSS |

**Deliverable:** Working visual grid showing classes with correct proportions

### Phase 2: Travel Time Display (Week 2-3)

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Create travel_time_cache table | `database/travel-cache.sql` |
| 2.2 | Implement TravelTimeService | `lib/services/travel-time-service.ts` |
| 2.3 | Integrate LocationIQ Directions API | `lib/services/locationiq.ts` |
| 2.4 | Create travel block component | `components/BookingTravelBlock.astro` |
| 2.5 | Add travel time to grid | Update BookingGrid |
| 2.6 | Implement caching logic | TravelTimeService |
| 2.7 | Add fallback (Haversine estimate) | TravelTimeService |

**Deliverable:** Travel time indicators between consecutive classes

### Phase 3: AI Optimizer Core (Week 3-4)

| Task | Description | Files |
|------|-------------|-------|
| 3.1 | Create schedule_suggestions table | `database/suggestions.sql` |
| 3.2 | Create teacher_ai_preferences table | `database/suggestions.sql` |
| 3.3 | Implement gap detection algorithm | `lib/services/schedule-optimizer.ts` |
| 3.4 | Implement waitlist fit detection | `lib/services/schedule-optimizer.ts` |
| 3.5 | Implement route optimization | `lib/services/route-optimizer.ts` |
| 3.6 | Create suggestion API endpoints | `pages/api/suggestions/*` |
| 3.7 | Show suggestions in BookingGrid | Update components |

**Deliverable:** AI generates suggestions for schedule improvements

### Phase 4: Teacher Request System (Week 4-5)

| Task | Description | Files |
|------|-------------|-------|
| 4.1 | Create teacher suggestions page | `pages/teacher/suggestions.astro` |
| 4.2 | Implement approval flow | `pages/api/suggestions/[id]/approve.ts` |
| 4.3 | Implement rejection flow | `pages/api/suggestions/[id]/reject.ts` |
| 4.4 | Apply approved suggestions | `lib/services/schedule-optimizer.ts` |
| 4.5 | Add notification badges | Update Nav component |
| 4.6 | Admin overview of all suggestions | `pages/admin/suggestions.astro` |

**Deliverable:** Complete teacher approval workflow

### Phase 5: Integration & Polish (Week 5-6)

| Task | Description | Files |
|------|-------------|-------|
| 5.1 | Replace old grid in enrollments page | `pages/admin/enrollments.astro` |
| 5.2 | Add keyboard navigation | BookingGrid JS |
| 5.3 | Add drag-and-drop (optional) | BookingGrid JS |
| 5.4 | Performance optimization | Caching, lazy loading |
| 5.5 | Mobile responsive design | CSS |
| 5.6 | Testing and bug fixes | All components |

**Deliverable:** Production-ready AI-optimized booking system

---

## API Endpoints (New)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/travel-time` | GET | Get travel time between two points |
| `/api/travel-time/matrix` | GET | Get travel matrix for teacher's day |
| `/api/suggestions` | GET | List suggestions for teacher/admin |
| `/api/suggestions/generate` | POST | Trigger AI analysis |
| `/api/suggestions/[id]` | GET | Get suggestion details |
| `/api/suggestions/[id]/approve` | POST | Teacher approves suggestion |
| `/api/suggestions/[id]/reject` | POST | Teacher rejects suggestion |
| `/api/suggestions/[id]/apply` | POST | Admin force-apply suggestion |
| `/api/teacher/ai-preferences` | GET/PUT | Teacher AI settings |

---

## Project Structure Additions

```
src/
├── components/
│   ├── BookingGrid.astro           # NEW: Main grid container
│   ├── BookingDayColumn.astro      # NEW: Day column
│   ├── BookingClassBlock.astro     # NEW: Class block
│   ├── BookingTravelBlock.astro    # NEW: Travel indicator
│   ├── BookingLivreBlock.astro     # NEW: Available slot
│   ├── BookingTimeRuler.astro      # NEW: Time labels
│   └── SuggestionCard.astro        # NEW: Suggestion display
│
├── lib/
│   ├── services/
│   │   ├── travel-time-service.ts  # NEW: Travel time engine
│   │   ├── schedule-optimizer.ts   # NEW: AI optimizer
│   │   └── route-optimizer.ts      # NEW: TSP solver
│   │
│   └── repositories/d1/
│       ├── travel-cache.ts         # NEW: Travel cache repo
│       └── suggestion.ts           # NEW: Suggestion repo
│
├── pages/
│   ├── admin/
│   │   ├── booking-test.astro      # NEW: Test page
│   │   └── suggestions.astro       # NEW: All suggestions
│   │
│   ├── teacher/
│   │   └── suggestions.astro       # NEW: Teacher suggestions
│   │
│   └── api/
│       ├── travel-time/
│       │   ├── index.ts            # NEW: Single travel time
│       │   └── matrix.ts           # NEW: Day matrix
│       │
│       └── suggestions/
│           ├── index.ts            # NEW: List/create
│           ├── generate.ts         # NEW: Trigger AI
│           └── [id]/
│               ├── index.ts        # NEW: Get details
│               ├── approve.ts      # NEW: Approve
│               ├── reject.ts       # NEW: Reject
│               └── apply.ts        # NEW: Force apply

database/
├── travel-cache.sql                # NEW: Travel cache table
└── suggestions.sql                 # NEW: Suggestions + preferences
```

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Waitlist conversion rate | +30% | Enrolled from waitlist / Total waitlist |
| Teacher travel time | -20% | Avg minutes between classes |
| Teacher earnings | +15% | Avg R$/week per teacher |
| Schedule utilization | +25% | Booked hours / Available hours |
| Suggestion acceptance rate | >60% | Approved / Total suggestions |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LocationIQ rate limits | Medium | High | Aggressive caching (30 days), fallback to Haversine |
| Teachers reject suggestions | Medium | Medium | Clear value communication, easy reject flow |
| Complex UI overwhelms users | Medium | High | Progressive disclosure, tooltips, onboarding |
| Travel estimates inaccurate | Low | Medium | Use actual Routes API, not straight-line |
| Performance with many suggestions | Low | Medium | Pagination, lazy loading, background processing |

---

## Architecture Decision Record

### ADR-001: Absolute Positioning vs Grid Rows

**Decision:** Use CSS absolute positioning within day columns
**Status:** Accepted
**Context:** Need to display classes with exact time accuracy and variable travel gaps
**Consequences:** More complex positioning logic, but enables AI-suggested micro-adjustments

### ADR-002: LocationIQ for Routing

**Decision:** Use LocationIQ Directions API for travel times
**Status:** Accepted
**Context:** Already have LocationIQ API key for geocoding
**Consequences:** 5,000 free requests/day, may need upgrade for scale

### ADR-003: Server-Side AI Processing

**Decision:** Run AI optimizer on server, not client
**Status:** Accepted
**Context:** Complex algorithms need full data access
**Consequences:** API latency for suggestions, but cleaner architecture

---

## Next Steps

1. **Immediate:** Create `BookingGrid.astro` and test page
2. **This Week:** Implement absolute positioning with mock data
3. **Next Week:** Integrate travel time display
4. **Following Weeks:** AI optimizer and teacher approval flow

---

**Document Status:** PROPOSED - Awaiting approval to proceed with implementation
