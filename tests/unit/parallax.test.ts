// Pointer_Parallax examples (task 16.1; Req 9.7). The general bounds are Property 10 (task 16.2).
import { describe, expect, it } from 'vitest';
import { computeParallax, PARALLAX_MAX } from '@/lib/parallax';

// Hero 1440×900 at the origin; stage centered at (1000, 450).
const hero = { left: 0, top: 0, width: 1440, height: 900 };
const stage = { left: 800, top: 200, width: 400, height: 500 };

describe('computeParallax', () => {
  it('uses the motion tokens as defaults (12 px, 2°)', () => {
    expect(PARALLAX_MAX).toEqual({ translate: 12, rotate: 2 });
  });

  it('rests at the stage center', () => {
    expect(computeParallax({ x: 1000, y: 450 }, stage, hero)).toEqual({
      x: 0, y: 0, rotateX: 0, rotateY: 0, lightX: 0, lightY: 0,
    });
  });

  it('reaches the maximum at the Hero edges', () => {
    const right = computeParallax({ x: 1440, y: 450 }, stage, hero);
    expect(right.x).toBeCloseTo(12);
    expect(right.y).toBe(0);
    expect(right.rotateY).toBeCloseTo(2);
    expect(right.rotateX).toBe(0);

    const top = computeParallax({ x: 1000, y: 0 }, stage, hero);
    expect(top.y).toBeCloseTo(-12);
    expect(top.rotateX).toBeCloseTo(2);
  });

  it('scales proportionally to distance from the center', () => {
    // Halfway from the center to the left edge (1000 → 0).
    const half = computeParallax({ x: 500, y: 450 }, stage, hero);
    expect(half.x).toBeCloseTo(-6);
    expect(half.rotateY).toBeCloseTo(-1);
  });

  it('never exceeds the maximum magnitude, even in a corner or outside the Hero', () => {
    for (const p of [{ x: 1440, y: 900 }, { x: 0, y: 0 }, { x: 5000, y: -5000 }]) {
      const out = computeParallax(p, stage, hero);
      expect(Math.hypot(out.x, out.y)).toBeLessThanOrEqual(12 + 1e-9);
      expect(Math.abs(out.rotateX)).toBeLessThanOrEqual(2 + 1e-9);
      expect(Math.abs(out.rotateY)).toBeLessThanOrEqual(2 + 1e-9);
    }
  });

  it('moves the Light_Layer opposite to the emblem', () => {
    const out = computeParallax({ x: 1300, y: 700 }, stage, hero);
    expect(out.lightX).toBe(-out.x);
    expect(out.lightY).toBe(-out.y);
  });

  it('honors a custom maximum and returns the rest pose for non-finite input', () => {
    const out = computeParallax({ x: 1440, y: 450 }, stage, hero, { translate: 6, rotate: 1 });
    expect(out.x).toBeCloseTo(6);
    expect(out.rotateY).toBeCloseTo(1);
    expect(computeParallax({ x: Number.NaN, y: 450 }, stage, hero).x).toBe(0);
  });
});
