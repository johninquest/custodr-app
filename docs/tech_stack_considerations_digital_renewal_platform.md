# Tech Stack Considerations and Decision Document
## Product: Digital Renewal & Commitment Management Platform

## 1. Purpose of This Document

This document captures the current technical thought process, architectural options, concerns, trade-offs, and preliminary direction for building a startup MVP for a digital renewal and commitment management platform.

The purpose is not to justify a decision that has already been made. Rather, the goal is to support a second-opinion review on the most suitable technology stack.

The key decision under evaluation is:

> Which backend stack best balances fast MVP validation with the possibility of evolving into a serious long-term platform for renewals, contracts, insurance, finance, and open-data integrations?

The two main backend options being considered are:

- Go with Echo, Gin, or Chi
- NestJS with TypeScript

The current leaning is toward Go, but this decision is not final.

---

## 2. Product Context

The product idea is a digital platform for managing recurring commitments and renewal-related obligations.

Examples include:

- Insurance contracts
- Streaming subscriptions
- Software subscriptions
- Mobile contracts
- Internet contracts
- Electricity contracts
- Gas contracts
- Gym memberships
- Banking products
- Vehicle-related obligations
- Healthcare reminders
- Vaccination reminders
- Other recurring obligations

The core value proposition is:

> “Know what renews, what expires, what needs action, and when.”

The product should help users avoid:

- Missed cancellation deadlines
- Unwanted renewals
- Forgotten subscriptions
- Lack of visibility over recurring costs
- Poor timing when switching providers
- Manual tracking across emails, portals, PDFs, calendars, and memory

---

## 3. Business Goal

The immediate business goal is quick startup validation.

The MVP should answer the following questions:

1. Do users understand the value proposition?
2. Are users willing to register?
3. Are users willing to manually enter recurring commitments?
4. Do users return after initial setup?
5. Do reminder emails create useful engagement?
6. Are users willing to pay, recommend, or continue using the service?
7. Is the problem painful enough to justify building a broader platform?

The first version should not overbuild. The priority is validating the core behaviour:

> Users enter commitments, receive reminders, and act on upcoming deadlines.

---

## 4. Long-Term Platform Ambition

Although the MVP should remain simple, the long-term product could evolve into a broader personal data, contract, insurance, and finance platform.

Potential future integrations may include:

- BiPRO
- Open Insurance
- Open Banking
- Open Finance
- FiDA-related data access models
- Banking APIs
- Insurance APIs
- Utility provider APIs
- Telecom provider APIs
- Subscription provider APIs

This creates an important tension:

> The MVP needs to be built quickly, but the technology choices should not block a future integration-heavy platform.

The backend may eventually become more than a basic CRUD API. It may become a connector and orchestration layer for structured data exchange across different industries.

---

## 5. Current High-Level Architecture Under Consideration

The current high-level architecture is:

```text
User
  ↓
React Frontend
  ↓
External Authentication Provider
  ↓
Backend API
  ↓
PostgreSQL
  ↓
Background Jobs / Scheduler
  ↓
Transactional Email Provider
```

The intended MVP deployment model is:

```text
Hetzner VPS / EU-based VPS
  ↓
Docker Engine
  ↓
Docker Compose
  ↓
Traefik
  ↓
Application Containers
```

Containerized services:

```text
Docker Compose Stack
├── traefik
├── frontend
├── api
├── worker
└── postgres
```

---

## 6. Intended MVP Stack

The current intended stack is:

```text
Frontend:
React + TypeScript

Styling:
Tailwind CSS

Optional UI Accelerator:
shadcn/ui if needed later

Backend:
Go with Echo, Gin, or Chi
OR
NestJS with TypeScript

Database:
PostgreSQL

Authentication:
Outsourced authentication provider, currently Firebase Auth under consideration

Email:
Managed transactional email provider, likely Mailjet or Postmark

Hosting:
EU-based VPS, likely Hetzner

Deployment:
Docker Compose

Reverse Proxy:
Traefik

Storage:
No blob/document storage for MVP

Architecture:
Modular monolith
```

---

## 7. Important Clarification: The Backend Decision Is Still Open

The decision is not simply:

```text
Go is better than NestJS
```

or:

```text
NestJS is better than Go
```

The real decision is:

> Should the MVP prioritize development speed and ecosystem convenience, or should it prioritize long-term backend maintainability and integration readiness?

Both Go and NestJS can technically support the product.

Both can handle:

- REST APIs
- JSON
- OpenAPI
- OAuth2
- OIDC
- JWT
- PostgreSQL
- Background jobs
- Email integration
- External provider integrations
- XML/SOAP adapters where needed
- Future BiPRO/Open Finance/FiDA-style integrations

