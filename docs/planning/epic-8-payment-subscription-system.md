# Epic 8: Payment & Subscription System

**Status:** In Progress (5/12 Stories Complete)
**Priority:** Phase 2 (Post-MVP)
**Dependencies:** Epic 6 (Advanced Enrollment), Epic 7 (Rock-Solid Scheduling)
**Reference:** `docs/planning/tech-spec-payment-subscription-system.md`
**Last Updated:** 2026-01-06

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
**Status:** Pending

**Description:**
Allow parents to add, remove, and manage payment methods.

**Acceptance Criteria:**

- [ ] `GET /api/payment-methods` - List saved methods
- [ ] `POST /api/payment-methods` - Add new method (card/boleto)
- [ ] `DELETE /api/payment-methods/[id]` - Remove method
- [ ] `POST /api/payment-methods/[id]/default` - Set as default
- [ ] Stripe Payment Element integration for secure card entry
- [ ] Card brand detection and display (Visa, Mastercard, etc.)
- [ ] Boleto setup for recurring

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
**Status:** Pending

**Description:**
Create parent-facing UI for subscription management.

**Acceptance Criteria:**

- [ ] `/parent/billing` - Subscription overview page
- [ ] Current plan display with next billing date
- [ ] Payment method on file with edit option
- [ ] Payment history list
- [ ] `/parent/billing/subscribe` - Plan selection page
- [ ] Plan comparison (Monthly vs Semester vs Annual)
- [ ] Discount badges on longer plans
- [ ] Stripe Checkout or Payment Element integration
- [ ] Stripe Customer Portal link for self-service
- [ ] Mobile-responsive design

**Components:**

- `SubscriptionCard.astro` - Current plan summary
- `PlanSelector.astro` - Plan selection grid
- `PaymentMethodCard.astro` - Saved payment display
- `PixPaymentModal.astro` - PIX QR code display

---

### Story 8.9: Auto-Completion Cron Job

**Priority:** Medium
**Estimate:** 5 points
**Dependencies:** Story 8.3
**Status:** Pending

**Description:**
Implement scheduled job to auto-mark classes as completed.

**Acceptance Criteria:**

- [ ] Cloudflare Cron trigger (hourly)
- [ ] Find classes with scheduled end time in the past
- [ ] Auto-mark as COMPLETED if no exception recorded
- [ ] Set `auto_completed = 1` flag
- [ ] Teacher has 48h to confirm or report exception
- [ ] After 48h, auto-completion is finalized
- [ ] Logging for audit trail

**Cron Config:**

```toml
# wrangler.toml
[triggers]
crons = ["0 * * * *"]  # Every hour
```

---

### Story 8.10: Teacher Completion Confirmation UI

**Priority:** Medium
**Estimate:** 5 points
**Dependencies:** Story 8.9
**Status:** Pending

**Description:**
Add UI for teachers to confirm or report exceptions on auto-completed classes.

**Acceptance Criteria:**

- [ ] "Pending Confirmation" section on teacher schedule page
- [ ] List of auto-completed classes awaiting confirmation
- [ ] "Confirm" button to finalize completion
- [ ] "Report Issue" button to open exception modal
- [ ] Exception types: NO_SHOW, SICK_STUDENT, EARLY_END, OTHER
- [ ] Notes field for context
- [ ] 48h countdown display
- [ ] Notification when confirmation needed

---

### Story 8.11: Admin Billing Dashboard

**Priority:** Medium
**Estimate:** 8 points
**Dependencies:** Story 8.5
**Status:** Pending

**Description:**
Create admin dashboard for subscription and payment oversight.

**Acceptance Criteria:**

- [ ] `/admin/billing` - Overview page
- [ ] Revenue metrics: MRR, ARR, churn rate
- [ ] Subscription stats by plan type
- [ ] Payment status breakdown (active, past_due, cancelled)
- [ ] `/admin/billing/subscriptions` - Subscription list
- [ ] Filter by status, plan, payment method
- [ ] Search by student/parent name
- [ ] Bulk actions (pause, cancel)
- [ ] `/admin/billing/transactions` - Transaction history
- [ ] Export to CSV

**Components:**

- `RevenueStats.astro` - KPI cards
- `SubscriptionTable.astro` - Filterable list
- `TransactionLog.astro` - Payment history

---

### Story 8.12: Payment Reminders & Failed Payment Recovery

**Priority:** Medium
**Estimate:** 5 points
**Dependencies:** Story 8.4, Story 8.8
**Status:** Pending

**Description:**
Implement automated reminders and retry logic for failed payments.

**Acceptance Criteria:**

- [ ] PIX expiration reminder (2h before expiry)
- [ ] Boleto due date reminder (2 days before)
- [ ] Failed payment notification with retry link
- [ ] Automatic retry schedule (configurable)
- [ ] Grace period before subscription paused
- [ ] Past-due banner on parent dashboard
- [ ] Admin notification for chronic failures
- [ ] Enrollment status sync (past_due → PAUSADO after grace period)

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
