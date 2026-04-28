/**
 * Pure gesture-transition helpers. Each function takes the current
 * gesture (or pointer-down context) plus the AnumaNode tree + scale +
 * stage, and returns the next gesture state. No React, no setters —
 * the calling hook is responsible for applying the result.
 *
 * Splitting these out of `useCanvasGestures` keeps the hook readable
 * and individual transitions easy to reason about (each handles one
 * phase). It also lets the move/up handlers in the hook be thin
 * dispatchers.
 */

import { type AnumaNode, findById } from '../tools/slides/jsx';
import {
  canMultiDrag,
  commitDrop,
  commitMultiDrag,
  commitResize,
  commitRotation,
  getLayoutModeOf,
  RESIZE_HANDLE_DIRS,
  type ResizeBounds,
  type ResizeHandle,
} from './dragLogic';
import { resolveDropTarget } from './dropTarget';
import {
  findElementsInRect,
  findResizeHandleFromEvent,
  findRotateHandleFromEvent,
} from './eventHelpers';
import { computeSnap, getStageRelativeBounds, unionBounds } from './snap';
import type { Gesture, SnapBounds, SnapGuide } from './types';

/** Min dimension during resize, in slide-px. */
const RESIZE_MIN = 8;
/** Min pointer movement (in client px) before a click becomes a drag. Squared. */
export const DRAG_THRESHOLD_SQ = 4 * 4;
/** Snap radius in client pixels — feel is consistent across zoom levels. */
const SNAP_THRESHOLD_CLIENT = 5;

type Pointer = { x: number; y: number };

/**
 * Detect a handle-driven gesture (rotate or resize) at pointer-down.
 * Pointer-down on a handle is unambiguously a drag — no click-vs-drag
 * threshold needed. Returns null when the pointer didn't hit a handle
 * or when the handle's element can't be measured.
 */
export function detectHandleGesture(
  e: PointerEvent,
  deck: AnumaNode,
  selectedId: string | null,
  stage: HTMLElement | null,
  pointer: Pointer,
  scale: number
): Gesture | null {
  if (!selectedId || !stage) return null;
  if (findRotateHandleFromEvent(e)) {
    return startRotateGesture(deck, stage, selectedId, pointer);
  }
  const handle = findResizeHandleFromEvent(e);
  if (handle) {
    return startResizeGesture(deck, stage, selectedId, handle, pointer, scale);
  }
  return null;
}

/**
 * Build the initial 'rotating' gesture from a rotate-handle pointer-down.
 * Returns null if the selected element can't be measured.
 */
export function startRotateGesture(
  deck: AnumaNode,
  stage: HTMLElement,
  selectedId: string,
  pointer: Pointer
): Gesture | null {
  const el = stage.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
  if (!el) return null;
  const er = el.getBoundingClientRect();
  const centerClient = {
    x: er.left + er.width / 2,
    y: er.top + er.height / 2,
  };
  const startAngle = Math.atan2(pointer.y - centerClient.y, pointer.x - centerClient.x);
  const node = findById(deck, selectedId);
  const startRotation = typeof node?.attrs.rotation === 'number' ? node.attrs.rotation : 0;
  return {
    phase: 'rotating',
    elementId: selectedId,
    centerClient,
    startAngle,
    startRotation,
    currentRotation: startRotation,
  };
}

/**
 * Build the initial 'resizing' gesture from a resize-handle pointer-down.
 * Captures the element's UNROTATED bounds (recovered from the AABB
 * center + intrinsic w/h) as a fixed origin for subsequent moves.
 */
export function startResizeGesture(
  deck: AnumaNode,
  stage: HTMLElement,
  selectedId: string,
  handle: ResizeHandle,
  pointer: Pointer,
  scale: number
): Gesture | null {
  const el = stage.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
  if (!el) return null;
  const node = findById(deck, selectedId);
  if (!node) return null;
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  // gBCR is the AABB; for rotated elements that's bigger than the box.
  // AABB center == element center, so use that + intrinsic w/h.
  const startCenter = {
    x: (er.left + er.width / 2 - sr.left) / scale,
    y: (er.top + er.height / 2 - sr.top) / scale,
  };
  const w = typeof node.attrs.w === 'number' ? node.attrs.w : er.width / scale;
  const h = typeof node.attrs.h === 'number' ? node.attrs.h : er.height / scale;
  const rotation = typeof node.attrs.rotation === 'number' ? node.attrs.rotation : 0;
  const startBounds: ResizeBounds = {
    x: startCenter.x - w / 2,
    y: startCenter.y - h / 2,
    w,
    h,
  };
  return {
    phase: 'resizing',
    elementId: selectedId,
    handle,
    startClient: pointer,
    startBounds,
    startCenter,
    rotation,
    layoutMode: getLayoutModeOf(deck, selectedId),
    currentBounds: startBounds,
  };
}

