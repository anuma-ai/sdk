/**
 * Typed catalog of Google Fonts that SlideElement.fontFamily can reference.
 *
 * The model sees this library in the plan_deck tool result and can reach for
 * any entry as a per-element `fontFamily` override — e.g. pair the deck's
 * theme body (Inter) with a dramatic Abril Fatface hero title on the cover,
 * or a short Caveat script accent under a pull quote.
 *
 * Invariants:
 *  - Every font in FONT_PRESETS (heading or body) is also in FONT_LIBRARY.
 *    Tests enforce this so the theme default pairings always resolve.
 *  - The renderer loads only the fonts actually used by a given deck via
 *    buildFontsUrl(), so per-element overrides are zero-cost when unused.
 *
 * Why typed data and not strings: as with layouts + palettes, a structured
 * catalog lets us (a) validate fontFamily at write time (reject typos
 * before they hit the renderer), (b) render a compact, role-grouped prompt
 * block, and (c) derive the Google Fonts URL deterministically.
 */

export type FontCategory = "display" | "serif-body" | "sans-body" | "mono" | "accent";

export interface FontSpec {
  /** Exact Google Fonts family name — used verbatim as TextElement.fontFamily. */
  name: string;
  /** Role bucket — display (hero), body (reading), mono (chrome), accent (sparingly). */
  category: FontCategory;
  /** One-line feel/usage hint shown to the model next to the name. */
  feel: string;
  /**
   * Semicolon-separated weight list for the Google Fonts CSS2 URL, e.g.
   * "400;500;700". Empty string means the family is single-weight (no
   * :wght@ segment in the slug).
   */
  weights: string;
}

