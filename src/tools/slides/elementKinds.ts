/**
 * Field inventories for each `SlideElement` kind, rendered into the system
 * prompt so the LLM knows which fields are valid on each element without
 * a full JSON Schema dump.
 *
 * Each spec mirrors a TypeScript interface in `./index.ts`. The runtime tests
 * in `./elementKinds.test.ts` assert coverage of the common geometry fields
 * and the `kind` discriminant; the spec is not machine-checked against the
 * interface (would require `as const` arrays and fragile tuple indexing), so
 * keep them in sync by hand when fields are added.
 */

type Field =
  /** Plain field — renders as `name` or `name?`. */
  | { name: string; optional?: boolean }
  /** Field with an explicit value/union — renders as `name: value`. */
  | { name: string; value: string; optional?: boolean };

interface ElementKindSpec {
  /** Element `kind` discriminant ("text", "shape", "image", "icon"). */
  name: string;
  /** Fields rendered between the braces, in source order. */
  fields: Field[];
  /** Free-form notes rendered under the kind line (indented). */
  notes?: string[];
}

const COMMON_GEOMETRY: Field[] = [
  { name: "id" },
  { name: "x" },
  { name: "y" },
  { name: "w" },
  { name: "h" },
];

export const ELEMENT_KINDS: ElementKindSpec[] = [
  {
    name: "text",
    fields: [
      { name: "kind", value: '"text"' },
      ...COMMON_GEOMETRY,
      { name: "text" },
      { name: "fontSize" },
      { name: "fontRole", value: '"heading"|"body"' },
      { name: "fontWeight" },
      { name: "color" },
      { name: "align", optional: true },
      { name: "lineHeight", optional: true },
      { name: "fontStyle", optional: true },
      { name: "textTransform", optional: true },
      { name: "fontFamily", optional: true },
    ],
    notes: [
      `fontFamily is optional — overrides the theme preset for this element (e.g. "Playfair Display", "JetBrains Mono"). Omit to use the theme default.`,
    ],
  },
  {
    name: "shape",
    fields: [
      { name: "kind", value: '"shape"' },
      ...COMMON_GEOMETRY,
      { name: "shape", value: '"rect"|"circle"|"line"' },
      { name: "fill", optional: true },
      { name: "stroke", optional: true },
      { name: "strokeWidth", optional: true },
      { name: "cornerRadius", optional: true },
    ],
  },
  {
    name: "image",
    fields: [
      { name: "kind", value: '"image"' },
      ...COMMON_GEOMETRY,
      { name: "src" },
      { name: "cornerRadius", optional: true },
    ],
  },
  {
    name: "icon",
    fields: [
      { name: "kind", value: '"icon"' },
      ...COMMON_GEOMETRY,
      { name: "name" },
      { name: "color" },
      { name: "fontSize" },
    ],
  },
];

function renderField(f: Field): string {
  const opt = f.optional ? "?" : "";
  if ("value" in f) return `${f.name}${opt}: ${f.value}`;
  return `${f.name}${opt}`;
}

/**
 * Render the element-kinds block embedded in the system prompt.
 *
 * Output shape per kind:
 *   kind: { field, field, enum: "a"|"b", optional? }
 *     optional note line
 */
export function renderElementKinds(): string {
  return ELEMENT_KINDS.map((spec) => {
    const body = spec.fields.map(renderField).join(", ");
    const lines = [`${spec.name}: { ${body} }`];
    if (spec.notes) {
      for (const n of spec.notes) lines.push(`  ${n}`);
    }
    return lines.join("\n");
  }).join("\n");
}
