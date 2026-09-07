import { Icon } from '../components/ui/Icon';
import { Contract, ContractCategory } from '../types';

// Dummy data for demonstration
const dummyContracts: Contract[] = [
  {
    id: '1',
    user_id: 'user123',
    name: 'Netflix Premium',
    category: 'streaming_subscription',
    provider: 'Netflix',
    start_date: '2024-01-15',
    renewal_date: '2026-09-15',
    cancellation_deadline: '2026-09-01',
    cost: 17.99,
    currency: 'EUR',
    billing_frequency: 'monthly',
    status: 'active',
    notes: 'Family plan',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user123',
    name: 'Hausratversicherung',
    category: 'insurance',
    provider: 'Allianz',
    start_date: '2024-03-01',
    renewal_date: '2026-10-01',
    cancellation_deadline: '2026-09-01',
    cost: 145.00,
    currency: 'EUR',
    billing_frequency: 'annual',
    status: 'active',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
  {
    id: '3',
    user_id: 'user123',
    name: 'Stadtwerke Strom',
    category: 'electricity_contract',
    provider: 'Stadtwerke München',
    start_date: '2024-06-01',
    renewal_date: '2026-09-03',
    cancellation_deadline: '2026-08-20',
    cost: 89.0,
    currency: 'EUR',
    billing_frequency: 'monthly',
    status: 'review_needed',
    notes: 'Tarifwechsel prüfen - Preisgarantie läuft aus',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: '4',
    user_id: 'user123',
    name: 'Telekom Mobilfunk',
    category: 'mobile_contract',
    provider: 'Deutsche Telekom',
    start_date: '2024-02-01',
    renewal_date: '2026-11-01',
    cancellation_deadline: '2026-10-01',
    cost: 49.99,
    currency: 'EUR',
    billing_frequency: 'monthly',
    status: 'active',
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-01T10:00:00Z',
  },
  {
    id: '5',
    user_id: 'user123',
    name: 'Vattenfall Gas',
    category: 'gas_contract',
    provider: 'Vattenfall',
    start_date: '2024-04-10',
    renewal_date: '2026-09-05',
    cancellation_deadline: '2026-08-22',
    cost: 74.5,
    currency: 'EUR',
    billing_frequency: 'monthly',
    status: 'active',
    created_at: '2024-04-10T10:00:00Z',
    updated_at: '2024-04-10T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Category visual identity: icon + label + calm per-category tint
// ---------------------------------------------------------------------------

type CategoryIconName = 'shield' | 'zap' | 'smartphone' | 'film' | 'tag';

interface CategoryStyle {
  icon: CategoryIconName;
  label: string;
  /** Circle background (subtle tint) */
  bg: string;
  /** Icon color (category tone) */
  text: string;
}

const categoryStyles: Record<ContractCategory, CategoryStyle> = {
  insurance: {
    icon: 'shield',
    label: 'Insurance',
    bg: 'bg-category-insurance-subtle',
    text: 'text-category-insurance',
  },
  electricity_contract: {
    icon: 'zap',
    label: 'Electricity',
    bg: 'bg-category-electricity-subtle',
    text: 'text-category-electricity',
  },
  gas_contract: {
    icon: 'zap',
    label: 'Gas',
    bg: 'bg-category-gas-subtle',
    text: 'text-category-gas',
  },
  mobile_contract: {
    icon: 'smartphone',
    label: 'Mobile',
    bg: 'bg-category-mobile-subtle',
    text: 'text-category-mobile',
  },
  streaming_subscription: {
    icon: 'film',
    label: 'Streaming',
    bg: 'bg-category-streaming-subtle',
    text: 'text-category-streaming',
  },
  other: {
    icon: 'tag',
    label: 'Other',
    bg: 'bg-category-other-subtle',
    text: 'text-category-other',
  },
};

const getCategoryStyle = (category: ContractCategory): CategoryStyle =>
  categoryStyles[category] ?? categoryStyles.other;

/** Icon in a tinted circle — the shared category visual identity. */
function CategoryBadge({ category }: { category: ContractCategory }) {
  const style = getCategoryStyle(category);
  return (
    <div
      className={`w-11 h-11 rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}
    >
      <Icon name={style.icon} size={22} className={style.text} />
      <span className="sr-only">{style.label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const getStatusColor = (status: Contract['status']): string => {
  const colorMap: Record<Contract['status'], string> = {
    active: 'bg-positive-subtle text-positive',
    cancelled: 'bg-negative-subtle text-negative',
    expired: 'bg-muted/10 text-muted',
    paused: 'bg-muted/10 text-muted',
    review_needed: 'bg-primary-subtle text-primary',
  };
  return colorMap[status];
};

const getStatusLabel = (status: Contract['status']): string => {
  const labelMap: Record<Contract['status'], string> = {
    active: 'Active',
    cancelled: 'Cancelled',
    expired: 'Expired',
    paused: 'Paused',
    review_needed: 'Review Needed',
  };
  return labelMap[status];
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
};

const getDaysUntil = (dateString: string): number => {
  // Parse the YYYY-MM-DD string into local date components: new Date('YYYY-MM-DD')
  // would parse as UTC midnight and skew the day count for non-UTC users
  // (e.g. Europe/Berlin) around midnight boundaries.
  const [year, month, day] = dateString.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/** Normalize any billing frequency to a monthly amount. */
const getMonthlyCost = (contract: Contract): number => {
  switch (contract.billing_frequency) {
    case 'monthly':
      return contract.cost;
    case 'quarterly':
      return contract.cost / 3;
    case 'semi_annual':
      return contract.cost / 6;
    case 'annual':
      return contract.cost / 12;
    default:
      return contract.cost;
  }
};

// ---------------------------------------------------------------------------
// Local UI helpers
// ---------------------------------------------------------------------------

/** Card container — flat surface, 1px border, soft rounding. */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-card border border-border ${className}`}>{children}</div>
  );
}

/** Section header with optional count badge. */
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      {typeof count === 'number' && (
        <span className="text-xs font-medium text-muted bg-muted/10 rounded-full px-2 py-0.5">
          {count}
        </span>
      )}
    </div>
  );
}

/** Summary stat card. */
function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className="text-2xl font-semibold text-text">{value}</p>
    </Card>
  );
}