export const FONT_LIBRARY: FontSpec[] = [
  // ── DISPLAY ────────────────────────────────────────────────────────────
  {
    name: "Abril Fatface",
    category: "display",
    feel: "high-contrast display serif — magazine covers, hero statements",
    weights: "",
  },
  {
    name: "Bebas Neue",
    category: "display",
    feel: "tall condensed caps — posters, impact headlines",
    weights: "",
  },
  {
    name: "Righteous",
    category: "display",
    feel: "rounded geometric display — friendly impact",
    weights: "",
  },
  {
    name: "Oswald",
    category: "display",
    feel: "condensed sans — newspaper-style big titles, event names",
    weights: "400;500;700",
  },
  {
    name: "DM Serif Display",
    category: "display",
    feel: "modern high-contrast serif — premium, luxury",
    weights: "400",
  },
  {
    name: "Playfair Display",
    category: "display",
    feel: "classic editorial serif — long history, authoritative",
    weights: "400;500;700",
  },
  {
    name: "Instrument Serif",
    category: "display",
    feel: "elegant italic-friendly serif — fashion/editorial hero titles",
    weights: "",
  },

  // ── SERIF BODY ─────────────────────────────────────────────────────────
  {
    name: "Merriweather",
    category: "serif-body",
    feel: "screen-tuned serif — comfortable long-form reading",
    weights: "400;700",
  },
  {
    name: "Libre Baskerville",
    category: "serif-body",
    feel: "traditional book serif — academic, literary",
    weights: "400;700",
  },
  {
    name: "Crimson Text",
    category: "serif-body",
    feel: "warm literary serif — essays, book excerpts",
    weights: "400;600;700",
  },
  {
    name: "Lora",
    category: "serif-body",
    feel: "modern calligraphic serif — cultural, reflective",
    weights: "400;500;600;700",
  },
  {
    name: "Bitter",
    category: "serif-body",
    feel: "slab-ish serif — technical but readable",
    weights: "400;500;700",
  },
  {
    name: "Arvo",
    category: "serif-body",
    feel: "geometric slab serif — retro, sturdy",
    weights: "400;700",
  },

  // ── SANS BODY (and general-purpose headings) ───────────────────────────
  {
    name: "Inter",
    category: "sans-body",
    feel: "modern neutral sans — the safe default, UI-tuned",
    weights: "400;500;600;700",
  },
  {
    name: "Roboto",
    category: "sans-body",
    feel: "industrial Android sans — neutral, practical",
    weights: "400;500;700",
  },
  {
    name: "Open Sans",
    category: "sans-body",
    feel: "humanist sans — friendly, widely readable",
    weights: "400;500;600;700",
  },
  {
    name: "Lato",
    category: "sans-body",
    feel: "warm semi-rounded sans — welcoming, corporate-friendly",
    weights: "400;700",
  },
  {
    name: "Montserrat",
    category: "sans-body",
    feel: "geometric urban sans — versatile; good as heading too",
    weights: "400;500;600;700",
  },
  {
    name: "Poppins",
    category: "sans-body",
    feel: "geometric sans — optimistic, marketing-friendly",
    weights: "400;500;600;700",
  },
  {
    name: "Source Sans Pro",
    category: "sans-body",
    feel: "Adobe clear sans — the predecessor; conservative UI",
    weights: "400;600;700",
  },
  {
    name: "Source Sans 3",
    category: "sans-body",
    feel: "Adobe clear sans (v3) — editorial body default",
    weights: "400;600",
  },
  {
    name: "Raleway",
    category: "sans-body",
    feel: "thin elegant sans — fashion, boutique",
    weights: "400;500;600;700",
  },
  {
    name: "Nunito",
    category: "sans-body",
    feel: "rounded friendly sans — softer, approachable",
    weights: "400;600;700",
  },
  {
    name: "Ubuntu",
    category: "sans-body",
    feel: "distinctive slightly-rounded sans — tech, Linux-world",
    weights: "400;500;700",
  },
  {
    name: "PT Sans",
    category: "sans-body",
    feel: "utilitarian sans — signage, broad-readership",
    weights: "400;700",
  },
  {
    name: "Noto Sans",
    category: "sans-body",
    feel: "neutral humanist sans — universal script coverage",
    weights: "400;500;600;700",
  },
  {
    name: "Work Sans",
    category: "sans-body",
    feel: "slightly industrial sans — clean editorial",
    weights: "400;500;600;700",
  },
  {
    name: "Rubik",
    category: "sans-body",
    feel: "rounded geometric sans — distinctive, friendly tech",
    weights: "400;500;600;700",
  },
  {
    name: "Fira Sans",
    category: "sans-body",
    feel: "developer-focused humanist sans — Mozilla-esque clean",
    weights: "400;500;700",
  },
  {
    name: "Quicksand",
    category: "sans-body",
    feel: "rounded geometric sans — friendly, informal",
    weights: "400;500;700",
  },
  {
    name: "Karla",
    category: "sans-body",
    feel: "compact grotesque — editorial, indie-magazine",
    weights: "400;500;700",
  },
  {
    name: "DM Sans",
    category: "sans-body",
    feel: "low-contrast geometric sans — neutral, pairs well with serif display",
    weights: "400;500;700",
  },
  {
    name: "Manrope",
    category: "sans-body",
    feel: "modern semi-rounded sans — product/tech brand-friendly",
    weights: "400;500;600;700",
  },
  {
    name: "Josefin Sans",
    category: "sans-body",
    feel: "geometric thin sans — art-deco flavor",
    weights: "400;500;700",
  },
  {
    name: "Cabin",
    category: "sans-body",
    feel: "humanist sans — informal, light signage",
    weights: "400;500;600;700",
  },
  {
    name: "Dosis",
    category: "sans-body",
    feel: "rounded sans — lifestyle, light product",
    weights: "400;500;700",
  },
  {
    name: "Comfortaa",
    category: "sans-body",
    feel: "soft geometric rounded sans — quirky, approachable",
    weights: "400;500;700",
  },
  {
    name: "Space Grotesk",
    category: "sans-body",
    feel: "geometric with personality — tech/product launches; works as heading",
    weights: "400;500;700",
  },
  {
    name: "Plus Jakarta Sans",
    category: "sans-body",
    feel: "modern humanist sans — business clean default",
    weights: "400;500;600;700",
  },
  {
    name: "IBM Plex Sans",
    category: "sans-body",
    feel: "IBM corporate sans — technical precision, enterprise",
    weights: "400;500;600;700",
  },

  // ── MONO ───────────────────────────────────────────────────────────────
  {
    name: "JetBrains Mono",
    category: "mono",
    feel: "readable monospace — labels, eyebrows, code-feel chrome",
    weights: "400;500;700",
  },

  // ── ACCENT (use for ONE word or a signature, not body copy) ────────────
  {
    name: "Pacifico",
    category: "accent",
    feel: "casual brush script — personal, retail hand-painted",
    weights: "",
  },
  {
    name: "Dancing Script",
    category: "accent",
    feel: "flowing cursive script — wedding, invitation",
    weights: "400;700",
  },
  {
    name: "Caveat",
    category: "accent",
    feel: "casual handwritten script — margin notes, personal asides",
    weights: "400;700",
  },
  {
    name: "Architects Daughter",
    category: "accent",
    feel: "print handwriting — blueprint notes, informal labels",
    weights: "",
  },
  {
    name: "Permanent Marker",
    category: "accent",
    feel: "sharpie marker — punk, protest signs, raw emphasis",
    weights: "",
  },
];

