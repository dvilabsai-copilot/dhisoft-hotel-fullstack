import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformUserRole } from '@prisma/client';
import { Request } from 'express';
import { PlatformProtected } from '../common/platform-protected.decorator';
import { requestMeta } from '../common/request-meta';
import {
  ChangeTenantStatusDto,
  CreatePlatformTenantDto,
  UpdatePlatformTenantDto,
} from './dto/platform-tenant.dto';
import { PlatformTenantsService } from './platform-tenants.service';

@ApiTags('platform-tenants')
@Controller('platform/tenants')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.BILLING_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformTenantsController {
  constructor(private readonly service: PlatformTenantsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  create(
    @Req() request: Request,
    @Body() dto: CreatePlatformTenantDto,
  ) {
    return this.service.create(
      dto,
      request.user as Express.PlatformRequestUser,
      requestMeta(request),
    );
  }

  @Patch(':id')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformTenantDto,
  ) {
    return this.service.update(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
      requestMeta(request),
    );
  }

  @Post(':id/status')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  changeStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ChangeTenantStatusDto,
  ) {
    return this.service.changeStatus(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
      requestMeta(request),
    );
  }
}