The decision is therefore not mainly about technical possibility.

It is about:

- Founder productivity
- Code readability
- Long-term maintainability
- Ecosystem maturity
- Operational simplicity
- Hiring
- Future platform direction
- MVP delivery speed

---

## 8. Founder Thought Process

The founder’s current thinking is nuanced.

### 8.1 Need for Quick Validation

The product is still a startup idea and needs fast validation.

This argues in favour of:

```text
React + NestJS + PostgreSQL
```

because it allows:

- One language across frontend and backend
- Faster feature development
- Strong framework conventions
- Better scaffolding
- Rich ecosystem
- Easier onboarding
- Strong TypeScript support
- Strong Copilot/AI-assisted coding support

### 8.2 Interest in Go as a Long-Term Investment

At the same time, the founder sees Go as a long-term investment.

The reasoning is:

- Go is simple.
- Go is performant.
- Go has low runtime overhead.
- Go services are easy to deploy.
- Go is strong for APIs and integrations.
- Go can age well over many years.
- Go may be a good fit if the backend becomes an integration platform.

This argues in favour of:

```text
React + Go + PostgreSQL
```

especially if the future platform involves many connectors and data exchange flows.

### 8.3 Concern About Go Project Structure

The founder’s main concern with Go is not whether Go is technically capable.

The main concern is:

> Can the Go codebase remain readable and maintainable over time?

Go does not enforce a project structure in the same way as NestJS.

This can lead to inconsistent or messy projects if conventions are not defined early.

The risk is ending up with a codebase where every feature is spread across many technical folders, such as:

```text
handlers/
services/
repositories/
models/
```

This may be acceptable at the beginning, but it can become hard to navigate as the product grows.

### 8.4 Concern About Ecosystem and Tooling

The founder is also thinking about ecosystem and tooling.

Questions include:

- Does Go have enough mature libraries for future integrations?
- Would NestJS provide better OpenAPI tooling?
- Would TypeScript make it easier to integrate third-party APIs?
- Would future AI, banking, insurance, and finance libraries appear earlier in the Node.js ecosystem?
- Would Go require more manual work?
- Would NestJS allow faster validation?

These are legitimate concerns.

### 8.5 Concern About Overbuilding

Another important concern is avoiding overengineering.

The product should not start with:

- Microservices
- Event sourcing
- CQRS
- Kubernetes
- Complex clean architecture
- Heavy integration layers
- Document infrastructure
- AI-heavy workflows

The MVP should remain focused on:

- User signup/login
- Commitment creation
- Reminder calculation
- Email notification
- Basic dashboard
- User data privacy
- Simple deployment
- Clean modular architecture

---

## 9. Frontend Decision

### Selected Frontend Direction

```text
React + TypeScript
```

### Rationale

React is a strong fit for this product because the application will include:

- Onboarding
- Login
- Dashboard views
- Forms
- Commitment lists
- Filters
- Settings
- Reminder views
- Category views
- Status labels
- Date-based interactions

TypeScript is recommended because it improves maintainability, especially when API types and domain models become more complex.

### Styling Direction

The base styling recommendation is:

```text
Tailwind CSS
```

Tailwind alone is enough to build the frontend.

shadcn/ui should be treated as an optional accelerator, not as a foundational dependency.

### Tailwind vs shadcn/ui

Tailwind CSS provides utility classes for styling.

shadcn/ui provides copy-pasteable React components built with Tailwind.

For the MVP, the suggested approach is:

```text
Start with Tailwind CSS.
Add shadcn/ui components only when needed.
```

For example, shadcn/ui may become useful later for:

- Dialogs
- Date pickers
- Tables
- Dropdowns
- Popovers
- Forms
- Command menus
- Toasts

But the product should not depend on shadcn/ui from day one unless it clearly accelerates development.

---

## 10. Backend Option A: Go with Echo/Gin/Chi

### 10.1 Description

This option uses Go as the backend language with a lightweight HTTP framework.

Frameworks under consideration:

```text
Echo
Gin
Chi
```

The original preference was Echo, but Gin or Chi should also be reviewed before final selection.

### 10.2 Why Go Is Attractive

Go is attractive because the future product may become integration-heavy.

The backend may eventually need to handle:

- Insurance standard integrations
- Banking integrations
- Open Finance APIs
- FiDA-related access management
- BiPRO-style insurance data exchange
- Adapter layers
- Scheduled processing
- Notification processing
- Data transformation
- API orchestration

Go is strong in this type of backend work.

### 10.3 Advantages of Go

Go provides:

