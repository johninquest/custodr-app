# API Specification — Contract Management Platform

## Base URL

```
Production: https://api.example.com/api/v1
Development: http://localhost:8080/api/v1
```

## Currency Convention

All monetary values in the API are represented as **decimal numbers** (e.g., `15.99` for €15.99). The backend stores amounts as **INTEGER cents** in SQLite (e.g., `1599`) to avoid floating-point precision issues. Conversion between decimals and cents happens in the service layer.

- API request: `"cost": 15.99` (decimal)
- Database storage: `cost = 1599` (integer cents)
- API response: `"cost": 15.99` (decimal)

---

## Authentication

All endpoints except `/auth/*` require a valid Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

The backend validates the token, extracts the Firebase UID, and maps it to an internal user ID.

---

## Endpoints

### Authentication

#### POST /auth/login

Exchange Firebase ID token for internal session.

**Request:**
```json
{
  "firebase_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-07-13T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized` — Invalid or expired Firebase token
- `500 Internal Server Error` — Failed to create/retrieve user

---

### Users

#### GET /users/me

Retrieve the authenticated user's profile.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "email_verified": true,
  "created_at": "2026-07-13T10:00:00Z",
  "updated_at": "2026-07-13T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized` — Missing or invalid authentication

#### DELETE /users/me

Permanently delete the authenticated user's account and all associated data (GDPR right to erasure). This is a hard delete — all contracts, reminders, notification records, and consents are removed. `audit_logs.actor_user_id` is set to NULL.

**Response (204 No Content):** Empty response

**Errors:**
- `401 Unauthorized` — Missing or invalid authentication
- `500 Internal Server Error` — Failed to delete user data

---

### Consents

#### GET /users/me/consents

Retrieve the authenticated user's consent records (Einwilligungserklärungen).

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "consent_type": "email_notifications",
      "version": "2026-09-05",
      "granted_at": "2026-09-05T10:00:00Z",
      "withdrawn_at": null
    }
  ]
}
```

#### POST /users/me/consents

Grant a new consent (or record a new version of an existing type).

**Request:**
```json
{
  "consent_type": "email_notifications",
  "version": "2026-09-05"
}
```

**Validation Rules:**
- `consent_type`: Required, must be `email_notifications`
- `version`: Required, consent text version identifier

**Response (201 Created):**
```json
{
  "id": "uuid",
  "consent_type": "email_notifications",
  "version": "2026-09-05",
  "granted_at": "2026-09-05T10:00:00Z",
  "withdrawn_at": null
}
```

**Errors:**
- `400 Bad Request` — Validation failed
- `401 Unauthorized` — Missing or invalid authentication

#### DELETE /users/me/consents/:type

Withdraw consent (sets `withdrawn_at`). The record is retained for audit.

**Response (204 No Content):** Empty response

**Errors:**
- `404 Not Found` — No active consent of this type
- `401 Unauthorized` — Missing or invalid authentication

---

### Contracts

#### GET /contracts

List all contracts visible to the authenticated user (owned contracts plus contracts shared with them as a viewer).

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `cancelled`, `expired`, `paused`, `review_needed`)
- `category` (optional): Filter by category
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Netflix Premium",
      "category": "streaming_subscription",
      "provider": "Netflix",
      "start_date": "2024-01-15",
      "renewal_date": "2026-01-15",
      "cancellation_deadline": "2025-12-15",
      "cost": 15.99,
      "currency": "EUR",
      "billing_frequency": "monthly",
      "status": "active",
      "notes": "Family plan",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### POST /contracts

Create a new contract.

**Request:**
```json
{
  "name": "Netflix Premium",
  "category": "streaming_subscription",
  "provider": "Netflix",
  "start_date": "2024-01-15",
  "renewal_date": "2026-01-15",
  "cancellation_deadline": "2025-12-15",
  "cost": 15.99,
  "currency": "EUR",
  "billing_frequency": "monthly",
  "notes": "Family plan"
}
```

**Validation Rules:**
- `name`: Required, 1-255 characters
- `category`: Required, must be one of: `insurance`, `electricity_contract`, `gas_contract`, `mobile_contract`, `streaming_subscription`, `other`
- `provider`: Required, 1-255 characters
- `start_date`: Required, ISO 8601 date (YYYY-MM-DD)
- `renewal_date`: Required, ISO 8601 date, must be after start_date
- `cancellation_deadline`: Optional, ISO 8601 date, must be before renewal_date
- `cost`: Required, positive number
- `currency`: Required, ISO 4217 currency code (default: EUR)
- `billing_frequency`: Required, one of: `monthly`, `quarterly`, `semi_annual`, `annual`
- `notes`: Optional, max 1000 characters

**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "Netflix Premium",
  "category": "streaming_subscription",
  "provider": "Netflix",
  "start_date": "2024-01-15",
  "renewal_date": "2026-01-15",
  "cancellation_deadline": "2025-12-15",
  "cost": 15.99,
  "currency": "EUR",
  "billing_frequency": "monthly",
  "status": "active",
  "notes": "Family plan",
  "created_at": "2026-07-13T10:00:00Z",
  "updated_at": "2026-07-13T10:00:00Z"
}
```

