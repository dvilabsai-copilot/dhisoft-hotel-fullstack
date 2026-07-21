import { BadRequestException, Injectable } from '@nestjs/common';

const ALLOWED_SECTION_TYPES = new Set([
  'hero', 'booking-search', 'feature-grid', 'featured-properties',
  'rooms', 'gallery', 'offers', 'contact',
]);
const URL_KEY = /(href|url|image|backgroundImage)$/i;

@Injectable()
export class WebsiteContentValidator {
  validate(content: Record<string, unknown>): void {
    const sections = (content as { sections?: unknown }).sections;
    if (!Array.isArray(sections)) throw new BadRequestException('Page content must contain a sections array');
    if (sections.length > 50) throw new BadRequestException('A page cannot contain more than 50 sections');
    const ids = new Set<string>();
    for (const raw of sections) {
      if (!raw || typeof raw !== 'object') throw new BadRequestException('Each section must be an object');
      const section = raw as { id?: unknown; type?: unknown; settings?: unknown };
      if (typeof section.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(section.id)) throw new BadRequestException('Invalid section id');
      if (ids.has(section.id)) throw new BadRequestException(`Duplicate section id: ${section.id}`);
      ids.add(section.id);
      if (typeof section.type !== 'string' || !ALLOWED_SECTION_TYPES.has(section.type)) throw new BadRequestException(`Unsupported section type: ${String(section.type)}`);
      if (!section.settings || typeof section.settings !== 'object' || Array.isArray(section.settings)) throw new BadRequestException(`Section ${section.id} must contain settings`);
      this.inspect(section.settings, `sections.${section.id}.settings`, 0);
    }
  }

  private inspect(value: unknown, path: string, depth: number): void {
    if (depth > 8) throw new BadRequestException(`Website setting nesting is too deep at ${path}`);
    if (typeof value === 'string') {
      if (value.length > 10_000) throw new BadRequestException(`Website setting is too long at ${path}`);
      const key = path.split('.').at(-1) ?? '';
      if (URL_KEY.test(key) && value && !value.startsWith('/') && !/^https:\/\//i.test(value) && !/^http:\/\/localhost(?::\d+)?\//i.test(value)) {
        throw new BadRequestException(`Unsafe URL at ${path}`);
      }
      return;
    }
    if (Array.isArray(value)) {
      if (value.length > 200) throw new BadRequestException(`Too many values at ${path}`);
      value.forEach((item, index) => this.inspect(item, `${path}.${index}`, depth + 1));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (/^(html|script|dangerouslySetInnerHTML)$/i.test(key)) throw new BadRequestException(`Raw executable content is prohibited at ${path}.${key}`);
        this.inspect(child, `${path}.${key}`, depth + 1);
      }
    }
  }
}