- Simple deployment as a single binary
- Low memory footprint
- Strong performance
- Good concurrency model
- Good standard library
- Strong HTTP support
- Strong JSON support
- XML support
- Good fit for background workers
- Good fit for connector services
- Lower dependency complexity than typical Node.js stacks
- Good long-term maintainability when structured properly

### 10.4 Concerns With Go

The main concerns are:

- Less opinionated project structure
- More manual architectural discipline required
- Potentially slower MVP development
- Smaller ecosystem than Node.js
- Less scaffolding than NestJS
- Fewer standard patterns for application architecture
- More boilerplate for validation, DTOs, OpenAPI, and dependency wiring

### 10.5 Go Project Structure Risk

A badly structured Go project can become difficult to maintain.

A common but problematic structure is:

```text
handlers/
├── auth.go
├── users.go
├── commitments.go

services/
├── auth.go
├── users.go
├── commitments.go

repositories/
├── auth.go
├── users.go
├── commitments.go

models/
├── auth.go
├── users.go
├── commitments.go
```

This structure organizes by technical layer rather than business capability.

As the product grows, each feature becomes scattered across multiple folders.

### 10.6 Recommended Go Architecture

Use a domain-based modular monolith.

Recommended structure:

```text
cmd/
└── api/
    └── main.go

internal/
├── auth/
│   ├── handler.go
│   ├── service.go
│   ├── repository.go
│   └── models.go
│
├── users/
│   ├── handler.go
│   ├── service.go
│   ├── repository.go
│   └── models.go
│
├── commitments/
│   ├── handler.go
│   ├── service.go
│   ├── repository.go
│   ├── models.go
│   └── validator.go
│
├── reminders/
│   ├── handler.go
│   ├── service.go
│   ├── scheduler.go
│   ├── repository.go
│   └── models.go
│
├── notifications/
│   ├── handler.go
│   ├── service.go
│   ├── provider.go
│   ├── mailjet.go
│   └── models.go
│
├── providers/
│   ├── bipro/
│   ├── banking/
│   ├── fida/
│   ├── insurance/
│   ├── telecom/
│   └── utilities/
│
├── jobs/
│   └── worker.go
│
└── shared/
    ├── config/
    ├── database/
    ├── logger/
    ├── middleware/
    └── errors/
```

### 10.7 Recommended Request Flow in Go

```text
HTTP Request
  ↓
Handler
  ↓
Service
  ↓
Repository
  ↓
PostgreSQL
```

### 10.8 Recommended Rule for Go

Each business feature should live in a business module.

Example:

```text
commitments/
reminders/
notifications/
users/
```

Avoid spreading one business feature across many technical layers unless there is a very good reason.

### 10.9 When Go Is the Better Choice

Go is likely the better choice if:

- Long-term maintainability is a major priority.
- The founder wants to invest in Go.
- The backend may evolve into an integration platform.
- Low-resource VPS deployment matters.
- Operational simplicity matters.
- Dependency simplicity matters.
- The founder is willing to enforce project structure from day one.

---

## 11. Backend Option B: NestJS with TypeScript

### 11.1 Description

This option uses NestJS as the backend framework.

The stack would become:

```text
Frontend:
React + TypeScript

Backend:
NestJS + TypeScript

Database:
PostgreSQL
```

### 11.2 Why NestJS Is Attractive

NestJS is attractive because it is highly opinionated and productive.

It provides a strong application structure out of the box.

A typical NestJS project naturally organizes around:

```text
modules
controllers
services
DTOs
guards
providers
repositories
pipes
interceptors
```

This structure can help prevent the type of architectural drift that often happens in Go projects.

### 11.3 Advantages of NestJS

NestJS provides:

- Faster MVP development
- One language across frontend and backend
- Strong conventions
- Strong TypeScript experience
- Excellent developer productivity
- Strong OpenAPI/Swagger integration
- Large Node.js ecosystem
- Easier onboarding for many developers
- More examples and tutorials
- Good support for validation
- Good support for dependency injection
- Good structure for medium-sized teams

### 11.4 Why NestJS May Be Better for MVP Validation

For a startup MVP, NestJS may allow faster progress because:

- The frontend and backend both use TypeScript.
- API DTOs and types are easier to align.
- Many common libraries are available.
- More third-party integrations have Node.js SDKs.
- AI coding assistants often generate TypeScript/NestJS code well.
- The framework gives structure from day one.

This matters because the business risk is high.

The biggest risk may not be:

```text
Can the backend scale?
```

The biggest risk may be:

```text
Can the founder validate the idea before losing momentum?
```

### 11.5 Concerns With NestJS

The concerns with NestJS are:

