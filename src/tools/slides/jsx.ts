/**
 * Anuma JSX AST — the in-memory model for slides and app mockups.
 *
 * Every artifact is a tree of `AnumaNode` values rooted at an `<Anuma.Deck>`
 * (slides) or `<Anuma.Screen>` (apps — Stage 6+). There are no typed
 * per-tag interfaces; the tree is tag-agnostic. Consumers walk the tree
 * and dispatch on `node.tag`.
 *
 * Vocabulary (checked at parse time):
 * - Containers: `<Anuma.Deck>`, `<Anuma.Slide>`, `<Anuma.Group>`.
 * - Leaves: `<Anuma.Text>`, `<Anuma.Image>`, `<Anuma.Rect>`, `<Anuma.Circle>`,
 *   `<Anuma.Line>`, `<Anuma.Icon>`.
 *
 * All coordinates are container-relative pixels — the slide canvas is
 * 960×540 px, any child's `x`/`y`/`w`/`h` are pixels measured from the
 * parent's top-left. Containers may opt into a flex layout with
 * `layout="row" | "column"` plus `gap` / `padding` / `justify` / `align`;
 * children inside a flex container skip `x`/`y` and flow instead.
 *
 * Numeric attrs are JSX expressions (`x={96}`), strings are quoted
 * literals, booleans use `{true}`/`{false}` (or bare `hidden` for true).
 * Dynamic expressions (`{someVar}`) are rejected in this version.
 *
 * @module tools/slides/jsx
 */

import { parseExpression } from "@babel/parser";
import type {
  JSXAttribute,
  JSXElement,
  JSXMemberExpression,
  Node,
  SourceLocation,
} from "@babel/types";

type AttrScalar = string | number | boolean;

type AttrObject = Record<string, AttrScalar>;

export type AttrValue = AttrScalar | AttrObject;

export type AnumaChild = AnumaNode | string;

/**
 * A node in the Anuma tree. `tag` is the local name after `Anuma.` (e.g.
 * `"Text"`, `"Slide"`). Children are other nodes for containers, or a
 * single string (the body text) for `<Anuma.Text>`.
 */
export interface AnumaNode {
  tag: string;
  attrs: Record<string, AttrValue>;
  children: AnumaChild[];
}

export class AnumaJsxError extends Error {
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, loc?: { line: number; column: number } | null) {
    const suffix = loc ? ` (line ${loc.line}:${loc.column})` : "";
    super(`${message}${suffix}`);
    this.name = "AnumaJsxError";
    this.line = loc?.line;
    this.column = loc?.column;
  }
}

type SrcLoc = { line: number; column: number } | null | undefined;

function locOf(node: { loc?: SourceLocation | null }): SrcLoc {
  return node.loc?.start;
}

const NAMESPACE = "Anuma";

const ANUMA_TAGS = [
  "Deck",
  "Slide",
  "Screen",
  "Group",
  "Text",
  "Span",
  "Image",
  "Rect",
  "Circle",
  "Line",
  "Icon",
] as const;

export type KnownTag = (typeof ANUMA_TAGS)[number];

const ANUMA_TAG_SET = new Set<string>(ANUMA_TAGS);

const HTML_TAGS = new Set<string>([
  "div",
  "span",
  "section",
  "article",
  "header",
  "footer",
  "main",
  "aside",
  "nav",
  "figure",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "code",
  "pre",
  "blockquote",
  "small",
  "sub",
  "sup",
  "mark",
  "hr",
  "br",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "optgroup",
  "label",
  "fieldset",
  "legend",
  "form",
  "progress",
  "meter",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "img",
  "picture",
  "source",
  "video",
  "audio",
  "track",
  "canvas",
  "svg",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "g",
  "defs",
  "use",
  "symbol",
  "text",
  "tspan",
  "mask",
  "clipPath",
  "linearGradient",
  "radialGradient",
  "stop",
]);

const FORBIDDEN_HTML_TAGS = new Set<string>([
  "script",
  "iframe",
  "link",
  "style",
  "meta",
  "object",
  "embed",
  "base",
  "head",
  "html",
  "body",
  "noscript",
  "frame",
  "frameset",
  "applet",
  "portal",
]);

