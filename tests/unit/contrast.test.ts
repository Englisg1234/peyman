// Feature: cinematic-hero, task 2.7: token consistency (contrast registry)
// _Requirements: 4.1, 12.2_
//
// PALETTE in lib/contrast.ts must mirror the @theme --color-* tokens in
// app/globals.css, and PAIRINGS must contain every Req 12.2 row.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PAIRINGS, PALETTE, type PaletteToken } from '@/lib/contrast';

const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Bodies of every `@theme …{ }` block, brace-matched so nested rules stay inside. */
function themeBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /@theme\b[^{;]*\{/g;
  while (re.exec(source) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
    }
    blocks.push(source.slice(re.lastIndex, i - 1));
    re.lastIndex = i;
  }
  return blocks;
}

/** `--color-<name>: #rrggbb` declarations across all @theme blocks (the `--color-*: initial` reset is skipped). */
function themeColors(): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const block of themeBlocks(css)) {
    for (const [, name, value] of block.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      colors[name] = value.trim().toLowerCase();
    }
  }
  return colors;
}

describe('PALETTE mirrors the @theme color tokens', () => {
  const theme = themeColors();

  it('declares exactly the PALETTE token names', () => {
    expect(Object.keys(theme).sort()).toEqual(Object.keys(PALETTE).sort());
  });

  it.each(Object.entries(PALETTE))('%s has the same hex value', (name, hex) => {
    expect(theme[name]).toBe(hex.toLowerCase());
  });
});

describe('PAIRINGS includes every Req 12.2 row', () => {
  const REQ_12_2: [PaletteToken, PaletteToken, number][] = [
    ['ivory-50', 'ink-950', 17.57],
    ['ivory-50', 'navy-950', 16.77],
    ['ivory-50', 'navy-900', 15.09],
    ['ivory-300', 'ink-950', 9.55],
    ['ivory-300', 'navy-950', 9.11],
    ['ivory-300', 'navy-900', 8.2],
    ['gold-500', 'ink-950', 7.55],
    ['gold-500', 'navy-950', 7.2],
    ['gold-500', 'navy-900', 6.48],
    ['ink-950', 'gold-500', 7.55],
    ['ink-950', 'gold-300', 9.75],
  ];

  it.each(REQ_12_2)('%s on %s at %s:1', (text, surface, expected) => {
    const row = PAIRINGS.find(
      (p) => p.text === text && p.surface === surface && (p.textAlpha ?? 1) === 1 && p.source === 'req-12.2',
    );
    expect(row).toBeDefined();
    expect(row?.kind).toBe('normal');
    expect(row?.expected).toBe(expected);
  });

  it('has no Req 12.2 rows beyond the listed ones', () => {
    expect(PAIRINGS.filter((p) => p.source === 'req-12.2')).toHaveLength(REQ_12_2.length);
  });
});
