/**
 * Document DSL — the validated, literal-only `@react-pdf/renderer` subset the
 * model authors when drafting a document artifact (contract, letter, memo,
 * essay, report, …).
 *
 * The model emits a single JSX expression rooted at `<Document>`, using the
 * react-pdf primitive vocabulary (`<Page>`, `<View>`, `<Text>`, `<Image>`, …)
 * plus inline `style={{}}` objects. We parse it into a tag-agnostic
 * {@link DocNode} tree with `@babel/parser` and enforce a strict allowlist:
 * only react-pdf render tags, only react-pdf style keys, only literal scalar
 * attribute values. No executable code ever runs — the web renderer maps the
 * validated tree onto real react-pdf components (see the web `render.tsx`),
 * which is what makes this safe on the main thread.
 *
 * This is a deliberate sibling of `tools/slides/jsx.ts`: same parse strategy
 * and literal-only attribute discipline, but the tag reader accepts the
 * react-pdf bare-capitalized vocabulary (`<Document>`, `<Page>`) instead of
 * the slides `<Anuma.*>` namespace, and the allowlists/structural rules are
 * document/react-pdf specific.
 *
 * @module tools/document/dsl
 */

import { parseExpression } from "@babel/parser";
import type { JSXAttribute, JSXElement, Node, SourceLocation } from "@babel/types";

// ---------------------------------------------------------------------------
// Tree types
// ---------------------------------------------------------------------------

/** Scalar value an attribute can hold. */
type AttrScalar = string | number | boolean;

/** An object-valued attribute — used primarily for `style={{}}`. */
type AttrObject = Record<string, AttrScalar>;

/** @category Document DSL */
export type DocAttrValue = AttrScalar | AttrObject;

/** @category Document DSL */
export type DocChild = DocNode | string;

/**
 * A node in the document tree. `tag` is the react-pdf component name (e.g.
 * `"Document"`, `"Page"`, `"Text"`). Children are nested nodes for containers,
 * or strings (the displayed text) for text-bearing tags.
 *
 * @category Document DSL
 */
