/**
 * Catalog of slide layout templates used by `buildSlideSystemPrompt` in
 * `./index.ts`. Each template has typed `elements` (real `SlideElement[]`
 * with concrete coordinates) plus optional free-form `notes` that don't
 * map to elements (e.g. "set slide.background to a dark hex").
 *
 * The prompt builder walks this array and emits prose lines the LLM copies
 * into its own element arrays. Storage format is unchanged — the LLM still
 * writes raw elements that the chat-app editor can manipulate directly.
 *
 * Why typed data and not strings:
 *   - TypeScript catches coordinate typos and invalid field values.
 *   - A unit test can assert every template is a valid SlideElement[].
 *   - Other consumers (editor UI, thumbnail renderer, validation) can read
 *     the same catalog without re-parsing prose.
 */

import type { SlideElement } from "./index";

export interface LayoutTemplate {
  /** Name shown to the LLM and used as the human-readable key. */
  name: string;
  /**
   * Free-form hints that don't fit as elements. Rendered before the element
   * list in the prompt. Use for things like "set slide.background" or
   * "use '• ' prefix for each bullet line".
   */
  notes?: string[];
  /**
   * Reference elements with real coordinates + example content. The LLM is
   * told to copy the shape and substitute its own text values.
   */
  elements: SlideElement[];
}

// ---------------------------------------------------------------------------
// Helpers — keep per-template definitions compact
// ---------------------------------------------------------------------------

/** Mono uppercase label (eyebrow / chrome metadata). */
function eyebrow(
  id: string,
  text: string,
  x: number,
  y: number,
  w: number,
  opts: {
    color?: string;
    fontSize?: number;
    letterSpacing?: number;
    align?: "left" | "center" | "right";
  } = {}
): SlideElement {
  return {
    id,
    kind: "text",
    x,
    y,
    w,
    h: 3.5,
    text,
    fontSize: opts.fontSize ?? 1.4,
    fontRole: "body",
    fontWeight: 500,
    color: opts.color ?? "textMuted",
    fontFamily: "JetBrains Mono",
    letterSpacing: opts.letterSpacing ?? 0.16,
    textTransform: "uppercase",
    align: opts.align ?? "left",
  };
}

/** Horizontal hairline rule — 1px line spanning the content area. */
function hrule(id: string, y: number, strokeWidth = 1): SlideElement {
  return {
    id,
    kind: "shape",
    x: 6,
    y,
    w: 88,
    h: 0,
    shape: "line",
    stroke: "border",
    strokeWidth,
  };
}