**Errors:**
- `400 Bad Request` — Validation failed (see error response format)
- `401 Unauthorized` — Missing or invalid authentication
- `500 Internal Server Error` — Database error

#### GET /contracts/:id

Retrieve a single contract.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Netflix Premium",
  "category": "streaming_subscription",
  "provider": "Netflix",
  "start_date": "2024-01-15",
  "renewal_date": "2026-01-15",
  "cancellation_deadline": "2025-12-15",
  "cost": 15.99,
  "currency": "EUR",
  "billing_frequency": "monthly",
  "status": "active",
  "notes": "Family plan",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**
- `404 Not Found` — Contract not found or not visible to the user
- `401 Unauthorized` — Missing or invalid authentication

#### PUT /contracts/:id

Update a contract.

**Request:**
```json
{
  "name": "Netflix Premium",
  "category": "streaming_subscription",
  "provider": "Netflix",
  "start_date": "2024-01-15",
  "renewal_date": "2026-01-15",
  "cancellation_deadline": "2025-12-15",
  "cost": 17.99,
  "currency": "EUR",
  "billing_frequency": "monthly",
  "status": "active",
  "notes": "Price increased"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Netflix Premium",
  "category": "streaming_subscription",
  "provider": "Netflix",
  "start_date": "2024-01-15",
  "renewal_date": "2026-01-15",
  "cancellation_deadline": "2025-12-15",
  "cost": 17.99,
  "currency": "EUR",
  "billing_frequency": "monthly",
  "status": "active",
  "notes": "Price increased",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2026-07-13T11:00:00Z"
}
```

**Errors:**
- `400 Bad Request` — Validation failed
- `404 Not Found` — Contract not found or not visible to the user
- `401 Unauthorized` — Missing or invalid authentication

#### DELETE /contracts/:id

Soft delete a contract (sets `deleted_at`). Also soft-deletes its audit log rows.

**Response (204 No Content):** Empty response

**Errors:**
- `404 Not Found` — Contract not found or not visible to the user
- `401 Unauthorized` — Missing or invalid authentication

#### GET /contracts/upcoming

Get contracts with upcoming renewal or cancellation deadlines.

**Query Parameters:**
- `days` (optional, default: 90, max: 365): Number of days to look ahead
- `type` (optional): Filter by `renewal` or `cancellation`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Netflix Premium",
      "category": "streaming_subscription",
      "provider": "Netflix",
      "renewal_date": "2026-01-15",
      "cancellation_deadline": "2025-12-15",
      "days_until_renewal": 186,
      "days_until_cancellation": 155,
      "cost": 15.99,
      "currency": "EUR",
      "billing_frequency": "monthly",
      "status": "active"
    }
  ],
  "summary": {
    "total_upcoming": 12,
    "total_cost_monthly": 245.50,
    "currency": "EUR"
  }
}
```

#### GET /contracts/:id/shares

List active shares for a contract (owner only).

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "grantee_email": "wife@example.com",
      "role": "viewer",
      "granted_by": "uuid",
      "granted_at": "2026-09-05T10:00:00Z"
    }
  ]
}
```

