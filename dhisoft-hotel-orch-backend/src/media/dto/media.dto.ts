import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
export class RegisterMediaDto {
 @IsString() filename!:string; @IsUrl({require_protocol:true}) url!:string; @IsString() mimeType!:string;
 @IsInt() @Min(0) sizeBytes!:number; @IsOptional() @IsString() altText?:string;
}
