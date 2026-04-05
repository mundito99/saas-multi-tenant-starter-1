import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
            roles: {
              include: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant) => {
      const ownerMembership = tenant.members.find((member) =>
        member.roles.some((userRole) => userRole.role.name === 'OWNER'),
      );

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        memberCount: tenant.members.length,
        ownerEmail: ownerMembership?.user.email ?? null,
      };
    });
  }

  async updateTenantStatus(tenantId: string, status: string) {
    if (!Object.values(TenantStatus).includes(status as TenantStatus)) {
      throw new BadRequestException('Invalid tenant status');
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: status as TenantStatus },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        updatedAt: true,
      },
    });
  }
}
