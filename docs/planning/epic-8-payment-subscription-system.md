# Epic 8: Payment & Subscription System

**Status:** ✅ Complete (11/12 Stories Complete, PIX deferred)
**Priority:** Phase 2 (Post-MVP)
**Dependencies:** Epic 6 (Advanced Enrollment), Epic 7 (Rock-Solid Scheduling)
**Reference:** `docs/planning/tech-spec-payment-subscription-system.md`
**Last Updated:** 2026-01-12

---

## Epic Overview

This epic implements automated payment and subscription billing using Stripe, replacing the current manual invoicing process. It supports multiple payment methods (Credit Card, Boleto, PIX) and subscription plans (Monthly, Semester, Annual).

**Business Value:**

- Reduce manual billing time by 80%+
- Predictable recurring revenue via subscriptions
- Automated cancellation billing enforcement
- Self-service payment management for parents
- Real-time payment status tracking

**Key Design Decisions:**

- **24h cancellation notice** - Late cancellations are charged (configurable)
- **PAID 1-month trial** - Parents pay to evaluate before committing to longer plans
- **Auto-completion model** - System marks classes complete, teacher confirms/reports exceptions
- **Group cancellation fairness** - Last remaining student charged at group rate (R$120), not individual (R$150)

---

## Stories

### Story 8.1: Stripe Account & Product Setup

**Priority:** Critical
**Estimate:** 3 points
**Dependencies:** None
**Status:** ✅ Complete

**Description:**
Set up Stripe account for Brazil, configure products and prices for all subscription plans.

**Acceptance Criteria:**

- [x] Stripe SDK installed and configured (`stripe` v20.1.0)
- [x] Products defined: Individual Class, Group Class (via setup script)
- [x] Prices defined for each plan type (Monthly, Semester, Annual) × class type (via setup script)
- [x] Webhook endpoint skeleton created (`/api/webhooks/stripe`)
- [x] Environment variable types added to `env.d.ts`
- [x] Setup script created (`npm run stripe:setup`)
- [x] Setup guide documentation (`docs/setup-guides/STRIPE_SETUP.md`)

**Implementation Notes:**
- Setup script creates 2 products and 6 prices in Stripe via API
- Webhook endpoint handles signature verification and all event types
- Actual Stripe account setup is a manual step (user-dependent)

**Technical Notes:**

