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
      fontSize: 43,
      fontRole: "heading",
      fontWeight: 700,
      color: "textPrimary",
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

  it("rejects nested elements inside Text", () => {
    expect(() =>
      parseJsx(
        `<Anuma.Text id="t" x={0} y={0} w={10} h={10}><Anuma.Rect id="r" x={0} y={0} w={1} h={1} /></Anuma.Text>`
      )
    ).toThrow(/cannot contain nested elements/);
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
      <Anuma.Text id="t" x={0} y={0} w={100} h={20} fontSize={18} fontRole="body" fontWeight={400} color="textPrimary">
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
});

describe("serializeJsx", () => {
  it("emits numeric attrs as {n} and strings as quoted literals", () => {
    const t = textNode("title", "Welcome");
    const s = serializeJsx(t);
    expect(s).toContain(`x={96}`);
    expect(s).toContain(`fontSize={43}`);
    expect(s).toContain(`color="textPrimary"`);
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
            color: "accent",
            fontSize: 80,
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
