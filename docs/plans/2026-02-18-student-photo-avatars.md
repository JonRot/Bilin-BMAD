# Student Photo Avatars — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add profile photos to students and leads with client-side crop, R2 storage, and display across 12 key locations.

**Architecture:** Client-side crop (Cropper.js) → Canvas resize to 256x256 JPEG → upload to API → store in Cloudflare R2 → serve from public bucket URL. Display via a reusable `StudentAvatar.astro` component that falls back to initials when no photo or `image_permission=false`.

**Tech Stack:** Cropper.js (client-side crop), Canvas API (resize), Cloudflare R2 (storage), Astro SSR components + client scripts.

**Design Doc:** `docs/plans/2026-02-18-student-photo-avatars-design.md`

---

## Task 1: R2 Bucket Setup & wrangler.toml Binding

**Files:**
- Modify: `eduschedule-app/wrangler.toml`

**Step 1: Create R2 bucket via Wrangler CLI**

Run:
```bash
cd eduschedule-app && npx wrangler r2 bucket create eduschedule-photos
```
Expected: Bucket created successfully.

**Step 2: Add R2 binding to wrangler.toml**

After the `[[kv_namespaces]]` block (~line 29), add:
```toml
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "eduschedule-photos"
```

Also add to the preview environment section after `[[env.preview.kv_namespaces]]` (~line 48):
```toml
[[env.preview.r2_buckets]]
binding = "PHOTOS"
bucket_name = "eduschedule-photos"
```

**Step 3: Enable public access on R2 bucket**

Run:
```bash
npx wrangler r2 bucket sippy enable eduschedule-photos --domain photos.ensinobilin.com
```
OR configure public access via Cloudflare dashboard: R2 > eduschedule-photos > Settings > Public access > Custom domain: `photos.ensinobilin.com`

Note: If custom domain setup requires DNS changes, use the `*.r2.dev` URL as fallback. Store the base URL as an env var:
```toml
[vars]
R2_PUBLIC_URL = "https://pub-XXXX.r2.dev"
```

**Step 4: Update TypeScript env types**

Modify: `eduschedule-app/src/global.d.ts` (or wherever Cloudflare env types are declared)
Add `PHOTOS: R2Bucket` to the environment interface.

**Step 5: Verify binding works**

Run:
```bash
cd eduschedule-app && npm run dev
```
Expected: Dev server starts without binding errors.

**Step 6: Commit**
```bash
git add eduschedule-app/wrangler.toml eduschedule-app/src/global.d.ts
git commit -m "feat: add R2 bucket binding for student photos"
```

---

## Task 2: Database Migration — photo_key Columns

**Files:**
- Create: `eduschedule-app/database/migrations/121_student_photo_key.sql`

**Step 1: Write migration**

```sql
-- Migration 121: Add photo_key to students and leads tables
-- Date: 2026-02-18
-- Description: Store R2 object key for student/lead profile photos.
--              Key format: students/{id}/photo.jpg or leads/{id}/photo.jpg

ALTER TABLE students ADD COLUMN photo_key TEXT;
ALTER TABLE leads ADD COLUMN photo_key TEXT;
```

**Step 2: Apply migration locally**

Run:
```bash
cd eduschedule-app && npx wrangler d1 migrations apply eduschedule-db --local
```
Expected: Migration applied successfully.

**Step 3: Commit**
```bash
git add eduschedule-app/database/migrations/121_student_photo_key.sql
git commit -m "feat: add photo_key column to students and leads tables"
```

---

## Task 3: TypeScript Types — Add photo_key to Interfaces

**Files:**
- Modify: `eduschedule-app/src/lib/repositories/types.ts`

**Step 1: Add `photo_key` to `Student` interface**

In `types.ts` at line ~1747 (after `matricula_number`), add:
```typescript
  // Profile photo (R2 object key)
  photo_key?: string | null;
```

**Step 2: Add `photo_key` to `StudentMinimal` interface**

In `types.ts` at line ~1778 (after `teacher_id`), add:
```typescript
  photo_key: string | undefined;
```

**Step 3: Add `photo_key` to `CreateStudentData` interface**

In `types.ts` at line ~1823 (after `family_income`), add:
```typescript
  // Profile photo
  photo_key?: string;
```

**Step 4: Add `photo_key` to `UpdateStudentData` interface**