- Larger dependency tree
- More package maintenance
- More frequent ecosystem churn
- Higher memory usage than Go
- More complex runtime
- Potentially more operational overhead
- Less attractive if the backend eventually becomes a high-volume integration platform
- More framework magic compared to Go

### 11.6 When NestJS Is the Better Choice

NestJS is likely the better choice if:

- MVP speed is the highest priority.
- The founder is more productive in TypeScript.
- One-language full-stack development is important.
- Strong conventions are needed immediately.
- The backend is mostly CRUD and user workflow logic.
- Hiring TypeScript developers is more important than operational simplicity.
- The product direction is still very uncertain.

---

## 12. Go vs NestJS: Core Trade-Off

The decision can be summarized as:

```text
Go:
Better long-term backend simplicity and integration-platform potential.

NestJS:
Better short-term MVP velocity and developer experience.
```

### 12.1 Go Strengths

```text
Long-term maintainability
Operational simplicity
Low resource usage
Strong integration backend profile
Single binary deployment
Lower dependency complexity
```

### 12.2 Go Weaknesses

```text
Less opinionated
More manual structure needed
Possibly slower MVP delivery
Smaller ecosystem
More boilerplate
```

### 12.3 NestJS Strengths

```text
Fast development
Strong conventions
Full-stack TypeScript
Large ecosystem
Excellent OpenAPI support
Good onboarding
Great for standard web applications
```

### 12.4 NestJS Weaknesses

```text
Larger dependency tree
More ecosystem churn
More runtime overhead
More package maintenance
Potentially less ideal for long-term integration-heavy backend
```

---

## 13. Current Backend Decision Position

The current position is:

> The founder is leaning toward Go, but NestJS remains a serious alternative.

The reason for leaning toward Go is not performance alone.

The main reasons are:

- Long-term skill investment
- Backend maintainability
- Integration-heavy future possibility
- Operational simplicity
- Good fit for VPS deployment
- Good fit for connector-based architecture

However, NestJS remains attractive because:

- The product needs fast validation.
- TypeScript is strong and increasingly popular.
- One language across the stack reduces context switching.
- NestJS gives better structure out of the box.
- The ecosystem is larger.
- MVP delivery may be faster.

This decision should be challenged by a second-opinion reviewer.

---

## 14. Database Decision

### Selected Option

```text
PostgreSQL
```

### Rationale

The application domain is highly structured and relational.

Important entities include:

- Users
- Commitments
- Categories
- Providers
- Reminder schedules
- Notification events
- User preferences
- Audit logs
- Integration metadata in the future

PostgreSQL is a strong fit because it provides:

- Relational modelling
- Transactions
- Constraints
- Indexes
- JSONB when flexibility is needed
- Strong reporting/querying capabilities
- Long-term portability
- Mature tooling

### Decision

Use PostgreSQL as the system of record.

Do not use Firestore or Firebase Realtime Database for the main business data.

If Firebase is used, use it for authentication only.

---

## 15. Storage Decision

### Selected Option

```text
No blob/document storage for MVP
```

### Rationale

The product should go fully digital and structured from the beginning.

The MVP should not store:

- PDFs
- Scanned contracts
- Images
- Contract documents
- Attachments
- OCR output

This avoids unnecessary complexity around:

- S3-compatible storage
- File permissions
- Malware scanning
- Document lifecycle
- OCR
- Storage cost
- Backup complexity
- Additional GDPR risk

### Product Implication

The product should store structured data only.

Example commitment fields:

```text
Commitment name
Provider
Category
Cost
Billing frequency
Start date
Renewal date
Cancellation deadline
Status
Notes
```

---

## 16. Authentication Decision

### Direction

Authentication should be outsourced.

The application should not implement password storage or authentication flows manually.

### Options Considered

```text
Firebase Auth
Clerk
Auth0
Supabase Auth
Keycloak
Microsoft Entra External ID
```

### Current Serious Candidate

```text
Firebase Auth
```

Firebase Auth is currently being considered because it can provide fast MVP authentication, frontend SDK support, and common login flows such as email/password and social login.

### Why Outsource Auth

Authentication introduces complexity around:

- Password storage
- Password reset
- Email verification
- MFA
- Account recovery
- Session management
- Social login
- Token validation
- Security updates

For an MVP, outsourcing authentication reduces risk and saves time.

### Firebase Auth Benefits

Firebase Auth provides:

- Fast setup
- Good frontend SDKs
- Social login support
- Email/password support
- Password reset flows
- Good future mobile app support
- Easy integration into React applications

### Firebase Auth Concerns

The concerns are:

- Vendor lock-in
- Dependency on Google ecosystem
- GDPR/data processing considerations
- Less control than self-hosted identity
- Possible future migration if stronger EU data sovereignty becomes important

