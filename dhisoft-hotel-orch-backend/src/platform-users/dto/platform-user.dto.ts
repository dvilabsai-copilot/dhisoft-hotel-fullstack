import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  PlatformUserRole,
  PlatformUserStatus,
} from '@prisma/client';

export class CreatePlatformUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsEnum(PlatformUserRole)
  role!: PlatformUserRole;
}

export class UpdatePlatformUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PlatformUserRole)
  role?: PlatformUserRole;

  @IsOptional()
  @IsEnum(PlatformUserStatus)
  status?: PlatformUserStatus;
}

export class ResetPlatformPasswordDto {
  @IsString()
  @MinLength(12)
  password!: string;
}
