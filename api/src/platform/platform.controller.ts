import { Body, Controller, Get, Patch, Post, Req, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { PlatformService } from './platform.service';
import { BootstrapPlatformDto } from './dto/bootstrap-platform.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';

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
    return this.platformService.createTenantWithAdmin(req.user.sub, dto);
  }

  @Patch('tenants/:tenantId/status')
  async updateTenantStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: string },
  ) {
    return this.platformService.updateTenantStatus(tenantId, body.status);
  }
}
