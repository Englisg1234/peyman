// Feature: cinematic-hero, task 7.2: rendered Nav_Item selection (DEC-01)
// _Requirements: 7.8, 7.9, 12.4_
import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/data/site-config';
import { renderedNavItems } from '@/lib/nav';
import { inlineNavWidth } from '@/lib/nav-metrics';
import type { NavItem } from '@/lib/site-config-schema';

const items: readonly NavItem[] = [
  { id: 'advisory', label: 'Advisory', status: 'planned' },
  { id: 'industries', label: 'Industries', status: 'live', href: '/' },
  { id: 'about', label: 'About', status: 'planned' },
  { id: 'contact', label: 'Contact', status: 'live', href: '#main' },
];

const nav = (showPlanned: boolean) => ({ nav: { ...siteConfig.nav, showPlanned, items } });

describe('renderedNavItems', () => {
  it('returns all six live routes for the shipped config', () => {
    // The default Vitest run has no PEYMAN_CONFIG_FIXTURE, so this is the shipped config.
    expect(siteConfig.fixture).toBeUndefined();
    expect(renderedNavItems(siteConfig).map((i) => i.status === 'live' && i.href)).toEqual([
      '/advisory', '/industries', '/intelligence', '/insights', '/about', '/contact',
    ]);
  });

  it('has a fixed inline label box for every shipped Nav_Item (CLS 0 on font swap)', () => {
    for (const item of siteConfig.nav.items) expect(inlineNavWidth(item.label), item.label).toMatch(/^\d+(\.\d+)?em$/);
    expect(inlineNavWidth('Unknown label')).toBeUndefined();
  });

  it('keeps only live items, in Site_Config order, when showPlanned is false', () => {
    expect(renderedNavItems(nav(false)).map((i) => i.id)).toEqual(['industries', 'contact']);
  });

  it('keeps every item, in Site_Config order, when showPlanned is true', () => {
    expect(renderedNavItems(nav(true)).map((i) => i.id)).toEqual(['advisory', 'industries', 'about', 'contact']);
  });
});
