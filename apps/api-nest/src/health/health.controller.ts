import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Liveness probe.
 *
 * Served at the root, outside the `/api/v1` prefix, because the
 * docker-compose healthcheck and the Go API both expect `/health`.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
