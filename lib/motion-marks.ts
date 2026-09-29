// User Timing mark names set by MotionLoader (components/motion/motion-loader.tsx).
// Tests and performance traces read them with `performance.getEntriesByName()`;
// no globals are added to `window`.
//
// - start:  hydration committed; the 1600 ms deadline starts and the motion
//           chunk is requested (Req 16.4, 16.8).
// - ready:  the motion chunk loaded.
// - failed: the motion chunk import rejected; no retry follows (Req 17.7).

export const MOTION_MARK = {
  start: "peyman:motion-start",
  ready: "peyman:motion-ready",
  failed: "peyman:motion-failed",
} as const;