/** Look up a font by exact Google Fonts family name. Returns null if unknown. */
export function getFontByName(name: string): FontSpec | null {
  return FONT_LIBRARY.find((f) => f.name === name) ?? null;
}

/** Flat set of all valid font names for quick validation. */
const FONT_NAMES = new Set(FONT_LIBRARY.map((f) => f.name));

/** Validate a fontFamily value against the library. Returns true if accepted. */
export function isKnownFont(name: string): boolean {
  return FONT_NAMES.has(name);
}

/**
 * Render the catalog as a prompt-friendly block grouped by category. The LLM
 * reads this in the plan_deck result and picks font names for per-element
 * fontFamily overrides.
 */
export function renderFontLibrary(): string {
  const labels: Record<FontCategory, string> = {
    display: "DISPLAY (hero titles, oversized headings — pair with a body font)",
    "serif-body": "SERIF BODY (long-form reading, editorial feel)",
    "sans-body": "SANS BODY (body copy, UI; many double as light headings)",
    mono: "MONO (chrome — eyebrows, labels, code-feel)",
    accent: "ACCENT (use sparingly — one word, a signature, a pull quote)",
  };
  const order: FontCategory[] = ["display", "serif-body", "sans-body", "mono", "accent"];
  const sections: string[] = [];
  for (const cat of order) {
    const fonts = FONT_LIBRARY.filter((f) => f.category === cat);
    if (fonts.length === 0) continue;
    sections.push(`${labels[cat]}:`);
    for (const f of fonts) sections.push(`  - ${f.name} — ${f.feel}`);
  }
  return sections.join("\n");
}

/**
 * Build the Google Fonts CSS2 URL for a set of font families. Takes known
 * library names (resolved with each font's own weight list) and optional
 * extra slugs (for Material Symbols etc.). Returns a single URL with
 * display=swap. Unknown names are silently skipped — callers that care
 * should validate with `isKnownFont` first.
 */
export function buildFontsUrl(names: string[], extraSlugs: string[] = []): string {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const f = getFontByName(name);
    if (!f) continue;
    const urlName = f.name.replace(/ /g, "+");
    slugs.push(f.weights ? `${urlName}:wght@${f.weights}` : urlName);
  }
  for (const slug of extraSlugs) {
    if (!slugs.includes(slug)) slugs.push(slug);
  }
  return `https://fonts.googleapis.com/css2?${slugs.map((s) => `family=${s}`).join("&")}&display=swap`;
}
