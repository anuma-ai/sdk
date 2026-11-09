import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnumaShadowIsolationProvider, renderAnumaTree } from "../react/anumaRuntime";
import { type AnumaNode, findById } from "../tools/slides/jsx";
import { computeFlexDropTarget, findContainerAt, resolveDropTarget } from "./dropTarget";
import { findElementIdFromEvent, findElementsInRect } from "./eventHelpers";
import { CanvasOverlays } from "./overlays";
import {
  detectHandleGesture,
  promotePendingToDragging,
  transitionDraggingOnMove,
} from "./transitions";
import { useCanvasGestures } from "./useCanvasGestures";
import { useMultiSelectionBounds, useSelectionBounds } from "./useSelectionBounds";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "elementsFromPoint");
});

const deck: AnumaNode = {
  tag: "Slide",
  attrs: { id: "slide" },
  children: [
    { tag: "Rect", attrs: { id: "rect", x: 100, y: 80, w: 120, h: 60 }, children: [] },
    { tag: "Rect", attrs: { id: "other", x: 320, y: 300, w: 120, h: 60 }, children: [] },
    {
      tag: "Group",
      attrs: { id: "group", layout: "row", x: 500, y: 40, w: 200, h: 200 },
      children: [{ tag: "Rect", attrs: { id: "child", w: 40, h: 40 }, children: [] }],
    },
  ],
};

function measure(el: HTMLElement, x: number, y: number, w: number, h: number) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue(new DOMRect(x, y, w, h));
}

function mockHits(root: Document | ShadowRoot, hits: Element[]) {
  const hitTest = vi.fn((_x: number, _y: number) => hits);
  Object.defineProperty(root, "elementsFromPoint", { configurable: true, value: hitTest });
  return hitTest;
}

function fixture(isolated = true) {
  const { container } = render(
    <div data-testid="stage">
      {isolated ? (
        renderAnumaTree(deck)
      ) : (
        <AnumaShadowIsolationProvider enabled={false}>
          {renderAnumaTree(deck)}
        </AnumaShadowIsolationProvider>
      )}
    </div>
  );
  const stage = screen.getByTestId("stage");
  const slide = container.querySelector<HTMLElement>('[data-id="slide"]')!;
  const root = slide.shadowRoot ?? slide;
  const rect = root.querySelector<HTMLElement>('[data-id="rect"]')!;
  const other = root.querySelector<HTMLElement>('[data-id="other"]')!;
  const group = root.querySelector<HTMLElement>('[data-id="group"]')!;
  const child = root.querySelector<HTMLElement>('[data-id="child"]')!;
  measure(stage, 50, 30, 480, 270);
  measure(slide, 50, 30, 480, 270);
  measure(rect, 100, 70, 60, 30);
  measure(other, 210, 180, 60, 30);
  measure(group, 300, 50, 100, 100);
  measure(child, 310, 60, 20, 20);
  const documentHit = mockHits(
    document,
    isolated ? [slide, stage] : [rect, child, group, slide, stage]
  );
  const shadowHit = slide.shadowRoot ? mockHits(slide.shadowRoot, [rect, child, group]) : null;
  return { stage, slide, rect, other, group, child, documentHit, shadowHit };
}

