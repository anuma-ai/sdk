"use client";

import { useLayoutEffect, useState } from "react";

import { type AnumaNode, findById } from "../tools/slides/jsx";
import type { IdBounds, SelectionBounds } from "./types";

/**
 * Read the unrotated bounds + rotation of the selected element, in
 * slide-px relative to the stage origin.
 *
 * Recovery from gBCR: the runtime rotates around the element's center
 * (transform-origin: 50% 50%), so AABB.center == element.center. We
 * take the center from gBCR and the intrinsic w/h from `attrs`. The
 * unrotated top-left is then center − (w/2, h/2). Falls back to gBCR
 * dims for elements with no explicit attrs.w/h (auto-stretched flex
 * children).
 *
 * useLayoutEffect (not useEffect) so the rect update runs between
 * React's commit and the browser paint — without it, after a gesture
 * commit there's one frame where the AST has updated but `bounds` is
 * still stale (visible as the outline flickering at the old position).
 */
export function useSelectionBounds(
  stageRef: React.RefObject<HTMLElement | null>,
  selectedId: string | null,
  deck: AnumaNode,
  scale: number
): SelectionBounds | null {
  const [bounds, setBounds] = useState<SelectionBounds | null>(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !selectedId) {
      setBounds(null);
      return;
    }
    const el = stage.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    const node = findById(deck, selectedId);
    if (!el || !node) {
      setBounds(null);
      return;
    }
    const sr = stage.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const centerX = (er.left + er.width / 2 - sr.left) / scale;
    const centerY = (er.top + er.height / 2 - sr.top) / scale;
    const w = typeof node.attrs.w === "number" ? node.attrs.w : er.width / scale;
    const h = typeof node.attrs.h === "number" ? node.attrs.h : er.height / scale;
    const rotation = typeof node.attrs.rotation === "number" ? node.attrs.rotation : 0;
    setBounds({
      x: centerX - w / 2,
      y: centerY - h / 2,
      w,
      h,
      rotation,
    });
  }, [stageRef, selectedId, deck, scale]);
  return bounds;
}

/**
 * Bounds for every element in `selectedIds`. Same recovery logic as
 * useSelectionBounds, just iterated. Returns `{ id, ...SelectionBounds }`
 * per id so callers can render an outline per selection.
 */
export function useMultiSelectionBounds(
  stageRef: React.RefObject<HTMLElement | null>,
  selectedIds: ReadonlySet<string>,
  deck: AnumaNode,
  scale: number
): IdBounds[] {
  const [bounds, setBounds] = useState<IdBounds[]>([]);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || selectedIds.size === 0) {
      setBounds([]);
      return;
    }
    const sr = stage.getBoundingClientRect();
    const out: IdBounds[] = [];
    for (const id of selectedIds) {
      const el = stage.querySelector<HTMLElement>(`[data-id="${id}"]`);
      const node = findById(deck, id);
      if (!el || !node) continue;
      const er = el.getBoundingClientRect();
      const centerX = (er.left + er.width / 2 - sr.left) / scale;
      const centerY = (er.top + er.height / 2 - sr.top) / scale;
      const w = typeof node.attrs.w === "number" ? node.attrs.w : er.width / scale;
      const h = typeof node.attrs.h === "number" ? node.attrs.h : er.height / scale;
      const rotation = typeof node.attrs.rotation === "number" ? node.attrs.rotation : 0;
      out.push({ id, x: centerX - w / 2, y: centerY - h / 2, w, h, rotation });
    }
    setBounds(out);
  }, [stageRef, selectedIds, deck, scale]);
  return bounds;
}
