import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client'; import { PrismaService } from '../common/prisma.service'; import { CreateHoldDto, ManualReservationDto } from './dto/reservation.dto'; import { AxisRoomsService } from '../axisrooms/axisrooms.service';
const dayMs=86_400_000; const asDate=(s:string)=>new Date(`${s}T00:00:00.000Z`);
@Injectable()
export class ReservationsService {
 constructor(private prisma:PrismaService, private axisRooms:AxisRoomsService){}
 async createHold(tenantId:string,dto:CreateHoldDto,createdById?:string){
  const checkIn=asDate(dto.checkIn),checkOut=asDate(dto.checkOut),nights=Math.round((checkOut.getTime()-checkIn.getTime())/dayMs); if(nights<1)throw new BadRequestException('Invalid stay');
  return this.prisma.$transaction(async (tx:any)=>{
   const property=await tx.property.findFirst({where:{id:dto.propertyId,tenantId,active:true}}); if(!property)throw new NotFoundException('Property not found');
   const plan=await tx.ratePlan.findFirst({where:{id:dto.ratePlanId,tenantId,propertyId:dto.propertyId,roomTypeId:dto.roomTypeId,active:true},include:{roomType:true}}); if(!plan)throw new NotFoundException('Rate plan not found');
   if(dto.adults>plan.roomType.maxAdults || dto.children>plan.roomType.maxChildren || dto.adults+dto.children>plan.roomType.maxOccupancy)throw new BadRequestException('Occupancy exceeds room limits');
   const days=await tx.inventoryDay.findMany({where:{tenantId,ratePlanId:dto.ratePlanId,date:{gte:checkIn,lt:checkOut}},orderBy:{date:'asc'}}); if(days.length!==nights)throw new ConflictException('Inventory incomplete');
   if(days[0].closedToArrival||days[days.length-1].closedToDeparture||days.some((d:any)=>d.stopSell||d.minLengthOfStay>nights||d.availableRooms<dto.quantity))throw new ConflictException('Room is no longer available');
   for(const d of days){const updated=await tx.inventoryDay.updateMany({where:{id:d.id,availableRooms:{gte:dto.quantity},version:d.version},data:{availableRooms:{decrement:dto.quantity},version:{increment:1}}});if(updated.count!==1)throw new ConflictException('Inventory changed; search again');}
   const subtotal=days.reduce((sum:number,d:any)=>sum+Number(d.rate)*dto.quantity,0); const tax=Number(new Prisma.Decimal(subtotal).mul(property.taxPercentage).div(100).toFixed(2)); const total=subtotal+tax;
   const guest=await tx.guest.create({data:{tenantId,firstName:dto.firstName,lastName:dto.lastName,email:dto.email.toLowerCase(),mobile:dto.mobile}});
   const bookingRef=`RW-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
   return tx.reservation.create({data:{tenantId,propertyId:dto.propertyId,guestId:guest.id,bookingRef,status:'HOLD',source:dto.source,roomSubtotal:subtotal,taxTotal:tax,grandTotal:total,balanceTotal:total,holdExpiresAt:new Date(Date.now()+15*60_000),specialRequest:dto.specialRequest,createdById,rooms:{create:{propertyId:dto.propertyId,roomTypeId:dto.roomTypeId,ratePlanId:dto.ratePlanId,checkIn,checkOut,quantity:dto.quantity,adults:dto.adults,children:dto.children,nightlyBreakdown:days.map((d:any)=>({date:d.date,rate:Number(d.rate)})),subtotal}}},include:{guest:true,rooms:{include:{roomType:true,ratePlan:true}},property:true}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 async manual(tenantId:string,dto:ManualReservationDto,userId:string){const r=await this.createHold(tenantId,dto,userId);const confirmed=await this.prisma.reservation.update({where:{id:r.id},data:{status:'CONFIRMED',confirmedAt:new Date(),holdExpiresAt:null,internalNotes:dto.internalNotes,externalSourceRef:dto.externalSourceRef}});await this.axisRooms.enqueueBooking(tenantId,r.id);return confirmed}
 list(tenantId:string){return this.prisma.reservation.findMany({where:{tenantId},include:{guest:true,property:true,rooms:{include:{roomType:true,ratePlan:true}},payments:true,syncJobs:true},orderBy:{createdAt:'desc'},take:100})}
 async get(tenantId:string,id:string){const r=await this.prisma.reservation.findFirst({where:{tenantId,id},include:{guest:true,property:true,rooms:{include:{roomType:true,ratePlan:true}},payments:true,syncJobs:true}});if(!r)throw new NotFoundException('Reservation not found');return r;}
 async confirmPaid(tenantId:string,id:string,paid:number){const r=await this.get(tenantId,id);if(['CANCELLED','EXPIRED','FAILED'].includes(r.status))throw new BadRequestException('Reservation is not payable');if(r.holdExpiresAt&&new Date(r.holdExpiresAt)<new Date()&&r.status==='HOLD')throw new BadRequestException('Reservation hold expired');const newPaid=Number(r.paidTotal)+paid;return this.prisma.reservation.update({where:{id},data:{paidTotal:newPaid,balanceTotal:Math.max(0,Number(r.grandTotal)-newPaid),status:newPaid>=Number(r.grandTotal)?'CONFIRMED':'PENDING_PAYMENT',confirmedAt:newPaid>=Number(r.grandTotal)?new Date():undefined,holdExpiresAt:newPaid>=Number(r.grandTotal)?null:undefined}})}

 async expireHolds(tenantId:string){
  const expired=await this.prisma.reservation.findMany({where:{tenantId,status:'HOLD',holdExpiresAt:{lt:new Date()}},include:{rooms:true},take:100});
  let released=0;
  for(const r of expired){await this.prisma.$transaction(async (tx:any)=>{const claimed=await tx.reservation.updateMany({where:{id:r.id,tenantId,status:'HOLD'},data:{status:'EXPIRED'}});if(claimed.count!==1)return;for(const rr of r.rooms){for(let t=new Date(rr.checkIn).getTime();t<new Date(rr.checkOut).getTime();t+=dayMs){await tx.inventoryDay.updateMany({where:{tenantId,ratePlanId:rr.ratePlanId,date:new Date(t)},data:{availableRooms:{increment:rr.quantity},version:{increment:1}}});}}released++;});}
  return {examined:expired.length,released};
 }
 async cancel(tenantId:string,id:string,reason:string){const r=await this.get(tenantId,id);if(r.status==='CANCELLED')return r;await this.prisma.$transaction(async (tx:any)=>{for(const rr of r.rooms){for(let t=new Date(rr.checkIn).getTime();t<new Date(rr.checkOut).getTime();t+=dayMs){await tx.inventoryDay.updateMany({where:{tenantId,ratePlanId:rr.ratePlanId,date:new Date(t)},data:{availableRooms:{increment:rr.quantity},version:{increment:1}}});}}await tx.reservation.update({where:{id},data:{status:ReservationStatus.CANCELLED,cancelledAt:new Date(),cancellationReason:reason}})});return this.get(tenantId,id);}
 }
