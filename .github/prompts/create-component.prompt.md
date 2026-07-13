---
name: create-component
description: "Scaffold a complete React component with TypeScript, Tailwind CSS, tests, and Storybook stories. Generates accessible, responsive components following best practices."
---

# Create Component

Create React component: `${input:ComponentSpec}` (e.g., "CommitmentCard - displays commitment summary with edit/delete actions")

## Instructions

You are a frontend specialist creating production-ready React components. Generate complete, accessible, and well-tested components following modern React patterns.

### Step 1: Parse Component Specification

Extract from the spec:

- **Component name**: PascalCase name
- **Purpose**: What does this component do?
- **Props**: What data does it receive?
- **State**: What internal state does it manage?
- **Interactions**: What user actions does it handle?
- **Styling**: Visual design requirements

### Step 2: Design the Component API

Define the props interface:

```typescript
interface ComponentNameProps {
  // Required props
  data: DataType;
  
  // Optional props
  onAction?: (id: string) => void;
  className?: string;
  
  // Children (if applicable)
  children?: React.ReactNode;
}
```

Consider:

- **Required vs optional**: Which props are required?
- **Callbacks**: What events does the component emit?
- **Customization**: How can consumers customize styling?
- **Accessibility**: What ARIA attributes are needed?

### Step 3: Generate Component Implementation

Create the component with TypeScript and Tailwind:

```typescript
// src/components/ComponentName.tsx

import { DataType } from '@/types';

interface ComponentNameProps {
  data: DataType;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ComponentName({ 
  data, 
  onEdit, 
  onDelete 
}: ComponentNameProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {data.name}
          </h3>
          <p className="text-sm text-gray-500">{data.description}</p>
        </div>
        
        <StatusBadge status={data.status} />
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(data.value)}
        </div>
        
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(data.id)}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Edit ${data.name}`}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(data.id)}
              className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label={`Delete ${data.name}`}
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

### Step 4: Add Accessibility

Ensure the component is accessible:

- **Semantic HTML**: Use appropriate elements (button, nav, main, article)
- **ARIA labels**: Add labels for icon-only buttons and complex interactions
- **Keyboard navigation**: Ensure all interactions work with keyboard
- **Focus management**: Manage focus for modals and dynamic content
- **Color contrast**: Ensure text meets WCAG AA standards (4.5:1 ratio)
- **Screen readers**: Test with screen reader to verify announcements

### Step 5: Add Responsive Design

Make the component responsive:

```typescript
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Content */}
</div>

<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
  {/* Content */}
</div>
```

Use Tailwind breakpoints:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Step 6: Generate Tests

Create comprehensive tests with React Testing Library:

```typescript
// src/components/ComponentName.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  const mockData = {
    id: '123',
    name: 'Test Item',
    description: 'Test description',
    status: 'active',
    value: 100,
  };

  it('renders component with required props', () => {
    render(<ComponentName data={mockData} />);
    
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', async () => {
    const onEdit = jest.fn();
    render(<ComponentName data={mockData} onEdit={onEdit} />);
    
    const editButton = screen.getByRole('button', { name: /edit test item/i });
    await userEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith('123');
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn();
    render(<ComponentName data={mockData} onDelete={onDelete} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete test item/i });
    await userEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledWith('123');
  });

  it('does not render edit button when onEdit not provided', () => {
    render(<ComponentName data={mockData} />);
    
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('displays correct status badge', () => {
    render(<ComponentName data={{ ...mockData, status: 'cancelled' }} />);
    
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('formats value correctly', () => {
    render(<ComponentName data={{ ...mockData, value: 1234.56 }} />);
    
    expect(screen.getByText('€1,234.56')).toBeInTheDocument();
  });
});
```

### Step 7: Generate Storybook Stories (Optional)

Create Storybook stories for visual testing:

```typescript
// src/components/ComponentName.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Components/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = {
  args: {
    data: {
      id: '1',
      name: 'Netflix Premium',
      description: 'Streaming subscription',
      status: 'active',
      value: 15.99,
    },
  },
};

export const WithActions: Story = {
  args: {
    ...Default.args,
    onEdit: (id) => console.log('Edit', id),
    onDelete: (id) => console.log('Delete', id),
  },
};

export const Cancelled: Story = {
  args: {
    data: {
      ...Default.args.data,
      status: 'cancelled',
    },
  },
};
```

### Step 8: Create Index Export

Export the component from an index file:

```typescript
// src/components/index.ts

export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName';
```

## Output Format

Provide:

```markdown
# Component Created: ComponentName

## Files Created

- `src/components/ComponentName.tsx` - Component implementation
- `src/components/ComponentName.test.tsx` - Component tests
- `src/components/ComponentName.stories.tsx` - Storybook stories (optional)
- `src/components/index.ts` - Export file (updated)

## Component API

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `DataType` | Yes | Data to display |
| `onEdit` | `(id: string) => void` | No | Edit callback |
| `onDelete` | `(id: string) => void` | No | Delete callback |

### Usage

```tsx
import { ComponentName } from '@/components';

function MyPage() {
  const handleEdit = (id: string) => {
    console.log('Edit', id);
  };

  return (
    <ComponentName
      data={myData}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
```

## Features

- ✅ TypeScript with explicit prop types
- ✅ Tailwind CSS for styling
- ✅ Responsive design (mobile-first)
- ✅ Accessible (ARIA labels, keyboard navigation)
- ✅ Comprehensive tests (>90% coverage)
- ✅ Storybook stories for visual testing

## Accessibility

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus indicators
- Color contrast meets WCAG AA

## Testing

```bash
# Run component tests
npm test -- ComponentName.test.tsx

# Run with coverage
npm test -- --coverage

# Run Storybook
npm run storybook
```

## Next Steps

1. Import and use the component in your pages
2. Customize styling to match your design system
3. Add more test cases for edge cases
4. Test with screen reader for accessibility
5. Review Storybook stories for visual consistency
```

## Guidelines

- Use functional components with hooks
- Avoid `any` types — use explicit TypeScript types
- Prefer composition over inheritance
- Keep components small and focused (<200 lines)
- Use Tailwind utilities — no custom CSS
- Test behavior, not implementation details
- Use `getByRole` over `getByTestId` for accessibility
- Handle loading and error states
- Provide sensible default props
- Document complex logic with comments
