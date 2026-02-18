# Student Photo Avatars — Design Document

**Date:** 2026-02-18
**Status:** Approved
**Feature:** Profile photos for students and leads with crop-and-upload UX

---

## Overview

Add profile photos to students and leads, displayed as circular avatars across the app. Photos are uploaded via a client-side crop tool (Cropper.js), stored in Cloudflare R2, and served from a public bucket URL. The `image_permission` field on students gates display (LGPD compliance).

## Decision: R2 + Client-Side Crop (No Images Binding)

**Why R2:** Native Pages binding support, zero egress fees, ~10MB total storage for ~200 students = free tier.

**Why not Cloudflare Images:** The Images binding is not supported on Cloudflare Pages (Workers only). Cloudflare Images standalone is overkill for this scale.

**Why client-side resize:** Canvas API produces excellent quality at 256px JPEG. Server-side transformation is unnecessary for small avatars.

---

## Architecture

```
Client (Browser)
  File Select / Drag-and-Drop
    → Cropper.js (square crop, circular preview)
    → Canvas API resize to 256×256px JPEG @ 85% quality
    → POST /api/students/[id]/photo  (or /api/leads/[id]/photo)

API Endpoint (Pages Function)
  → Validate: auth, file type (JPEG/PNG/WebP), size < 2MB
  → Generate key: students/{id}/photo.jpg (or leads/{id}/photo.jpg)
  → env.PHOTOS.put(key, blob)
  → UPDATE table SET photo_key = key
  → Return { photoUrl }

Display (StudentAvatar component)
  → If photo_key AND image_permission → <img> from R2 URL
  → Else → initials in colored circle (existing pattern)
```

---

## Data Model

### Migration: Add photo_key to students and leads

```sql
ALTER TABLE students ADD COLUMN photo_key TEXT;
ALTER TABLE leads ADD COLUMN photo_key TEXT;
```

### R2 Bucket

- **Bucket name:** `eduschedule-photos`
- **Public access:** Enabled
- **Key pattern:** `students/{id}/photo.jpg` or `leads/{id}/photo.jpg`
- **Re-upload:** Overwrites same key (no orphans)
- **Serving URL:** `https://photos.ensinobilin.com/{key}` (custom domain) or `*.r2.dev` fallback

### wrangler.toml

```toml
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "eduschedule-photos"
```

### Lead-to-Student Conversion

In `lead-service.ts` `convertLeadToStudent()`, copy `photo_key` from lead to student. If the R2 key uses `leads/{id}/photo.jpg`, copy the R2 object to `students/{newId}/photo.jpg` and update the key.

---

## Components

### New: `StudentAvatar.astro`

Reusable avatar component displayed everywhere.

**Props:**
- `name: string` — for initials fallback
- `photoKey?: string` — R2 object key
- `imagePermission?: boolean` — LGPD gate
- `size: 'sm' | 'md' | 'lg' | 'xl'` — 32/40/56/80px

**Logic:**
- If `photoKey` AND `imagePermission` → `<img>` with R2 URL, circular, lazy loading, `onerror` fallback to initials
- Else → initials in colored circle (first letter of first + last name)

**Sizes** (matching SkeletonAvatar):

| Size | Pixels | Use case |
|------|--------|----------|
| `sm` | 32px | Dense tables, schedule cards |
| `md` | 40px | List rows, enrollment cards |
| `lg` | 56px | Student detail header |
| `xl` | 80px | Parent student tabs, profile, form previews |

### New: `PhotoDropZone` (client-side component)

Drag-and-drop upload area with Cropper.js integration.

**Features:**
- Dashed border drop zone
- Circular preview after selection
- Click to open file picker (fallback)
- Opens Cropper.js modal for square crop
- Portuguese labels for cadastro page
- Supports both form-embedded (cadastro) and modal contexts
- Exports cropped blob for form submission or direct API upload

**Visual:**
```
┌─────────────────────────────┐
│                             │
│      ┌───────────┐          │
│      │  (circle  │          │
│      │  preview) │          │
│      └───────────┘          │
│                             │
│  Arraste uma foto ou        │
│  clique para selecionar     │
│                             │
└─────────────────────────────┘
```

