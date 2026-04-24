/**
 * Attribute inventories for each `<Anuma.*>` tag, rendered into the system
 * prompt so the LLM knows which attributes are valid on each tag without a
 * full schema dump.
 *
 * Attribute split:
 * - Structured attrs for geometry, layout, and semantics (id, x/y/w/h, flex
 *   child attrs, fontRole, src, name, shape fill/stroke, etc.).
 * - `style={{}}` carries CSS-shaped appearance properties: typography,
 *   color, borderRadius, shadows, etc. Values are scalars (strings /
 *   numbers / booleans). Color strings may be theme tokens (`textPrimary`,
 *   `accent`) or hex/rgb literals.
 *
 * All coordinates and sizes are container-relative pixels (slide canvas
 * is 960×540). The runtime tests in `./elementKinds.test.ts` assert
 * coverage of the common geometry attrs and the expected tag set.
 */

type Attr =
  /** Plain attr — renders as `attr` or `attr?`. */
  | { name: string; optional?: boolean }
  /** Attr with an explicit value/enum — renders as `attr={"a"|"b"}`. */
  | { name: string; value: string; optional?: boolean };

interface ElementKindSpec {
  /** Local tag name — the part after `Anuma.` (e.g. "Text", "Rect"). */
  tag: string;
  /** Attributes rendered on the opening tag, in source order. */
  attrs: Attr[];
  /** CSS style properties that commonly appear on this tag, documentation-only. */
  styleKeys?: string[];
  /**
   * Element body description. `"text"` → body is the element's text content.
   * `"children"` → body contains nested elements. Omit for self-closing.
   */
  body?: "text" | "children";
  /** Free-form notes rendered under the signature (indented). */
  notes?: string[];
}

const COMMON_GEOMETRY: Attr[] = [
  { name: "id" },
  { name: "x" },
  { name: "y" },
  { name: "w" },
  { name: "h" },
  { name: "rotation", optional: true },
];

/**
 * Geometry for elements that live inside a flex container — `x`/`y` are
 * computed by the parent, but `w`/`h` can still be set for fixed sizing,
 * plus `grow`/`shrink`/`alignSelf` for flex-specific control.
 */
const FLEX_CHILD_ATTRS: Attr[] = [
  { name: "grow", optional: true },
  { name: "shrink", optional: true },
  { name: "alignSelf", value: `"start"|"center"|"end"|"stretch"`, optional: true },
];

/** Attrs shared by container tags that support opting into flex layout. */
const CONTAINER_LAYOUT_ATTRS: Attr[] = [
  { name: "layout", value: `"absolute"|"row"|"column"`, optional: true },
  { name: "gap", optional: true },
  { name: "padding", optional: true },
  { name: "justify", value: `"start"|"center"|"end"|"space-between"`, optional: true },
  { name: "align", value: `"start"|"center"|"end"|"stretch"`, optional: true },
];

/** Style attr rendered last on any tag that accepts it. */
const STYLE_ATTR: Attr = { name: "style", optional: true };

export const ELEMENT_KINDS: ElementKindSpec[] = [
  {
    tag: "Text",
    attrs: [
      ...COMMON_GEOMETRY,
      ...FLEX_CHILD_ATTRS,
      { name: "fontRole", value: `"heading"|"body"` },
      STYLE_ATTR,
    ],
    styleKeys: [
      "fontSize",
      "fontWeight",
      "color",
      "textAlign",
      "lineHeight",
      "letterSpacing",
      "fontStyle",
      "textTransform",
      "fontFamily",
    ],
    body: "text",
    notes: [
      `Body text goes between the opening and closing tags (React children). All typography lives inside style={{}}: fontSize (px), fontWeight (100–900), color (theme token or #hex), textAlign, lineHeight, letterSpacing, fontStyle, textTransform, fontFamily.`,
      `fontRole is semantic, not CSS — pick "heading" or "body" so the theme's font preset picks the right face by default.`,
    ],
  },
  {
    tag: "Image",
    attrs: [...COMMON_GEOMETRY, ...FLEX_CHILD_ATTRS, { name: "src" }, STYLE_ATTR],
    styleKeys: ["borderRadius", "opacity", "objectFit"],
  },
  {
    tag: "Rect",
    attrs: [
      ...COMMON_GEOMETRY,
      ...FLEX_CHILD_ATTRS,
      { name: "fill", optional: true },
      { name: "stroke", optional: true },
      { name: "strokeWidth", optional: true },
      { name: "cornerRadius", optional: true },
    ],
    notes: [`Rendered as SVG: fill / stroke / strokeWidth are SVG attrs, not CSS.`],
  },
  {
    tag: "Circle",
    attrs: [
      ...COMMON_GEOMETRY,
      ...FLEX_CHILD_ATTRS,
      { name: "fill", optional: true },
      { name: "stroke", optional: true },
      { name: "strokeWidth", optional: true },
    ],
    notes: [`Rendered as SVG.`],
  },
  {
    tag: "Line",
    attrs: [
      ...COMMON_GEOMETRY,
      { name: "stroke", optional: true },
      { name: "strokeWidth", optional: true },
    ],
    notes: [`Rendered as SVG.`],
  },
  {
    tag: "Icon",
    attrs: [...COMMON_GEOMETRY, ...FLEX_CHILD_ATTRS, { name: "name" }, STYLE_ATTR],
    styleKeys: ["color", "fontSize"],
    notes: [
      `Material Symbols Rounded name (e.g. "bolt", "check_circle"). fontSize (px) and color live in style.`,
    ],
  },
  {
    tag: "Group",
    attrs: [
      { name: "id" },
      { name: "x", optional: true },
      { name: "y", optional: true },
      { name: "w", optional: true },
      { name: "h", optional: true },
      { name: "rotation", optional: true },
      ...FLEX_CHILD_ATTRS,
      ...CONTAINER_LAYOUT_ATTRS,
      STYLE_ATTR,
    ],
    body: "children",
    notes: [
      `Structural container. Defaults to absolute positioning (children use x/y).`,
      `Opt into flex with layout="row" | "column"; children then flow and skip x/y. gap/padding/justify/align control the flex layout.`,
    ],
  },
];

function renderAttr(a: Attr): string {
  const opt = a.optional ? "?" : "";
  if ("value" in a) return `${a.name}${opt}={${a.value}}`;
  return `${a.name}${opt}`;
}

/**
 * Render the element-kinds block embedded in the system prompt.
 *
 * Output shape per tag:
 *   <Anuma.Tag attr attr? enum={"a"|"b"} ... />
 *     optional note line
 */
export function renderElementKinds(): string {
  return ELEMENT_KINDS.map((spec) => {
    const attrs = spec.attrs.map(renderAttr).join(" ");
    const signature =
      spec.body === "text"
        ? `<Anuma.${spec.tag} ${attrs}>…</Anuma.${spec.tag}>`
        : spec.body === "children"
          ? `<Anuma.${spec.tag} ${attrs}>…children…</Anuma.${spec.tag}>`
          : `<Anuma.${spec.tag} ${attrs} />`;
    const lines = [signature];
    if (spec.styleKeys && spec.styleKeys.length > 0) {
      lines.push(`  style keys: ${spec.styleKeys.join(", ")}`);
    }
    if (spec.notes) {
      for (const n of spec.notes) lines.push(`  ${n}`);
    }
    return lines.join("\n");
  }).join("\n");
}
