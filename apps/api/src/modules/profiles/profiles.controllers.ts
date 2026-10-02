// Contract: getMyProfile, updateMyProfile, putMyAvatar, deleteMyAvatar, getUserProfile (ROADMAP 4.1.8a).
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Put, Req } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { CurrentAuth, OptionalAuth, OptionalUser, type AuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { ProfilesService } from './profiles.service';

type S = components['schemas'];

@Controller()
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  @Get('me/profile')
  getMine(@CurrentAuth() auth: AuthState): Promise<S['MeProfile']> {
    return this.profiles.getMine(auth.userId);
  }

  @Patch('me/profile')
  updateMine(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['MeProfileUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['MeProfile']> {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return this.profiles.updateMine(auth.userId, body, buildContext(req, ip, userAgent));
  }

  @Put('me/avatar')
  putAvatar(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['MeAvatarPutRequest'],
  ): Promise<S['Me']> {
    return this.profiles.putAvatar(auth.userId, body);
  }

  @Delete('me/avatar')
  @HttpCode(204)
  deleteAvatar(@CurrentAuth() auth: AuthState): Promise<void> {
    return this.profiles.deleteAvatar(auth.userId);
  }

  @OptionalUser()
  @Get('users/:username')
  getPublic(
    @Param('username') username: string,
    @OptionalAuth() viewer: AuthState | null,
  ): Promise<S['UserProfile']> {
    return this.profiles.getPublic(username, viewer?.userId ?? null);
  }
}
