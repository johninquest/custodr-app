import { Injectable } from '@nestjs/common';

import { ConflictException, NotFoundException } from '../shared/errors.js';
import type { PaginationQuery } from '../shared/pagination.js';
import {
  ContractsRepository,
  type AuditRow,
  type ContractRow,
} from './contracts.repository.js';

export interface CreateContractInput {
  name: string;
  category: string;
  provider: string;
  startDate: string;
  renewalDate: string;
  cancellationDeadline?: string | null;
  cost: number;
  currency: string;
  billingFrequency: string;
  notes?: string | null;
}

export interface UpdateContractInput extends CreateContractInput {
  status: string;
}

/** Fields compared when recording an update in the audit log. */
const AUDITED_FIELDS = [
  'name',
  'category',
  'provider',
  'startDate',
  'renewalDate',
  'cancellationDeadline',
  'cost',
  'currency',
  'billingFrequency',
  'status',
  'notes',
] as const;

@Injectable()
export class ContractsService {
  constructor(private readonly repo: ContractsRepository) {}

  async list(
    userId: string,
    email: string,
    filters: { status?: string; category?: string },
    page: PaginationQuery,
  ) {
    return this.repo.listVisible(
      userId,
      email,
      filters,
      page.page,
      page.limit,
    );
  }

  async create(
    userId: string,
    input: CreateContractInput,
  ): Promise<ContractRow> {
    const contract = await this.repo.create(userId, input);

    await this.repo.createAudit({
      entityType: 'contract',
      entityId: contract.id,
      actorUserId: userId,
      action: 'created',
    });

    return contract;
  }

  async findOne(
    id: string,
    userId: string,
    email: string,
  ): Promise<ContractRow> {
    const contract = await this.repo.findVisible(id, userId, email);
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async upcoming(
    userId: string,
    email: string,
    days: number,
    type?: 'renewal' | 'cancellation',
  ): Promise<ContractRow[]> {
    return this.repo.upcoming(userId, email, days, type);
  }

  async update(
    id: string,
    userId: string,
    email: string,
    input: UpdateContractInput,
  ): Promise<ContractRow> {
    const before = await this.repo.findVisible(id, userId, email);
    if (!before) throw new NotFoundException('Contract not found');

    const updated = await this.repo.update(id, input);
    if (!updated) throw new NotFoundException('Contract not found');

    await this.recordFieldChanges(before, updated, userId);
    return updated;
  }

  async remove(id: string, userId: string, email: string): Promise<void> {
    const contract = await this.repo.findVisible(id, userId, email);
    if (!contract) throw new NotFoundException('Contract not found');
    await this.repo.softDelete(id);
  }

  async listAudit(id: string, userId: string, email: string, page: PaginationQuery) {
    const contract = await this.repo.findVisible(id, userId, email);
    if (!contract) throw new NotFoundException('Contract not found');
    return this.repo.listAudit(id, page.page, page.limit);
  }

  async listShares(id: string, userId: string) {
    const contract = await this.repo.findOwned(id, userId);
    if (!contract) throw new NotFoundException('Contract not found');
    return this.repo.listShares(id);
  }

  async createShare(id: string, userId: string, granteeEmail: string) {
    const contract = await this.repo.findOwned(id, userId);
    if (!contract) throw new NotFoundException('Contract not found');

    const existing = await this.repo.findActiveShare(id, granteeEmail);
    if (existing) {
      throw new ConflictException('Share already exists for this email');
    }

    const share = await this.repo.createShare(id, granteeEmail, userId);

    await this.repo.createAudit({
      entityType: 'contract_share',
      entityId: id,
      actorUserId: userId,
      action: 'granted',
      field: 'grantee_email',
      afterValue: granteeEmail,
    });

    return share;
  }

  async revokeShare(id: string, shareId: string, userId: string) {
    const contract = await this.repo.findOwned(id, userId);
    if (!contract) throw new NotFoundException('Contract not found');

    const share = await this.repo.findShareById(shareId, id);
    if (!share) throw new NotFoundException('Share not found');

    await this.repo.revokeShare(shareId);

    await this.repo.createAudit({
      entityType: 'contract_share',
      entityId: id,
      actorUserId: userId,
      action: 'revoked',
      field: 'grantee_email',
      beforeValue: share.granteeEmail,
    });
  }

  /**
   * Record one audit entry per changed field.
   *
   * Mirrors the Go service's field-level diff so the activity feed can show
   * "cost changed from 15.99 to 17.99" rather than a generic "updated".
   */
  private async recordFieldChanges(
    before: ContractRow,
    after: ContractRow,
    actorUserId: string,
  ): Promise<void> {
    for (const field of AUDITED_FIELDS) {
      const b = before[field] ?? null;
      const a = after[field] ?? null;
      if (b === a) continue;

      await this.repo.createAudit({
        entityType: 'contract',
        entityId: after.id,
        actorUserId,
        action: 'updated',
        field,
        beforeValue: b,
        afterValue: a,
      });
    }
  }
}

export type { AuditRow, ContractRow };
