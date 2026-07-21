jest.mock('@prisma/client',()=>({
  PrismaClient: class {},
  Prisma: { Decimal: class { constructor(private value:number){} mul(v:number){this.value*=v;return this} div(v:number){this.value/=v;return this} toFixed(n:number){return this.value.toFixed(n)} } }
}));
import { AvailabilityService } from './availability.service';
describe('AvailabilityService',()=>{it('rejects checkout equal to checkin',async()=>{const service=new AvailabilityService({} as any);await expect(service.search('tenant',{propertyId:'p',checkIn:'2026-07-18',checkOut:'2026-07-18',rooms:1,adults:2,children:0})).rejects.toThrow('Stay must be between 1 and 30 nights');});});
