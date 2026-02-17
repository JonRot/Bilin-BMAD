# Unregistered User Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Block unregistered users from parent pages, redirect them to an onboarding page that leads to cadastro with pre-filled data, and redirect back to parent dashboard after registration.

**Architecture:** Server-side check in parent page frontmatter queries `parent_links` and `leads` tables by session email. New `/onboarding` page explains the school and links to `/cadastro`. Cadastro reads session for auto-fill and shows a redirect to `/parent` after success.

**Tech Stack:** Astro 5 SSR, D1 (SQLite), CSS variables (design system), existing session/auth infrastructure.

---

### Task 1: Deploy Login Flow Improvements

These changes are already made and built successfully. Deploy them.

**Files:**
- Modified: `src/pages/api/auth/login.ts:73` (prompt=select_account)
- Modified: `src/pages/login.astro:1-14` (session redirect)
- Modified: `src/pages/index.astro:1-14` (session redirect)

**Step 1: Deploy to Cloudflare Pages**

Run from `eduschedule-app/`:
```bash
npx wrangler pages deploy dist --project-name=eduschedule-app
```

**Step 2: Verify deployment**

Visit https://app.ensinobilin.com/login while logged in — should redirect to dashboard.

**Step 3: Commit**

```bash
git add src/pages/api/auth/login.ts src/pages/login.astro src/pages/index.astro
git commit -m "fix: improve login flow - skip consent screen, redirect if already logged in"
```

---

### Task 2: Add `hasStudentsOrLeads` Helper

**Files:**
- Modify: `src/lib/roles.ts` (add new exported function at bottom)

**Step 1: Add the helper function**

Add to the bottom of `src/lib/roles.ts`:

```typescript
/**
 * Check if a user has any students (via parent_links) or leads (via leads table)
 * Used to determine if a "parent" role user has actually registered
 * @param email - User's login email
 * @param runtime - Cloudflare Workers runtime
 * @returns true if user has at least one student or lead
 */
export async function hasStudentsOrLeads(email: string, runtime?: Runtime): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const db = runtime?.env?.DB;

  if (!db) {
    return false;
  }

  try {
    // Check parent_links (registered students)
    const studentResult = await db.prepare(
      `SELECT 1 FROM parent_links WHERE LOWER(auth_email) = ? LIMIT 1`
    ).bind(normalizedEmail).first();

    if (studentResult) return true;

    // Check leads (cadastro submitted but not yet converted)
    const leadResult = await db.prepare(
      `SELECT 1 FROM leads WHERE LOWER(parent_email) = ? AND archived_at IS NULL LIMIT 1`
    ).bind(normalizedEmail).first();

    if (leadResult) return true;

    return false;
  } catch (error) {
    console.error('[ROLES] Error checking students/leads:', error);
    return false;
  }
}
```

**Step 2: Verify build**

Run: `npm run build` from `eduschedule-app/`
Expected: Build success

**Step 3: Commit**

```bash
git add src/lib/roles.ts
git commit -m "feat: add hasStudentsOrLeads helper for unregistered user detection"
```

---

### Task 3: Gate Parent Dashboard

**Files:**
- Modify: `src/pages/parent/index.astro` (add check after auth, before data fetch)

**Step 1: Add the gate**

In `src/pages/parent/index.astro`, after line 48 (`const session = authResult.session!;`), add:

```typescript
// Check if this parent has any students or leads
// Admins bypass this check (they can always view parent pages)
if (session.role === 'parent') {
  const { hasStudentsOrLeads } = await import('../../lib/roles');
  const hasConnections = await hasStudentsOrLeads(session.email, Astro.locals.runtime);
  if (!hasConnections) {
    return Astro.redirect('/onboarding');
  }
}
```

This goes AFTER the `requireRole` check (line 42-46) and AFTER `const session` (line 48), but BEFORE the data fetching (line 51 `const db = getDB(...)`).

**Important:** Admins who access `/parent` (allowed by role hierarchy) should NOT be redirected to onboarding. The `session.role === 'parent'` check ensures only actual parent-role users are gated.

**Step 2: Verify build**

Run: `npm run build`
Expected: Build success

**Step 3: Commit**

```bash
git add src/pages/parent/index.astro
git commit -m "feat: redirect unregistered parents to onboarding page"
```

---

### Task 4: Create Onboarding Page

**Files:**
- Create: `src/pages/onboarding.astro`

**Step 1: Create the onboarding page**

Create `src/pages/onboarding.astro` with:
- Authenticated page (check session, redirect to `/login` if not logged in)
- If user already has students/leads, redirect to `/parent` (in case they navigate here manually)
- Branded welcome page explaining how Ensino Bilin works
- "Fazer Cadastro" CTA button linking to `/cadastro`
- Uses existing BaseLayout, Nav components
- All styles via CSS variables (design system)
- Portuguese content

**Key sections to include:**
1. Welcome header with logo
2. 3 simple steps: "1. Cadastro → 2. Planejamento → 3. Aulas"
3. Brief explanation of the BILIN method
4. Prominent "Fazer Cadastro" button
5. WhatsApp contact link for help

**Frontmatter:**
```typescript
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import { getSession } from '../lib/session';
import { hasStudentsOrLeads } from '../lib/roles';

// Require authentication
const session = await getSession(Astro.cookies, Astro.locals.runtime);
if (!session) {
  return Astro.redirect('/login');
}

// If already registered, go to parent dashboard
const hasConnections = await hasStudentsOrLeads(session.email, Astro.locals.runtime);
if (hasConnections) {
  return Astro.redirect('/parent');
}

const userName = session.name?.split(' ')[0] || 'Responsável';
---
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build success

**Step 3: Commit**

```bash
git add src/pages/onboarding.astro
git commit -m "feat: add onboarding page for unregistered parents"
```

---

### Task 5: Auto-Fill Cadastro From Session

**Files:**
- Modify: `src/pages/cadastro.astro` (frontmatter + inline script)

**Step 1: Add session reading to frontmatter**

In the frontmatter (between the `---` blocks), add after the existing imports:

```typescript
import { getSession } from '../lib/session';

