import { IsArray, IsBoolean, IsEmail, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
export class CreatePropertyDto {
 @IsString() name!:string; @IsString() slug!:string; @IsString() destination!:string; @IsString() description!:string; @IsString() address!:string;
 @IsEmail() contactEmail!:string; @IsString() phone!:string; @IsOptional() @IsString() timezone?:string; @IsOptional() @IsString() currency?:string;
 @IsNumber() @Min(0) taxPercentage!:number; @IsArray() images!:unknown[]; @IsArray() amenities!:unknown[]; @IsOptional() @IsBoolean() active?:boolean;
}
export class CreateRoomTypeDto {
 @IsString() propertyId!:string; @IsString() name!:string; @IsString() slug!:string; @IsString() description!:string;
 @IsNumber() @Min(1) maxAdults!:number; @IsNumber() @Min(0) maxChildren!:number; @IsNumber() @Min(1) maxOccupancy!:number;
 @IsNumber() @Min(1) baseOccupancy!:number; @IsNumber() @Min(1) inventoryCount!:number; @IsArray() images!:unknown[]; @IsArray() amenities!:unknown[];
}
export class CreateRatePlanDto {
 @IsString() propertyId!:string; @IsString() roomTypeId!:string; @IsString() code!:string; @IsString() name!:string; @IsString() mealPlan!:string;
 @IsNumber() @Min(0) baseRate!:number; @IsObject() cancellationPolicy!:Record<string,unknown>;
}
