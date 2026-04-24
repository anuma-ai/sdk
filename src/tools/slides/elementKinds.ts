/**
 * Attribute inventories for each `<Anuma.*>` tag, rendered into the system
 * prompt so the LLM knows which attributes are valid on each tag without a
 * full schema dump.
 *
 * All coordinates and sizes are container-relative pixels (slide canvas is
 * 960×540). The runtime tests in `./elementKinds.test.ts` assert coverage
 * of the common geometry attrs and the expected tag set.
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

export const ELEMENT_KINDS: ElementKindSpec[] = [
  {
    tag: "Text",
    attrs: [
      ...COMMON_GEOMETRY,
      ...FLEX_CHILD_ATTRS,
      { name: "fontSize" },
      { name: "fontRole", value: `"heading"|"body"` },
      { name: "fontWeight" },
      { name: "color" },
      { name: "align", value: `"left"|"center"|"right"`, optional: true },
      { name: "lineHeight", optional: true },
      { name: "letterSpacing", optional: true },
      { name: "fontStyle", value: `"italic"|"normal"`, optional: true },
      { name: "textTransform", value: `"uppercase"|"none"`, optional: true },
      { name: "fontFamily", optional: true },
    ],
    body: "text",
    notes: [
      `Body text goes between the opening and closing tags (React children). fontSize is pixels (e.g. 43 for a hero heading, 18 for body).`,
      `fontFamily is optional — overrides the theme preset for this element (e.g. "Playfair Display", "JetBrains Mono"). Omit to use the theme default.`,
    ],
  },
  {
    tag: "Image",
    attrs: [
      ...COMMON_GEOMETRY,
      ...FLEX_CHILD_ATTRS,
      { name: "src" },
      { name: "cornerRadius", optional: true },
    ],
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
  },
  {
    tag: "Line",
    attrs: [
      ...COMMON_GEOMETRY,
      { name: "stroke", optional: true },
      { name: "strokeWidth", optional: true },
    ],
  },
  {
    tag: "Icon",
    attrs: [
      ...COMMON_GEOMETRY,
      ...FLEX_CHILD_ATTRS,
      { name: "name" },
      { name: "color" },
      { name: "fontSize" },
    ],
    notes: [`Material Symbols Rounded name (e.g. "bolt", "check_circle"). fontSize is pixels.`],
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
    if (spec.notes) {
      for (const n of spec.notes) lines.push(`  ${n}`);
    }
    return lines.join("\n");
  }).join("\n");
}
