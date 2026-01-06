# Tech Spec: Payment & Subscription System

**Status:** Draft
**Author:** Claude (AI)
**Created:** 2026-01-06
**Epic:** Phase 2 - Payment Integration
**Priority:** High

---

## 1. Overview

### 1.1 Problem Statement

Currently, BILIN Method operates on a post-pay invoicing model where:
- Teachers manually track classes taught
- Financial person manually bills parents at month end
- Parents pay via PIX or Boleto (manual process)
- This doesn't scale and is prone to errors

### 1.2 Proposed Solution

Implement a hybrid payment system supporting:
1. **Subscription billing** (credit card, Boleto) - predictable monthly revenue
2. **One-time payments** (PIX) - for parents who prefer flexibility
3. **Package plans** (semester/annual) - with discounts for commitment

### 1.3 Key Changes

| Current State | Future State |
|---------------|--------------|
| Teacher manually marks attendance | System auto-marks as COMPLETED, teacher confirms or reports exception |
| Post-pay (pay after classes happen) | Pre-pay subscription OR post-pay one-time |
| Manual invoicing | Automated Stripe invoicing |
| No cancellation tracking | Cancellation within policy = reschedule credit |

---

## 2. Business Rules

### 2.1 Cancellation Policy

```typescript
// src/constants/billing.ts
export const BILLING_CONSTANTS = {
  /**
   * Minimum hours notice required for free cancellation.
   * Classes cancelled with less notice are charged.
   *
   * CONFIGURABLE: Change this value to adjust policy (e.g., 24 → 48)
   */
  CANCELLATION_NOTICE_HOURS: 24,

  /**
   * Maximum reschedule credits per month for subscription plans.
   * Unused credits do NOT roll over.
   */
  MAX_RESCHEDULE_CREDITS_PER_MONTH: 1,

  /**
   * Days within which a reschedule credit must be used.
   * After this period, the credit expires.
   */
  RESCHEDULE_CREDIT_EXPIRY_DAYS: 30,

  /**
   * Grace period for late payments before subscription is paused.
   */
  PAYMENT_GRACE_PERIOD_DAYS: 7,
} as const;
```

### 2.2 Cancellation Logic

```
IF cancellation_time >= CANCELLATION_NOTICE_HOURS before class:
  → Class NOT charged
  → If subscription: 1 reschedule credit granted (max 1/month)
  → If one-time: No charge this class

IF cancellation_time < CANCELLATION_NOTICE_HOURS before class:
  → Class IS charged (subscription continues, or one-time billed)
  → No reschedule credit

IF cancellation reason = "SICK" (student or teacher):
  → Class NOT charged regardless of notice
  → Reschedule credit granted

IF teacher cancels:
  → Class NOT charged
  → Reschedule credit ALWAYS granted
  → Teacher may receive penalty (future feature)
```

### 2.3 Plan Types & Pricing

| Plan Type | Billing Frequency | Discount | Payment Methods | Cancellation |
|-----------|-------------------|----------|-----------------|--------------|
| **Mensal** (Monthly) | Monthly | 0% | Credit Card, Boleto | 1 reschedule/month |
| **Semestral** (6 months) | Upfront OR 6 installments | 10% | Credit Card, Boleto | 1 reschedule/month |
| **Anual** (12 months) | Upfront OR 12 installments | 15% | Credit Card, Boleto | 1 reschedule/month |
| **Avulso** (Pay-per-class) | Per invoice | 0% | PIX, Boleto | No commitment |

### 2.4 Class Completion Model Change

**Current Model (Opt-in):**
```
Class scheduled → Teacher marks COMPLETED → Billing triggered
```

**New Model (Opt-out):**
```
Class scheduled → System auto-marks COMPLETED at scheduled end time → Teacher confirms OR reports exception
```

**Exception Types:**
- `NO_SHOW` - Student didn't show up (still charged)
- `CANCELLED_STUDENT` - Student cancelled (policy applies)
- `CANCELLED_TEACHER` - Teacher cancelled (not charged)
- `SICK_STUDENT` - Student sick (not charged)
- `SICK_TEACHER` - Teacher sick (not charged)
- `EARLY_END` - Class ended early (partial charge TBD)

---

## 3. Stripe Integration Research

### 3.1 Payment Method Support in Brazil

