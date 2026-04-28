/**
 * Pure AST-mutation helpers for the design sandbox. The interaction
 * layer determines INTENT (move this absolute element by [dx,dy], drop
 * this flex child at index N) and these helpers produce the next
 * AnumaNode tree. No DOM access here.
 */

import { type AnumaNode, findById, findParentOfId } from '../tools/slides/jsx';

export type LayoutMode = 'flex-row' | 'flex-column' | 'absolute';

/** Tags that act as containers (not selectable / draggable themselves). */
export const NON_SELECTABLE_TAGS: ReadonlySet<string> = new Set(['Deck', 'Slide', 'Screen']);

/**
 * Determine how a node is positioned within its parent. A node whose
 * parent has a `layout` attr of "row" or "column" is a flex child.
 * Anything else (or top-level) is absolute.
 */
export function getLayoutModeOf(deck: AnumaNode, childId: string): LayoutMode {
  const parent = findParentOfId(deck, childId);
  if (!parent) return 'absolute';
  const layout = parent.attrs.layout;
  if (layout === 'row') return 'flex-row';
  if (layout === 'column') return 'flex-column';
  return 'absolute';
}

/** True if the node's parent uses a flex layout. */
export function isFlexChild(deck: AnumaNode, childId: string): boolean {
  const mode = getLayoutModeOf(deck, childId);
  return mode === 'flex-row' || mode === 'flex-column';
}

function clone(deck: AnumaNode): AnumaNode {
  return structuredClone(deck);
}

/**
 * Where a dragged element will land on release. Computed each pointer
 * move from the element under the cursor (via elementsFromPoint) and
 * the target container's layout mode.
 *   - flex: insert at `dropIndex` in target's children, strip x/y.
 *   - absolute: insert into target with x/y/w/h in target's local
 *     space. We carry w/h here (not just x/y) because flex children
 *     don't store an explicit width — flex stretches them along the
 *     cross axis. When such a child becomes absolute it needs explicit
 *     dimensions or it collapses to content size; the caller measures
 *     the element's current visual gBCR and passes those in.
 */
export type DropTarget =
  | { kind: 'flex'; parentId: string; dropIndex: number }
  | { kind: 'absolute'; parentId: string; x: number; y: number; w: number; h: number };

/** Layout mode of a container node based on its `layout` attr. */
export function containerLayoutMode(node: AnumaNode): LayoutMode {
  if (node.attrs.layout === 'row') return 'flex-row';
  if (node.attrs.layout === 'column') return 'flex-column';
  return 'absolute';
}

/**
 * Commit a drag. Handles every case in one function so the caller
 * doesn't have to branch on same-parent vs. cross-parent vs. mode-flip:
 *   - flex → flex (same parent): reorder within parent
 *   - flex → flex (different parent): move + reindex
 *   - flex → absolute: move + add x/y at landing position
 *   - absolute → absolute (same parent): just update x/y
 *   - absolute → absolute (different parent): move + update x/y
 *   - absolute → flex: move + strip x/y, reindex
 */
export function commitDrop(deck: AnumaNode, elementId: string, target: DropTarget): AnumaNode {
  const next = clone(deck);
  const el = findById(next, elementId);
  const currentParent = findParentOfId(next, elementId);
  const newParent = findById(next, target.parentId);
  if (!el || !currentParent || !newParent) return deck;
  const currentParentId = getId(currentParent);
  const sameParent = currentParentId === target.parentId;

  if (target.kind === 'absolute') {
    el.attrs.x = target.x;
    el.attrs.y = target.y;
    // Always write w/h. For elements that were already absolute with
    // explicit dimensions this is a no-op (target.w/h come from the
    // same gBCR they're rendered from). For flex children promoted to
    // absolute, this is what prevents the collapse-to-zero-width bug.
    el.attrs.w = target.w;
    el.attrs.h = target.h;
    if (sameParent) {
      // Same-parent absolute: leave z-order alone, just update coords.
      return next;
    }
  } else {
    // Flex children carry no x/y of their own — strip them so the
    // child joins the container's flow cleanly.
    delete el.attrs.x;
    delete el.attrs.y;
  }

  // Detach from the old parent and re-insert at the target slot.
  const oldIdx = currentParent.children.findIndex(
    c => typeof c !== 'string' && getId(c) === elementId
  );
  if (oldIdx === -1) return deck;
  currentParent.children.splice(oldIdx, 1);

  if (target.kind === 'flex') {
    // dropIndex is in post-removal coords. If target is the same parent
    // we just removed from, that's already consistent.
    const np = findById(next, target.parentId);
    if (!np) return deck;
    const clamped = Math.max(0, Math.min(target.dropIndex, np.children.length));
    np.children.splice(clamped, 0, el);
  } else {
    const np = findById(next, target.parentId);
    if (!np) return deck;
    np.children.push(el);
  }
  return next;
}

function getId(node: AnumaNode): string | undefined {
  return typeof node.attrs.id === 'string' ? node.attrs.id : undefined;
}

/** Bounds in slide-px, in the element's parent's local coordinate space. */
export type ResizeBounds = { x: number; y: number; w: number; h: number };

/** Eight cardinal/intercardinal handle positions around a selected element. */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Direction of each handle in slide-px space:
 *   dx = +1 if the handle is on the east edge, -1 west, 0 along x.
 *   dy = +1 if the handle is on the south edge, -1 north, 0 along y.
 */
