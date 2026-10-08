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

type AttrScalar = string | number | boolean;

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

const PDF_TAGS = [
  "Document",
  "Page",
  "View",
  "Text",
  "Link",
  "Note",
  "Image",
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

const TEXT_TAGS = new Set<string>(["Text", "Link", "Note", "Tspan"]);

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

const SVG_BODY_SHARED_TAGS = new Set<string>(["Text"]);

const SVG_ONLY_TAGS = new Set<string>([...SVG_TAGS].filter((t) => !SVG_BODY_SHARED_TAGS.has(t)));

const TEXT_TAG_ELEMENT_CHILDREN: Record<string, ReadonlySet<string>> = {
  Text: new Set(["Text", "Link", "Image", "Tspan"]),
  Link: new Set(["View", "Image", "Text"]),
  Note: new Set<string>([]),
  Tspan: new Set<string>([]),
};

const PDF_STYLE_KEYS = new Set<string>([
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
  "backgroundColor",
  "color",
  "opacity",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
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
  "gap",
  "rowGap",
  "columnGap",
  "aspectRatio",
  "bottom",
  "display",
  "left",
  "position",
  "right",
  "top",
  "overflow",
  "zIndex",
  "margin",
  "marginHorizontal",
  "marginVertical",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingHorizontal",
  "paddingVertical",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
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
  "transformOrigin",
  "transformOriginX",
  "transformOriginY",
  "transform",
  "gradientTransform",
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
  "objectPosition",
  "objectPositionX",
  "objectPositionY",
  "objectFit",
]);

const STYLE_KEY_LOWER_TO_CAMEL = new Map<string, string>(
  Array.from(PDF_STYLE_KEYS, (k) => [k.toLowerCase(), k])
);

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
  if (!root.children.some((c) => typeof c !== "string" && c.tag === "Page")) {
    throw new DocDslError("<Document> must contain at least one <Page>.", locOf(ast));
  }
  return root;
}

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

const UNSAFE_LINK_SCHEME_RE = /^(javascript|vbscript|data|file):/i;

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

function normalizeJsxText(raw: string): string {
  if (!raw.includes("\n")) return raw;
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");
}

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
    const inlineChildren = TEXT_TAG_ELEMENT_CHILDREN[node.tag];
    if (inlineChildren && !SVG_ONLY_TAGS.has(child.tag) && !inlineChildren.has(child.tag)) {
      throw new DocDslError(
        `<${child.tag}> cannot appear inside <${node.tag}>: text tags hold only inline content` +
          (inlineChildren.size
            ? ` (text plus ${[...inlineChildren].join(", ")}).`
            : " (plain text only).")
      );
    }
    if (nowInSvg && !SVG_TAGS.has(child.tag) && child.tag !== "Svg") {
      throw new DocDslError(`<${child.tag}> is not a valid SVG element inside <Svg>`, undefined);
    }
    enforceStructure(child, node, nowInSvg);
  }
}

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
