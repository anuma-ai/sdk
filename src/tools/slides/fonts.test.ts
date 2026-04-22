import { describe, expect, it } from "vitest";

import { FONT_PRESETS } from "./index";
import {
  buildFontsUrl,
  FONT_LIBRARY,
  getFontByName,
  isKnownFont,
  renderFontLibrary,
} from "./fonts";

describe("FONT_LIBRARY", () => {
  it("names are unique", () => {
    const names = FONT_LIBRARY.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every font has a non-empty name, category, feel", () => {
    for (const f of FONT_LIBRARY) {
      expect(f.name, JSON.stringify(f)).toBeTruthy();
      expect(f.category, f.name).toBeTruthy();
      expect(f.feel, f.name).toBeTruthy();
    }
  });

  it("weights (when present) are semicolon-separated digit groups", () => {
    for (const f of FONT_LIBRARY) {
      if (f.weights === "") continue;
      expect(f.weights, f.name).toMatch(/^\d+(;\d+)*$/);
    }
  });

  it("covers the 40 Google Fonts plus the families referenced by FONT_PRESETS", () => {
    // Every preset's heading and body font must resolve in the library —
    // otherwise a deck using that preset would have no fontFamily fallback.
    for (const [name, p] of Object.entries(FONT_PRESETS)) {
      expect(isKnownFont(p.heading), `preset '${name}' heading '${p.heading}'`).toBe(true);
      expect(isKnownFont(p.body), `preset '${name}' body '${p.body}'`).toBe(true);
    }
  });

  it("includes the user's 40 named Google Fonts", () => {
    const required = [
      "Inter",
      "Roboto",
      "Open Sans",
      "Lato",
      "Montserrat",
      "Poppins",
      "Source Sans Pro",
      "Raleway",
      "Nunito",
      "Playfair Display",
      "Merriweather",
      "Oswald",
      "Ubuntu",
      "PT Sans",
      "Noto Sans",
      "Work Sans",
      "Rubik",
      "Fira Sans",
      "Quicksand",
      "Karla",
      "DM Sans",
      "Manrope",
      "Space Grotesk",
      "Libre Baskerville",
      "Crimson Text",
      "Lora",
      "Bitter",
      "Arvo",
      "Josefin Sans",
      "Cabin",
      "Dosis",
      "Comfortaa",
      "Abril Fatface",
      "Bebas Neue",
      "Righteous",
      "Pacifico",
      "Dancing Script",
      "Caveat",
      "Architects Daughter",
      "Permanent Marker",
    ];
    for (const name of required) {
      expect(isKnownFont(name), name).toBe(true);
    }
  });
});

describe("getFontByName / isKnownFont", () => {
  it("returns the spec for every library name", () => {
    for (const f of FONT_LIBRARY) {
      expect(getFontByName(f.name)).toBe(f);
      expect(isKnownFont(f.name)).toBe(true);
    }
  });

  it("returns null / false for unknown names", () => {
    expect(getFontByName("Comic Sans")).toBeNull();
    expect(getFontByName("robotto")).toBeNull();
    expect(isKnownFont("Comic Sans")).toBe(false);
    expect(isKnownFont("")).toBe(false);
  });
});

describe("renderFontLibrary", () => {
  it("includes a section for every non-empty category", () => {
    const out = renderFontLibrary();
    expect(out).toContain("DISPLAY");
    expect(out).toContain("SERIF BODY");
    expect(out).toContain("SANS BODY");
    expect(out).toContain("MONO");
    expect(out).toContain("ACCENT");
  });

  it("lists every library font name exactly once", () => {
    const out = renderFontLibrary();
    for (const f of FONT_LIBRARY) {
      const occurrences = out.split(`- ${f.name} —`).length - 1;
      expect(occurrences, f.name).toBe(1);
    }
  });
});

describe("buildFontsUrl", () => {
  it("produces a Google Fonts CSS2 URL with display=swap", () => {
    const url = buildFontsUrl(["Inter"]);
    expect(url).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?/);
    expect(url).toContain("display=swap");
  });

  it("encodes spaces in family names as plus signs", () => {
    const url = buildFontsUrl(["Playfair Display"]);
    expect(url).toContain("family=Playfair+Display");
  });

  it("includes each font's weight spec when present", () => {
    const url = buildFontsUrl(["Inter"]);
    expect(url).toContain("Inter:wght@400;500;600;700");
  });

  it("omits :wght@ for single-weight fonts", () => {
    const url = buildFontsUrl(["Abril Fatface"]);
    expect(url).toContain("family=Abril+Fatface&");
    expect(url).not.toContain("Abril+Fatface:wght");
  });

  it("dedupes repeated names", () => {
    const url = buildFontsUrl(["Inter", "Inter", "Inter"]);
    const count = url.split("family=Inter").length - 1;
    expect(count).toBe(1);
  });

  it("silently skips unknown names", () => {
    const url = buildFontsUrl(["Inter", "Comic Sans", "Roboto"]);
    expect(url).toContain("family=Inter");
    expect(url).toContain("family=Roboto");
    expect(url).not.toContain("Comic+Sans");
  });

  it("appends extra slugs verbatim", () => {
    const url = buildFontsUrl(
      ["Inter"],
      ["Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"]
    );
    expect(url).toContain("family=Material+Symbols+Rounded");
  });
});
