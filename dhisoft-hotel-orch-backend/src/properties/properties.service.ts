import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreatePropertyDto, CreateRatePlanDto, CreateRoomTypeDto } from './dto/property.dto';
@Injectable()
export class PropertiesService {
 constructor(private prisma:PrismaService){}
 list(tenantId:string){return this.prisma.property.findMany({where:{tenantId,active:true},include:{roomTypes:{where:{active:true},include:{ratePlans:{where:{active:true}}}},offers:{where:{active:true}}},orderBy:{name:'asc'}})}
 async getBySlug(tenantId:string,slug:string){const p=await this.prisma.property.findFirst({where:{tenantId,slug,active:true},include:{roomTypes:{where:{active:true},include:{ratePlans:{where:{active:true}}}},offers:{where:{active:true}}}});if(!p)throw new NotFoundException('Property not found');return p;}
 create(tenantId:string,dto:CreatePropertyDto){return this.prisma.property.create({data:{tenantId,...dto} as any})}
 createRoom(tenantId:string,dto:CreateRoomTypeDto){return this.prisma.roomType.create({data:{tenantId,...dto,extraAdultRate:0,extraChildRate:0} as any})}
 createRatePlan(tenantId:string,dto:CreateRatePlanDto){return this.prisma.ratePlan.create({data:{tenantId,...dto} as any})}
}
