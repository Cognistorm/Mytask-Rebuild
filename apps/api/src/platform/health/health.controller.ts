// operationId getHealth (contract `/health`): liveness only, no details (architecture §7.11).
import { Controller, Get, Header } from '@nestjs/common';
import type { components } from '@mytask/types';
import { Public } from '../../modules/auth/auth.guard';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @Header('Cache-Control', 'no-store')
  getHealth(): components['schemas']['HealthStatus'] {
    return { status: 'ok' };
  }
}
