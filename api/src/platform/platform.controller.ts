import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { PlatformService } from './platform.service';
import { BootstrapPlatformDto } from './dto/bootstrap-platform.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post('bootstrap-super-admin')
  async bootstrapSuperAdmin(@Body() dto: BootstrapPlatformDto) {
    return this.platformService.bootstrapSuperAdmin(dto.email);
  }

  @Get('tenants')
  async listTenants() {
    return this.platformService.listTenants();
  }

  @Post('tenants')
  async createTenant(@Req() req: any, @Body() dto: CreateTenantDto) {
    return this.platformService.createTenantWithAdminAndMainBranch(req.user.sub, dto);
  }

  @Post('tenants/:tenantId/branches')
  async createBranch(@Param('tenantId') tenantId: string, @Body() dto: CreateBranchDto) {
    return this.platformService.createBranch(tenantId, dto);
  }

  @Patch('tenants/:tenantId/status')
  async updateTenantStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: string },
  ) {
    return this.platformService.updateTenantStatus(tenantId, body.status);
  }
}
