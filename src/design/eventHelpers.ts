import { NON_SELECTABLE_TAGS, type ResizeHandle } from "./dragLogic";

/**
 * Walk the click path and return the first descendant of `stage` that
 * carries a `data-id` and a non-container `data-anuma-tag`.
 * `composedPath` works in both light and shadow DOM.
 */
export function findElementIdFromEvent(
  e: { nativeEvent: Event } | Event,
  root: HTMLElement | null
): string | null {
  const native = "nativeEvent" in e ? e.nativeEvent : e;
  const path = typeof native.composedPath === "function" ? native.composedPath() : [];
  for (const node of path) {
    if (root && node === root) break;
    if (!(node instanceof HTMLElement)) continue;
    const id = node.dataset.id;
    const tag = node.dataset.anumaTag;
    if (id && tag && !NON_SELECTABLE_TAGS.has(tag)) return id;
  }
  return null;
}

const RESIZE_HANDLE_NAMES = new Set(["nw", "n", "ne", "e", "se", "s", "sw", "w"]);

/**
 * Walk the click path and return the resize-handle direction (if any)
 * the pointer landed on. Handles carry `data-resize-handle="<dir>"`.
 * Pointer-down on a handle is unambiguously a resize; check this
 * BEFORE the element-selection walk.
 */
export function findResizeHandleFromEvent(e: PointerEvent): ResizeHandle | null {
  const path = typeof e.composedPath === "function" ? e.composedPath() : [];
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    const dir = node.dataset.resizeHandle;
    if (dir && RESIZE_HANDLE_NAMES.has(dir)) return dir as ResizeHandle;
  }
  return null;
}

/** True if the pointer-down hit the rotate handle (`data-rotate-handle="true"`). */
export function findRotateHandleFromEvent(e: PointerEvent): boolean {
  const path = typeof e.composedPath === "function" ? e.composedPath() : [];
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.dataset.rotateHandle === "true") return true;
  }
  return false;
}

/**
 * Find every selectable element whose CENTER falls within the given
 * client-px rect. Used by marquee selection.
 *
 * Center-in-rect (rather than rect-overlaps-element) matches Figma:
 * dragging the marquee over a sliver of an element doesn't select it,
 * but dragging across its center does.
 */
export function findElementsInRect(
  stage: HTMLElement,
  rect: { left: number; right: number; top: number; bottom: number }
): string[] {
  const ids: string[] = [];
  const els = stage.querySelectorAll<HTMLElement>("[data-id]");
  for (const el of els) {
    const tag = el.dataset.anumaTag;
    if (tag && NON_SELECTABLE_TAGS.has(tag)) continue;
    const id = el.dataset.id;
    if (!id) continue;
    const er = el.getBoundingClientRect();
    const cx = er.left + er.width / 2;
    const cy = er.top + er.height / 2;
    if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
      ids.push(id);
    }
  }
  return ids;
}
