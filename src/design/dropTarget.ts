import { type AnumaNode, findById } from '../tools/slides/jsx';
import type { DropTarget } from './dragLogic';

/**
 * For a flex parent, compute which insertion slot the pointer is over.
 * Reads child rects from the DOM (gBCR).
 *
 * Returns the index in `parent.children` AFTER removing the dragged
 * child (so 0 = before all remaining siblings, N = after all of them).
 */
export function computeFlexDropTarget(
  stage: HTMLElement,
  parentId: string,
  draggedId: string,
  axis: 'row' | 'column',
  pointerClient: { x: number; y: number },
  scale: number
): { index: number; bounds: { x: number; y: number; w: number; h: number } | null } {
  const parentEl = stage.querySelector<HTMLElement>(`[data-id="${parentId}"]`);
  if (!parentEl) return { index: 0, bounds: null };
  const stageRect = stage.getBoundingClientRect();
  const siblings = Array.from(parentEl.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && typeof el.dataset.id === 'string' && el.dataset.id !== draggedId
  );
  if (siblings.length === 0) {
    const pr = parentEl.getBoundingClientRect();
    return {
      index: 0,
      bounds: {
        x: (pr.left - stageRect.left) / scale,
        y: (pr.top - stageRect.top) / scale,
        w: pr.width / scale,
        h: 2,
      },
    };
  }
  const siblingRects = siblings.map(el => el.getBoundingClientRect());
  let dropIndex = siblings.length;
  for (let i = 0; i < siblingRects.length; i++) {
    const r = siblingRects[i];
    const center = axis === 'column' ? r.top + r.height / 2 : r.left + r.width / 2;
    const p = axis === 'column' ? pointerClient.y : pointerClient.x;
    if (p < center) {
      dropIndex = i;
      break;
    }
  }
  const parentRect = parentEl.getBoundingClientRect();
  const first = siblingRects[0];
  const last = siblingRects[siblingRects.length - 1];
  let lineClient: { left: number; top: number; width: number; height: number };
  if (axis === 'column') {
    let yClient: number;
    if (dropIndex === 0) yClient = first.top;
    else if (dropIndex === siblingRects.length) yClient = last.bottom;
    else {
      const a = siblingRects[dropIndex - 1];
      const b = siblingRects[dropIndex];
      yClient = (a.bottom + b.top) / 2;
    }
    lineClient = {
      left: parentRect.left,
      top: yClient,
      width: parentRect.width,
      height: 2,
    };
  } else {
    let xClient: number;
    if (dropIndex === 0) xClient = first.left;
    else if (dropIndex === siblingRects.length) xClient = last.right;
    else {
      const a = siblingRects[dropIndex - 1];
      const b = siblingRects[dropIndex];
      xClient = (a.right + b.left) / 2;
    }
    lineClient = {
      left: xClient,
      top: parentRect.top,
      width: 2,
      height: parentRect.height,
    };
  }
  return {
    index: dropIndex,
    bounds: {
      x: (lineClient.left - stageRect.left) / scale,
      y: (lineClient.top - stageRect.top) / scale,
      w: lineClient.width / scale,
      h: lineClient.height / scale,
    },
  };
}

/**
 * Find the deepest container under the cursor that's not the dragged
 * element or one of its descendants. Uses `elementsFromPoint` so the
 * walk respects visual layering (the dragged element's translate makes
 * it the topmost hit; we skip it and fall through).
 */
export function findContainerAt(
  stage: HTMLElement,
  draggedId: string,
  pointerClient: { x: number; y: number }
): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const draggedEl = stage.querySelector<HTMLElement>(`[data-id="${draggedId}"]`);
  const candidates = document.elementsFromPoint(pointerClient.x, pointerClient.y);
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    if (!stage.contains(el)) continue;
    if (draggedEl && (el === draggedEl || draggedEl.contains(el))) continue;
    const tag = el.dataset.anumaTag;
    if (tag === 'Slide' || tag === 'Screen' || tag === 'Group') return el;
  }
  return null;
}

/**
 * Resolve the cursor into a DropTarget. The container under the cursor
 * decides the drop's kind: a flex container produces a flex drop with
 * a computed insertion index; an absolute container produces an
 * absolute drop with x/y/w/h in container-local slide-px.
 *
 * For absolute drops, w/h come from the AST's intrinsic dims (not
 * gBCR) — gBCR is the AABB and would inflate dimensions for rotated
 * elements, accumulating scale across drops.
 */
export function resolveDropTarget(
  deck: AnumaNode,
  stage: HTMLElement,
  draggedId: string,
  pointerClient: { x: number; y: number },
  scale: number
): {
  drop: DropTarget;
  indicatorBounds: { x: number; y: number; w: number; h: number } | null;
} | null {
  const containerEl = findContainerAt(stage, draggedId, pointerClient);
  if (!containerEl) return null;
  const parentId = containerEl.dataset.id;
  if (!parentId) return null;
  const parentNode = findById(deck, parentId);
  if (!parentNode) return null;
  const layout = parentNode.attrs.layout;
  if (layout === 'row' || layout === 'column') {
    const t = computeFlexDropTarget(stage, parentId, draggedId, layout, pointerClient, scale);
    return {
      drop: { kind: 'flex', parentId, dropIndex: t.index },
      indicatorBounds: t.bounds,
    };
  }
  const draggedEl = stage.querySelector<HTMLElement>(`[data-id="${draggedId}"]`);
  if (!draggedEl) return null;
  const dr = draggedEl.getBoundingClientRect();
  const cr = containerEl.getBoundingClientRect();
  const draggedNode = findById(deck, draggedId);
  const w = typeof draggedNode?.attrs.w === 'number' ? draggedNode.attrs.w : dr.width / scale;
  const h = typeof draggedNode?.attrs.h === 'number' ? draggedNode.attrs.h : dr.height / scale;
  // Element rotates around its center (transform-origin: 50% 50%), so
  // AABB.center == element.center. Recover the unrotated top-left from
  // the AABB center + intrinsic w/h.
  const centerClientX = dr.left + dr.width / 2;
  const centerClientY = dr.top + dr.height / 2;
  const topLeftClientX = centerClientX - (w * scale) / 2;
  const topLeftClientY = centerClientY - (h * scale) / 2;
  return {
    drop: {
      kind: 'absolute',
      parentId,
      x: (topLeftClientX - cr.left) / scale,
      y: (topLeftClientY - cr.top) / scale,
      w,
      h,
    },
    indicatorBounds: null,
  };
}
