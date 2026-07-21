import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { RequiresFeature } from '../common/feature.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { tenantIdFrom } from '../common/tenant';
import {
  CreatePropertyDto,
  CreateRatePlanDto,
  CreateRoomTypeDto,
} from './dto/property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('properties')
@Controller('properties')
@RequiresFeature('HOTEL_CORE')
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Public()
  @Get()
  list(@Req() request: Request) {
    return this.service.list(tenantIdFrom(request));
  }

  @Public()
  @Get(':slug')
  get(@Req() request: Request, @Param('slug') slug: string) {
    return this.service.getBySlug(tenantIdFrom(request), slug);
  }

  @Roles(UserRole.TENANT_ADMIN)
  @Post()
  create(@Req() request: Request, @Body() dto: CreatePropertyDto) {
    return this.service.create(tenantIdFrom(request), dto);
  }

  @Roles(UserRole.TENANT_ADMIN)
  @Post('rooms')
  room(@Req() request: Request, @Body() dto: CreateRoomTypeDto) {
    return this.service.createRoom(tenantIdFrom(request), dto);
  }

  @Roles(UserRole.TENANT_ADMIN)
  @Post('rate-plans')
  rate(@Req() request: Request, @Body() dto: CreateRatePlanDto) {
    return this.service.createRatePlan(tenantIdFrom(request), dto);
  }
}
