# Notifications Page Feature Plan

**Status:** Future Enhancement
**Priority:** Low
**Created:** 2026-01-02

## Overview

Add a dedicated notifications page (`/notifications` or role-specific routes) where users can view their notification history with filtering, pagination, and bulk actions.

## Current State

- Notification bell in Nav shows recent 5 notifications in dropdown
- Clicking a notification navigates to its linked page
- "Mark all as read" clears unread status
- No dedicated page to view full notification history

## Requirements to Evaluate

### Admin Notifications Page
Admins may need more advanced features:
- View all notifications (not just recent 5)
- Filter by notification type
- Filter by date range
- Search notifications
- Bulk actions (mark as read, delete)
- Pagination for large history
- Possibly view notifications across the system (not just their own)

### Teacher/Parent Notifications Page
Simpler requirements:
- View their notification history
- Basic filtering (read/unread)
- Pagination
- Mark as read functionality

## Questions to Answer Before Implementation

1. **Do teachers and parents need separate notification pages?**
   - Or can we use the same page with role-based features hidden?

2. **What notification types exist for each role?**
   - Admin: pausado requests, change requests, time-off requests, system alerts
   - Teacher: schedule changes, time-off approvals, student updates
   - Parent: class cancellations, status changes, invoices

3. **How long should notification history be retained?**
   - 30 days? 90 days? Forever?

4. **Should admins see all system notifications or just their own?**
   - Use case: audit trail, troubleshooting

5. **Do we need notification preferences/settings?**
   - Email vs in-app preferences
   - Notification type preferences

## Proposed Routes

```
/admin/notifications     - Full-featured admin notifications page
/teacher/notifications   - Teacher notifications history
/parent/notifications    - Parent notifications history
```

Or simpler:
```
/notifications           - Role-aware page that adapts to user role
```

## Implementation Considerations

- Reuse existing `notifications` table
- Add pagination API endpoint
- Consider lazy loading for performance
- Mobile-responsive design
- Empty state when no notifications

## Not in Scope (for initial version)

- Push notifications (browser/mobile)
- Email notification preferences
- Notification categories/folders
- Notification scheduling

---

**Next Steps:** Evaluate requirements with stakeholders before implementation. This is a quality-of-life feature, not critical for MVP.
