import { RasterEmblem } from "@/components/hero/raster-emblem";
import type { EmblemRendererProps } from "@/lib/site-config-schema";

export type EmblemVisualProps = EmblemRendererProps;

/**
 * Renderer-selection point for the Emblem_Visual contract (design: Emblem
 * rendering architecture; Req 5.6, 5.7, 15.9, 19.7).
 *
 * This is the only module that may import a renderer (ESLint
 * `no-restricted-imports` enforces it for `raster-emblem`). The Emblem_Stage
 * sizes and positions the slot from `aspectRatio` and `anchor` alone and
 * hands the whole contract here; every renderer fills that slot at
 * 100% × 100%, so the choice below can never move or resize it.
 *
 * `raster` (v1): the layered Raster_Emblem.
 *
 * `model` (future extension point, not built in v1): the release gate rejects
 * `emblem.kind: 'model'` (`model-without-renderer`, lib/site-config-schema.ts),
 * so a release build never reaches this branch. Non-release builds render the
 * poster, which is also what the future Model_Emblem shows from first paint
 * (Req 5.7). Adding the Model_Emblem changes only Site_Config, this switch and
 * the new renderer under `three/` (reserved, not created; no three.js or R3F
 * import exists in v1): a client `three/model-emblem-loader.tsx` imported here
 * that keeps `<RasterEmblem>` as its poster and loads the model after
 * hydration with `ssr: false`.
 *
 * Reduced motion (task 17.1, Req 5.8, 9.10): the future poster ↔ model
 * crossfade (either direction, CLS 0, outgoing layer removed only after it
 * completes) runs over `duration.crossfade` (400 ms) only under
 * `prefers-reduced-motion: no-preference`; under `reduce` it is 0 ms (an
 * instant swap once the model's first frame is ready), and a runtime toggle to
 * `reduce` mid-crossfade jumps to its end state. The loader must evaluate the
 * preference live (matchMedia), as HeroMotion does, not once at mount.
 */
export function EmblemVisual(props: EmblemVisualProps) {
  const { kind } = props.visual;
  switch (kind) {
    case "raster":
      return <RasterEmblem {...props} />;
    case "model":
      // Extension point: replace with the model loader (poster = RasterEmblem).
      return <RasterEmblem {...props} />;
    default: {
      // Exhaustiveness: a new `kind` fails `tsc` here until it has a renderer.
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
