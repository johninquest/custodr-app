import { Icon } from '../components/ui/Icon';
import { Commitment } from '../types';

// Dummy data for demonstration
const dummyCommitments: Commitment[] = [
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
    name: 'Fitness First',
    category: 'gym_membership',
    provider: 'Fitness First Germany',
    start_date: '2024-06-01',
    renewal_date: '2026-08-20',
    cancellation_deadline: '2026-08-05',
    cost: 39.90,
    currency: 'EUR',
    billing_frequency: 'monthly',
    status: 'review_needed',
    notes: 'Consider cancellation - not using enough',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: '4',
    user_id: 'user123',
    name: 'Vodafone Internet',
    category: 'internet_contract',
    provider: 'Vodafone',
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
    name: 'Adobe Creative Cloud',
    category: 'software_subscription',
    provider: 'Adobe',
    start_date: '2024-04-10',
    renewal_date: '2026-08-25',
    cancellation_deadline: '2026-08-10',
    cost: 61.99,
    currency: 'EUR',
    billing_frequency: 'monthly',
    status: 'active',
    created_at: '2024-04-10T10:00:00Z',
    updated_at: '2024-04-10T10:00:00Z',
  },
];

const getCategoryIcon = (category: Commitment['category']): 'film' | 'shield' | 'dumbbell' | 'wifi' | 'credit-card' => {
  const iconMap: Record<string, 'film' | 'shield' | 'dumbbell' | 'wifi' | 'credit-card'> = {
    streaming_subscription: 'film',
    insurance: 'shield',
    gym_membership: 'dumbbell',
    internet_contract: 'wifi',
    software_subscription: 'credit-card',
  };
  return iconMap[category] || 'credit-card';
};

const getStatusColor = (status: Commitment['status']): string => {
  const colorMap: Record<string, string> = {
    active: 'bg-positive-subtle text-positive',
    cancelled: 'bg-negative-subtle text-negative',
    expired: 'bg-muted/10 text-muted',
    paused: 'bg-muted/10 text-muted',
    review_needed: 'bg-primary-subtle text-primary',
  };
  return colorMap[status] || 'bg-muted/10 text-muted';
};

const getStatusLabel = (status: Commitment['status']): string => {
  const labelMap: Record<string, string> = {
    active: 'Active',
    cancelled: 'Cancelled',
    expired: 'Expired',
    paused: 'Paused',
    review_needed: 'Review Needed',
  };
  return labelMap[status] || status;
};

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
  const today = new Date();
  const targetDate = new Date(dateString);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function DashboardPage() {
  const activeCommitments = dummyCommitments.filter(c => c.status === 'active');
  const monthlySpend = activeCommitments
    .filter(c => c.billing_frequency === 'monthly')
    .reduce((sum, c) => sum + c.cost, 0);
  
  const upcomingRenewals = dummyCommitments
    .filter(c => {
      const days = getDaysUntil(c.renewal_date);
      return days > 0 && days <= 30;
    })
    .sort((a, b) => getDaysUntil(a.renewal_date) - getDaysUntil(b.renewal_date));

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-border p-6">
          <p className="text-sm text-muted mb-1">Active Commitments</p>
          <p className="text-2xl font-semibold text-text">{activeCommitments.length}</p>
        </div>
        
        <div className="bg-surface rounded-card border border-border p-6">
          <p className="text-sm text-muted mb-1">Monthly Spend</p>
          <p className="text-2xl font-semibold text-text">
            {formatCurrency(monthlySpend, 'EUR')}
          </p>
        </div>
        
        <div className="bg-surface rounded-card border border-border p-6">
          <p className="text-sm text-muted mb-1">Upcoming Renewals</p>
          <p className="text-2xl font-semibold text-text">{upcomingRenewals.length}</p>
        </div>
      </div>

      {/* Upcoming Renewals */}
      {upcomingRenewals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-text mb-4">Upcoming Renewals</h2>
          <div className="bg-surface rounded-card border border-border overflow-hidden">
            {upcomingRenewals.map((commitment, index) => {
              const daysUntil = getDaysUntil(commitment.renewal_date);
              return (
                <div
                  key={commitment.id}
                  className={`p-4 flex items-center gap-4 ${
                    index < upcomingRenewals.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0">
                    <Icon name={getCategoryIcon(commitment.category)} size={24} className="text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{commitment.name}</p>
                    <p className="text-sm text-muted">
                      {commitment.provider} • Renews {formatDate(commitment.renewal_date)}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-text">
                      {formatCurrency(commitment.cost, commitment.currency)}
                    </p>
                    <p className="text-sm text-primary font-medium">
                      in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Commitments */}
      <div>
        <h2 className="text-xl font-semibold text-text mb-4">All Commitments</h2>
        <div className="bg-surface rounded-card border border-border overflow-hidden">
          {dummyCommitments.map((commitment, index) => (
            <div
              key={commitment.id}
              className={`p-4 flex items-center gap-4 ${
                index < dummyCommitments.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0">
                <Icon name={getCategoryIcon(commitment.category)} size={24} className="text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-text truncate">{commitment.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(commitment.status)}`}>
                    {getStatusLabel(commitment.status)}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {commitment.provider} • {commitment.billing_frequency}
                </p>
              </div>
              
              <div className="text-right flex-shrink-0">
                <p className="font-medium text-text">
                  {formatCurrency(commitment.cost, commitment.currency)}
                </p>
                <p className="text-xs text-muted">
                  {commitment.billing_frequency === 'monthly' ? '/month' : '/year'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
