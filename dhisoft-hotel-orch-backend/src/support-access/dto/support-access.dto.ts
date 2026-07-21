import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateSupportSessionDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @Min(10)
  reason!: string;

  @IsInt()
  @Min(5)
  @Max(60)
  durationMinutes!: number;

  @IsOptional()
  @IsBoolean()
  requiresTenantApproval?: boolean;
}

export class SupportDecisionDto {
  @IsOptional()
  @IsString()
  note?: string;
}
