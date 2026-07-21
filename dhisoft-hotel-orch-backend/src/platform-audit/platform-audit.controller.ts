import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformUserRole } from '@prisma/client';
import { PlatformProtected } from '../common/platform-protected.decorator';
import { PlatformAuditQueryService } from './platform-audit.service';

@ApiTags('platform-audit')
@Controller('platform/audit')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.BILLING_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformAuditController {
  constructor(private readonly service: PlatformAuditQueryService) {}

  @Get()
  list(
    @Query('tenantId') tenantId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('take') take?: string,
  ) {
    return this.service.list({
      tenantId,
      action,
      entityType,
      take: take ? Number(take) : undefined,
    });
  }
}
