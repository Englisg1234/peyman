// Low_Power_Mode examples (task 16.1; Req 9.12). The full truth table is Property 13 (task 16.3).
import { describe, expect, it } from 'vitest';
import { isLowPower, readSignals } from '@/lib/capability';

describe('readSignals', () => {
  it('reads every available signal', () => {
    const s = readSignals(
      { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: false } },
      { hidden: false, visibilityState: 'visible' },
    );
    expect(s).toEqual({ saveData: false, deviceMemory: 8, hardwareConcurrency: 8, hidden: false });
  });

  it('leaves unavailable or malformed signals undefined', () => {
    const s = readSignals({ hardwareConcurrency: 0, deviceMemory: 'lots', connection: null }, {});
    expect(s).toEqual({ hidden: false });
  });

  it('treats a hidden document as hidden via either field', () => {
    expect(readSignals({}, { visibilityState: 'hidden' }).hidden).toBe(true);
    expect(readSignals({}, { hidden: true }).hidden).toBe(true);
  });
});

describe('isLowPower', () => {
  it('is false for a capable, visible device and when signals are unavailable', () => {
    expect(isLowPower({ saveData: false, deviceMemory: 8, hardwareConcurrency: 8, hidden: false })).toBe(false);
    expect(isLowPower({ hidden: false })).toBe(false);
  });

  it('is true at the inclusive 4 GiB / 4-core limits, on Save-Data, or when hidden', () => {
    expect(isLowPower({ deviceMemory: 4, hidden: false })).toBe(true);
    expect(isLowPower({ hardwareConcurrency: 4, hidden: false })).toBe(true);
    expect(isLowPower({ saveData: true, hidden: false })).toBe(true);
    expect(isLowPower({ hidden: true })).toBe(true);
  });

  it('is false just above the limits', () => {
    expect(isLowPower({ deviceMemory: 4.5, hardwareConcurrency: 5, hidden: false })).toBe(false);
  });
});