export interface DocNode {
  tag: string;
  attrs: Record<string, DocAttrValue>;
  children: DocChild[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when the document DSL violates a parse or structural rule. Carries
 * the source line/column when available so the model can self-correct.
 *
 * @category Document DSL
 */
export class DocDslError extends Error {
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, loc?: { line: number; column: number } | null) {
    const suffix = loc ? ` (line ${loc.line}:${loc.column})` : "";
    super(`${message}${suffix}`);
    this.name = "DocDslError";
    this.line = loc?.line;
    this.column = loc?.column;
  }
}

type SrcLoc = { line: number; column: number } | null | undefined;

function locOf(node: { loc?: SourceLocation | null }): SrcLoc {
  return node.loc?.start;
}

// ---------------------------------------------------------------------------
// Vocabulary — react-pdf render tags
// ---------------------------------------------------------------------------

/**
 * Every `@react-pdf/renderer` component the document DSL permits. Bare
 * capitalized identifiers (unlike slides, which namespaces under `Anuma.*`).
 *
 * Deliberately excluded: `Font` (imperative `Font.register` API, not a render
 * tag) and `Canvas` (requires a `paint` function prop, which the literal-only
 * DSL cannot express).
 */
const PDF_TAGS = [
  // structure
  "Document",
  "Page",
  "View",
  // text / inline
  "Text",
  "Link",
  "Note",
  // media
  "Image",
  // vector
  "Svg",
  "G",
  "Line",
  "Rect",
  "Circle",
  "Ellipse",
  "Polygon",
  "Polyline",
  "Path",
  "Tspan",
  "Defs",
  "ClipPath",
  "Stop",
  "LinearGradient",
  "RadialGradient",
] as const;

/** @category Document DSL */
export type PdfTag = (typeof PDF_TAGS)[number];

const PDF_TAG_SET = new Set<string>(PDF_TAGS);

/** Tags whose children are displayed text; may also nest inline `<Text>`/`<Link>`/`<Tspan>`. */
const TEXT_TAGS = new Set<string>(["Text", "Link", "Note", "Tspan"]);

/** Tags rendered as self-closing — they take no children. */
const LEAF_TAGS = new Set<string>([
  "Image",
  "Line",
  "Rect",
  "Circle",
  "Ellipse",
  "Polygon",
  "Polyline",
  "Path",
  "Stop",
]);

/** Tags permitted anywhere inside an `<Svg>` subtree. */
const SVG_TAGS = new Set<string>([
  "G",
  "Line",
  "Rect",
  "Circle",
  "Ellipse",
  "Polygon",
  "Polyline",
  "Path",
  "Text",
  "Tspan",
  "Defs",
  "ClipPath",
  "Stop",
  "LinearGradient",
  "RadialGradient",
]);

/**
 * Tags from {@link SVG_TAGS} that are ALSO valid in document body context, so
 * they must NOT be rejected outside `<Svg>`. Only `<Text>` qualifies: `<Tspan>`
 * is an SVG-only text primitive (it maps to SVG `<tspan>` and is meaningful
 * only inside `<Svg><Text>`), even though it carries text and so appears in
 * {@link TEXT_TAGS}.
 */
const SVG_BODY_SHARED_TAGS = new Set<string>(["Text"]);

/**
 * SVG primitives that are only meaningful inside an `<Svg>` subtree (everything
 * in {@link SVG_TAGS} except the body-shared tags). Placing any of these
 * outside an `<Svg>` renders nothing — or fails — in react-pdf, so we reject
 * it: the mirror of the non-SVG-inside-`<Svg>` check.
 */
const SVG_ONLY_TAGS = new Set<string>([...SVG_TAGS].filter((t) => !SVG_BODY_SHARED_TAGS.has(t)));

/**
 * Recognized react-pdf style keys for `style={{}}`. Mirrors the `Style` type
 * exported by `@react-pdf/stylesheet` (border / color / dimension / flexbox /
 * gap / layout / margin / padding / text / transform / svg / image groups).
 * react-pdf silently ignores unknown keys, so an unrecognized key would
 * render at the default value — we reject it instead, with a did-you-mean hint.
 */
const PDF_STYLE_KEYS = new Set<string>([
  // border
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderColor",
  "borderRadius",
  "borderStyle",
  "borderWidth",
  "borderTopColor",
  "borderTopStyle",
  "borderTopWidth",
  "borderRightColor",
  "borderRightStyle",
  "borderRightWidth",
  "borderBottomColor",
  "borderBottomStyle",
  "borderBottomWidth",
  "borderLeftColor",
  "borderLeftStyle",
  "borderLeftWidth",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
  // color
  "backgroundColor",
  "color",
  "opacity",
  // dimension
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  // flexbox
  "flex",
  "alignContent",
  "alignItems",
  "alignSelf",
  "flexDirection",
  "flexWrap",
  "flexFlow",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "justifySelf",
  "justifyContent",
  // gap
  "gap",
  "rowGap",
  "columnGap",
  // layout
  "aspectRatio",
  "bottom",
  "display",
  "left",
  "position",
  "right",
  "top",
  "overflow",
  "zIndex",
  // margin
  "margin",
  "marginHorizontal",
  "marginVertical",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  // padding
  "padding",
  "paddingHorizontal",
  "paddingVertical",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  // text
  "direction",
  "fontSize",
  "fontFamily",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "maxLines",
  "textAlign",
  "textDecoration",
  "textDecorationColor",
  "textDecorationStyle",
  "textIndent",
  "textOverflow",
  "textTransform",
  "verticalAlign",
  // transform
  "transformOrigin",
  "transformOriginX",
  "transformOriginY",
  "transform",
  "gradientTransform",
  // svg
  "fill",
  "stroke",
  "strokeDasharray",
  "strokeWidth",
  "fillOpacity",
  "fillRule",
  "strokeOpacity",
  "textAnchor",
  "strokeLinecap",
  "strokeLinejoin",
  "visibility",
  "clipPath",
  "dominantBaseline",
  // image
  "objectPosition",
  "objectPositionX",
  "objectPositionY",
  "objectFit",
]);

const STYLE_KEY_LOWER_TO_CAMEL = new Map<string, string>(
  Array.from(PDF_STYLE_KEYS, (k) => [k.toLowerCase(), k])
);

/**
 * react-pdf's built-in (standard PDF) font families. Using any other family
 * requires `Font.register`, which the DSL does not expose, so a non-standard
 * family would throw at render time. Restrict `fontFamily` to these in v1.
 */
const STANDARD_FONTS = new Set<string>([
  "Courier",
  "Courier-Bold",
  "Courier-Oblique",
  "Courier-BoldOblique",
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Helvetica-BoldOblique",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
  "Times-BoldItalic",
  "Symbol",
  "ZapfDingbats",
]);

function validateStyleKey(key: string, loc: SrcLoc): void {
  if (PDF_STYLE_KEYS.has(key)) return;
  const suggestion = STYLE_KEY_LOWER_TO_CAMEL.get(key.toLowerCase());
  if (suggestion && suggestion !== key) {
    throw new DocDslError(
      `Unknown react-pdf style key "${key}". Did you mean "${suggestion}"? react-pdf silently ignores unknown style keys, so this would render at the default value.`,
      loc
    );
  }
  throw new DocDslError(
    `Unknown react-pdf style key "${key}". Use react-pdf style properties (camelCase: fontSize, marginTop, flexDirection, …). react-pdf does not support CSS grid, float, or box-shadow.`,
    loc
  );
}

// ---------------------------------------------------------------------------
// Parse: JSX string -> DocNode
// ---------------------------------------------------------------------------

/**
 * Parse and validate a document DSL source string into a {@link DocNode} tree.
 *
 * Throws {@link DocDslError} on any violation: invalid JSX, a non-`<Document>`
 * root, an unknown tag, a forbidden/dynamic attribute, an unknown style key,
 * or a structural rule break (e.g. `<Document>` containing a non-`<Page>`,
 * raw text outside `<Text>`, or a leaf tag with children).
 *
 * @category Document DSL
 */
export function parseDocumentDsl(source: string): DocNode {
  let ast: Node;
  try {
    ast = parseExpression(source, {
      plugins: ["jsx"],
      errorRecovery: false,
      sourceType: "module",
    });
  } catch (err) {
    const e = err as Error & { loc?: { line: number; column: number } };
    throw new DocDslError(`Invalid JSX: ${e.message}`, e.loc);
  }
  if (ast.type !== "JSXElement") {
    throw new DocDslError(
      `Expected a single <Document> element at the top level, got ${ast.type}`,
      locOf(ast)
    );
  }
  const root = parseElement(ast, 0);
  if (root.tag !== "Document") {
    throw new DocDslError(`Root element must be <Document>, got <${root.tag}>`, locOf(ast));
  }
  enforceStructure(root, null, false);
  // react-pdf throws when a <Document> has no <Page>; catch it here with a
  // clear message rather than letting it surface as an opaque render failure.
  // (An empty <Page> is fine — it renders a blank page.)
  if (!root.children.some((c) => typeof c !== "string" && c.tag === "Page")) {
    throw new DocDslError("<Document> must contain at least one <Page>.", locOf(ast));
  }
  return root;
}

/**
 * Maximum element nesting depth. A real document nests only a handful of levels
 * deep; this far-larger bound rejects pathological input that could exhaust the
 * recursion stack (here and in the host renderer) without ever tripping on a
 * legitimate document.
 */
const MAX_DEPTH = 100;

function parseElement(el: JSXElement, depth: number): DocNode {
  if (depth > MAX_DEPTH) {
    throw new DocDslError(
      `Document is nested too deeply (more than ${MAX_DEPTH} levels).`,
      locOf(el)
    );
  }
  const tag = readTag(el);
  const attrs = readAttributes(el, tag);
  const children = readChildren(el, tag, depth);
  return { tag, attrs, children };
}

/**
 * Read and validate the opening tag. Accepts only bare capitalized identifiers
 * in the react-pdf {@link PDF_TAGS} vocabulary — no namespaces, no member
 * expressions, no lowercase HTML.
 */
function readTag(el: JSXElement): string {
  const name = el.openingElement.name;
  if (name.type !== "JSXIdentifier") {
    throw new DocDslError(
      `Expected a react-pdf tag like <Page> or <Text>; member/namespaced tags are not supported`,
      locOf(el.openingElement)
    );
  }
  const localName = name.name;
  if (!PDF_TAG_SET.has(localName)) {
    throw new DocDslError(
      `Unknown tag <${localName}>. Use a react-pdf component: ${PDF_TAGS.join(", ")}.`,
      locOf(el.openingElement)
    );
  }
  return localName;
}

function readAttributes(el: JSXElement, tag: string): Record<string, DocAttrValue> {
  const out: Record<string, DocAttrValue> = {};
  for (const attr of el.openingElement.attributes) {
    if (attr.type === "JSXSpreadAttribute") {
      throw new DocDslError("Spread attributes are not supported", locOf(attr));
    }
    if (attr.name.type !== "JSXIdentifier") {
      throw new DocDslError("Namespaced attribute names are not supported", locOf(attr));
    }
    const name = attr.name.name;
    if (/^on[A-Z]/.test(name)) {
      throw new DocDslError(
        `Event-handler attribute "${name}" on <${tag}> is not allowed`,
        locOf(attr)
      );
    }
    if (Object.prototype.hasOwnProperty.call(out, name)) {
      throw new DocDslError(`Duplicate attribute "${name}"`, locOf(attr));
    }
    out[name] = readAttrValue(attr);
  }
  // Privacy: images must be inlined as data: URIs — never a remote fetch.
  // Validate EVERY src-like prop that is present, not just the first one:
  // react-pdf accepts both `src` and `source`, so a benign `src="data:…"` must
  // not become a license to smuggle a remote URL — or a `source={{ uri }}`
  // object — through the other prop.
  if (tag === "Image") {
    const srcProps = (["src", "source"] as const).filter((k) => out[k] !== undefined);
    if (srcProps.length === 0) {
      throw new DocDslError(
        `<Image> requires a "src" with an inline "data:" URI (e.g. data:image/png;base64,…).`,
        locOf(el.openingElement)
      );
    }
    for (const key of srcProps) {
      const value = out[key];
      if (typeof value !== "string" || !value.startsWith("data:")) {
        throw new DocDslError(
          `<Image> ${key} must be an inline "data:" URI (e.g. data:image/png;base64,…). Remote image URLs (and { uri } objects) are not allowed for privacy reasons.`,
          locOf(el.openingElement)
        );
      }
    }
  }
  // Link hrefs: block script / local-file / data schemes (defense-in-depth for
  // a document the user downloads and opens). react-pdf resolves a link's
  // destination as `src || href` (see @react-pdf/layout getAttributedString),
  // so validate EVERY link-href-like prop that's present — guarding only `src`
  // would let `<Link href="javascript:…">` smuggle a script scheme through the
  // other prop, mirroring the Image src/source loop above.
  if (tag === "Link") {
    for (const key of ["src", "href"] as const) {
      const value = out[key];
      if (typeof value === "string") {
        assertSafeLinkHref(key, value, locOf(el.openingElement));
      }
    }
  }
  return out;
}

function readAttrValue(attr: JSXAttribute): DocAttrValue {
  const name = (attr.name as { name: string }).name;
  if (attr.value === null || attr.value === undefined) return true;
  if (attr.value.type === "StringLiteral") return attr.value.value;
  if (attr.value.type === "JSXExpressionContainer") {
    const expr = attr.value.expression;
    if (expr.type === "NumericLiteral") return expr.value;
    if (expr.type === "StringLiteral") return expr.value;
    if (expr.type === "BooleanLiteral") return expr.value;
    if (
      expr.type === "UnaryExpression" &&
      expr.operator === "-" &&
      expr.argument.type === "NumericLiteral"
    ) {
      return -expr.argument.value;
    }
    if (expr.type === "ObjectExpression") return readObjectExpr(expr, name, locOf(attr));
    if (expr.type === "JSXEmptyExpression") {
      throw new DocDslError(`Attribute "${name}" has an empty expression {}`, locOf(attr));
    }
    throw new DocDslError(
      `Attribute "${name}" uses a dynamic expression (${expr.type}); only literal values are supported`,
      locOf(attr)
    );
  }
  throw new DocDslError(`Unsupported attribute value type: ${attr.value.type}`, locOf(attr));
}

/**
 * Read an object-literal attribute value such as `style={{ fontSize: 12,
 * color: "#111" }}`. Keys must be plain identifiers or string literals; values
 * must be scalar literals (string / number / boolean, with negative numbers).
 */
function readObjectExpr(
  expr: import("@babel/types").ObjectExpression,
  attrName: string,
  loc: SrcLoc
): AttrObject {
  const out: AttrObject = {};
  for (const prop of expr.properties) {
    if (prop.type !== "ObjectProperty") {
      throw new DocDslError(`Attribute "${attrName}" object cannot contain ${prop.type}`, loc);
    }
    if (prop.computed) {
      throw new DocDslError(
        `Attribute "${attrName}" object keys must be plain identifiers or strings`,
        loc
      );
    }
    let key: string;
    if (prop.key.type === "Identifier") key = prop.key.name;
    else if (prop.key.type === "StringLiteral") key = prop.key.value;
    else {
      throw new DocDslError(
        `Attribute "${attrName}" object key type ${prop.key.type} not supported`,
        loc
      );
    }
    if (attrName === "style") validateStyleKey(key, loc);
    const v = prop.value;
    if (v.type === "StringLiteral") out[key] = v.value;
    else if (v.type === "NumericLiteral") out[key] = v.value;
    else if (v.type === "BooleanLiteral") out[key] = v.value;
    else if (
      v.type === "UnaryExpression" &&
      v.operator === "-" &&
      v.argument.type === "NumericLiteral"
    ) {
      out[key] = -v.argument.value;
    } else {
      throw new DocDslError(
        `Attribute "${attrName}.${key}" uses a non-literal value (${v.type})`,
        loc
      );
    }
    if (attrName === "style" && key === "fontFamily" && typeof out[key] === "string") {
      assertStandardFont(out[key] as string, loc);
    }
  }
  return out;
}

function assertStandardFont(family: string, loc: SrcLoc): void {
  if (STANDARD_FONTS.has(family)) return;
  throw new DocDslError(
    `fontFamily "${family}" is not a built-in PDF font. Use one of: Helvetica, Times-Roman, Courier (with their -Bold/-Oblique/-Italic variants), Symbol, ZapfDingbats. Custom fonts are not supported yet.`,
    loc
  );
}

/** URL schemes rejected on a `<Link>` href — dangerous in a downloadable PDF. */
const UNSAFE_LINK_SCHEME_RE = /^(javascript|vbscript|data|file):/i;

/**
 * Reject dangerous URL schemes on a `<Link>` href, blocking script /
 * local-file / data schemes; http(s), mailto, tel, and relative hrefs stay
 * allowed.
 *
 * Browsers and PDF viewers strip ALL C0 control characters and spaces
 * (charCode <= 0x20) from a URL — not just leading ones — before resolving its
 * scheme, so an embedded NUL or TAB inside the scheme name normalizes back to
 * a live script scheme. Drop every such char anywhere in the value before
 * matching, so obfuscation can't split a blocked scheme past the denylist.
 * Detection only — the original value is what gets stored if accepted.
 */
function assertSafeLinkHref(prop: string, value: string, loc: SrcLoc): void {
  let normalized = "";
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x20) normalized += value[i];
  }
  if (UNSAFE_LINK_SCHEME_RE.test(normalized)) {
    throw new DocDslError(
      `<Link> ${prop} "${value}" uses an unsafe URL scheme. Use an http(s), mailto, tel, or relative link.`,
      loc
    );
  }
}

