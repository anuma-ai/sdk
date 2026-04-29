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

// ---------------------------------------------------------------------------
// AST types
// ---------------------------------------------------------------------------

/** Scalar value an attribute can hold. */
type AttrScalar = string | number | boolean;

/**
 * An object-valued attribute — used primarily for `style={{}}`. Keys are
 * CSS property names in camelCase (`fontSize`, `borderRadius`, …); values
 * are scalars.
 */
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

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const NAMESPACE = "Anuma";

/**
 * `Anuma.*` primitives — things that aren't native HTML concepts. Kept
 * deliberately small; general content uses raw HTML.
 *
 * - Deck / Slide / Screen: layout containers with canvas semantics.
 * - Text / Image / Icon / Group: preserved for slide templates and LLM
 *   fluency (with theme-token bindings on Text). Safe to mix with HTML.
 * - Rect / Circle / Line: SVG shape abstractions.
 */
const ANUMA_TAGS = [
  "Deck",
  "Slide",
  "Screen",
  "Group",
  "Text",
  "Image",
  "Rect",
  "Circle",
  "Line",
  "Icon",
] as const;

export type KnownTag = (typeof ANUMA_TAGS)[number];

const ANUMA_TAG_SET = new Set<string>(ANUMA_TAGS);

/**
 * Allowlist of plain HTML tags the LLM may emit alongside `<Anuma.*>`.
 * These are pass-through at the parser; the renderer treats them as
 * native DOM elements.
 */
const HTML_TAGS = new Set<string>([
  // structural
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
  // text
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
  // lists
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  // interactive / form
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
  // tabular
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
  // media
  "img",
  "picture",
  "source",
  "video",
  "audio",
  "track",
  "canvas",
  // svg
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

/**
 * HTML tags that must never appear — they let an LLM smuggle script
 * execution or exfiltrate content. Reject at parse time.
 */
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

/** Tags whose body is raw text (JSX children are the displayed string). */
const TEXT_BODY_TAGS = new Set<string>([
  "Text",
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

/** Tags rendered as self-closing when they have no meaningful children. */
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

// ---------------------------------------------------------------------------
// Parse: JSX string -> AnumaNode
// ---------------------------------------------------------------------------

export function parseJsx(source: string): AnumaNode {
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
  return parseElement(ast);
}

function parseElement(el: JSXElement): AnumaNode {
  const tag = readTag(el);
  const attrs = readAttributes(el, tag);
  const children = readChildren(el, tag);
  return { tag, attrs, children };
}

/**
 * Read and validate the opening tag. Accepts `<Anuma.Name>` where `Name`
 * is in the Anuma primitive vocabulary, or a bare lowercase HTML tag from
 * the allowlist. Rejects unknown namespaces, unknown Anuma tags, forbidden
 * HTML (script / iframe / etc.), and unrecognized bare tags.
 */
function readTag(el: JSXElement): string {
  const name = el.openingElement.name;
  if (name.type === "JSXIdentifier") {
    const localName = name.name;
    // Heuristic: capitalized bare tag looks like a user-imported React
    // component — we don't accept those. Only HTML allowlist.
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

/** Render a tag for messages and serialized output: `Anuma.X` for primitives, `x` for HTML. */
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

/**
 * Read an object-literal attribute value such as `style={{ fontSize: 43,
 * color: "textPrimary" }}`. Keys must be plain identifiers or string
 * literals; values must be scalar literals (string / number / boolean,
 * with negative-number support).
 */
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

function readChildren(el: JSXElement, tag: string): AnumaChild[] {
  const textParts: string[] = [];
  const elements: AnumaNode[] = [];
  let sawNonText = false;
  let sawText = false;

  for (const child of el.children) {
    if (child.type === "JSXText") {
      if (child.value.trim() === "" && /\n/.test(child.value)) continue;
      const normalized = normalizeJsxText(child.value);
      if (normalized === "") continue;
      textParts.push(normalized);
      sawText = true;
    } else if (child.type === "JSXExpressionContainer") {
      const expr = child.expression;
      if (expr.type === "JSXEmptyExpression") continue;
      if (expr.type === "StringLiteral") {
        textParts.push(expr.value);
        sawText = true;
        continue;
      }
      if (expr.type === "NumericLiteral") {
        textParts.push(String(expr.value));
        sawText = true;
        continue;
      }
      throw new AnumaJsxError(
        `Only literal text/number children are supported (got ${expr.type})`,
        locOf(child)
      );
    } else if (child.type === "JSXElement") {
      elements.push(parseElement(child));
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

  if (TEXT_BODY_TAGS.has(tag)) {
    if (sawNonText) {
      throw new AnumaJsxError(`<${tagName(tag)}> cannot contain nested elements`, locOf(el));
    }
    return textParts.length > 0 ? [textParts.join("")] : [];
  }

  // Container tag — element children only.
  if (sawText) {
    throw new AnumaJsxError(
      `<${tagName(tag)}> cannot contain text; wrap text in <${NAMESPACE}.Text>`,
      locOf(el)
    );
  }
  return elements;
}

/**
 * Collapse a raw JSXText value using React-like whitespace rules: leading /
 * trailing whitespace lines drop, interior multi-line whitespace collapses
 * to a single space.
 */
function normalizeJsxText(raw: string): string {
  const lines = raw.split("\n").map((line) => line.replace(/\s+$/g, ""));
  const trimmed: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lines.length === 1) {
      trimmed.push(line);
      continue;
    }
    const cleaned = line.replace(/^\s+/, "");
    if (cleaned !== "") trimmed.push(cleaned);
  }
  return trimmed.join(" ");
}

// ---------------------------------------------------------------------------
// Serialize: AnumaNode -> JSX string
// ---------------------------------------------------------------------------

interface SerializeOptions {
  /** Indent per level (default two spaces). */
  indent?: string;
  /** Max single-line width before attrs break onto multiple lines (default 100). */
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

  // Text body?
  if (TEXT_BODY_TAGS.has(node.tag)) {
    const body = node.children.filter((c): c is string => typeof c === "string").join("");
    if (body === "") {
      lines.push(`${pad}${openTag(node, indent, depth, true, maxLineWidth)}`);
      return;
    }
    const head = openTag(node, indent, depth, false, maxLineWidth);
    const rendered = isSafeJsxText(body) ? body : `{${JSON.stringify(body)}}`;
    const line = `${pad}${head}${rendered}</${tagName(node.tag)}>`;
    // If the head was multi-line (contained a newline), we still splice the
    // body onto the final line — acceptable since text-body tags generally
    // fit on one visual block.
    if (head.includes("\n")) {
      // Replace the trailing ">" line with ">body</Tag>"
      const prefix = `${pad}${head}`;
      const replaced = prefix.replace(/>$/, `>${rendered}</${tagName(node.tag)}>`);
      lines.push(replaced);
    } else {
      lines.push(line);
    }
    return;
  }

  // Leaf (self-closing) or empty container?
  const elementChildren = node.children.filter((c): c is AnumaNode => typeof c !== "string");
  if (LEAF_TAGS.has(node.tag) || elementChildren.length === 0) {
    lines.push(`${pad}${openTag(node, indent, depth, true, maxLineWidth)}`);
    return;
  }

  // Container with children.
  lines.push(`${pad}${openTag(node, indent, depth, false, maxLineWidth)}`);
  for (const child of elementChildren) {
    writeNode(lines, child, indent, depth + 1, maxLineWidth);
  }
  lines.push(`${pad}</${tagName(node.tag)}>`);
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

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

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
    // Can't replace the root in-place; caller should do that via the
    // returned tree. Treat as no-op failure here.
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
