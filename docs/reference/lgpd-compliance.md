# LGPD Compliance - EduSchedule Pro

**Last Updated:** 2025-12-31
**LGPD Version:** Lei nº 13.709/2018
**Data Controller:** BILIN Method Language School

---

## Overview

EduSchedule Pro is compliant with Brazil's Lei Geral de Proteção de Dados (LGPD). This document outlines our data protection practices, retention policies, and third-party disclosures.

---

## 1. Data We Collect

### Personal Data Categories

| Category | Data Collected | Legal Basis | Retention |
|----------|---------------|-------------|-----------|
| **Identity** | Name, birth date, CPF | Contract execution | Active + 5 years |
| **Contact** | Email, phone, address | Contract execution | Active + 5 years |
| **Financial** | PIX key, payment status | Contract execution | Active + 5 years |
| **Location** | Address, coordinates | Legitimate interest (scheduling) | Active + 1 year |
| **Health** | Allergies | Vital interests | Active period only |
| **Educational** | Language level, class history | Contract execution | Active + 5 years |
| **Technical** | IP address, browser info | Legitimate interest (security) | 90 days |

### Data Subjects

- **Teachers**: Full name, contact info, CPF, PIX key, address, schedule
- **Students**: Name, birth date, allergies, parent contact info
- **Parents**: Name, email, phone, CPF, Instagram handle
- **Leads**: Name, contact info, availability preferences

---

## 2. Data Retention Policy

### Active Data

| Data Type | Retention Period | Trigger for Deletion |
|-----------|-----------------|---------------------|
| Active user accounts | Indefinite | User request or inactivity |
| Active enrollments | Duration of enrollment | Enrollment ends |
| Session data | 7 days | Session expiry |
| Audit logs | 2 years | Automatic |

### Inactive Data

| Condition | Retention | Action |
|-----------|-----------|--------|
| Inactive student (INATIVO) | 5 years | Anonymize |
| Inactive teacher | 5 years | Anonymize |
| Deleted lead | 1 year | Full deletion |
| Canceled enrollment | 5 years | Archive |

### Financial Records

Brazilian law requires financial records to be kept for 5 years for tax purposes (Lei nº 5.172/1966). This includes:
- Payment records
- Contract dates
- Service delivery records

### Automatic Cleanup

The system automatically:
1. Expires sessions after 7 days
2. Cleans up orphaned slot reservations after 24 hours
3. Archives completed class records after enrollment ends

---

## 3. Third-Party Disclosures

### Service Providers

| Provider | Purpose | Data Shared | Location | DPA |
|----------|---------|-------------|----------|-----|
| **Google OAuth** | Authentication | Email, name | USA | Yes (SCCs) |
| **Microsoft OAuth** | Authentication | Email, name | USA | Yes (SCCs) |
| **Cloudflare** | Hosting, CDN, Database | All data | Global | Yes |
| **LocationIQ** | Geocoding | Addresses | USA | Yes |
| **Google Calendar** | Schedule sync | Enrollment times | USA | Yes (Workspace) |

### Data Transfer Safeguards

For transfers to countries without adequate protection (USA), we rely on:
- Standard Contractual Clauses (SCCs)
- Provider certifications (SOC 2, ISO 27001)
- Encryption in transit and at rest

### No Data Sales

We do **not** sell personal data to third parties.

---

## 4. User Rights (LGPD Art. 18)

Users can exercise the following rights through our platform:

| Right | How to Exercise | Response Time |
|-------|----------------|---------------|
| **Access** | GET `/api/lgpd/export` | Immediate |
| **Correction** | Profile settings page | Immediate |
| **Deletion** | POST `/api/lgpd/deletion` | 15 days |
| **Portability** | GET `/api/lgpd/export` | Immediate |
| **Consent withdrawal** | POST `/api/lgpd/consent` | Immediate |
| **Information** | This document | Available |

### Contact

For LGPD requests, contact:
- **Email**: lgpd@bilinmethod.com
- **In-app**: Settings > Privacy > Data Requests

---

## 5. Security Measures

### Technical Measures

| Measure | Implementation |
|---------|----------------|
| **Encryption at rest** | AES-256-GCM for sensitive fields |
| **Encryption in transit** | TLS 1.3 |
| **Access control** | Role-based (admin, teacher, parent) |
| **Authentication** | OAuth 2.0 with secure session management |
| **CSRF protection** | Token validation on all mutations |
| **SQL injection** | Prepared statements only |
| **XSS prevention** | HTML escaping, CSP headers |
| **Rate limiting** | Per-endpoint limits |

### Organizational Measures

- Access limited to authorized personnel
- Regular security audits
- Incident response procedures
- Employee training on data protection

---

## 6. Consent Management

### Consent Types

| Type | Required | Purpose |
|------|----------|---------|
| **Data Processing** | Yes | Core service functionality |
| **Marketing** | No | Promotional communications |
| **Third-Party Sharing** | No | Integration with external services |
| **Analytics** | No | Usage analytics and improvements |

### Consent Collection

- Consent is collected at registration
- Users can modify consent at any time via Settings
- Consent changes are logged with timestamp, IP, and user agent

---

## 7. Data Breach Procedures

In case of a data breach:

1. **Detection**: Automated monitoring for suspicious activity
2. **Containment**: Immediate isolation of affected systems
3. **Assessment**: Determine scope and affected users
4. **Notification**:
   - ANPD within 72 hours (if required)
   - Affected users "without undue delay"
5. **Remediation**: Fix vulnerability, restore services
6. **Documentation**: Full incident report

---

## 8. API Endpoints

### Consent Management
```
GET  /api/lgpd/consent     - Get current consent status
POST /api/lgpd/consent     - Update consent
```

### Data Export
```
GET  /api/lgpd/export      - Download personal data (JSON)
POST /api/lgpd/export      - Request data export
```

### Data Deletion
```
GET  /api/lgpd/deletion    - Check deletion request status
POST /api/lgpd/deletion    - Request account deletion
PUT  /api/lgpd/deletion    - Process request (admin only)
```

---

## 9. Database Tables

LGPD compliance is tracked in these tables:

- `lgpd_consent` - Consent records with audit trail
- `lgpd_deletion_requests` - Deletion request workflow
- `lgpd_export_requests` - Data export request log
- `audit_log` - All data modifications

---

## 10. Updates to This Policy

This policy may be updated to reflect:
- Changes in applicable law
- New data processing activities
- Enhanced security measures

Users will be notified of material changes via email or in-app notification.

---

**Document Version:** 1.0
**Effective Date:** 2025-12-31
**Next Review:** 2026-06-30
