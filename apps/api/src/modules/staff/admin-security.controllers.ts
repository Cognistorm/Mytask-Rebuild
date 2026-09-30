// Contract: adminListIpBans, adminCreateIpBan, adminDeleteIpBan, adminChangeMyPassword, adminActivateUser,
// adminBanUser (slice 01 part B-2a).
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { IdempotencyService } from '../../platform/idempotency/idempotency.service';
import { CurrentStaff, StaffRoute, type StaffAuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { AdminSecurityService } from './admin-security.service';
import { AdminUsersService } from './admin-users.service';

type S = components['schemas'];

abstract class WithContext {
  constructor(protected readonly ipResolver: ClientIpResolver) {}
  protected ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }
}

@Controller('admin/ip-bans')
export class AdminIpBansController extends WithContext {
  constructor(
    private readonly security: AdminSecurityService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @StaffRoute('security.ip_bans')
  @Get()
  list(@Query('q') q?: string): Promise<S['IpBanPage']> {
    return this.security.listBans(q);
  }

  @StaffRoute('security.ip_bans')
  @Post()
  @HttpCode(201)
  create(
    @Body() body: S['IpBanCreateRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['IpBan']> {
    return this.security.createBan(body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('security.ip_bans')
  @Delete(':ip')
  @HttpCode(204)
  remove(@Param('ip') ip: string, @CurrentStaff() staff: StaffAuthState, @Req() req: Request) {
    return this.security.deleteBan(ip, staff.staffId, this.ctx(req));
  }
}

@Controller('admin/me/password')
export class AdminMyPasswordController extends WithContext {
  constructor(
    private readonly security: AdminSecurityService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @StaffRoute()
  @Post()
  @HttpCode(204)
  change(
    @Body() body: S['AdminMePasswordChangeRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<void> {
    return this.security.changeMyPassword(staff.staffId, staff.sessionId, body, this.ctx(req));
  }
}

@Controller('admin/users')
export class AdminUsersController extends WithContext {
  constructor(
    private readonly users: AdminUsersService,
    private readonly idempotency: IdempotencyService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  /** x-money (the referral credit): Idempotency-Key required (ADR-003 §6). */
  @StaffRoute('users.activate')
  @Post(':userId/activate')
  @HttpCode(200)
  activate(
    @Param('userId') userId: string,
    @Body() body: S['StaffOptionalNoteRequest'],
    @Headers('idempotency-key') key: string | undefined,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AdminUserActionResult']> {
    return this.idempotency.run(
      {
        caller: `staff:${staff.staffId}`,
        operation: 'adminActivateUser',
        key,
        body: { userId, ...body },
        res,
      },
      200,
      () => this.users.activate(userId, staff.staffId, body?.note, this.ctx(req)),
    );
  }

  @StaffRoute('users.ban')
  @Post(':userId/ban')
  @HttpCode(200)
  ban(
    @Param('userId') userId: string,
    @Body() body: S['StaffReasonRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminUserActionResult']> {
    return this.users.ban(userId, staff.staffId, body.reason, this.ctx(req));
  }
}
