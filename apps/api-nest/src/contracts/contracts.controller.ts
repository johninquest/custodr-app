import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/current-user.decorator.js';
import {
  BILLING_FREQUENCIES,
  CONTRACT_CATEGORIES,
  CONTRACT_STATUSES,
} from '../db/schema/enums.js';
import { paginated, paginationQuerySchema } from '../shared/pagination.js';
import { ContractsService } from './contracts.service.js';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

const createSchema = z
  .object({
    name: z.string().min(1).max(255),
    category: z.enum(CONTRACT_CATEGORIES),
    provider: z.string().min(1).max(255),
    start_date: dateSchema,
    renewal_date: dateSchema,
    cancellation_deadline: dateSchema.nullish(),
    cost: z.number().positive(),
    currency: z.string().length(3).default('EUR'),
    billing_frequency: z.enum(BILLING_FREQUENCIES),
    notes: z.string().max(1000).nullish(),
  })
  .refine((v) => v.renewal_date > v.start_date, {
    message: 'must be after start_date',
    path: ['renewal_date'],
  })
  .refine(
    (v) =>
      !v.cancellation_deadline || v.cancellation_deadline < v.renewal_date,
    {
      message: 'must be before renewal_date',
      path: ['cancellation_deadline'],
    },
  );

const updateSchema = createSchema.extend({
  status: z.enum(CONTRACT_STATUSES),
});

const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(CONTRACT_STATUSES).optional(),
  category: z.enum(CONTRACT_CATEGORIES).optional(),
});

const idParamSchema = z.string().uuid();

const createShareSchema = z.object({
  grantee_email: z.email(),
});

@ApiTags('contracts')
@Controller('contracts')
@UseGuards(AuthGuard)
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query({ schema: listQuerySchema })
    query: z.infer<typeof listQuerySchema>,
  ) {
    const { rows, total } = await this.contracts.list(
      user.id,
      user.email,
      { status: query.status, category: query.category },
      { page: query.page, limit: query.limit },
    );

    return paginated(
      rows.map(toApiContract),
      query.page,
      query.limit,
      total,
    );
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body({ schema: createSchema }) body: z.infer<typeof createSchema>,
  ) {
    const contract = await this.contracts.create(user.id, {
      name: body.name,
      category: body.category,
      provider: body.provider,
      startDate: body.start_date,
      renewalDate: body.renewal_date,
      cancellationDeadline: body.cancellation_deadline ?? null,
      cost: body.cost,
      currency: body.currency,
      billingFrequency: body.billing_frequency,
      notes: body.notes ?? null,
    });

    return toApiContract(contract);
  }

  /**
   * Declared before `:id` so Nest 12's specificity-based resolution prefers
   * this literal segment over the parameterised route below.
   */
  @Get('upcoming')
  async upcoming() {
    // TODO(phase-3): implement once reminder windows are wired up.
    return { data: [], summary: { total_upcoming: 0, total_cost_monthly: 0, currency: 'EUR' } };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', { schema: idParamSchema }) id: string,
  ) {
    const contract = await this.contracts.findOne(id, user.id, user.email);
    return toApiContract(contract);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: updateSchema }) body: z.infer<typeof updateSchema>,
  ) {
    const contract = await this.contracts.update(id, user.id, user.email, {
      name: body.name,
      category: body.category,
      provider: body.provider,
      startDate: body.start_date,
      renewalDate: body.renewal_date,
      cancellationDeadline: body.cancellation_deadline ?? null,
      cost: body.cost,
      currency: body.currency,
      billingFrequency: body.billing_frequency,
      status: body.status,
      notes: body.notes ?? null,
    });

    return toApiContract(contract);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', { schema: idParamSchema }) id: string,
  ): Promise<void> {
    await this.contracts.remove(id, user.id, user.email);
  }

  @Get(':id/shares')
  async listShares(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', { schema: idParamSchema }) id: string,
  ) {
    const shares = await this.contracts.listShares(id, user.id);
    return {
      data: shares.map((s) => ({
        id: s.id,
        grantee_email: s.granteeEmail,
        role: s.role,
        granted_by: s.grantedBy,
        granted_at: s.grantedAt,
      })),
    };
  }

  @Post(':id/shares')
  async createShare(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: createShareSchema })
    body: z.infer<typeof createShareSchema>,
  ) {
    const share = await this.contracts.createShare(
      id,
      user.id,
      body.grantee_email,
    );

    return {
      id: share.id,
      contract_id: share.contractId,
      grantee_email: share.granteeEmail,
      role: share.role,
      granted_by: share.grantedBy,
      granted_at: share.grantedAt,
    };
  }

  @Delete(':id/shares/:shareId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeShare(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', { schema: idParamSchema }) id: string,
    @Param('shareId', { schema: idParamSchema }) shareId: string,
  ): Promise<void> {
    await this.contracts.revokeShare(id, shareId, user.id);
  }

  @Get(':id/audit')
  async listAudit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', { schema: idParamSchema }) id: string,
    @Query({ schema: paginationQuerySchema })
    query: z.infer<typeof paginationQuerySchema>,
  ) {
    const { rows, total } = await this.contracts.listAudit(
      id,
      user.id,
      user.email,
      { page: query.page, limit: query.limit },
    );

    return paginated(rows, query.page, query.limit, total);
  }
}

/** Map a repository row to the API's snake_case decimal representation. */
function toApiContract(c: {
  id: string;
  name: string;
  category: string;
  provider: string;
  startDate: string;
  renewalDate: string;
  cancellationDeadline: string | null;
  cost: number;
  currency: string;
  billingFrequency: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    provider: c.provider,
    start_date: c.startDate,
    renewal_date: c.renewalDate,
    cancellation_deadline: c.cancellationDeadline,
    cost: c.cost,
    currency: c.currency,
    billing_frequency: c.billingFrequency,
    status: c.status,
    notes: c.notes,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}
