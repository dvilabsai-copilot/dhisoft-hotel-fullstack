import { RequiresFeature } from '../common/feature.decorator';
import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger'; import { UserRole } from '@prisma/client'; import { Request } from 'express';
import { Public } from '../common/public.decorator'; import { Roles } from '../common/roles.decorator'; import { tenantIdFrom } from '../common/tenant';
import { CreatePageDto,ThemeDto,UpdatePageDto } from './dto/page.dto'; import { WebsiteService } from './website.service';
@ApiTags('website-builder') @RequiresFeature('WEBSITE_BUILDER') @Controller('website') export class WebsiteController {
 constructor(private service:WebsiteService){}
 @Public() @Get('public') publicSite(@Req() req:Request){return this.service.publicSite(tenantIdFrom(req));}
 @Roles(UserRole.TENANT_ADMIN,UserRole.CONTENT_EDITOR) @Get('pages') pages(@Req() req:Request){return this.service.listPages(tenantIdFrom(req));}
 @Roles(UserRole.TENANT_ADMIN,UserRole.CONTENT_EDITOR) @Get('pages/:id') page(@Req() req:Request,@Param('id') id:string){return this.service.getPage(tenantIdFrom(req),id);}
 @Roles(UserRole.TENANT_ADMIN,UserRole.CONTENT_EDITOR) @Post('pages') create(@Req() req:Request,@Body() dto:CreatePageDto){return this.service.createPage(tenantIdFrom(req),dto);}
 @Roles(UserRole.TENANT_ADMIN,UserRole.CONTENT_EDITOR) @Patch('pages/:id') update(@Req() req:Request,@Param('id') id:string,@Body() dto:UpdatePageDto){return this.service.updatePage(tenantIdFrom(req),id,dto,(req.user as any)?.sub);}
 @Roles(UserRole.TENANT_ADMIN,UserRole.CONTENT_EDITOR) @Post('pages/:id/publish') publish(@Req() req:Request,@Param('id') id:string){return this.service.publish(tenantIdFrom(req),id);}
 @Roles(UserRole.TENANT_ADMIN,UserRole.CONTENT_EDITOR) @Get('themes') themes(@Req() req:Request){return this.service.listThemes(tenantIdFrom(req));}
 @Roles(UserRole.TENANT_ADMIN) @Post('themes') theme(@Req() req:Request,@Body() dto:ThemeDto){return this.service.upsertTheme(tenantIdFrom(req),dto);}
}
