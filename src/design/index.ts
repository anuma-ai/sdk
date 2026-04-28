/**
 * Canvas editor: pointer-driven gesture system for an Anuma slide /
 * design canvas. Replaces react-moveable with an AST-as-truth model
 * where every gesture commits a new AnumaNode tree.
 *
 * Host wires:
 *   - useCanvasGestures → state machine + pointer handlers + renderedDeck
 *   - useSelectionBounds + useMultiSelectionBounds → for overlay rendering
 *   - useCanvasKeyboard → delete + arrow nudges + undo/redo shortcuts
 *   - useDeckHistory → optional, only when host doesn't already have a
 *     deck-state owner
 *   - <CanvasOverlays /> → outline, handles, marquee, snap guides, drop indicator
 *
 * Pure helpers (commitDrop, commitResize, etc.) live in `dragLogic`.
 */

export type { DropTarget, LayoutMode, ResizeBounds, ResizeHandle } from './dragLogic';
export {
  canMultiDrag,
  commitDrop,
  commitMultiDrag,
  commitResize,
  commitRotation,
  commitTextChange,
  containerLayoutMode,
  getLayoutModeOf,
  getTextContent,
  isFlexChild,
  NON_SELECTABLE_TAGS,
  RESIZE_HANDLE_CURSORS,
  RESIZE_HANDLE_DIRS,
} from './dragLogic';
export { computeFlexDropTarget, findContainerAt, resolveDropTarget } from './dropTarget';
export {
  findElementIdFromEvent,
  findElementsInRect,
  findResizeHandleFromEvent,
  findRotateHandleFromEvent,
} from './eventHelpers';
export type { CanvasOverlaysProps } from './overlays';
export { CanvasOverlays } from './overlays';
export { computeSnap, getStageRelativeBounds, unionBounds } from './snap';
export type { Gesture, IdBounds, SelectionBounds, SnapBounds, SnapGuide } from './types';
export type { UseCanvasGesturesOpts, UseCanvasGesturesReturn } from './useCanvasGestures';
export { useCanvasGestures } from './useCanvasGestures';
export type { UseCanvasKeyboardOpts } from './useCanvasKeyboard';
export { useCanvasKeyboard } from './useCanvasKeyboard';
export type { UseDeckHistoryReturn } from './useDeckHistory';
export { useDeckHistory } from './useDeckHistory';
export { useMultiSelectionBounds, useSelectionBounds } from './useSelectionBounds';