/** Urgency styling for renewal countdowns — subtle, not alarming. */
function RenewalCountdown({ daysUntil }: { daysUntil: number }) {
  const urgent = daysUntil <= 7;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
        urgent ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary'
      }`}
    >
      {urgent && <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true" />}
      in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
    </span>
  );
}

/** Friendly empty state with a call-to-action. */
function EmptyState() {
  return (
    <Card className="p-10 flex flex-col items-center text-center">
      <div
        className="w-14 h-14 rounded-full bg-primary-subtle flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <Icon name="list" size={26} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-text mb-1">No contracts yet</h3>
      <p className="text-sm text-muted max-w-xs mb-5">
        Track your insurance, subscriptions and contracts in one place — never miss a renewal or
        cancellation deadline again.
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-btn bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-150"
      >
        <Icon name="list" size={18} className="text-white" aria-hidden="true" />
        Add your first contract
      </button>
    </Card>
  );
}

/** Monthly-normalized cost breakdown per category with proportional bars. */
function CategoryCostBreakdown({ contracts }: { contracts: Contract[] }) {
  const byCategory = new Map<ContractCategory, number>();
  for (const c of contracts) {
    byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + getMonthlyCost(c));
  }

  const entries = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  if (total === 0) return null;

  return (
    <Card className="p-5">
      <p className="text-sm text-muted mb-4">Monthly Spend by Category</p>
      <ul className="space-y-3">
        {entries.map(([category, amount]) => {
          const style = getCategoryStyle(category);
          const pct = Math.round((amount / total) * 100);
          return (
            <li key={category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text">{style.label}</span>
                <span className="text-sm text-muted">
                  {formatCurrency(amount, 'EUR')} · {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${style.text}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  role="presentation"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DashboardPage() {
  const activeContracts = dummyContracts.filter((c) => c.status === 'active');
  const monthlySpend = activeContracts.reduce((sum, c) => sum + getMonthlyCost(c), 0);

  const upcomingRenewals = dummyContracts
    .map((c) => ({ contract: c, days: getDaysUntil(c.renewal_date) }))
    .filter(({ days }) => days > 0 && days <= 30)
    .sort((a, b) => a.days - b.days)
    .map(({ contract }) => contract);

  const isEmpty = dummyContracts.length === 0;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Active Contracts" value={activeContracts.length} />
        <SummaryCard label="Monthly Spend" value={formatCurrency(monthlySpend, 'EUR')} />
        <SummaryCard label="Upcoming Renewals" value={upcomingRenewals.length} />
      </div>

      {/* Cost breakdown by category */}
      {!isEmpty && <CategoryCostBreakdown contracts={activeContracts} />}

      {/* Upcoming Renewals */}
      {!isEmpty && upcomingRenewals.length > 0 && (
        <div>
          <SectionHeader title="Upcoming Renewals" count={upcomingRenewals.length} />
          <Card className="overflow-hidden">
            {upcomingRenewals.map((contract, index) => {
              const daysUntil = getDaysUntil(contract.renewal_date);
              const urgent = daysUntil <= 7;
              return (
                <div
                  key={contract.id}
                  className={`p-4 flex items-center gap-4 transition-colors duration-150 hover:bg-muted/5 ${
                    index < upcomingRenewals.length - 1 ? 'border-b border-border' : ''
                  } ${urgent ? 'bg-warning-subtle/50' : ''}`}
                >
                  <CategoryBadge category={contract.category} />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{contract.name}</p>
                    <p className="text-sm text-muted">
                      {contract.provider} • Renews {formatDate(contract.renewal_date)}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="font-medium text-text">
                      {formatCurrency(contract.cost, contract.currency)}
                    </p>
                    <RenewalCountdown daysUntil={daysUntil} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* All Contracts */}
      <div>
        <SectionHeader title="All Contracts" count={dummyContracts.length} />
        {isEmpty ? (
          <EmptyState />
        ) : (
          <Card className="overflow-hidden">
            {dummyContracts.map((contract, index) => (
              <div
                key={contract.id}
                className={`p-4 flex items-center gap-4 transition-colors duration-150 hover:bg-muted/5 ${
                  index < dummyContracts.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <CategoryBadge category={contract.category} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-text truncate">{contract.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(contract.status)}`}
                    >
                      {getStatusLabel(contract.status)}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {contract.provider} • {contract.billing_frequency}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-text">
                    {formatCurrency(contract.cost, contract.currency)}
                  </p>
                  <p className="text-xs text-muted">
                    {contract.billing_frequency === 'monthly' ? '/month' : '/year'}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
