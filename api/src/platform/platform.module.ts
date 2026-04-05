import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformAdminGuard],
})
export class PlatformModule {}
