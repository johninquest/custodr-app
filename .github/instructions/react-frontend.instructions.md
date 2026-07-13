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
interface Commitment {
  id: string;
  name: string;
  cost: number;
  currency: string;
  status: CommitmentStatus;
}

type CommitmentStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'review_needed';

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

Organize types in dedicated files:

```
src/
├── types/
│   ├── commitment.ts
│   ├── reminder.ts
│   ├── user.ts
│   └── api.ts
├── components/
└── hooks/
```

```typescript
// src/types/commitment.ts
export interface Commitment {
  id: string;
  user_id: string;
  name: string;
  category: CommitmentCategory;
  provider: string;
  start_date: string; // ISO 8601 date
  renewal_date: string;
  cancellation_deadline?: string;
  cost: number;
  currency: string;
  billing_frequency: BillingFrequency;
  status: CommitmentStatus;
  notes?: string;
  created_at: string; // ISO 8601 timestamp
  updated_at: string;
}

export type CommitmentCategory =
  | 'insurance'
  | 'streaming_subscription'
  | 'software_subscription'
  | 'mobile_contract'
  | 'internet_contract'
  | 'electricity_contract'
  | 'gas_contract'
  | 'gym_membership'
  | 'banking_product'
  | 'vehicle_obligation'
  | 'healthcare_reminder'
  | 'vaccination_reminder'
  | 'other';

export type BillingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export type CommitmentStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'review_needed';

export interface CreateCommitmentRequest {
  name: string;
  category: CommitmentCategory;
  provider: string;
  start_date: string;
  renewal_date: string;
  cancellation_deadline?: string;
  cost: number;
  currency: string;
  billing_frequency: BillingFrequency;
  notes?: string;
}
```

## React Component Patterns

### Functional Components

```typescript
import { Commitment } from '@/types';

interface CommitmentCardProps {
  commitment: Commitment;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CommitmentCard({ 
  commitment, 
  onEdit, 
  onDelete 
}: CommitmentCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">
        {commitment.name}
      </h3>
      <p className="text-sm text-gray-500">{commitment.provider}</p>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-gray-900">
          {formatCost(commitment.cost, commitment.currency)}
          <span className="text-sm font-normal text-gray-500">
            /{commitment.billing_frequency}
          </span>
        </div>
        
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(commitment.id)}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              aria-label={`Edit ${commitment.name}`}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(commitment.id)}
              className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
              aria-label={`Delete ${commitment.name}`}
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

```
src/components/
├── commitments/
│   ├── CommitmentCard.tsx
│   ├── CommitmentList.tsx
│   ├── CommitmentForm.tsx
│   └── index.ts
├── dashboard/
│   ├── Dashboard.tsx
│   ├── UpcomingDeadlines.tsx
│   └── CostOverview.tsx
└── common/
    ├── Button.tsx
    ├── Input.tsx
    └── LoadingSpinner.tsx
