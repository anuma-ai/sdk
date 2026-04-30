import { describe, expect, it } from "vitest";

import type { SlideElement } from "./index";
import {
  getLayoutByName,
  LAYOUT_TEMPLATES,
  renderLayoutCatalog,
  renderLayoutRecipes,
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

describe("getLayoutByName", () => {
  it("returns the template for every catalog name", () => {
    for (const t of LAYOUT_TEMPLATES) {
      expect(getLayoutByName(t.name), t.name).toBe(t);
    }
  });

  it("returns null for unknown names", () => {
    expect(getLayoutByName("DOES NOT EXIST")).toBeNull();
  });
});

describe("LAYOUT_TEMPLATES descriptions", () => {
  it("every template has a non-empty description", () => {
    for (const t of LAYOUT_TEMPLATES) {
      expect(t.description, t.name).toBeTruthy();
    }
  });

  it("names are unique", () => {
    const names = LAYOUT_TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("names are short kebab-case identifiers (no spaces or parens)", () => {
    for (const t of LAYOUT_TEMPLATES) {
      expect(t.name, t.name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});

describe("renderLayoutCatalog", () => {
  it("emits one bullet line per template", () => {
    const prose = renderLayoutCatalog();
    const lines = prose.split("\n").filter((l) => l.startsWith("- "));
    expect(lines.length).toBe(LAYOUT_TEMPLATES.length);
  });

  it("includes every layout name + description exactly once", () => {
    const prose = renderLayoutCatalog();
    for (const t of LAYOUT_TEMPLATES) {
      const marker = `- ${t.name} — ${t.description}`;
      const occurrences = prose.split(marker).length - 1;
      expect(occurrences, t.name).toBe(1);
    }
  });
});

describe("renderLayoutRecipes", () => {
  it("emits recipes only for the names passed", () => {
    const names = [LAYOUT_TEMPLATES[0]!.name, LAYOUT_TEMPLATES[LAYOUT_TEMPLATES.length - 1]!.name];
    const prose = renderLayoutRecipes(names);
    for (const t of LAYOUT_TEMPLATES) {
      const marker = `${t.name} — ${t.description}:`;
      const occurrences = prose.split(marker).length - 1;
      expect(occurrences, t.name).toBe(names.includes(t.name) ? 1 : 0);
    }
  });

  it("dedupes when the same name is passed twice", () => {
    const t = LAYOUT_TEMPLATES[0]!;
    const prose = renderLayoutRecipes([t.name, t.name, t.name]);
    const marker = `${t.name} — ${t.description}:`;
    expect(prose.split(marker).length - 1).toBe(1);
  });

  it("silently skips unknown names", () => {
    const t = LAYOUT_TEMPLATES[0]!;
    const prose = renderLayoutRecipes([t.name, "does-not-exist", t.name]);
    const marker = `${t.name} — ${t.description}:`;
    expect(prose.split(marker).length - 1).toBe(1);
    expect(prose).not.toContain("does-not-exist");
  });

  it("returns empty string when no names are known", () => {
    expect(renderLayoutRecipes([])).toBe("");
    expect(renderLayoutRecipes(["not-real"])).toBe("");
  });
});

describe("renderLayoutTemplates", () => {
  it("emits a section per template with name + description as header", () => {
    const prose = renderLayoutTemplates();
    for (const t of LAYOUT_TEMPLATES) {
      expect(prose).toContain(`${t.name} — ${t.description}:`);
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
      const header = `${t.name} — ${t.description}:`;
      const sectionStart = prose.indexOf(header);
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
