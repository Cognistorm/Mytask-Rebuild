// Avatars (spec 02 AC-16): `user_profiles.avatar_file_id` → the file's CDN variants. Used by `Me` and the
// profile views; a file that is not ready (or gone) shows no avatar, so clients fall back to initials.
import { Inject, Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { imageVariants } from '../files/image-variants';

type ImageVariants = components['schemas']['ImageVariants'];

@Injectable()
export class AvatarReader {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  async get(fileId: string | null | undefined): Promise<ImageVariants | null> {
    if (!fileId) return null;
    const row = await this.prisma.file.findUnique({ where: { id: fileId } });
    return row ? imageVariants(row, this.env.PUBLIC_MEDIA_BASE_URL) : null;
  }
}
