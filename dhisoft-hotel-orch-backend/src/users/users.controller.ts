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
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { tenantIdFrom } from '../common/tenant';
import {
  CreateTenantUserDto,
  UpdateTenantUserDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('tenant-users')
@Controller('users')
@Roles(UserRole.TENANT_ADMIN)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@Req() request: Request) {
    return this.service.list(tenantIdFrom(request));
  }

  @Post()
  create(
    @Req() request: Request,
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.service.create(tenantIdFrom(request), dto);
  }

  @Patch(':id')
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    return this.service.update(
      tenantIdFrom(request),
      id,
      dto,
      (request.user as Express.TenantRequestUser).sub,
    );
  }
}
