// operationId getPublicConfig (contract `/config/public`): public, cached with `ETag`, `If-None-Match` → 304.
// Works during maintenance (clients read `system.maintenanceMode` from here).
import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../modules/auth/auth.guard';
import { resolveLocale } from '../errors/messages';
import { PublicConfigService } from './public-config.service';

@Controller('config/public')
export class PublicConfigController {
  constructor(private readonly config: PublicConfigService) {}

  @Public()
  @Get()
  async getPublicConfig(@Req() req: Request, @Res() res: Response): Promise<void> {
    const { body, locale } = await this.config.get(resolveLocale(req.headers['accept-language']));
    const etag = `"${body.version}"`;
    // Clients revalidate every time; staff changes show within the settings cache time (00 AC-6, AC-8).
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Vary', 'Accept-Language');
    res.setHeader('ETag', etag);
    res.setHeader('Content-Language', locale);
    if (matches(req.headers['if-none-match'], etag)) {
      res.status(304).end();
      return;
    }
    res.status(200).json(body);
  }
}

/** RFC 9110 §13.1.2: `*` or any listed tag; weak tags compare by their opaque value. */
function matches(header: string | undefined, etag: string): boolean {
  if (!header) return false;
  return header
    .split(',')
    .map((t) => t.trim().replace(/^W\//, ''))
    .some((t) => t === '*' || t === etag);
}