### Recommended Mitigation

Abstract authentication internally.

The backend should map external authentication identities to internal users.

Example internal user model:

```text
users
- id
- external_auth_provider
- external_subject_id
- email
- created_at
- updated_at
```

Do not let Firebase-specific assumptions spread across the whole codebase.

Business logic should depend on an internal authenticated user concept, not directly on Firebase.

---

## 17. Email Decision

### Requirement

The application needs email for:

- Renewal reminders
- Cancellation deadline reminders
- Welcome emails
- Account-related notifications
- Possibly monthly summaries in the future

Authentication-related emails may initially be handled by the authentication provider.

### Build vs Buy Decision

Do not run a self-hosted email server for the MVP.

### Rationale

Running an email server creates significant operational complexity:

- Sender reputation
- SPF
- DKIM
- DMARC
- IP warming
- Bounce handling
- Complaint handling
- Deliverability monitoring
- Blacklist management
- Gmail/Outlook/GMX/Web.de inbox placement

The product depends on reminders being delivered reliably.

Therefore, email deliverability is business-critical.

### Options Considered

```text
Mailjet
Postmark
Resend
Mailgun
AWS SES
```

### GDPR/EU Considerations

Because the product is based in Germany and targets EU consumers, GDPR and data residency are important.

Mailjet or Mailgun should be reviewed carefully because of their EU/GDPR positioning.

Postmark should be reviewed for deliverability, DPA availability, subprocessors, and data residency implications.

Resend is attractive from a developer experience perspective, but should be reviewed carefully if EU data residency is a strong requirement.

AWS SES may be strong at scale, but introduces more operational complexity.

### Current Email Recommendation

For a Germany/EU-first MVP:

```text
First choice:
Mailjet

Second choice:
Postmark

Third choice:
AWS SES

Fourth choice:
Resend

Avoid:
Self-hosted SMTP server
```

### Important Note

The final email provider decision should be reviewed against:

- DPA availability
- Data residency
- Subprocessors
- EU region support
- Deliverability
- API quality
- Pricing
- Ease of integration with Go or NestJS

---

## 18. Hosting and Deployment Strategy

### Preferred Direction

Deploy the application stack as Docker containers on a VPS, using Traefik as the reverse proxy and edge router.

Potential provider:

```text
Hetzner VPS in Germany/EU
```

### Rationale

The founder wants:

- Full ownership of the deployment
- Low operational costs
- High portability
- Docker-based deployment
- A stack that can be moved between providers
- A production-like local development workflow
- Simple routing for multiple services and environments

Traefik is preferred because the founder already uses Traefik and it integrates well with Docker-based deployments.

### Deployment Architecture

```text
Internet
  ↓
Traefik Reverse Proxy
  ↓
Docker Network

├── Frontend Container
│     React Application
│
├── API Container
│     Go + Echo/Gin/Chi
│     or
│     NestJS
│
├── Worker Container
│     Reminder Processing
│     Scheduled Jobs
│
└── PostgreSQL Container
      Application Database
```

### Initial MVP Docker Compose Setup

```text
docker-compose.yml

services:
  traefik
  frontend
  api
  worker
  postgres
```

### Container Responsibilities

#### traefik

Handles:

- Incoming HTTP/HTTPS traffic
- TLS certificate management
- Routing to the frontend container
- Routing to the API container
- Optional dashboard access, secured properly
- Service discovery through Docker labels
- Separation of public and internal services

#### frontend

Runs the React frontend.

Depending on build strategy, this may be:

- A static build served by a lightweight web server container
- A frontend runtime container if server-side rendering is introduced later

For the MVP, a static frontend build is sufficient.

#### api

Runs the main backend API.

Allowed backend options:

```text
Go + Echo/Gin/Chi
or
NestJS + TypeScript
```

Responsibilities:

- Auth token validation
- User management
- Commitment management
- Reminder configuration
- Notification event creation
- API endpoints
- Business logic
- Database access

#### worker

Runs scheduled/background processing.

Responsibilities:

- Daily reminder checks
- Notification generation
- Email dispatch
- Retry logic
- Cleanup jobs
- Future integration sync jobs

#### postgres

Runs the PostgreSQL database for the MVP.

PostgreSQL should not be publicly exposed.

Access should be limited to internal Docker network communication.

---

## 19. Public vs Internal Services

### Publicly Exposed Services

```text
frontend
api
```

### Internal-Only Services

```text
postgres
worker
```

PostgreSQL should never be exposed publicly.

The worker container should not expose public routes unless there is a specific operational reason.

---

## 20. Example Routing Model

### Option A: Separate Subdomains

