import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConflictException } from '../shared/errors.js';
import type { PaginationQuery } from '../shared/pagination.js';
import { ContractsService } from './contracts.service.js';
import type { AuditRow, ContractRow } from './contracts.repository.js';

/**
 * Contracts service tests — business rules derived from docs/api_spec.md and
 * docs/schema.md, with the repository fully mocked. The audit vocabulary is
 * contract-defined: created | updated | granted | revoked.
 */

const OWNER = { id: 'owner-uuid', email: 'owner@example.com' };
const GRANTEE_EMAIL = 'Wife@Example.com'; // mixed case on purpose

function contractRow(overrides: Partial<ContractRow> = {}): ContractRow {
  return {
    id: 'contract-uuid',
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

const PAGE: PaginationQuery = { page: 1, limit: 20 };

function makeRepo() {
  return {
    listVisible: vi.fn(),
    upcoming: vi.fn(),
    findVisible: vi.fn(),
    findOwned: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    createAudit: vi.fn().mockResolvedValue(undefined),
    listAudit: vi.fn(),
    listShares: vi.fn(),
    findShareById: vi.fn(),
    findActiveShare: vi.fn(),
    createShare: vi.fn(),
    revokeShare: vi.fn(),
  };
}

type Repo = ReturnType<typeof makeRepo>;

describe('ContractsService', () => {
  let repo: Repo;
  let service: ContractsService;

  beforeEach(() => {
    repo = makeRepo();
    service = new ContractsService(repo as never);
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('delegates to listVisible with owner id, email and pagination', async () => {
      repo.listVisible.mockResolvedValue({ rows: [contractRow()], total: 1 });
      const result = await service.list(OWNER.id, OWNER.email, { status: 'active' }, PAGE);
      expect(repo.listVisible).toHaveBeenCalledWith(
        OWNER.id,
        OWNER.email,
        { status: 'active' },
        1,
        20,
      );
      expect(result.total).toBe(1);
    });

    it('passes empty filters through when none are given', async () => {
      repo.listVisible.mockResolvedValue({ rows: [], total: 0 });
      await service.list(OWNER.id, OWNER.email, {}, PAGE);
      expect(repo.listVisible).toHaveBeenCalledWith(
        OWNER.id,
        OWNER.email,
        {},
        1,
        20,
      );
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    const input = {
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
    };

    it('creates the contract and records a `created` audit entry', async () => {
      const created = contractRow();
      repo.create.mockResolvedValue(created);

      const result = await service.create(OWNER.id, input);

      expect(repo.create).toHaveBeenCalledWith(OWNER.id, input);
      expect(repo.createAudit).toHaveBeenCalledTimes(1);
      expect(repo.createAudit).toHaveBeenCalledWith({
        entityType: 'contract',
        entityId: created.id,
        actorUserId: OWNER.id,
        action: 'created',
      });
      expect(result).toEqual(created);
    });

    it('propagates repository failures and writes no audit entry', async () => {
      repo.create.mockRejectedValue(new Error('insert failed'));
      await expect(service.create(OWNER.id, input)).rejects.toThrow('insert failed');
      expect(repo.createAudit).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------
  describe('findOne', () => {
    it('returns the contract when visible to the user', async () => {
      const row = contractRow();
      repo.findVisible.mockResolvedValue(row);
      const result = await service.findOne('contract-uuid', OWNER.id, OWNER.email);
      expect(result).toEqual(row);
      expect(repo.findVisible).toHaveBeenCalledWith('contract-uuid', OWNER.id, OWNER.email);
    });

    it('throws NOT_FOUND (404) when the contract does not exist', async () => {
      repo.findVisible.mockResolvedValue(undefined);
      await expect(
        service.findOne('missing-uuid', OWNER.id, OWNER.email),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
    });

    it('treats a foreign contract as not found — no existence leak', async () => {
      // Visibility model (api_spec.md): owner OR active grantee. Anyone else
      // must get 404, not 403, so unknown IDs cannot be probed.
      repo.findVisible.mockResolvedValue(undefined);
      await expect(
        service.findOne('someone-elses-uuid', 'intruder-uuid', 'intruder@example.com'),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
    });
  });

  // -----------------------------------------------------------------------
  // update + field-level audit diff
  // -----------------------------------------------------------------------
  describe('update', () => {
    const base = contractRow();
    const fullInput = {
      name: base.name,
      category: base.category,
      provider: base.provider,
      startDate: base.startDate,
      renewalDate: base.renewalDate,
      cancellationDeadline: base.cancellationDeadline,
      cost: base.cost,
      currency: base.currency,
      billingFrequency: base.billingFrequency,
      status: base.status,
      notes: base.notes,
    };

    it('returns the updated row when the contract is visible', async () => {
      const after = contractRow({ cost: 17.99, updatedAt: new Date() });
      repo.findVisible.mockResolvedValue(base);
      repo.update.mockResolvedValue(after);

      const result = await service.update('contract-uuid', OWNER.id, OWNER.email, {
        ...fullInput,
        cost: 17.99,
      });

      expect(result).toEqual(after);
      expect(repo.update).toHaveBeenCalledWith('contract-uuid', {
        ...fullInput,
        cost: 17.99,
      });
    });

    it('writes one `updated` audit entry per changed field with before/after values', async () => {
      const after = contractRow({ cost: 17.99, name: 'Netflix Standard' });
      repo.findVisible.mockResolvedValue(base);
      repo.update.mockResolvedValue(after);

      await service.update('contract-uuid', OWNER.id, OWNER.email, {
        ...fullInput,
        cost: 17.99,
        name: 'Netflix Standard',
      });

      const entries = repo.createAudit.mock.calls.map((c) => c[0]);
      expect(entries).toHaveLength(2);
      for (const e of entries) {
        expect(e.action).toBe('updated');
        expect(e.entityType).toBe('contract');
        expect(e.entityId).toBe('contract-uuid');
        expect(e.actorUserId).toBe(OWNER.id);
      }
      expect(entries).toContainEqual(
        expect.objectContaining({
          field: 'cost',
          beforeValue: 15.99,
          afterValue: 17.99,
        }),
      );
      expect(entries).toContainEqual(
        expect.objectContaining({
          field: 'name',
          beforeValue: 'Netflix Premium',
          afterValue: 'Netflix Standard',
        }),
      );
    });

    it('does not write an audit entry for unchanged fields', async () => {
      const after = contractRow({ updatedAt: new Date() }); // identical values
      repo.findVisible.mockResolvedValue(base);
      repo.update.mockResolvedValue(after);

      await service.update('contract-uuid', OWNER.id, OWNER.email, { ...fullInput });
      expect(repo.createAudit).not.toHaveBeenCalled();
    });

    it('audits a status change with its before/after values', async () => {
      const after = contractRow({ status: 'cancelled' });
      repo.findVisible.mockResolvedValue(base);
      repo.update.mockResolvedValue(after);

      await service.update('contract-uuid', OWNER.id, OWNER.email, {
        ...fullInput,
        status: 'cancelled',
      });

      expect(repo.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'status',
          beforeValue: 'active',
          afterValue: 'cancelled',
        }),
      );
    });

    it('treats null-to-value and value-to-null as changes', async () => {
      const after = contractRow({ cancellationDeadline: '2026-12-01', notes: 'hello' });
      repo.findVisible.mockResolvedValue(base); // both null before
      repo.update.mockResolvedValue(after);

      await service.update('contract-uuid', OWNER.id, OWNER.email, { ...fullInput });

      const entries = repo.createAudit.mock.calls.map((c) => c[0]);
      expect(entries).toContainEqual(
        expect.objectContaining({
          field: 'cancellationDeadline',
          beforeValue: null,
          afterValue: '2026-12-01',
        }),
      );
      expect(entries).toContainEqual(
        expect.objectContaining({ field: 'notes', beforeValue: null, afterValue: 'hello' }),
      );
    });

    it('throws NOT_FOUND when the contract is not visible before updating', async () => {
      repo.findVisible.mockResolvedValue(undefined);
      await expect(
        service.update('missing-uuid', OWNER.id, OWNER.email, fullInput),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the row disappears between read and write', async () => {
      repo.findVisible.mockResolvedValue(base);
      repo.update.mockResolvedValue(undefined);
      await expect(
        service.update('contract-uuid', OWNER.id, OWNER.email, fullInput),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
      expect(repo.createAudit).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // remove (soft delete)
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('soft-deletes a visible contract', async () => {
      repo.findVisible.mockResolvedValue(contractRow());
      await expect(
        service.remove('contract-uuid', OWNER.id, OWNER.email),
      ).resolves.toBeUndefined();
      expect(repo.softDelete).toHaveBeenCalledWith('contract-uuid');
    });

    it('throws NOT_FOUND when the contract is not visible', async () => {
      repo.findVisible.mockResolvedValue(undefined);
      await expect(
        service.remove('missing-uuid', OWNER.id, OWNER.email),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // shares — owner-only grant/revoke with 409 / 404 semantics
  // -----------------------------------------------------------------------
  describe('createShare', () => {
    const share = {
      id: 'share-uuid',
      contractId: 'contract-uuid',
      granteeEmail: 'wife@example.com',
      role: 'viewer',
      grantedBy: OWNER.id,
      grantedAt: new Date('2026-09-05T10:00:00Z'),
      revokedAt: null,
    };

    it('grants a share for a contract the user owns', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findActiveShare.mockResolvedValue(undefined);
      repo.createShare.mockResolvedValue(share);

      const result = await service.createShare('contract-uuid', OWNER.id, GRANTEE_EMAIL);

      expect(result).toEqual(share);
    });

    it('records a `granted` audit entry with the grantee email as after_value', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findActiveShare.mockResolvedValue(undefined);
      repo.createShare.mockResolvedValue(share);

      await service.createShare('contract-uuid', OWNER.id, GRANTEE_EMAIL);

      expect(repo.createAudit).toHaveBeenCalledWith({
        entityType: 'contract_share',
        entityId: 'contract-uuid',
        actorUserId: OWNER.id,
        action: 'granted',
        field: 'grantee_email',
        afterValue: GRANTEE_EMAIL,
      });
    });

    it('throws CONFLICT (409) when an active share for the email already exists', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findActiveShare.mockResolvedValue(share);

      await expect(
        service.createShare('contract-uuid', OWNER.id, GRANTEE_EMAIL),
      ).rejects.toMatchObject({ errorCode: 'CONFLICT' });
      expect(repo.createShare).not.toHaveBeenCalled();
      expect(repo.createAudit).not.toHaveBeenCalled();
    });

    it('is owner-only: a non-owner grantee-visible contract yields 404', async () => {
      // findOwned (not findVisible) is the gate — the spec says shares are
      // managed by the owner only.
      repo.findOwned.mockResolvedValue(undefined);
      await expect(
        service.createShare('contract-uuid', 'not-owner-uuid', GRANTEE_EMAIL),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
      expect(repo.findActiveShare).not.toHaveBeenCalled();
    });
  });

  describe('revokeShare', () => {
    const share = {
      id: 'share-uuid',
      contractId: 'contract-uuid',
      granteeEmail: 'wife@example.com',
      role: 'viewer',
      grantedBy: OWNER.id,
      grantedAt: new Date(),
      revokedAt: null,
    };

    it('revokes an existing share', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findShareById.mockResolvedValue(share);

      await expect(
        service.revokeShare('contract-uuid', 'share-uuid', OWNER.id),
      ).resolves.toBeUndefined();
      expect(repo.revokeShare).toHaveBeenCalledWith('share-uuid');
    });

    it('records a `revoked` audit entry with the grantee email as before_value', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findShareById.mockResolvedValue(share);

      await service.revokeShare('contract-uuid', 'share-uuid', OWNER.id);

      expect(repo.createAudit).toHaveBeenCalledWith({
        entityType: 'contract_share',
        entityId: 'contract-uuid',
        actorUserId: OWNER.id,
        action: 'revoked',
        field: 'grantee_email',
        beforeValue: 'wife@example.com',
      });
    });

    it('throws NOT_FOUND (404) when the share does not exist on this contract', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findShareById.mockResolvedValue(undefined);

      await expect(
        service.revokeShare('contract-uuid', 'missing-share', OWNER.id),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
      expect(repo.revokeShare).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the share belongs to a different contract', async () => {
      // findShareById filters on both share id AND contract id.
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findShareById.mockResolvedValue(undefined);

      await expect(
        service.revokeShare('contract-uuid', 'other-contracts-share', OWNER.id),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
    });

    it('is owner-only', async () => {
      repo.findOwned.mockResolvedValue(undefined);
      await expect(
        service.revokeShare('contract-uuid', 'share-uuid', 'not-owner-uuid'),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
      expect(repo.findShareById).not.toHaveBeenCalled();
    });
  });

  describe('listShares', () => {
    it('lists active shares for the owner', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.listShares.mockResolvedValue([]);
      await expect(
        service.listShares('contract-uuid', OWNER.id),
      ).resolves.toEqual([]);
      expect(repo.listShares).toHaveBeenCalledWith('contract-uuid');
    });

    it('is owner-only', async () => {
      repo.findOwned.mockResolvedValue(undefined);
      await expect(service.listShares('contract-uuid', 'not-owner')).rejects.toMatchObject(
        { errorCode: 'NOT_FOUND' },
      );
    });
  });

  // -----------------------------------------------------------------------
  // audit feed
  // -----------------------------------------------------------------------
  describe('listAudit', () => {
    const auditRow: AuditRow = {
      id: 'audit-uuid',
      entity_type: 'contract',
      entity_id: 'contract-uuid',
      actor_user_id: OWNER.id,
      action: 'updated',
      field: 'cost',
      before_value: 15.99,
      after_value: 17.99,
      created_at: new Date('2026-09-05T10:00:00Z'),
    };

    it('returns the paginated activity feed for a visible contract', async () => {
      repo.findVisible.mockResolvedValue(contractRow());
      repo.listAudit.mockResolvedValue({ rows: [auditRow], total: 1 });

      const result = await service.listAudit('contract-uuid', OWNER.id, OWNER.email, PAGE);

      expect(repo.listAudit).toHaveBeenCalledWith('contract-uuid', 1, 20);
      expect(result.rows).toEqual([auditRow]);
    });

    it('is readable by active grantees (findVisible, not findOwned)', async () => {
      repo.findVisible.mockResolvedValue(contractRow());
      repo.listAudit.mockResolvedValue({ rows: [], total: 0 });
      await service.listAudit('contract-uuid', 'grantee-uuid', 'wife@example.com', PAGE);
      expect(repo.findVisible).toHaveBeenCalledWith('contract-uuid', 'grantee-uuid', 'wife@example.com');
    });

    it('throws NOT_FOUND for an invisible contract', async () => {
      repo.findVisible.mockResolvedValue(undefined);
      await expect(
        service.listAudit('missing-uuid', OWNER.id, OWNER.email, PAGE),
      ).rejects.toMatchObject({ errorCode: 'NOT_FOUND' });
      expect(repo.listAudit).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // upcoming
  // -----------------------------------------------------------------------
  describe('upcoming', () => {
    it('delegates days and type filters to the repository', async () => {
      repo.upcoming.mockResolvedValue([]);
      await service.upcoming(OWNER.id, OWNER.email, 90, 'renewal');
      expect(repo.upcoming).toHaveBeenCalledWith(OWNER.id, OWNER.email, 90, 'renewal');
    });

    it('passes an undefined type through (both deadline kinds)', async () => {
      repo.upcoming.mockResolvedValue([]);
      await service.upcoming(OWNER.id, OWNER.email, 30, undefined);
      expect(repo.upcoming).toHaveBeenCalledWith(OWNER.id, OWNER.email, 30, undefined);
    });
  });

  describe('ConflictException and NotFoundException vocabulary', () => {
    it('share conflict message names the duplicate email cause', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findActiveShare.mockResolvedValue({
        id: 'existing',
        contractId: 'contract-uuid',
        granteeEmail: 'wife@example.com',
      });

      await expect(
        service.createShare('contract-uuid', OWNER.id, GRANTEE_EMAIL),
      ).rejects.toThrow(/already exists/i);
    });

    it('missing contract message is exactly "Contract not found"', async () => {
      repo.findVisible.mockResolvedValue(undefined);
      await expect(service.findOne('x', OWNER.id, OWNER.email)).rejects.toThrow(
        'Contract not found',
      );
    });

    it('missing share message is exactly "Share not found"', async () => {
      repo.findOwned.mockResolvedValue(contractRow());
      repo.findShareById.mockResolvedValue(undefined);
      await expect(
        service.revokeShare('contract-uuid', 'missing', OWNER.id),
      ).rejects.toThrow('Share not found');
    });

    it('ConflictException is not used where NotFound belongs', async () => {
      repo.findOwned.mockResolvedValue(undefined);
      // Guard against a regression where "not owner" leaks as 409.
      await expect(
        service.revokeShare('contract-uuid', 'share', 'not-owner'),
      ).rejects.not.toBeInstanceOf(ConflictException);
    });
  });
});
