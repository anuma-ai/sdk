import { describe, expect, it } from "vitest";

import { ELEMENT_KINDS, renderElementKinds } from "./elementKinds";

describe("ELEMENT_KINDS", () => {
  it("covers every JSX element tag", () => {
    const tags = ELEMENT_KINDS.map((k) => k.tag).sort();
    expect(tags).toEqual(["Circle", "Group", "Icon", "Image", "Line", "Rect", "Text"]);
  });

  it("every spec includes the common geometry attrs", () => {
    const geom = ["id", "x", "y", "w", "h"];
    for (const spec of ELEMENT_KINDS) {
      const names = spec.attrs.map((a) => a.name);
      for (const g of geom) {
        // Group allows x/y/w/h to be optional but they must still appear.
        expect(names, spec.tag).toContain(g);
      }
    }
  });

  it("attr names are unique within each spec", () => {
    for (const spec of ELEMENT_KINDS) {
      const names = spec.attrs.map((a) => a.name);
      expect(new Set(names).size, spec.tag).toBe(names.length);
    }
  });

  it("only Text and Group have body content", () => {
    const withBody = ELEMENT_KINDS.filter((k) => k.body !== undefined).map((k) => k.tag);
    expect(new Set(withBody)).toEqual(new Set(["Text", "Group"]));
  });
});

describe("renderElementKinds", () => {
  it("emits an opening <Anuma.Tag …> per kind", () => {
    const prose = renderElementKinds();
    for (const spec of ELEMENT_KINDS) {
      expect(prose).toContain(`<Anuma.${spec.tag} `);
    }
  });

  it("marks optional attrs with `?`", () => {
    const prose = renderElementKinds();
    expect(prose).toContain("style?");
    expect(prose).toContain("rotation?");
    expect(prose).toContain("cornerRadius?");
  });

  it("inlines enum values for attrs that have them", () => {
    const prose = renderElementKinds();
    expect(prose).toContain(`fontRole={"heading"|"body"}`);
    expect(prose).toContain(`layout?={"absolute"|"row"|"column"}`);
  });

  it("renders self-closing syntax for leaf tags and body-text for Text", () => {
    const prose = renderElementKinds();
    expect(prose).toContain("<Anuma.Image");
    expect(prose).toContain("/>");
    expect(prose).toContain("<Anuma.Text ");
    expect(prose).toContain("</Anuma.Text>");
  });

  it("documents the style keys for tags that accept style", () => {
    const prose = renderElementKinds();
    expect(prose).toContain("style keys: fontSize, fontWeight, color");
    expect(prose).toContain("style keys: color, fontSize"); // Icon
  });

  it("emits notes under their owning kind", () => {
    const prose = renderElementKinds();
    const textIdx = prose.indexOf("<Anuma.Text ");
    const imageIdx = prose.indexOf("<Anuma.Image ");
    const typographyNoteIdx = prose.indexOf("All typography lives inside style");
    expect(textIdx).toBeGreaterThanOrEqual(0);
    expect(typographyNoteIdx).toBeGreaterThan(textIdx);
    expect(typographyNoteIdx).toBeLessThan(imageIdx);
  });
});
