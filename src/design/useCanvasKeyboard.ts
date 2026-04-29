"use client";

import { useEffect } from "react";

import { type AnumaNode, findById, removeById } from "../tools/slides/jsx";
import { getLayoutModeOf } from "./dragLogic";

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

/**
 * Global keyboard shortcuts for the canvas:
 *   - Delete / Backspace → remove all selected elements.
 *   - Arrow keys → nudge selected absolute children by 1px (10px with Shift).
 *   - Cmd/Ctrl+Z → undo (if provided).
 *   - Cmd/Ctrl+Shift+Z, Cmd/Ctrl+Y → redo (if provided).
 *
 * Arrow nudges only apply to absolute children — flex children's
 * positions are determined by their container's layout. Mixed
 * selections nudge only the absolute members.
 *
 * Listens on `window` so shortcuts fire even when focus is on the
 * canvas wrapper or an ancestor. `disabled` should be set true while
 * inline-editing text so the contenteditable owns those keys.
 */
/** True if the event target is a text-editing field that should own its keys. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

/** Map an arrow key to a (dx, dy) step in slide-px (1px or 10px with shift). */
function arrowKeyDelta(key: string, shiftKey: boolean): { dx: number; dy: number } | null {
  const step = shiftKey ? 10 : 1;
  if (key === "ArrowLeft") return { dx: -step, dy: 0 };
  if (key === "ArrowRight") return { dx: step, dy: 0 };
  if (key === "ArrowUp") return { dx: 0, dy: -step };
  if (key === "ArrowDown") return { dx: 0, dy: step };
  return null;
}

/** Modifier-key handler (Cmd/Ctrl+Z, +Shift+Z, +Y). True if the key
 *  was handled (caller should stop). */
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

/** Delete every element in `ids` from the deck. No-op if none found. */
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

/** Translate every absolute-positioned element in `ids` by (dx, dy).
 *  Flex children are silently skipped (their position is layout-driven). */
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

export function useCanvasKeyboard(opts: UseCanvasKeyboardOpts): void {
  const { setDeck, selectedIds, setSelectedIds, disabled = false, undo, redo } = opts;

  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        handleModifierShortcut(e, undo, redo);
        return;
      }
      // Don't intercept Alt-modified keys — preserves browser shortcuts.
      if (e.altKey) return;
      // Don't steal Delete/Backspace/Arrow from text inputs the user is
      // typing into. Without this, having a canvas selection while typing
      // in a search bar or rename field would silently delete elements.
      if (isEditableTarget(e.target)) return;
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
        setDeck(applyArrowNudge(selectedIds, arrow.dx, arrow.dy));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, setDeck, selectedIds, setSelectedIds, undo, redo]);
}
