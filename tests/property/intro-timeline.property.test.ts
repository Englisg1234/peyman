// Feature: cinematic-hero, Property 12: Intro timeline honors its bounds
// **Validates: Requirements 9.3, 9.5**
//
// For any step in INTRO_TIMELINE:
// - delay + duration ≤ 900 ms (≤ 800 ms for hairlines);
// - every duration is a value from `duration`;
// - the headline step has no `opacity` and |translateY| ≤ 16;
// - the emblem step goes from scale 0.98 to 1.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { duration, INTRO_TIMELINE } from '@/lib/motion-tokens';

/** Every step ends at opacity 1, translateY 0, scale 1 (IntroStep contract). */
const END_SCALE = 1;

const step = fc.constantFrom(...INTRO_TIMELINE);
const durationValues: readonly number[] = Object.values(duration);

describe('Property 12: intro timeline bounds', () => {
  it('contains the headline and emblem steps the property constrains', () => {
    const targets = INTRO_TIMELINE.map((s) => s.target);
    expect(targets).toContain('headline');
    expect(targets).toContain('emblem');
    expect(targets).toContain('hairline');
  });

  it('holds for any step in INTRO_TIMELINE', () => {
    fc.assert(
      fc.property(step, (s) => {
        // Settle bound: 900 ms overall, 800 ms for hairlines.
        const limit = s.target === 'hairline' ? 800 : 900;
        expect(s.delay + s.duration).toBeLessThanOrEqual(limit);

        // Durations come from the token table only.
        expect(durationValues).toContain(s.duration);

        if (s.target === 'headline') {
          expect(s.from).not.toHaveProperty('opacity');
          expect(Math.abs(s.from.translateY ?? 0)).toBeLessThanOrEqual(16);
        }

        if (s.target === 'emblem') {
          // The start scale is data; the end scale (1) is the IntroStep
          // contract shared by every step, so it is not stored per step.
          expect(s.from.scale).toBe(0.98);
          expect(s.from.scale! < END_SCALE).toBe(true);
        }
      }),
    );
  });
});
