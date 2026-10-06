// `category_image` files are shown by gig categories (icon, image) and project categories (image). One check of both
// tables, so a file is never shown twice and never deleted while either shows it (4.2.7b, 4.2.8).
import type { PrismaService } from '../../platform/db/prisma.service';

export async function categoryImageInUse(
  prisma: PrismaService,
  fileId: string,
  except: { gigCategoryId?: string; projectCategoryId?: string } = {},
): Promise<boolean> {
  const [gig, project] = await Promise.all([
    prisma.gigCategory.count({
      where: {
        OR: [{ iconFileId: fileId }, { imageFileId: fileId }],
        ...(except.gigCategoryId ? { id: { not: except.gigCategoryId } } : {}),
      },
    }),
    prisma.projectCategory.count({
      where: {
        imageFileId: fileId,
        ...(except.projectCategoryId ? { id: { not: except.projectCategoryId } } : {}),
      },
    }),
  ]);
  return gig + project > 0;
}
