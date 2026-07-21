import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator'; import { PaymentMethod } from '@prisma/client';
export class CheckoutDto { @IsString() reservationId!:string; @IsNumber() @Min(1) amount!:number; @IsString() idempotencyKey!:string; }
export class ManualPaymentDto { @IsString() reservationId!:string; @IsNumber() @Min(0.01) amount!:number; @IsEnum(PaymentMethod) method!:PaymentMethod; @IsString() reference!:string; @IsOptional() @IsString() proofUrl?:string; @IsOptional() @IsString() notes?:string; }
export class MockWebhookDto { @IsString() paymentId!:string; @IsString() providerEventId!:string; @IsIn(['PAID','FAILED']) status!:string; }
