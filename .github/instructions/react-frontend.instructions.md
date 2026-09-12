---
description: 'React and TypeScript frontend development instructions with Tailwind CSS'
applyTo: '**/*.tsx,**/*.ts,**/*.jsx,**/*.js'
---

# React Frontend Development Instructions

Build accessible, performant React applications with TypeScript and Tailwind CSS following modern best practices.

## General Instructions

- Write type-safe TypeScript code (strict mode, no `any`)
- Use functional components only (no class components)
- Follow React hooks rules (no conditional hooks, complete dependency arrays)
- Prefer composition over inheritance
- Keep components small and focused (<200 lines)
- Use container/presentational pattern for complex components
- Write self-documenting code with clear prop and function names
- Document complex logic with comments
- Avoid using emoji in code and comments

## TypeScript Best Practices

### Type Safety

- Enable strict mode in `tsconfig.json`
- Avoid `any` type — use `unknown` when type is truly unknown
- Define explicit return types for functions
- Use type guards for runtime type checking
- Prefer interfaces for object shapes, types for unions/intersections

```typescript
// GOOD - explicit types
interface Contract {
  id: string;
  name: string;
  cost: number;
  currency: string;
  status: ContractStatus;
}

type ContractStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'review_needed';

function formatCost(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// BAD - using any
function processData(data: any): any {
  return data.value;
}
```

### Type Definitions

API types live in a single file, `apps/web/src/types/index.ts`, mirroring
`docs/api_spec.md`. Import from there with a **relative** path — there is no
`@/` path alias configured in `apps/web/tsconfig.json`.

```typescript
// Relative imports only - no '@/' alias exists in this project
import type { Contract, ContractCategory } from '../types';

// Reuse the existing unions; do not redeclare them.
export type ContractCategory =
  | 'insurance'
  | 'electricity_contract'
  | 'gas_contract'
  | 'mobile_contract'
  | 'streaming_subscription'
  | 'other';

export type BillingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export type ContractStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'review_needed';
```

Note the domain term is **contract**, not "commitment" — one generic commitment
is modelled as a `contract` record. Do not add a parallel `Commitment` type, and
do not invent categories: the six above are enforced by a database CHECK
constraint and the API's Zod schemas.

## React Component Patterns

### Functional Components

```typescript
import type { Contract } from '../types';

interface ContractCardProps {
  contract: Contract;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ContractCard({ 
  contract, 
  onEdit, 
  onDelete 
}: ContractCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <h3 className="text-lg font-semibold text-text">
        {contract.name}
      </h3>
      <p className="text-sm text-muted">{contract.provider}</p>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-text">
          {formatCost(contract.cost, contract.currency)}
          <span className="text-sm font-normal text-muted">
            /{contract.billing_frequency}
          </span>
        </div>
        
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(contract.id)}
              className="rounded-btn border border-border px-3 py-1 text-sm text-text hover:bg-muted/5"
              aria-label={`Edit ${contract.name}`}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(contract.id)}
              className="rounded-btn bg-negative px-3 py-1 text-sm text-white hover:opacity-90"
              aria-label={`Delete ${contract.name}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Component Organization

Components live under `src/components/`, grouped by domain, alongside the pages
that use them in `src/pages/`:

```
src/
├── components/
│   ├── ui/               # Icon.tsx - shared primitives
│   ├── layout/           # AppLayout.tsx
│   └── contracts/        # ContractForm.tsx, ContractCard.tsx, ...
├── pages/                # DashboardPage, ContractsPage, ProfilePage, AuthPage
├── hooks/                # useAuth.tsx
├── services/             # api.ts, firebase.ts
└── types/                # index.ts - all API types
```

Keep components small and focused. Extract a component when a page file
approaches ~200 lines, as `ContractsPage.tsx` does with `ContractDetail`,
`SharesTab`, and `ActivityTab`.

### Data fetching pattern

This codebase does **not** use a container/presentational split or a
`useCommitments`-style hook. Pages fetch directly in `useEffect` with local
state, and pass data down as props. Follow that pattern:

```tsx
import { useEffect, useState } from 'react';
import { contractsApi } from '../services/api';
import type { Contract } from '../types';

function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contractsApi
      .list()
      .then((res) => setContracts(res.data))
      .catch(() => setError('Failed to load contracts'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading contracts…</p>;
  if (error) return <p className="text-sm text-muted">{error}</p>;
  // ...
}
```

Extract a hook only when the same fetch is genuinely reused in several places.
Error handling in components is intentionally coarse — a short user-facing
message, not the raw API error.

## React Hooks

### Hook Rules

- **Never call hooks conditionally** — hooks must be called in the same order every render
- **Complete dependency arrays** — include all values from component scope that change over time
- **Use `useCallback` for callbacks** passed to child components to prevent unnecessary re-renders
- **Use `useMemo` for expensive computations** that don't need to run every render

```typescript
// GOOD - complete dependency array
useEffect(() => {
  document.title = `Contracts (${contracts.length})`;
}, [contracts.length]);

// BAD - missing dependency
useEffect(() => {
  document.title = `Contracts (${contracts.length})`;
}, []); // Missing contracts dependency

// GOOD - memoized callback
const handleClick = useCallback(() => {
  onSubmit(formData);
}, [formData, onSubmit]);

// GOOD - memoized computation
const totalCost = useMemo(() => {
  return contracts.reduce((sum, c) => sum + c.cost, 0);
}, [contracts]);
```

## Form Handling

**There is no form library installed.** `react-hook-form`, `@hookform/resolvers`
and `zod` are NOT dependencies of `apps/web`. Do not import them. Use controlled
inputs with `useState`, which is the established pattern in this codebase (see
`SharesTab` in `apps/web/src/pages/ContractsPage.tsx`).

Server-side validation is authoritative — it lives in the API's Zod schemas
(e.g. `createSchema` in `apps/api-nest/src/contracts/contracts.controller.ts`)
and mirrors `docs/api_spec.md`. Client-side checks exist only to give fast
feedback; always handle the API's `400` response too.

