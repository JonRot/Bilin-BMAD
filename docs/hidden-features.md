# Hidden Features & Blocked Pages

Tracking all features, pages, and UI components that are temporarily hidden or blocked because they are not ready for production.

**Last Updated:** 2026-02-21

---

## Blocked Pages

Pages that redirect users away. Direct URL access is also blocked.

| Page | Route | Redirect To | Reason | How to Re-enable |
|------|-------|-------------|--------|------------------|
| Teacher Invoice (Fatura) | `/teacher/invoice` | `/teacher` | Not ready for production | Remove `return Astro.redirect('/teacher')` at top of frontmatter |
| Teacher Location Change Approvals | `/teacher/location-change-approvals` | `/teacher` | Not ready for production | Remove `return Astro.redirect('/teacher')` at top of frontmatter |

**Files:**
- `src/pages/teacher/invoice.astro` - early redirect added
- `src/pages/teacher/location-change-approvals.astro` - early redirect added

---

## Hidden Navigation Links

Links removed from the navigation menus so users can't discover blocked pages.

| Link | Menu Location | Label | File | How to Re-enable |
|------|--------------|-------|------|------------------|
| `/teacher/invoice` | Teacher top nav | "Fatura" | `src/constants/ui.ts` (TEACHER NAV_LINKS) | Uncomment the line |
| `/teacher/location-change-approvals` | Teacher user dropdown | "Mudanças de Local" | `src/constants/ui.ts` (TEACHER USER_MENU_ITEMS) | Uncomment the line |

---

## Hidden UI Components

Components commented out in templates but left in place for easy re-activation.

| Component | Page | Description | How to Re-enable |
|-----------|------|-------------|------------------|
| Stats Grid (4 StatsCards) | `/teacher` (dashboard) | Shows Alunos Ativos, Total de Alunos, Horários Disponíveis, Estimativa Mensal | Uncomment the `stats-grid mb-lg` block in `src/pages/teacher/index.astro` |
| TeacherTierCard | `/teacher` (dashboard) | Shows credit score, tier level, and individual/group rates | Uncomment the `TeacherTierCard` block in `src/pages/teacher/index.astro` |

---

## Onboarding Guard

All parent pages redirect to `/onboarding` if the parent has no students or leads. Admins bypass this check.

| Page | Route | Guard Added |
|------|-------|-------------|
| Parent Dashboard | `/parent` | Already existed |
| Meus Alunos | `/parent/students` | Added 2026-02-21 |
| Parent Profile | `/parent/profile` | Added 2026-02-21 |
| Parent Invoice | `/parent/invoice` | Added 2026-02-21 |
| Location Change | `/parent/location-change` | Added 2026-02-21 |
| Cancel Choice | `/parent/cancel-choice` | Added 2026-02-21 |
| Billing Overview | `/parent/billing` | Added 2026-02-21 |
| Subscribe | `/parent/billing/subscribe` | Added 2026-02-21 |

The onboarding page (`src/pages/onboarding.astro`) uses a minimal nav (logo + logout only) instead of the full parent Nav, preventing navigation to other pages.

---

## Re-enabling Checklist

When a feature is ready for production:

1. Remove the redirect / uncomment the code
2. Uncomment the nav link in `src/constants/ui.ts`
3. Remove the entry from this document
4. Rebuild and test
