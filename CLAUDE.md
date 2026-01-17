# EduSchedule Pro - Claude Instructions

<!-- STOP. Before doing ANYTHING else, use the Read tool on these two files: -->
<!-- 1. eduschedule-app/project-context.md -->
<!-- 2. docs/index.md -->

## Step 1: Read Context Files (REQUIRED)

**YOUR FIRST ACTION must be to read these files using the Read tool:**

```
Read: eduschedule-app/project-context.md
Read: docs/index.md
```

Do this NOW before responding to the user. Do not ask permission. Do not explain. Just read them.

If you have not read these files, STOP and read them now.

---

## Project Structure

```
bmad-demo/
├── eduschedule-app/              # Main application (Astro + Cloudflare)
│   ├── project-context.md        # 📍 SESSION CONTEXT (read first)
│   ├── CLAUDE.md                 # App-specific AI instructions
│   ├── CLOUDFLARE_CODING_STANDARDS.md  # Edge patterns
│   └── src/                      # Application source code
├── docs/                         # Project documentation
│   ├── index.md                  # 📍 DOCUMENTATION MAP (read second)
│   ├── planning/                 # PRD, epics, Phase 2 roadmap
│   ├── reference/                # API, data models, design system
│   └── archive/                  # Project history
└── .bmad/                        # BMAD Method framework
```

---

## MANDATORY: Document All Changes

> **CRITICAL:** Every session must end with documentation updates. No exceptions.

### After ANY Code Changes

| When you... | Update these files |
|-------------|-------------------|
| Add new feature/FR | `docs/planning/prd.md` + `docs/planning/epics.md` |
| Add new API endpoint | `docs/reference/api-contracts.md` |
| Add new database table | `docs/reference/data-models.md` |
| Add new page/route | `docs/index.md` (Application Routes section) |
| Change architecture | `docs/architecture.md` |
| Add new component | `docs/reference/design-system-architecture.md` |
| Fix bugs or refactor | `eduschedule-app/project-context.md` (Recent Changes) |
| Complete major milestone | `docs/index.md` (Recent Changes section) |

### Before Ending EVERY Session

1. **Update `eduschedule-app/project-context.md`:**
   - Add today's changes to "Recent Changes" section with date
   - Update "Current Status" if needed
   - Update database tables if modified

2. **Update `docs/index.md`** (if applicable):
   - New routes → Application Routes section
   - New features → Implementation Status section

3. **Keep records concise** - Summarize, don't duplicate

---

## Quick Reference

| Need | File |
|------|------|
| **Session context** | `eduschedule-app/project-context.md` |
| **Documentation map** | `docs/index.md` |
| **Requirements** | `docs/planning/prd.md` |
| **Architecture** | `docs/architecture.md` |
| **API endpoints** | `docs/reference/api-contracts.md` |
| **Database schema** | `docs/reference/data-models.md` |
| **Cross-cutting features** | `docs/reference/feature-maps.md` |
| **Cloudflare patterns** | `eduschedule-app/CLOUDFLARE_CODING_STANDARDS.md` |
| **Credentials** | `eduschedule-app/.credentials-reference.md` |

---

## Code Standards

- **Stack:** Astro 5 SSR + Cloudflare Pages + D1 (SQLite)
- **Auth:** Google OAuth via Arctic (not google-auth-library)
- **Crypto:** Web Crypto API (not Node crypto)
- **Runtime:** Pass `locals.runtime` to all database/auth functions
- **Dates:** DD/MM/YYYY format, timestamps as Unix integers
- **Styles:** CSS variables only (see Design System Rules below)

---

## CRITICAL: Astro CSS Rules

> **WARNING:** Breaking these rules will cause CSS to silently fail!

### `:global()` - ONLY in `<style>` blocks

```css
/* ✅ CORRECT - Inside <style> block in .astro file */
<style>
  :global(.dynamic-class) { color: red; }
</style>

/* ❌ WRONG - In imported CSS file (src/styles/*.css) */
/* This outputs literally as `:global(.class)` = INVALID CSS! */
:global(.my-class) { color: red; }
```

**Rule:** `:global()` is an Astro-specific syntax that ONLY works inside `<style>` blocks in `.astro` files. When used in imported CSS files (`import './styles.css'`), it is NOT processed and outputs as literal text, breaking all affected selectors.

### When to use what:

| Location | Scoping | Use `:global()`? |
|----------|---------|------------------|
| `<style>` in .astro file | Scoped by default | Yes, to escape scoping |
| Imported CSS file (`import '*.css'`) | Global by default | **NEVER** - already global |

---

## MANDATORY Design System Rules

> **CRITICAL:** Never hardcode styles. Always use CSS variables.

```css
/* ✅ ALWAYS use CSS variables */
color: var(--color-primary);
padding: var(--spacing-md);
border-radius: var(--radius-md);

/* ❌ NEVER hardcode values */
color: #F69897;
padding: 1rem;
border-radius: 8px;
```

### Available Variables

| Category | Examples |
|----------|----------|
| Colors | `--color-primary`, `--color-secondary`, `--color-text`, `--color-surface` |
| Spacing | `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl` |
| Font | `--font-size-sm`, `--font-size-base`, `--font-size-lg` |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg` |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-card` |

### Use Reusable Components

```astro
<!-- ✅ CORRECT -->
<FormField type="email" name="email" label="Email" required />
<Button variant="primary">Save</Button>
<StatusBadge status="ATIVO" />

<!-- ❌ WRONG -->
<input type="email" />
<button>Save</button>
```

Full design system docs: `docs/index.md` → "MANDATORY Design System Rules"

---

## Session Checklist

Before ending any session:

- [ ] Code changes tested and working
- [ ] `eduschedule-app/project-context.md` updated with changes
- [ ] Appropriate docs updated (API, data models, routes, etc.)
- [ ] No hardcoded styles or values
- [ ] All new components use design system

---

## Current Status

**Phase 2 COMPLETE** - All 52 FRs + Epics 6-8 implemented, production-ready.

- **40 pages** (24 admin, 7 teacher, 8 parent, 1 common)
- **154 API endpoints**
- **40+ database tables**
- **73 database migrations**
- **Production:** https://eduschedule-app.pages.dev

**Phase 2 Progress:**
- ✅ Epic 6: 11/11 Complete (Advanced Enrollment)
- ✅ Epic 7: 9/9 Complete (Rock-Solid Scheduling, WhatsApp deferred)
- ✅ Epic 8: 11/12 Complete (Payment System, PIX deferred)

---

**Last Updated:** 2026-01-17