In `types.ts` at line ~1877 (after `tshirt_size`), add:
```typescript
  // Profile photo
  photo_key?: string | null;
```

**Step 5: Add `photo_key` to `Lead` interface**

In `types.ts` at line ~375 (after `http_referrer`), add:
```typescript
  // Profile photo (R2 object key)
  photo_key: string | null;
```

**Step 6: Commit**
```bash
git add eduschedule-app/src/lib/repositories/types.ts
git commit -m "feat: add photo_key to Student and Lead type interfaces"
```

---

## Task 4: Repository Layer — Read/Write photo_key

**Files:**
- Modify: `eduschedule-app/src/lib/repositories/d1/student.ts`
- Modify: `eduschedule-app/src/lib/repositories/d1/lead.ts`

**Step 1: Update `decryptStudent()` in student.ts**

Add `photo_key: row.photo_key as string | null,` to the return object (after `matricula_number`).

**Step 2: Update `findByIdsMinimal()` in student.ts**

Add `photo_key` to the SELECT column list so avatars render in list views.

**Step 3: Update any `update()` method in student.ts**

Ensure `photo_key` is included in the dynamic UPDATE query builder (same pattern as other nullable text fields like `tshirt_size`).

**Step 4: Update `mapRowToLead()` in lead.ts**

Add `photo_key: row.photo_key as string | null,` to the return object.

**Step 5: Verify builds**

Run:
```bash
cd eduschedule-app && npx astro check 2>&1 | head -20
```
Expected: No new errors related to photo_key.

**Step 6: Commit**
```bash
git add eduschedule-app/src/lib/repositories/d1/student.ts eduschedule-app/src/lib/repositories/d1/lead.ts
git commit -m "feat: add photo_key to student and lead repositories"
```

---

## Task 5: Photo Upload API Endpoints

**Files:**
- Create: `eduschedule-app/src/pages/api/students/[id]/photo.ts`
- Create: `eduschedule-app/src/pages/api/leads/[id]/photo.ts`

**Step 1: Create student photo upload endpoint**

Create `src/pages/api/students/[id]/photo.ts`:

```typescript
import type { APIRoute } from 'astro';
import { requireApiAuth } from '@/lib/api-errors';
import { getDB } from '@/lib/database';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB (already cropped/resized on client)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const POST: APIRoute = async ({ params, request, cookies, locals }) => {
  const auth = await requireApiAuth(cookies, locals.runtime);
  if (!auth.success) return auth.response;

  const studentId = params.id;
  if (!studentId) {
    return new Response(JSON.stringify({ error: 'Student ID required' }), { status: 400 });
  }

  // Auth: admin or parent of this student
  const { session } = auth;
  if (session.role === 'parent') {
    // Verify parent owns this student via parent_links
    const db = getDB(locals.runtime);
    const link = await db.prepare(
      'SELECT 1 FROM parent_links WHERE parent_email = ? AND student_id = ?'
    ).bind(session.email, studentId).first();
    if (!link) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
    }
  } else if (session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('photo') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'No photo provided' }), { status: 400 });
  }

  // Validate file
  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large (max 2MB)' }), { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 });
  }

  // Upload to R2
  const env = (locals.runtime?.env ?? {}) as unknown as Record<string, unknown>;
  const photos = env.PHOTOS as R2Bucket;
  const key = `students/${studentId}/photo.jpg`;
  await photos.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // Update DB
  const db = getDB(locals.runtime);
  await db.prepare('UPDATE students SET photo_key = ?, updated_at = unixepoch() WHERE id = ?')
    .bind(key, studentId).run();

  // Build public URL
  const r2Url = env.R2_PUBLIC_URL as string || '';
  const photoUrl = `${r2Url}/${key}`;

  return new Response(JSON.stringify({ success: true, photoUrl, photoKey: key }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, cookies, locals }) => {
  const auth = await requireApiAuth(cookies, locals.runtime);
  if (!auth.success) return auth.response;

  // Admin only for delete
  if (auth.session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }

  const studentId = params.id;
  const env = (locals.runtime?.env ?? {}) as unknown as Record<string, unknown>;
  const photos = env.PHOTOS as R2Bucket;
  const db = getDB(locals.runtime);

  // Get current key to delete from R2
  const student = await db.prepare('SELECT photo_key FROM students WHERE id = ?')
    .bind(studentId).first();
  if (student?.photo_key) {
    await photos.delete(student.photo_key as string);
  }

  await db.prepare('UPDATE students SET photo_key = NULL, updated_at = unixepoch() WHERE id = ?')
    .bind(studentId).run();

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 2: Create lead photo upload endpoint**

Create `src/pages/api/leads/[id]/photo.ts` — same pattern but:
- Admin-only auth (no parent access for leads)
- Table: `leads` instead of `students`
- Key pattern: `leads/{id}/photo.jpg`

**Step 3: Test endpoints manually**

Run dev server and test with curl:
```bash
curl -X POST http://localhost:4321/api/students/TEST_ID/photo \
  -H "Cookie: session=..." \
  -F "photo=@test-image.jpg"
