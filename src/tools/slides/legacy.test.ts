/**
 * Unit tests for `convertLegacyDeckJson` — the JSON → AnumaNode
 * backwards-compat converter for pre-JSX slide decks.
 */

import { describe, expect, it } from "vitest";

import { convertLegacyDeckJson, isLegacyDeckJson } from "./legacy.js";

// ---------------------------------------------------------------------------
// isLegacyDeckJson
// ---------------------------------------------------------------------------

describe("isLegacyDeckJson", () => {
  it("recognises a parsed legacy deck object", () => {
    expect(
      isLegacyDeckJson({ version: 2, theme: { fontPreset: "default", colors: {} }, slides: [] })
    ).toBe(true);
  });

  it("recognises a JSON string of a legacy deck", () => {
    const raw = JSON.stringify({ version: 2, theme: {}, slides: [] });
    expect(isLegacyDeckJson(raw)).toBe(true);
  });

  it("rejects null / undefined / non-objects", () => {
    expect(isLegacyDeckJson(null)).toBe(false);
    expect(isLegacyDeckJson(undefined)).toBe(false);
    expect(isLegacyDeckJson(123)).toBe(false);
    expect(isLegacyDeckJson("hello")).toBe(false);
  });

  it("rejects malformed JSON strings", () => {
    expect(isLegacyDeckJson("{ not json")).toBe(false);
  });

  it("rejects objects missing the slides array", () => {
    expect(isLegacyDeckJson({ theme: {} })).toBe(false);
  });

  it("rejects objects missing the theme", () => {
    expect(isLegacyDeckJson({ slides: [] })).toBe(false);
  });

  it("rejects JSX strings (not legacy JSON)", () => {
    expect(isLegacyDeckJson("<Anuma.Deck><Anuma.Slide /></Anuma.Deck>")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// convertLegacyDeckJson
// ---------------------------------------------------------------------------

describe("convertLegacyDeckJson", () => {
  it("returns null for malformed JSON", () => {
    expect(convertLegacyDeckJson("not json")).toBeNull();
  });

  it("returns null for non-deck shapes", () => {
    expect(convertLegacyDeckJson({ foo: "bar" })).toBeNull();
    expect(convertLegacyDeckJson(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  it("converts a minimal empty deck", () => {
    const deck = convertLegacyDeckJson({ version: 2, theme: {}, slides: [] });
    expect(deck).not.toBeNull();
    expect(deck?.tag).toBe("Deck");
    expect(deck?.children).toEqual([]);
  });

  it("preserves theme tokens on the Deck root attrs", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {
        fontPreset: "tech",
        colors: { background: "#000", accent: "#10b981" },
      },
      slides: [],
    });
    expect(deck?.attrs.fontPreset).toBe("tech");
    expect(deck?.attrs.background).toBe("#000");
    expect(deck?.attrs.accent).toBe("#10b981");
    // Defaults filled in for missing colors.
    expect(deck?.attrs.textPrimary).toBe("#ffffff");
  });

  it("falls back to default colours when the theme is partial", () => {
    const deck = convertLegacyDeckJson({ version: 2, theme: { colors: {} }, slides: [] });
    expect(deck?.attrs.background).toBe("#222529");
    expect(deck?.attrs.slideBg).toBe("#1a1b1e");
    expect(deck?.attrs.fontPreset).toBe("default");
  });

  it("converts a slide with id + background", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {},
      slides: [{ id: "slide-1", background: "slideBg", elements: [] }],
    });
    const slide = deck?.children[0];
    expect(slide && typeof slide !== "string" ? slide.tag : null).toBe("Slide");
    if (slide && typeof slide !== "string") {
      expect(slide.attrs.id).toBe("slide-1");
      expect(slide.attrs.background).toBe("slideBg");
    }
  });

  it("converts text elements with percent → pixel coordinates", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {},
      slides: [
        {
          id: "s1",
          elements: [
            {
              kind: "text",
              id: "t1",
              x: 10,
              y: 10,
              w: 80,
              h: 20,
              text: "Hello",
              fontSize: 4,
              fontRole: "heading",
              fontWeight: 700,
              color: "textPrimary",
              align: "center",
            },
          ],
        },
      ],
    });
    const slide = deck?.children[0];
    if (!slide || typeof slide === "string") throw new Error("expected slide");
    const text = slide.children[0];
    if (!text || typeof text === "string") throw new Error("expected text node");
    expect(text.tag).toBe("Text");
    // 10% of 960 = 96, 10% of 540 = 54, 80% of 960 = 768, 20% of 540 = 108.
    expect(text.attrs.x).toBe(96);
    expect(text.attrs.y).toBe(54);
    expect(text.attrs.w).toBe(768);
    expect(text.attrs.h).toBe(108);
    expect(text.attrs.fontRole).toBe("heading");
    expect(text.children).toEqual(["Hello"]);
    const style = text.attrs.style as Record<string, unknown>;
    // 4% of 960 ≈ 38.4 px
    expect(style.fontSize).toBe(38.4);
    expect(style.fontWeight).toBe(700);
    expect(style.color).toBe("textPrimary");
    expect(style.textAlign).toBe("center");
  });

  it("converts image elements + carries cornerRadius into style.borderRadius", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {},
      slides: [
        {
          id: "s1",
          elements: [
            {
              kind: "image",
              id: "img-1",
              x: 0,
              y: 0,
              w: 50,
              h: 100,
              src: "https://example.com/x.png",
              cornerRadius: 12,
            },
          ],
        },
      ],
    });
    const slide = deck?.children[0];
    if (!slide || typeof slide === "string") throw new Error("expected slide");
    const img = slide.children[0];
    if (!img || typeof img === "string") throw new Error("expected image node");
    expect(img.tag).toBe("Image");
    expect(img.attrs.src).toBe("https://example.com/x.png");
    const style = img.attrs.style as Record<string, unknown>;
    expect(style.borderRadius).toBe(12);
  });

  it("maps shape kinds to Rect / Circle / Line tags", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {},
      slides: [
        {
          id: "s1",
          elements: [
            { kind: "shape", shape: "rect", id: "r", x: 0, y: 0, w: 10, h: 10, fill: "accent" },
            { kind: "shape", shape: "circle", id: "c", x: 0, y: 0, w: 10, h: 10 },
            {
              kind: "shape",
              shape: "line",
              id: "l",
              x: 0,
              y: 0,
              w: 10,
              h: 1,
              stroke: "border",
              strokeWidth: 2,
            },
          ],
        },
      ],
    });
    const slide = deck?.children[0];
    if (!slide || typeof slide === "string") throw new Error("expected slide");
    const tags = slide.children.map((c) => (typeof c === "string" ? "string" : c.tag));
    expect(tags).toEqual(["Rect", "Circle", "Line"]);
    const rect = slide.children[0];
    if (rect && typeof rect !== "string") {
      expect(rect.attrs.fill).toBe("accent");
    }
    const line = slide.children[2];
    if (line && typeof line !== "string") {
      expect(line.attrs.stroke).toBe("border");
      expect(line.attrs.strokeWidth).toBe(2);
    }
  });

  it("converts icons with style.color + style.fontSize", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {},
      slides: [
        {
          id: "s1",
          elements: [
            {
              kind: "icon",
              id: "i1",
              x: 0,
              y: 0,
              w: 5,
              h: 5,
              name: "star",
              color: "accent",
              fontSize: 3,
            },
          ],
        },
      ],
    });
    const slide = deck?.children[0];
    if (!slide || typeof slide === "string") throw new Error("expected slide");
    const icon = slide.children[0];
    if (!icon || typeof icon === "string") throw new Error("expected icon node");
    expect(icon.tag).toBe("Icon");
    expect(icon.attrs.name).toBe("star");
    const style = icon.attrs.style as Record<string, unknown>;
    expect(style.color).toBe("accent");
    expect(style.fontSize).toBe(28.8); // 3% of 960
  });

  it("preserves rotation when present on any element", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {},
      slides: [
        {
          id: "s1",
          elements: [
            {
              kind: "text",
              id: "t",
              x: 0,
              y: 0,
              w: 10,
              h: 10,
              text: "x",
              fontSize: 1,
              fontRole: "body",
              fontWeight: 400,
              color: "x",
              rotation: 45,
            },
          ],
        },
      ],
    });
    const slide = deck?.children[0];
    if (!slide || typeof slide === "string") throw new Error("expected slide");
    const text = slide.children[0];
    if (!text || typeof text === "string") throw new Error("expected text node");
    expect(text.attrs.rotation).toBe(45);
  });

  it("survives partially-corrupt elements (missing fields)", () => {
    const deck = convertLegacyDeckJson({
      version: 2,
      theme: {},
      slides: [
        {
          id: "s1",
          // @ts-expect-error - intentionally minimal to test defensive defaults
          elements: [{ kind: "text", id: "t" }, { kind: "image" }],
        },
      ],
    });
    const slide = deck?.children[0];
    if (!slide || typeof slide === "string") throw new Error("expected slide");
    expect(slide.children).toHaveLength(2);
    const text = slide.children[0];
    if (!text || typeof text === "string") throw new Error("expected text node");
    expect(text.tag).toBe("Text");
    expect(text.children).toEqual([""]);
    const img = slide.children[1];
    if (!img || typeof img === "string") throw new Error("expected image node");
    expect(img.tag).toBe("Image");
    expect(img.attrs.src).toBe("");
  });
});
