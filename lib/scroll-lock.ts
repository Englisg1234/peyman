// Document scroll lock for the Mobile_Menu (task 8.5; Req 8.5, 8.13).
//
// iOS-safe: `overflow: hidden` on body does not stop scrolling on older iOS
// Safari, so the body is pinned with `position: fixed; top: -scrollY` and the
// exact scroll position is restored on release (design: Browser and device
// considerations).
//
// Zero horizontal shift: pinning the body removes the document's scrollable
// overflow, so a classic scrollbar disappears and the viewport widens by its
// width. The lock compensates explicitly with the width measured at lock time:
// - the pinned body ends `right: <scrollbar>px` from the viewport edge, so the
//   Hero keeps its width and x position;
// - `--scroll-lock-gap: <scrollbar>px` on the root is read by fixed layers
//   (the Site_Header's inline-end inset) for the same reason.
// `overflow-y: scroll` on the root was rejected: Chromium then subtracts the
// scrollbar from `vw`, which moves every `vw`-based gutter. `vw` is unchanged
// by this approach, and it needs no `scrollbar-gutter` (absent in Safari).
// Overlay scrollbars take no space, so nothing is compensated there.
//
// DOM-only (no React); safe to import from client code only.

type StyleSnapshot = Array<[property: string, value: string, priority: string]>;

function applyStyles(el: HTMLElement, props: Record<string, string>): () => void {
  const saved: StyleSnapshot = Object.keys(props).map((p) => [
    p,
    el.style.getPropertyValue(p),
    el.style.getPropertyPriority(p),
  ]);
  for (const [p, v] of Object.entries(props)) el.style.setProperty(p, v);
  return () => {
    for (const [p, v, priority] of saved) {
      if (v) el.style.setProperty(p, v, priority);
      else el.style.removeProperty(p);
    }
  };
}

/**
 * Locks document scrolling and returns the release function. Release restores
 * the previous inline styles and the scroll position captured at lock time.
 * Calling release more than once is a no-op.
 */
export function lockScroll(doc: Document = document): () => void {
  const win = doc.defaultView;
  if (!win) return () => {};
  const root = doc.documentElement;
  const x = win.scrollX;
  const y = win.scrollY;
  const scrollbar = Math.max(0, win.innerWidth - root.clientWidth);

  const restoreRoot = scrollbar > 0 ? applyStyles(root, { "--scroll-lock-gap": `${scrollbar}px` }) : () => {};
  const restoreBody = applyStyles(doc.body, {
    position: "fixed",
    top: `${-y}px`,
    left: `${-x}px`,
    right: `${scrollbar}px`,
  });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    restoreBody();
    restoreRoot();
    win.scrollTo({ left: x, top: y, behavior: "instant" });
  };
}
