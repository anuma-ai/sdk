"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { type AnumaNode, findById, findParentOfId } from "../tools/slides/jsx";
import { findElementIdFromEvent } from "./eventHelpers";
import {
  buildSelectionAfterClick,
  detectHandleGesture,
  DRAG_THRESHOLD_SQ,
  gestureCommit,
  promotePendingToDragging,
  promotePendingToMarquee,
  transitionDraggingOnMove,
  transitionMarqueeOnMove,
  transitionResizingOnMove,
  transitionRotatingOnMove,
} from "./transitions";
import type { Gesture } from "./types";

export type UseCanvasGesturesOpts = {
  stageRef: React.RefObject<HTMLElement | null>;
  deck: AnumaNode;
  setDeck: (updater: AnumaNode | ((d: AnumaNode) => AnumaNode)) => void;
  /** Slide-px to client-px scale. Pointer math divides client deltas by this. */
  scale: number;
  /** Suppress all gestures (e.g. magic-select active in slide editor). */
  disabled?: boolean;
  /** Controlled selection. When omitted, the hook manages internal state. */
  selectedIds?: ReadonlySet<string>;
  onSelectionChange?: (ids: ReadonlySet<string>) => void;
  /** Called on double-click of a Text element. Host enters edit mode. */
  onTextDoubleClick?: (elementId: string) => void;
  /**
   * Predicate for "should we ignore this pointer-down?" — used by hosts
   * with their own overlays (e.g. the text-edit contenteditable). When
   * true, the gesture handler bails immediately.
   */
  shouldIgnorePointerDown?: (e: React.PointerEvent<HTMLElement>) => boolean;
  /**
   * Called synchronously inside `onPointerDown` BEFORE any gesture
   * starts, after `shouldIgnorePointerDown` returned false. Hosts use
   * this to commit a pending text edit (so click-elsewhere ends the
   * edit and starts a fresh gesture in the same event).
   */
  beforePointerDown?: () => void;
};

export type UseCanvasGesturesReturn = {
  selectedIds: ReadonlySet<string>;
  /** Lone selected id when size===1, else null. */
  selectedId: string | null;
  setSelectedIds: (
    ids: ReadonlySet<string> | ((prev: ReadonlySet<string>) => ReadonlySet<string>)
  ) => void;
  gesture: Gesture | null;
  /** Deck with in-flight resize/rotate patched for live rendering. */
  renderedDeck: AnumaNode;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLElement>) => void;
};

/**
 * Pointer-driven gesture state machine for an Anuma canvas.
 *
 * Handles: click-to-select, shift-click multi-select, marquee
 * selection, drag (single + multi, cross-parent + flex-reorder),
 * resize (8-handle for absolute, main-axis-only for flex), rotate,
 * snap-to-edges, double-click-to-edit-text.
 *
 * Per-phase transition logic lives in `./transitions.ts`; this hook
 * is the React glue (state, handlers, effects).
 *
 * Host responsibilities:
 *   - Render the slide tree (`renderedDeck`) into a stage element.
 *   - Wire `onPointerDown/Move/Up/Cancel` on a wrapper around the
 *     stage (the stage itself has `transform: scale()` which would
 *     distort pointer math).
 *   - Wire `onDoubleClick` on the same wrapper.
 *   - Render selection / handles / marquee / guides overlays
 *     (typically via `<CanvasOverlays>`).
 */
