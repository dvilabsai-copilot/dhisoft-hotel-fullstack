import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client'; import { PrismaService } from '../common/prisma.service'; import { AvailabilitySearchDto } from './dto/search.dto';
const dayMs=86_400_000;
function utcDate(s:string){const d=new Date(`${s}T00:00:00.000Z`);if(Number.isNaN(d.getTime()))throw new BadRequestException('Invalid date');return d;}
function dateRange(start:Date,end:Date){const out:Date[]=[];for(let t=start.getTime();t<end.getTime();t+=dayMs)out.push(new Date(t));return out;}
@Injectable()
export class AvailabilityService {
 constructor(private prisma:PrismaService){}
 async search(tenantId:string,dto:AvailabilitySearchDto){
  const checkIn=utcDate(dto.checkIn),checkOut=utcDate(dto.checkOut); const nights=Math.round((checkOut.getTime()-checkIn.getTime())/dayMs);
  if(nights<1 || nights>30)throw new BadRequestException('Stay must be between 1 and 30 nights');
  const dates=dateRange(checkIn,checkOut); const plans=await this.prisma.ratePlan.findMany({where:{tenantId,propertyId:dto.propertyId,active:true,roomType:{active:true,maxOccupancy:{gte:dto.adults+dto.children},maxAdults:{gte:dto.adults},maxChildren:{gte:dto.children}}},include:{roomType:true,inventoryDays:{where:{date:{gte:checkIn,lt:checkOut}},orderBy:{date:'asc'}}}});
  const options=[] as any[];
  for(const plan of plans){const rows=plan.inventoryDays;if(rows.length!==nights)continue;if(rows.some((r:any)=>r.stopSell||r.availableRooms<dto.rooms))continue;if(rows[0].closedToArrival||rows[rows.length-1].closedToDeparture)continue;if(rows.some((r:any)=>r.minLengthOfStay>nights))continue;
   const nightly=rows.map((r:any)=>({date:r.date.toISOString().slice(0,10),rate:Number(r.rate),availableRooms:r.availableRooms}));
   const subtotal=nightly.reduce((s:number,n:any)=>s+n.rate*dto.rooms,0); const property=await this.prisma.property.findUniqueOrThrow({where:{id:dto.propertyId},select:{taxPercentage:true,currency:true}}); const tax=Number(new Prisma.Decimal(subtotal).mul(property.taxPercentage).div(100).toFixed(2));
   options.push({propertyId:dto.propertyId,roomType:plan.roomType,ratePlan:{id:plan.id,code:plan.code,name:plan.name,mealPlan:plan.mealPlan,cancellationPolicy:plan.cancellationPolicy},nights,nightly,subtotal,tax,total:subtotal+tax,currency:property.currency});
  }
  return {query:dto,nights,options};
 }
}
