import { describe, expect, it } from "vitest";

import {
  type AnumaNode,
  findById,
  findParentOfId,
  getId,
  insertAfterId,
  insertChild,
  parseJsx,
  removeById,
  replaceById,
  serializeJsx,
  updateAttrs,
  walk,
} from "./jsx";

function deckNode(children: AnumaNode[] = []): AnumaNode {
  return {
    tag: "Deck",
    attrs: {
      fontPreset: "default",
      background: "#000",
      slideBg: "#111",
      surfaceSecondary: "#222",
      textPrimary: "#fff",
      textSecondary: "#eee",
      textMuted: "#999",
      accent: "#f60",
      card: "#1a1a1a",
      border: "#333",
    },
    children,
  };
}

function slideNode(id: string, children: AnumaNode[] = []): AnumaNode {
  return { tag: "Slide", attrs: { id }, children };
}

function textNode(id: string, text: string, extras: Record<string, unknown> = {}): AnumaNode {
  return {
    tag: "Text",
    attrs: {
      id,
      x: 96,
      y: 162,
      w: 768,
      h: 54,
      fontRole: "heading",
      style: { fontSize: 43, fontWeight: 700, color: "textPrimary" },
      ...(extras as Record<string, string | number | boolean>),
    },
    children: [text],
  };
}

