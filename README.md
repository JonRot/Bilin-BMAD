# EduSchedule Pro

**Status:** ✅ MVP COMPLETE - All 52 FRs Implemented

Scheduling and enrollment management platform for BILIN Method language instruction.

## Quick Start

```bash
cd eduschedule-app
npm install
npm run dev           # Local development
npm run dev:remote    # With production database
```

## Repository Structure

```
bmad-demo/
├── CLAUDE.md                     # 📍 AI instructions (read first)
├── eduschedule-app/              # Main application
│   ├── project-context.md        # Session context
│   ├── CLAUDE.md                 # App-specific instructions
│   └── src/                      # Source code
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

| Layer | Technology |
|-------|------------|
| Frontend | Astro 5 SSR |
| Hosting | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| Sessions | Cloudflare KV |
| Auth | Google OAuth via Arctic |

## Implementation Stats

- **36 pages** (22 admin, 6 teacher, 8 parent)
- **132 API endpoints** across 21 categories
- **35+ database tables**
- **31 reusable components**
- **55 database migrations**

## Production

- **App:** https://eduschedule-app.pages.dev
- **Cloudflare:** https://dash.cloudflare.com

---

**Last Updated:** 2026-01-07