| Method | Stripe Support | Recurring | Use Case |
|--------|---------------|-----------|----------|
| **Credit Card** | ✅ Full | ✅ Yes | Primary subscription method |
| **Boleto** | ✅ Full | ✅ Yes | Subscription fallback, one-time |
| **PIX** | ✅ Full | ❌ No | One-time payments only |
| **Bank Debit** | ⚠️ Limited | ❌ No | Not recommended |

### 3.2 Stripe Products Needed

1. **Stripe Billing** - Subscription management, invoicing
2. **Stripe Customer Portal** - Self-service for parents (update payment, view invoices)
3. **Stripe Webhooks** - Real-time event handling
4. **Stripe Tax** (optional) - Brazilian tax compliance (ISS)

### 3.3 Key Stripe Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| PIX max R$3,000/tx | Fine for monthly billing | Split for semester/annual |
| PIX no recurring | Parents must pay manually each month | Send PIX invoice link via email/WhatsApp |
| Boleto R$5-R$49,999 | Fine for our use case | None needed |
| Boleto 2-day settlement | Cash flow delay | Plan for it |
| Boleto no refunds | Can't refund via Stripe | Manual bank transfer for refunds |

### 3.4 Stripe Pricing (Brazil)

| Fee Type | Credit Card | Boleto | PIX |
|----------|-------------|--------|-----|
| Transaction | 3.99% + R$0.39 | R$3.49 flat | 0.99% |
| Chargebacks | R$75 each | N/A | N/A |
| Monthly | R$0 (no monthly fee) | R$0 | R$0 |

**Recommendation:** Encourage PIX for one-time (lowest fee), Credit Card for subscription (convenience).

---

## 4. Database Schema

### 4.1 New Tables

```sql
-- Migration: 048_subscription_system.sql

-- Subscription plans (templates)
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,                    -- 'Mensal', 'Semestral', 'Anual'
  slug TEXT NOT NULL UNIQUE,             -- 'monthly', 'semester', 'annual'
  billing_interval TEXT NOT NULL,        -- 'month', 'semester', 'year'
  billing_interval_count INTEGER NOT NULL DEFAULT 1,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  reschedule_credits_per_month INTEGER NOT NULL DEFAULT 1,
  stripe_product_id TEXT,                -- Stripe product ID
  stripe_price_id_individual TEXT,       -- Stripe price for individual classes
  stripe_price_id_group TEXT,            -- Stripe price for group classes
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Customer subscriptions
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id TEXT REFERENCES enrollments(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE,    -- Stripe subscription ID
  stripe_customer_id TEXT NOT NULL,      -- Stripe customer ID
  payment_method TEXT NOT NULL,          -- 'credit_card', 'boleto', 'pix'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'paused', 'cancelled', 'past_due'
  current_period_start INTEGER,          -- Unix timestamp
  current_period_end INTEGER,            -- Unix timestamp
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  cancelled_at INTEGER,
  cancellation_reason TEXT,
  base_amount_centavos INTEGER NOT NULL, -- Monthly amount in centavos
  discount_amount_centavos INTEGER NOT NULL DEFAULT 0,
  final_amount_centavos INTEGER NOT NULL, -- After discount
  classes_per_week INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Reschedule credits (for subscription plans)
CREATE TABLE reschedule_credits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,              -- 'YYYY-MM' format
  credits_granted INTEGER NOT NULL DEFAULT 1,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One-time payments (for PIX / pay-per-class)
CREATE TABLE one_time_payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id TEXT REFERENCES enrollments(id) ON DELETE SET NULL,
  completion_id TEXT REFERENCES class_completions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  payment_method TEXT NOT NULL,          -- 'pix', 'boleto', 'credit_card'
  amount_centavos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'succeeded', 'failed', 'refunded'
  pix_qr_code TEXT,                      -- PIX QR code data
  pix_expiration INTEGER,                -- PIX expiry timestamp
  boleto_url TEXT,                       -- Boleto PDF URL
  boleto_expiration INTEGER,             -- Boleto due date
  paid_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Payment history (all transactions)
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  one_time_payment_id TEXT REFERENCES one_time_payments(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  type TEXT NOT NULL,                    -- 'subscription', 'one_time', 'refund'
  payment_method TEXT NOT NULL,
  amount_centavos INTEGER NOT NULL,
  fee_centavos INTEGER,                  -- Stripe fee
  net_centavos INTEGER,                  -- After fees
  status TEXT NOT NULL,                  -- 'pending', 'succeeded', 'failed', 'refunded'
  failure_reason TEXT,
  metadata TEXT,                         -- JSON for additional data
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Stripe customers (link parents to Stripe)
CREATE TABLE stripe_customers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  default_payment_method TEXT,           -- 'credit_card', 'boleto'
  stripe_payment_method_id TEXT,         -- Default card/boleto ID
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_reschedule_credits_lookup ON reschedule_credits(subscription_id, month_year);
CREATE INDEX idx_one_time_payments_student ON one_time_payments(student_id);
CREATE INDEX idx_one_time_payments_status ON one_time_payments(status);
CREATE INDEX idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX idx_stripe_customers_user ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe ON stripe_customers(stripe_customer_id);
```