const MIXED_CONTENT_TAGS = new Set<string>(["Text"]);

const INLINE_CONTENT_TAGS = new Set<string>(["Span"]);

const TEXT_BODY_TAGS = new Set<string>([
  "Text",
  "Span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "a",
  "button",
  "label",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "code",
  "pre",
  "blockquote",
  "small",
  "sub",
  "sup",
  "mark",
  "caption",
  "th",
  "td",
  "option",
  "legend",
  "figcaption",
  "dt",
  "dd",
  "summary",
]);

const LEAF_TAGS = new Set<string>([
  "Image",
  "Rect",
  "Circle",
  "Line",
  "Icon",
  "img",
  "hr",
  "br",
  "input",
  "source",
  "track",
  "col",
]);

const STYLE_ALLOWED_KEYS = new Set<string>([
  "alignItems",
  "alignSelf",
  "background",
  "backgroundColor",
  "backgroundImage",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundSize",
  "border",
  "borderColor",
  "borderRadius",
  "borderStyle",
  "borderWidth",
  "bottom",
  "boxShadow",
  "boxSizing",
  "color",
  "display",
  "filter",
  "flex",
  "flexBasis",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexWrap",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "gap",
  "height",
  "justifyContent",
  "left",
  "letterSpacing",
  "lineHeight",
  "listStyle",
  "margin",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginTop",
  "maxHeight",
  "maxWidth",
  "minHeight",
  "minWidth",
  "objectFit",
  "objectPosition",
  "opacity",
  "overflow",
  "overflowX",
  "overflowY",
  "padding",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "position",
  "right",
  "textAlign",
  "textDecoration",
  "textTransform",
  "top",
  "transform",
  "transformOrigin",
  "verticalAlign",
  "visibility",
  "whiteSpace",
  "width",
  "wordBreak",
  "wordSpacing",
  "zIndex",
]);

const STYLE_KEY_LOWER_TO_CAMEL = new Map<string, string>(
  Array.from(STYLE_ALLOWED_KEYS, (k) => [k.toLowerCase(), k])
);

function validateStyleKey(key: string, loc: SrcLoc): void {
  if (STYLE_ALLOWED_KEYS.has(key)) return;
  const lower = key.toLowerCase();
  const suggestion = STYLE_KEY_LOWER_TO_CAMEL.get(lower);
  if (suggestion && suggestion !== key) {
    throw new AnumaJsxError(
      `Unknown CSS-in-JS style key "${key}". Did you mean "${suggestion}"? React silently ignores unknown style keys, so this would render at the default value.`,
      loc
    );
  }
  throw new AnumaJsxError(
    `Unknown CSS-in-JS style key "${key}". Recognized keys are camelCase CSS properties (fontSize, lineHeight, color, …). React silently ignores unknown keys, so this would render at the default value.`,
    loc
  );
}

/**
 * Non-throwing equivalent of {@link validateStyleKey} for code paths that
 * merge attrs without re-parsing JSX (e.g. `update_element` in patch_slides).
 * Returns an error string on the first invalid key, or `null` if every key
 * in `style` is on the allowlist.
 */
export function validateStyleObject(style: Record<string, unknown>): string | null {
  for (const key of Object.keys(style)) {
    if (STYLE_ALLOWED_KEYS.has(key)) continue;
    const suggestion = STYLE_KEY_LOWER_TO_CAMEL.get(key.toLowerCase());
    if (suggestion && suggestion !== key) {
      return `Unknown CSS-in-JS style key "${key}". Did you mean "${suggestion}"? React silently ignores unknown style keys.`;
    }
    return `Unknown CSS-in-JS style key "${key}". Recognized keys are camelCase CSS properties (fontSize, lineHeight, color, …). React silently ignores unknown keys.`;
  }
  return null;
}

const TOP_LEVEL_FORBIDDEN_STYLE_KEYS = new Set<string>([
  "fontSize",
  "fontWeight",
  "fontFamily",
  "fontStyle",
  "fontVariant",
  "color",
  "textAlign",
  "textDecoration",
  "textTransform",
  "letterSpacing",
  "lineHeight",
  "wordSpacing",
  "wordBreak",
  "whiteSpace",
  "verticalAlign",
]);

