# Development Guide - EduSchedule App

**Generated:** 2025-12-03
**Project:** Bilin App - EduSchedule
**Tech Stack:** Astro + Cloudflare Pages + D1

## Prerequisites

### Required Software

- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **Wrangler CLI**: Latest version
- **Git**: For version control

### Accounts Required

- Cloudflare account (for Pages and D1)
- Google Cloud Console account (for Calendar API)
- GitHub account (for deployment)

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd eduschedule-app
npm install
```

### 2. Environment Configuration

Create `.dev.vars` file in project root:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:4321/api/auth/callback

# Session Configuration
SESSION_SECRET=generate_a_random_32_character_string_here

# Database Encryption Key
ENCRYPTION_KEY=generate_a_random_32_character_encryption_key
```

**Generate secure keys:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Setup

**Create D1 database:**
```bash
npx wrangler d1 create eduschedule-db
```

**Initialize schema:**
```bash
npx wrangler d1 execute eduschedule-db --local --file=./database/schema.sql
```

**Migrate existing data (if applicable):**
```bash
npm run migrate:d1
```

### 4. Google Calendar API Setup

Follow `GOOGLE_CALENDAR_OAUTH_SETUP.md` for detailed instructions:

1. Create project in Google Cloud Console
2. Enable Google Calendar API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI
6. Copy client ID and secret to `.dev.vars`

## Development Commands

### Start Development Server

```bash
npm run dev:local
```

**What it does:**
- Starts Wrangler dev server with local D1 persistence
- Runs Astro dev server with HMR
- Available at `http://localhost:4321`

**Features:**
- Hot module reloading
- Local D1 database
- Persistent state across restarts

### Build for Production

```bash
npm run build
```

**Output:** `dist/` directory

**What's built:**
- SSR bundle for Cloudflare Workers
- Static assets
- Optimized and minified code

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing.

## Project Structure for Development

```
src/
├── lib/           # Add new utility modules here
├── pages/         # Add new routes here
│   ├── api/      # Add new API endpoints here
│   └── *.astro   # Add new UI pages here
├── components/    # Add reusable components here (currently empty)
├── layouts/       # Add new layouts here
└── middleware.ts  # Global middleware (modify carefully)
```

## Development Workflow

### Adding a New API Endpoint

1. **Create file in `/src/pages/api/`:**

```typescript
// src/pages/api/example/index.ts
import type { APIRoute } from "astro";
import { getSession } from "../../../lib/session";

export const GET: APIRoute = async ({ cookies, locals }) => {
  // 1. Authenticate
  const session = getSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. Rate limiting (if needed)
  // See src/lib/rate-limit.ts

  // 3. Business logic
  try {
    const db = locals.runtime?.env?.DB;
    // Query database...

    return new Response(JSON.stringify({ data: "result" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

2. **Test endpoint:**
```bash
curl http://localhost:4321/api/example
```

### Adding a New UI Page

1. **Create `.astro` file in `/src/pages/`:**

```astro
---
// src/pages/example.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import { getSession } from '../lib/session';

const session = getSession(Astro.cookies);
if (!session) {
  return Astro.redirect('/login');
}
---

<BaseLayout title="Example Page">
  <h1>Hello {session.name}!</h1>
  <p>Your role: {session.role}</p>
</BaseLayout>
```

2. **Navigate to:** `http://localhost:4321/example`

### Adding Database Operations

1. **Add function to `/src/lib/database.ts`:**

```typescript
export async function getExampleData(db: D1Database, id: string) {
  const result = await db
    .prepare("SELECT * FROM table_name WHERE id = ?")
    .bind(id)
    .first();
  return result;
}
```

2. **Use in API route:**

```typescript
import { getExampleData } from "../../../lib/database";

export const GET: APIRoute = async ({ url, locals }) => {
  const db = locals.runtime?.env?.DB;
  const id = url.searchParams.get("id");
  const data = await getExampleData(db, id);
  return new Response(JSON.stringify(data), { status: 200 });
};
```

## Database Development

### Query Local D1