### 4.2 Modified Tables

```sql
-- Add to enrollments table
ALTER TABLE enrollments ADD COLUMN billing_type TEXT DEFAULT 'subscription'; -- 'subscription', 'one_time'
ALTER TABLE enrollments ADD COLUMN subscription_id TEXT REFERENCES subscriptions(id);

-- Add to class_completions table
ALTER TABLE class_completions ADD COLUMN auto_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class_completions ADD COLUMN confirmed_by_teacher INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class_completions ADD COLUMN confirmed_at INTEGER;
ALTER TABLE class_completions ADD COLUMN charged INTEGER NOT NULL DEFAULT 1; -- 0 if not charged (sick, etc)
ALTER TABLE class_completions ADD COLUMN charge_reason TEXT; -- Why charged or not charged

-- Add to students table (for Stripe customer linking)
ALTER TABLE students ADD COLUMN stripe_customer_id TEXT;
```

### 4.3 Seed Data for Plans

```sql
-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, slug, billing_interval, billing_interval_count, discount_percent, reschedule_credits_per_month, is_active)
VALUES
  ('plan_monthly', 'Mensal', 'monthly', 'month', 1, 0, 1, 1),
  ('plan_semester', 'Semestral', 'semester', 'month', 6, 10, 1, 1),
  ('plan_annual', 'Anual', 'annual', 'month', 12, 15, 1, 1);
```

---

## 5. API Endpoints

### 5.1 Subscription Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/subscriptions` | List subscriptions (admin: all, parent: own) |
| `GET` | `/api/subscriptions/[id]` | Get subscription details |
| `POST` | `/api/subscriptions` | Create new subscription |
| `PUT` | `/api/subscriptions/[id]` | Update subscription (change plan, pause, resume) |
| `DELETE` | `/api/subscriptions/[id]` | Cancel subscription |
| `POST` | `/api/subscriptions/[id]/pause` | Pause subscription |
| `POST` | `/api/subscriptions/[id]/resume` | Resume paused subscription |

### 5.2 Payment Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/payment-methods` | List saved payment methods |
| `POST` | `/api/payment-methods` | Add new payment method |
| `DELETE` | `/api/payment-methods/[id]` | Remove payment method |
| `POST` | `/api/payment-methods/[id]/default` | Set as default |

### 5.3 One-Time Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payments/create-pix` | Generate PIX QR code for payment |
| `POST` | `/api/payments/create-boleto` | Generate Boleto for payment |
| `GET` | `/api/payments/[id]/status` | Check payment status |

### 5.4 Stripe Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/stripe` | Handle Stripe webhook events |

### 5.5 Customer Portal

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stripe/create-portal-session` | Create Stripe Customer Portal session |

---

## 6. Service Layer

### 6.1 New Services

```typescript
// src/lib/services/subscription-service.ts
export class SubscriptionService {
  // Core subscription operations
  async createSubscription(data: CreateSubscriptionData): Promise<Subscription>;
  async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription>;
  async cancelSubscription(id: string, reason?: string): Promise<void>;
  async pauseSubscription(id: string): Promise<void>;
  async resumeSubscription(id: string): Promise<void>;

  // Billing operations
  async calculateMonthlyAmount(enrollment: Enrollment, plan: SubscriptionPlan): Promise<number>;
  async applyDiscount(amount: number, discountPercent: number): Promise<number>;