```
Expected: `{ "success": true, "photoUrl": "...", "photoKey": "students/TEST_ID/photo.jpg" }`

**Step 4: Commit**
```bash
git add eduschedule-app/src/pages/api/students/[id]/photo.ts eduschedule-app/src/pages/api/leads/[id]/photo.ts
git commit -m "feat: add photo upload/delete API endpoints for students and leads"
```

---

## Task 6: StudentAvatar Astro Component

**Files:**
- Create: `eduschedule-app/src/components/StudentAvatar.astro`
- Create: `eduschedule-app/src/styles/student-avatar.css`

**Step 1: Create the StudentAvatar component**

Create `src/components/StudentAvatar.astro`:

```astro
---
/**
 * StudentAvatar — Reusable circular avatar with photo or initials fallback.
 *
 * Displays student photo from R2 when available AND image_permission=true.
 * Falls back to colored initials circle otherwise.
 */
interface Props {
  name: string;
  photoKey?: string | null;
  imagePermission?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  class?: string;
}

const { name, photoKey, imagePermission = true, size = 'md', class: className } = Astro.props;

// Build photo URL from R2 public domain
const r2BaseUrl = import.meta.env.R2_PUBLIC_URL || '';
const photoUrl = photoKey && imagePermission ? `${r2BaseUrl}/${photoKey}` : null;

// Generate initials (first letter of first + last name)
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const initials = getInitials(name);

const sizeClass = `avatar--${size}`;
---

<div class:list={['student-avatar', sizeClass, className]} data-name={name}>
  {photoUrl ? (
    <img
      src={photoUrl}
      alt={name}
      class="student-avatar__img"
      loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
    />
    <span class="student-avatar__initials" style="display:none;">{initials}</span>
  ) : (
    <span class="student-avatar__initials">{initials}</span>
  )}
</div>
```

**Step 2: Create avatar CSS**

Create `src/styles/student-avatar.css`:

```css
.student-avatar {
  border-radius: var(--radius-full);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: var(--color-primary);
  color: white;
  font-weight: 600;
  vertical-align: middle;
}

.student-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-full);
}

.student-avatar__initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1;
}

/* Sizes (matching SkeletonAvatar) */
.avatar--sm {
  width: 32px;
  height: 32px;
  font-size: var(--font-size-xs);
}

.avatar--md {
  width: 40px;
  height: 40px;
  font-size: var(--font-size-sm);
}

.avatar--lg {
  width: 56px;
  height: 56px;
  font-size: var(--font-size-lg);
}

.avatar--xl {
  width: 80px;
  height: 80px;
  font-size: var(--font-size-2xl);
}
```

**Step 3: Import CSS in BaseLayout or component**

Import the CSS in BaseLayout.astro or directly in the component.

**Step 4: Commit**
```bash
git add eduschedule-app/src/components/StudentAvatar.astro eduschedule-app/src/styles/student-avatar.css
git commit -m "feat: add reusable StudentAvatar component with photo/initials fallback"
```

---

## Task 7: Client-Side Avatar Helper for Dynamic Rendering

**Files:**
- Create: `eduschedule-app/src/scripts/student-avatar-helper.ts`

Many display locations render student names dynamically via client-side JavaScript (not Astro SSR). These pages need a JS function to generate avatar HTML.

**Step 1: Create helper module**

Create `src/scripts/student-avatar-helper.ts`:

```typescript
/**
 * Client-side helper for rendering student avatars in dynamic content.
 * Used by page scripts that build HTML via JavaScript (tables, modals, etc.)
 */

