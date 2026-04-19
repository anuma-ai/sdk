import { describe, expect, it } from "vitest";

import {
  getPaletteByName,
  PALETTES,
  renderPaletteColors,
  renderPaletteNames,
  renderPalettes,
} from "./palettes";

const REQUIRED_COLOR_KEYS = [
  "background",
  "slideBg",
  "surfaceSecondary",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "accent",
  "card",
  "border",
] as const;

describe("PALETTES", () => {
  it("every palette has a non-empty name and useFor", () => {
    for (const p of PALETTES) {
      expect(p.name, JSON.stringify(p)).toBeTruthy();
      expect(p.useFor, JSON.stringify(p)).toBeTruthy();
    }
  });

  it("every palette defines all required color keys", () => {
    for (const p of PALETTES) {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(p.colors[key], `${p.name} missing ${key}`).toBeTruthy();
      }
    }
  });

  it("every color is a hex string", () => {
    const hex = /^#[0-9a-fA-F]{3,8}$/;
    for (const p of PALETTES) {
      for (const [k, v] of Object.entries(p.colors)) {
        expect(hex.test(v), `${p.name}/${k} = ${v}`).toBe(true);
      }
    }
  });

  it("palette names are unique", () => {
    const names = PALETTES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("getPaletteByName", () => {
  it("returns the palette for every catalog name", () => {
    for (const p of PALETTES) {
      expect(getPaletteByName(p.name)).toBe(p);
    }
  });

  it("returns null for unknown names", () => {
    expect(getPaletteByName("not a palette")).toBeNull();
  });
});

describe("renderPaletteNames", () => {
  it("emits name + useFor + fontPreset, no hex colors", () => {
    const prose = renderPaletteNames();
    for (const p of PALETTES) {
      expect(prose).toContain(p.name);
      expect(prose).toContain(p.useFor);
      expect(prose).toContain(`fontPreset: ${p.fontPreset}`);
    }
    expect(prose).not.toMatch(/#[0-9a-fA-F]{3,}/);
  });
});

describe("renderPaletteColors", () => {
  it("emits every hex value of the palette", () => {
    const p = PALETTES[0]!;
    const prose = renderPaletteColors(p);
    for (const [k, v] of Object.entries(p.colors)) {
      expect(prose).toContain(`${k}: ${v}`);
    }
  });
});

describe("renderPalettes", () => {
  it("emits a header line per palette containing name and useFor", () => {
    const prose = renderPalettes();
    for (const p of PALETTES) {
      expect(prose).toContain(p.name);
      expect(prose).toContain(p.useFor);
    }
  });

  it("emits fontPreset for each palette", () => {
    const prose = renderPalettes();
    for (const p of PALETTES) {
      expect(prose).toContain(`fontPreset: ${p.fontPreset}`);
    }
  });

  it("emits every hex color value so the LLM can copy it verbatim", () => {
    const prose = renderPalettes();
    for (const p of PALETTES) {
      for (const v of Object.values(p.colors)) {
        expect(prose).toContain(v);
      }
    }
  });
});