/**
 * Throw if any key in `attrs` is a styling-only prop that belongs inside
 * `style={{}}`. The error is actionable — it tells the model exactly
 * where to move the value.
 */
export function checkNoTopLevelStyles(
  tag: string,
  attrs: Record<string, unknown>,
  loc?: SrcLoc
): void {
  for (const key of Object.keys(attrs)) {
    if (!TOP_LEVEL_FORBIDDEN_STYLE_KEYS.has(key)) continue;
    const value = attrs[key];
    const valueStr =
      typeof value === "string"
        ? JSON.stringify(value)
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : "...";
    throw new AnumaJsxError(
      `Top-level "${key}={${valueStr}}" on <${tag}> — visual styling props belong inside style={{}}. Move to style={{ ${key}: ${valueStr} }}. The renderer reads styling from style={{}} only, so a top-level prop silently falls back to defaults (18px, white).`,
      loc
    );
  }
}

/** True iff `tag` is a text-body tag whose children are the displayed string. */
export function isTextBodyTag(tag: string): boolean {
  return TEXT_BODY_TAGS.has(tag);
}

/**
 * Parse a JSX source string into an AnumaNode tree.
 *
 * `strict` mode (opt-in, defaults to `false`) enables checks that catch
 * model-emitted JSX with the wrong convention before it lands in the deck:
 * top-level visual-styling props on text elements (which the renderer
 * silently ignores → invisible output). Stored decks load with strict off
 * — any deck previously built before the strict check existed might carry
 * non-conforming JSX, and we don't want a tightened validator to retro-
 * actively break every tool call on that deck. Callers that parse
 * model-submitted JSX (`add_slide`, `insert_slide`, `replace_slide`,
 * `replace_element`, `insert_element`) pass `strict: true`.
 */
export function parseJsx(source: string, options?: { strict?: boolean }): AnumaNode {
  let ast: Node;
  try {
    ast = parseExpression(source, {
      plugins: ["jsx"],
      errorRecovery: false,
      sourceType: "module",
    });
  } catch (err) {
    const e = err as Error & { loc?: { line: number; column: number } };
    throw new AnumaJsxError(`Invalid JSX: ${e.message}`, e.loc);
  }
  if (ast.type !== "JSXElement") {
    throw new AnumaJsxError(`Expected a JSX element at the top level, got ${ast.type}`, locOf(ast));
  }
  return parseElement(ast, options?.strict ?? false);
}

function parseElement(el: JSXElement, strict: boolean): AnumaNode {
  const tag = readTag(el);
  const attrs = readAttributes(el, tag);
  if (strict) {
    checkNoTopLevelStyles(tag, attrs, locOf(el.openingElement));
  }
  const children = readChildren(el, tag, strict);
  return { tag, attrs, children };
}

function readTag(el: JSXElement): string {
  const name = el.openingElement.name;
  if (name.type === "JSXIdentifier") {
    const localName = name.name;
    if (/^[A-Z]/.test(localName)) {
      throw new AnumaJsxError(
        `Bare capitalized tag <${localName}> not supported. Use <${NAMESPACE}.*> or a plain HTML tag.`,
        locOf(el.openingElement)
      );
    }
    if (FORBIDDEN_HTML_TAGS.has(localName)) {
      throw new AnumaJsxError(
        `<${localName}> is not allowed for safety reasons.`,
        locOf(el.openingElement)
      );
    }
    if (!HTML_TAGS.has(localName)) {
      throw new AnumaJsxError(
        `Unknown HTML tag <${localName}>. See the HTML allowlist in the system prompt.`,
        locOf(el.openingElement)
      );
    }
    return localName;
  }
  if (name.type !== "JSXMemberExpression") {
    throw new AnumaJsxError(
      `Expected <${NAMESPACE}.*> or a plain HTML tag`,
      locOf(el.openingElement)
    );
  }
  if (name.object.type !== "JSXIdentifier") {
    throw new AnumaJsxError(
      `Deeply-nested JSX names not supported: <${jsxMemberName(name)}>`,
      locOf(el.openingElement)
    );
  }
  if (name.object.name !== NAMESPACE) {
    throw new AnumaJsxError(
      `Unknown namespace: <${name.object.name}.${name.property.name}>. Expected <${NAMESPACE}.*>.`,
      locOf(el.openingElement)
    );
  }
  const local = name.property.name;
  if (!ANUMA_TAG_SET.has(local)) {
    throw new AnumaJsxError(
      `Unknown tag <${NAMESPACE}.${local}>. Expected one of ${ANUMA_TAGS.map((t) => `<${NAMESPACE}.${t}>`).join(", ")}.`,
      locOf(el.openingElement)
    );
  }
  return local;
}