```text
app.example.com
  → frontend container

api.example.com
  → api container
```

### Option B: Same Domain With Path-Based Routing

```text
example.com
  → frontend container

example.com/api
  → api container
```

### Preferred MVP Routing

Separate subdomains are likely cleaner:

```text
app.example.com
api.example.com
```

This avoids path-based routing complexity and keeps frontend/API concerns separated.

---

## 21. Benefits of Docker + Traefik

Docker + Traefik provides:

- Portable deployment
- Clear container boundaries
- Easy service routing
- Simple TLS handling
- Good fit for VPS hosting
- Easy local-to-production alignment
- Easy future migration to another VPS or cloud provider
- No need for Kubernetes during MVP
- Clean separation between public and internal services

This supports the founder’s goal of having a complete stack that can be ported.

---

## 22. Operational Philosophy

For the MVP:

```text
One VPS
One Docker Compose stack
Traefik as reverse proxy
PostgreSQL as containerized database
API as container
Frontend as container
Worker as container
```

Avoid for MVP:

```text
Kubernetes
Service mesh
Multi-node orchestration
Complex cloud networking
Managed container platforms
Premature microservices
```

---

## 23. PostgreSQL Deployment Consideration

For MVP validation, running PostgreSQL as a Docker container on the VPS is acceptable if backups and basic operational practices are handled properly.

However, this should be reviewed carefully.

### MVP Approach

```text
PostgreSQL container
Persistent Docker volume
Automated backups
Restricted network access
```

### Future Options

If the product gains traction, consider:

- Moving PostgreSQL to a separate VPS
- Moving PostgreSQL to a managed database
- Adding automated offsite backups
- Adding monitoring
- Adding read replicas if needed

### Important Operational Requirement

The MVP must have a PostgreSQL backup strategy from day one.

At minimum:

```text
Daily database dump
Encrypted backup storage
Restore test process
Retention policy
```

---

## 24. Background Jobs and Reminder Processing

### Requirement

The product needs scheduled processing for reminders.

The system should:

1. Identify commitments with upcoming deadlines.
2. Generate reminder events.
3. Send emails.
4. Record notification history.
5. Avoid duplicate notifications.
6. Retry failed sends where appropriate.

### MVP Approach

Start simple.

Example:

```text
Every day at 08:00:
1. Query commitments with upcoming renewal or cancellation deadlines.
2. Create reminder events.
3. Send emails.
4. Mark reminders as sent.
```

### Go Options

```text
Simple cron job
Asynq
Custom worker process
```

### NestJS Options

```text
@nestjs/schedule
BullMQ
Custom worker module
```

### Recommended MVP Deployment

Run the worker as a separate Docker container.

```text
api container:
Handles HTTP traffic

worker container:
Handles scheduled jobs and background processing
```

Even if both containers use the same codebase/image, separating runtime roles keeps the architecture cleaner.

---

## 25. API Design

### Recommended MVP API Style

```text
REST + JSON
```

### API Documentation

Use OpenAPI from early on if practical.

OpenAPI helps with:

- Frontend/backend alignment
- Future generated clients
- API review
- Documentation
- Partner readiness
- Consistency

### Example API Areas

```text
/auth
/users
/commitments
/categories
/providers
/reminders
/notifications
/settings
```

### Security Model

All user-specific endpoints must require authentication.

The backend must:

1. Verify the external authentication token.
2. Map the external user to an internal user.
3. Ensure users can access only their own data.

---

## 26. Domain Model Direction

### Core Domain Concept

Use a generic concept:

```text
Commitment
```

A commitment is any recurring obligation, product, contract, service, subscription, or reminder with one or more of the following:

- Cost
- Renewal date
- Expiry date
- Cancellation deadline
- Billing cycle
- Action deadline

### Example Categories

```text
INSURANCE
SUBSCRIPTION
UTILITY
TELECOM
MEMBERSHIP
HEALTH
VEHICLE
BANKING
OTHER
```

### Why This Matters

The MVP should not create a separate model for every possible category.

Avoid starting with:

```text
insurance_contracts
subscriptions
utilities
memberships
vehicle_obligations
health_reminders
```

Instead, start with a flexible core model:

```text
commitments
```

This allows the MVP to support many use cases without overengineering.

---

## 27. Future Integration Strategy

The platform may later integrate with industry and open-data standards.

### Future Standards and Areas

```text
BiPRO
Open Insurance
Open Banking
Open Finance
FiDA
Banking APIs
Insurance APIs
Utility provider APIs
Telecom APIs
```

### Key Assessment

Both Go and NestJS can support these integrations.

The likely technical requirements include:

