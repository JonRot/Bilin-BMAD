/**
 * Push Notification Schemas - EduSchedule Pro
 *
 * Defines the payload structures for all push notifications.
 * These schemas are used by:
 * - Cloudflare Workers (sending notifications)
 * - Native shell (receiving and displaying)
 * - Astro app (handling notification taps)
 */

// =============================================================================
// Base Notification Structure
// =============================================================================

export interface BasePushNotification {
  /** Unique notification ID for deduplication */
  notificationId: string;
  /** Notification type for routing */
  type: NotificationType;
  /** Display title (localized) */
  title: string;
  /** Display body (localized) */
  body: string;
  /** When the notification was created */
  createdAt: string; // ISO 8601
  /** Badge count to display on app icon */
  badge?: number;
  /** Sound to play (default, none, or custom) */
  sound?: 'default' | 'none' | string;
  /** Deep link to open when tapped */
  deepLink?: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export type NotificationType =
  | 'class_reminder'
  | 'class_cancelled'
  | 'class_rescheduled'
  | 'class_completed'
  | 'new_booking'
  | 'booking_confirmed'
  | 'payment_due'
  | 'payment_received'
  | 'teacher_note'
  | 'availability_approved'
  | 'availability_rejected'
  | 'lead_matched'
  | 'lead_converted'
  | 'status_change'
  | 'system_announcement';

// =============================================================================
// Class-Related Notifications
// =============================================================================

export interface ClassReminderNotification extends BasePushNotification {
  type: 'class_reminder';
  data: {
    enrollmentId: string;
    classDate: string; // ISO 8601
    classTime: string; // HH:mm
    studentName: string;
    teacherName: string;
    /** Minutes until class starts */
    minutesUntil: number;
  };
}

export interface ClassCancelledNotification extends BasePushNotification {
  type: 'class_cancelled';
  data: {
    enrollmentId: string;
    classDate: string;
    classTime: string;
    studentName: string;
    teacherName: string;
    /** Who cancelled: 'teacher' | 'parent' | 'admin' */
    cancelledBy: 'teacher' | 'parent' | 'admin';
    reason?: string;
  };
}

export interface ClassRescheduledNotification extends BasePushNotification {
  type: 'class_rescheduled';
  data: {
    enrollmentId: string;
    originalDate: string;
    originalTime: string;
    newDate: string;
    newTime: string;
    studentName: string;
    teacherName: string;
  };
}

export interface ClassCompletedNotification extends BasePushNotification {
  type: 'class_completed';
  data: {
    enrollmentId: string;
    classDate: string;
    studentName: string;
    teacherName: string;
    hasNote: boolean;
  };
}

// =============================================================================
// Booking Notifications
// =============================================================================

export interface NewBookingNotification extends BasePushNotification {
  type: 'new_booking';
  data: {
    enrollmentId: string;
    studentName: string;
    teacherName: string;
    dayOfWeek: string;
    time: string;
    /** Monthly rate in BRL */
    monthlyRate: number;
  };
}

export interface BookingConfirmedNotification extends BasePushNotification {
  type: 'booking_confirmed';
  data: {
    enrollmentId: string;
    studentName: string;
    teacherName: string;
    startDate: string;
  };
}

// =============================================================================
// Payment Notifications
// =============================================================================

export interface PaymentDueNotification extends BasePushNotification {
  type: 'payment_due';
  data: {
    invoiceId: string;
    /** Amount in BRL */
    amount: number;
    dueDate: string;
    studentNames: string[];
  };
}

export interface PaymentReceivedNotification extends BasePushNotification {
  type: 'payment_received';
  data: {
    invoiceId: string;
    amount: number;
    paidDate: string;
  };
}

// =============================================================================
// Teacher Notifications
// =============================================================================

export interface TeacherNoteNotification extends BasePushNotification {
  type: 'teacher_note';
  data: {
    enrollmentId: string;
    classDate: string;
    studentName: string;
    teacherName: string;
    /** Preview of the note (truncated) */
    notePreview: string;
  };
}

export interface AvailabilityApprovedNotification extends BasePushNotification {
  type: 'availability_approved';
  data: {
    teacherId: string;
    approvedSlots: number;
  };
}

export interface AvailabilityRejectedNotification extends BasePushNotification {
  type: 'availability_rejected';
  data: {
    teacherId: string;
    reason?: string;
  };
}

// =============================================================================
// Lead Notifications
// =============================================================================

export interface LeadMatchedNotification extends BasePushNotification {
  type: 'lead_matched';
  data: {
    leadId: string;
    studentName: string;
    teacherName: string;
    matchScore: number;
  };
}

export interface LeadConvertedNotification extends BasePushNotification {
  type: 'lead_converted';
  data: {
    leadId: string;
    enrollmentId: string;
    studentName: string;
  };
}

// =============================================================================
// Status Notifications
// =============================================================================

export interface StatusChangeNotification extends BasePushNotification {
  type: 'status_change';
  data: {
    enrollmentId: string;
    studentName: string;
    previousStatus: string;
    newStatus: string;
    /** e.g., 'ATIVO' -> 'PAUSADO' */
    reason?: string;
  };
}

// =============================================================================
// System Notifications
// =============================================================================

export interface SystemAnnouncementNotification extends BasePushNotification {
  type: 'system_announcement';
  data: {
    announcementId: string;
    priority: 'low' | 'normal' | 'high';
    expiresAt?: string;
  };
}

// =============================================================================
// Union Type for All Notifications
// =============================================================================

export type PushNotification =
  | ClassReminderNotification
  | ClassCancelledNotification
  | ClassRescheduledNotification
  | ClassCompletedNotification
  | NewBookingNotification
  | BookingConfirmedNotification
  | PaymentDueNotification
  | PaymentReceivedNotification
  | TeacherNoteNotification
  | AvailabilityApprovedNotification
  | AvailabilityRejectedNotification
  | LeadMatchedNotification
  | LeadConvertedNotification
  | StatusChangeNotification
  | SystemAnnouncementNotification;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate deep link for notification
 */
export function getDeepLink(notification: PushNotification): string {
  switch (notification.type) {
    case 'class_reminder':
    case 'class_cancelled':
    case 'class_rescheduled':
    case 'class_completed':
      return `/parent/schedule?date=${notification.data.classDate}`;

    case 'new_booking':
    case 'booking_confirmed':
    case 'status_change':
      return `/parent/students`;

    case 'payment_due':
    case 'payment_received':
      return `/parent/invoice`;

    case 'teacher_note':
      return `/parent/history?enrollment=${notification.data.enrollmentId}`;

    case 'availability_approved':
    case 'availability_rejected':
      return `/teacher/availability`;

    case 'lead_matched':
    case 'lead_converted':
      return `/admin/leads`;

    case 'system_announcement':
      return `/`;

    default:
      return `/`;
  }
}

/**
 * Get notification priority for OS handling
 */
export function getNotificationPriority(type: NotificationType): 'high' | 'normal' | 'low' {
  const highPriority: NotificationType[] = [
    'class_reminder',
    'class_cancelled',
    'payment_due',
  ];

  const lowPriority: NotificationType[] = [
    'system_announcement',
    'class_completed',
  ];

  if (highPriority.includes(type)) return 'high';
  if (lowPriority.includes(type)) return 'low';
  return 'normal';
}
