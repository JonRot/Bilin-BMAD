# Unified Error Resolution System - Feature Plan

**Status:** Planning
**Priority:** High
**Created:** 2026-01-02

## Overview

Transform the current `/admin/travel-errors` page into a comprehensive error resolution center (`/admin/resolve-errors`) that handles all types of data quality issues across leads, students, and teachers - with quick-fix actions and direct communication tools.

---

## Current Pain Points

1. **Leads page issues:**
   - Not sorted by newest first
   - No visibility into which leads have problems
   - No categorization by data quality

2. **Error handling is fragmented:**
   - Travel errors are separate from other data issues
   - No unified view of what needs attention
   - Can't easily contact leads about missing info

3. **Missing data types not tracked:**
   - Missing phone/email
   - Incomplete addresses
   - Missing parent info
   - Invalid data formats

---

## Proposed Solution

### 1. Rename & Expand `/admin/travel-errors` → `/admin/resolve-errors`

A unified error resolution dashboard with categories:

| Category | Icon | Description |
|----------|------|-------------|
| **Localização** | 📍 | Missing coordinates, geocoding failures, address issues |
| **Contato** | 📱 | Missing phone, email, or WhatsApp |
| **Dados Incompletos** | ⚠️ | Missing parent name, student name, etc. |
| **Dados Inválidos** | ❌ | Invalid formats (phone, email, dates) |
| **Tempo de Viagem** | ⏰ | Anomalies in travel time calculations |

### 2. Auto-Detection of Issues

When leads/students/teachers are created or updated, automatically detect and log issues:

```typescript
interface DataIssue {
  id: string;
  entity_type: 'lead' | 'student' | 'teacher';
  entity_id: string;
  category: 'location' | 'contact' | 'incomplete' | 'invalid' | 'travel';
  error_type: string;
  error_message: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'PENDING' | 'RESOLVED';
  created_at: number;
  resolved_at?: number;
}
```

### 3. Quick Actions per Category

**Location Issues:**
- ✏️ Edit Address
- 🗺️ Auto-Geocode
- 📱 Contact via WhatsApp

**Contact Issues:**
- ✏️ Add Phone/Email
- 📱 Contact via WhatsApp (if available)

**Incomplete Data:**
- ✏️ Complete Form
- 📱 Request Info via WhatsApp

### 4. WhatsApp Integration

Button that opens WhatsApp with pre-filled message:

```
wa.me/{phone}?text=Olá! Somos da Ensino Bilin.
Estamos finalizando o cadastro de {student_name} e
precisamos de algumas informações adicionais...
```

Templates per issue type:
- Missing address
- Missing phone
- Incomplete registration
- Confirmation of data

### 5. Leads Page Improvements

- Sort by `created_at DESC` (newest first)
- Add status badges for data quality:
  - 🟢 Complete - all data present
  - 🟡 Incomplete - missing optional fields
  - 🔴 Issues - missing critical fields
- Filter by data quality status
- Link to resolve-errors page for each lead

---

## Database Changes

### Option A: Extend `travel_time_errors` table

Rename and add columns:
```sql
ALTER TABLE travel_time_errors RENAME TO data_issues;
ALTER TABLE data_issues ADD COLUMN category TEXT DEFAULT 'travel';
ALTER TABLE data_issues ADD COLUMN severity TEXT DEFAULT 'warning';
```

### Option B: New `data_issues` table

```sql
CREATE TABLE data_issues (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- lead, student, teacher
  entity_id TEXT NOT NULL,
  category TEXT NOT NULL, -- location, contact, incomplete, invalid, travel
  error_type TEXT NOT NULL,
  error_message TEXT,
  severity TEXT DEFAULT 'warning', -- critical, warning, info
  status TEXT DEFAULT 'PENDING',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT
);
```

**Recommendation:** Option B - cleaner separation, migration can move existing travel errors

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│ Resolver Problemas                                                   │
│ Gerencie problemas de dados e entre em contato com leads            │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ 📍 12   │ │ 📱 5    │ │ ⚠️ 8    │ │ ❌ 2    │ │ ⏰ 15   │        │
│ │Localiz. │ │Contato  │ │Incompl. │ │Inválido │ │Viagem   │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────────────────────────────┤
│ [Pendentes (42)] [Resolvidos] [Buscar...]                           │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 📋 Matteo Amandio  📍 Meia Praia  🔴 Crítico                    │ │
│ │ ├ 📍 Endereço sem coordenadas                                   │ │
│ │ ├ 📱 Telefone não informado                                     │ │
│ │ [Editar] [Geocodificar] [WhatsApp] [Marcar Resolvido] [Excluir] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 📋 Julia Santos  📍 Centro, Floripa  🟡 Aviso                   │ │
│ │ ├ ⚠️ Nome do responsável não informado                          │ │
│ │ [Editar] [WhatsApp] [Marcar Resolvido] [Excluir]                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Leads Page Quick Fixes (1-2 hours)
- [ ] Sort leads by newest first
- [ ] Add data quality badges to lead cards
- [ ] Add filter by data quality

### Phase 2: Database & Detection (2-3 hours)
- [ ] Create `data_issues` table
- [ ] Migrate existing `travel_time_errors` data
- [ ] Create issue detection service
- [ ] Hook into lead/student/teacher create/update

### Phase 3: Unified Resolve Page (3-4 hours)
- [ ] Rename route to `/admin/resolve-errors`
- [ ] Add category tabs (Location, Contact, Incomplete, Invalid, Travel)
- [ ] Update entity cards to show all issue types
- [ ] Add severity indicators

### Phase 4: WhatsApp Integration (1-2 hours)
- [ ] Create WhatsApp link generator
- [ ] Add message templates per issue type
- [ ] Add WhatsApp button to entity cards
- [ ] Handle cases where phone is missing

### Phase 5: Auto-Detection Hooks (2-3 hours)
- [ ] Detect issues on lead creation (JotForm webhook)
- [ ] Detect issues on manual lead creation
- [ ] Detect issues on student/teacher updates
- [ ] Auto-resolve issues when data is fixed

---

## Questions to Decide

1. **Should we keep travel-errors separate or merge everything?**
   - Merge: One place for all issues
   - Separate: Travel errors are more technical

2. **WhatsApp message templates - hardcoded or configurable?**
   - Hardcoded: Simpler, faster to implement
   - Configurable: Admin can customize messages

3. **Auto-resolve behavior:**
   - When address is fixed, auto-resolve location issues?
   - Or require manual confirmation?

4. **Notification for new issues?**
   - Badge count in nav
   - Email notifications
   - Both

---

## Files to Modify/Create

| Action | File |
|--------|------|
| CREATE | `src/lib/services/data-issue-service.ts` |
| CREATE | `src/pages/admin/resolve-errors.astro` |
| CREATE | `src/pages/api/admin/data-issues/*.ts` |
| MODIFY | `src/pages/admin/leads.astro` (sorting, badges) |
| MODIFY | `src/pages/api/webhooks/jotform.ts` (auto-detect) |
| MODIFY | `src/pages/api/leads/*.ts` (auto-detect) |
| MIGRATE | `travel_time_errors` → `data_issues` |
| DELETE | `src/pages/admin/travel-errors.astro` (after migration) |

---

## Next Steps

1. **Decide on questions above**
2. **Start with Phase 1** (leads page quick fixes) - immediate value
3. **Then Phase 2-3** (unified error page)
4. **Finally Phase 4-5** (WhatsApp & auto-detection)

---

**Estimated Total Effort:** 10-15 hours across all phases

