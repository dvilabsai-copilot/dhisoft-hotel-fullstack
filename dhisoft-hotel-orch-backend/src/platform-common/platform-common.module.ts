import { Global, Module } from '@nestjs/common';
import { EncryptionService } from '../common/encryption.service';
import { PlatformAuditService } from './platform-audit.service';

@Global()
@Module({
  providers: [PlatformAuditService, EncryptionService],
  exports: [PlatformAuditService, EncryptionService],
})
export class PlatformCommonModule {}
