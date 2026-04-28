import type { DropTarget, ResizeBounds, ResizeHandle } from './dragLogic';

/**
 * Axis-aligned bounds of an element relative to the stage origin, in
 * slide-px. Edges + centers so we can pair-test all 9 alignment
 * candidates per axis (left↔left, left↔center, left↔right, ...).
 */
export type SnapBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
};

/**
 * A snap line to render. `axis: 'x'` is a vertical line at slide-x =
 * `position`; `axis: 'y'` is horizontal at slide-y = `position`. The
 * `start`/`end` range is along the OTHER axis, chosen to cover the
 * dragged group + the matched sibling.
 */
export type SnapGuide = {
  axis: 'x' | 'y';
  position: number;
  start: number;
  end: number;
};

/** Unrotated bounds + rotation of an element, in slide-px. */
export type SelectionBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

/** SelectionBounds plus the element's id. Used for multi-selection lists. */
export type IdBounds = SelectionBounds & { id: string };

/**
 * In-flight gesture state. Phases:
 *   - 'pending': pointer is down but hasn't crossed the drag threshold.
 *     `elementId === null` means the pointer-down landed on empty
 *     canvas; promotion takes us to 'marquee'. Non-null elementId
 *     promotes to 'dragging'.
 *   - 'marquee': empty-canvas drag is now sweeping a selection rect.
 *   - 'dragging': element drag is active. Drop target is recomputed
 *     each pointer-move from what's under the cursor.
 *   - 'resizing': pointer-down was on a resize handle.
 *   - 'rotating': pointer-down was on the rotate handle.
 */
export type Gesture =
  | {
      phase: 'pending';
      elementId: string | null;
      startClient: { x: number; y: number };
      shiftKey: boolean;
    }
  | {
      phase: 'marquee';
      startClient: { x: number; y: number };
      currentClient: { x: number; y: number };
      additive: boolean;
      initialSelection: ReadonlySet<string>;
    }
  | {
      phase: 'dragging';
      elementId: string;
      elementIds: string[];
      startClient: { x: number; y: number };
      delta: { x: number; y: number };
      drop: DropTarget | null;
      indicatorBounds: { x: number; y: number; w: number; h: number } | null;
      startGroupBounds: SnapBounds | null;
      guides: SnapGuide[];
    }
  | {
      phase: 'resizing';
      elementId: string;
      handle: ResizeHandle;
      startClient: { x: number; y: number };
      startBounds: ResizeBounds;
      startCenter: { x: number; y: number };
      rotation: number;
      layoutMode: 'absolute' | 'flex-row' | 'flex-column';
      currentBounds: ResizeBounds;
    }
  | {
      phase: 'rotating';
      elementId: string;
      centerClient: { x: number; y: number };
      startAngle: number;
      startRotation: number;
      currentRotation: number;
    };
