import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreatePageDto, ThemeDto, UpdatePageDto } from './dto/page.dto';
import { WebsiteContentValidator } from './website-content.validator';
@Injectable()
export class WebsiteService {
 constructor(private prisma:PrismaService, private validator: WebsiteContentValidator){}
 async publicSite(tenantId:string){
  const [theme,pages,properties,offers]=await Promise.all([
   this.prisma.siteTheme.findFirst({where:{tenantId,active:true}}),
   this.prisma.sitePage.findMany({where:{tenantId,status:'PUBLISHED'},select:{title:true,slug:true,publishedContent:true,seo:true,navigation:true}}),
   this.prisma.property.findMany({where:{tenantId,active:true},include:{roomTypes:{where:{active:true},include:{ratePlans:{where:{active:true}}}}}}),
   this.prisma.offer.findMany({where:{tenantId,active:true}})
  ]); return {theme,pages,properties,offers};
 }
 listPages(tenantId:string){return this.prisma.sitePage.findMany({where:{tenantId},orderBy:{updatedAt:'desc'}})}
 getPage(tenantId:string,id:string){return this.prisma.sitePage.findFirst({where:{tenantId,id},include:{versions:{orderBy:{version:'desc'},take:10}}})}
  createPage(tenantId:string,dto:CreatePageDto){this.validator.validate(dto.draftContent);return this.prisma.sitePage.create({data:{tenantId,title:dto.title,slug:dto.slug,status:'DRAFT',draftContent:dto.draftContent as Prisma.InputJsonValue,seo:dto.seo as Prisma.InputJsonValue,navigation:dto.navigation as Prisma.InputJsonValue,themeId:dto.themeId}})}
 async updatePage(tenantId:string,id:string,dto:UpdatePageDto,userId?:string){
  if(dto.draftContent)this.validator.validate(dto.draftContent); const page=await this.prisma.sitePage.findFirst({where:{id,tenantId}}); if(!page)throw new NotFoundException('Page not found');
  const count=await this.prisma.sitePageVersion.count({where:{pageId:id}});
   await this.prisma.sitePageVersion.create({data:{pageId:id,version:count+1,content:page.draftContent as Prisma.InputJsonValue,createdById:userId}});
   return this.prisma.sitePage.update({where:{id},data:{title:dto.title,draftContent:dto.draftContent as Prisma.InputJsonValue,seo:dto.seo as Prisma.InputJsonValue,navigation:dto.navigation as Prisma.InputJsonValue}});
 }
  async publish(tenantId:string,id:string){const p=await this.prisma.sitePage.findFirst({where:{id,tenantId}});if(!p)throw new NotFoundException('Page not found');if(!p.draftContent)throw new BadRequestException('Draft is empty');this.validator.validate(p.draftContent as Record<string,unknown>);return this.prisma.sitePage.update({where:{id},data:{publishedContent:p.draftContent as Prisma.InputJsonValue,status:'PUBLISHED',publishedAt:new Date()}})}
 listThemes(tenantId:string){return this.prisma.siteTheme.findMany({where:{tenantId}})}
  async upsertTheme(tenantId:string,dto:ThemeDto){if(dto.active)await this.prisma.siteTheme.updateMany({where:{tenantId},data:{active:false}});return this.prisma.siteTheme.upsert({where:{tenantId_key:{tenantId,key:dto.key}},create:{tenantId,name:dto.name,key:dto.key,config:dto.config as Prisma.InputJsonValue,active:dto.active??false},update:{name:dto.name,config:dto.config as Prisma.InputJsonValue,active:dto.active}})}
}
