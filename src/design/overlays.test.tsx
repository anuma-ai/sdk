import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { type AnumaNode, findById } from "../tools/slides/jsx";
import { CanvasOverlays } from "./overlays";
import type { SelectionBounds } from "./types";
import { useCanvasKeyboard } from "./useCanvasKeyboard";
import { useDeckHistory } from "./useDeckHistory";

afterEach(cleanup);

const initialBounds: SelectionBounds = { x: 100, y: 80, w: 120, h: 60, rotation: 0 };

function makeDeck(attrs: AnumaNode["attrs"] = {}, layout?: string): AnumaNode {
  return {
    tag: "Slide",
    attrs: layout ? { id: "slide", layout } : { id: "slide" },
    children: [{ tag: "Rect", attrs: { id: "rect", ...initialBounds, ...attrs }, children: [] }],
  };
}

function Canvas({
  initial = makeDeck(),
  disabled = false,
  scale = 1,
}: {
  initial?: AnumaNode;
  disabled?: boolean;
  scale?: number;
}) {
  const history = useDeckHistory(initial);
  const selectedIds = new Set(["rect"]);
  useCanvasKeyboard({ ...history, selectedIds, setSelectedIds: () => {}, disabled });
  const attrs = findById(history.deck, "rect")?.attrs ?? {};
  const bounds = { ...initialBounds };
  for (const key of ["x", "y", "w", "h", "rotation"] as const) {
    if (typeof attrs[key] === "number") bounds[key] = attrs[key];
  }
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <output data-testid="attrs">{JSON.stringify(attrs)}</output>
      <CanvasOverlays
        gesture={null}
        selectedId="rect"
        selectedIds={selectedIds}
        selectionBounds={bounds}
        multiBounds={[]}
        deck={history.deck}
        scale={scale}
      />
    </form>
  );
}

function readAttrs(): AnumaNode["attrs"] {
  return JSON.parse(screen.getByTestId("attrs").textContent ?? "{}");
}

function resizeHandle(direction: string): HTMLElement {
  const handle = document.querySelector<HTMLElement>(`[data-resize-handle="${direction}"]`);
  if (!handle) throw new Error("The resize handle does not exist.");
  return handle;
}

function rotateHandle(): HTMLElement {
  const handle = document.querySelector<HTMLElement>("[data-rotate-handle]");
  if (!handle) throw new Error("The rotate handle does not exist.");
  return handle;
}

