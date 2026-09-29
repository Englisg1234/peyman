// Feature: cinematic-hero, task 2.7: token consistency (motion tokens)
// _Requirements: 9.3_
//
// Every motion custom property that app/globals.css reads must be emitted by
// toCssVars(). The CSS is scanned as a whole, so new rules added by later
// tasks are covered automatically.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toCssVars } from '@/lib/motion-tokens';

const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Unique motion token names referenced via var(), including inside fallbacks and calc(). */
const referenced = [
  ...new Set([...css.matchAll(/var\(\s*(--(?:dur|delay|ease|dist)-[A-Za-z0-9_-]+)/g)].map((m) => m[1])),
].sort();

describe('motion tokens used in app/globals.css', () => {
  const vars = toCssVars();

  it('references at least one motion token (the scan is live)', () => {
    expect(referenced.length).toBeGreaterThan(0);
  });

  it('every referenced motion token is emitted by toCssVars()', () => {
    const missing = referenced.filter((name) => !(name in vars));
    expect(missing).toEqual([]);
  });
});

describe('toCssVars()', () => {
  const vars = toCssVars();

  it('serializes durations, delays and curves as CSS values', () => {
    expect(vars['--dur-reveal']).toBe('720ms');
    expect(vars['--dur-micro']).toBe('160ms');
    expect(vars['--delay-cta']).toBe('520ms');
    expect(vars['--ease-entrance']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(vars['--ease-state']).toBe('cubic-bezier(0.65, 0, 0.35, 1)');
    expect(vars['--dist-headlineRise']).toBe('12px');
  });

  it('only emits names with a known motion prefix', () => {
    for (const name of Object.keys(vars)) expect(name).toMatch(/^--(dur|delay|ease|dist)-[A-Za-z0-9]+$/);
  });
});