/**
 * Promote a 'pending' gesture to 'dragging'. Captures each dragged
 * element's gBCR bounds NOW (before any drag transform is applied) so
 * subsequent snap math compares against the start position.
 */
export function promotePendingToDragging(
  pending: Extract<Gesture, { phase: 'pending' }>,
  deck: AnumaNode,
  stage: HTMLElement,
  pointer: Pointer,
  scale: number,
  currentSelection: ReadonlySet<string>
): Extract<Gesture, { phase: 'dragging' }> | null {
  if (pending.elementId === null) return null;
  const elementId = pending.elementId;
  const resolved = resolveDropTarget(deck, stage, elementId, pointer, scale);
  // Multi-drag only when the entire selection is absolute siblings under
  // the same parent. Mixed selections fall back to single-drag.
  const ids = Array.from(currentSelection);
  const elementIds = canMultiDrag(deck, ids) ? ids : [elementId];
  const startBoundsList: SnapBounds[] = [];
  for (const id of elementIds) {
    const el = stage.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (el) startBoundsList.push(getStageRelativeBounds(el, stage, scale));
  }
  return {
    phase: 'dragging',
    elementId,
    elementIds,
    startClient: pending.startClient,
    delta: {
      x: (pointer.x - pending.startClient.x) / scale,
      y: (pointer.y - pending.startClient.y) / scale,
    },
    drop: resolved?.drop ?? null,
    indicatorBounds: resolved?.indicatorBounds ?? null,
    startGroupBounds: unionBounds(startBoundsList),
    guides: [],
  };
}

/**
 * Promote a 'pending' gesture to 'marquee'. The empty-canvas pointer-down
 * has now moved past threshold — start sweeping a selection rectangle.
 */
export function promotePendingToMarquee(
  pending: Extract<Gesture, { phase: 'pending' }>,
  pointer: Pointer,
  currentSelection: ReadonlySet<string>
): Extract<Gesture, { phase: 'marquee' }> {
  return {
    phase: 'marquee',
    startClient: pending.startClient,
    currentClient: pointer,
    additive: pending.shiftKey,
    initialSelection: currentSelection,
  };
}

/**
 * Marquee pointer-move: update the rect, recompute the hits, return
 * the next gesture and the next selection set (additive unions with
 * the snapshotted initial selection so toggling on/off as the user
 * drags out and back works intuitively).
 */
export function transitionMarqueeOnMove(
  marquee: Extract<Gesture, { phase: 'marquee' }>,
  pointer: Pointer,
  stage: HTMLElement
): { gesture: Gesture; selection: Set<string> } {
  const left = Math.min(marquee.startClient.x, pointer.x);
  const right = Math.max(marquee.startClient.x, pointer.x);
  const top = Math.min(marquee.startClient.y, pointer.y);
  const bottom = Math.max(marquee.startClient.y, pointer.y);
  const hits = findElementsInRect(stage, { left, right, top, bottom });
  const selection = marquee.additive ? new Set(marquee.initialSelection) : new Set<string>();
  for (const id of hits) selection.add(id);
  return {
    gesture: { ...marquee, currentClient: pointer },
    selection,
  };
}

/**
 * Dragging pointer-move: recompute drop target + apply snap. The drop
 * target updates each frame from what's under the cursor, so dragging
 * out of one container into another transitions automatically.
 */
export function transitionDraggingOnMove(
  drag: Extract<Gesture, { phase: 'dragging' }>,
  pointer: Pointer,
  deck: AnumaNode,
  stage: HTMLElement,
  scale: number
): Extract<Gesture, { phase: 'dragging' }> {
  const rawDx = (pointer.x - drag.startClient.x) / scale;
  const rawDy = (pointer.y - drag.startClient.y) / scale;
  const resolved = resolveDropTarget(deck, stage, drag.elementId, pointer, scale);
  let snappedDelta = { x: rawDx, y: rawDy };
  let guides: SnapGuide[] = [];
  if (drag.startGroupBounds) {
    const draggedSet = new Set(drag.elementIds);
    const others: SnapBounds[] = [];
    for (const el of stage.querySelectorAll<HTMLElement>('[data-id]')) {
      const id = el.dataset.id;
      if (!id || draggedSet.has(id)) continue;
      others.push(getStageRelativeBounds(el, stage, scale));
    }
    const result = computeSnap(
      drag.startGroupBounds,
      { x: rawDx, y: rawDy },
      others,
      SNAP_THRESHOLD_CLIENT / scale
    );
    snappedDelta = result.delta;
    guides = result.guides;
  }
  return {
    ...drag,
    delta: snappedDelta,
    drop: resolved?.drop ?? null,
    indicatorBounds: resolved?.indicatorBounds ?? null,
    guides,
  };
}

