import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'; import { EnquiryStatus } from '@prisma/client';
export class CreateEnquiryDto { @IsOptional() @IsString() propertyId?:string; @IsString() type!:string; @IsString() @MaxLength(120) name!:string; @IsEmail() email!:string; @IsOptional() @IsString() phone?:string; @IsString() @MaxLength(5000) message!:string; @IsOptional() @IsString() sourcePage?:string; }
export class UpdateEnquiryStatusDto { @IsEnum(EnquiryStatus) status!:EnquiryStatus; }