describe("canvas handle keyboard access", () => {
  it("provides named buttons with visible focus and keyboard instructions", () => {
    render(<Canvas />);

    const labels = [
      "Resize top left",
      "Resize top",
      "Resize top right",
      "Resize right",
      "Resize bottom right",
      "Resize bottom",
      "Resize bottom left",
      "Resize left",
      "Rotate selection",
    ];
    expect(screen.getAllByRole("button")).toHaveLength(labels.length);
    for (const label of labels) {
      const button = screen.getByRole("button", { name: label });
      expect(button.getAttribute("type")).toBe("button");
      expect(button.tabIndex).toBe(0);
      expect(button.getAttribute("aria-description")).toContain("arrow keys");
      button.focus();
      expect(document.activeElement).toBe(button);
      expect(button.style.outlineWidth).toBe("2px");
      expect(button.style.outlineStyle).toBe("solid");
      button.blur();
      expect(button.style.outline).toBe("");
    }
  });

  it.each([
    ["nw", "ArrowLeft", { x: 99, y: 80, w: 121, h: 60 }],
    ["n", "ArrowUp", { x: 100, y: 79, w: 120, h: 61 }],
    ["ne", "ArrowUp", { x: 100, y: 79, w: 120, h: 61 }],
    ["e", "ArrowRight", { x: 100, y: 80, w: 121, h: 60 }],
    ["se", "ArrowDown", { x: 100, y: 80, w: 120, h: 61 }],
    ["s", "ArrowDown", { x: 100, y: 80, w: 120, h: 61 }],
    ["sw", "ArrowLeft", { x: 99, y: 80, w: 121, h: 60 }],
    ["w", "ArrowLeft", { x: 99, y: 80, w: 121, h: 60 }],
  ])("resizes the %s handle without a canvas nudge", (direction, key, expected) => {
    render(<Canvas />);

    expect(fireEvent.keyDown(resizeHandle(direction), { key })).toBe(false);

    expect(readAttrs()).toMatchObject({ ...expected, rotation: 0 });
  });

  it("supports repeated resize keys, larger steps, and the minimum size at any scale", () => {
    render(<Canvas scale={0.5} />);
    const handle = resizeHandle("e");
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(handle, { key: "ArrowRight", repeat: true });
    expect(readAttrs()).toMatchObject({ x: 100, y: 80, w: 131, h: 60 });

    for (let i = 0; i < 15; i++) {
      fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    }
    expect(readAttrs()).toMatchObject({ x: 100, y: 80, w: 8, h: 60 });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(readAttrs()).toMatchObject({ x: 100, y: 80, w: 8, h: 60 });
  });

  it.each([
    ["row", "e", "ArrowRight", "w", 121],
    ["column", "s", "ArrowDown", "h", 61],
  ])("resizes auto-sized %s children on the layout axis", (layout, handle, key, axis, size) => {
    const initial = makeDeck({}, layout);
    const node = findById(initial, "rect")!;
    node.attrs = { id: "rect" };
    render(<Canvas initial={initial} />);

    expect(document.querySelectorAll("[data-resize-handle]")).toHaveLength(1);
    fireEvent.keyDown(resizeHandle(handle), { key });

    expect(readAttrs()).toEqual({ id: "rect", [axis]: size });
  });

  it("keeps the opposite edge fixed when the element has a rotation", () => {
    render(<Canvas initial={makeDeck({ rotation: 90 })} />);

    fireEvent.keyDown(resizeHandle("e"), { key: "ArrowDown", shiftKey: true });

    expect(readAttrs()).toMatchObject({ x: 95, y: 85, w: 130, h: 60, rotation: 90 });
  });

  it("keeps nested coordinates in the parent coordinate space", () => {
    const initial: AnumaNode = {
      tag: "Slide",
      attrs: {},
      children: [{ ...makeDeck(), tag: "Group", attrs: { x: 300, y: 200 } }],
    };
    render(<Canvas initial={initial} />);

    fireEvent.keyDown(resizeHandle("w"), { key: "ArrowLeft" });

    expect(readAttrs()).toMatchObject({ x: 99, y: 80, w: 121, h: 60 });
  });

  it("rotates in both directions with larger steps and retains position and size", () => {
    render(<Canvas initial={makeDeck({ rotation: 20 })} />);
    const handle = rotateHandle();

    expect(fireEvent.keyDown(handle, { key: "ArrowRight" })).toBe(false);
    expect(readAttrs().rotation).toBe(21);
    fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
    expect(readAttrs().rotation).toBe(36);
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "ArrowUp", shiftKey: true });
    expect(readAttrs()).toMatchObject({ ...initialBounds, rotation: 20 });
  });

  it("supports undo and redo for handle operations and preserves focus", () => {
    render(<Canvas />);
    const resize = resizeHandle("e");
    resize.focus();
    fireEvent.keyDown(resize, { key: "ArrowRight" });
    expect(document.activeElement).toBe(resize);
    fireEvent.keyDown(resize, { key: "z", ctrlKey: true });
    expect(readAttrs().w).toBe(120);
    fireEvent.keyDown(resize, { key: "z", ctrlKey: true, shiftKey: true });
    expect(readAttrs().w).toBe(121);

    const rotate = rotateHandle();
    rotate.focus();
    fireEvent.keyDown(rotate, { key: "ArrowRight" });
    expect(document.activeElement).toBe(rotate);
    fireEvent.keyDown(rotate, { key: "z", metaKey: true });
    expect(readAttrs().rotation).toBe(0);
    fireEvent.keyDown(rotate, { key: "z", metaKey: true, shiftKey: true });
    expect(readAttrs().rotation).toBe(1);
  });

  it("leaves Tab, modified arrows, and disabled shortcuts alone", () => {
    const { rerender } = render(<Canvas />);
    const handle = resizeHandle("e");
    for (const event of [
      { key: "Tab" },
      { key: "ArrowRight", altKey: true },
      { key: "ArrowRight", ctrlKey: true },
      { key: "ArrowRight", metaKey: true },
    ]) {
      expect(fireEvent.keyDown(handle, event)).toBe(true);
    }
    expect(readAttrs()).toMatchObject(initialBounds);

    rerender(<Canvas disabled />);
    expect(fireEvent.keyDown(handle, { key: "ArrowRight" })).toBe(true);
    expect(readAttrs()).toMatchObject(initialBounds);
  });

  it("still moves the selection with canvas arrow keys", () => {
    render(<Canvas />);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(readAttrs()).toMatchObject({ ...initialBounds, x: 101 });
  });
});