// Check for logged-in user to pre-fill parent info
const session = await getSession(Astro.cookies, Astro.locals.runtime);
const prefillName = session?.name || '';
const prefillEmail = session?.email || '';
const isLoggedIn = !!session;
```

**Step 2: Pass pre-fill data to client script**

Add a `<script>` tag BEFORE the existing `<script>` block (around line 2116) that sets the data:

```html
<script define:vars={{ prefillName, prefillEmail, isLoggedIn }}>
  // Make pre-fill data available to the main script
  window.__cadastroPrefill = { name: prefillName, email: prefillEmail, isLoggedIn };
</script>
```

**Step 3: Add pre-fill logic to the inline script**

At the start of the existing `<script>` block (after the element declarations around line 2120-2132), add:

```javascript
// Pre-fill from session if user is logged in
const prefill = (window as any).__cadastroPrefill;
if (prefill?.isLoggedIn && prefill.email) {
  // Set email hidden field and show verified state
  const emailInput = document.getElementById('parent_email') as HTMLInputElement;
  const verifiedContainer = document.getElementById('verified-email-container') as HTMLElement;
  const verifiedText = document.getElementById('verified-email-text') as HTMLElement;
  const emailButtons = document.querySelector('.email-buttons') as HTMLElement;
  const manualContainer = document.getElementById('manual-email-container') as HTMLElement;

  if (emailInput) emailInput.value = prefill.email;
  if (verifiedText) verifiedText.textContent = prefill.email;
  if (verifiedContainer) verifiedContainer.style.display = '';
  if (emailButtons) emailButtons.style.display = 'none';
  if (manualContainer) manualContainer.style.display = 'none';
}
if (prefill?.isLoggedIn && prefill.name) {
  const nameInput = document.getElementById('parent_name') as HTMLInputElement;
  if (nameInput && !nameInput.value) nameInput.value = prefill.name;
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build success

**Step 5: Commit**

```bash
git add src/pages/cadastro.astro
git commit -m "feat: auto-fill cadastro with session data for logged-in users"
```

---

### Task 6: Add Post-Cadastro Redirect to Parent Dashboard

**Files:**
- Modify: `src/pages/cadastro.astro` (success message HTML + inline script)

**Step 1: Update success message HTML**

In the success message section (around line 543-544), replace the existing success actions:

```html
<div class="success-actions">
  <a href="https://app.ensinobilin.com" class="btn-primary">Acesse sua Conta</a>
```

With a conditional block that shows a parent redirect when logged in:

```html
<div class="success-actions">
  <a href="/parent" class="btn-primary" id="go-to-dashboard" style="display:none;">
    Ir para Painel
    <span id="countdown-text" class="countdown-badge"></span>
  </a>
  <a href="https://app.ensinobilin.com" class="btn-primary" id="go-to-site">Acesse sua Conta</a>
```

**Step 2: Add countdown CSS**

Add to the existing `<style>` block:

```css
.countdown-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-full);
  padding: 0 var(--spacing-xs);
  margin-left: var(--spacing-xs);
  font-size: var(--font-size-xs);
  min-width: 20px;
}
```

**Step 3: Add auto-redirect logic**

In the inline script, in the success handler (after line 3513 `window.scrollTo(...)`), add:

```javascript
// If logged in, show "Ir para Painel" with countdown
const prefillData = (window as any).__cadastroPrefill;
const dashboardBtn = document.getElementById('go-to-dashboard');
const siteBtn = document.getElementById('go-to-site');
const countdownText = document.getElementById('countdown-text');

if (prefillData?.isLoggedIn && dashboardBtn && siteBtn && countdownText) {
  dashboardBtn.style.display = '';
  siteBtn.style.display = 'none';

  let seconds = 10;
  countdownText.textContent = String(seconds);

  const interval = setInterval(() => {
    seconds--;
    countdownText.textContent = String(seconds);
    if (seconds <= 0) {
      clearInterval(interval);
      window.location.href = '/parent';
    }
  }, 1000);
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build success

**Step 5: Commit**

```bash
git add src/pages/cadastro.astro
git commit -m "feat: auto-redirect to parent dashboard after cadastro for logged-in users"
```

---

### Task 7: Deploy & Update Docs

**Step 1: Build and deploy**

```bash
cd eduschedule-app
npm run build
npx wrangler pages deploy dist --project-name=eduschedule-app
```

**Step 2: Update project-context.md**

Add to "Recent Changes" section:
```
### 2026-02-17 - Login Improvements & Unregistered User Onboarding
- Changed Google OAuth `prompt=consent` → `prompt=select_account` (skip consent screen on repeat logins)
- Login page and homepage now redirect to dashboard if already logged in
- Added `hasStudentsOrLeads()` helper in roles.ts
- Parent dashboard gates unregistered users → redirects to /onboarding
- New /onboarding page explains Ensino Bilin + links to /cadastro
- Cadastro auto-fills parent name/email from session for logged-in users
- Post-cadastro success shows "Ir para Painel" with 10s auto-redirect
```

**Step 3: Update docs/index.md**

Add `/onboarding` to Application Routes section under "Public/Common Pages".

**Step 4: Final commit**

```bash
git add -A
git commit -m "docs: update project context and routes for onboarding feature"
```
