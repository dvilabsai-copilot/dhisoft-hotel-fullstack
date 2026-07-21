import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { tenantIdFrom } from '../common/tenant';
import { SupportDecisionDto } from './dto/support-access.dto';
import { SupportAccessService } from './support-access.service';

@ApiTags('tenant-support-access')
@Controller('support-access')
@Roles(UserRole.TENANT_ADMIN)
export class TenantSupportController {
  constructor(private readonly service: SupportAccessService) {}

  @Get()
  list(@Req() request: Request) {
    return this.service.listTenant(tenantIdFrom(request));
  }

  @Post(':id/approve')
  approve(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: SupportDecisionDto,
  ) {
    return this.service.approve(
      tenantIdFrom(request),
      id,
      (request.user as Express.TenantRequestUser).sub,
      dto,
    );
  }

  @Post(':id/reject')
  reject(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: SupportDecisionDto,
  ) {
    return this.service.reject(
      tenantIdFrom(request),
      id,
      (request.user as Express.TenantRequestUser).sub,
      dto,
    );
  }
}