**Errors:**
- `404 Not Found` — Contract not found or not owned by the user
- `401 Unauthorized` — Missing or invalid authentication

#### POST /contracts/:id/shares

Grant read-only access to a contract by email (owner only). The grantee need not have an account yet; access resolves at their next login.

**Request:**
```json
{
  "grantee_email": "wife@example.com"
}
```

**Validation Rules:**
- `grantee_email`: Required, valid email address

**Response (201 Created):**
```json
{
  "id": "uuid",
  "contract_id": "uuid",
  "grantee_email": "wife@example.com",
  "role": "viewer",
  "granted_by": "uuid",
  "granted_at": "2026-09-05T10:00:00Z"
}
```

**Errors:**
- `400 Bad Request` — Validation failed
- `404 Not Found` — Contract not found or not owned by the user
- `409 Conflict` — Share already exists for this email
- `401 Unauthorized` — Missing or invalid authentication

#### DELETE /contracts/:id/shares/:shareId

Revoke a share (sets `revoked_at`). Owner only.

**Response (204 No Content):** Empty response

**Errors:**
- `404 Not Found` — Share or contract not found, or not owned by the user
- `401 Unauthorized` — Missing or invalid authentication

#### GET /contracts/:id/audit

Get the activity feed for a contract. Readable by the owner and by active grantees.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "entity_type": "contract",
      "entity_id": "uuid",
      "actor_user_id": "uuid",
      "action": "updated",
      "field": "cost",
      "before_value": 15.99,
      "after_value": 17.99,
      "created_at": "2026-07-13T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

**Errors:**
- `404 Not Found` — Contract not found or not visible to the user
- `401 Unauthorized` — Missing or invalid authentication

---

### Reminders

#### GET /reminders

List reminder history for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by `pending`, `sent`, `failed`
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "contract_id": "uuid",
      "contract_name": "Netflix Premium",
      "reminder_type": "cancellation_deadline",
      "scheduled_date": "2025-12-15",
      "sent_at": "2025-12-15T08:00:00Z",
      "status": "sent",
      "days_before": 30
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### GET /reminders/preferences

Get user's reminder preferences.

**Response (200 OK):**
```json
{
  "reminder_windows": [90, 60, 30, 14, 7, 1],
  "email_enabled": true,
  "timezone": "Europe/Berlin"
}
```

#### PUT /reminders/preferences

Update user's reminder preferences.

**Request:**
```json
{
  "reminder_windows": [90, 30, 7],
  "email_enabled": true,
  "timezone": "Europe/Berlin"
}
```

**Validation Rules:**
- `reminder_windows`: Array of integers, each must be one of: 1, 7, 14, 30, 60, 90
- `email_enabled`: Boolean
- `timezone`: Valid IANA timezone string

**Response (200 OK):**
```json
{
  "reminder_windows": [90, 30, 7],
  "email_enabled": true,
  "timezone": "Europe/Berlin"
}
```

---

### Dashboard

#### GET /dashboard/summary

Get dashboard summary data.