```

### Container/Presentational Pattern

```typescript
// Presentational component - receives data via props
interface CommitmentListProps {
  commitments: Commitment[];
  loading: boolean;
  error: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CommitmentList({ 
  commitments, 
  loading, 
  error, 
  onEdit, 
  onDelete 
}: CommitmentListProps) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {commitments.map(commitment => (
        <CommitmentCard
          key={commitment.id}
          commitment={commitment}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// Container component - manages state and data fetching
export function CommitmentListContainer() {
  const { commitments, loading, error, refetch } = useCommitments();
  
  const handleEdit = (id: string) => {
    // Navigate to edit page
  };
  
  const handleDelete = async (id: string) => {
    await api.deleteCommitment(id);
    refetch();
  };
  
  return (
    <CommitmentList
      commitments={commitments}
      loading={loading}
      error={error}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
```

## React Hooks

### Custom Hooks

```typescript
// src/hooks/useCommitments.ts
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Commitment } from '@/types';

interface UseCommitmentsResult {
  commitments: Commitment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCommitments(): UseCommitmentsResult {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommitments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCommitments();
      setCommitments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitments();
  }, []);

  return {
    commitments,
    loading,
    error,
    refetch: fetchCommitments,
  };
}
```

### Hook Rules

- **Never call hooks conditionally** — hooks must be called in the same order every render
- **Complete dependency arrays** — include all values from component scope that change over time
- **Use useCallback for callbacks** passed to child components to prevent unnecessary re-renders
- **Use useMemo for expensive computations** that don't need to run every render

```typescript
// GOOD - complete dependency array
useEffect(() => {
  document.title = `Commitments (${commitments.length})`;
}, [commitments.length]);

// BAD - missing dependency
useEffect(() => {
  document.title = `Commitments (${commitments.length})`;
}, []); // Missing commitments dependency

// GOOD - memoized callback
const handleClick = useCallback(() => {
  onSubmit(formData);
}, [formData, onSubmit]);

// GOOD - memoized computation
const totalCost = useMemo(() => {
  return commitments.reduce((sum, c) => sum + c.cost, 0);
}, [commitments]);
```

## Form Handling (react-hook-form + zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const commitmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  category: z.enum(['insurance', 'streaming_subscription', /* ... */]),
  provider: z.string().min(1, 'Provider is required'),
  cost: z.number().positive('Cost must be positive'),
  billing_frequency: z.enum(['monthly', 'quarterly', 'annual']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  cancellation_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  notes: z.string().max(1000).optional(),
});

type CommitmentFormData = z.infer<typeof commitmentSchema>;

interface CommitmentFormProps {
  onSubmit: (data: CommitmentFormData) => Promise<void>;
  initialData?: Partial<CommitmentFormData>;
}

export function CommitmentForm({ onSubmit, initialData }: CommitmentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CommitmentFormData>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: initialData,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          {...register('name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
          Cost (EUR)
        </label>
        <input
          id="cost"
          type="number"
          step="0.01"
          {...register('cost', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.cost && (
          <p className="mt-1 text-sm text-red-600">{errors.cost.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Commitment'}
      </button>
    </form>
  );
}
```

## Tailwind CSS Patterns

### Utility-First Approach

Use Tailwind utility classes directly — no custom CSS, no `@apply`:

```tsx
// GOOD - utility classes
<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
</div>

// BAD - custom CSS
<div className="card">
  <h2 className="card-title">Dashboard</h2>
</div>
```

### Responsive Design

Mobile-first approach with responsive prefixes:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {commitments.map(commitment => (
    <CommitmentCard key={commitment.id} commitment={commitment} />
  ))}
</div>
```

### State Variants

```tsx
<button className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
  Submit
</button>
```

### Dark Mode

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  <h1 className="text-2xl font-bold">Dashboard</h1>
</div>
```

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

// Conditional classes
<div className={cn(
  'rounded-lg p-4',
  isActive && 'bg-blue-50 border-blue-200',
  !isActive && 'bg-gray-50 border-gray-200'
)}>
```

## API Integration

### Type-Safe API Client

```typescript
// src/lib/api.ts
import { Commitment, CreateCommitmentRequest } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getCommitments(): Promise<Commitment[]> {
    const response = await this.request<{ data: Commitment[] }>('/commitments');
    return response.data;
  }

  async createCommitment(data: CreateCommitmentRequest): Promise<Commitment> {
    return this.request<Commitment>('/commitments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCommitment(id: string, data: Partial<Commitment>): Promise<Commitment> {
    return this.request<Commitment>(`/commitments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCommitment(id: string): Promise<void> {
    await this.request(`/commitments/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
```

### Error Handling

```typescript
try {
  const commitment = await api.createCommitment(formData);
  // Success handling
} catch (error) {
  if (error instanceof Error) {
    // Show user-friendly error message
    setError(error.message);
  } else {
    // Unexpected error
    setError('An unexpected error occurred');
  }
}
```

## Accessibility

### Semantic HTML

```tsx
// GOOD - semantic elements
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/commitments">Commitments</a></li>
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
  onClick={() => onDelete(id)}
  aria-label={`Delete ${commitment.name}`}
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
  return commitments.reduce((sum, c) => sum + c.cost, 0);
}, [commitments]);

// Memoize callbacks passed to children
const handleClick = useCallback((id: string) => {
  onSelect(id);
}, [onSelect]);

// Memoize components that don't need to re-render
const MemoizedCommitmentCard = React.memo(CommitmentCard);
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
{commitments.map(commitment => (
  <CommitmentCard key={commitment.id} commitment={commitment} />
))}

// For large lists, use virtualization
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={commitments.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <CommitmentCard commitment={commitments[index]} />
    </div>
  )}
</FixedSizeList>
```

## Testing

### Component Tests (React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CommitmentCard } from './CommitmentCard';

describe('CommitmentCard', () => {
  const mockCommitment = {
    id: '123',
    name: 'Netflix',
    category: 'streaming_subscription' as const,
    provider: 'Netflix',
    cost: 15.99,
    currency: 'EUR',
    status: 'active' as const,
    billing_frequency: 'monthly' as const,
    start_date: '2024-01-01',
    renewal_date: '2025-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'user-123',
  };

  it('renders commitment name and cost', () => {
    render(<CommitmentCard commitment={mockCommitment} />);
    
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('€15.99')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(<CommitmentCard commitment={mockCommitment} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    expect(onEdit).toHaveBeenCalledWith('123');
  });

  it('shows cancelled badge when status is cancelled', () => {
    render(<CommitmentCard commitment={{ ...mockCommitment, status: 'cancelled' }} />);
    
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});
```

### Hook Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCommitments } from './useCommitments';

describe('useCommitments', () => {
  it('fetches commitments on mount', async () => {
    const mockCommitments = [{ id: '1', name: 'Netflix' }];
    jest.spyOn(api, 'getCommitments').mockResolvedValue(mockCommitments);

    const { result } = renderHook(() => useCommitments());

    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.commitments).toEqual(mockCommitments);
    });
  });

  it('handles error', async () => {
    jest.spyOn(api, 'getCommitments').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCommitments());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });
});
```

## Common Pitfalls to Avoid

- Using `any` type instead of proper TypeScript types
- Missing useEffect dependencies
- Stale closures in callbacks (capturing old state)
- Direct state mutation (`state.value = 5` instead of `setState`)
- Missing keys in lists or using array index as key
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
