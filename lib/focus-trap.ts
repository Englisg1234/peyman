// Modal containment for the Mobile_Menu (task 8.5; Req 8.5, 8.12, 12.12).
//
// - `trapTab`: a manual Tab / Shift+Tab wrap. The native `<dialog>` was
//   rejected because Tab escapes to the browser chrome instead of wrapping
//   (design: Header system).
// - `inertOutside`: sets `inert` on every body child except the menu layers,
//   so content outside (Site_Header with the trigger, main, the scroll
//   sentinel) leaves the focus order and the accessibility tree, including
//   the screen-reader virtual cursor.
//
// DOM-only (no React); safe to import from client code only.

/** Candidates for sequential focus; filtered further by `focusableIn`. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
].join(",");

/** Tabbable elements inside `root`, in DOM order (rendered, not inert, tabIndex ≥ 0). */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest("[inert]") && el.getClientRects().length > 0,
  );
}

/**
 * Keeps Tab inside `root`: Tab on the last tabbable moves to the first, and
 * Shift+Tab on the first moves to the last. Focus that is somehow outside
 * `root` is pulled back in. Other keys are ignored.
 */
export function trapTab(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== "Tab") return;
  const items = focusableIn(root);
  if (items.length === 0) {
    event.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = root.ownerDocument.activeElement;
  const inside = active !== null && root.contains(active);
  if (event.shiftKey && (active === first || !inside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Sets `inert` on every child of `body` except `keep` (and elements that are
 * already inert). Returns a function that removes exactly the attributes it
 * set. Calling it more than once is a no-op.
 */
export function inertOutside(keep: readonly Element[], doc: Document = document): () => void {
  const changed: Element[] = [];
  for (const el of Array.from(doc.body.children)) {
    if (keep.includes(el) || el.hasAttribute("inert")) continue;
    el.setAttribute("inert", "");
    changed.push(el);
  }
  return () => {
    for (const el of changed.splice(0)) el.removeAttribute("inert");
  };
}
