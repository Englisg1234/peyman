// Feature: cinematic-hero, Property 13: Low_Power_Mode classification
// **Validates: Requirements 9.12**
//
// For any combination of saveData, deviceMemory, hardwareConcurrency (each
// possibly undefined) and hidden, isLowPower equals
//   saveData === true ∨ deviceMemory ≤ 4 ∨ hardwareConcurrency ≤ 4 ∨ hidden,
// with undefined signals contributing false. Also covers readSignals on
// arbitrary navigator/document shapes: malformed signals are unavailable and
// therefore contribute false.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  isLowPower,
  readSignals,
  type CapabilitySignals,
  type DocumentSignals,
  type NavigatorSignals,
} from '@/lib/capability';

const LIMIT = 4;

/** The Glossary definition, written independently of the implementation. */
function expected(s: CapabilitySignals): boolean {
  return (
    s.saveData === true ||
    (s.deviceMemory !== undefined && s.deviceMemory <= LIMIT) ||
    (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= LIMIT) ||
    s.hidden
  );
}

/** deviceMemory as browsers report it, plus arbitrary positive values and the 4 GiB boundary. */
const deviceMemoryArb = fc.oneof(
  fc.constantFrom(0.25, 0.5, 1, 2, 4, 8),
  fc.double({ min: 0.01, max: 64, noNaN: true }),
);

/** hardwareConcurrency as core counts, weighted around the 4-core boundary. */
const coresArb = fc.oneof(fc.integer({ min: 1, max: 8 }), fc.integer({ min: 1, max: 128 }));

const maybe = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

/** Signals where unavailable fields are either omitted or explicitly undefined. */
const signalsArb: fc.Arbitrary<CapabilitySignals> = fc.oneof(
  fc.record({
    saveData: maybe(fc.boolean()),
    deviceMemory: maybe(deviceMemoryArb),
    hardwareConcurrency: maybe(coresArb),
    hidden: fc.boolean(),
  }),
  fc.record(
    {
      saveData: fc.boolean(),
      deviceMemory: deviceMemoryArb,
      hardwareConcurrency: coresArb,
      hidden: fc.boolean(),
    },
    { requiredKeys: ['hidden'] },
  ),
);

/** Any value a browser, polyfill or extension might put in a signal slot. */
const junk = fc.oneof(
  fc.constantFrom(undefined, null, 0, -1, -0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
  fc.constantFrom('4', 'hidden', 'visible', 'true', true, false),
  fc.anything(),
);

const numberSlot = fc.oneof(deviceMemoryArb, coresArb, junk);

const connectionArb = fc.oneof(
  junk,
  fc.record({ saveData: fc.oneof(fc.boolean(), junk) }, { requiredKeys: [] }),
);

const navArb = fc.record(
  { hardwareConcurrency: numberSlot, deviceMemory: numberSlot, connection: connectionArb },
  { requiredKeys: [] },
) as fc.Arbitrary<NavigatorSignals>;

const docArb = fc.record(
  {
    hidden: fc.oneof(fc.boolean(), junk),
    visibilityState: fc.oneof(fc.constantFrom('visible', 'hidden', 'prerender'), junk),
  },
  { requiredKeys: [] },
) as fc.Arbitrary<DocumentSignals>;

/** A signal value counts only when it is a finite, positive number. */
const usable = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Classification computed straight from the raw navigator/document shapes. */
function expectedFromRaw(nav: NavigatorSignals, doc: DocumentSignals): boolean {
  const raw = nav as Record<string, unknown>;
  const d = doc as Record<string, unknown>;
  const conn = raw.connection;
  const saveData =
    typeof conn === 'object' && conn !== null && (conn as { saveData?: unknown }).saveData === true;
  const memory = raw.deviceMemory;
  const cores = raw.hardwareConcurrency;
  return (
    saveData ||
    (usable(memory) && memory <= LIMIT) ||
    (usable(cores) && cores <= LIMIT) ||
    d.visibilityState === 'hidden' ||
    d.hidden === true
  );
}

describe('Property 13: Low_Power_Mode classification', () => {
  it('isLowPower equals the Glossary disjunction, with undefined signals contributing false', () => {
    fc.assert(
      fc.property(signalsArb, (s) => {
        expect(isLowPower(s)).toBe(expected(s));
      }),
    );
  });

  it('readSignals on arbitrary navigator/document shapes classifies like the raw definition', () => {
    fc.assert(
      fc.property(navArb, docArb, (nav, doc) => {
        const s = readSignals(nav, doc);
        expect(isLowPower(s)).toBe(expectedFromRaw(nav, doc));
        // Every signal readSignals keeps is well-formed; the rest stay unavailable.
        expect(typeof s.hidden).toBe('boolean');
        if (s.saveData !== undefined) expect(typeof s.saveData).toBe('boolean');
        if (s.deviceMemory !== undefined) expect(usable(s.deviceMemory)).toBe(true);
        if (s.hardwareConcurrency !== undefined) expect(usable(s.hardwareConcurrency)).toBe(true);
      }),
    );
  });
});
