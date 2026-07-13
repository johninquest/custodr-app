# API Specification — Commitment Management Platform

## Base URL

```
Production: https://api.example.com/api/v1
Development: http://localhost:8080/api/v1
```

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

### Commitments

#### GET /commitments

List all commitments for the authenticated user.

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

#### POST /commitments

Create a new commitment.

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
- `category`: Required, must be one of: `insurance`, `streaming_subscription`, `software_subscription`, `mobile_contract`, `internet_contract`, `electricity_contract`, `gas_contract`, `gym_membership`, `banking_product`, `vehicle_obligation`, `healthcare_reminder`, `vaccination_reminder`, `other`
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

#### GET /commitments/:id

Retrieve a single commitment.

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
- `404 Not Found` — Commitment not found or doesn't belong to user
- `401 Unauthorized` — Missing or invalid authentication

#### PUT /commitments/:id

Update a commitment.

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
- `404 Not Found` — Commitment not found or doesn't belong to user
- `401 Unauthorized` — Missing or invalid authentication

#### DELETE /commitments/:id

Soft delete a commitment (sets `deleted_at` timestamp).

**Response (204 No Content):** Empty response

**Errors:**
- `404 Not Found` — Commitment not found or doesn't belong to user
- `401 Unauthorized` — Missing or invalid authentication

#### GET /commitments/upcoming

Get commitments with upcoming renewal or cancellation deadlines.

**Query Parameters:**
- `days` (optional, default: 90): Number of days to look ahead
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
      "commitment_id": "uuid",
      "commitment_name": "Netflix Premium",
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
  "commitments_by_status": {
    "active": 15,
    "cancelled": 3,
    "expired": 2,
    "paused": 1,
    "review_needed": 4
  },
  "commitments_by_category": {
    "streaming_subscription": 5,
    "insurance": 3,
    "utility": 4,
    "telecom": 2,
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

## Currency

- Default currency: EUR
- Format: ISO 4217 currency codes
- Amounts: Decimal numbers with 2 decimal places