const R2_BASE_URL = (window as unknown as Record<string, string>).__R2_PUBLIC_URL || '';

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getPhotoUrl(photoKey: string | null | undefined): string | null {
  if (!photoKey || !R2_BASE_URL) return null;
  return `${R2_BASE_URL}/${photoKey}`;
}

/**
 * Generate avatar HTML for dynamic rendering.
 * @param name - Student name for initials fallback
 * @param photoKey - R2 object key (nullable)
 * @param imagePermission - Whether photo display is permitted (LGPD)
 * @param size - 'sm' | 'md' | 'lg' | 'xl'
 */
export function renderAvatarHtml(
  name: string,
  photoKey: string | null | undefined,
  imagePermission: boolean,
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md'
): string {
  const initials = getInitials(name);
  const photoUrl = (photoKey && imagePermission) ? getPhotoUrl(photoKey) : null;

  if (photoUrl) {
    return `<div class="student-avatar avatar--${size}" data-name="${name}">
      <img src="${photoUrl}" alt="${name}" class="student-avatar__img" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <span class="student-avatar__initials" style="display:none;">${initials}</span>
    </div>`;
  }

  return `<div class="student-avatar avatar--${size}" data-name="${name}">
    <span class="student-avatar__initials">${initials}</span>
  </div>`;
}
```

**Step 2: Expose R2 base URL to client**

In `BaseLayout.astro`, add a script tag that sets the R2 URL on window:
```html
<script is:inline define:vars={{ r2Url: import.meta.env.R2_PUBLIC_URL || '' }}>
  window.__R2_PUBLIC_URL = r2Url;
</script>
```

**Step 3: Commit**
```bash
git add eduschedule-app/src/scripts/student-avatar-helper.ts
git commit -m "feat: add client-side avatar rendering helper for dynamic pages"
```

---

## Task 8: PhotoDropZone Component + Cropper.js Integration

**Files:**
- Create: `eduschedule-app/src/components/PhotoDropZone.astro`
- Create: `eduschedule-app/src/scripts/photo-crop-client.ts`
- Create: `eduschedule-app/src/styles/photo-drop-zone.css`

**Step 1: Install Cropper.js**

Run:
```bash
cd eduschedule-app && npm install cropperjs
```

**Step 2: Create PhotoDropZone Astro component**

Create `src/components/PhotoDropZone.astro`:

This is a drag-and-drop zone with circular preview. Props:
- `inputName: string` — form input name (e.g., "student_photo")
- `existingPhotoUrl?: string` — show existing photo if editing
- `size?: 'md' | 'xl'` — preview size

The component renders:
- A dashed-border drop zone area
- Hidden file input (triggered by click on zone)
- Circular preview (shown after image selection)
- "Remover" button to clear selection
- Stores cropped blob in a hidden input or fires a custom event

**Step 3: Create photo-crop-client.ts**

This script handles:
- Drag-and-drop events on the drop zone
- File input change handler
- Opens a crop modal (Cropper.js with 1:1 aspect ratio, circular view area)
- On confirm: Canvas resize to 256x256 JPEG at 85% quality
- Stores the blob in memory for form submission
- Updates preview image
- For direct upload (non-form contexts): POSTs to `/api/students/{id}/photo` or `/api/leads/{id}/photo`

Key Cropper.js config:
```typescript
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.min.css';

const cropper = new Cropper(imgElement, {
  aspectRatio: 1,
  viewMode: 1,
  dragMode: 'move',
  guides: false,
  highlight: false,
  cropBoxMovable: false,
  cropBoxResizable: false,
  toggleDragModeOnDblclick: false,
});

// Get cropped canvas
const canvas = cropper.getCroppedCanvas({ width: 256, height: 256 });
canvas.toBlob((blob) => {
  // Use blob for upload or form attachment
}, 'image/jpeg', 0.85);
```

**Step 4: Create photo-drop-zone.css**

Styles for the drop zone using only CSS variables:
- Dashed border with `var(--color-border)`
- Hover/active state with `var(--color-primary)` border
- Circular preview using `var(--radius-full)`
- "Arraste uma foto ou clique para selecionar" label
- Responsive sizing

**Step 5: Commit**
```bash
git add eduschedule-app/src/components/PhotoDropZone.astro eduschedule-app/src/scripts/photo-crop-client.ts eduschedule-app/src/styles/photo-drop-zone.css eduschedule-app/package.json eduschedule-app/package-lock.json
git commit -m "feat: add PhotoDropZone component with Cropper.js crop modal"
```

---

## Task 9: Integrate Photo Upload into StudentForm.astro

**Files:**
- Modify: `eduschedule-app/src/components/forms/StudentForm.astro`

**Step 1: Add PhotoDropZone to Section 1 (Student Information)**

After the student name field and before the birth date field, add:
```astro
import PhotoDropZone from '../PhotoDropZone.astro';