/** True when a tag is an Anuma primitive (capitalized local name). */
export function isAnumaTag(tag: string): boolean {
  return ANUMA_TAG_SET.has(tag);
}

function tagName(tag: string): string {
  return ANUMA_TAG_SET.has(tag) ? `${NAMESPACE}.${tag}` : tag;
}

/** True when a tag is a plain HTML element from the allowlist. */
export function isHtmlTag(tag: string): boolean {
  return HTML_TAGS.has(tag);
}

function jsxMemberName(node: JSXMemberExpression): string {
  const parts: string[] = [node.property.name];
  let current: JSXMemberExpression["object"] = node.object;
  while (current.type === "JSXMemberExpression") {
    parts.unshift(current.property.name);
    current = current.object;
  }
  if (current.type === "JSXIdentifier") parts.unshift(current.name);
  return parts.join(".");
}

function readAttributes(el: JSXElement, tag: string): Record<string, AttrValue> {
  const out: Record<string, AttrValue> = {};
  for (const attr of el.openingElement.attributes) {
    if (attr.type === "JSXSpreadAttribute") {
      throw new AnumaJsxError("Spread attributes are not supported", locOf(attr));
    }
    if (attr.name.type !== "JSXIdentifier") {
      throw new AnumaJsxError("Namespaced attribute names are not supported", locOf(attr));
    }
    const name = attr.name.name;
    if (/^on[A-Z]/.test(name)) {
      throw new AnumaJsxError(
        `Event-handler attribute "${name}" on <${tag}> is not allowed`,
        locOf(attr)
      );
    }
    if (Object.prototype.hasOwnProperty.call(out, name)) {
      throw new AnumaJsxError(`Duplicate attribute "${name}"`, locOf(attr));
    }
    out[name] = readAttrValue(attr);
  }
  return out;
}

function readAttrValue(attr: JSXAttribute): AttrValue {
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
      throw new AnumaJsxError(`Attribute "${name}" has an empty expression {}`, locOf(attr));
    }
    throw new AnumaJsxError(
      `Attribute "${name}" uses a dynamic expression (${expr.type}); only literal values are supported in this version`,
      locOf(attr)
    );
  }
  throw new AnumaJsxError(`Unsupported attribute value type: ${attr.value.type}`, locOf(attr));
}

function readObjectExpr(
  expr: import("@babel/types").ObjectExpression,
  attrName: string,
  loc: SrcLoc
): AttrObject {
  const out: AttrObject = {};
  for (const prop of expr.properties) {
    if (prop.type !== "ObjectProperty") {
      throw new AnumaJsxError(`Attribute "${attrName}" object cannot contain ${prop.type}`, loc);
    }
    if (prop.computed) {
      throw new AnumaJsxError(
        `Attribute "${attrName}" object keys must be plain identifiers or strings`,
        loc
      );
    }
    let key: string;
    if (prop.key.type === "Identifier") key = prop.key.name;
    else if (prop.key.type === "StringLiteral") key = prop.key.value;
    else {
      throw new AnumaJsxError(
        `Attribute "${attrName}" object key type ${prop.key.type} not supported`,
        loc
      );
    }
    if (attrName === "style") validateStyleKey(key, loc);
    const v = prop.value;
    if (v.type === "StringLiteral") {
      out[key] = v.value;
    } else if (v.type === "NumericLiteral") {
      out[key] = v.value;
    } else if (v.type === "BooleanLiteral") {
      out[key] = v.value;
    } else if (
      v.type === "UnaryExpression" &&
      v.operator === "-" &&
      v.argument.type === "NumericLiteral"
    ) {
      out[key] = -v.argument.value;
    } else {
      throw new AnumaJsxError(
        `Attribute "${attrName}.${key}" uses a non-literal value (${v.type})`,
        loc
      );
    }
  }
  return out;
}

