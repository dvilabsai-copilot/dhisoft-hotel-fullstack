import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsObject, IsString, Min } from 'class-validator';
import { IntegrationEntityType } from '@prisma/client';
export class MappingDto { @IsEnum(IntegrationEntityType) entityType!:IntegrationEntityType; @IsString() internalId!:string; @IsString() externalId!:string; @IsObject() metadata!:Record<string,unknown>; }
export class InboundInventoryDto {
 @IsString() externalRatePlanId!:string; @IsDateString() date!:string;
 @Type(()=>Number) @IsInt() @Min(0) availableRooms!:number; @Type(()=>Number) @IsNumber() @Min(0) rate!:number;
 @IsBoolean() stopSell!:boolean; @IsBoolean() closedToArrival!:boolean; @IsBoolean() closedToDeparture!:boolean;
 @Type(()=>Number) @IsInt() @Min(1) minLengthOfStay!:number;
}
