# Makeup Class Tracking - EduSchedule Pro

## Overview

The makeup class tracking system enables teachers and parents to track when cancelled classes are rescheduled and completed. This ensures that no class is lost and provides full transparency on makeup status.

## Database Schema

### Fields Added to `class_completions` Table

```sql
-- Links a makeup completion back to the original cancelled exception
makeup_for_exception_id TEXT REFERENCES enrollment_exceptions(id)
```

This creates a direct link between:
- The **original cancelled class** (stored in `enrollment_exceptions`)
- The **makeup completion** (stored in `class_completions`)

### Existing Makeup Fields

- `is_makeup` (INTEGER): Boolean flag indicating this is a makeup class
- `makeup_for_date` (TEXT): The original date (YYYY-MM-DD) that was cancelled

### Indexes

```sql
-- Find makeup completions by exception ID
CREATE INDEX idx_completions_makeup_exception
ON class_completions(makeup_for_exception_id)
WHERE makeup_for_exception_id IS NOT NULL;

-- Find makeup completions by original date
CREATE INDEX idx_completions_makeup_date
ON class_completions(makeup_for_date)
WHERE makeup_for_date IS NOT NULL;
```

## How It Works

### 1. Class Cancellation Flow

When a class is cancelled:

```
Parent/Teacher cancels class on 2025-01-10
    ↓
Exception created with type CANCELLED_STUDENT/CANCELLED_TEACHER
    ↓
Exception gets unique ID (exc_abc123)
    ↓
Schedule shows "Available for Makeup" badge
```

### 2. Makeup Class Booking Flow

When scheduling the makeup:

```
Admin/Parent books makeup for 2025-01-17
    ↓
Completion created with:
  - is_makeup = true
  - makeup_for_date = "2025-01-10"
  - makeup_for_exception_id = "exc_abc123"
    ↓
System links makeup to original cancellation
```

### 3. Display Status

The schedule generator automatically:
- Checks if cancelled exceptions have linked makeup completions
- Sets `hasMakeup` flag on schedule items
- Includes `makeupCompletion` data for display

**Cancelled slot without makeup:**
```
┌──────────────────────────┐
│ 15:00        [Cancelled]  │
│ Maria Silva              │
│ English                  │
│                          │
│ Available for Makeup     │ ← Green badge
└──────────────────────────┘
```

**Cancelled slot with makeup completed:**
```
┌──────────────────────────┐
│ 15:00        [Cancelled]  │
│ Maria Silva              │
│ English                  │
│                          │
│ ✓ Makeup Completed       │ ← Blue badge
│   on 2025-01-17          │
└──────────────────────────┘
```

## API Usage

### Creating a Makeup Completion

```typescript
POST /api/enrollments/{enrollmentId}/completions

{
  "class_date": "2025-01-17",
  "class_time": "15:00",
  "status": "COMPLETED",
  "notes": "Makeup class for Jan 10 cancellation",
  "is_makeup": true,
  "makeup_for_date": "2025-01-10",
  "makeup_for_exception_id": "exc_abc123"  // Links to original exception
}
```

### Checking Makeup Status

The `ScheduleItem` interface includes:

```typescript
interface ScheduleItem {
  // ... other fields
  hasMakeup?: boolean;           // True if cancelled class has been made up
  makeupCompletion?: ClassCompletion; // The makeup record if it exists
}
```

## Repository Methods

### CompletionRepository

```typescript
// Find makeup completion for a specific cancelled exception
async findByMakeupException(exceptionId: string): Promise<ClassCompletion | null>
```

**Usage:**
```typescript
const makeup = await completionRepo.findByMakeupException('exc_abc123');
if (makeup) {
  console.log(`Makeup completed on ${makeup.class_date}`);
} else {
  console.log('No makeup scheduled yet');
}
```

## Schedule Generator Integration

The `ScheduleGeneratorService` automatically enriches cancelled classes with makeup status:

```typescript
// For each cancelled class in the schedule:
if (exception && (status === 'CANCELLED_STUDENT' || status === 'CANCELLED_TEACHER')) {
  // Check if there's a completion linked to this exception
  makeupCompletion = await this.completionRepo.findByMakeupException(exception.id);
  hasMakeup = makeupCompletion !== null;
}
```

This happens transparently during schedule generation, so no additional API calls are needed.

## UI Components

### Teacher Schedule View

- Shows "Available for Makeup" in green for cancelled classes without makeup
- Shows "✓ Makeup Completed on [date]" in blue for cancelled classes with makeup
- Automatically updates when makeup is recorded

### Parent Schedule View

- Shows "Cancelled" for cancelled classes without makeup
- Shows "✓ Makeup Completed on [date]" for cancelled classes with makeup
- Parents can see at a glance which cancellations have been rescheduled

## Migration

The database migration is located at:
```
database/migrations/003_add_makeup_exception_link.sql
```

To apply:
```sql
-- Run the migration against your D1 database
-- This adds the makeup_for_exception_id column and indexes
```

## Future Enhancements

### Planned Features (Epic 7, Story 7.7)

1. **Admin Dashboard View**
   - List all cancelled classes
   - Filter by makeup status: "Needs Makeup" / "Makeup Scheduled" / "Makeup Completed"
   - Bulk view of outstanding makeups

2. **Notification Integration**
   - Alert when makeup is scheduled
   - Remind about classes needing makeup after 1 week

3. **Reporting**
   - Monthly makeup completion rate
   - Average time to reschedule cancelled classes
   - Students with most outstanding makeups

## Best Practices

### When Recording Makeup Classes

1. **Always link to the original exception** if available:
   ```typescript
   is_makeup: true,
   makeup_for_date: originalDate,
   makeup_for_exception_id: originalException.id  // IMPORTANT!
   ```

2. **If exception ID is unknown**, at minimum provide the date:
   ```typescript
   is_makeup: true,
   makeup_for_date: originalDate,
   // makeup_for_exception_id can be null
   ```

3. **Use clear notes** to explain the makeup:
   ```typescript
   notes: "Makeup for class cancelled on Jan 10 due to student illness"
   ```

### Query Optimization

The indexes ensure these queries are fast:
- Finding all makeups for a specific cancellation
- Finding classes that still need makeup
- Generating weekly/monthly makeup reports

## Related Documentation

- [Epic 7: Rock-Solid Scheduling](../docs/planning/epic-7-rock-solid-scheduling.md)
- [Exception Tracking](../docs/reference/data-models.md#enrollment-exceptions)
- [Completion Records](../docs/reference/data-models.md#class-completions)

## Support

For questions or issues with makeup tracking:
1. Check the schedule generator logs for makeup resolution
2. Verify exception IDs match in the database
3. Ensure migrations have been applied correctly