<!-- In Section 1, after name field -->
<PhotoDropZone
  inputName="student_photo"
  existingPhotoUrl={/* pass existing photo URL if editing */}
  size="xl"
/>
```

**Step 2: Update form submission handler**

In the client script that handles StudentForm submission (`users-page-client.ts`), detect if a photo blob is attached. If so, after the student is created/updated, POST the photo to `/api/students/{id}/photo`.

**Step 3: Commit**
```bash
git add eduschedule-app/src/components/forms/StudentForm.astro
git commit -m "feat: add photo upload to student create/edit form"
```

---

## Task 10: Integrate Photo Upload into LeadForm.astro

**Files:**
- Modify: `eduschedule-app/src/components/forms/LeadForm.astro`

**Step 1: Add PhotoDropZone to student entry section**

In Section 1, within the student entry container, add the PhotoDropZone after the student name and language fields.

**Step 2: Update lead form submission**

In the leads-page-client.ts, after lead creation, POST the photo to `/api/leads/{id}/photo` if a photo blob was attached.

**Step 3: Commit**
```bash
git add eduschedule-app/src/components/forms/LeadForm.astro
git commit -m "feat: add photo upload to lead create/edit form"
```

---

## Task 11: Integrate Photo Upload into Cadastro Page

**Files:**
- Modify: `eduschedule-app/src/pages/cadastro.astro`
- Modify: `eduschedule-app/src/pages/api/public/register.ts`

**Step 1: Add PhotoDropZone to Step 1 "Aluno"**

In `cadastro.astro`, within the Step 1 section after the student name/birth date fields, add:
```astro
<PhotoDropZone inputName="student_photo_0" size="xl" />
```

Use the index suffix (`_0`) to match the multi-student pattern already in the form.

**Step 2: Update public registration API**

In `src/pages/api/public/register.ts`, after lead creation:
- Check if `student_photo_0` file exists in the form data
- If so, upload to R2 at `leads/{newLeadId}/photo.jpg`
- Update lead record with `photo_key`

**Step 3: Commit**
```bash
git add eduschedule-app/src/pages/cadastro.astro eduschedule-app/src/pages/api/public/register.ts
git commit -m "feat: add optional photo upload to cadastro registration form"
```

---

## Task 12: Photo Upload in Parent Portal

**Files:**
- Modify: `eduschedule-app/src/pages/parent/students.astro` (or parent profile page)

**Step 1: Add upload button to parent student profile section**

Add a PhotoDropZone or a simple "Alterar foto" button that opens the crop modal. On save, POST to `/api/students/{id}/photo`.

**Step 2: Ensure parent auth check**

The API endpoint (Task 5) already validates parent access via `parent_links`. Verify this works for the parent portal flow.

**Step 3: Commit**
```bash
git add eduschedule-app/src/pages/parent/students.astro
git commit -m "feat: add photo upload to parent student profile"
```

---

## Task 13: Display Avatars — Admin Users Page

**Files:**
- Modify: `eduschedule-app/src/scripts/users-page-client.ts`
- Modify: `eduschedule-app/src/pages/admin/users.astro`

**Step 1: Ensure API returns photo_key**

Verify that the student list API or page data includes `photo_key` and `image_permission` for each student.

**Step 2: Import avatar helper and render**

In `users-page-client.ts`, where student rows are built:
```typescript
import { renderAvatarHtml } from './student-avatar-helper';

