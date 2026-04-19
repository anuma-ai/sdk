import { describe, expect, it } from "vitest";

import type { SlideElement } from "./index";
import {
  LAYOUT_TEMPLATES,
  renderLayoutTemplates,
  renderSharedHeader,
  SHARED_HEADER_ELEMENTS,
} from "./layouts";

// Narrow runtime check that a value has the shape of a SlideElement.
// TypeScript already guarantees this at compile time; this catches mistakes
// where someone casts/any's their way around the type.
function isElementShape(e: unknown): e is SlideElement {
  if (!e || typeof e !== "object") return false;
  const el = e as Record<string, unknown>;
  if (typeof el.id !== "string" || el.id.length === 0) return false;
  if (typeof el.x !== "number" || typeof el.y !== "number") return false;
  if (typeof el.w !== "number" || typeof el.h !== "number") return false;
  return ["text", "shape", "image", "icon"].includes(el.kind as string);
}

describe("LAYOUT_TEMPLATES", () => {
  it("every template has a non-empty name", () => {
    for (const t of LAYOUT_TEMPLATES) {
      expect(t.name, JSON.stringify(t)).toBeTruthy();
    }
  });

  it("every element is a valid SlideElement shape", () => {
    for (const t of LAYOUT_TEMPLATES) {
      for (const el of t.elements) {
        expect(isElementShape(el), `${t.name} / ${(el as { id?: string }).id}`).toBe(true);
      }
    }
  });

  it("element ids are unique within each template", () => {
    for (const t of LAYOUT_TEMPLATES) {
      const ids = t.elements.map((e) => e.id);
      expect(new Set(ids).size, `${t.name} has duplicate ids`).toBe(ids.length);
    }
  });

  it("all element coordinates fit inside the 0–100 canvas", () => {
    for (const t of LAYOUT_TEMPLATES) {
      for (const el of t.elements) {
        expect(el.x, `${t.name}/${el.id} x`).toBeGreaterThanOrEqual(0);
        expect(el.x, `${t.name}/${el.id} x`).toBeLessThanOrEqual(100);
        expect(el.y, `${t.name}/${el.id} y`).toBeGreaterThanOrEqual(0);
        expect(el.y, `${t.name}/${el.id} y`).toBeLessThanOrEqual(100);
        // Allow width/height 0 for line shapes (rendered as borders).
        expect(el.w, `${t.name}/${el.id} w`).toBeGreaterThanOrEqual(0);
        expect(el.h, `${t.name}/${el.id} h`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("SHARED_HEADER_ELEMENTS", () => {
  it("has eyebrow, title, and rule", () => {
    const ids = SHARED_HEADER_ELEMENTS.map((e) => e.id);
    expect(ids).toEqual(["eyebrow", "title", "rule"]);
  });

  it("every element has a valid SlideElement shape", () => {
    for (const el of SHARED_HEADER_ELEMENTS) {
      expect(isElementShape(el), el.id).toBe(true);
    }
  });

  it("all elements stay inside the content band (y < 30) so content starts below", () => {
    for (const el of SHARED_HEADER_ELEMENTS) {
      expect(el.y + el.h, el.id).toBeLessThanOrEqual(30);
    }
  });
});

describe("renderSharedHeader", () => {
  it("emits each element id as a recipe-line prefix", () => {
    const prose = renderSharedHeader();
    for (const el of SHARED_HEADER_ELEMENTS) {
      expect(prose).toContain(`${el.id}: {`);
    }
  });

  it("includes the content-band note", () => {
    expect(renderSharedHeader()).toContain("Content below the header starts at y ≥ 30");
  });
});

describe("renderLayoutTemplates", () => {
  it("emits a section per template with the name as a header", () => {
    const prose = renderLayoutTemplates();
    for (const t of LAYOUT_TEMPLATES) {
      expect(prose).toContain(`${t.name}:`);
    }
  });

  it("emits one line per element with the id as the prefix", () => {
    const prose = renderLayoutTemplates();
    for (const t of LAYOUT_TEMPLATES) {
      for (const el of t.elements) {
        expect(prose).toContain(`${el.id}: {`);
      }
    }
  });

  it("emits notes before elements inside each template block", () => {
    const prose = renderLayoutTemplates();
    for (const t of LAYOUT_TEMPLATES) {
      if (!t.notes?.length) continue;
      const sectionStart = prose.indexOf(`${t.name}:`);
      const note = t.notes[0]!;
      const noteAt = prose.indexOf(note, sectionStart);
      expect(noteAt).toBeGreaterThan(sectionStart);
      if (t.elements.length > 0) {
        const firstElementAt = prose.indexOf(`${t.elements[0]!.id}: {`, sectionStart);
        expect(noteAt).toBeLessThan(firstElementAt);
      }
    }
  });
});
