"use client";

import type { AnumaNode } from "../tools/slides/jsx";
import {
  getLayoutModeOf,
  RESIZE_HANDLE_CURSORS,
  RESIZE_HANDLE_DIRS,
  type ResizeHandle,
} from "./dragLogic";
import type { Gesture, IdBounds, SelectionBounds } from "./types";

/** Visual size of resize/rotate handles in slide-px (scaled with stage). */
const HANDLE_SIZE = 10;

/** Distance from top of selection to the rotate handle, in slide-px. */
const ROTATE_HANDLE_OFFSET = 28;

const PRIMARY_COLOR = "#2563eb";
const SNAP_COLOR = "#ec4899";

export type CanvasOverlaysProps = {
  /** Current gesture (drives marquee/guides/drop-indicator visibility). */
  gesture: Gesture | null;
  /** Single primary selection (when 1 selected). Null for 0 or >1. */
  selectedId: string | null;
  /** Full selection (drives multi-outline rendering). */
  selectedIds: ReadonlySet<string>;
  /** Bounds of the primary selection. Provided by useSelectionBounds. */
  selectionBounds: SelectionBounds | null;
  /** Bounds of every selected element. Provided by useMultiSelectionBounds. */
  multiBounds: IdBounds[];
  /** Editing target id (suppresses overlays so the edit overlay is unobstructed). */
  editingId?: string | null;
  /** AST root — needed to resolve the selected element's layout mode. */
  deck: AnumaNode;
  /** Slide-px → client-px scale. */
  scale: number;
};

/**
 * Renders all canvas overlays: selection outline + handles, multi-
 * selection outlines, marquee, snap guides, flex drop indicator.
 *
 * Drawn in slide-px and scaled with the stage. Sits OUTSIDE the
 * scaled stage in the same wrapper, so its coords are post-scale
 * (multiplied by `scale` here). The marquee uses `position: fixed`
 * since gesture coords are clientX/Y (viewport-relative).
 */
export function CanvasOverlays({
  gesture,
  selectedId,
  selectedIds,
  selectionBounds,
  multiBounds,
  editingId,
  deck,
  scale,
}: CanvasOverlaysProps) {
  return (
    <>
      <SelectionWithHandles
        selectedId={selectedId}
        selectionBounds={selectionBounds}
        gesture={gesture}
        deck={deck}
        scale={scale}
        editingId={editingId}
      />
      <MultiSelectionOutlines
        bounds={multiBounds}
        scale={scale}
        visible={selectedIds.size > 1 && !editingId && !isDragOrRotate(gesture)}
      />
      <MarqueeRect gesture={gesture} />
      <SnapGuideLines gesture={gesture} scale={scale} />
      <FlexDropIndicator gesture={gesture} scale={scale} />
    </>
  );
}

function isDragOrRotate(gesture: Gesture | null): boolean {
  return gesture?.phase === "dragging" || gesture?.phase === "rotating";
}

/** Thin outlines around every selected element (no handles — handles
 *  are reserved for the size===1 single-primary case). */
