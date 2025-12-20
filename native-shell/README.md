# Native Shell - EduSchedule Pro

Minimal native wrapper for iOS and Android. **All business logic lives on the edge.**

## Architecture

This shell follows the [Edge Architecture Spec](../docs/claude-edge-architecture-system-prompt.md):

- **WebView renders the Astro interface** - No native UI screens
- **No business logic** - Scheduling, matching, billing all happen on Cloudflare Workers
- **Bridge for native capabilities only**

## Shell Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Push Tokens | Register APNs (iOS) / FCM (Android) tokens with backend |
| WebView | Render `https://eduschedule-app.pages.dev` |
| Device Permissions | Camera, microphone, file picker, location |
| Offline Fallback | Minimal cached state for connectivity issues |
| Secure Bridge | postMessage communication between WebView and native |

## Folder Structure

```
native-shell/
├── ios/                 # Xcode project
├── android/             # Android Studio project
└── shared/              # Cross-platform contracts
    ├── bridge-contract.ts   # WebView ↔ Native message types
    └── push-schemas.ts      # Push notification payload schemas
```

## What Does NOT Belong Here

- UI layouts or screens
- Scheduling logic
- Teacher/parent matching
- Availability calculations
- Booking workflows
- Billing logic

All of the above must remain on Cloudflare Workers.

## Bridge Contract

See `shared/bridge-contract.ts` for the WebView ↔ Native communication protocol.

### Example: Push Token Registration

```typescript
// WebView → Native
{ type: 'REQUEST_PUSH_TOKEN' }

// Native → WebView
{ type: 'PUSH_TOKEN_RESULT', token: 'abc123...', platform: 'ios' }
```

### Example: Device Permission

```typescript
// WebView → Native
{ type: 'REQUEST_PERMISSION', permission: 'camera' }

// Native → WebView
{ type: 'PERMISSION_RESULT', permission: 'camera', granted: true }
```
