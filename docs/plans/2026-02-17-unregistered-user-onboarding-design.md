# Unregistered User Onboarding & Login Improvements

**Date:** 2026-02-17
**Status:** Approved

## Problem

1. **`prompt=consent`** forces Google consent screen on every login
2. **Login page** doesn't redirect already-authenticated users
3. **Any Google user** who logs in gets `parent` role by default and can access parent pages with zero students/leads

## Solution

### Part A: Login Flow Improvements (DONE)

- Changed `prompt=consent` → `prompt=select_account` in `src/pages/api/auth/login.ts`
- Added session check + redirect on `/login` and `/` pages

### Part B: Unregistered User Gate + Onboarding

#### Flow

```
Random person logs in → gets "parent" role → redirected to /parent
  → /parent checks: has students (parent_links) OR leads (leads table)?
    → YES → normal parent dashboard
    → NO  → redirect to /onboarding

/onboarding (authenticated):
  → Branded welcome page explaining Ensino Bilin
  → "Fazer Cadastro" button → /cadastro

/cadastro:
  → Detects logged-in session → auto-fills parent name + email
  → After successful registration → shows "Ir para Painel" button
  → Auto-redirects to /parent after 10 seconds

/parent (next visit):
  → Now has a lead with matching parent_email → shows dashboard
```

#### Files Changed

| File | Change |
|------|--------|
| `src/lib/roles.ts` | Add `hasStudentsOrLeads(email, runtime)` function |
| `src/pages/parent/index.astro` | Add students-or-leads check, redirect to /onboarding |
| **NEW** `src/pages/onboarding.astro` | Welcome/explanation page with cadastro button |
| `src/pages/cadastro.astro` | Read session for auto-fill (name + email) |
| Cadastro inline script | After success: show /parent link + 10s auto-redirect |

#### Key Decisions

1. **No new role** - `parent` remains the default. Gate is "parent with zero connections"
2. **Leads count** - Once cadastro submitted, parent_email on lead matches login email
3. **Pre-fill from session** - No query params, reads encrypted session directly (secure)
4. **Onboarding is authenticated** - Requires login session, not a public page
5. **`hasStudentsOrLeads` is server-side** - DB query using session email, no client tampering possible

#### Security

- Student/lead lookup uses email from AES-256-GCM encrypted session cookie
- All checks happen server-side in Astro frontmatter
- No sensitive data exposed via URL params
- Cadastro pre-fill reads from same secure session
