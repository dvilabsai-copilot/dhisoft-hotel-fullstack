import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformUserRole } from '@prisma/client';
import { PlatformProtected } from '../common/platform-protected.decorator';
import { PlatformDashboardService } from './platform-dashboard.service';

@ApiTags('platform-dashboard')
@Controller('platform/dashboard')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.BILLING_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformDashboardController {
  constructor(private readonly service: PlatformDashboardService) {}

  @Get()
  dashboard() {
    return this.service.dashboard();
  }
}
