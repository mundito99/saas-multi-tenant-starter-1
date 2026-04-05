import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequirePermission } from 'src/common/decorators/permission.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { TenantGuard } from 'src/common/guards/tenant.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('branch.view')
  findAll(@Req() req: any) {
    return this.branchesService.findAll(req.tenantId);
  }

  @Post()
  @RequirePermission('branch.create')
  create(@Req() req: any, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(req.tenantId, dto);
  }

  @Patch(':branchId')
  @RequirePermission('branch.update')
  update(
    @Req() req: any,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(req.tenantId, branchId, dto);
  }

  @Delete(':branchId')
  @RequirePermission('branch.delete')
  remove(@Req() req: any, @Param('branchId') branchId: string) {
    return this.branchesService.remove(req.tenantId, branchId);
  }
}
