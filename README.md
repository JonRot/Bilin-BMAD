# EduSchedule Pro

**Status:** ✅ Phase 2 Complete - All Epics 6-8 Implemented

Scheduling and enrollment management platform for BILIN Method language instruction.

## Quick Start

```bash
cd eduschedule-app
npm install
npm run dev           # Local development
npm run dev:remote    # With production database
npm run test          # Run tests
npm run test:watch    # Watch mode
```

## Repository Structure

```
bmad-demo/
├── CLAUDE.md                     # 📍 AI instructions (read first)
├── eduschedule-app/              # Main application (Astro 5 + Cloudflare)
│   ├── project-context.md        # Session context
│   ├── CLAUDE.md                 # App-specific instructions
│   ├── src/                      # Source code
│   └── workers/cron-scheduler/   # Scheduled jobs worker
├── native-shell/                 # iOS/Android WebView wrapper
│   ├── ios/                      # iOS app shell
│   └── android/                  # Android app shell
├── docs/                         # Documentation
│   ├── index.md                  # 📍 Documentation map
│   ├── planning/                 # PRD, epics, Phase 2
│   ├── reference/                # API, data models
│   └── archive/                  # Project history
└── .bmad/                        # BMAD Method framework
```

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/index.md` | Full documentation map + Knowledge Registry |
| `docs/planning/prd.md` | 52 functional requirements ✅ |
| `docs/architecture.md` | System architecture |
| `eduschedule-app/project-context.md` | Quick context for sessions |

## Tech Stack

### Core Framework

| Component | Technology | Version |
|-----------|------------|---------|
| **Framework** | Astro SSR | 5.16.4 |
| **Hosting** | Cloudflare Pages | - |
| **Database** | Cloudflare D1 (SQLite) | - |
| **Sessions** | Cloudflare KV | - |
| **Auth** | Arctic (Google/Microsoft OAuth) | 3.7.0 |
| **Payments** | Stripe | 20.1.0 |
| **Validation** | Zod | 4.3.2 |
| **Sanitization** | DOMPurify | 3.3.0 |

### Development Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Wrangler** | Cloudflare CLI | 4.53.0 |
| **Vitest** | Unit testing | 4.0.15 |
| **Stryker** | Mutation testing | 9.4.0 |
| **tsx** | TypeScript execution | 4.21.0 |
| **happy-dom** | DOM testing | 20.0.11 |

### IDE & AI Tools

| Tool | Purpose |
|------|---------|
| **VS Code** | Primary IDE |
| **Claude Code** | AI pair programming |
| **GitHub Copilot** | AI assistance |
| **MCP Discovery** | Claude Desktop, Cursor, Windsurf |

### Scheduled Jobs

| Cron | Schedule | Purpose |
|------|----------|---------|
| Payment Grace | Daily 6am UTC | Payment reminder enforcement |
| Auto-Complete | Hourly | Auto-complete past classes |

## Implementation Stats

- **37 pages** (23 admin, 6 teacher, 8 parent)
- **134 API endpoints** across 16 categories
- **38+ database tables**
- **40+ reusable components**
- **58 database migrations**

## Phase 2 Progress

- ✅ **Epic 6** - Advanced Enrollment (11/11 stories)
- ✅ **Epic 7** - Rock-Solid Scheduling (9/9 stories)
- ✅ **Epic 8** - Payment System (11/12 stories, PIX deferred)

## Production

- **App:** https://eduschedule-app.pages.dev
- **Cron Worker:** eduschedule-cron-scheduler.atendimento-fc6.workers.dev
- **Cloudflare Dashboard:** https://dash.cloudflare.com

---

**Last Updated:** 2026-01-12