  // Credit management
  async grantRescheduleCredit(subscriptionId: string): Promise<void>;
  async useRescheduleCredit(subscriptionId: string, enrollmentId: string): Promise<boolean>;
  async getRescheduleCredits(subscriptionId: string): Promise<RescheduleCredit[]>;
}

// src/lib/services/payment-service.ts
export class PaymentService {
  // Payment creation
  async createPixPayment(data: CreatePixPaymentData): Promise<PixPayment>;
  async createBoletoPayment(data: CreateBoletoPaymentData): Promise<BoletoPayment>;

  // Payment status
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  async processPaymentWebhook(event: Stripe.Event): Promise<void>;

  // Refunds
  async createRefund(paymentId: string, amount?: number): Promise<Refund>;
}

// src/lib/services/stripe-service.ts
export class StripeService {
  // Customer management
  async createCustomer(user: User): Promise<Stripe.Customer>;
  async getCustomer(stripeCustomerId: string): Promise<Stripe.Customer>;

  // Subscription management
  async createStripeSubscription(data: CreateStripeSubscriptionData): Promise<Stripe.Subscription>;
  async updateStripeSubscription(subscriptionId: string, data: UpdateData): Promise<Stripe.Subscription>;
  async cancelStripeSubscription(subscriptionId: string): Promise<void>;

  // Payment methods
  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]>;

  // One-time payments
  async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent>;
  async createPixCharge(paymentIntentId: string): Promise<PixChargeData>;
  async createBoleto(invoiceId: string): Promise<BoletoData>;

  // Customer Portal
  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session>;
}

// src/lib/services/auto-completion-service.ts
export class AutoCompletionService {
  /**
   * Called by scheduled job (Cloudflare Cron) to auto-complete classes.
   * Runs every hour, marks classes as COMPLETED if:
   * - Scheduled end time has passed
   * - No exception was recorded
   * - Not already completed
   */
  async autoCompleteClasses(): Promise<AutoCompleteResult>;

  /**
   * Teacher confirms or reports exception for auto-completed class.
   */
  async confirmCompletion(completionId: string, teacherId: string): Promise<void>;
  async reportException(completionId: string, exception: ExceptionType, reason?: string): Promise<void>;
}
```

### 6.2 Cancellation Logic Service

```typescript
// src/lib/services/cancellation-billing-service.ts
import { BILLING_CONSTANTS } from '@/constants/billing';

export class CancellationBillingService {
  /**
   * Determines if a cancellation should be charged based on policy.
   */
  shouldChargeForCancellation(
    cancellationTime: Date,
    classTime: Date,
    reason: CancellationReason
  ): { charged: boolean; reason: string } {
    // Sick is always free
    if (reason === 'SICK_STUDENT' || reason === 'SICK_TEACHER') {
      return { charged: false, reason: 'Doença - sem cobrança' };
    }

    // Teacher cancellation is always free
    if (reason === 'CANCELLED_TEACHER') {
      return { charged: false, reason: 'Cancelamento pela professora - sem cobrança' };
    }

    // Check notice period
    const hoursNotice = (classTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60);

    if (hoursNotice >= BILLING_CONSTANTS.CANCELLATION_NOTICE_HOURS) {
      return { charged: false, reason: `Cancelado com ${Math.floor(hoursNotice)}h de antecedência` };
    }

    return {
      charged: true,
      reason: `Cancelado com menos de ${BILLING_CONSTANTS.CANCELLATION_NOTICE_HOURS}h de antecedência`
    };
  }

