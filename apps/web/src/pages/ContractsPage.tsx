import { useEffect, useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { contractsApi } from '../services/api';
import type { AuditEntry, Contract, ContractCategory, ContractShare } from '../types';

// ---------------------------------------------------------------------------
// Category visual identity (mirrors DashboardPage)
// ---------------------------------------------------------------------------

type CategoryIconName = 'shield' | 'zap' | 'smartphone' | 'film' | 'tag';

interface CategoryStyle {
  icon: CategoryIconName;
  label: string;
  bg: string;
  text: string;
}

const categoryStyles: Record<ContractCategory, CategoryStyle> = {
  insurance: { icon: 'shield', label: 'Insurance', bg: 'bg-category-insurance-subtle', text: 'text-category-insurance' },
  electricity_contract: { icon: 'zap', label: 'Electricity', bg: 'bg-category-electricity-subtle', text: 'text-category-electricity' },
  gas_contract: { icon: 'zap', label: 'Gas', bg: 'bg-category-gas-subtle', text: 'text-category-gas' },
  mobile_contract: { icon: 'smartphone', label: 'Mobile', bg: 'bg-category-mobile-subtle', text: 'text-category-mobile' },
  streaming_subscription: { icon: 'film', label: 'Streaming', bg: 'bg-category-streaming-subtle', text: 'text-category-streaming' },
  other: { icon: 'tag', label: 'Other', bg: 'bg-category-other-subtle', text: 'text-category-other' },
};

const getCategoryStyle = (category: ContractCategory): CategoryStyle =>
  categoryStyles[category] ?? categoryStyles.other;

function CategoryBadge({ category }: { category: ContractCategory }) {
  const style = getCategoryStyle(category);
  return (
    <div className={`w-11 h-11 rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}>
      <Icon name={style.icon} size={22} className={style.text} />
      <span className="sr-only">{style.label}</span>
    </div>
  );
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(dateString),
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-card border border-border ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type DetailTab = 'details' | 'shares' | 'activity';

function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [tab, setTab] = useState<DetailTab>('details');

  useEffect(() => {
    contractsApi
      .list()
      .then((res) => setContracts(res.data))
      .catch(() => setError('Failed to load contracts'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">Loading contracts…</p>;
  }

  if (error) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Contracts</h2>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-btn bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Icon name="list" size={16} className="text-white" />
          Add contract
        </button>
      </div>

      {contracts.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted">No contracts yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {contracts.map((contract, index) => (
            <button
              key={contract.id}
              type="button"
              onClick={() => {
                setSelected(contract);
                setTab('details');
              }}
              className={`w-full p-4 flex items-center gap-4 text-left transition-colors duration-150 hover:bg-muted/5 ${
                index < contracts.length - 1 ? 'border-b border-border' : ''
              } ${selected?.id === contract.id ? 'bg-primary-subtle/40' : ''}`}
            >
              <CategoryBadge category={contract.category} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text truncate">{contract.name}</p>
                <p className="text-sm text-muted">{contract.provider}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-medium text-text">
                  {formatCurrency(contract.cost, contract.currency)}
                </p>
                <p className="text-xs text-muted">Renews {formatDate(contract.renewal_date)}</p>
              </div>
            </button>
          ))}
        </Card>
      )}

      {selected && (
        <ContractDetail contract={selected} tab={tab} onTabChange={setTab} />
      )}
    </div>
  );
}

function ContractDetail({
  contract,
  tab,
  onTabChange,
}: {
  contract: Contract;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex border-b border-border">
        {(['details', 'shares', 'activity'] as DetailTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'details' && <DetailTab contract={contract} />}
        {tab === 'shares' && <SharesTab contractId={contract.id} />}
        {tab === 'activity' && <ActivityTab contractId={contract.id} />}
      </div>
    </Card>
  );
}

function DetailTab({ contract }: { contract: Contract }) {
  const rows: Array<[string, string]> = [
    ['Provider', contract.provider],
    ['Category', getCategoryStyle(contract.category).label],
    ['Start date', formatDate(contract.start_date)],
    ['Renewal date', formatDate(contract.renewal_date)],
    ['Cancellation deadline', contract.cancellation_deadline ? formatDate(contract.cancellation_deadline) : '—'],
    ['Billing', contract.billing_frequency],
    ['Cost', formatCurrency(contract.cost, contract.currency)],
  ];
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="text-sm font-medium text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SharesTab({ contractId }: { contractId: string }) {
  const [shares, setShares] = useState<ContractShare[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => contractsApi.listShares(contractId).then(setShares).catch(() => setMessage('Failed to load shares'));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const grant = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await contractsApi.createShare(contractId, email.trim());
      setEmail('');
      await load();
    } catch {
      setMessage('Failed to grant access');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (shareId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await contractsApi.revokeShare(contractId, shareId);
      await load();
    } catch {
      setMessage('Failed to revoke access');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@example.com"
          className="flex-1 rounded-btn border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
          aria-label="Grantee email"
        />
        <button
          type="button"
          onClick={grant}
          disabled={busy || !email.trim()}
          className="rounded-btn bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          Grant
        </button>
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}

      {shares.length === 0 ? (
        <p className="text-sm text-muted">No one else has access yet.</p>
      ) : (
        <ul className="space-y-2">
          {shares.map((share) => (
            <li key={share.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-text">{share.grantee_email}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted">viewer</span>
                <button
                  type="button"
                  onClick={() => revoke(share.id)}
                  className="text-xs text-negative hover:underline"
                >
                  Revoke
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityTab({ contractId }: { contractId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    contractsApi
      .listAudit(contractId)
      .then((res) => setEntries(res.data))
      .catch(() => setMessage('Failed to load activity'));
  }, [contractId]);

  if (message) return <p className="text-sm text-muted">{message}</p>;

  if (entries.length === 0) {
    return <p className="text-sm text-muted">No activity recorded yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        const desc = describeAudit(entry);
        return (
          <li key={entry.id} className="flex items-start gap-3">
            <span className="mt-0.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm text-text">{desc}</p>
              <p className="text-xs text-muted">
                {new Date(entry.created_at).toLocaleString('de-DE')}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function describeAudit(entry: AuditEntry): string {
  switch (entry.action) {
    case 'created':
      return 'Contract created';
    case 'updated':
      if (entry.field && entry.before_value !== undefined && entry.after_value !== undefined) {
        return `Changed ${entry.field} from “${entry.before_value}” to “${entry.after_value}”`;
      }
      return `Updated ${entry.field ?? 'contract'}`;
    case 'soft_deleted':
      return 'Contract deleted';
    case 'hard_deleted':
      return 'Contract permanently deleted';
    case 'shared':
      return `Shared with ${entry.after_value ?? 'another user'}`;
    case 'revoked':
      return `Revoked access for ${entry.before_value ?? 'a user'}`;
    default:
      return entry.action;
  }
}

export default ContractsPage;
