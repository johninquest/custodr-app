import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractsController } from './contracts.controller.js';
import type { ContractRow } from './contracts.repository.js';

/**
 * Controller tests — these pin the wire format from docs/api_spec.md:
 * snake_case fields, decimal cost, days_until_* UTC math, and the upcoming
 * summary envelope. The service is fully mocked; we assert the contract, not
 * the implementation.
 */

const OWNER = { id: 'owner-uuid', email: 'owner@example.com' };

function contractRow(overrides: Partial<ContractRow> = {}): ContractRow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: OWNER.id,
    name: 'Netflix Premium',
    category: 'streaming_subscription',
    provider: 'Netflix',
    startDate: '2026-01-01',
    renewalDate: '2027-01-01',
    cancellationDeadline: null,
    cost: 15.99,
    currency: 'EUR',
    billingFrequency: 'monthly',
    status: 'active',
    notes: null,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

describe('ContractsController', () => {
  let service: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    upcoming: ReturnType<typeof vi.fn>;
    listShares: ReturnType<typeof vi.fn>;
    createShare: ReturnType<typeof vi.fn>;
    revokeShare: ReturnType<typeof vi.fn>;
    listAudit: ReturnType<typeof vi.fn>;
  };
  let controller: ContractsController;

  beforeEach(() => {
    service = {
      list: vi.fn(),
      create: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      upcoming: vi.fn(),
      listShares: vi.fn(),
      createShare: vi.fn(),
      revokeShare: vi.fn(),
      listAudit: vi.fn(),
    };
    controller = new ContractsController(service as never);
  });

  // -----------------------------------------------------------------------
  // GET /contracts — pagination envelope + snake_case mapping
  // -----------------------------------------------------------------------
  describe('GET /contracts (list)', () => {
    it('returns the { data, pagination } envelope with snake_case fields', async () => {
      service.list.mockResolvedValue({
        rows: [contractRow()],
        total: 42,
      });

      const result = await controller.list(
        OWNER,
        { page: 2, limit: 20, status: 'active', category: 'streaming_subscription' },
      );

      expect(service.list).toHaveBeenCalledWith(
        OWNER.id,
        OWNER.email,
        { status: 'active', category: 'streaming_subscription' },
        { page: 2, limit: 20 },
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 42,
        total_pages: 3,
      });

      const item = result.data[0];
      // Wire format is snake_case with decimal cost — never camelCase, never cents.
      expect(item).toMatchObject({
        id: contractRow().id,
        name: 'Netflix Premium',
        category: 'streaming_subscription',
        provider: 'Netflix',
        start_date: '2026-01-01',
        renewal_date: '2027-01-01',
        cancellation_deadline: null,
        cost: 15.99,
        currency: 'EUR',
        billing_frequency: 'monthly',
        status: 'active',
        notes: null,
      });
      // userId must never leak over the wire.
      expect(item).not.toHaveProperty('userId');
      expect(item).not.toHaveProperty('cost_cents');
    });

    it('propagates empty filters when none are provided', async () => {
      service.list.mockResolvedValue({ rows: [], total: 0 });
      const result = await controller.list(OWNER, { page: 1, limit: 20 });
      expect(service.list).toHaveBeenCalledWith(
        OWNER.id,
        OWNER.email,
        { status: undefined, category: undefined },
        { page: 1, limit: 20 },
      );
      expect(result.data).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // POST /contracts
  // -----------------------------------------------------------------------
  describe('POST /contracts (create)', () => {
    const body = {
      name: 'Netflix Premium',
      category: 'streaming_subscription',
      provider: 'Netflix',
      start_date: '2026-01-01',
      renewal_date: '2027-01-01',
      cancellation_deadline: null,
      cost: 15.99,
      currency: 'EUR',
      billing_frequency: 'monthly',
      notes: null,
    } as never;

    it('maps snake_case body to the service input and returns the created contract', async () => {
      service.create.mockResolvedValue(contractRow());

      const result = await controller.create(OWNER, body);

      expect(service.create).toHaveBeenCalledWith(OWNER.id, {
        name: 'Netflix Premium',
        category: 'streaming_subscription',
        provider: 'Netflix',
        startDate: '2026-01-01',
        renewalDate: '2027-01-01',
        cancellationDeadline: null,
        cost: 15.99,
        currency: 'EUR',
        billingFrequency: 'monthly',
        notes: null,
      });
      expect(result).toMatchObject({
        id: contractRow().id,
        start_date: '2026-01-01',
        renewal_date: '2027-01-01',
        cost: 15.99,
      });
    });

    it('defaults cancellation_deadline and notes to null when omitted', async () => {
      service.create.mockResolvedValue(contractRow());
      await controller.create(OWNER, { ...body, cancellation_deadline: undefined, notes: undefined });
      const arg = service.create.mock.calls[0][1];
      expect(arg.cancellationDeadline).toBeNull();
      expect(arg.notes).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // GET /contracts/upcoming — window math, summary, UTC correctness
  // -----------------------------------------------------------------------
  describe('GET /contracts/upcoming', () => {
    it('computes days_until_* from UTC calendar dates, not local time', async () => {
      // Renewal 10 days out, cancellation 5 days out — relative to today UTC.
      const today = new Date();
      const day = (offset: number) =>
        new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) + offset * 86_400_000)
          .toISOString()
          .slice(0, 10);

      service.upcoming.mockResolvedValue([
        contractRow({
          renewalDate: day(10),
          cancellationDeadline: day(5),
        }),
      ]);

      const result = await controller.upcoming(OWNER, { days: 90, type: undefined } as never);

      const item = result.data[0];
      expect(item.days_until_renewal).toBe(10);
      expect(item.days_until_cancellation).toBe(5);
    });

    it('reports negative days for deadlines already past (window includes them via repo)', async () => {
      // If the repo still returns it, the controller must not clamp silently —
      // the frontend needs the sign to render "overdue".
      const today = new Date();
      const past = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - 3 * 86_400_000)
        .toISOString()
        .slice(0, 10);

      service.upcoming.mockResolvedValue([
        contractRow({ renewalDate: past, cancellationDeadline: null }),
      ]);

      const result = await controller.upcoming(OWNER, { days: 90 } as never);
      expect(result.data[0].days_until_renewal).toBe(-3);
    });

    it('returns null days_until_cancellation when no deadline is set', async () => {
      service.upcoming.mockResolvedValue([contractRow({ cancellationDeadline: null })]);
      const result = await controller.upcoming(OWNER, { days: 90 } as never);
      expect(result.data[0].days_until_cancellation).toBeNull();
    });

    it('builds the summary: total_upcoming and EUR currency', async () => {
      service.upcoming.mockResolvedValue([
        contractRow({ billingFrequency: 'monthly', cost: 15.99 }),
        contractRow({ billingFrequency: 'annual', cost: 120 }),
      ]);

      const result = await controller.upcoming(OWNER, { days: 90 } as never);

      expect(result.summary).toMatchObject({
        total_upcoming: 2,
        currency: 'EUR',
      });
      // 15.99/month + 120/12 per month = 15.99 + 10 = 25.99
      expect(result.summary.total_cost_monthly).toBeCloseTo(25.99, 6);
    });

    it('normalises each frequency to a monthly cost before summing', async () => {
      service.upcoming.mockResolvedValue([
        contractRow({ billingFrequency: 'quarterly', cost: 30 }), // 10/mo
        contractRow({ billingFrequency: 'semi_annual', cost: 60 }), // 10/mo
        contractRow({ billingFrequency: 'annual', cost: 240 }), // 20/mo
      ]);

      const result = await controller.upcoming(OWNER, { days: 90 } as never);
      expect(result.summary.total_cost_monthly).toBeCloseTo(40, 6);
    });

    it('returns zeroed summary for an empty window', async () => {
      service.upcoming.mockResolvedValue([]);
      const result = await controller.upcoming(OWNER, { days: 90 } as never);
      expect(result.data).toEqual([]);
      expect(result.summary).toEqual({
        total_upcoming: 0,
        total_cost_monthly: 0,
        currency: 'EUR',
      });
    });

    it('passes the days window and type filter to the service', async () => {
      service.upcoming.mockResolvedValue([]);
      await controller.upcoming(OWNER, { days: 365, type: 'cancellation' } as never);
      expect(service.upcoming).toHaveBeenCalledWith(OWNER.id, OWNER.email, 365, 'cancellation');
    });

    it('includes cost as a decimal (15.99 stays 15.99, not 1599)', async () => {
      service.upcoming.mockResolvedValue([contractRow({ cost: 15.99 })]);
      const result = await controller.upcoming(OWNER, { days: 90 } as never);
      expect(result.data[0].cost).toBe(15.99);
    });
  });

  // -----------------------------------------------------------------------
  // GET /contracts/:id
  // -----------------------------------------------------------------------
  describe('GET /contracts/:id (findOne)', () => {
    it('returns the snake_case representation for a visible contract', async () => {
      service.findOne.mockResolvedValue(contractRow());
      const result = await controller.findOne(OWNER, contractRow().id);
      expect(service.findOne).toHaveBeenCalledWith(contractRow().id, OWNER.id, OWNER.email);
      expect(result).toMatchObject({ id: contractRow().id, cost: 15.99 });
    });
  });

  // -----------------------------------------------------------------------
  // PUT /contracts/:id
  // -----------------------------------------------------------------------
  describe('PUT /contracts/:id (update)', () => {
    it('maps the body including status and returns the updated contract', async () => {
      const updated = contractRow({ status: 'paused' });
      service.update.mockResolvedValue(updated);

      const body = {
        name: 'Netflix Premium',
        category: 'streaming_subscription',
        provider: 'Netflix',
        start_date: '2026-01-01',
        renewal_date: '2027-01-01',
        cancellation_deadline: null,
        cost: 15.99,
        currency: 'EUR',
        billing_frequency: 'monthly',
        status: 'paused',
        notes: null,
      } as never;

      const result = await controller.update(OWNER, updated.id, body);

      expect(service.update).toHaveBeenCalledWith(updated.id, OWNER.id, OWNER.email, {
        name: 'Netflix Premium',
        category: 'streaming_subscription',
        provider: 'Netflix',
        startDate: '2026-01-01',
        renewalDate: '2027-01-01',
        cancellationDeadline: null,
        cost: 15.99,
        currency: 'EUR',
        billingFrequency: 'monthly',
        status: 'paused',
        notes: null,
      });
      expect(result.status).toBe('paused');
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /contracts/:id
  // -----------------------------------------------------------------------
  describe('DELETE /contracts/:id (remove)', () => {
    it('delegates the soft delete to the service', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove(OWNER, 'some-uuid')).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('some-uuid', OWNER.id, OWNER.email);
    });
  });

  // -----------------------------------------------------------------------
  // shares endpoints
  // -----------------------------------------------------------------------
  describe('POST /contracts/:id/shares (createShare)', () => {
    it('returns the share in the documented wire shape', async () => {
      const grantedAt = new Date('2026-09-05T10:00:00Z');
      service.createShare.mockResolvedValue({
        id: 'share-uuid',
        contractId: 'contract-uuid',
        granteeEmail: 'wife@example.com',
        role: 'viewer',
        grantedBy: OWNER.id,
        grantedAt,
        revokedAt: null,
      });

      const result = await controller.createShare(OWNER, 'contract-uuid', {
        grantee_email: 'wife@example.com',
      } as never);

      expect(service.createShare).toHaveBeenCalledWith(
        'contract-uuid',
        OWNER.id,
        'wife@example.com',
      );
      expect(result).toEqual({
        id: 'share-uuid',
        contract_id: 'contract-uuid',
        grantee_email: 'wife@example.com',
        role: 'viewer',
        granted_by: OWNER.id,
        granted_at: grantedAt,
      });
    });
  });

  describe('GET /contracts/:id/shares (listShares)', () => {
    it('wraps active shares in { data } with snake_case fields', async () => {
      const grantedAt = new Date('2026-09-05T10:00:00Z');
      service.listShares.mockResolvedValue([
        {
          id: 'share-uuid',
          contractId: 'contract-uuid',
          granteeEmail: 'wife@example.com',
          role: 'viewer',
          grantedBy: OWNER.id,
          grantedAt,
          revokedAt: null,
        },
      ]);

      const result = await controller.listShares(OWNER, 'contract-uuid');

      expect(result).toEqual({
        data: [
          {
            id: 'share-uuid',
            grantee_email: 'wife@example.com',
            role: 'viewer',
            granted_by: OWNER.id,
            granted_at: grantedAt,
          },
        ],
      });
    });

    it('returns an empty data array when there are no shares', async () => {
      service.listShares.mockResolvedValue([]);
      const result = await controller.listShares(OWNER, 'contract-uuid');
      expect(result.data).toEqual([]);
    });
  });

  describe('DELETE /contracts/:id/shares/:shareId (revokeShare)', () => {
    it('delegates the revoke to the service', async () => {
      service.revokeShare.mockResolvedValue(undefined);
      await expect(
        controller.revokeShare(OWNER, 'contract-uuid', 'share-uuid'),
      ).resolves.toBeUndefined();
      expect(service.revokeShare).toHaveBeenCalledWith('contract-uuid', 'share-uuid', OWNER.id);
    });
  });

  // -----------------------------------------------------------------------
  // GET /contracts/:id/audit
  // -----------------------------------------------------------------------
  describe('GET /contracts/:id/audit (listAudit)', () => {
    it('returns the paginated audit feed in the documented shape', async () => {
      service.listAudit.mockResolvedValue({
        rows: [
          {
            id: 'audit-uuid',
            entity_type: 'contract',
            entity_id: 'contract-uuid',
            actor_user_id: OWNER.id,
            action: 'updated',
            field: 'cost',
            before_value: 15.99,
            after_value: 17.99,
            created_at: new Date('2026-09-05T10:00:00Z'),
          },
        ],
        total: 1,
      });

      const result = await controller.listAudit(OWNER, 'contract-uuid', { page: 1, limit: 20 });

      expect(service.listAudit).toHaveBeenCalledWith(
        'contract-uuid',
        OWNER.id,
        OWNER.email,
        { page: 1, limit: 20 },
      );
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, total_pages: 1 });
      expect(result.data[0]).toMatchObject({
        action: 'updated',
        field: 'cost',
        before_value: 15.99,
        after_value: 17.99,
      });
    });
  });
});