  /**
   * Grants reschedule credit if eligible.
   */
  async handleCancellationCredit(
    subscriptionId: string,
    cancellationResult: { charged: boolean }
  ): Promise<{ creditGranted: boolean; reason: string }> {
    if (cancellationResult.charged) {
      return { creditGranted: false, reason: 'Aula cobrada - sem crédito' };
    }

    // Check if already has credit this month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const existingCredits = await this.getRescheduleCredits(subscriptionId, currentMonth);

    if (existingCredits.credits_granted >= BILLING_CONSTANTS.MAX_RESCHEDULE_CREDITS_PER_MONTH) {
      return { creditGranted: false, reason: 'Limite de créditos do mês atingido' };
    }

    await this.grantCredit(subscriptionId, currentMonth);
    return { creditGranted: true, reason: 'Crédito de reagendamento concedido' };
  }
}
```

---

## 7. Stripe Webhook Events

### 7.1 Events to Handle

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create local subscription record |
| `customer.subscription.updated` | Update local subscription (status, dates) |
| `customer.subscription.deleted` | Mark subscription as cancelled |
| `invoice.paid` | Mark payment successful, update subscription period |
| `invoice.payment_failed` | Mark subscription as past_due, send notification |
| `payment_intent.succeeded` | Mark one-time payment as succeeded |
| `payment_intent.payment_failed` | Mark one-time payment as failed |
| `charge.refunded` | Record refund in payment_transactions |

### 7.2 Webhook Handler

```typescript
// src/pages/api/webhooks/stripe.ts
import Stripe from 'stripe';

export async function POST({ request, locals }: APIContext) {
  const stripe = new Stripe(locals.runtime.env.STRIPE_SECRET_KEY);
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      locals.runtime.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  const stripeWebhookService = new StripeWebhookService(locals.runtime);

  switch (event.type) {
    case 'customer.subscription.created':
      await stripeWebhookService.handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await stripeWebhookService.handleSubscriptionUpdated(event.data.object);
      break;
    case 'invoice.paid':
      await stripeWebhookService.handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await stripeWebhookService.handleInvoicePaymentFailed(event.data.object);
      break;
    case 'payment_intent.succeeded':
      await stripeWebhookService.handlePaymentIntentSucceeded(event.data.object);
      break;
    // ... other events
  }

  return new Response('OK', { status: 200 });
}
```

---

## 8. UI Components

### 8.1 Parent Portal

**New Pages:**
- `/parent/billing` - Subscription overview, payment history
- `/parent/billing/subscribe` - Choose plan, enter payment method
- `/parent/billing/payment-methods` - Manage saved payment methods

**Components:**
- `SubscriptionCard.astro` - Shows current plan, next billing date, amount
- `PaymentMethodCard.astro` - Shows saved card/boleto with edit/remove
- `PixPaymentModal.astro` - Shows PIX QR code with countdown
- `PlanSelector.astro` - Choose between monthly/semester/annual

### 8.2 Admin Portal

**New Pages:**
- `/admin/billing` - Overview of all subscriptions, revenue metrics
- `/admin/billing/subscriptions` - List/filter subscriptions
- `/admin/billing/transactions` - Payment transaction history

**Components:**
- `RevenueStats.astro` - Monthly/annual revenue, MRR, churn
- `SubscriptionTable.astro` - Filterable list of subscriptions
- `PaymentStatusBadge.astro` - Visual status indicator

---

## 9. Cloudflare Cron Jobs

### 9.1 Auto-Completion Cron

```typescript
// src/workers/auto-completion-cron.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const autoCompletionService = new AutoCompletionService(env);
    const result = await autoCompletionService.autoCompleteClasses();

    console.log(`Auto-completed ${result.completed} classes, ${result.skipped} skipped`);
  }
};