describe.each([true, false])("canvas elements with shadow isolation %s", (isolated) => {
  it("measures selections and displays the resize and rotate controls", () => {
    const { stage, slide, rect } = fixture(isolated);
    expect(Boolean(slide.shadowRoot)).toBe(isolated);
    expect(stage.querySelector('[data-id="rect"]')).toBe(isolated ? null : rect);
    const stageRef = { current: stage };
    const selectedIds = new Set(["rect", "other"]);
    const { result } = renderHook(() => ({
      single: useSelectionBounds(stageRef, "rect", deck, 0.5),
      multi: useMultiSelectionBounds(stageRef, selectedIds, deck, 0.5),
    }));

    expect(result.current.single).toEqual({ x: 100, y: 80, w: 120, h: 60, rotation: 0 });
    expect(result.current.multi).toEqual([
      { id: "rect", x: 100, y: 80, w: 120, h: 60, rotation: 0 },
      { id: "other", x: 320, y: 300, w: 120, h: 60, rotation: 0 },
    ]);
    render(
      <CanvasOverlays
        gesture={null}
        selectedId="rect"
        selectedIds={new Set(["rect"])}
        selectionBounds={result.current.single}
        multiBounds={[]}
        deck={deck}
        scale={0.5}
      />
    );
    expect(document.querySelectorAll("[data-resize-handle]")).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Rotate selection" })).toBeDefined();
  });

  it.each(["resize", "rotate"])("starts a %s gesture for a shadow child", (kind) => {
    const { stage } = fixture(isolated);
    const handle = document.createElement("button");
    if (kind === "resize") handle.dataset.resizeHandle = "se";
    else handle.dataset.rotateHandle = "true";
    const event = new PointerEvent("pointerdown");
    vi.spyOn(event, "composedPath").mockReturnValue([handle]);

    const gesture = detectHandleGesture(event, deck, "rect", stage, { x: 160, y: 100 }, 0.5);

    expect(gesture).toMatchObject({
      phase: kind === "resize" ? "resizing" : "rotating",
      elementId: "rect",
    });
    if (gesture?.phase === "resizing") {
      expect(gesture.startBounds).toEqual({ x: 100, y: 80, w: 120, h: 60 });
    }
    if (gesture?.phase === "rotating") {
      expect(gesture.centerClient).toEqual({ x: 130, y: 85 });
    }
  });

  it("selects elements with the marquee inside the stage or the slide host", () => {
    const { stage, slide } = fixture(isolated);
    const rect = { left: 120, right: 140, top: 80, bottom: 90 };

    expect(findElementsInRect(stage, rect)).toEqual(["rect"]);
    expect(findElementsInRect(slide, rect)).toEqual(["rect"]);
  });

  it("measures the drag bounds and snaps to another element", () => {
    const { stage, other } = fixture(isolated);
    measure(other, 170, 180, 60, 30);
    const drag = promotePendingToDragging(
      { phase: "pending", elementId: "rect", startClient: { x: 100, y: 70 }, shiftKey: false },
      deck,
      stage,
      { x: 109, y: 70 },
      0.5,
      new Set(["rect"])
    );

    expect(drag?.startGroupBounds).toEqual({
      left: 100,
      right: 220,
      top: 80,
      bottom: 140,
      cx: 160,
      cy: 110,
    });
    const moved = transitionDraggingOnMove(drag!, { x: 109, y: 70 }, deck, stage, 0.5);
    expect(moved.delta.x).toBe(20);
    expect(moved.guides).toContainEqual(expect.objectContaining({ axis: "x", position: 240 }));
  });

  it("finds the deepest drop container and measures its flex insertion slot", () => {
    const { stage, group, documentHit, shadowHit } = fixture(isolated);
    const pointer = { x: 350, y: 100 };

    expect(findContainerAt(stage, "rect", pointer)).toBe(group);
    expect(documentHit).toHaveBeenCalledWith(pointer.x, pointer.y);
    if (shadowHit) expect(shadowHit).toHaveBeenCalledWith(pointer.x, pointer.y);
    expect(computeFlexDropTarget(stage, "group", "rect", "row", pointer, 0.5)).toEqual({
      index: 1,
      bounds: { x: 560, y: 40, w: 4, h: 200 },
    });
    expect(resolveDropTarget(deck, stage, "rect", pointer, 0.5)?.drop).toEqual({
      kind: "flex",
      parentId: "group",
      dropIndex: 1,
    });
  });

  it("measures the slide children for flex drops", () => {
    const { stage, slide } = fixture(isolated);
    const pointer = { x: 450, y: 100 };
    const expected = { index: 2, bounds: { x: 700, y: 0, w: 4, h: 540 } };

    expect(computeFlexDropTarget(stage, "slide", "rect", "row", pointer, 0.5)).toEqual(expected);
    expect(computeFlexDropTarget(slide, "slide", "rect", "row", pointer, 0.5)).toEqual(expected);
  });

  it("measures absolute drops inside the target container", () => {
    const { stage, rect } = fixture(isolated);
    measure(rect, 320, 80, 60, 30);
    const absoluteDeck = structuredClone(deck);
    delete findById(absoluteDeck, "group")!.attrs.layout;

    expect(resolveDropTarget(absoluteDeck, stage, "rect", { x: 350, y: 100 }, 0.5)?.drop).toEqual({
      kind: "absolute",
      parentId: "group",
      x: 40,
      y: 60,
      w: 120,
      h: 60,
    });
  });

  it("applies the drag preview and restores the element after pointer cancel", () => {
    const { stage, rect } = fixture(isolated);
    rect.style.transform = "rotate(0deg)";
    rect.style.opacity = "0.9";
    const stageRef = { current: stage };
    const { result } = renderHook(() =>
      useCanvasGestures({ stageRef, deck, setDeck: vi.fn(), scale: 0.5 })
    );
    stage.setPointerCapture = vi.fn();
    stage.releasePointerCapture = vi.fn();
    const down = new PointerEvent("pointerdown");
    vi.spyOn(down, "composedPath").mockReturnValue([rect, stage]);
    const pointer = {
      nativeEvent: down,
      currentTarget: stage,
      pointerId: 1,
      clientX: 100,
      clientY: 70,
      shiftKey: false,
    } as React.PointerEvent<HTMLElement>;
    act(() => result.current.onPointerDown(pointer));
    act(() => result.current.onPointerMove({ ...pointer, clientX: 112, clientY: 78 }));

    expect(result.current.gesture?.phase).toBe("dragging");
    expect(rect.style.transform).toBe("translate(24px, 16px)");
    expect(rect.style.opacity).toBe("0.7");
    act(() => result.current.onPointerCancel(pointer));
    expect(rect.style.transform).toBe("rotate(0deg)");
    expect(rect.style.opacity).toBe("0.9");
  });
});

it("ignores external containers and descendants of the dragged element across shadow roots", () => {
  const { stage, slide, rect, group } = fixture();
  const external = document.createElement("div");
  external.dataset.anumaTag = "Group";
  document.body.append(external);
  const nestedRoot = rect.attachShadow({ mode: "open" });
  const descendant = document.createElement("div");
  descendant.dataset.anumaTag = "Group";
  nestedRoot.append(descendant);
  mockHits(document, [external, slide, stage]);
  mockHits(slide.shadowRoot!, [rect, group]);
  mockHits(nestedRoot, [descendant, rect, group]);

  expect(findContainerAt(stage, "rect", { x: 350, y: 100 })).toBe(group);
  external.remove();
});

it("uses the composed event path to select an isolated slide child", () => {
  const { stage, rect } = fixture();
  let selected: string | null = null;
  stage.addEventListener("pointerdown", (event) => {
    selected = findElementIdFromEvent(event, stage);
  });

  fireEvent(rect, new PointerEvent("pointerdown", { bubbles: true, composed: true }));

  expect(selected).toBe("rect");
});
