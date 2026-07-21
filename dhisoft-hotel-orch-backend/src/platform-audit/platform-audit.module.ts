import { Module } from '@nestjs/common';
import { PlatformAuditController } from './platform-audit.controller';
import { PlatformAuditQueryService } from './platform-audit.service';

@Module({
  controllers: [PlatformAuditController],
  providers: [PlatformAuditQueryService],
})
export class PlatformAuditModule {}
