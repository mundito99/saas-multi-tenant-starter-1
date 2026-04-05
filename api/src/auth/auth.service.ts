import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/redis/redis.service';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private redis: RedisService,
    ) { }

    private async hashPassword(password: string) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }

    private getAccessTokenExpiresIn(): string | number {
        return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    }

    private getRefreshTokenExpiresIn(): string | number {
        return process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    }

    private durationToSeconds(value: string | number): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        const normalized = String(value).trim().toLowerCase();

        if (/^\d+$/.test(normalized)) {
            return Number(normalized);
        }

        const match = normalized.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error(`Unsupported duration format: ${value}`);
        }

        const amount = Number(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's':
                return amount;
            case 'm':
                return amount * 60;
            case 'h':
                return amount * 60 * 60;
            case 'd':
                return amount * 60 * 60 * 24;
            default:
                throw new Error(`Unsupported duration unit: ${unit}`);
        }
    }

    private async getActiveMembershipWithRoles(userId: string, tenantId: string) {
        return this.prisma.tenantUser.findFirst({
            where: { userId, tenantId, status: 'ACTIVE' },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                grants: { include: { permission: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    private extractRolesAndPermissions(membership: any) {
        const roles = membership.roles.map((ur: any) => ur.role.name);
        const permissions = Array.from(
            new Set(
                membership.roles.flatMap((ur: any) =>
                    ur.role.grants.map((g: any) => g.permission.key),
                ),
            ),
        );

        return { roles, permissions };
    }

    private async signAccessToken(
        userId: string,
        tenantId: string,
        roles: string[],
        permissions: string[],
    ) {
        return this.jwt.signAsync(
            { sub: userId, tenantId, roles, permissions } as any,
            {
                secret: String(process.env.JWT_ACCESS_SECRET),
                expiresIn: this.getAccessTokenExpiresIn(),
            },
        );
    }

    private async signRefreshToken(userId: string, tenantId: string) {
        return this.jwt.signAsync(
            { sub: userId, tenantId, type: 'refresh' } as any,
            {
                secret: String(process.env.JWT_REFRESH_SECRET),
                expiresIn: this.getRefreshTokenExpiresIn(),
            },
        );
    }

    private async storeRefreshToken(
        userId: string,
        tenantId: string,
        refreshToken: string,
    ) {
        const hash = this.hashToken(refreshToken);
        const key = `refresh:${userId}:${tenantId}`;
        const ttlSeconds = this.durationToSeconds(this.getRefreshTokenExpiresIn());

        await this.redis.getClient().set(key, hash, 'EX', ttlSeconds);
    }

    async register(email: string, password: string, tenantName: string, tenantSlug: string) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) throw new BadRequestException('Email already in use');

        const existingSlug = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
        if (existingSlug) throw new BadRequestException('Tenant slug already in use');

        const passwordHash = await this.hashPassword(password);

        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { email, passwordHash },
            });

            const tenant = await tx.tenant.create({
                data: { name: tenantName, slug: tenantSlug },
            });

            const membership = await tx.tenantUser.create({
                data: {
                    tenantId: tenant.id,
                    userId: user.id,
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

            return { user, tenant, membership };
        });

        return {
            userId: result.user.id,
            tenantId: result.tenant.id,
        };
    }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) throw new UnauthorizedException('Invalid credentials');

        return { id: user.id, email: user.email };
    }

    async login(email: string, password: string) {
        const user = await this.validateUser(email, password);

        const memberships = await this.prisma.tenantUser.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { tenant: true },
            orderBy: { createdAt: 'asc' },
        });

        return {
            user,
            tenants: memberships.map((m) => ({
                tenantId: m.tenantId,
                tenantName: m.tenant.name,
                tenantSlug: m.tenant.slug,
            })),
        };
    }

    async selectTenant(userId: string, tenantId: string) {
        const membership = await this.getActiveMembershipWithRoles(userId, tenantId);

        if (!membership) throw new UnauthorizedException('No access to tenant');

        const { roles, permissions } = this.extractRolesAndPermissions(membership);
        const accessToken = await this.signAccessToken(userId, tenantId, roles, permissions);
        const refreshToken = await this.signRefreshToken(userId, tenantId);

        await this.storeRefreshToken(userId, tenantId, refreshToken);

        return { accessToken, refreshToken, roles, permissions };
    }

    async refresh(refreshToken: string) {
        const payload = await this.jwt.verifyAsync(refreshToken, {
            secret: String(process.env.JWT_REFRESH_SECRET),
        });

        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const key = `refresh:${payload.sub}:${payload.tenantId}`;
        const storedHash = await this.redis.getClient().get(key);

        if (!storedHash) throw new UnauthorizedException('Token revoked');

        if (this.hashToken(refreshToken) !== storedHash) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const membership = await this.getActiveMembershipWithRoles(payload.sub, payload.tenantId);

        if (!membership) {
            throw new UnauthorizedException('No access to tenant');
        }

        const { roles, permissions } = this.extractRolesAndPermissions(membership);
        const accessToken = await this.signAccessToken(payload.sub, payload.tenantId, roles, permissions);

        return { accessToken, roles, permissions };
    }

    async logout(userId: string, tenantId: string) {
        const key = `refresh:${userId}:${tenantId}`;
        await this.redis.getClient().del(key);
        return { success: true };
    }

    async getUser(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found');
        return user;
    }

    async getTenant(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new UnauthorizedException('Tenant not found');
        return tenant;
    }

    async inviteUserToTenant(tenantId: string, email: string, roleId?: string) {
        let user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
            const passwordHash = await this.hashPassword(tempPassword);
            user = await this.prisma.user.create({
                data: { email, passwordHash },
            });
        }

        const existingMembership = await this.prisma.tenantUser.findFirst({
            where: { userId: user.id, tenantId },
        });

        if (existingMembership) {
            throw new BadRequestException('User is already a member of this tenant');
        }

        const membership = await this.prisma.tenantUser.create({
            data: {
                tenantId,
                userId: user.id,
                status: 'INVITED',
            },
        });

        if (roleId) {
            const role = await this.prisma.role.findUnique({
                where: { id: roleId },
                select: { id: true, tenantId: true },
            });

            if (!role) throw new BadRequestException('Role not found');
            if (role.tenantId !== tenantId) throw new BadRequestException('Role belongs to another tenant');

            await this.prisma.tenantUserRole.create({
                data: {
                    tenantUserId: membership.id,
                    roleId,
                },
            });
        }

        return {
            userId: user.id,
            email: user.email,
            membershipId: membership.id,
            status: membership.status,
        };
    }

    async listTenantUsers(tenantId: string) {
        const memberships = await this.prisma.tenantUser.findMany({
            where: { tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
                roles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return memberships.map((m) => ({
            membershipId: m.id,
            userId: m.user.id,
            email: m.user.email,
            isActive: m.user.isActive,
            status: m.status,
            roles: m.roles.map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
                description: ur.role.description,
            })),
            createdAt: m.createdAt,
        }));
    }

    async getUserInvitations(userId: string) {
        const memberships = await this.prisma.tenantUser.findMany({
            where: {
                userId,
                status: 'INVITED',
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                roles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return memberships.map((m) => ({
            membershipId: m.id,
            tenantId: m.tenant.id,
            tenantName: m.tenant.name,
            tenantSlug: m.tenant.slug,
            roles: m.roles.map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
                description: ur.role.description,
            })),
            createdAt: m.createdAt,
        }));
    }

    async acceptInvitation(userId: string, membershipId: string) {
        const membership = await this.prisma.tenantUser.findUnique({
            where: { id: membershipId },
            include: { tenant: true },
        });

        if (!membership) throw new BadRequestException('Invitation not found');
        if (membership.userId !== userId) throw new ForbiddenException('Not your invitation');
        if (membership.status !== 'INVITED') throw new BadRequestException('Invitation already processed');

        await this.prisma.tenantUser.update({
            where: { id: membershipId },
            data: { status: 'ACTIVE' },
        });

        return {
            success: true,
            tenantId: membership.tenantId,
            tenantName: membership.tenant.name,
        };
    }

    async declineInvitation(userId: string, membershipId: string) {
        const membership = await this.prisma.tenantUser.findUnique({
            where: { id: membershipId },
        });

        if (!membership) throw new BadRequestException('Invitation not found');
        if (membership.userId !== userId) throw new ForbiddenException('Not your invitation');
        if (membership.status !== 'INVITED') throw new BadRequestException('Invitation already processed');

        await this.prisma.tenantUser.delete({
            where: { id: membershipId },
        });

        return { success: true };
    }
}