```tsx
import { useState } from 'react';
import type { Contract, ContractCategory } from '../types';

interface ContractFormProps {
  onSubmit: (data: Partial<Contract>) => Promise<void>;
  onCancel: () => void;
}

export function ContractForm({ onSubmit, onCancel }: ContractFormProps) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    const amount = Number(cost);
    if (!cost.trim() || Number.isNaN(amount) || amount <= 0) {
      next.cost = 'Cost must be a positive number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      // Send cost as a DECIMAL (15.99), not cents. The API converts to cents.
      await onSubmit({ name: name.trim(), cost: Number(cost) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text">
          Name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={`mt-1 block w-full rounded-btn border bg-background px-3 py-2 text-sm text-text focus:outline-none ${
            errors.name ? 'border-negative' : 'border-border focus:border-primary'
          }`}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-negative">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-text">
          Cost (EUR)
        </label>
        <input
          id="cost"
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          aria-invalid={Boolean(errors.cost)}
          aria-describedby={errors.cost ? 'cost-error' : undefined}
          className={`mt-1 block w-full rounded-btn border bg-background px-3 py-2 text-sm text-text focus:outline-none ${
            errors.cost ? 'border-negative' : 'border-border focus:border-primary'
          }`}
        />
        {errors.cost && (
          <p id="cost-error" className="mt-1 text-sm text-negative">
            {errors.cost}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-btn bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-btn border border-border px-4 py-2 text-sm text-text hover:bg-muted/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

**Cost units:** the API accepts a **decimal** amount (`15.99`), not cents. It
converts to integer cents server-side (`decimalToCents`). Never multiply by 100
in the client — that produces a 100× error.

## Tailwind CSS Patterns

### Semantic tokens, not raw palettes

The theme is defined in `apps/web/tailwind.config.js`, which is the single
source of truth. Use its **semantic** token names — never raw Tailwind palette
classes (`blue-*`, `gray-*`, `red-*`), and never arbitrary values like
`text-[#123456]`.

```tsx
// GOOD - semantic tokens from tailwind.config.js
<div className="rounded-card border border-border bg-surface p-6">
  <h2 className="text-xl font-semibold text-text">Dashboard</h2>
  <p className="text-sm text-muted">Supporting copy</p>
</div>

// BAD - raw palette / arbitrary values
<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
</div>
```

Available tokens: `background`, `surface`, `text`, `muted`, `border`,
`primary`(+`-subtle`), `positive`(+`-subtle`), `negative`(+`-subtle`),
`category-*` (insurance, electricity, gas, mobile, streaming, other),
`warning`. Radii: `rounded-btn` (10px), `rounded-card` (12px). Font: IBM Plex
Sans. Adding a colour means editing `tailwind.config.js` — not the component.

### No shadows

Shadows are disabled globally in `apps/web/src/index.css`
(`* { box-shadow: none !important; }`). Separate surfaces with `bg-surface` vs
`bg-background` and 1px `border-border` outlines instead.

### `@apply` is permitted in the base layer

Utility classes in JSX are the default, but `@apply` is used for global base
styles in `apps/web/src/index.css`:

```css
@layer base {
  body {
    @apply bg-background text-text font-sans antialiased;
  }
}
```

Keep `@apply` confined to that base layer; don't introduce component classes.

### Responsive Design

Mobile-first approach with responsive prefixes:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {contracts.map(contract => (
    <ContractCard key={contract.id} contract={contract} />
  ))}
</div>
```

### State Variants

```tsx
<button className="rounded-btn bg-primary px-4 py-2 text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150">
  Submit
</button>
```

### No dark mode

The app is light-mode only. Do not add `dark:` variants or `darkMode` config —
the palette is designed for a single light theme.

### Common Patterns

```tsx
// Spacing
<div className="space-y-4"> {/* Vertical spacing between children */}
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Flexbox
<div className="flex items-center justify-between">
  <span>Left</span>
  <span>Right</span>
</div>

// Grid
<div className="grid grid-cols-2 gap-4">
  <div>Cell 1</div>
  <div>Cell 2</div>
</div>

// Conditional classes - use template literals
<div className={`rounded-card border p-4 ${
  isActive ? 'bg-primary-subtle border-primary' : 'bg-surface border-border'
}`}>
```

## API Integration

The API client already exists at `apps/web/src/services/api.ts`. It uses
**axios** (not `fetch`) and has:
- a request interceptor that attaches the Firebase ID token as a Bearer header
- a response interceptor that signs out and redirects to `/auth` on `401`
- typed helper objects: `contractsApi`, `consentsApi`, `usersApi`

Extend that file rather than creating another client:

```typescript
import api from '../services/api';   // relative imports - no `@/` alias exists

// Add to the relevant helper object in services/api.ts
export const contractsApi = {
  // ...
  create: async (input: Partial<Contract>) => {
    const { data } = await api.post<Contract>('/contracts', input)
    return data
  },
}
```

Base URL comes from `import.meta.env.VITE_API_BASE_URL` (defaults to `/api/v1`,
proxied to the API in development by `vite.config.ts`). **Never** use
`process.env.NEXT_PUBLIC_*` — this is a Vite app, not Next.js.

### Error Handling

Read the API's error envelope. The shape is `{ error: { code, message, details? } }`
(typed as `APIError` in `src/types/index.ts`):

```typescript
import axios from 'axios';
import type { APIError } from '../types';

try {
  await contractsApi.create(input);
} catch (error) {
  if (axios.isAxiosError(error) && error.response?.status === 400) {
    const body = error.response.data as APIError;
    // Map field-level errors back onto the form
    for (const detail of body.error.details ?? []) {
      setFieldError(detail.field, detail.message);
    }
    setMessage(body.error.message);
  } else {
    setMessage('An unexpected error occurred');
  }
}
```

Note: after a `401` the response interceptor signs the user out and redirects,
so a `401` branch is usually unnecessary in component code.

## Accessibility

### Semantic HTML

```tsx
// GOOD - semantic elements
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/contracts">Contracts</a></li>
  </ul>
</nav>

<main>
  <h1>Dashboard</h1>
  <section aria-labelledby="upcoming-section">
    <h2 id="upcoming-section">Upcoming Deadlines</h2>
    {/* content */}
  </section>
</main>

// BAD - div soup
<div className="nav">
  <div className="nav-item">Dashboard</div>
</div>
```

### ARIA Labels

```tsx
// Icon-only buttons need aria-label
<button 
  onClick={() => onDelete(contract.id)}
  aria-label={`Delete ${contract.name}`}
  className="p-2"
>
  <TrashIcon className="h-5 w-5" />
</button>

// Loading states
<div aria-busy={loading} aria-live="polite">
  {loading ? <LoadingSpinner /> : <Content />}
</div>
```

### Keyboard Navigation

```tsx
// Ensure all interactive elements are keyboard accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  tabIndex={0}
>
  Click me
</button>
```

### Form Accessibility

```tsx
// Always associate labels with inputs
<div>
  <label htmlFor="email">Email</label>
  <input id="email" type="email" aria-describedby="email-error" />
  {error && <p id="email-error" role="alert">{error}</p>}
</div>
```

## Performance Optimization

### Memoization

```typescript
// Memoize expensive computations
const totalCost = useMemo(() => {
  return contracts.reduce((sum, c) => sum + c.cost, 0);
}, [contracts]);

// Memoize callbacks passed to children
const handleClick = useCallback((id: string) => {
  onSelect(id);
}, [onSelect]);

// Memoize components that don't need to re-render
const MemoizedContractCard = React.memo(ContractCard);
```

### Code Splitting

```typescript
// Lazy load large components
const Dashboard = lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

### List Rendering

```tsx
// Use stable, unique keys (not array index)
{contracts.map(contract => (
  <ContractCard key={contract.id} contract={contract} />
))}
```

`react-window` is not installed. Don't add virtualization for this app's list
sizes — the contract list is paginated by the API (`page`/`limit`), so just
render the current page.

## Testing

**No frontend test infrastructure is installed.** `apps/web` has no test runner
and no `@testing-library/*` packages, and there are no `*.test.tsx` /
`*.spec.tsx` files. Do not write test files against packages that are not
installed, and do not import `@testing-library/react` or use `jest.*` — neither
is available.

If you need frontend tests, that requires a separate decision and setup step
(vitest + @testing-library/react + jsdom), added as real dependencies. Raise it
rather than assuming.

For verifying UI behaviour now, use the **`webapp-testing` skill** (Playwright)
against the running dev server — that exercises the real app rather than a
simulated DOM.

The backend has a working Vitest setup (`apps/api-nest`, `*.spec.ts`) — see
`testing.instructions.md` for that.

## Common Pitfalls to Avoid

- Using `any` type instead of proper TypeScript types
- Missing useEffect dependencies
- Stale closures in callbacks (capturing old state)
- Direct state mutation (`state.value = 5` instead of `setState`)
- Missing keys in lists or using array index as key
- Raw Tailwind palette classes (`bg-blue-600`) instead of the semantic tokens in `tailwind.config.js`
- Sending `cost` in cents — the API expects a decimal amount (`15.99`)
- Importing with a `@/` alias — no such alias is configured; use relative paths
- Unnecessary useEffect for state that could be derived from props
- Prop drilling through many levels (use context instead)
- Missing error boundaries for unhandled errors
- Not handling loading and error states
- Forgetting accessibility attributes (aria-label, role)
- Using inline styles instead of Tailwind utilities
- Creating new objects/arrays in render (causes unnecessary re-renders)

## Build and Verification

### Essential Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Type check
npm run type-check
```

### Development Workflow

1. Run `npm run type-check` before committing
2. Run tests before pushing
3. Keep commits focused and atomic
4. Write meaningful commit messages
5. Test accessibility with keyboard navigation