function readChildren(el: JSXElement, tag: string, strict: boolean): AnumaChild[] {
  const ordered: AnumaChild[] = [];
  let sawNonText = false;
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
      throw new AnumaJsxError(
        `Only literal text/number children are supported (got ${expr.type})`,
        locOf(child)
      );
    } else if (child.type === "JSXElement") {
      ordered.push(parseElement(child, strict));
      sawNonText = true;
    } else if (child.type === "JSXFragment") {
      throw new AnumaJsxError(`<${tagName(tag)}> cannot contain JSX fragments`, locOf(child));
    }
  }

  if (LEAF_TAGS.has(tag)) {
    if (sawNonText || sawText) {
      throw new AnumaJsxError(`<${tagName(tag)}> must be self-closing`, locOf(el));
    }
    return [];
  }

  if (MIXED_CONTENT_TAGS.has(tag)) {
    for (const c of ordered) {
      if (typeof c !== "string" && !INLINE_CONTENT_TAGS.has(c.tag)) {
        throw new AnumaJsxError(
          `<${tagName(tag)}> can only contain text and inline ${[...INLINE_CONTENT_TAGS]
            .map((t) => `<${NAMESPACE}.${t}>`)
            .join(", ")}`,
          locOf(el)
        );
      }
    }
    return ordered;
  }

  if (TEXT_BODY_TAGS.has(tag)) {
    if (sawNonText) {
      throw new AnumaJsxError(`<${tagName(tag)}> cannot contain nested elements`, locOf(el));
    }
    const textChildren = ordered.filter((c): c is string => typeof c === "string");
    return textChildren.length > 0 ? [textChildren.join("")] : [];
  }

  if (sawText) {
    throw new AnumaJsxError(
      `<${tagName(tag)}> cannot contain text; wrap text in <${NAMESPACE}.Text>`,
      locOf(el)
    );
  }
  return ordered.filter((c): c is AnumaNode => typeof c !== "string");
}

function normalizeJsxText(raw: string): string {
  if (!raw.includes("\n")) return raw;
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return lines.join(" ");
}

interface SerializeOptions {
  indent?: string;
  maxLineWidth?: number;
}

export function serializeJsx(node: AnumaNode, options: SerializeOptions = {}): string {
  const indent = options.indent ?? "  ";
  const maxLineWidth = options.maxLineWidth ?? 100;
  const lines: string[] = [];
  writeNode(lines, node, indent, 0, maxLineWidth);
  return lines.join("\n");
}

function writeNode(
  lines: string[],
  node: AnumaNode,
  indent: string,
  depth: number,
  maxLineWidth: number
): void {
  const pad = indent.repeat(depth);

  if (TEXT_BODY_TAGS.has(node.tag)) {
    const rendered = MIXED_CONTENT_TAGS.has(node.tag)
      ? node.children
          .map((c) =>
            typeof c === "string"
              ? isSafeJsxText(c)
                ? c
                : `{${JSON.stringify(c)}}`
              : serializeInline(c)
          )
          .join("")
      : (() => {
          const body = node.children.filter((c): c is string => typeof c === "string").join("");
          return isSafeJsxText(body) ? body : `{${JSON.stringify(body)}}`;
        })();
    if (rendered === "") {
      lines.push(`${pad}${openTag(node, indent, depth, true, maxLineWidth)}`);
      return;
    }
    const head = openTag(node, indent, depth, false, maxLineWidth);
    const line = `${pad}${head}${rendered}</${tagName(node.tag)}>`;
    if (head.includes("\n")) {
      const prefix = `${pad}${head}`;
      const replaced = prefix.replace(/>$/, `>${rendered}</${tagName(node.tag)}>`);
      lines.push(replaced);
    } else {
      lines.push(line);
    }
    return;
  }

  const elementChildren = node.children.filter((c): c is AnumaNode => typeof c !== "string");
  if (LEAF_TAGS.has(node.tag) || elementChildren.length === 0) {
    lines.push(`${pad}${openTag(node, indent, depth, true, maxLineWidth)}`);
    return;
  }

  lines.push(`${pad}${openTag(node, indent, depth, false, maxLineWidth)}`);
  for (const child of elementChildren) {
    writeNode(lines, child, indent, depth + 1, maxLineWidth);
  }
  lines.push(`${pad}</${tagName(node.tag)}>`);
}

