import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) throw new ForbiddenException('User context missing');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) throw new ForbiddenException('User not found');

    const platformConfig = await this.prisma.platformConfig.findUnique({
      where: { id: 'platform' },
      select: { superAdminUserId: true },
    });

    if (platformConfig?.superAdminUserId) {
      if (platformConfig.superAdminUserId !== user.id) {
        throw new ForbiddenException('Platform admin access required');
      }

      request.isPlatformAdmin = true;
      return true;
    }

    const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedEmails.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('Platform admin access required');
    }

    request.isPlatformAdmin = true;
    return true;
  }
}