function readChildren(el: JSXElement, tag: string, depth: number): DocChild[] {
  const ordered: DocChild[] = [];
  let sawText = false;

  for (const child of el.children) {
    if (child.type === "JSXText") {
      if (child.value.trim() === "" && /\n/.test(child.value)) continue;
      const normalized = normalizeJsxText(child.value);
      if (normalized === "") continue;
      ordered.push(normalized);
      sawText = true;
    } else if (child.type === "JSXExpressionContainer") {
      const expr = child.expression;
      if (expr.type === "JSXEmptyExpression") continue;
      if (expr.type === "StringLiteral") {
        ordered.push(expr.value);
        sawText = true;
        continue;
      }
      if (expr.type === "NumericLiteral") {
        ordered.push(String(expr.value));
        sawText = true;
        continue;
      }
      throw new DocDslError(
        `Only literal text/number children are supported (got ${expr.type})`,
        locOf(child)
      );
    } else if (child.type === "JSXElement") {
      ordered.push(parseElement(child, depth + 1));
    } else if (child.type === "JSXFragment") {
      throw new DocDslError(`<${tag}> cannot contain JSX fragments`, locOf(child));
    }
  }

  if (LEAF_TAGS.has(tag) && ordered.length > 0) {
    throw new DocDslError(`<${tag}> must be self-closing — it cannot have children`, locOf(el));
  }
  if (sawText && !TEXT_TAGS.has(tag)) {
    throw new DocDslError(`<${tag}> cannot contain raw text; wrap the text in <Text>`, locOf(el));
  }
  return ordered;
}