export function useCanvasGestures(opts: UseCanvasGesturesOpts): UseCanvasGesturesReturn {
  const {
    stageRef,
    deck,
    setDeck,
    scale,
    disabled = false,
    selectedIds: selectedIdsControlled,
    onSelectionChange,
    onTextDoubleClick,
    shouldIgnorePointerDown,
    beforePointerDown,
  } = opts;

  const [selectedIdsInternal, setSelectedIdsInternal] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const selectedIds = selectedIdsControlled ?? selectedIdsInternal;
  const selectedId = selectedIds.size === 1 ? (Array.from(selectedIds)[0] ?? null) : null;

  // Stable setter that handles both controlled and uncontrolled modes.
  // Always calls onSelectionChange (if provided) AND updates internal
  // state, so uncontrolled hosts can read via the returned `selectedIds`
  // and controlled hosts get the change via onSelectionChange.
  const setSelectedIds = useCallback(
    (next: ReadonlySet<string> | ((prev: ReadonlySet<string>) => ReadonlySet<string>)) => {
      if (typeof next === "function") {
        const fn = next;
        setSelectedIdsInternal((prev) => {
          const resolved = selectedIdsControlled ?? prev;
          const updated = fn(resolved);
          if (onSelectionChange) onSelectionChange(updated);
          return updated;
        });
      } else {
        setSelectedIdsInternal(next);
        if (onSelectionChange) onSelectionChange(next);
      }
    },
    [selectedIdsControlled, onSelectionChange]
  );

  const [gesture, setGesture] = useState<Gesture | null>(null);

  // Latest selectedIds in a ref so handlers can read the post-set
  // value within a single React turn (setState is async).
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (shouldIgnorePointerDown?.(e)) return;
      beforePointerDown?.();

      const stage = stageRef.current;
      const sel = selectedIdsRef.current;
      const selId = sel.size === 1 ? (Array.from(sel)[0] ?? null) : null;
      const pointer = { x: e.clientX, y: e.clientY };

      // Handles take priority — they're explicit grab affordances with
      // no click-vs-drag ambiguity, so capture pointer immediately.
      const handleGesture = detectHandleGesture(e.nativeEvent, deck, selId, stage, pointer, scale);
      if (handleGesture) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setGesture(handleGesture);
        return;
      }

      const id = findElementIdFromEvent(e.nativeEvent, stage);
      // Empty canvas → pending with null elementId. Either becomes a
      // marquee on threshold cross, or releases as "click empty". We
      // don't clear selection here so an additive marquee can build on
      // top of the original selection.
      // Element body → pending with the id; shift-click toggles
      // selection only (no drag arming, since toggle-off would leave
      // the user dragging a just-removed element).
      // Don't setPointerCapture here — capturing on pointerdown
      // suppresses synthesized click/dblclick in some browsers, which
      // breaks double-click-to-edit. Capture is deferred until threshold.
      if (id !== null) {
        setSelectedIds((prev) => buildSelectionAfterClick(prev, id, e.shiftKey));
      }
      if (id !== null && e.shiftKey) {
        setGesture(null);
        return;
      }
      setGesture({ phase: "pending", elementId: id, startClient: pointer, shiftKey: e.shiftKey });
    },
    [disabled, shouldIgnorePointerDown, beforePointerDown, stageRef, deck, scale, setSelectedIds]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      const id = findElementIdFromEvent(e.nativeEvent as unknown as PointerEvent, stageRef.current);
      if (!id) return;
      const node = findById(deck, id);
      if (!node || node.tag !== "Text") return;
      // Force single-selection — multi-element text editing isn't a thing.
      setSelectedIds(new Set([id]));
      setGesture(null);
      onTextDoubleClick?.(id);
    },
    [disabled, stageRef, deck, setSelectedIds, onTextDoubleClick]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!gesture) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = { x: e.clientX, y: e.clientY };

      if (gesture.phase === "pending") {
        const dx = pointer.x - gesture.startClient.x;
        const dy = pointer.y - gesture.startClient.y;
        if (dx * dx + dy * dy < DRAG_THRESHOLD_SQ) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // pointerId may no longer be active; harmless
        }
        if (gesture.elementId === null) {
          setGesture(promotePendingToMarquee(gesture, pointer, selectedIdsRef.current));
        } else {
          const next = promotePendingToDragging(
            gesture,
            deck,
            stage,
            pointer,
            scale,
            selectedIdsRef.current
          );
          if (next) setGesture(next);
        }
        return;
      }
      if (gesture.phase === "marquee") {
        const result = transitionMarqueeOnMove(gesture, pointer, stage);
        setGesture(result.gesture);
        setSelectedIds(result.selection);
        return;
      }
      if (gesture.phase === "dragging") {
        setGesture(transitionDraggingOnMove(gesture, pointer, deck, stage, scale));
        return;
      }
      if (gesture.phase === "resizing") {
        setGesture(transitionResizingOnMove(gesture, pointer, scale));
        return;
      }
      if (gesture.phase === "rotating") {
        setGesture(transitionRotatingOnMove(gesture, pointer));
      }
    },
    [gesture, stageRef, deck, scale, setSelectedIds]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // capture may not have been set; harmless
      }
      if (!gesture) return;
      // Pending click on empty canvas → clear selection (unless shift).
      // Element-pending already updated selection on down.
      if (gesture.phase === "pending" && gesture.elementId === null && !gesture.shiftKey) {
        setSelectedIds(new Set());
      }
      const updater = gestureCommit(gesture);
      if (updater) setDeck(updater);
      setGesture(null);
    },
    [gesture, setDeck, setSelectedIds]
  );

  // pointercancel fires when the OS or browser steals the pointer mid-gesture
  // (e.g. a second touch starts a scroll). Drop the in-flight gesture without
  // committing — committing at the interrupted position would leave the AST
  // in a state the user never intended.
  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // capture may not have been set; harmless
    }
    setGesture(null);
  }, []);

  useDragPreviewEffect(stageRef, gesture, deck);
  const renderedDeck = useRenderedDeck(deck, gesture);

  return {
    selectedIds,
    selectedId,
    setSelectedIds,
    gesture,
    renderedDeck,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onDoubleClick: handleDoubleClick,
  };
}