```bash
npx wrangler d1 execute eduschedule-db --local --command="SELECT * FROM teachers LIMIT 5"
```

### Run SQL File

```bash
npx wrangler d1 execute eduschedule-db --local --file=./path/to/file.sql
```

### Backup Local Database

```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite ".backup backup.db"
```

### Add New Table

1. **Update `database/schema.sql`**
2. **Run migration:**

```bash
npx wrangler d1 execute eduschedule-db --local --file=./database/schema.sql
```

## Testing

### Manual API Testing

**Using curl:**
```bash
# Test authentication (requires browser for OAuth)
curl http://localhost:4321/api/auth/login

# Test protected endpoint (requires session cookie)
curl -b cookies.txt http://localhost:4321/api/teachers

# Test with query parameters
curl "http://localhost:4321/api/calendar/events?timeMin=2025-12-01T00:00:00Z"
```

**Using browser:**
1. Open DevTools → Network tab
2. Navigate to page/trigger action
3. Inspect requests and responses

### Test Database Queries

```typescript
// In src/pages/api/test-db.ts
export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime?.env?.DB;
  const results = await db.prepare("SELECT * FROM teachers").all();
  return new Response(JSON.stringify(results), { status: 200 });
};
```

## Debugging

### Enable Debug Logging

Add to your route:

```typescript
console.log("Debug info:", { variable, otherInfo });
```

**View logs:**
- Browser: DevTools → Console
- Server: Terminal where `npm run dev:local` is running

### Common Issues

**1. "Database not available"**
- Ensure wrangler is running with `--d1` flag
- Check `wrangler.jsonc` has correct D1 binding

**2. "Unauthorized" on API calls**
- Check session cookie exists (DevTools → Application → Cookies)
- Verify OAuth flow completed successfully
- Check session hasn't expired

**3. CORS errors**
- Astro handles CORS automatically for same-origin
- For external APIs, add CORS headers in response

**4. "Module not found" errors**
- Run `npm install`
- Check import paths are correct
- Restart dev server

## Code Style and Conventions

### TypeScript

- Use strict mode (enabled in `tsconfig.json`)
- Define types for all function parameters
- Use interfaces for complex objects

### File Naming

- API routes: lowercase with hyphens (`api/example-route.ts`)
- UI pages: lowercase with hyphens (`example-page.astro`)
- Components: PascalCase (`ExampleComponent.astro`)
- Utilities: camelCase (`exampleUtil.ts`)

### Error Handling

Always return proper HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

### Security Best Practices

1. **Never log sensitive data** (passwords, tokens, PII)
2. **Always validate input** (use Zod schemas)
3. **Use parameterized queries** (prevent SQL injection)
4. **Encrypt PII** before storing in database
5. **Check authentication** on all protected routes
6. **Implement rate limiting** on write operations

## Environment Variables

### Development (.dev.vars)

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4321/api/auth/callback
SESSION_SECRET=...
ENCRYPTION_KEY=...
```

### Production (Cloudflare Dashboard)

Set via Cloudflare Dashboard → Pages → Settings → Environment Variables

**Required:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (production URL)
- `SESSION_SECRET`
- `ENCRYPTION_KEY`

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

**Quick Deploy:**

```bash
# Build
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist/
```

## Troubleshooting

### Clear Local State

```bash
rm -rf .wrangler/state
rm -rf .astro
npm run dev:local
```

### Reset Database

```bash
npx wrangler d1 execute eduschedule-db --local --command="DROP TABLE IF EXISTS teachers"
npx wrangler d1 execute eduschedule-db --local --file=./database/schema.sql
```

### Update Dependencies

```bash
npm update
npm audit fix
```

## Resources

- **Astro Docs**: https://docs.astro.build
- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages
- **Google Calendar API**: https://developers.google.com/calendar
- **Arctic (OAuth)**: https://arctic.js.org

## Getting Help

1. Check existing documentation in `/docs`
2. Review `SECURITY.md` for security-related questions
3. Check Cloudflare status page if deployment issues
4. Review Astro Discord for framework questions