function serializeInline(node: AnumaNode): string {
  const tag = tagName(node.tag);
  const attrEntries = Object.entries(node.attrs);
  const attrPart =
    attrEntries.length === 0 ? "" : " " + attrEntries.map(([k, v]) => formatAttr(k, v)).join(" ");
  const body = node.children.filter((c): c is string => typeof c === "string").join("");
  if (body === "") return `<${tag}${attrPart} />`;
  const rendered = isSafeJsxText(body) ? body : `{${JSON.stringify(body)}}`;
  return `<${tag}${attrPart}>${rendered}</${tag}>`;
}

function openTag(
  node: AnumaNode,
  indent: string,
  depth: number,
  selfClose: boolean,
  maxLineWidth: number
): string {
  const head = `<${tagName(node.tag)}`;
  const tail = selfClose ? " />" : ">";
  const entries = Object.entries(node.attrs);
  if (entries.length === 0) return `${head}${tail}`;

  const single = `${head} ${entries.map(([k, v]) => formatAttr(k, v)).join(" ")}${tail}`;
  if (single.length <= maxLineWidth) return single;

  const attrPad = indent.repeat(depth + 1);
  const closePad = indent.repeat(depth);
  const body = entries.map(([k, v]) => `${attrPad}${formatAttr(k, v)}`).join("\n");
  return `${head}\n${body}\n${closePad}${selfClose ? "/>" : ">"}`;
}

function formatAttr(name: string, value: AttrValue): string {
  if (typeof value === "string") return `${name}=${JSON.stringify(value)}`;
  if (typeof value === "number") return `${name}={${String(value)}}`;
  if (typeof value === "boolean") return `${name}={${value ? "true" : "false"}}`;
  return `${name}={${formatObjectAttr(value)}}`;
}

function formatObjectAttr(obj: AttrObject): string {
  const entries = Object.entries(obj).map(([k, v]) => {
    const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
    if (typeof v === "string") return `${key}: ${JSON.stringify(v)}`;
    if (typeof v === "number") return `${key}: ${String(v)}`;
    return `${key}: ${v ? "true" : "false"}`;
  });
  return `{ ${entries.join(", ")} }`;
}

function isSafeJsxText(text: string): boolean {
  if (/[<>{}&]/.test(text)) return false;
  if (/\n/.test(text)) return false;
  if (/^\s|\s$/.test(text)) return false;
  return true;
}

/** Return `attrs.id` as a string, or undefined. */
export function getId(node: AnumaNode): string | undefined {
  const id = node.attrs.id;
  return typeof id === "string" ? id : undefined;
}

/**
 * Walk the tree depth-first. Visitor sees `(node, parent)` — parent is
 * `null` for the root. Return `false` from the visitor to skip descending
 * into a node's children.
 */
export function walk(
  root: AnumaNode,
  visitor: (node: AnumaNode, parent: AnumaNode | null) => void | false
): void {
  function visit(node: AnumaNode, parent: AnumaNode | null): void {
    const cont = visitor(node, parent);
    if (cont === false) return;
    for (const child of node.children) {
      if (typeof child !== "string") visit(child, node);
    }
  }
  visit(root, null);
}

/**
 * Remove every `<Anuma.Image>` descendant whose `src` attribute contains
 * the given sentinel string — used by add_slide to auto-strip unfilled
 * image placeholders the model failed to replace. Returns the number of
 * elements removed so the caller can surface a hint to the model.
 *
 * Mutates `root` in place. Only `<Anuma.Image>` children are inspected;
 * other elements that happen to contain the sentinel in some attribute
 * are left intact (the sentinel is only ever emitted as an Image.src by
 * the compiler, so any other occurrence is a separate bug worth seeing).
 */