- REST
- JSON
- XML
- SOAP
- OAuth2
- OIDC
- JWT
- mTLS
- Consent management
- Audit logging
- Data transformation
- Connector orchestration

### Recommended Future Pattern

Use a connector framework.

Example:

```text
internal/providers/
├── bipro/
├── banking/
├── fida/
├── insurance/
├── telecom/
└── utilities/
```

External provider-specific logic should not leak into the core domain.

The system should translate external data into internal domain models.

### Important Principle

Do not implement BiPRO, FiDA, Open Finance, or other complex integrations during MVP unless there is a validated business reason.

Design for future isolation, but do not build the integrations too early.

---

## 28. GDPR and Privacy-by-Design Considerations

Because the product is Germany/EU-focused, privacy should be considered from the beginning.

### Key Principles

The system should follow:

- Data minimization
- Purpose limitation
- Secure processing
- Clear privacy policy
- Clear user consent where required
- Ability to delete user data
- Use of processors with DPAs
- Preference for EU-based infrastructure where practical
- Avoidance of unnecessary sensitive data

### MVP Privacy Advantage

The decision not to store documents is beneficial.

By avoiding PDFs, images, and contract uploads, the MVP reduces:

- Sensitive data exposure
- Storage complexity
- Security risk
- GDPR complexity
- Backup complexity

### Data to Store

The MVP should store only structured, necessary data.

Example:

```text
Commitment name
Provider
Category
Cost
Renewal date
Cancellation deadline
Status
Reminder preference
```

---

## 29. Portability Considerations

The founder wants a complete stack that can be ported with minimal effort.

The preferred portability strategy is:

```text
Docker Compose
├── Traefik
├── React Frontend
├── Go/NestJS API
├── Worker
└── PostgreSQL
```

This stack can be moved between:

- Hetzner
- IONOS
- OVH
- AWS
- Azure
- Google Cloud
- On-premise infrastructure

with relatively limited changes.

The primary deployment artifact should be Docker images and Docker Compose configuration, not server-specific manual installation steps.

### Portability-Friendly Choices

```text
React
Go or NestJS
PostgreSQL
Docker
Docker Compose
Traefik
REST APIs
OpenAPI
Environment-based configuration
```

### Potential Lock-In Areas

```text
Firebase Auth
Email provider API
Provider-specific DNS setup
Provider-specific VPS configuration
Future external integrations
```

### Mitigation

Use internal abstractions for:

```text
AuthProvider
EmailProvider
NotificationSender
TokenVerifier
```

Business logic should not depend directly on Firebase, Mailjet, Postmark, or any specific provider SDK.

---

## 30. Proposed Abstractions

To reduce lock-in, the backend should define internal interfaces for external services.

### Authentication Abstraction

```text
External token
  ↓
Token verifier
  ↓
Internal authenticated user
```

### Notification Abstraction

```text
Reminder event
  ↓
Notification service
  ↓
Email provider
```

### Provider Integration Abstraction

```text
External provider data
  ↓
Connector
  ↓
Internal commitment model
```

These abstractions should remain lightweight in the MVP.

The goal is not to build a complex enterprise architecture, but to prevent avoidable coupling.

---

## 31. MVP Architecture Recommendation

The recommended MVP architecture is:

```text
Modular monolith deployed as multiple Docker containers
```

This means the application is logically a monolith, but operationally split into containers by runtime responsibility.

Example:

```text
Same backend codebase
├── api runtime
└── worker runtime
```

Avoid:

```text
Microservices
CQRS
Event sourcing
Kubernetes
Complex clean architecture
Premature connector platform
Heavy enterprise patterns
```

The MVP should be boring and understandable.

Recommended areas/modules:

```text
auth
users
commitments
reminders
notifications
settings
shared
```

Potential future modules:

```text
providers
bipro
banking
fida
insurance
utilities
```

---

## 32. Preliminary Stack Options

### Option 1: Go-Oriented Stack

```text
Frontend:
React + TypeScript + Tailwind CSS

Backend:
Go + Echo/Gin/Chi

Database:
PostgreSQL

Auth:
Firebase Auth initially

Email:
Mailjet or Postmark

Jobs:
Worker container with simple scheduler first
Asynq later if needed

Hosting:
Hetzner VPS or similar EU-based VPS

Deployment:
Docker Compose

Reverse Proxy:
Traefik

Containers:
- traefik
- frontend
- api
- worker
- postgres

Architecture:
Domain-based modular monolith
```

### Option 2: TypeScript-Oriented Stack

