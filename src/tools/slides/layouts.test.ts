import { describe, expect, it } from "vitest";

import type { SlideElement } from "./index";
import { LAYOUT_TEMPLATES, renderLayoutTemplates } from "./layouts";

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
