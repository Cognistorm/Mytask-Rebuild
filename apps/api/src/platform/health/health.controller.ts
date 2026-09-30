// operationId getHealth (contract `/health`): liveness only, no details (architecture §7.11).
import { Controller, Get, Header } from '@nestjs/common';
import type { components } from '@mytask/types';

@Controller('health')
export class HealthController {
  @Get()
  @Header('Cache-Control', 'no-store')
  getHealth(): components['schemas']['HealthStatus'] {
    return { status: 'ok' };
  }
}
