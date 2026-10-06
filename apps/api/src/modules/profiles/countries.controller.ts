// Contract: listCountries (D2 `/countries`, spec 16 AC-62): active countries with names in the request language,
// for the account settings country select (spec 02 AC-29, ROADMAP 4.1.20a). Lives here until the catalog module
// of slice 03 arrives; the staff operations (`adminListCountries` …) come with spec 16.
import { Controller, Get, Req } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request } from 'express';
import { PrismaService } from '../../platform/db/prisma.service';
import { resolveLocale } from '../../platform/errors/messages';
import { Public } from '../auth/auth.guard';

type S = components['schemas'];

@Controller('countries')
export class CountriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(@Req() req: Request): Promise<S['CountryList']> {
    const locale = resolveLocale(req.headers['accept-language']);
    const rows = await this.prisma.country.findMany({
      where: { isActive: true },
      select: { iso2: true, nameKa: true, nameEn: true },
    });
    const countries = rows
      .map((r) => ({ code: r.iso2, name: locale === 'ka' ? r.nameKa : r.nameEn }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    return { countries };
  }
}
