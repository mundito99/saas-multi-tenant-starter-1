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
        members: {
          include: {
            user: {
              select: { email: true },
            },
            roles: {
              include: {
                role: { select: { name: true } },
              },
            },
            branches: {
              include: {
                branch: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    isMain: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        branches: {
          orderBy: { createdAt: 'asc' },
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
        branchCount: tenant.branches.length,
        branches: tenant.branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          slug: branch.slug,
          code: branch.code,
          isMain: branch.isMain,
          status: branch.status,
        })),
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

  async createTenantWithAdminAndMainBranch(
    actorUserId: string,
    dto: {
      tenantName: string;
      tenantSlug: string;
      adminEmail: string;
      branchName: string;
      branchSlug?: string;
      branchCode?: string;
    },
  ) {
    const tenantSlug = this.normalizeSlug(dto.tenantSlug);
    const branchSlug = this.normalizeSlug(dto.branchSlug || dto.branchName);

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

      const mainBranch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: dto.branchName,
          slug: branchSlug,
          code: dto.branchCode,
          isMain: true,
          status: 'ACTIVE',
        },
      });

      await tx.tenantUserBranch.create({
        data: {
          tenantUserId: membership.id,
          branchId: mainBranch.id,
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
        },
        mainBranch: {
          id: mainBranch.id,
          name: mainBranch.name,
          slug: mainBranch.slug,
          code: mainBranch.code,
          isMain: mainBranch.isMain,
        },
      };
    });
  }

  async createBranch(
    tenantId: string,
    dto: {
      name: string;
      slug: string;
      code?: string;
    },
  ) {
    const slug = this.normalizeSlug(dto.slug);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const existing = await this.prisma.branch.findFirst({
      where: { tenantId, slug },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Branch slug already in use for tenant');
    }

    return this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        code: dto.code,
        isMain: false,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        code: true,
        isMain: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