export const RESIZE_HANDLE_DIRS: Record<ResizeHandle, { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }> = {
  nw: { dx: -1, dy: -1 },
  n: { dx: 0, dy: -1 },
  ne: { dx: 1, dy: -1 },
  e: { dx: 1, dy: 0 },
  se: { dx: 1, dy: 1 },
  s: { dx: 0, dy: 1 },
  sw: { dx: -1, dy: 1 },
  w: { dx: -1, dy: 0 },
};

/** CSS cursor value for each handle, so the user gets the right grab affordance. */
export const RESIZE_HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

/**
 * Commit a resize.
 *   - Absolute children: write x/y/w/h (full resize freedom).
 *   - Flex column children: write h only. The container's layout
 *     determines position and the cross-axis (width) auto-stretches;
 *     writing an explicit w would lock the child to its current
 *     stretched width and break that auto-fill behavior the next time
 *     the container resizes.
 *   - Flex row children: symmetrically, write w only.
 *
 * The interaction layer paired with this only exposes the main-axis
 * handle (s for column, e for row) on flex children, so the cross-axis
 * dimension never gets touched in practice. This commit shape is the
 * defensive backstop in case future call sites take a different path.
 */
export function commitResize(deck: AnumaNode, elementId: string, bounds: ResizeBounds): AnumaNode {
  const next = clone(deck);
  const el = findById(next, elementId);
  if (!el) return deck;
  const parent = findParentOfId(next, elementId);
  const layout = parent?.attrs.layout;
  if (layout === 'column') {
    el.attrs.h = bounds.h;
  } else if (layout === 'row') {
    el.attrs.w = bounds.w;
  } else {
    el.attrs.x = bounds.x;
    el.attrs.y = bounds.y;
    el.attrs.w = bounds.w;
    el.attrs.h = bounds.h;
  }
  return next;
}

/**
 * Commit a rotation. Writes `attrs.rotation` (degrees). The runtime
 * applies it as `transform: rotate(...)` regardless of layout mode,
 * so this works identically for absolute and flex children.
 */
export function commitRotation(deck: AnumaNode, elementId: string, rotation: number): AnumaNode {
  const next = clone(deck);
  const el = findById(next, elementId);
  if (!el) return deck;
  el.attrs.rotation = rotation;
  return next;
}

/**
 * True if all the given ids are absolute children of the same parent
 * (and that parent isn't a flex container). This is the V0 condition
 * for multi-drag: translating N elements by the same delta only makes
 * sense when they share a coordinate frame (same parent's local space)
 * and have x/y to translate (absolute, not flex). Mixed-parent or
 * flex-included selections fall back to single-element drag.
 */
export function canMultiDrag(deck: AnumaNode, ids: string[]): boolean {
  if (ids.length <= 1) return false;
  const firstId = ids[0];
  if (firstId === undefined) return false;
  const firstParent = findParentOfId(deck, firstId);
  if (!firstParent) return false;
  if (firstParent.attrs.layout === 'row' || firstParent.attrs.layout === 'column') return false;
  for (const id of ids) {
    if (findParentOfId(deck, id) !== firstParent) return false;
  }
  return true;
}

/**
 * Translate every element in `elementIds` by `delta` (in their parent's
 * local slide-px). Used for multi-drag commits. Elements without
 * explicit attrs.x/y (flex children) are silently skipped — they
 * shouldn't be in the set anyway per the canMultiDrag gate, but the
 * defensive skip keeps a stray flex child from breaking the commit.
 */
export function commitMultiDrag(
  deck: AnumaNode,
  elementIds: readonly string[],
  delta: { x: number; y: number }
): AnumaNode {
  if (elementIds.length === 0) return deck;
  if (delta.x === 0 && delta.y === 0) return deck;
  const next = clone(deck);
  let any = false;
  for (const id of elementIds) {
    const el = findById(next, id);
    if (!el) continue;
    if (typeof el.attrs.x !== 'number' || typeof el.attrs.y !== 'number') continue;
    el.attrs.x += delta.x;
    el.attrs.y += delta.y;
    any = true;
  }
  return any ? next : deck;
}

/**
 * Replace a Text node's children with a single string. The runtime
 * stores text as one or more string children of an `<Anuma.Text>`
 * node; we collapse to a single string on commit (which preserves
 * line breaks in the string itself).
 *
 * No-op if the node isn't found, or if the supplied text matches the
 * existing content (avoids spurious AST diffs / re-renders for
 * commits triggered by blur with no actual change).
 */
export function commitTextChange(deck: AnumaNode, elementId: string, newText: string): AnumaNode {
  const existing = findById(deck, elementId);
  if (!existing) return deck;
  if (getTextContent(existing) === newText) return deck;
  const next = clone(deck);
  const el = findById(next, elementId);
  if (!el) return deck;
  el.children = [newText];
  return next;
}

/**
 * Read the plain-text content of a node by joining its string children.
 * Non-string children (nested AnumaNodes) are skipped; for simple Text
 * elements that's the entire content.
 */
export function getTextContent(node: AnumaNode): string {
  return node.children.filter((c): c is string => typeof c === 'string').join('');
}
