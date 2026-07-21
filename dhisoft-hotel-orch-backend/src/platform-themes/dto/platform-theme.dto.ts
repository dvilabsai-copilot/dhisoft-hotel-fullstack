import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ThemeCatalogueStatus } from '@prisma/client';

export class CreateCatalogueThemeDto {
  @IsString()
  key!: string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  config!: Record<string, unknown>;

  @IsObject()
  sectionSchema!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  previewUrl?: string;
}

export class UpdateCatalogueThemeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sectionSchema?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsOptional()
  @IsEnum(ThemeCatalogueStatus)
  status?: ThemeCatalogueStatus;
}

export class AssignThemeDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  catalogueThemeId!: string;
}
