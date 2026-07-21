import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpsertProviderDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  publicConfig?: Record<string, unknown>;
}

export class UpsertTenantCredentialDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  providerId!: string;

  @IsObject()
  credentials!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