/** Narrow vertical divider (uses a rect since line shape is horizontal-only). */
function vdiv(id: string, x: number, y: number, h: number): SlideElement {
  return {
    id,
    kind: "shape",
    x,
    y,
    w: 0.1,
    h,
    shape: "rect",
    fill: "border",
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    name: "COVER (centered)",
    elements: [
      {
        id: "title",
        kind: "text",
        x: 7.5,
        y: 30,
        w: 85,
        h: 20,
        text: "Title Here",
        fontSize: 4.5,
        fontRole: "heading",
        fontWeight: 700,
        color: "textPrimary",
        align: "center",
      },
      {
        id: "subtitle",
        kind: "text",
        x: 19,
        y: 55,
        w: 62,
        h: 8,
        text: "Subtitle here",
        fontSize: 2.3,
        fontRole: "heading",
        fontWeight: 500,
        color: "textSecondary",
        align: "center",
      },
    ],
  },

  {
    name: "COVER (left, with accent bar)",
    elements: [
      {
        id: "bar",
        kind: "shape",
        x: 6,
        y: 26,
        w: 5,
        h: 0.6,
        shape: "rect",
        fill: "accent",
        cornerRadius: 0.2,
      },
      {
        id: "title",
        kind: "text",
        x: 6,
        y: 30,
        w: 88,
        h: 24,
        text: "Title Here",
        fontSize: 4.5,
        fontRole: "heading",
        fontWeight: 700,
        color: "textPrimary",
        align: "left",
      },
      {
        id: "subtitle",
        kind: "text",
        x: 6,
        y: 56,
        w: 88,
        h: 9,
        text: "Subtitle here",
        fontSize: 2.3,
        fontRole: "heading",
        fontWeight: 500,
        color: "textSecondary",
        align: "left",
      },
    ],
  },

  {
    name: "COVER (bottom — huge title at bottom, metadata top)",
    elements: [
      eyebrow("meta", "META · 2024", 6, 7, 30, { fontSize: 1.4 }),
      {
        id: "title",
        kind: "text",
        x: 6,
        y: 68,
        w: 88,
        h: 26,
        text: "Huge Title Here",
        fontSize: 6.5,
        fontRole: "heading",
        fontWeight: 700,
        color: "textPrimary",
        align: "left",
      },
    ],
  },

  {
    name: "SECTION (dark chapter break — rhythm marker between parts of a multi-part deck)",
    notes: [
      `Set slide.background to a dark hex (e.g. "#1F2A22", "#1a1b1e") so this slide reads as a tonal shift from content slides.`,
    ],
    elements: [
      eyebrow("eyebrow", "CHAPTER TWO", 6, 55, 40, { color: "accent" }),
      {
        id: "title",
        kind: "text",
        x: 6,
        y: 61,
        w: 88,
        h: 26,
        text: "Timing is\nhalf the game.",
        fontSize: 7.5,
        fontRole: "heading",
        fontWeight: 400,
        color: "#EDE6D8",
        fontStyle: "italic",
        align: "left",
        lineHeight: 1.02,
      },
      {
        id: "subtitle",
        kind: "text",
        x: 6,
        y: 89,
        w: 82,
        h: 7,
        text: "Supporting line at the bottom.",
        fontSize: 1.8,
        fontRole: "body",
        fontWeight: 400,
        color: "#B8BEB3",
        align: "left",
        lineHeight: 1.3,
      },
    ],
  },

  {
    name: "TEXT (prose)",
    elements: [
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 10,
        w: 88,
        h: 10,
        text: "Heading",
        fontSize: 3,
        fontRole: "heading",
        fontWeight: 600,
        color: "textPrimary",
        align: "left",
      },
      {
        id: "body",
        kind: "text",
        x: 6,
        y: 23,
        w: 66,
        h: 65,
        text: "Prose body text.",
        fontSize: 1.9,
        fontRole: "body",
        fontWeight: 400,
        color: "textSecondary",
        align: "left",
        lineHeight: 1.8,
      },
    ],
  },

  {
    name: "TEXT (bullets)",
    notes: [`Use "• " prefix for each bullet line inside the "bullets" text.`],
    elements: [
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 9,
        w: 88,
        h: 10,
        text: "Heading",
        fontSize: 3,
        fontRole: "heading",
        fontWeight: 600,
        color: "accent",
        align: "left",
      },
      {
        id: "bullets",
        kind: "text",
        x: 6,
        y: 22,
        w: 88,
        h: 68,
        text: "• First point\n• Second point\n• Third point",
        fontSize: 1.9,
        fontRole: "body",
        fontWeight: 400,
        color: "textSecondary",
        align: "left",
        lineHeight: 1.75,
      },
    ],
  },

  {
    name: "TEXT (two-column — heading left, content right)",
    elements: [
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 9,
        w: 33,
        h: 82,
        text: "HEADING",
        fontSize: 3.3,
        fontRole: "heading",
        fontWeight: 700,
        color: "accent",
        align: "left",
        textTransform: "uppercase",
      },
      {
        id: "body",
        kind: "text",
        x: 43,
        y: 9,
        w: 51,
        h: 82,
        text: "Body text in the right column.",
        fontSize: 1.9,
        fontRole: "body",
        fontWeight: 400,
        color: "textSecondary",
        align: "left",
        lineHeight: 1.7,
      },
    ],
  },

  {
    name: "STATS (hairline cells — editorial grid, no filled cards)",
    notes: [`Use SHARED HEADER PATTERN above (y 9–26) for the title/rule above the grid.`],
    elements: [
      hrule("topRule", 30),
      // Cell 0
      eyebrow("c0_eyebrow", "01 · REVENUE", 7, 34, 27, { fontSize: 1.3, letterSpacing: 0.14 }),
      {
        id: "c0_value",
        kind: "text",
        x: 7,
        y: 41,
        w: 27,
        h: 12,
        text: "142%",
        fontSize: 5.5,
        fontRole: "heading",
        fontWeight: 400,
        color: "accent",
        align: "left",
        lineHeight: 1.0,
      },
      {
        id: "c0_body",
        kind: "text",
        x: 7,
        y: 57,
        w: 27,
        h: 20,
        text: "Year-over-year growth, Q4.",
        fontSize: 1.5,
        fontRole: "body",
        fontWeight: 400,
        color: "textSecondary",
        align: "left",
        lineHeight: 1.4,
      },
      // Cell 1
      vdiv("div1", 36, 31, 48),
      eyebrow("c1_eyebrow", "02 · USERS", 37, 34, 27, { fontSize: 1.3, letterSpacing: 0.14 }),
      {
        id: "c1_value",
        kind: "text",
        x: 37,
        y: 41,
        w: 27,
        h: 12,
        text: "2.4M",
        fontSize: 5.5,
        fontRole: "heading",
        fontWeight: 400,
        color: "accent",
        align: "left",
        lineHeight: 1.0,
      },
      {
        id: "c1_body",
        kind: "text",
        x: 37,
        y: 57,
        w: 27,
        h: 20,
        text: "Monthly active users.",
        fontSize: 1.5,
        fontRole: "body",
        fontWeight: 400,
        color: "textSecondary",
        align: "left",
        lineHeight: 1.4,
      },
      // Cell 2
      vdiv("div2", 66, 31, 48),
      eyebrow("c2_eyebrow", "03 · UPTIME", 67, 34, 27, { fontSize: 1.3, letterSpacing: 0.14 }),
      {
        id: "c2_value",
        kind: "text",
        x: 67,
        y: 41,
        w: 27,
        h: 12,
        text: "99.9%",
        fontSize: 5.5,
        fontRole: "heading",
        fontWeight: 400,
        color: "accent",
        align: "left",
        lineHeight: 1.0,
      },
      {
        id: "c2_body",
        kind: "text",
        x: 67,
        y: 57,
        w: 27,
        h: 20,
        text: "Rolling 30-day average.",
        fontSize: 1.5,
        fontRole: "body",
        fontWeight: 400,
        color: "textSecondary",
        align: "left",
        lineHeight: 1.4,
      },
      hrule("bottomRule", 80),
    ],
  },

  {
    name: "STATS (inline — border-left accent)",
    notes: [
      `For each stat: a narrow vertical accent bar (rect w=0.3, h=11, fill="accent") followed by a big value text and a smaller label text, stacked together.`,
    ],
    elements: [],
  },

  {
    name: "STATS (large — featured number)",
    elements: [
      {
        id: "value",
        kind: "text",
        x: 7.5,
        y: 28,
        w: 85,
        h: 22,
        text: "50M+",
        fontSize: 7.5,
        fontRole: "heading",
        fontWeight: 700,
        color: "accent",
        align: "center",
      },
      {
        id: "label",
        kind: "text",
        x: 15,
        y: 52,
        w: 70,
        h: 8,
        text: "API calls processed daily",
        fontSize: 2.1,
        fontRole: "heading",
        fontWeight: 400,
        color: "textMuted",
        align: "center",
      },
      {
        id: "body",
        kind: "text",
        x: 15,
        y: 63,
        w: 70,
        h: 12,
        text: "A 3x increase from last quarter.",
        fontSize: 1.9,
        fontRole: "body",
        fontWeight: 400,
        color: "textMuted",
        align: "center",
        lineHeight: 1.5,
      },
    ],
  },

  {
    name: "LIST (hairline entries — editorial field guide, 3 cols × 2 rows)",
    notes: [
      `Use SHARED HEADER PATTERN above for the title/rule.`,
      `Six entries arranged as 3 columns × 2 rows. Vertical dividers separate columns, a horizontal rule separates rows.`,
    ],
    elements: (() => {
      const els: SlideElement[] = [hrule("topRule", 30)];
      const sampleEntries = [
        { eyebrow: "SUCKING · SOFT-BODIED", title: "Aphids", body: "Clusters on new growth. Sticky residue." },
        { eyebrow: "CHEWING · NOCTURNAL", title: "Slugs", body: "Silver trails at dawn. Ragged holes in leaves." },
        { eyebrow: "CHEWING · CATERPILLAR", title: "Cabbage worms", body: "Green velvet caterpillars on brassicas." },
        { eyebrow: "ARMORED · BEETLES", title: "Japanese beetles", body: "Skeletonized leaves, metallic clusters." },
        { eyebrow: "SUCKING · TINY", title: "Spider mites", body: "Stippled yellow leaves, fine webs underneath." },
        { eyebrow: "BORING · HIDDEN", title: "Squash vine borers", body: "Sudden plant collapse, sawdust at stem base." },
      ];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          const x = 7 + 30 * c;
          const y = 33 + r * 24;
          const sample = sampleEntries[idx]!;
          els.push(
            eyebrow(`e${idx}_eyebrow`, sample.eyebrow, x, y, 27, { fontSize: 1.3, letterSpacing: 0.14 })
          );
          els.push({
            id: `e${idx}_title`,
            kind: "text",
            x,
            y: y + 4,
            w: 27,
            h: 7,
            text: sample.title,
            fontSize: 3.8,
            fontRole: "heading",
            fontWeight: 400,
            color: "textPrimary",
            align: "left",
            lineHeight: 1.0,
          });
          els.push({
            id: `e${idx}_body`,
            kind: "text",
            x,
            y: y + 13,
            w: 27,
            h: 9,
            text: sample.body,
            fontSize: 1.5,
            fontRole: "body",
            fontWeight: 400,
            color: "textSecondary",
            align: "left",
            lineHeight: 1.35,
          });
        }
      }
      els.push(vdiv("divC1", 36, 31, 48));
      els.push(vdiv("divC2", 66, 31, 48));
      els.push(hrule("midRule", 56));
      els.push(hrule("bottomRule", 80));
      return els;
    })(),
  },

  {
    name: "LIST (minimal — sidebar heading, stacked items with dividers)",
    notes: [
      `Items stack in the right column with line dividers (shape "line" with stroke="border") between them.`,
    ],
    elements: [
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 9,
        w: 29,
        h: 82,
        text: "SIDEBAR HEADING",
        fontSize: 3.3,
        fontRole: "heading",
        fontWeight: 700,
        color: "accent",
        textTransform: "uppercase",
      },
    ],
  },

  {
    name: "QUOTE (large, centered)",
    elements: [
      {
        id: "quote",
        kind: "text",
        x: 7.5,
        y: 26,
        w: 85,
        h: 37,
        text: "A large centered italic quote goes here.",
        fontSize: 3.3,
        fontRole: "heading",
        fontWeight: 400,
        color: "textPrimary",
        align: "center",
        fontStyle: "italic",
        lineHeight: 1.4,
      },
      eyebrow("attribution", "— SOURCE", 20, 69, 60, {
        fontSize: 1.5,
        letterSpacing: 0.14,
        align: "center",
      }),
    ],
  },

  {
    name: "QUOTE (offset — left-aligned with accent bar)",
    elements: [
      {
        id: "bar",
        kind: "shape",
        x: 7.5,
        y: 28,
        w: 0.3,
        h: 33,
        shape: "rect",
        fill: "accent",
      },
      {
        id: "quote",
        kind: "text",
        x: 10,
        y: 28,
        w: 73,
        h: 33,
        text: "The quote text goes here.",
        fontSize: 2.6,
        fontRole: "heading",
        fontWeight: 400,
        color: "textPrimary",
        align: "left",
        lineHeight: 1.55,
      },
      eyebrow("attribution", "— SOURCE", 10, 65, 73, { fontSize: 1.5, letterSpacing: 0.14 }),
    ],
  },

  {
    name: "TIMELINE (numbered, vertical)",
    notes: [
      `For each step: a small number text (fontSize=1.9, fontWeight=700, color="accent") + a step title + a step body, with line dividers between steps.`,
    ],
    elements: [
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 7,
        w: 88,
        h: 8,
        text: "Heading",
        fontSize: 2.5,
        fontRole: "heading",
        fontWeight: 600,
        color: "textPrimary",
      },
    ],
  },

  {
    name: "TIMELINE (horizontal axis)",
    notes: [
      `For each event along the axis: a vertical tick line + a title below the tick + a short body below the title.`,
    ],
    elements: [
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 7,
        w: 88,
        h: 10,
        text: "Heading",
        fontSize: 3.3,
        fontRole: "heading",
        fontWeight: 700,
        color: "accent",
      },
      {
        id: "axis",
        kind: "shape",
        x: 6,
        y: 40,
        w: 88,
        h: 0,
        shape: "line",
        stroke: "border",
        strokeWidth: 2,
      },
    ],
  },

  {
    name: "HERO (split — text left, image right)",
    elements: [
      {
        id: "image",
        kind: "image",
        x: 50,
        y: 0,
        w: 50,
        h: 100,
        src: "attached:0",
      },
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 9,
        w: 40,
        h: 19,
        text: "HEADING",
        fontSize: 3.3,
        fontRole: "heading",
        fontWeight: 700,
        color: "accent",
        textTransform: "uppercase",
      },
      {
        id: "body",
        kind: "text",
        x: 6,
        y: 30,
        w: 40,
        h: 37,
        text: "Body copy here.",
        fontSize: 1.9,
        fontRole: "body",
        fontWeight: 400,
        color: "textSecondary",
        lineHeight: 1.7,
      },
    ],
  },

  {
    name: "HERO (overlay — full image with gradient + text at bottom)",
    elements: [
      {
        id: "image",
        kind: "image",
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        src: "attached:0",
      },
      {
        id: "gradient",
        kind: "shape",
        x: 0,
        y: 40,
        w: 100,
        h: 60,
        shape: "rect",
        fill: "rgba(0,0,0,0.7)",
      },
      {
        id: "heading",
        kind: "text",
        x: 6,
        y: 67,
        w: 88,
        h: 15,
        text: "Heading on gradient",
        fontSize: 4.2,
        fontRole: "heading",
        fontWeight: 700,
        color: "#ffffff",
      },
      {
        id: "body",
        kind: "text",
        x: 6,
        y: 83,
        w: 88,
        h: 9,
        text: "Body text on gradient.",
        fontSize: 1.9,
        fontRole: "body",
        fontWeight: 400,
        color: "rgba(255,255,255,0.88)",
      },
    ],
  },

  {
    name: "TABLE",
    notes: [
      `Compose with: heading text + a header row (bold text elements) + data rows (regular text elements) + line dividers between rows.`,
    ],
    elements: [],
  },

  {
    name: "FOCUS (metric — huge centered number)",
    notes: [`Same coordinates as STATS (large — featured number). See that template above.`],
    elements: [],
  },

  {
    name: "FOCUS (accent — centered statement with underline)",
    elements: [
      {
        id: "title",
        kind: "text",
        x: 7.5,
        y: 26,
        w: 85,
        h: 22,
        text: "Statement of the slide.",
        fontSize: 5.2,
        fontRole: "heading",
        fontWeight: 700,
        color: "textPrimary",
        align: "center",
      },
      {
        id: "underline",
        kind: "shape",
        x: 47,
        y: 50,
        w: 6,
        h: 0.6,
        shape: "rect",
        fill: "accent",
        cornerRadius: 0.2,
      },
      {
        id: "subtitle",
        kind: "text",
        x: 10,
        y: 54,
        w: 80,
        h: 9,
        text: "Supporting subtitle.",
        fontSize: 3,
        fontRole: "heading",
        fontWeight: 500,
        color: "textSecondary",
        align: "center",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Prompt rendering
// ---------------------------------------------------------------------------

/**
 * Render a single element as a recipe line the LLM can copy. Uses the
 * element's id as the prefix and a compact inline key/value body — the
 * same format the original prompt used.
 */
function renderElementLine(el: SlideElement): string {
  const { id, ...rest } = el;
  const parts = Object.entries(rest).map(([k, v]) => {
    if (typeof v === "string") return `${k}: ${JSON.stringify(v)}`;
    return `${k}: ${v}`;
  });
  return `  ${id}: { ${parts.join(", ")} }`;
}

/** Render the full `LAYOUT_TEMPLATES` array to the prose block the prompt embeds. */
export function renderLayoutTemplates(): string {
  return LAYOUT_TEMPLATES.map((template) => {
    const lines: string[] = [`${template.name}:`];
    if (template.notes) {
      for (const note of template.notes) lines.push(`  ${note}`);
    }
    for (const el of template.elements) {
      lines.push(renderElementLine(el));
    }
    return lines.join("\n");
  }).join("\n\n");
}
