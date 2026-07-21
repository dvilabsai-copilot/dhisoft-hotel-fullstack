import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformUserRole } from '@prisma/client';
import { Request } from 'express';
import { PlatformProtected } from '../common/platform-protected.decorator';
import {
  UpsertProviderDto,
  UpsertTenantCredentialDto,
} from './dto/platform-integration.dto';
import { PlatformIntegrationsService } from './platform-integrations.service';

@ApiTags('platform-integrations')
@Controller('platform/integrations')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformIntegrationsController {
  constructor(
    private readonly service: PlatformIntegrationsService,
  ) {}

  @Get('providers')
  providers() {
    return this.service.providers();
  }

  @Post('providers')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  upsertProvider(
    @Req() request: Request,
    @Body() dto: UpsertProviderDto,
  ) {
    return this.service.upsertProvider(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Get('credentials')
  credentials(@Query('tenantId') tenantId?: string) {
    return this.service.credentials(tenantId);
  }

  @Post('credentials')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  upsertCredential(
    @Req() request: Request,
    @Body() dto: UpsertTenantCredentialDto,
  ) {
    return this.service.upsertCredential(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post('credentials/:id/test')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.SUPPORT_ADMIN,
  )
  test(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    return this.service.testCredential(
      id,
      request.user as Express.PlatformRequestUser,
    );
  }
}