export function stripImagesWithSrcSubstring(root: AnumaNode, sentinel: string): number {
  let stripped = 0;
  function visit(node: AnumaNode): void {
    if (!Array.isArray(node.children) || node.children.length === 0) return;
    const next: AnumaChild[] = [];
    for (const child of node.children) {
      if (typeof child === "string") {
        next.push(child);
        continue;
      }
      if (
        child.tag === "Image" &&
        typeof child.attrs.src === "string" &&
        child.attrs.src.includes(sentinel)
      ) {
        stripped++;
        continue;
      }
      visit(child);
      next.push(child);
    }
    node.children = next;
  }
  visit(root);
  return stripped;
}

/** Find the first node whose `attrs.id` matches `id`. */
export function findById(root: AnumaNode, id: string): AnumaNode | null {
  let found: AnumaNode | null = null;
  walk(root, (node) => {
    if (getId(node) === id) {
      found = node;
      return false;
    }
    return undefined;
  });
  return found;
}

/** Find the parent of the node with matching id (null if root or missing). */
export function findParentOfId(root: AnumaNode, id: string): AnumaNode | null {
  let parent: AnumaNode | null = null;
  walk(root, (node, p) => {
    if (getId(node) === id) {
      parent = p;
      return false;
    }
    return undefined;
  });
  return parent;
}

/**
 * Replace the first node with matching id in the tree. Mutates `root` in
 * place. Returns true on success.
 */
export function replaceById(root: AnumaNode, id: string, next: AnumaNode): boolean {
  if (getId(root) === id) {
    return false;
  }
  let replaced = false;
  walk(root, (node) => {
    if (replaced) return false;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (typeof child !== "string" && getId(child) === id) {
        node.children[i] = next;
        replaced = true;
        return false;
      }
    }
    return undefined;
  });
  return replaced;
}

/**
 * Insert `node` into `parent.children`. If `afterId` is provided, the new
 * node is inserted immediately after the matched sibling; otherwise it is
 * appended to the end.
 */
export function insertChild(parent: AnumaNode, node: AnumaNode, afterId?: string): void {
  if (afterId === undefined) {
    parent.children.push(node);
    return;
  }
  const idx = parent.children.findIndex((c) => typeof c !== "string" && getId(c) === afterId);
  if (idx === -1) parent.children.push(node);
  else parent.children.splice(idx + 1, 0, node);
}

/**
 * Insert `node` immediately after the node with matching id anywhere in
 * the tree. Returns true on success.
 */
export function insertAfterId(root: AnumaNode, afterId: string, node: AnumaNode): boolean {
  const parent = findParentOfId(root, afterId);
  if (!parent) return false;
  insertChild(parent, node, afterId);
  return true;
}

/** Remove the node with matching id. Mutates `root`. Returns true on success. */
export function removeById(root: AnumaNode, id: string): boolean {
  let removed = false;
  walk(root, (node) => {
    if (removed) return false;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (typeof child !== "string" && getId(child) === id) {
        node.children.splice(i, 1);
        removed = true;
        return false;
      }
    }
    return undefined;
  });
  return removed;
}

/** Shallow-merge attrs onto `node`. Ignores prototype-pollution keys. */
export function updateAttrs(node: AnumaNode, patch: Record<string, unknown>): void {
  for (const key of Object.keys(patch)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const value = patch[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      node.attrs[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const sanitized: AttrObject = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          sanitized[k] = v;
        }
      }
      node.attrs[key] = sanitized;
    }
  }
}

/** Read a string attr, returning undefined if absent or wrong type. */
export function getStringAttr(node: AnumaNode, name: string): string | undefined {
  const v = node.attrs[name];
  return typeof v === "string" ? v : undefined;
}

/** Read a number attr, returning undefined if absent or wrong type. */
export function getNumberAttr(node: AnumaNode, name: string): number | undefined {
  const v = node.attrs[name];
  return typeof v === "number" ? v : undefined;
}
