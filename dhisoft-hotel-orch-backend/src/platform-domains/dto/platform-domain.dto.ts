import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { DomainType } from '@prisma/client';

export class CreateDomainDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  domain!: string;

  @IsEnum(DomainType)
  type!: DomainType;

  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}

export class ActivateDomainDto {
  @IsOptional()
  @IsString()
  sslStatus?: string;
}
