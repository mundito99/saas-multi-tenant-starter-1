import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BranchesService {
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

  async findAll(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: [
        { isMain: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        code: true,
        isMain: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(
    tenantId: string,
    dto: {
      name: string;
      slug?: string;
      code?: string;
    },
  ) {
    const slug = this.normalizeSlug(dto.slug || dto.name);

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
        status: BranchStatus.ACTIVE,
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
        updatedAt: true,
      },
    });
  }

  async update(
    tenantId: string,
    branchId: string,
    dto: {
      name?: string;
      slug?: string;
      code?: string;
      status?: BranchStatus;
    },
  ) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const nextSlug = dto.slug
      ? this.normalizeSlug(dto.slug)
      : branch.slug;

    if (nextSlug !== branch.slug) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          tenantId,
          slug: nextSlug,
          id: { not: branchId },
        },
        select: { id: true },
      });

      if (existing) {
        throw new BadRequestException('Branch slug already in use for tenant');
      }
    }

    return this.prisma.branch.update({
      where: { id: branchId },
      data: {
        name: dto.name,
        slug: nextSlug,
        code: dto.code,
        status: dto.status,
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
        updatedAt: true,
      },
    });
  }

  async remove(tenantId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: {
        id: true,
        isMain: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (branch.isMain) {
      throw new BadRequestException('Main branch cannot be deleted');
    }

    await this.prisma.branch.delete({
      where: { id: branchId },
    });

    return { success: true };
  }
}
