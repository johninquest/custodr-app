import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../shared/errors.js';
import {
  UsersRepository,
  type UserRow,
  normalizeEmail,
} from './users.repository.js';

export interface ConsentRecord {
  id: string;
  consent_type: string;
  version: string;
  granted_at: Date;
  withdrawn_at: Date | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getProfile(userId: string): Promise<UserRow> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** GDPR right to erasure — hard delete, cascading all owned data. */
  async deleteAccount(userId: string): Promise<void> {
    await this.repo.hardDelete(userId);
  }

  async listConsents(userId: string): Promise<ConsentRecord[]> {
    const rows = await this.repo.listConsents(userId);
    return rows.map((r) => ({
      id: r.id,
      consent_type: r.consentType,
      version: r.version,
      granted_at: r.grantedAt,
      withdrawn_at: r.withdrawnAt,
    }));
  }

  async grantConsent(
    userId: string,
    consentType: string,
    version: string,
  ): Promise<ConsentRecord> {
    const row = await this.repo.grantConsent(userId, consentType, version);
    return {
      id: row.id,
      consent_type: row.consentType,
      version: row.version,
      granted_at: row.grantedAt,
      withdrawn_at: row.withdrawnAt,
    };
  }

  async withdrawConsent(userId: string, consentType: string): Promise<void> {
    const active = await this.repo.findActiveConsent(userId, consentType);
    if (!active) {
      throw new NotFoundException('No active consent of this type');
    }
    await this.repo.withdrawConsent(active.id);
  }

  /**
   * Resolve or provision the internal user for an external identity.
   *
   * Mirrors the Go `auth.Service.Login`: auto-provision on first login, and
   * refresh email/verification when they change.
   */
  async resolveByIdentity(
    subjectId: string,
    email: string,
  ): Promise<UserRow> {
    const existing = await this.repo.findByExternalId('firebase', subjectId);

    if (!existing) {
      return this.repo.create({
        externalSubjectId: subjectId,
        email,
        // Firebase has already verified the email by this point.
        emailVerified: true,
      });
    }

    if (
      existing.email !== normalizeEmail(email) ||
      !existing.emailVerified
    ) {
      await this.repo.updateEmail(existing.id, email);
      return { ...existing, email: normalizeEmail(email), emailVerified: true };
    }

    return existing;
  }
}
