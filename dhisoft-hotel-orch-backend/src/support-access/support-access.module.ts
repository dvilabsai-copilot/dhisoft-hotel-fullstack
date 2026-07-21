import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformSupportController } from './platform-support.controller';
import { SupportAccessService } from './support-access.service';
import { TenantSupportController } from './tenant-support.controller';

@Module({
  imports: [AuthModule],
  controllers: [PlatformSupportController, TenantSupportController],
  providers: [SupportAccessService],
})
export class SupportAccessModule {}