/** Collapse a raw JSXText value using React-like whitespace rules. */
function normalizeJsxText(raw: string): string {
  if (!raw.includes("\n")) return raw;
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");
}

// ---------------------------------------------------------------------------
// Structural validation (parent / context aware)
// ---------------------------------------------------------------------------

/**
 * Walk the tree enforcing contextual rules the per-element parse can't see:
 * `<Document>` only at the root, `<Page>` only directly under `<Document>`,
 * and the SVG vocabulary only inside an `<Svg>` subtree.
 */
function enforceStructure(node: DocNode, parent: DocNode | null, inSvg: boolean): void {
  if (!inSvg && SVG_ONLY_TAGS.has(node.tag)) {
    throw new DocDslError(`<${node.tag}> is an SVG element and may only appear inside an <Svg>.`);
  }
  if (node.tag === "Document" && parent !== null) {
    throw new DocDslError("<Document> may only appear as the root element");
  }
  if (node.tag === "Page" && (parent === null || parent.tag !== "Document")) {
    throw new DocDslError("<Page> may only appear as a direct child of <Document>");
  }
  if (parent?.tag === "Document" && node.tag !== "Page") {
    throw new DocDslError(`<Document> may only contain <Page> elements, got <${node.tag}>`);
  }
  const nowInSvg = inSvg || node.tag === "Svg";
  for (const child of node.children) {
    if (typeof child === "string") continue;
    if (nowInSvg && !SVG_TAGS.has(child.tag) && child.tag !== "Svg") {
      throw new DocDslError(`<${child.tag}> is not a valid SVG element inside <Svg>`, undefined);
    }
    enforceStructure(child, node, nowInSvg);
  }
}

// ---------------------------------------------------------------------------
// Introspection helpers
// ---------------------------------------------------------------------------

/** True iff `tag` is a permitted react-pdf document tag. */
export function isPdfTag(tag: string): boolean {
  return PDF_TAG_SET.has(tag);
}

/** The full list of permitted react-pdf document tags (for prompts/tests). */
export function pdfTags(): readonly string[] {
  return PDF_TAGS;
}

/** The full set of permitted react-pdf style keys (for prompts/tests). */
export function pdfStyleKeys(): readonly string[] {
  return Array.from(PDF_STYLE_KEYS);
}
