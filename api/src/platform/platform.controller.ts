import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('tenants')
  async listTenants() {
    return this.platformService.listTenants();
  }

  @Patch('tenants/:tenantId/status')
  async updateTenantStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: string },
  ) {
    return this.platformService.updateTenantStatus(tenantId, body.status);
  }
}
