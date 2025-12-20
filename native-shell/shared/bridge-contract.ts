/**
 * WebView ↔ Native Bridge Contract
 *
 * All communication between the Astro WebView and native shell
 * uses postMessage with these typed payloads.
 */

// =============================================================================
// WebView → Native Messages
// =============================================================================

export type WebViewToNativeMessage =
  | { type: 'REQUEST_PUSH_TOKEN' }
  | { type: 'REQUEST_PERMISSION'; permission: PermissionType }
  | { type: 'OPEN_FILE_PICKER'; accept?: string }
  | { type: 'GET_DEVICE_INFO' }
  | { type: 'SET_BADGE_COUNT'; count: number }
  | { type: 'HAPTIC_FEEDBACK'; style: HapticStyle };

export type PermissionType = 'camera' | 'microphone' | 'location' | 'notifications';
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

// =============================================================================
// Native → WebView Messages
// =============================================================================

export type NativeToWebViewMessage =
  | { type: 'PUSH_TOKEN_RESULT'; token: string | null; platform: 'ios' | 'android'; error?: string }
  | { type: 'PERMISSION_RESULT'; permission: PermissionType; granted: boolean }
  | { type: 'FILE_PICKED'; uri: string | null; name?: string; mimeType?: string }
  | { type: 'DEVICE_INFO'; info: DeviceInfo }
  | { type: 'PUSH_NOTIFICATION_RECEIVED'; payload: PushPayload }
  | { type: 'APP_STATE_CHANGED'; state: AppState };

export interface DeviceInfo {
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  deviceModel: string;
  locale: string;
  timezone: string;
}

export type AppState = 'active' | 'inactive' | 'background';

// =============================================================================
// Push Notification Payloads
// =============================================================================

export interface PushPayload {
  notificationId: string;
  type: PushNotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type PushNotificationType =
  | 'class_reminder'      // 15min before class
  | 'class_cancelled'     // Teacher/parent cancelled
  | 'class_rescheduled'   // Time changed
  | 'new_booking'         // New enrollment confirmed
  | 'payment_due'         // Invoice reminder
  | 'teacher_note'        // Teacher added note after class
  | 'availability_change' // Teacher availability updated
  | 'lead_matched';       // New lead matched to teacher

// =============================================================================
// Bridge Utilities
// =============================================================================

/**
 * Send message from WebView to native
 * Usage in Astro: sendToNative({ type: 'REQUEST_PUSH_TOKEN' })
 */
export function sendToNative(message: WebViewToNativeMessage): void {
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
  } else if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.native) {
    (window as any).webkit.messageHandlers.native.postMessage(message);
  } else if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
    (window as any).AndroidBridge.postMessage(JSON.stringify(message));
  }
}

/**
 * Listen for messages from native
 * Usage in Astro: listenToNative((msg) => console.log(msg))
 */
export function listenToNative(callback: (message: NativeToWebViewMessage) => void): () => void {
  const handler = (event: MessageEvent) => {
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      callback(message as NativeToWebViewMessage);
    } catch {
      // Ignore non-JSON messages
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
