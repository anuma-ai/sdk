import type { SnapBounds, SnapGuide } from "./types";

/**
 * Read an element's gBCR-derived bounds in slide-px relative to the
 * stage origin. `scale` converts client-px → slide-px (the AST stores
 * positions in slide-px).
 */
export function getStageRelativeBounds(
  el: HTMLElement,
  stage: HTMLElement,
  scale: number
): SnapBounds {
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  return {
    left: (er.left - sr.left) / scale,
    right: (er.right - sr.left) / scale,
    top: (er.top - sr.top) / scale,
    bottom: (er.bottom - sr.top) / scale,
    cx: (er.left + er.width / 2 - sr.left) / scale,
    cy: (er.top + er.height / 2 - sr.top) / scale,
  };
}

/** Outer envelope of multiple bounds — the dragged group's AABB. */
export function unionBounds(arr: readonly SnapBounds[]): SnapBounds | null {
  if (arr.length === 0) return null;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const b of arr) {
    if (b.left < left) left = b.left;
    if (b.right > right) right = b.right;
    if (b.top < top) top = b.top;
    if (b.bottom > bottom) bottom = b.bottom;
  }
  return {
    left,
    right,
    top,
    bottom,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
  };
}

type AxisKey = "left" | "cx" | "right" | "top" | "cy" | "bottom";
type SnapMatch = { adjust: number; pos: number; other: SnapBounds };

const X_KEYS: readonly AxisKey[] = ["left", "cx", "right"];
const Y_KEYS: readonly AxisKey[] = ["top", "cy", "bottom"];

function findBestAxisMatch(
  moved: SnapBounds,
  others: readonly SnapBounds[],
  keys: readonly AxisKey[],
  thresholdSlide: number
): SnapMatch | null {
  let best: SnapMatch | null = null;
  for (const o of others) {
    for (const dk of keys) {
      for (const ok of keys) {
        const adjust = o[ok] - moved[dk];
        if (Math.abs(adjust) > thresholdSlide) continue;
        if (!best || Math.abs(adjust) < Math.abs(best.adjust)) {
          best = { adjust, pos: o[ok], other: o };
        }
      }
    }
  }
  return best;
}

export function computeSnap(
  start: SnapBounds,
  rawDelta: { x: number; y: number },
  others: readonly SnapBounds[],
  thresholdSlide: number
): { delta: { x: number; y: number }; guides: SnapGuide[] } {
  const moved: SnapBounds = {
    left: start.left + rawDelta.x,
    right: start.right + rawDelta.x,
    cx: start.cx + rawDelta.x,
    top: start.top + rawDelta.y,
    bottom: start.bottom + rawDelta.y,
    cy: start.cy + rawDelta.y,
  };
  const bestX = findBestAxisMatch(moved, others, X_KEYS, thresholdSlide);
  const bestY = findBestAxisMatch(moved, others, Y_KEYS, thresholdSlide);
  const delta = {
    x: rawDelta.x + (bestX?.adjust ?? 0),
    y: rawDelta.y + (bestY?.adjust ?? 0),
  };
  const guides: SnapGuide[] = [];
  if (bestX) {
    const top = start.top + delta.y;
    const bottom = start.bottom + delta.y;
    guides.push({
      axis: "x",
      position: bestX.pos,
      start: Math.min(top, bestX.other.top),
      end: Math.max(bottom, bestX.other.bottom),
    });
  }
  if (bestY) {
    const left = start.left + delta.x;
    const right = start.right + delta.x;
    guides.push({
      axis: "y",
      position: bestY.pos,
      start: Math.min(left, bestY.other.left),
      end: Math.max(right, bestY.other.right),
    });
  }
  return { delta, guides };
}
