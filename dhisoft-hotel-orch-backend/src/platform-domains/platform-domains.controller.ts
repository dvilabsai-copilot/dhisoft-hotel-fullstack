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
  ActivateDomainDto,
  CreateDomainDto,
} from './dto/platform-domain.dto';
import { PlatformDomainsService } from './platform-domains.service';

@ApiTags('platform-domains')
@Controller('platform/domains')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformDomainsController {
  constructor(private readonly service: PlatformDomainsService) {}

  @Get()
  list(@Query('tenantId') tenantId?: string) {
    return this.service.list(tenantId);
  }

  @Post()
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  create(@Req() request: Request, @Body() dto: CreateDomainDto) {
    return this.service.create(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/verify')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.SUPPORT_ADMIN,
  )
  verify(@Req() request: Request, @Param('id') id: string) {
    return this.service.verify(
      id,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/activate')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  activate(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ActivateDomainDto,
  ) {
    return this.service.activate(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/primary')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  makePrimary(@Req() request: Request, @Param('id') id: string) {
    return this.service.makePrimary(
      id,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/disable')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  disable(@Req() request: Request, @Param('id') id: string) {
    return this.service.disable(
      id,
      request.user as Express.PlatformRequestUser,
    );
  }
}
