import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger'; import { UserRole } from '@prisma/client'; import { Request } from 'express';
import { Public } from '../common/public.decorator'; import { Roles } from '../common/roles.decorator'; import { tenantIdFrom } from '../common/tenant';
import { CreatePropertyDto,CreateRatePlanDto,CreateRoomTypeDto } from './dto/property.dto'; import { PropertiesService } from './properties.service';
@ApiTags('properties') @Controller('properties') export class PropertiesController {
 constructor(private service:PropertiesService){}
 @Public() @Get() list(@Req() req:Request){return this.service.list(tenantIdFrom(req));}
 @Public() @Get(':slug') get(@Req() req:Request,@Param('slug') slug:string){return this.service.getBySlug(tenantIdFrom(req),slug);}
 @Roles(UserRole.TENANT_ADMIN) @Post() create(@Req() req:Request,@Body() dto:CreatePropertyDto){return this.service.create(tenantIdFrom(req),dto);}
 @Roles(UserRole.TENANT_ADMIN) @Post('rooms') room(@Req() req:Request,@Body() dto:CreateRoomTypeDto){return this.service.createRoom(tenantIdFrom(req),dto);}
 @Roles(UserRole.TENANT_ADMIN) @Post('rate-plans') rate(@Req() req:Request,@Body() dto:CreateRatePlanDto){return this.service.createRatePlan(tenantIdFrom(req),dto);}
}
