"use client";

import { useEffect } from "react";

import { type AnumaNode, findById, removeById } from "../tools/slides/jsx";
import {
  commitResize,
  commitRotation,
  getLayoutModeOf,
  RESIZE_HANDLE_DIRS,
  type ResizeHandle,
} from "./dragLogic";
import { transitionResizingOnMove } from "./transitions";

export type UseCanvasKeyboardOpts = {
  setDeck: (updater: AnumaNode | ((d: AnumaNode) => AnumaNode)) => void;
  selectedIds: ReadonlySet<string>;
  setSelectedIds: (ids: ReadonlySet<string>) => void;
  /** Suppress all shortcuts (e.g. while inline-editing text). */
  disabled?: boolean;
  /** Optional undo/redo. When omitted, Cmd+Z is a no-op. */
  undo?: () => void;
  redo?: () => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

function arrowKeyDelta(key: string, shiftKey: boolean): { dx: number; dy: number } | null {
  const step = shiftKey ? 10 : 1;
  if (key === "ArrowLeft") return { dx: -step, dy: 0 };
  if (key === "ArrowRight") return { dx: step, dy: 0 };
  if (key === "ArrowUp") return { dx: 0, dy: -step };
  if (key === "ArrowDown") return { dx: 0, dy: step };
  return null;
}

function handleModifierShortcut(
  e: KeyboardEvent,
  undo: (() => void) | undefined,
  redo: (() => void) | undefined
): boolean {
  const k = e.key.toLowerCase();
  if (k === "z") {
    e.preventDefault();
    if (e.shiftKey) redo?.();
    else undo?.();
    return true;
  }
  if (k === "y") {
    e.preventDefault();
    redo?.();
    return true;
  }
  return false;
}

function applyDelete(ids: ReadonlySet<string>) {
  return (d: AnumaNode): AnumaNode => {
    const next = structuredClone(d);
    let any = false;
    for (const id of ids) {
      if (removeById(next, id)) any = true;
    }
    return any ? next : d;
  };
}

function applyArrowNudge(ids: ReadonlySet<string>, dx: number, dy: number) {
  return (d: AnumaNode): AnumaNode => {
    const next = structuredClone(d);
    let any = false;
    for (const id of ids) {
      if (getLayoutModeOf(d, id) !== "absolute") continue;
      const el = findById(next, id);
      if (!el) continue;
      const x = typeof el.attrs.x === "number" ? el.attrs.x : 0;
      const y = typeof el.attrs.y === "number" ? el.attrs.y : 0;
      el.attrs.x = x + dx;
      el.attrs.y = y + dy;
      any = true;
    }
    return any ? next : d;
  };
}

function applyHandleArrow(
  target: HTMLElement,
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
  shiftKey: boolean
) {
  const overlay = target.closest<HTMLElement>("[data-canvas-selection]");
  const id = overlay?.dataset.canvasSelection;
  const handle = (Object.keys(RESIZE_HANDLE_DIRS) as ResizeHandle[]).find(
    (name) => name === target.dataset.resizeHandle
  );
  const measuredWidth = Number(overlay?.dataset.canvasWidth);
  const measuredHeight = Number(overlay?.dataset.canvasHeight);
  return (d: AnumaNode): AnumaNode => {
    if (!id || ids.size !== 1 || !ids.has(id)) return d;
    const node = findById(d, id);
    if (!node) return d;
    const rotation = typeof node.attrs.rotation === "number" ? node.attrs.rotation : 0;
    if (target.dataset.rotateHandle === "true") {
      return commitRotation(d, id, rotation + Math.sign(dx + dy) * (shiftKey ? 15 : 1));
    }
    if (!handle) return d;
    const w = typeof node.attrs.w === "number" ? node.attrs.w : measuredWidth;
    const h = typeof node.attrs.h === "number" ? node.attrs.h : measuredHeight;
    if (!Number.isFinite(w) || !Number.isFinite(h)) return d;
    const x = typeof node.attrs.x === "number" ? node.attrs.x : 0;
    const y = typeof node.attrs.y === "number" ? node.attrs.y : 0;
    const startBounds = { x, y, w, h };
    const { currentBounds } = transitionResizingOnMove(
      {
        phase: "resizing",
        elementId: id,
        handle,
        startClient: { x: 0, y: 0 },
        startBounds,
        startCenter: { x: x + w / 2, y: y + h / 2 },
        rotation,
        layoutMode: getLayoutModeOf(d, id),
        currentBounds: startBounds,
      },
      { x: dx, y: dy },
      1
    );
    if (currentBounds.w === w && currentBounds.h === h) return d;
    return commitResize(d, id, currentBounds);
  };
}

export function useCanvasKeyboard(opts: UseCanvasKeyboardOpts): void {
  const { setDeck, selectedIds, setSelectedIds, disabled = false, undo, redo } = opts;

  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey) {
        handleModifierShortcut(e, undo, redo);
        return;
      }
      if (e.altKey) return;
      if (selectedIds.size === 0) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setDeck(applyDelete(selectedIds));
        setSelectedIds(new Set());
        return;
      }
      const arrow = arrowKeyDelta(e.key, e.shiftKey);
      if (arrow) {
        e.preventDefault();
        const handle =
          e.target instanceof HTMLElement
            ? e.target.closest<HTMLElement>("[data-resize-handle], [data-rotate-handle]")
            : null;
        if (handle) {
          e.stopPropagation();
          setDeck(applyHandleArrow(handle, selectedIds, arrow.dx, arrow.dy, e.shiftKey));
          return;
        }
        setDeck(applyArrowNudge(selectedIds, arrow.dx, arrow.dy));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, setDeck, selectedIds, setSelectedIds, undo, redo]);
}