**Response (200 OK):**
```json
{
  "upcoming_deadlines": {
    "next_7_days": 2,
    "next_30_days": 5,
    "next_90_days": 12
  },
  "contracts_by_status": {
    "active": 15,
    "cancelled": 3,
    "expired": 2,
    "paused": 1,
    "review_needed": 4
  },
  "contracts_by_category": {
    "insurance": 3,
    "electricity_contract": 2,
    "gas_contract": 1,
    "mobile_contract": 1,
    "streaming_subscription": 5,
    "other": 1
  },
  "monthly_cost": {
    "total": 245.50,
    "currency": "EUR"
  },
  "recently_added": [
    {
      "id": "uuid",
      "name": "Netflix Premium",
      "category": "streaming_subscription",
      "provider": "Netflix",
      "created_at": "2026-07-13T10:00:00Z"
    }
  ]
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      },
      {
        "field": "cost",
        "message": "Cost must be a positive number"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## HTTP Status Codes

| Code | Usage |
|------|-------|
| `200 OK` | Successful GET, PUT, PATCH |
| `201 Created` | Successful POST (resource created) |
| `204 No Content` | Successful DELETE |
| `400 Bad Request` | Validation error, malformed request |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Valid auth but insufficient permissions |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource already exists |
| `500 Internal Server Error` | Server error |

---

## Pagination

All list endpoints support pagination with `page` and `limit` query parameters.

**Default values:**
- `page`: 1
- `limit`: 20 (max: 100)

**Response includes:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

## Rate Limiting

- **Authenticated endpoints**: 100 requests per minute per user
- **Auth endpoints**: 10 requests per minute per IP

**Rate limit headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1626163200
```

**Rate limit exceeded response (429 Too Many Requests):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds."
  }
}
```

---

## CORS

The API supports CORS for the frontend origin:

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

---

## Content Type

All requests and responses use JSON:

```
Content-Type: application/json
```

---

## Date/Time Format

- **Dates**: ISO 8601 date format (YYYY-MM-DD)
- **Timestamps**: ISO 8601 with timezone (YYYY-MM-DDTHH:MM:SSZ)

---

## Reminder System Architecture

The reminder system operates in two modes:

### 1. User-Facing API (In-App Reminders)

The `GET /reminders` endpoint returns reminder records for display in the frontend. Reminders are automatically generated when a contract is created or updated, based on the user's `reminder_preferences`. Each reminder represents a scheduled notification at a specific window (e.g., 30 days before cancellation deadline).

**Reminder generation flow:**
1. User creates/updates a contract with renewal and/or cancellation dates
2. Service layer reads user's `reminder_preferences` (default: `[90, 60, 30, 14, 7, 1]`)
3. For each window, calculate `scheduled_date = deadline - days_before`
4. Insert reminder records with `status = 'pending'`
5. Frontend polls `GET /reminders` to display upcoming/past reminders

### 2. Background Job (Email Delivery)

A separate background worker process scans for pending reminders whose `scheduled_date` is today or earlier, sends emails via the configured email provider, and updates reminder status to `sent` or `failed`.

**Background job flow:**
1. Worker runs on a schedule (e.g., daily at 08:00 CET)
2. Query: `SELECT * FROM reminders WHERE status = 'pending' AND scheduled_date <= date('now')`
3. For each pending reminder, send email via the configured email provider
4. Update reminder status and log to `notifications` table
5. Retry failed sends with exponential backoff (max 3 attempts)

> **Note:** Reminder system implementation is deferred to a later phase. The API endpoints and database schema are defined here for completeness.

> **Implementation status (2026-09-08):** The background email job is
> **deferred and not required for the Go → NestJS cutover**. The design above
> remains the intended target.
>
> - The email provider is an **abstraction** (`EmailProvider`), not a specific
>   vendor. Mailjet/Postmark are the intended implementations; the contract is
>   deliberately stack- and vendor-neutral.
> - The `notifications` table and `reminders.status` values (`pending`, `sent`,
>   `failed`) are already defined in `schema.md` and are in scope; only the
>   delivery mechanism is deferred.
> - The user-facing `GET /reminders` and `GET|PUT /reminders/preferences`
>   endpoints **are** in scope and must be implemented.

---

## Currency

- Default currency: EUR
- Format: ISO 4217 currency codes
- Amounts: Decimal numbers with 2 decimal places
