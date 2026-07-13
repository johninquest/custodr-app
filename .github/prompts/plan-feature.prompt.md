---
name: plan-feature
description: "Generate a comprehensive implementation plan for a new feature. Analyzes requirements, identifies affected modules, lists API endpoints and database changes, and provides a step-by-step implementation guide."
---

# Plan Feature

Generate a detailed implementation plan for `${input:FeatureDescription}`.

## Instructions

You are a senior software architect creating an implementation plan for a new feature. Analyze the feature requirements and produce a comprehensive, actionable plan.

### Step 1: Understand the Feature

Read the feature description carefully and identify:

- **Core functionality**: What does this feature do?
- **User stories**: Who uses it and what problem does it solve?
- **Acceptance criteria**: How do we know it's done?

### Step 2: Analyze Requirements

Break down the feature into:

- **Functional requirements**: What the system must do
- **Non-functional requirements**: Performance, security, scalability considerations
- **Dependencies**: What existing systems or data does this feature need?
- **Constraints**: Technical or business limitations

### Step 3: Identify Affected Modules

Review the codebase structure and identify:

- **Backend modules**: Which domain modules need changes? (e.g., commitments, reminders, users)
- **Frontend components**: Which UI components need to be created or modified?
- **Database changes**: New tables, columns, indexes, or migrations needed?
- **API endpoints**: New endpoints or modifications to existing ones?

### Step 4: Design the Solution

For each affected area, specify:

#### Backend (Go/Echo)

- **New handlers**: List handler functions with routes
- **Service layer**: Business logic functions needed
- **Repository layer**: Database queries and operations
- **Models**: New structs or modifications to existing ones
- **Middleware**: Any new middleware required?

#### Frontend (React/TypeScript)

- **New components**: List components with props and state
- **Hooks**: Custom hooks for data fetching or state management
- **API integration**: Which API endpoints will be called?
- **Routing**: New routes or navigation changes?

#### Database (PostgreSQL)

- **Schema changes**: New tables, columns, constraints
- **Migrations**: Migration files needed
- **Indexes**: Performance indexes required
- **Data seeding**: Initial data needed?

### Step 5: Create Implementation Steps

Provide a step-by-step implementation guide:

1. **Database first**: Migrations and schema changes
2. **Backend models**: Define data structures
3. **Repository layer**: Database operations
4. **Service layer**: Business logic
5. **Handler layer**: API endpoints
6. **Frontend components**: UI implementation
7. **Integration**: Connect frontend to backend
8. **Testing**: Unit and integration tests
9. **Documentation**: Update API docs and README

### Step 6: Identify Risks and Mitigations

List potential risks:

- **Technical risks**: Complex queries, performance issues, integration challenges
- **Timeline risks**: Dependencies on other work, unknown complexity
- **Quality risks**: Edge cases, error handling, security concerns

For each risk, provide a mitigation strategy.

### Step 7: Estimate Effort

Provide rough estimates:

- **Database changes**: Hours
- **Backend implementation**: Hours
- **Frontend implementation**: Hours
- **Testing**: Hours
- **Total estimated effort**: Hours

### Step 8: Define Success Criteria

List measurable success criteria:

- All acceptance criteria met
- Unit test coverage >80%
- Integration tests passing
- No critical security vulnerabilities
- Performance benchmarks met

## Output Format

Structure your plan as:

```markdown
# Feature Implementation Plan: [Feature Name]

## Overview
[Brief description of the feature and its purpose]

## Requirements
### Functional Requirements
- [List of functional requirements]

### Non-Functional Requirements
- [List of non-functional requirements]

## Architecture

### Affected Modules
- **Backend**: [List of modules]
- **Frontend**: [List of components]
- **Database**: [List of changes]

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/... | ... |

### Database Schema
[Description of schema changes]

## Implementation Steps

### Phase 1: Database
1. [Step]
2. [Step]

### Phase 2: Backend
1. [Step]
2. [Step]

### Phase 3: Frontend
1. [Step]
2. [Step]

### Phase 4: Testing
1. [Step]
2. [Step]

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [Impact] | [Mitigation] |

## Effort Estimate
- Database: X hours
- Backend: X hours
- Frontend: X hours
- Testing: X hours
- **Total**: X hours

## Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Next Steps
1. [First action to take]
2. [Second action to take]
```

## Guidelines

- Be specific and actionable — avoid vague descriptions
- Reference existing code patterns and conventions
- Consider edge cases and error scenarios
- Think about testing strategy from the start
- Identify dependencies early to avoid blockers
- Keep the plan focused — don't over-engineer
