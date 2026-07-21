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
import { CreateSupportSessionDto } from './dto/support-access.dto';
import { SupportAccessService } from './support-access.service';

@ApiTags('platform-support-access')
@Controller('platform/support-sessions')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformSupportController {
  constructor(private readonly service: SupportAccessService) {}

  @Get()
  list(@Query('tenantId') tenantId?: string) {
    return this.service.listPlatform(tenantId);
  }

  @Post()
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.SUPPORT_ADMIN,
  )
  request(
    @Req() request: Request,
    @Body() dto: CreateSupportSessionDto,
  ) {
    return this.service.request(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/exchange')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.SUPPORT_ADMIN,
  )
  exchange(@Req() request: Request, @Param('id') id: string) {
    return this.service.exchange(
      id,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/revoke')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.SUPPORT_ADMIN,
  )
  revoke(@Req() request: Request, @Param('id') id: string) {
    return this.service.revoke(
      id,
      request.user as Express.PlatformRequestUser,
    );
  }
}
