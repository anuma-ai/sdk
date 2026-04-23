import { describe, expect, it } from "vitest";

import { ELEMENT_KINDS, renderElementKinds } from "./elementKinds";

describe("ELEMENT_KINDS", () => {
  it("covers every SlideElement discriminant", () => {
    const names = ELEMENT_KINDS.map((k) => k.name).sort();
    expect(names).toEqual(["icon", "image", "shape", "text"]);
  });

  it("every spec leads with a literal `kind` value", () => {
    for (const spec of ELEMENT_KINDS) {
      const first = spec.fields[0];
      expect(first, spec.name).toBeDefined();
      expect(first!.name).toBe("kind");
      expect("value" in first!).toBe(true);
      expect((first as { value: string }).value).toBe(`"${spec.name}"`);
    }
  });

  it("every spec includes the common geometry fields", () => {
    const geom = ["id", "x", "y", "w", "h"];
    for (const spec of ELEMENT_KINDS) {
      const names = spec.fields.map((f) => f.name);
      for (const g of geom) {
        expect(names, spec.name).toContain(g);
      }
    }
  });

  it("field names are unique within each spec", () => {
    for (const spec of ELEMENT_KINDS) {
      const names = spec.fields.map((f) => f.name);
      expect(new Set(names).size, spec.name).toBe(names.length);
    }
  });
});

describe("renderElementKinds", () => {
  it("emits one opening line per kind", () => {
    const prose = renderElementKinds();
    for (const spec of ELEMENT_KINDS) {
      expect(prose).toContain(`${spec.name}: {`);
    }
  });

  it("marks optional fields with `?`", () => {
    const prose = renderElementKinds();
    expect(prose).toContain("align?");
    expect(prose).toContain("fontFamily?");
    expect(prose).toContain("cornerRadius?");
  });

  it("inlines enum values for fields that have them", () => {
    const prose = renderElementKinds();
    expect(prose).toContain(`fontRole: "heading"|"body"`);
    expect(prose).toContain(`shape: "rect"|"circle"|"line"`);
  });

  it("emits notes under their owning kind", () => {
    const prose = renderElementKinds();
    const textIdx = prose.indexOf("text: {");
    const shapeIdx = prose.indexOf("shape: {");
    const noteIdx = prose.indexOf("fontFamily is optional");
    expect(textIdx).toBeGreaterThanOrEqual(0);
    expect(noteIdx).toBeGreaterThan(textIdx);
    expect(noteIdx).toBeLessThan(shapeIdx);
  });
});