describe("parseJsx", () => {
  it("accepts allowlisted plain HTML tags", () => {
    const div = parseJsx(`<div />`);
    expect(div.tag).toBe("div");
    const h1 = parseJsx(`<h1>Hello</h1>`);
    expect(h1.tag).toBe("h1");
    expect(h1.children).toEqual(["Hello"]);
  });

  it("rejects bare capitalized tags (user-imported components)", () => {
    expect(() => parseJsx(`<Deck />`)).toThrow(/Bare capitalized tag/);
  });

  it("rejects unknown namespaces", () => {
    expect(() => parseJsx(`<Foo.Deck />`)).toThrow(/Unknown namespace/);
  });

  it("rejects forbidden HTML tags (script / iframe / link / style / meta)", () => {
    expect(() => parseJsx(`<script />`)).toThrow(/not allowed for safety/);
    expect(() => parseJsx(`<iframe />`)).toThrow(/not allowed for safety/);
    expect(() => parseJsx(`<link />`)).toThrow(/not allowed for safety/);
  });

  it("rejects unrecognized HTML tags not in the allowlist", () => {
    expect(() => parseJsx(`<marquee>scroll</marquee>`)).toThrow(/Unknown HTML tag/);
  });

  it("rejects event-handler attributes (on*)", () => {
    expect(() => parseJsx(`<button onClick={handler}>Click</button>`)).toThrow(
      /Event-handler attribute/
    );
  });

  it("rejects unknown Anuma tags", () => {
    expect(() => parseJsx(`<Anuma.Video />`)).toThrow(/Unknown tag/);
  });

  it("rejects dynamic attribute expressions", () => {
    expect(() => parseJsx(`<Anuma.Rect id="r" x={someVar} y={0} w={10} h={10} />`)).toThrow(
      /dynamic expression/
    );
  });

  it("rejects spread attributes", () => {
    expect(() => parseJsx(`<Anuma.Deck {...props} />`)).toThrow(/Spread attributes/);
  });

  it("rejects self-closing violations on leaf tags", () => {
    expect(() =>
      parseJsx(`<Anuma.Rect id="r" x={0} y={0} w={10} h={10}>body</Anuma.Rect>`)
    ).toThrow(/must be self-closing/);
  });

  it("rejects text children on container tags", () => {
    expect(() => parseJsx(`<Anuma.Slide id="s">hello</Anuma.Slide>`)).toThrow(
      /cannot contain text/
    );
  });

  it("rejects nested non-inline elements inside Text", () => {
    expect(() =>
      parseJsx(
        `<Anuma.Text id="t" x={0} y={0} w={10} h={10}><Anuma.Rect id="r" x={0} y={0} w={1} h={1} /></Anuma.Text>`
      )
    ).toThrow(/can only contain text and inline/);
  });

  it("parses numeric, string, and negative attr values", () => {
    const node = parseJsx(`<Anuma.Rect id="r" x={-10} y={0} w={100} h={50.5} fill="accent" />`);
    expect(node.tag).toBe("Rect");
    expect(node.attrs.x).toBe(-10);
    expect(node.attrs.y).toBe(0);
    expect(node.attrs.w).toBe(100);
    expect(node.attrs.h).toBe(50.5);
    expect(node.attrs.fill).toBe("accent");
  });

  it("collapses Text body whitespace with React-like rules", () => {
    const node = parseJsx(`
      <Anuma.Text id="t" x={0} y={0} w={100} h={20} fontRole="body" style={{ fontSize: 18, fontWeight: 400, color: "textPrimary" }}>
        Hello World
      </Anuma.Text>
    `);
    expect(node.children).toEqual(["Hello World"]);
  });

  it("accepts expression-string children in Text for multi-line content", () => {
    const node = parseJsx(
      `<Anuma.Text id="t" x={0} y={0} w={100} h={20} fontRole="body">{"line 1\\nline 2"}</Anuma.Text>`
    );
    expect(node.children).toEqual(["line 1\nline 2"]);
  });

  it("parses object-valued attrs like style={{}}", () => {
    const node = parseJsx(
      `<Anuma.Text id="t" x={0} y={0} w={100} h={20} fontRole="body" style={{ fontSize: 43, color: "textPrimary", textAlign: "center" }}>Hi</Anuma.Text>`
    );
    expect(node.attrs.style).toEqual({
      fontSize: 43,
      color: "textPrimary",
      textAlign: "center",
    });
  });

  it("rejects non-literal values inside object attrs", () => {
    expect(() =>
      parseJsx(
        `<Anuma.Text id="t" x={0} y={0} w={100} h={20} fontRole="body" style={{ fontSize: someVar }}>Hi</Anuma.Text>`
      )
    ).toThrow(/non-literal value/);
  });

  it("supports negative numbers in object attrs", () => {
    const node = parseJsx(
      `<Anuma.Rect id="r" x={0} y={0} w={10} h={10} style={{ letterSpacing: -0.04 }} />`
    );
    const style = node.attrs.style as Record<string, number>;
    expect(style.letterSpacing).toBe(-0.04);
  });

  it("rejects lowercase typos in style keys with a suggestion", () => {
    // React silently ignores `fontsize`, leaving the element to render
    // at the default font size — an invisible bug. The parser should
    // reject it with a hint pointing at `fontSize`.
    expect(() =>
      parseJsx(
        `<Anuma.Text id="t" x={0} y={0} w={100} h={20} fontRole="body" style={{ fontsize: 43 }}>Hi</Anuma.Text>`
      )
    ).toThrow(/fontsize.*fontSize/i);
  });

  it("rejects entirely unknown style keys", () => {
    expect(() =>
      parseJsx(
        `<Anuma.Text id="t" x={0} y={0} w={100} h={20} fontRole="body" style={{ frobnicate: 12 }}>Hi</Anuma.Text>`
      )
    ).toThrow(/Unknown CSS-in-JS style key/);
  });

  it("rejects top-level visual-styling props on <Anuma.Text> — they belong in style={{}}", () => {
    // Repro of the e2e bug where insert_slide produced an invisible slide:
    // model emits top-level fontSize/color/fontWeight, renderer reads
    // styles only from style={{}} → falls back to defaults (18px white)
    // → invisible on any light background.
    expect(() =>
      parseJsx(
        `<Anuma.Text id="t" x={0} y={0} w={100} h={20} fontSize={12} color="accent" fontWeight={600}>Hi</Anuma.Text>`
      )
    ).toThrow(/Top-level "fontSize.*belong inside style/);
  });

  it("rejects top-level fontSize on <Anuma.Span> too", () => {
    expect(() =>
      parseJsx(
        `<Anuma.Text id="t" x={0} y={0} w={100} h={20}><Anuma.Span fontWeight={700}>bold</Anuma.Span> tail</Anuma.Text>`
      )
    ).toThrow(/Top-level "fontWeight.*belong inside style/);
  });

  it("accepts layout-controlling props that overlap with style keys (gap, padding) at top level on Group", () => {
    // gap and padding are in STYLE_ALLOWED_KEYS, but Group reads them at
    // top level for flex layout. The reject set is narrowed to TEXT-style
    // keys only to preserve this.
    expect(() =>
      parseJsx(
        `<Anuma.Group id="row" x={0} y={0} w={500} h={60} layout="row" gap={16} padding={24}><Anuma.Text id="t" x={0} y={0} w={100} h={20}>A</Anuma.Text></Anuma.Group>`
      )
    ).not.toThrow();
  });
});

describe("serializeJsx", () => {
  it("emits numeric attrs as {n} and strings as quoted literals", () => {
    const t = textNode("title", "Welcome");
    const s = serializeJsx(t);
    expect(s).toContain(`x={96}`);
    expect(s).toContain(`style={{ fontSize: 43`);
    expect(s).toContain(`color: "textPrimary"`);
    expect(s).toContain(`>Welcome</Anuma.Text>`);
  });

  it("self-closes leaf tags", () => {
    const r: AnumaNode = {
      tag: "Rect",
      attrs: { id: "r", x: 0, y: 0, w: 10, h: 10 },
      children: [],
    };
    expect(serializeJsx(r)).toMatch(/\/>\s*$/);
  });

  it("wraps unsafe Text bodies in a JSX expression", () => {
    const t = textNode("t", "1 < 2 && 3 > 2");
    const s = serializeJsx(t);
    expect(s).toMatch(/\{".*"\}/);
    expect(s).toContain("</Anuma.Text>");
  });

  it("breaks long opening tags onto multiple lines", () => {
    const deck = deckNode();
    const s = serializeJsx(deck);
    expect(s.split("\n").length).toBeGreaterThan(1);
  });

  it("preserves inline Anuma.Span children inside Anuma.Text on round-trip", () => {
    const source = `<Anuma.Text id="hero" x={0} y={0} w={500} h={75} fontRole="heading" style={{ fontSize: 57 }}>Why <Anuma.Span style={{ fontStyle: "italic", color: "#B85A2E" }}>now.</Anuma.Span></Anuma.Text>`;
    const node = parseJsx(source);
    const s = serializeJsx(node);
    // The Span must survive serialization (this is the bug).
    expect(s).toContain(`<Anuma.Span style={{ fontStyle: "italic", color: "#B85A2E" }}>now.</Anuma.Span>`);
    // The trailing space before the Span must be preserved (as raw text or
    // wrapped {"Why "} — both parse back identically).
    expect(s).toMatch(/(>Why |\{"Why "\})/);
    // Round-trip preserves the parsed children.
    const reparsed = parseJsx(s);
    expect(reparsed.children).toHaveLength(2);
    expect(reparsed.children[0]).toBe("Why ");
    expect(typeof reparsed.children[1] === "object" && (reparsed.children[1] as { tag: string }).tag).toBe("Span");
  });

  it("emits object-valued attrs as style={{ key: value, ... }}", () => {
    const node: AnumaNode = {
      tag: "Text",
      attrs: {
        id: "t",
        x: 0,
        y: 0,
        w: 100,
        h: 20,
        fontRole: "body",
        style: { fontSize: 43, color: "textPrimary", textAlign: "center" },
      },
      children: ["Hi"],
    };
    const s = serializeJsx(node);
    expect(s).toContain(`style={{ fontSize: 43, color: "textPrimary", textAlign: "center" }}`);
  });
});

describe("round-trip", () => {
  it("preserves every tag kind", () => {
    const deck = deckNode([
      slideNode("cover", [
        textNode("title", "Hello"),
        {
          tag: "Image",
          attrs: { id: "hero", x: 0, y: 0, w: 960, h: 400, src: "attached:1" },
          children: [],
        },
        {
          tag: "Rect",
          attrs: { id: "bg", x: 0, y: 500, w: 960, h: 40, fill: "#000" },
          children: [],
        },
        {
          tag: "Circle",
          attrs: { id: "dot", x: 450, y: 20, w: 20, h: 20, fill: "accent" },
          children: [],
        },
        {
          tag: "Line",
          attrs: { id: "rule", x: 58, y: 120, w: 844, h: 0, stroke: "border" },
          children: [],
        },
        {
          tag: "Icon",
          attrs: {
            id: "bolt",
            x: 430,
            y: 240,
            w: 96,
            h: 96,
            name: "bolt",
            style: { color: "accent", fontSize: 80 },
          },
          children: [],
        },
      ]),
    ]);
    const roundTripped = parseJsx(serializeJsx(deck));
    expect(roundTripped).toEqual(deck);
  });

  it("preserves Group with nested children and layout attrs", () => {
    const deck = deckNode([
      slideNode("s", [
        {
          tag: "Group",
          attrs: { id: "row", layout: "row", gap: 16, padding: 24 },
          children: [textNode("a", "A"), textNode("b", "B")],
        },
      ]),
    ]);
    expect(parseJsx(serializeJsx(deck))).toEqual(deck);
  });

  it("preserves Text bodies that need escaping", () => {
    const node = textNode("t", "x < 5 && y > 0");
    expect(parseJsx(serializeJsx(node))).toEqual(node);
  });

  it("preserves HTML tags without an Anuma. prefix", () => {
    const deck = deckNode([
      slideNode("s", [
        {
          tag: "div",
          attrs: { id: "wrap" },
          children: [
            { tag: "h1", attrs: { id: "h" }, children: ["Heading"] },
            { tag: "p", attrs: { id: "p" }, children: ["Body"] },
            { tag: "img", attrs: { id: "logo", src: "attached:1" }, children: [] },
          ],
        },
      ]),
    ]);
    const serialized = serializeJsx(deck);
    expect(serialized).not.toMatch(/<Anuma\.(div|h1|p|img)/);
    expect(serialized).not.toMatch(/<\/Anuma\.(div|h1|p)>/);
    expect(parseJsx(serialized)).toEqual(deck);
  });
});

describe("tree helpers", () => {
  const fixture = (): AnumaNode =>
    deckNode([
      slideNode("s1", [textNode("t1", "Hello"), textNode("t2", "World")]),
      slideNode("s2", [textNode("t3", "Bye")]),
    ]);

  it("findById finds nested nodes by id", () => {
    const d = fixture();
    const t2 = findById(d, "t2");
    expect(t2).not.toBeNull();
    expect(t2?.tag).toBe("Text");
  });

  it("findParentOfId returns the direct parent", () => {
    const d = fixture();
    const parent = findParentOfId(d, "t3");
    expect(parent?.tag).toBe("Slide");
    expect(getId(parent!)).toBe("s2");
  });

  it("replaceById swaps a child in place", () => {
    const d = fixture();
    const swap: AnumaNode = textNode("t1", "Replaced");
    expect(replaceById(d, "t1", swap)).toBe(true);
    const found = findById(d, "t1");
    expect(found?.children).toEqual(["Replaced"]);
  });

  it("replaceById returns false when id is missing", () => {
    const d = fixture();
    expect(replaceById(d, "no-such", textNode("x", "x"))).toBe(false);
  });

  it("insertChild appends when afterId is omitted", () => {
    const d = fixture();
    const s1 = findById(d, "s1")!;
    insertChild(s1, textNode("t-new", "new"));
    expect(s1.children[s1.children.length - 1]).toMatchObject({
      tag: "Text",
      attrs: { id: "t-new" },
    });
  });

  it("insertChild places new child right after afterId", () => {
    const d = fixture();
    const s1 = findById(d, "s1")!;
    insertChild(s1, textNode("t-mid", "mid"), "t1");
    const ids = (s1.children as AnumaNode[]).map((c) => getId(c));
    expect(ids).toEqual(["t1", "t-mid", "t2"]);
  });

  it("insertAfterId walks the tree to find the right parent", () => {
    const d = fixture();
    expect(insertAfterId(d, "t3", textNode("t4", "after"))).toBe(true);
    const s2 = findById(d, "s2")!;
    const ids = (s2.children as AnumaNode[]).map((c) => getId(c));
    expect(ids).toEqual(["t3", "t4"]);
  });

  it("removeById deletes the matched node", () => {
    const d = fixture();
    expect(removeById(d, "t2")).toBe(true);
    expect(findById(d, "t2")).toBeNull();
  });

  it("updateAttrs merges a patch, skipping prototype keys", () => {
    const node = textNode("t", "x");
    updateAttrs(node, { color: "accent", __proto__: { bad: true } as unknown as string });
    expect(node.attrs.color).toBe("accent");
    expect(Object.prototype.hasOwnProperty.call(node.attrs, "__proto__")).toBe(false);
  });

  it("walk visits every node depth-first", () => {
    const d = fixture();
    const seen: string[] = [];
    walk(d, (n) => {
      seen.push(n.tag);
    });
    // Deck, Slide, Text, Text, Slide, Text
    expect(seen).toEqual(["Deck", "Slide", "Text", "Text", "Slide", "Text"]);
  });
});