/**
 * Resizing pointer-move: cursor delta in screen-px is rotated into the
 * element's local frame so a grabbed handle's effect maps to the
 * element's own axes (vs. the screen's). Center shift differs by
 * layout: absolute anchors the opposite edge in client space (rotates
 * with the element); flex anchors the CSS top-left in screen space
 * (rotation-blind).
 */
export function transitionResizingOnMove(
  resize: Extract<Gesture, { phase: 'resizing' }>,
  pointer: Pointer,
  scale: number
): Extract<Gesture, { phase: 'resizing' }> {
  const cdxS = (pointer.x - resize.startClient.x) / scale;
  const cdyS = (pointer.y - resize.startClient.y) / scale;
  const Rrad = (resize.rotation * Math.PI) / 180;
  const cosR = Math.cos(Rrad);
  const sinR = Math.sin(Rrad);
  const cdxL = cdxS * cosR + cdyS * sinR;
  const cdyL = -cdxS * sinR + cdyS * cosR;
  const dir = RESIZE_HANDLE_DIRS[resize.handle];
  const sb = resize.startBounds;
  const newW = dir.dx !== 0 ? Math.max(RESIZE_MIN, sb.w + dir.dx * cdxL) : sb.w;
  const newH = dir.dy !== 0 ? Math.max(RESIZE_MIN, sb.h + dir.dy * cdyL) : sb.h;
  const dw = newW - sb.w;
  const dh = newH - sb.h;
  const lsx = (dir.dx * dw) / 2;
  const lsy = (dir.dy * dh) / 2;
  const isAbs = resize.layoutMode === 'absolute';
  const centerShiftX = isAbs ? lsx * cosR - lsy * sinR : lsx;
  const centerShiftY = isAbs ? lsx * sinR + lsy * cosR : lsy;
  const newCenterX = resize.startCenter.x + centerShiftX;
  const newCenterY = resize.startCenter.y + centerShiftY;
  return {
    ...resize,
    currentBounds: {
      x: newCenterX - newW / 2,
      y: newCenterY - newH / 2,
      w: newW,
      h: newH,
    },
  };
}

/**
 * Rotating pointer-move: angle from the (fixed) element center to the
 * cursor drives the rotation. Delta normalized to (-π, π] so crossing
 * the atan2 discontinuity doesn't cause a 360° jump.
 */
export function transitionRotatingOnMove(
  rotate: Extract<Gesture, { phase: 'rotating' }>,
  pointer: Pointer
): Extract<Gesture, { phase: 'rotating' }> {
  const angle = Math.atan2(pointer.y - rotate.centerClient.y, pointer.x - rotate.centerClient.x);
  let d = angle - rotate.startAngle;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const newRotation = rotate.startRotation + (d * 180) / Math.PI;
  return { ...rotate, currentRotation: newRotation };
}

/**
 * Element-click selection rules:
 *   - shift+click on UNSELECTED → add to selection.
 *   - shift+click on SELECTED → toggle off.
 *   - plain click on UNSELECTED → replace selection (single).
 *   - plain click on already SELECTED → preserve (drag the whole set).
 */
export function buildSelectionAfterClick(
  prev: ReadonlySet<string>,
  id: string,
  shiftKey: boolean
): ReadonlySet<string> {
  if (shiftKey) {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }
  return prev.has(id) ? prev : new Set([id]);
}

/**
 * Build the deck-updater for the AST commit on pointer-up. Returns
 * null when the gesture shouldn't write to the AST (no movement on
 * resize/rotate, no drop target on single-element drag, etc.).
 *
 * 'pending' and 'marquee' don't commit; the caller handles selection
 * cleanup separately.
 */
export function gestureCommit(gesture: Gesture): ((d: AnumaNode) => AnumaNode) | null {
  if (gesture.phase === 'resizing') {
    const { elementId, startBounds, currentBounds } = gesture;
    const moved =
      currentBounds.x !== startBounds.x ||
      currentBounds.y !== startBounds.y ||
      currentBounds.w !== startBounds.w ||
      currentBounds.h !== startBounds.h;
    return moved ? d => commitResize(d, elementId, currentBounds) : null;
  }
  if (gesture.phase === 'rotating') {
    const { elementId, startRotation, currentRotation } = gesture;
    return currentRotation !== startRotation
      ? d => commitRotation(d, elementId, currentRotation)
      : null;
  }
  if (gesture.phase === 'dragging') {
    if (gesture.elementIds.length > 1) {
      const { elementIds, delta } = gesture;
      return d => commitMultiDrag(d, elementIds, delta);
    }
    if (gesture.drop) {
      const { drop, elementId } = gesture;
      return d => commitDrop(d, elementId, drop);
    }
  }
  return null;
}
