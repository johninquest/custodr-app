---
name: review-pr
description: "Perform a comprehensive code review on a pull request. Checks for code quality, security issues, performance problems, test coverage, and adherence to project conventions."
---

# Review Pull Request

Review pull request `${input:PRNumber}` (or current changes if no PR number provided).

## Instructions

You are a senior code reviewer performing a thorough review of code changes. Your goal is to ensure code quality, catch bugs, and maintain project standards.

### Step 1: Understand the Context

- Read the PR description and linked issues
- Understand the purpose and scope of changes
- Identify which modules and files are affected

### Step 2: Review Architecture and Design

Check for:

- **Modular structure**: Does the code follow domain-driven organization?
- **Separation of concerns**: Are handlers, services, and repositories properly separated?
- **Abstractions**: Are external services properly abstracted behind interfaces?
- **Dependencies**: Are there circular dependencies or tight coupling?

### Step 3: Review Code Quality

#### Go Backend

- **Error handling**: Are errors properly wrapped and handled?
- **Naming conventions**: Do names follow Go conventions (camelCase, PascalCase)?
- **Interfaces**: Are interfaces small and focused?
- **Concurrency**: Are goroutines properly managed with context?
- **Database**: Are queries parameterized? Are transactions used appropriately?

#### React Frontend

- **TypeScript**: Are types explicit? Is `any` avoided?
- **Component structure**: Are components small and focused?
- **Hooks**: Are hooks used correctly (no conditional hooks, complete dependencies)?
- **State management**: Is state lifted appropriately?
- **Accessibility**: Are ARIA labels and semantic HTML used?

### Step 4: Check for Security Issues

Review for:

- **SQL injection**: Are all queries parameterized?
- **XSS**: Is user input properly escaped in HTML?
- **Authentication**: Are protected endpoints checking auth tokens?
- **Authorization**: Are users restricted to their own data?
- **Secrets**: Are there hardcoded credentials or API keys?
- **Input validation**: Is all user input validated?

### Step 5: Review Performance

Check for:

- **N+1 queries**: Are there loops making database queries?
- **Missing indexes**: Are frequently queried columns indexed?
- **Unnecessary allocations**: Are slices preallocated when size is known?
- **Inefficient loops**: Is there repeated work in loops?
- **Large payloads**: Are responses returning unnecessary data?

### Step 6: Review Test Coverage

Verify:

- **Unit tests**: Are services and repositories tested?
- **Integration tests**: Are handlers tested with httptest?
- **Edge cases**: Are error paths and boundary conditions tested?
- **Mocking**: Are external dependencies properly mocked?
- **Test quality**: Are tests readable and maintainable?

### Step 7: Check Adherence to Conventions

Verify compliance with:

- **Project structure**: Domain-based organization
- **API contracts**: Do endpoints match docs/api_spec.md?
- **Database schema**: Do tables match docs/schema.md?
- **Error format**: Standard error response format
- **Logging**: Structured logging with zerolog
- **Documentation**: Are exported functions documented?

### Step 8: Review Documentation

Check for:

- **Code comments**: Are complex sections explained?
- **API documentation**: Are new endpoints documented?
- **README updates**: Are setup or usage changes documented?
- **Migration guide**: Are breaking changes documented?

## Output Format

Structure your review as:

```markdown
# Code Review: PR #[Number]

## Summary
[Brief overview of changes and overall assessment]

## ✅ Strengths
- [What's done well]
- [Good patterns used]

## 🔴 Critical Issues (Must Fix)

### 1. [Issue Title]
**File**: `path/to/file.go:123`
**Problem**: [Description of the issue]
**Impact**: [Why this is a problem]
**Suggestion**: [How to fix it]

```go
// Before
[problematic code]

// After
[suggested fix]
```

## 🟡 Important Issues (Should Fix)

### 1. [Issue Title]
**File**: `path/to/file.go:456`
**Problem**: [Description]
**Suggestion**: [How to fix]

## 🟢 Suggestions (Nice to Have)

### 1. [Suggestion Title]
**File**: `path/to/file.go:789`
**Suggestion**: [Improvement idea]

## 📊 Metrics

- **Code Quality**: [1-5]/5
- **Test Coverage**: [1-5]/5
- **Security**: [1-5]/5
- **Performance**: [1-5]/5
- **Documentation**: [1-5]/5
- **Overall**: [1-5]/5

## 🎯 Recommendation

[ ] **Approve** — Code is ready to merge
[ ] **Request Changes** — Critical issues must be addressed
[ ] **Comment** — Suggestions for improvement, but not blocking

## 📝 Next Steps

1. [Priority action item]
2. [Priority action item]
3. [Priority action item]
```

## Guidelines

- Be constructive, not critical — focus on the code, not the author
- Provide specific examples and suggestions
- Explain the "why" behind each issue
- Prioritize issues by severity
- Acknowledge good patterns and practices
- Consider the broader impact on the codebase
- Think about maintainability and future developers