function MultiSelectionOutlines({
  bounds,
  scale,
  visible,
}: {
  bounds: IdBounds[];
  scale: number;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <>
      {bounds.map((b) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: b.x * scale,
            top: b.y * scale,
            width: b.w * scale,
            height: b.h * scale,
            transform: b.rotation !== 0 ? `rotate(${b.rotation}deg)` : undefined,
            transformOrigin: "50% 50%",
            border: `1.5px solid ${PRIMARY_COLOR}`,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

/** Marquee selection rectangle. position: fixed because gesture coords
 *  are viewport-relative (clientX/Y). */
function MarqueeRect({ gesture }: { gesture: Gesture | null }) {
  if (gesture?.phase !== "marquee") return null;
  const left = Math.min(gesture.startClient.x, gesture.currentClient.x);
  const top = Math.min(gesture.startClient.y, gesture.currentClient.y);
  const width = Math.abs(gesture.currentClient.x - gesture.startClient.x);
  const height = Math.abs(gesture.currentClient.y - gesture.startClient.y);
  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width,
        height,
        border: `1px solid ${PRIMARY_COLOR}`,
        background: "rgba(37, 99, 235, 0.08)",
        pointerEvents: "none",
      }}
    />
  );
}

/** Pink alignment guide lines. One per axis (closest match wins). */
function SnapGuideLines({ gesture, scale }: { gesture: Gesture | null; scale: number }) {
  if (gesture?.phase !== "dragging") return null;
  return (
    <>
      {gesture.guides.map((g, i) => {
        const isVertical = g.axis === "x";
        const style: React.CSSProperties = isVertical
          ? {
              position: "absolute",
              left: g.position * scale - 0.5,
              top: g.start * scale,
              width: 1,
              height: (g.end - g.start) * scale,
              background: SNAP_COLOR,
              pointerEvents: "none",
            }
          : {
              position: "absolute",
              left: g.start * scale,
              top: g.position * scale - 0.5,
              width: (g.end - g.start) * scale,
              height: 1,
              background: SNAP_COLOR,
              pointerEvents: "none",
            };
        return <div key={i} style={style} />;
      })}
    </>
  );
}

/** Blue line in the gap between flex siblings showing where the
 *  dragged element will land on release. */
function FlexDropIndicator({ gesture, scale }: { gesture: Gesture | null; scale: number }) {
  if (gesture?.phase !== "dragging" || !gesture.indicatorBounds) return null;
  const { x, y, w, h } = gesture.indicatorBounds;
  return (
    <div
      style={{
        position: "absolute",
        left: x * scale,
        top: y * scale,
        width: Math.max(w * scale, 2),
        height: Math.max(h * scale, 2),
        background: PRIMARY_COLOR,
        pointerEvents: "none",
        borderRadius: 1,
      }}
    />
  );
}

/**
 * Outline + 8 resize handles + rotate handle around the primary
 * selection. Wrapped in a single rotated container so it hugs the
 * rotated element exactly instead of drawing the AABB.
 *
 * During resize, tracks `gesture.currentBounds` (live, no DOM read).
 * Otherwise tracks `selectionBounds` from the bounds hook.
 *
 * Resize handles are restricted by layout mode:
 *   - absolute: all 8.
 *   - flex column: only `s` (height adjust; cross-axis auto-stretches).
 *   - flex row: only `e` (width adjust; cross-axis auto-stretches).
 */
function visibleResizeHandles(deck: AnumaNode, selectedId: string): ResizeHandle[] {
  const mode = getLayoutModeOf(deck, selectedId);
  if (mode === "absolute") return ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  if (mode === "flex-column") return ["s"];
  return ["e"];
}

function SelectionWithHandles({
  selectedId,
  selectionBounds,
  gesture,
  deck,
  scale,
  editingId,
}: {
  selectedId: string | null;
  selectionBounds: SelectionBounds | null;
  gesture: Gesture | null;
  deck: AnumaNode;
  scale: number;
  editingId?: string | null;
}) {
  if (!selectedId || editingId || isDragOrRotate(gesture)) return null;
  const bounds = gesture?.phase === "resizing" ? gesture.currentBounds : selectionBounds;
  if (!bounds) return null;
  const rotation =
    gesture?.phase === "resizing" ? gesture.rotation : (selectionBounds?.rotation ?? 0);
  const visibleHandles = visibleResizeHandles(deck, selectedId);
  return (
    <div
      style={{
        position: "absolute",
        left: bounds.x * scale,
        top: bounds.y * scale,
        width: bounds.w * scale,
        height: bounds.h * scale,
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "50% 50%",
        // Outline frame is non-interactive; only the handles below are.
        // Lets clicks fall through to the element body for drag selection.
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `2px solid ${PRIMARY_COLOR}`,
          boxSizing: "border-box",
        }}
      />
      {visibleHandles.map((handle) => {
        const dir = RESIZE_HANDLE_DIRS[handle];
        // Handle center in LOCAL slide-px (relative to bounds top-left).
        const cxLocal = (bounds.w * (dir.dx + 1)) / 2;
        const cyLocal = (bounds.h * (dir.dy + 1)) / 2;
        return (
          <div
            key={handle}
            data-resize-handle={handle}
            style={{
              position: "absolute",
              left: cxLocal * scale - HANDLE_SIZE / 2,
              top: cyLocal * scale - HANDLE_SIZE / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: "#fff",
              border: `1.5px solid ${PRIMARY_COLOR}`,
              borderRadius: "50%",
              cursor: RESIZE_HANDLE_CURSORS[handle],
              boxSizing: "border-box",
              pointerEvents: "auto",
            }}
          />
        );
      })}
      {/* Rotate handle: floats above top-center, orbits with rotation. */}
      <div
        data-rotate-handle="true"
        style={{
          position: "absolute",
          left: (bounds.w / 2) * scale - HANDLE_SIZE / 2,
          top: -ROTATE_HANDLE_OFFSET * scale - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          background: "#fff",
          border: `1.5px solid ${PRIMARY_COLOR}`,
          borderRadius: "50%",
          cursor: "grab",
          boxSizing: "border-box",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}