// wrangler.toml
[triggers]
crons = ["0 * * * *"]  # Every hour
```

### 9.2 Payment Reminder Cron

```typescript
// Send reminders for:
// - PIX payments expiring in 2 hours
// - Boleto payments due in 2 days
// - Failed subscription payments (retry reminder)
```

---

## 10. Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Products (after creating in Stripe Dashboard)
STRIPE_PRODUCT_INDIVIDUAL=prod_xxx
STRIPE_PRODUCT_GROUP=prod_xxx

# Stripe Prices (after creating in Stripe Dashboard)
STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_xxx
STRIPE_PRICE_INDIVIDUAL_SEMESTER=price_xxx
STRIPE_PRICE_INDIVIDUAL_ANNUAL=price_xxx
STRIPE_PRICE_GROUP_MONTHLY=price_xxx
STRIPE_PRICE_GROUP_SEMESTER=price_xxx
STRIPE_PRICE_GROUP_ANNUAL=price_xxx
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database migration (tables, indexes)
- [ ] Stripe account setup in Brazil
- [ ] Create Stripe products/prices
- [ ] Basic Stripe service implementation
- [ ] Webhook endpoint

### Phase 2: Subscription Flow (Week 3-4)
- [ ] Subscription CRUD APIs
- [ ] Parent subscription UI
- [ ] Credit card payment flow
- [ ] Boleto subscription flow
- [ ] Customer portal integration

### Phase 3: One-Time Payments (Week 5)
- [ ] PIX payment generation
- [ ] PIX status checking
- [ ] One-time Boleto payments
- [ ] Payment status UI

### Phase 4: Auto-Completion (Week 6)
- [ ] Auto-completion cron job
- [ ] Teacher confirmation UI
- [ ] Exception reporting
- [ ] Cancellation billing logic

### Phase 5: Admin Tools (Week 7)
- [ ] Admin billing dashboard
- [ ] Revenue metrics
- [ ] Subscription management
- [ ] Payment transaction history

### Phase 6: Polish & Testing (Week 8)
- [ ] End-to-end testing
- [ ] Error handling
- [ ] Email/WhatsApp notifications
- [ ] Documentation

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PIX doesn't support recurring | Parents forget to pay monthly | Send PIX invoice link via WhatsApp/email each month |
| Boleto 2-day settlement | Cash flow delay | Plan for delayed revenue in accounting |
| Stripe fees reduce margin | Lower profit | Pass fees to customer OR encourage PIX (0.99%) |
| Parents resist subscription model | Lower adoption | Offer both subscription AND pay-per-class options |
| Auto-completion marks wrong | Billing disputes | Teacher must confirm within 48h, dispute resolution flow |

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Subscription adoption | 60% of students | Subscriptions / Total active enrollments |
| Payment collection rate | 98%+ | Successful payments / Total invoices |
| Manual billing time | -80% | Hours spent on billing (before vs after) |
| Failed payment recovery | 70%+ | Recovered / Total failed payments |
| Parent satisfaction | 4.5+ stars | Survey after 3 months |

---

## 14. Resolved Questions

1. **Refund policy for annual plans?** ✅ RESOLVED
   - **Answer:** Keep configurable via `REFUND_POLICY` constants
   - **Current default:** No automatic partial refunds (`ALLOW_PARTIAL_REFUNDS: false`)
   - **To enable later:** Set `ALLOW_PARTIAL_REFUNDS: true` and configure `PARTIAL_REFUND_PERCENT`

2. **Teacher payment timing?** ⏳ PENDING
   - Still needs discussion - monthly or sync with parent billing?

3. **Group class billing complexity?** ✅ RESOLVED
   - See Section 2.5 below for full rules

4. **Trial period?** ✅ RESOLVED
   - **Answer:** NO free trial. BILIN uses a **PAID 1-month trial** period
   - Parents pay during trial to evaluate before committing to longer plans
   - After trial, they can continue monthly OR commit to semester/annual (with discounts)

---

## 2.5 Group Class Cancellation Rules

When a student in a group class cancels, the billing depends on remaining group size:

| Scenario | Before | After | Billing Impact |
|----------|--------|-------|----------------|
| 1 of 3 cancels | 3 students | 2 remain | Remaining 2 continue at R$120/each (group rate) |
| 1 of 2 cancels | 2 students | 1 remains | Remaining 1 pays R$150 (individual rate) |
| Last student cancels | 1 student | 0 remain | See below |

**When the last remaining student cancels:**

| Notice Period | Charge |
|---------------|--------|
| 24h+ notice | No charge |
| <24h notice | R$120 (GROUP rate, NOT R$150) |

**Rationale:** The last student was originally in a group class at R$120/student. It's unfair to charge them R$150 just because others cancelled first. They're charged at the rate they were originally paying.

**Implementation:** See `calculateGroupCancellationFee()` in `src/constants/billing.ts`

---

## 15. Remaining Open Questions

1. **Teacher payment timing?** Still monthly, or sync with parent billing?

---

## 16. References

- [Stripe Billing Docs](https://docs.stripe.com/billing/subscriptions/overview)
- [Stripe PIX Docs](https://docs.stripe.com/payments/pix)
- [Stripe Boleto Docs](https://docs.stripe.com/payments/boleto)
- [BILIN Business Context](../reference/business-context.md)
- [Current PRD](./prd.md)

---

**Document Status:** Draft - Awaiting Review
**Next Steps:** Review with stakeholders, answer open questions, begin Phase 1
