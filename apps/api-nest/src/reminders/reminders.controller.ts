import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/current-user.decorator.js';
import { DRIZZLE, type Database } from '../db/db.module.js';
import {
  DEFAULT_REMINDER_WINDOWS,
  REMINDER_STATUSES,
  REMINDER_WINDOW_OPTIONS,
} from '../db/schema/enums.js';
import { contracts, reminderPreferences, reminders } from '../db/schema/index.js';
import { Inject } from '@nestjs/common';
import { newId } from '../shared/ids.js';
import { paginated, paginationQuerySchema } from '../shared/pagination.js';

const preferencesSchema = z.object({
  reminder_windows: z
    .array(z.number().int().refine((v) => REMINDER_WINDOW_OPTIONS.includes(v as never), {
      message: `must be one of ${REMINDER_WINDOW_OPTIONS.join(', ')}`,
    }))
    .default([...DEFAULT_REMINDER_WINDOWS]),
  email_enabled: z.boolean().default(true),
  timezone: z.string().min(1).default('Europe/Berlin'),
});

const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(REMINDER_STATUSES).optional(),
});

@ApiTags('reminders')
@Controller('reminders')
@UseGuards(AuthGuard)
export class RemindersController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query({ schema: listQuerySchema })
    query: z.infer<typeof listQuerySchema>,
  ) {
    const conditions = [eq(contracts.userId, user.id)];
    if (query.status) conditions.push(eq(reminders.status, query.status));

    const rows = await this.db
      .select({
        id: reminders.id,
        contract_id: reminders.contractId,
        contract_name: contracts.name,
        reminder_type: reminders.reminderType,
        scheduled_date: reminders.scheduledDate,
        sent_at: reminders.sentAt,
        status: reminders.status,
        days_before: reminders.daysBefore,
      })
      .from(reminders)
      .innerJoin(contracts, eq(contracts.id, reminders.contractId))
      .where(and(...conditions))
      .orderBy(desc(reminders.scheduledDate))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    // Total is computed over the same filter so the envelope stays accurate.
    const all = await this.db
      .select({ id: reminders.id })
      .from(reminders)
      .innerJoin(contracts, eq(contracts.id, reminders.contractId))
      .where(and(...conditions));

    return paginated(rows, query.page, query.limit, all.length);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: CurrentUserPayload) {
    const prefs = await this.loadPreferences(user.id);
    return {
      reminder_windows: prefs?.reminderWindows ?? DEFAULT_REMINDER_WINDOWS,
      email_enabled: prefs?.emailEnabled ?? true,
      timezone: prefs?.timezone ?? 'Europe/Berlin',
    };
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: CurrentUserPayload,
    @Body({ schema: preferencesSchema })
    body: z.infer<typeof preferencesSchema>,
  ) {
    const existing = await this.loadPreferences(user.id);

    if (!existing) {
      await this.db.insert(reminderPreferences).values({
        id: newId(),
        userId: user.id,
        reminderWindows: body.reminder_windows,
        emailEnabled: body.email_enabled,
        timezone: body.timezone,
      });
    } else {
      await this.db
        .update(reminderPreferences)
        .set({
          reminderWindows: body.reminder_windows,
          emailEnabled: body.email_enabled,
          timezone: body.timezone,
          updatedAt: new Date(),
        })
        .where(eq(reminderPreferences.userId, user.id));
    }

    return {
      reminder_windows: body.reminder_windows,
      email_enabled: body.email_enabled,
      timezone: body.timezone,
    };
  }

  private async loadPreferences(userId: string) {
    const [row] = await this.db
      .select()
      .from(reminderPreferences)
      .where(eq(reminderPreferences.userId, userId))
      .limit(1);
    return row;
  }
}
