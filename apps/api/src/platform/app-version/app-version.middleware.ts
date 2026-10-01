// Mobile version gate (ADR-018, S-130): responses to ios/android carry X-Min-App-Version; an app whose
// X-MyTask-App-Version is lower gets 426 APP_VERSION_UNSUPPORTED. Missing/malformed versions are served.
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ApiException } from '../errors/api-exception';
import { SettingsService } from '../settings/settings.service';

/** Always served, so an outdated app can still show the update screen (ADR-018 §3). */
const EXEMPT = [
  /^\/api\/v1\/health\b/,
  /^\/api\/v1\/config\b/,
  /^\/api\/v1\/i18n\//,
  /^\/api\/v1\/webhooks\//,
];
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function compareVersions(a: string, b: string): number {
  const pa = SEMVER.exec(a)!.slice(1).map(Number);
  const pb = SEMVER.exec(b)!.slice(1).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i]! - pb[i]!;
  return 0;
}

@Injectable()
export class AppVersionMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AppVersion');
  private lastWarnAt = 0;

  constructor(private readonly settings: SettingsService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const client = String(req.headers['x-mytask-client'] ?? '').toLowerCase();
    if (client !== 'ios' && client !== 'android') return next();
    const min = (await this.settings.get('S-130'))[client];
    res.setHeader('X-Min-App-Version', min);
    const url = req.originalUrl.toLowerCase(); // SEC-51
    if (EXEMPT.some((re) => re.test(url))) return next();

    const version = String(req.headers['x-mytask-app-version'] ?? '');
    if (!SEMVER.test(version) || !SEMVER.test(min)) {
      if (version && Date.now() - this.lastWarnAt > 60_000) {
        this.lastWarnAt = Date.now();
        this.logger.warn('malformed X-MyTask-App-Version ignored');
      }
      return next();
    }
    if (compareVersions(version, min) < 0) {
      return next(
        new ApiException(426, 'APP_VERSION_UNSUPPORTED', 't_app_update_required', {
          minVersion: min,
          platform: client,
        }),
      );
    }
    next();
  }
}
