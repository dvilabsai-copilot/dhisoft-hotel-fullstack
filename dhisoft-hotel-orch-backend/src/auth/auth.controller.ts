import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../common/public.decorator';
import { tenantIdFrom } from '../common/tenant';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
@ApiTags('auth') @Controller('auth')
export class AuthController { constructor(private service:AuthService){} @Public() @Post('login') login(@Req() req:Request,@Body() dto:LoginDto){ return this.service.login(tenantIdFrom(req),dto.email,dto.password); } }