```text
Frontend:
React + TypeScript + Tailwind CSS

Backend:
NestJS + TypeScript

Database:
PostgreSQL

Auth:
Firebase Auth initially

Email:
Mailjet or Postmark

Jobs:
Worker container with NestJS scheduler first
BullMQ later if needed

Hosting:
Hetzner VPS or similar EU-based VPS

Deployment:
Docker Compose

Reverse Proxy:
Traefik

Containers:
- traefik
- frontend
- api
- worker
- postgres

Architecture:
NestJS modular monolith
```

---

## 33. Decision Matrix

| Criterion | Go + Echo/Gin/Chi | NestJS + TypeScript |
|---|---|---|
| MVP speed | Medium | High |
| Long-term maintainability | High if structured well | Medium to high |
| Built-in conventions | Low to medium | High |
| Project readability by default | Depends on discipline | Strong |
| Ecosystem size | Medium | Very high |
| OpenAPI experience | Good, but more manual | Very strong |
| VPS deployment | Excellent | Good |
| Docker deployment | Excellent | Good |
| Runtime efficiency | Excellent | Good |
| Dependency footprint | Low | High |
| Integration-heavy backend fit | Very strong | Strong |
| Founder learning investment | High if Go is desired | High if full-stack TS is desired |
| Hiring | Good, but narrower | Easier |
| AI/Copilot coding support | Good | Very good |
| Future connector platform | Very good | Good |
| Speed of experimentation | Medium | High |
| Traefik/Docker Compose fit | Excellent | Excellent |

---

## 34. Key Questions for Second Opinion

The reviewer should help answer:

1. Is Go the right long-term backend choice for this product, or does NestJS provide a better startup trade-off?
2. Is the founder overvaluing future integration complexity before validating the MVP?
3. Is the productivity gain of full-stack TypeScript more important at this stage?
4. If Go is selected, should the framework be Echo, Gin, or Chi?
5. If NestJS is selected, how can dependency and operational complexity be kept under control?
6. Is Firebase Auth acceptable for a Germany/EU-focused MVP?
7. Should Keycloak, Auth0, Supabase Auth, Clerk, or Entra External ID be considered instead?
8. Is Mailjet the right email provider given GDPR and EU-data concerns?
9. Is running PostgreSQL in Docker on the same VPS acceptable for MVP validation?
10. What backup strategy is required from day one?
11. Should OpenAPI be introduced from day one?
12. How much abstraction is enough without overengineering?
13. What is the minimum clean architecture needed for a maintainable MVP?
14. How should future BiPRO/Open Finance/FiDA integration points be prepared without building them prematurely?
15. Is Docker Compose with Traefik the right deployment model for this stage?

---

## 35. Current Preliminary Recommendation

The current preliminary recommendation is:

```text
Frontend:
React + TypeScript + Tailwind CSS

Backend:
Go with Echo/Gin/Chi, if the founder is committed to learning and maintaining Go

Database:
PostgreSQL

Auth:
Firebase Auth initially, abstracted behind internal auth logic

Email:
Mailjet or Postmark

Hosting:
Hetzner VPS or similar EU-based VPS

Deployment:
Docker Compose

Reverse Proxy:
Traefik

Containers:
- traefik
- frontend
- api
- worker
- postgres

Storage:
No blob storage

Architecture:
Domain-based modular monolith
```

However, this recommendation has an important caveat.

If the priority is maximum MVP speed, lower cognitive load, and strong project structure from day one, then NestJS is a very serious alternative.

The honest conclusion is:

> Go may be the better long-term backend investment if the product becomes an integration-heavy platform.  
> NestJS may be the better MVP choice if speed, structure, and full-stack TypeScript productivity are more important right now.

---

## 36. Final Position

The founder is currently leaning toward Go, but the decision should remain open until reviewed.

The strongest argument for Go is:

```text
Long-term backend simplicity and integration-platform readiness.
```

The strongest argument for NestJS is:

```text
Faster MVP validation and stronger development conventions.
```

The Docker + Traefik VPS deployment model strengthens the portability goal.

The intended infrastructure is:

```text
EU VPS
  ↓
Docker Engine
  ↓
Docker Compose
  ↓
Traefik
  ↓
frontend / api / worker / postgres
```

The most important risk is not whether Go or NestJS can technically support the product.

Both can.

The bigger risk is building too much before validating the business.

Therefore, regardless of backend choice, the MVP should focus on:

- User registration
- Commitment creation
- Reminder calculation
- Email delivery
- Simple dashboard
- GDPR-aware design
- Clean modular structure
- Docker-based deployment
- Fast user feedback

The architecture should support future integrations, but not prematurely implement them.

The guiding principle should be:

> Build a boring, readable, modular monolith first.  
> Deploy it cleanly with Docker Compose and Traefik.  
> Validate the user problem.  
> Add integration complexity only when the business case is proven.