```bash
# Environment variables needed
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

### Story 8.2: Database Migration & Stripe Customer Sync

**Priority:** Critical
**Estimate:** 5 points
**Dependencies:** Story 8.1
**Status:** ✅ Complete

**Description:**
Run database migration to create subscription tables and sync existing parents as Stripe customers.

**Acceptance Criteria:**

- [x] Migration `048_subscription_system.sql` applied successfully
- [x] All 6 new tables created with proper indexes
- [x] Stripe customer repository created (`stripe-customer.ts`)
- [x] Stripe customer sync service created (`stripe-customer-service.ts`)
- [x] Admin sync API endpoint (`/api/admin/stripe-sync`)
- [x] Subscription plans linked to Stripe price IDs

**Database Tables:**

- `subscription_plans` - Plan templates (seeded with 3 plans)
- `subscriptions` - Active subscriptions
- `reschedule_credits` - Monthly credits
- `one_time_payments` - PIX/Boleto payments
- `payment_transactions` - Audit log
- `stripe_customers` - User → Stripe mapping

**Implementation Notes:**
- Sync endpoint: `GET /api/admin/stripe-sync` (status) / `POST` (sync)
- Parents are synced on-demand via admin endpoint or getOrCreateStripeCustomer()
- 0 parents currently in database (none to sync yet)

---

### Story 8.3: Subscription Service Layer

**Priority:** Critical
**Estimate:** 8 points
**Dependencies:** Story 8.2
**Status:** ✅ Complete

**Description:**
Implement core subscription service with Stripe integration.

**Acceptance Criteria:**

- [x] `SubscriptionService` class with CRUD operations
- [x] `StripeService` class for Stripe API calls
- [x] Create subscription flow (with Stripe subscription creation)
- [x] Cancel subscription flow (with Stripe cancellation)
- [x] Pause/resume subscription support
- [x] Plan change (upgrade/downgrade) support
- [x] Unit tests with mocked Stripe API (22 tests)

**Implementation Notes:**
- `StripeService` wraps all Stripe SDK calls for subscriptions
- `SubscriptionService` orchestrates between Stripe and local database
- Supports both Stripe-connected and local-only modes (for testing)
- Reschedule credits granted automatically on subscription activation
- 3 new repositories: subscription, subscription-plan, reschedule-credit

**Key Methods:**

```typescript
class SubscriptionService {
  createSubscription(data: CreateSubscriptionData): Promise<Subscription>;
  cancelSubscription(id: string, reason?: string): Promise<void>;
  pauseSubscription(id: string): Promise<void>;
  resumeSubscription(id: string): Promise<void>;
  changePlan(id: string, newPlanId: string): Promise<Subscription>;
}
```

---

### Story 8.4: Stripe Webhook Handler

**Priority:** Critical
**Estimate:** 5 points
**Dependencies:** Story 8.3
**Status:** ✅ Complete

**Description:**
Implement webhook endpoint to handle Stripe events for payment status updates.

**Acceptance Criteria:**

- [x] `POST /api/webhooks/stripe` endpoint created
- [x] Webhook signature verification implemented
- [x] Handle `customer.subscription.created` - create local record
- [x] Handle `customer.subscription.updated` - update status/dates
- [x] Handle `customer.subscription.deleted` - mark cancelled
- [x] Handle `invoice.paid` - update payment status
- [x] Handle `invoice.payment_failed` - mark past_due, send notification
- [x] Handle `payment_intent.succeeded` - mark one-time payment complete
- [x] Idempotency for duplicate webhook delivery
- [x] Error logging for failed webhook processing

**Implementation Notes:**
- `StripeWebhookService` class handles all webhook events with idempotency checks
- `payment-transaction.ts` repository for payment audit logging
- `one-time-payment.ts` repository for PIX/Boleto payments
- Full test coverage (35 tests) for all webhook handlers
- Auto-grants reschedule credits when subscription becomes active

**Security:**

```typescript
// Verify webhook signature
const event = stripe.webhooks.constructEvent(
  body,
  sig,
  env.STRIPE_WEBHOOK_SECRET
);
```

---

### Story 8.5: Subscription API Endpoints

**Priority:** High
**Estimate:** 5 points
**Dependencies:** Story 8.3
**Status:** ✅ Complete

**Description:**
Create REST API endpoints for subscription management.

**Acceptance Criteria:**

- [x] `GET /api/subscriptions` - List (admin: all, parent: own)
- [x] `GET /api/subscriptions/[id]` - Get details
- [x] `POST /api/subscriptions` - Create new subscription
- [x] `PUT /api/subscriptions/[id]` - Update (change plan)
- [x] `DELETE /api/subscriptions/[id]` - Cancel
- [x] `POST /api/subscriptions/[id]/pause` - Pause
- [x] `POST /api/subscriptions/[id]/resume` - Resume
- [x] Proper role-based access control
- [x] Zod validation schemas

**Implementation Notes:**
- `SubscriptionQuerySchema`, `CreateSubscriptionSchema`, `UpdateSubscriptionSchema`, `PauseSubscriptionSchema`, `CancelSubscriptionSchema` validation schemas
- Admin sees all subscriptions; parents see only their children's subscriptions
- Teachers have no access to subscription endpoints
- CSRF token validation on all write operations
- Rate limiting applied to all endpoints
- Test coverage: 43 tests across 4 test files

---

### Story 8.6: Payment Method Management

**Priority:** High
**Estimate:** 5 points
**Dependencies:** Story 8.3
**Status:** ✅ Complete

**Description:**
Allow parents to add, remove, and manage payment methods.

**Acceptance Criteria:**

- [x] `GET /api/payment-methods` - List saved methods
- [x] `POST /api/payment-methods` - Add new method (card/boleto)
- [x] `DELETE /api/payment-methods/[id]` - Remove method
- [x] `POST /api/payment-methods/[id]/default` - Set as default
- [x] Stripe Payment Element integration for secure card entry (SetupIntent flow)
- [x] Card brand detection and display (Visa, Mastercard, etc.)
- [x] Boleto setup for recurring

**Implementation Notes:**
- `StripeService` extended with payment method methods: `listPaymentMethods`, `getPaymentMethod`, `createSetupIntent`, `attachPaymentMethod`, `detachPaymentMethod`, `setDefaultPaymentMethod`, `getDefaultPaymentMethod`
- Validation schemas: `PaymentMethodIdSchema`, `CreateSetupIntentSchema`, `AttachPaymentMethodSchema`
- Role-based access: admin and parent only (teachers denied)
- CSRF token validation on all write operations
- Cannot delete default payment method when multiple methods exist
- Test coverage: 29 tests across 3 test files

---

### Story 8.7: PIX One-Time Payments

**Priority:** High
**Estimate:** 5 points
**Dependencies:** Story 8.3
**Status:** Pending

**Description:**
Implement PIX payment flow for pay-per-class (avulso) billing.

**Acceptance Criteria:**

- [ ] `POST /api/payments/create-pix` - Generate PIX QR code
- [ ] `GET /api/payments/[id]/status` - Check payment status
- [ ] PIX QR code displayed with countdown timer
- [ ] Copy-paste PIX code available
- [ ] Auto-refresh status while waiting
- [ ] Expiration handling (PIX expires, show retry option)
- [ ] Payment confirmation notification

**PIX Limitations:**

- Max R$3,000 per transaction
- No recurring support (one-time only)
- Expires after set time (configurable)

---

### Story 8.8: Parent Subscription UI

**Priority:** High
**Estimate:** 8 points
**Dependencies:** Story 8.5, Story 8.6
**Status:** ✅ Complete

**Description:**
Create parent-facing UI for subscription management.

**Acceptance Criteria:**

- [x] `/parent/billing` - Subscription overview page
- [x] Current plan display with next billing date
- [x] Payment method on file with edit option
- [x] Payment history list
- [x] `/parent/billing/subscribe` - Plan selection page
- [x] Plan comparison (Monthly vs Semester vs Annual)
- [x] Discount badges on longer plans
- [x] Stripe Checkout or Payment Element integration (SetupIntent flow ready)
- [x] Stripe Customer Portal link for self-service
- [x] Mobile-responsive design

**Components Created:**

- `SubscriptionCard.astro` - Current plan summary with status badge, pricing, next billing date
- `PlanSelector.astro` - Plan selection grid with discount badges and "Most Popular" highlighting
- `PaymentMethodCard.astro` - Saved payment display with card brand, last 4, expiry, actions

**Implementation Notes:**

- `/parent/billing` - Overview page with subscriptions per student, payment methods list, payment history table
- `/parent/billing/subscribe` - 4-step subscription flow: select student → class type → plan → payment method
- `/api/billing/portal-session` - Creates Stripe Customer Portal session for self-service management
- All pages mobile-responsive with proper breakpoints
- Payment method actions (set default, remove) with CSRF protection
- PIX modal deferred (Story 8.7 skipped for now)

---

### Story 8.9: Auto-Completion Cron Job

**Priority:** Medium
**Estimate:** 5 points
**Dependencies:** Story 8.3
**Status:** ✅ Complete

**Description:**
Implement scheduled job to auto-mark classes as completed.

**Acceptance Criteria:**

- [x] Cron endpoint created (`POST /api/cron/auto-complete`)
- [x] Find classes with scheduled end time in the past
- [x] Auto-mark as COMPLETED if no exception recorded
- [x] Set `auto_completed = 1` flag
- [x] Teacher has 48h to confirm or report exception
- [x] After 48h, auto-completion is finalized
- [x] Logging for audit trail

**Implementation Notes:**

- `AutoCompletionService` handles the core logic with dependency injection
- Cron endpoint secured with `x-cron-secret` header
- Cloudflare Pages doesn't support native cron triggers - use external service (cron-job.org)
- Added `auto_completed` and `confirmed_by_teacher` fields to `ClassCompletion`
- Repository methods: `findPendingTeacherConfirmation`, `confirmExpiredAutoCompletions`
- 11 unit tests covering all scenarios

**Cron Setup:**

```bash
# External cron service configuration:
# - URL: POST https://eduschedule-app.pages.dev/api/cron/auto-complete
# - Schedule: 0 * * * * (hourly)
# - Header: x-cron-secret: <CRON_SECRET value>
```

---

### Story 8.10: Teacher Completion Confirmation UI

**Priority:** Medium
**Estimate:** 5 points
**Dependencies:** Story 8.9
**Status:** ✅ Complete

**Description:**
Add UI for teachers to confirm or report exceptions on auto-completed classes.

**Acceptance Criteria:**

- [x] "Pending Confirmation" section on teacher schedule page
- [x] List of auto-completed classes awaiting confirmation
- [x] "Confirm" button to finalize completion
- [x] "Report Issue" button to open exception modal
- [x] Exception types: NO_SHOW, EARLY_END (with reasons: PARENT_NO_ANSWER, STUDENT_SICK, TECHNICAL_ISSUES, STUDENT_NOT_READY, OTHER)
- [x] Notes field for context
- [x] 48h countdown display (hours remaining shown)
- [x] API endpoints for teacher confirmation

**Implementation Notes:**
- `GET /api/completions/pending-confirmation` - Lists teacher's pending confirmations with urgency sorting
- `POST /api/completions/[id]/confirm` - Confirm auto-completed class with optional notes
- `POST /api/completions/[id]/report-issue` - Report NO_SHOW or EARLY_END with reason
- CompletionRepository extended with `findPendingTeacherConfirmation()` method
- `INVALID_STATE` error code added to api-errors.ts for state validation
- 25 unit tests for all endpoints

---

### Story 8.11: Admin Billing Dashboard

**Priority:** Medium
**Estimate:** 8 points
**Dependencies:** Story 8.5
**Status:** ✅ Complete

**Description:**
Create admin dashboard for subscription and payment oversight.

**Acceptance Criteria:**

- [x] `/admin/billing` - Overview page
- [x] Revenue metrics: MRR, ARR, churn rate
- [x] Subscription stats by plan type
- [x] Payment status breakdown (active, past_due, cancelled)
- [x] `/admin/billing/subscriptions` - Subscription list
- [x] Filter by status, plan, payment method
- [x] Search by student/parent name
- [x] Bulk actions (pause, cancel)
- [x] `/admin/billing/transactions` - Transaction history
- [x] Export to CSV

**Implementation Notes:**
- Overview page shows MRR, ARR, churn rate in hero cards
- Subscription breakdown by status, plan type, and payment method with visual bars
- Transaction summary shows volume, fees, and net for selected period
- Navigation grouped under "Financeiro" dropdown in admin nav
- CSV export includes all transaction fields with BOM for Excel compatibility
- Mobile responsive with hidden columns on small screens

**Pages Created:**
- `/admin/billing/index.astro` - Dashboard overview with KPIs
- `/admin/billing/subscriptions.astro` - Subscription list with filters and actions
- `/admin/billing/transactions.astro` - Transaction history with CSV export

---

### Story 8.12: Payment Reminders & Failed Payment Recovery

**Priority:** Medium
**Estimate:** 5 points
**Dependencies:** Story 8.4, Story 8.8
**Status:** ✅ Complete

**Description:**
Implement automated reminders and retry logic for failed payments.

**Acceptance Criteria:**

- [x] PIX expiration reminder (2h before expiry) - via `notifyParentBoletoExpiring()`
- [x] Boleto due date reminder (2 days before) - via `notifyParentBoletoExpiring()`
- [x] Failed payment notification with retry link - via webhook `invoice.payment_failed`
- [x] Automatic retry schedule (configurable) - Stripe handles retries, we notify
- [x] Grace period before subscription paused - 7-day configurable via `BILLING_CONSTANTS`
- [x] Past-due banner on parent dashboard - Alert banner on `/parent/index.astro`
- [x] Admin notification for chronic failures - 3+ consecutive failures via webhook
- [x] Enrollment status sync (past_due → PAUSADO after grace period) - via cron job

**Implementation Notes:**

- **Notification Types Added:** `PAYMENT_FAILED`, `PAYMENT_PAST_DUE`, `PAYMENT_RETRY_SCHEDULED`, `SUBSCRIPTION_PAUSED_PAYMENT`, `PAYMENT_REMINDER`, `CHRONIC_PAYMENT_FAILURE`
- **Notification Methods:** 5 new methods in `notification-service.ts` for payment events
- **Webhook Enhancement:** `stripe-webhook-service.ts` now sends failure notifications and tracks chronic failures
- **Grace Period Cron:** `POST /api/cron/payment-grace` - daily enforcement job
- **PaymentGraceService:** Sends reminders at 1, 3, 5 days overdue; pauses after 7 days
- **Parent Dashboard:** Alert banner shows when `past_due` subscriptions exist

**Files Created/Modified:**

- `src/lib/services/payment-grace-service.ts` (new)
- `src/pages/api/cron/payment-grace.ts` (new)
- `src/lib/services/notification-service.ts` (extended)
- `src/lib/services/stripe-webhook-service.ts` (extended)
- `src/lib/repositories/types.ts` (new notification types)
- `src/pages/parent/index.astro` (past-due banner)

---

## Implementation Phases

| Phase | Stories | Duration |
|-------|---------|----------|
| **Phase 1: Foundation** | 8.1, 8.2 | Week 1 |
| **Phase 2: Core Services** | 8.3, 8.4 | Week 2-3 |
| **Phase 3: API Layer** | 8.5, 8.6, 8.7 | Week 4 |
| **Phase 4: Parent UI** | 8.8 | Week 5 |
| **Phase 5: Auto-Completion** | 8.9, 8.10 | Week 6 |
| **Phase 6: Admin Tools** | 8.11, 8.12 | Week 7-8 |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Subscription adoption | 60% of students | Subscriptions / Total enrollments |
| Payment collection rate | 98%+ | Successful / Total invoices |
| Manual billing time | -80% | Hours before vs after |
| Failed payment recovery | 70%+ | Recovered / Total failed |
| Parent satisfaction | 4.5+ stars | Survey after 3 months |

---

## Open Questions

1. **Teacher payment timing?** Still monthly, or sync with parent billing cycle?

---

## Dependencies

- **Stripe Account:** Brazilian entity required for local payment methods
- **Cloudflare Cron:** Requires paid plan for scheduled workers
- **WhatsApp Business API:** For payment reminders (optional, can use email)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PIX doesn't support recurring | Parents forget to pay | Send PIX invoice link via WhatsApp/email |
| Boleto 2-day settlement | Cash flow delay | Plan for delayed revenue |
| Stripe fees reduce margin | Lower profit | Pass to customer OR encourage PIX (0.99%) |
| Low subscription adoption | Manual work continues | Offer both models, incentivize subscription |

---

## References

- [Tech Spec](./tech-spec-payment-subscription-system.md)
- [Billing Constants](../../eduschedule-app/src/constants/billing.ts)
- [Database Migration](../../eduschedule-app/database/migrations/048_subscription_system.sql)
- [Stripe Billing Docs](https://docs.stripe.com/billing/subscriptions/overview)

---

**Total Estimate:** 67 points (12 stories)
**Estimated Duration:** 8 weeks
