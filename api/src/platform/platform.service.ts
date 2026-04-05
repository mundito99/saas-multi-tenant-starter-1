import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  private normalizeSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async bootstrapSuperAdmin(email: string) {
    const existingConfig = await this.prisma.platformConfig.findUnique({
      where: { id: 'platform' },
    });

    if (existingConfig) {
      throw new BadRequestException('Platform super admin already configured');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('User not found for bootstrap');
    }

    return this.prisma.platformConfig.create({
      data: {
        id: 'platform',
        superAdminUserId: user.id,
      },
      select: {
        id: true,
        superAdminUserId: true,
      },
    });
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        ownerUser: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      memberCount: tenant._count.members,
      ownerUserId: tenant.ownerUserId,
      ownerEmail: tenant.ownerUser?.email ?? null,
    }));
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

  async createTenantWithAdmin(
    actorUserId: string,
    dto: {
      tenantName: string;
      tenantSlug: string;
      adminEmail: string;
    },
  ) {
    const tenantSlug = this.normalizeSlug(dto.tenantSlug);

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (existingTenant) {
      throw new BadRequestException('Tenant slug already in use');
    }

    const adminUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
      select: { id: true, email: true },
    });

    if (!adminUser) {
      throw new BadRequestException('Admin user not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: tenantSlug,
          createdByPlatformUserId: actorUserId,
          ownerUserId: adminUser.id,
        },
      });

      const membership = await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          status: 'ACTIVE',
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'OWNER',
          description: 'Tenant owner',
          isSystem: true,
        },
      });

      await tx.tenantUserRole.create({
        data: {
          tenantUserId: membership.id,
          roleId: ownerRole.id,
        },
      });

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
        },
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          membershipId: membership.id,
          role: ownerRole.name,
        },
      };
    });
  }
}
