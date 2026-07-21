import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class EncryptionService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: unknown): string {
    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  decrypt<T>(payload: string): T {
    const [version, ivEncoded, tagEncoded, dataEncoded] = payload.split('.');
    if (version !== 'v1' || !ivEncoded || !tagEncoded || !dataEncoded) {
      throw new ServiceUnavailableException('Encrypted integration configuration is malformed');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivEncoded, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataEncoded, 'base64url')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  }

  private key(): Buffer {
    const secret = this.config.get<string>('INTEGRATION_ENCRYPTION_KEY');
    if (!secret || secret.length < 24) {
      throw new ServiceUnavailableException(
        'INTEGRATION_ENCRYPTION_KEY must be configured before storing provider credentials',
      );
    }
    return scryptSync(secret, 'dhisoft-hotel-os-integrations-v1', 32);
  }
}
