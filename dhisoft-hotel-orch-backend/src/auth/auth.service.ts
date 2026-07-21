import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
@Injectable()
export class AuthService {
  constructor(private prisma:PrismaService, private jwt:JwtService) {}
  async login(tenantId:string,email:string,password:string) {
    const user=await this.prisma.user.findUnique({ where:{ tenantId_email:{tenantId,email:email.toLowerCase()} } });
    if(!user || user.status!=='ACTIVE' || !(await bcrypt.compare(password,user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    const payload={sub:user.id,tenantId:user.tenantId,role:user.role,email:user.email};
    return { accessToken:await this.jwt.signAsync(payload), user:{id:user.id,name:user.name,email:user.email,role:user.role} };
  }
}