/**
 * Live drag preview — directly mutate transform/opacity on the
 * dragged DOM nodes. Drag fires too many events to round-trip through
 * React per pointer move; resize/rotate go through `renderedDeck`
 * instead.
 *
 * Cleanup re-queries by data-id rather than reusing the captured
 * element ref. If a sibling reorder happened between effect setup and
 * cleanup (drop committed → flex children re-rendered), React's
 * reconciler may have swapped this DOM node's props to a different
 * element. Re-querying ensures the inline-style restore lands on the
 * *current* DOM node for this id.
 */
function useDragPreviewEffect(
  stageRef: React.RefObject<HTMLElement | null>,
  gesture: Gesture | null,
  deck: AnumaNode
) {
  useLayoutEffect(() => {
    if (!gesture || gesture.phase !== "dragging") return;
    const stage = stageRef.current;
    if (!stage) return;
    const { elementIds, delta } = gesture;
    const restorers: Array<() => void> = [];
    for (const elementId of elementIds) {
      const el = stage.querySelector<HTMLElement>(`[data-id="${elementId}"]`);
      if (!el) continue;
      const node = findById(deck, elementId);
      const rot = typeof node?.attrs.rotation === "number" ? node.attrs.rotation : 0;
      const rotateStr = rot !== 0 ? ` rotate(${rot}deg)` : "";
      const prevTransform = el.style.transform;
      const prevOpacity = el.style.opacity;
      el.style.transform = `translate(${delta.x}px, ${delta.y}px)${rotateStr}`;
      el.style.opacity = "0.7";
      restorers.push(() => {
        const currentEl = stageRef.current?.querySelector<HTMLElement>(`[data-id="${elementId}"]`);
        if (!currentEl) return;
        currentEl.style.transform = prevTransform;
        currentEl.style.opacity = prevOpacity;
      });
    }
    return () => {
      for (const fn of restorers) fn();
    };
  }, [gesture, deck, stageRef]);
}

/**
 * Deck patched with in-flight resize/rotate so the runtime renders
 * the live state without committing every frame. Drag is NOT folded
 * in here — direct DOM mutation handles that (drag fires too many
 * events for AST round-trip).
 */
function useRenderedDeck(deck: AnumaNode, gesture: Gesture | null): AnumaNode {
  return useMemo(() => {
    if (!gesture) return deck;
    if (gesture.phase !== "resizing" && gesture.phase !== "rotating") return deck;
    const next = structuredClone(deck);
    const el = findById(next, gesture.elementId);
    if (!el) return deck;
    if (gesture.phase === "resizing") {
      const cb = gesture.currentBounds;
      // Match commitResize: a flex child only writes the main-axis dimension,
      // so the preview shouldn't inject x/y/cross-axis attrs that flip a
      // flex-stretched child to fixed-size mid-gesture.
      const layout = findParentOfId(next, gesture.elementId)?.attrs.layout;
      if (layout === "column") {
        el.attrs.h = cb.h;
      } else if (layout === "row") {
        el.attrs.w = cb.w;
      } else {
        el.attrs.x = cb.x;
        el.attrs.y = cb.y;
        el.attrs.w = cb.w;
        el.attrs.h = cb.h;
      }
    } else {
      el.attrs.rotation = gesture.currentRotation;
    }
    return next;
  }, [deck, gesture]);
}