### New: `CropModal` (client-side)

Cropper.js-powered modal for adjusting crop area.

- Square aspect ratio (1:1)
- Circular mask overlay
- Zoom controls
- "Salvar" / "Cancelar" buttons
- On save: Canvas resize to 256px → JPEG blob

---

## Upload Points (4)

| # | Where | Who | Notes |
|---|-------|-----|-------|
| 1 | Admin Users — student create/edit modal (`StudentForm.astro`) | Admin | PhotoDropZone in form |
| 2 | Admin Leads — lead create/edit modal (`LeadForm.astro`) | Admin | PhotoDropZone in form |
| 3 | Cadastro page — Step 1 "Aluno" (`cadastro.astro`) | Public/Parent | PhotoDropZone with drag-and-drop. Optional. Photo submitted with form. |
| 4 | Parent portal — student profile | Parent | Upload/change for linked students |

---

## Display Locations (12)

| # | Location | Component/File | Size |
|---|----------|---------------|------|
| 1 | Admin Users — student list | `users-page-client.ts` | `md` |
| 2 | Admin Enrollment detail — student header | `enrollments-page-client.ts` | `lg` |
| 3 | Admin Schedule — week view cards | `AdminWeekView.astro` | `sm` |
| 4 | Admin Leads — leads table | `leads-page-client.ts` | `md` |
| 5 | Admin Booking — edit modal student section | `booking-grid-client.ts` / `SmartBookingModal.astro` | `md` |
| 6 | Enrollment week view cards | `WeeklyScheduleGrid.astro` | `sm` |
| 7 | Teacher Dashboard — enrollment list | `teacher/index.astro` | `md` |
| 8 | Teacher Student Detail — page header | `teacher/student/[id].astro` | `xl` |
| 9 | Parent Student Tabs — tab selector | `parent/students.astro` | `xl` |
| 10 | Parent Dashboard — student cards | `parent/index.astro` | `lg` |
| 11 | Cadastro form — preview after upload | `cadastro.astro` Step 1 | `xl` |
| 12 | Lead create/edit modal — preview | `LeadForm.astro` | `xl` |

---

## API Endpoints

### `POST /api/students/[id]/photo`

- **Auth:** Admin OR parent of this student
- **Body:** Multipart form data with cropped image blob
- **Validates:** File type (JPEG/PNG/WebP), size < 2MB
- **Action:** Store in R2 at `students/{id}/photo.jpg`, update `photo_key` in D1
- **Response:** `{ photoUrl: string }`

### `DELETE /api/students/[id]/photo`

- **Auth:** Admin only
- **Action:** Delete from R2, set `photo_key = NULL`

### `POST /api/leads/[id]/photo`

- **Auth:** Admin only
- **Body:** Same as student photo endpoint
- **Action:** Store in R2 at `leads/{id}/photo.jpg`, update `photo_key` in D1
- **Response:** `{ photoUrl: string }`

### Cadastro Form Integration

The cadastro form (`POST /api/public/register`) already handles multipart form data. The photo blob is included as an additional form field. On lead creation, the API stores the photo in R2 and sets `photo_key` on the new lead record.

---

## Error Handling

- **Upload fails:** Toast error, keep existing photo
- **R2 unavailable:** Fallback to initials (`photo_key` exists but image 404 → CSS fallback via `onerror`)
- **Large files:** Client-side validation rejects > 5MB originals before crop
- **Invalid format:** File input `accept` attribute limits to JPEG/PNG/WebP
- **Parent access control:** Parents can only upload for their linked students (checked via `parent_links` table)
- **Broken images:** `<img onerror>` handler swaps to initials fallback

---

## Dependencies

- **Cropper.js** — client-side image cropping library (~30KB gzipped)
  - Loaded only on pages with upload functionality (not on display-only pages)
  - CDN or npm install

---

## LGPD Compliance

- `image_permission` field (already exists on students) gates photo display
- If `image_permission = false`: show initials even if `photo_key` exists
- Photo stored in R2 regardless (available if permission granted later)
- LGPD deletion requests should include R2 photo cleanup
