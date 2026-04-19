/**
 * Catalog of color palettes + font-preset pairings used by
 * `buildSlideSystemPrompt` in `./index.ts`.
 *
 * Each palette pairs a use-case register (editorial / techno / minimal / …)
 * with a concrete color set and a suggested font preset. The prompt builder
 * renders these as a compact table so the LLM can pick a register to match
 * the topic instead of defaulting to the built-in dark-grey + orange theme.
 *
 * This file replaces the three inline slide-JSON examples that previously
 * lived in the system prompt — the examples duplicated layout geometry that
 * was already in `./layouts.ts`, and their inline slides tended to peg
 * models onto those specific three recipes.
 */

import type { SlideTheme } from "./index";

interface Palette {
  /** Short register name the LLM sees (e.g. "warm editorial"). */
  name: string;
  /** One-line "use this when …" hint — comma-separated topic cues. */
  useFor: string;
  /** Font preset key from `FONT_PRESETS` in `./index.ts`. */
  fontPreset: SlideTheme["fontPreset"];
  /** Full theme color set. Keys match `SlideTheme.colors`. */
  colors: SlideTheme["colors"];
}

export const PALETTES: Palette[] = [
  {
    name: "warm editorial",
    useFor: "guides, culture, cooking, nature, long-form explainers",
    fontPreset: "editorial",
    colors: {
      background: "#F3EEE5",
      slideBg: "#F3EEE5",
      surfaceSecondary: "#EDE6D8",
      textPrimary: "#1F2A22",
      textSecondary: "#4A5449",
      textMuted: "#8A8F84",
      accent: "#6B8246",
      card: "#EDE6D8",
      border: "#CFC8B8",
    },
  },
  {
    name: "humanist cream",
    useFor: "essays, research summaries, book-like decks",
    fontPreset: "humanist",
    colors: {
      background: "#FBF7EF",
      slideBg: "#FBF7EF",
      surfaceSecondary: "#F1ECE1",
      textPrimary: "#2B2A26",
      textSecondary: "#55534D",
      textMuted: "#8F8C83",
      accent: "#B4541E",
      card: "#F1ECE1",
      border: "#D6CFC0",
    },
  },
  {
    name: "techno dark",
    useFor: "dev tools, infra, product launches, engineering decks",
    fontPreset: "techno",
    colors: {
      background: "#0a0b0e",
      slideBg: "#0a0b0e",
      surfaceSecondary: "#12151a",
      textPrimary: "#e8eaed",
      textSecondary: "#c4c7cc",
      textMuted: "#7c828b",
      accent: "#6ee7b7",
      card: "#12151a",
      border: "#2a2e36",
    },
  },
  {
    name: "bold dark",
    useFor: "product launches, brand-forward pitches, events",
    fontPreset: "bold",
    colors: {
      background: "#0E0F11",
      slideBg: "#0E0F11",
      surfaceSecondary: "#17191C",
      textPrimary: "#F5F5F4",
      textSecondary: "#C7C6C2",
      textMuted: "#8A8982",
      accent: "#F97316",
      card: "#17191C",
      border: "#2F3135",
    },
  },
  {
    name: "clean minimal",
    useFor: "business, enterprise, finance, formal reports",
    fontPreset: "clean",
    colors: {
      background: "#ffffff",
      slideBg: "#ffffff",
      surfaceSecondary: "#f8fafc",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      accent: "#2563eb",
      card: "#f8fafc",
      border: "#e2e8f0",
    },
  },
  {
    name: "geometric paper",
    useFor: "data-heavy, analytics, quarterly reviews",
    fontPreset: "geometric",
    colors: {
      background: "#FAFAF7",
      slideBg: "#FAFAF7",
      surfaceSecondary: "#EFEFEA",
      textPrimary: "#111114",
      textSecondary: "#3F4047",
      textMuted: "#86867F",
      accent: "#C62B4A",
      card: "#EFEFEA",
      border: "#DADAD2",
    },
  },
  {
    name: "elegant museum",
    useFor: "luxury, premium brand, cultural institutions",
    fontPreset: "elegant",
    colors: {
      background: "#F7F3EC",
      slideBg: "#F7F3EC",
      surfaceSecondary: "#ECE6DA",
      textPrimary: "#1C1B17",
      textSecondary: "#55514A",
      textMuted: "#8E8A80",
      accent: "#7A1F27",
      card: "#ECE6DA",
      border: "#D4CBB8",
    },
  },
];

// ---------------------------------------------------------------------------
// Prompt rendering
// ---------------------------------------------------------------------------

/**
 * Render the palette catalog as a compact prompt block.
 *
 * Shape is `register · use-for · preset` header followed by one line per
 * color token. The LLM reads this to pick a register to match the topic
 * and then copies the exact hex values into `theme.colors`.
 */
export function renderPalettes(): string {
  return PALETTES.map((p) => {
    const colorLine = Object.entries(p.colors)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    return `${p.name} — ${p.useFor}\n  fontPreset: ${p.fontPreset}\n  ${colorLine}`;
  }).join("\n\n");
}

/**
 * Render only the palette `name — use-for (fontPreset)` header lines.
 * Used by the slim planning-step system prompt where the LLM picks a
 * register by name and the hex values are injected later in the
 * plan_slides tool result.
 */
export function renderPaletteNames(): string {
  return PALETTES.map((p) => `- ${p.name} — ${p.useFor} (fontPreset: ${p.fontPreset})`).join("\n");
}

/** Look up a palette by its exact `name`. Returns null if missing. */
export function getPaletteByName(name: string): Palette | null {
  return PALETTES.find((p) => p.name === name) ?? null;
}

/** Render just one palette's hex values as key:value lines for plan_slides result. */
export function renderPaletteColors(p: Palette): string {
  return Object.entries(p.colors)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");
}
