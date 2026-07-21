import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformUserRole } from '@prisma/client';
import { PlatformProtected } from '../common/platform-protected.decorator';
import { PlatformHealthService } from './platform-health.service';

@ApiTags('platform-health')
@Controller('platform/system-health')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformHealthController {
  constructor(private readonly service: PlatformHealthService) {}

  @Get()
  status() {
    return this.service.status();
  }
}
