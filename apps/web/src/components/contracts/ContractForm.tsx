import { useState, type FormEvent, type ReactNode } from 'react';
import axios from 'axios';
import { Icon } from '../ui/Icon';
import { contractsApi } from '../../services/api';
import type { APIError, BillingFrequency, ContractCategory } from '../../types';

const CATEGORY_OPTIONS: Array<{ value: ContractCategory; label: string }> = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'electricity_contract', label: 'Electricity' },
  { value: 'gas_contract', label: 'Gas' },
  { value: 'mobile_contract', label: 'Mobile' },
  { value: 'streaming_subscription', label: 'Streaming' },
  { value: 'other', label: 'Other' },
];

const BILLING_OPTIONS: Array<{ value: BillingFrequency; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Every 6 months' },
  { value: 'annual', label: 'Yearly' },
];

interface FormState {
  name: string;
  category: ContractCategory;
  provider: string;
  start_date: string;
  renewal_date: string;
  cancellation_deadline: string;
  cost: string;
  billing_frequency: BillingFrequency;
  notes: string;
}

const initialState: FormState = {
  name: '',
  category: 'streaming_subscription',
  provider: '',
  start_date: '',
  renewal_date: '',
  cancellation_deadline: '',
  cost: '',
  billing_frequency: 'monthly',
  notes: '',
};

/**
 * Client-side mirror of the API's `createSchema`. The server remains
 * authoritative; these checks exist only for fast feedback.
 */
function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required';
  } else if (form.name.trim().length > 255) {
    errors.name = 'Name must be 255 characters or fewer';
  }

  if (!form.provider.trim()) {
    errors.provider = 'Provider is required';
  } else if (form.provider.trim().length > 255) {
    errors.provider = 'Provider must be 255 characters or fewer';
  }

  if (!form.start_date) {
    errors.start_date = 'Start date is required';
  }

  if (!form.renewal_date) {
    errors.renewal_date = 'Renewal date is required';
  } else if (form.start_date && form.renewal_date <= form.start_date) {
    // ISO YYYY-MM-DD strings compare correctly with lexicographic ordering.
    errors.renewal_date = 'Renewal date must be after the start date';
  }

  if (
    form.cancellation_deadline &&
    form.renewal_date &&
    form.cancellation_deadline >= form.renewal_date
  ) {
    errors.cancellation_deadline =
      'Cancellation deadline must be before the renewal date';
  }

  if (!form.cost.trim()) {
    errors.cost = 'Cost is required';
  } else {
    const amount = Number(form.cost);
    if (Number.isNaN(amount) || amount <= 0) {
      errors.cost = 'Cost must be a positive number';
    }
  }

  if (form.notes.length > 1000) {
    errors.notes = 'Notes must be 1000 characters or fewer';
  }

  return errors;
}

const inputClass = (hasError: boolean): string =>
  `w-full rounded-btn border bg-background px-3 py-2 text-sm text-text focus:outline-none ${
    hasError ? 'border-negative' : 'border-border focus:border-primary'
  }`;

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
}

interface ContractFormProps {
  onCreated: () => void | Promise<void>;
  onCancel: () => void;
}

export function ContractForm({ onCreated, onCancel }: ContractFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors = validate(form);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      await contractsApi.create({
        name: form.name.trim(),
        category: form.category,
        provider: form.provider.trim(),
        start_date: form.start_date,
        renewal_date: form.renewal_date,
        cancellation_deadline: form.cancellation_deadline || undefined,
        // Decimal amount (15.99). The API converts to integer cents.
        cost: Number(form.cost),
        currency: 'EUR',
        billing_frequency: form.billing_frequency,
        notes: form.notes.trim() || undefined,
      });
      await onCreated();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const body = error.response.data as APIError;
        const fieldErrors: Record<string, string> = {};
        for (const detail of body.error?.details ?? []) {
          fieldErrors[detail.field] = detail.message;
        }
        setErrors(fieldErrors);
        setFormError(body.error?.message ?? 'Please correct the highlighted fields');
      } else {
        setFormError('Failed to create contract. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-text">New contract</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close form"
          className="rounded-btn p-1 text-muted hover:text-text"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-negative">
          {formError}
        </p>
      )}

      <Field label="Name" htmlFor="contract-name" error={errors.name}>
        <input
          id="contract-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Netflix Premium"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'contract-name-error' : undefined}
          className={inputClass(Boolean(errors.name))}
        />
      </Field>

      <Field label="Provider" htmlFor="contract-provider" error={errors.provider}>
        <input
          id="contract-provider"
          value={form.provider}
          onChange={(e) => set('provider', e.target.value)}
          placeholder="Netflix"
          aria-invalid={Boolean(errors.provider)}
          aria-describedby={errors.provider ? 'contract-provider-error' : undefined}
          className={inputClass(Boolean(errors.provider))}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="contract-category">
          <select
            id="contract-category"
            value={form.category}
            onChange={(e) => set('category', e.target.value as ContractCategory)}
            className={inputClass(false)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Billing" htmlFor="contract-billing">
          <select
            id="contract-billing"
            value={form.billing_frequency}
            onChange={(e) =>
              set('billing_frequency', e.target.value as BillingFrequency)
            }
            className={inputClass(false)}
          >
            {BILLING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Start date" htmlFor="contract-start" error={errors.start_date}>
          <input
            id="contract-start"
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            aria-invalid={Boolean(errors.start_date)}
            aria-describedby={errors.start_date ? 'contract-start-error' : undefined}
            className={inputClass(Boolean(errors.start_date))}
          />
        </Field>

        <Field label="Renewal date" htmlFor="contract-renewal" error={errors.renewal_date}>
          <input
            id="contract-renewal"
            type="date"
            value={form.renewal_date}
            onChange={(e) => set('renewal_date', e.target.value)}
            aria-invalid={Boolean(errors.renewal_date)}
            aria-describedby={
              errors.renewal_date ? 'contract-renewal-error' : undefined
            }
            className={inputClass(Boolean(errors.renewal_date))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Cancellation deadline"
          htmlFor="contract-cancellation"
          error={errors.cancellation_deadline}
          hint="Optional"
        >
          <input
            id="contract-cancellation"
            type="date"
            value={form.cancellation_deadline}
            onChange={(e) => set('cancellation_deadline', e.target.value)}
            aria-invalid={Boolean(errors.cancellation_deadline)}
            aria-describedby={
              errors.cancellation_deadline
                ? 'contract-cancellation-error'
                : undefined
            }
            className={inputClass(Boolean(errors.cancellation_deadline))}
          />
        </Field>

        <Field
          label="Cost"
          htmlFor="contract-cost"
          error={errors.cost}
          hint="In EUR, e.g. 15.99"
        >
          <input
            id="contract-cost"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.cost}
            onChange={(e) => set('cost', e.target.value)}
            placeholder="15.99"
            aria-invalid={Boolean(errors.cost)}
            aria-describedby={errors.cost ? 'contract-cost-error' : undefined}
            className={inputClass(Boolean(errors.cost))}
          />
        </Field>
      </div>

      <Field label="Notes" htmlFor="contract-notes" error={errors.notes} hint="Optional">
        <textarea
          id="contract-notes"
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? 'contract-notes-error' : undefined}
          className={`${inputClass(Boolean(errors.notes))} resize-y`}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-btn bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save contract'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-btn border border-border px-4 py-2 text-sm font-medium text-text hover:bg-muted/5 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
