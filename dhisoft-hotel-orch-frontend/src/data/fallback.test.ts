import { describe,expect,it } from 'vitest'; import { fallbackSite } from './fallback';
describe('RainWood fallback seed',()=>{it('contains the approved public foundation',()=>{expect(fallbackSite.properties.length).toBeGreaterThan(0);expect(fallbackSite.pages.find(p=>p.slug==='home')?.publishedContent?.sections.map(s=>s.type)).toContain('booking-search')});});