// In the row building function, prepend avatar before student name:
const avatarHtml = renderAvatarHtml(student.name, student.photo_key, student.image_permission ?? true, 'md');
// Insert into row HTML
```

**Step 3: Import student-avatar.css**

Add the CSS import to the page or ensure it's in the global stylesheet.

**Step 4: Commit**
```bash
git add eduschedule-app/src/scripts/users-page-client.ts eduschedule-app/src/pages/admin/users.astro
git commit -m "feat: display student avatars on admin users page"
```

---

## Task 14: Display Avatars — Admin Leads Page

**Files:**
- Modify: `eduschedule-app/src/scripts/leads-page-client.ts`
- Modify: `eduschedule-app/src/pages/admin/leads.astro`

**Step 1: Ensure leads API returns photo_key**

Verify the leads list includes `photo_key` for each lead.

**Step 2: Import avatar helper and render in lead rows**

Same pattern as Task 13 but using lead's `photo_key` and always `imagePermission: true` (leads don't have the image_permission flag — it's a student field).

**Step 3: Commit**
```bash
git add eduschedule-app/src/scripts/leads-page-client.ts eduschedule-app/src/pages/admin/leads.astro
git commit -m "feat: display student avatars on admin leads page"
```

---

## Task 15: Display Avatars — Admin Schedule & Enrollment Views

**Files:**
- Modify: `eduschedule-app/src/components/WeeklyScheduleGrid.astro`
- Modify: `eduschedule-app/src/components/views/AdminWeekView.astro`
- Modify: `eduschedule-app/src/scripts/enrollments-page-client.ts`

**Step 1: WeeklyScheduleGrid — add avatar next to student name**

The component receives `ScheduleItem[]` with `student_name` and `student_id`. To include photos, the data source needs to also pass `photo_key` and `image_permission`.

Update the `ScheduleItem` interface to include `photo_key?: string` and `image_permission?: boolean`.

Use `StudentAvatar` component (SSR) in the slot card next to the student name.

**Step 2: AdminWeekView — same pattern**

The `AdminScheduleEvent` interface includes `student_name` and `student_id`. Add `photo_key` and render avatar.

**Step 3: Enrollment detail — avatar in student header**

In `enrollments-page-client.ts`, where the enrollment detail shows student info, add avatar.

**Step 4: Commit**
```bash
git add eduschedule-app/src/components/WeeklyScheduleGrid.astro eduschedule-app/src/components/views/AdminWeekView.astro eduschedule-app/src/scripts/enrollments-page-client.ts
git commit -m "feat: display student avatars in schedule grid and enrollment views"
```

---

## Task 16: Display Avatars — Admin Booking Modal

**Files:**
- Modify: `eduschedule-app/src/components/SmartBookingModal.astro` and/or `eduschedule-app/src/scripts/booking-grid-client.ts`

**Step 1: Find student section in booking modal**

Locate where the student name appears in the booking edit flow and add avatar rendering.

**Step 2: Render avatar**

Use `renderAvatarHtml()` helper for the client-side rendered modal content.

**Step 3: Commit**
```bash
git add eduschedule-app/src/components/SmartBookingModal.astro eduschedule-app/src/scripts/booking-grid-client.ts
git commit -m "feat: display student avatar in booking edit modal"
```

---

## Task 17: Display Avatars — Teacher Pages

**Files:**
- Modify: `eduschedule-app/src/pages/teacher/index.astro`
- Modify: `eduschedule-app/src/pages/teacher/student/[id].astro`

**Step 1: Teacher dashboard — avatar in student list**

Import `StudentAvatar` component and render next to each student name in the "My Students" section.

**Step 2: Teacher student detail — large avatar in header**

Use `StudentAvatar` with `size="xl"` in the student detail page header.

**Step 3: Commit**
```bash
git add eduschedule-app/src/pages/teacher/index.astro eduschedule-app/src/pages/teacher/student/[id].astro
git commit -m "feat: display student avatars on teacher pages"
```

---

## Task 18: Display Avatars — Parent Pages

**Files:**
- Modify: `eduschedule-app/src/pages/parent/students.astro`
- Modify: `eduschedule-app/src/pages/parent/index.astro`

**Step 1: Parent student tabs — avatar in tab selector**

Replace the current initials-only pattern (`.student-tab__avatar`) with the `StudentAvatar` component at `size="xl"`.

**Step 2: Parent dashboard — avatar in student cards**

Use `StudentAvatar` with `size="lg"` in dashboard cards.

**Step 3: Commit**
```bash
git add eduschedule-app/src/pages/parent/students.astro eduschedule-app/src/pages/parent/index.astro
git commit -m "feat: display student avatars on parent pages"
```

---

## Task 19: Lead-to-Student Conversion — Copy Photo

**Files:**
- Modify: `eduschedule-app/src/lib/services/lead-service.ts`

**Step 1: Copy photo_key during conversion**

In `convertLeadToStudent()` (around line 420), add `photo_key` to the student creation data:

```typescript
const studentData: CreateStudentData = {
  name: lead.student_name,
  // ... existing fields
  photo_key: lead.photo_key,  // Copy photo from lead
};
```

**Step 2: Optionally copy R2 object to new key**

After student creation, if `lead.photo_key` exists, copy the R2 object from `leads/{leadId}/photo.jpg` to `students/{studentId}/photo.jpg` and update the student's `photo_key`:

```typescript
if (lead.photo_key) {
  const env = (this.runtime?.env ?? {}) as unknown as Record<string, unknown>;
  const photos = env.PHOTOS as R2Bucket;
  const srcObj = await photos.get(lead.photo_key);
  if (srcObj) {
    const newKey = `students/${student.id}/photo.jpg`;
    await photos.put(newKey, srcObj.body, {
      httpMetadata: srcObj.httpMetadata,
    });
    await this.db.prepare('UPDATE students SET photo_key = ? WHERE id = ?')
      .bind(newKey, student.id).run();
  }
}
```

**Step 3: Commit**
```bash
git add eduschedule-app/src/lib/services/lead-service.ts
git commit -m "feat: copy photo from lead to student during conversion"
```

---

## Task 20: Documentation Updates

**Files:**
- Modify: `eduschedule-app/project-context.md`
- Modify: `docs/reference/api-contracts.md`
- Modify: `docs/reference/data-models.md`
- Modify: `docs/reference/feature-maps.md`

**Step 1: Update project-context.md**

Add to Recent Changes:
```
### 2026-02-18 — Student Photo Avatars
- Added R2 bucket (eduschedule-photos) for profile photo storage
- Added photo_key column to students and leads tables
- New components: StudentAvatar.astro, PhotoDropZone.astro
- New API endpoints: POST/DELETE /api/students/[id]/photo, POST /api/leads/[id]/photo
- Photos displayed across 12 key locations (admin, teacher, parent)
- Cropper.js for client-side crop, Canvas API for resize
- LGPD-compliant: image_permission gates display
```

**Step 2: Update api-contracts.md**

Add documentation for the two new API endpoints.

**Step 3: Update data-models.md**

Add `photo_key TEXT` to students and leads table schemas.

**Step 4: Update feature-maps.md**

Add a new "Student Photos / Avatars" feature map listing all affected files.

**Step 5: Commit**
```bash
git add eduschedule-app/project-context.md docs/reference/api-contracts.md docs/reference/data-models.md docs/reference/feature-maps.md
git commit -m "docs: add student photo avatars to project documentation"
```

---

## Task 21: Apply Production Migration

**Step 1: Apply migration to production D1**

Run:
```bash
cd eduschedule-app && npx wrangler d1 migrations apply eduschedule-db --remote
```
Expected: Migration 121 applied successfully.

**Step 2: Configure R2 bucket in Cloudflare dashboard**

- R2 > eduschedule-photos > Settings > Public access
- Add custom domain or enable r2.dev subdomain
- Update R2_PUBLIC_URL env var in dashboard

**Step 3: Deploy**

Run:
```bash
cd eduschedule-app && npm run deploy
```

---

## Dependency Order

```
Task 1 (R2 setup) ──┐
Task 2 (migration) ──┤
Task 3 (types) ──────┼── Task 4 (repositories) ── Task 5 (API endpoints) ──┐
                     │                                                      │
                     └── Task 6 (Avatar component) ── Task 7 (JS helper) ──┤
                                                                            │
Task 8 (PhotoDropZone + Cropper.js) ───────────────────────────────────────┤
                                                                            │
┌───────────────────────────────────────────────────────────────────────────┘
│
├── Task 9  (StudentForm integration)
├── Task 10 (LeadForm integration)
├── Task 11 (Cadastro integration)
├── Task 12 (Parent upload)
├── Task 13 (Admin Users display)
├── Task 14 (Admin Leads display)
├── Task 15 (Schedule views display)
├── Task 16 (Booking modal display)
├── Task 17 (Teacher pages display)
├── Task 18 (Parent pages display)
├── Task 19 (Lead conversion copy)
│
└── Task 20 (Documentation) ── Task 21 (Deploy)
```

Tasks 9-19 are independent of each other and can be done in any order.
