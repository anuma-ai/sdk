/**
 * Design audit for app-generation output.
 *
 * Inspects App.js + App.css and reports inconsistencies in the design
 * system: raw hex colors outside the :root token block, CSS variables
 * declared but never used, missing :focus-visible rules on interactive
 * elements, icon-only buttons without aria-labels, images without alt
 * text, heading order anti-patterns, inline styles with hardcoded
 * colors. The audit does not prescribe what design choices to make —
 * it only checks that whatever the model picked is applied coherently.
 *
 * Returned as a structured AuditResult so the model (or a host) can
 * read it programmatically: each issue has a path, line, severity,
 * type, and human-readable message. The model is expected to call this
 * after substantial changes and patch the actionable issues.
 */

export type AuditSeverity = "error" | "warn" | "info";

export type AuditIssueType =
  | "no-design-tokens"
  | "raw-color"
  | "inline-style-with-color"
  | "unused-token"
  | "missing-focus-state"
  | "focus-not-keyed"
  | "low-contrast"
  | "off-scale-spacing"
  | "missing-aria-label"
  | "missing-alt"
  | "heading-order";

export interface AuditIssue {
  /** Where the issue surfaced — error / warn / info. */
  severity: AuditSeverity;
  /** Filename (e.g. "App.js" or "App.css"). */
  path: string;
  /** 1-based line number. Absent for whole-file issues. */
  line?: number;
  /** Machine-readable issue type for grouping or filtering. */
  type: AuditIssueType;
  /** Human-readable explanation suitable for showing to an LLM or a developer. */
  message: string;
}

export interface AuditTokens {
  /** CSS variable names classified as color tokens (e.g. ["--bg", "--accent"]). */
  colors: string[];
  /** Typography tokens (e.g. ["--font-display"]). */
  fonts: string[];
  /** All other tokens (spacing, radii, shadows, etc.). */
  other: string[];
}

export interface AuditResult {
  /** 0-100 score: 100 = clean, 0 = severe issues. Errors -10 each, warns -5, infos -1, floored at 0. */
  score: number;
  /** Design tokens discovered in :root. */
  tokens: AuditTokens;
  /** Issues found, sorted: errors first, then warns, then infos; within each, by path + line. */
  issues: AuditIssue[];
}

// ---------------------------------------------------------------------------
// Helpers — pure, regex-driven, no DOM or parser
// ---------------------------------------------------------------------------

/** Match every `:root { ... }` block, including nested-brace tolerance enough
 *  to handle typical CSS (we don't currently allow nested rules inside :root). */
function findRootBlockRanges(appCss: string): Array<[startLine: number, endLine: number]> {
  const lines = appCss.split("\n");
  const ranges: Array<[number, number]> = [];
  let inRoot = false;
  let depth = 0;
  let rootStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const opens = (lines[i].match(/\{/g) ?? []).length;
    const closes = (lines[i].match(/\}/g) ?? []).length;
    if (!inRoot && /:root\s*\{/.test(lines[i])) {
      inRoot = true;
      rootStart = i;
      depth = opens - closes;
      if (depth <= 0) {
        ranges.push([rootStart, i]);
        inRoot = false;
        rootStart = -1;
      }
      continue;
    }
    if (inRoot) {
      depth += opens - closes;
      if (depth <= 0) {
        ranges.push([rootStart, i]);
        inRoot = false;
        rootStart = -1;
      }
    }
  }
  return ranges;
}

function isInsideRange(line: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([s, e]) => line >= s && line <= e);
}

/** Extract every CSS custom property declared in any :root block, with naive
 *  classification by name / value heuristics. */
function extractTokens(appCss: string): AuditTokens {
  const colors: string[] = [];
  const fonts: string[] = [];
  const other: string[] = [];
  const seen = new Set<string>();

  // Iterate over each :root block and pull declarations from inside.
  for (const blockMatch of appCss.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    const body = blockMatch[1] ?? "";
    for (const decl of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) {
      const name = decl[1];
      const value = decl[2].trim();
      const key = `--${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const looksColor =
        /^(bg|fg|color|accent|primary|secondary|surface|ink|muted|hairline|border|tint|tag|shadow.*color)/i.test(
          name
        ) ||
        /^#|^rgb|^hsl|^oklch|^oklab|^color-mix/i.test(value) ||
        /^(white|black|transparent|currentColor)$/i.test(value);
      const looksFont =
        /font|family|typeface/i.test(name) ||
        /^['"](?:[^'"]+,\s*)*[^'"]+['"]/.test(value) ||
        /serif|sans-serif|monospace|cursive/i.test(value);
      if (looksColor) colors.push(key);
      else if (looksFont) fonts.push(key);
      else other.push(key);
    }
  }
  return { colors, fonts, other };
}

/** Find raw color literals (hex, rgb, hsl, oklch) outside any :root block. */
function findRawColors(appCss: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!appCss) return issues;
  const rootRanges = findRootBlockRanges(appCss);
  const lines = appCss.split("\n");
  const colorRe =
    /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d[^)]*\)|hsla?\(\s*\d[^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)/g;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideRange(i, rootRanges)) continue;
    // Strip comments — a raw color in a `/* … */` is noise.
    const line = lines[i].replace(/\/\*.*?\*\//g, "");
    for (const m of line.matchAll(colorRe)) {
      // Don't flag color-mix() — it's modern CSS used with a token, fine.
      if (/color-mix\(/.test(line.slice(Math.max(0, (m.index ?? 0) - 10), m.index))) continue;
      issues.push({
        severity: "warn",
        path: "App.css",
        line: i + 1,
        type: "raw-color",
        message: `Raw color ${m[0]} outside :root. Declare it as a CSS variable in :root (e.g. --your-token: ${m[0]};) and reference it via var(--your-token) so the design system stays editable in one place.`,
      });
    }
  }
  return issues;
}

/** Find inline style={{ color: '#xxx' }} patterns in App.js. */
function findInlineStyleColors(appJs: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!appJs) return issues;
  const lines = appJs.split("\n");
  // Match a small set of color-bearing properties with a literal value.
  const re =
    /(color|background(?:Color)?|borderColor|outlineColor|fill|stroke)\s*:\s*['"`](#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))['"`]/g;
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(re)) {
      issues.push({
        severity: "warn",
        path: "App.js",
        line: i + 1,
        type: "inline-style-with-color",
        message: `Inline ${m[1]}: ${m[2]} hardcodes a color. Use var(--token) inside the inline style, or move the rule to App.css with a class.`,
      });
    }
  }
  return issues;
}

/** Tokens declared in :root but never referenced anywhere else. */
function findUnusedTokens(appCss: string, appJs: string, tokens: AuditTokens): AuditIssue[] {
  const all = [...tokens.colors, ...tokens.fonts, ...tokens.other];
  if (all.length === 0) return [];
  const issues: AuditIssue[] = [];
  // Strip every :root block before checking usage.
  const cssOutsideRoot = appCss.replace(/:root\s*\{[\s\S]*?\}/g, "");
  const haystack = `${cssOutsideRoot}\n${appJs}`;
  for (const token of all) {
    // Look for var(--token), var(--token, fallback), or just bare --token: (when nested).
    const useRe = new RegExp(
      `var\\(\\s*${token.replace(/-/g, "\\-")}\\b|${token.replace(/-/g, "\\-")}\\b\\s*:`,
      "g"
    );
    if (!useRe.test(haystack)) {
      issues.push({
        severity: "info",
        path: "App.css",
        type: "unused-token",
        message: `Token ${token} declared but never used. Either reference it via var(${token}) or remove it.`,
      });
    }
  }
  return issues;
}

/** Are interactive elements getting :focus-visible? Heuristic. */
function findMissingFocusState(appJs: string, appCss: string): AuditIssue[] {
  const buttonCount = (appJs.match(/<button\b/g) ?? []).length;
  const linkCount = (appJs.match(/<a\b[^>]*\bhref=/g) ?? []).length;
  const inputCount = (appJs.match(/<(?:input|select|textarea)\b/g) ?? []).length;
  const interactive = buttonCount + linkCount + inputCount;
  if (interactive < 2) return [];

  const focusVisibleCount = (appCss.match(/:focus-visible\b/g) ?? []).length;
  if (focusVisibleCount === 0) {
    return [
      {
        severity: "warn",
        path: "App.css",
        type: "missing-focus-state",
        message: `App has ${interactive} interactive elements (${buttonCount} buttons, ${linkCount} links, ${inputCount} inputs) but no :focus-visible rules. Keyboard users won't see focus indicators — add focus-visible styles keyed to your accent token.`,
      },
    ];
  }
  // Sub-check: at least some coverage relative to interactive count.
  if (focusVisibleCount < Math.max(1, Math.floor(interactive / 4))) {
    return [
      {
        severity: "info",
        path: "App.css",
        type: "missing-focus-state",
        message: `App has ${interactive} interactive elements but only ${focusVisibleCount} :focus-visible rule(s). Consider adding focus styles to more component variants.`,
      },
    ];
  }
  return [];
}

/** Icon-only `<button>` (only an `<svg>` child, no visible text) without aria-label. */
function findMissingAriaLabels(appJs: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  // Use a tolerant button-block matcher; assume balanced tags within reason.
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  for (const m of appJs.matchAll(re)) {
    const attrs = m[1] ?? "";
    const content = m[2] ?? "";
    const hasSvg = /<svg\b/.test(content);
    // Strip SVGs and child markup; check for any meaningful text content.
    const textOnly = content
      .replace(/<svg[\s\S]*?<\/svg>/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\{[^}]*\}/g, "")
      .trim();
    const hasMeaningfulText = textOnly.length >= 2;
    if (hasSvg && !hasMeaningfulText) {
      const ariaLabeled = /aria-label\s*=|aria-labelledby\s*=|aria-describedby\s*=/i.test(attrs);
      const titleAttr = /title\s*=/i.test(attrs);
      if (!ariaLabeled && !titleAttr) {
        const lineNumber = lineOfIndex(appJs, m.index ?? 0);
        issues.push({
          severity: "warn",
          path: "App.js",
          line: lineNumber,
          type: "missing-aria-label",
          message: `Icon-only <button> has no aria-label — screen readers won't know its purpose. Add aria-label="…" describing the action.`,
        });
      }
    }
  }
  return issues;
}

/** `<img>` without `alt`. Decorative images should pass alt="". */
function findMissingAlt(appJs: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const re = /<img\b([^>]*?)\/?>/g;
  for (const m of appJs.matchAll(re)) {
    const attrs = m[1] ?? "";
    if (!/\balt\s*=/i.test(attrs)) {
      const lineNumber = lineOfIndex(appJs, m.index ?? 0);
      issues.push({
        severity: "warn",
        path: "App.js",
        line: lineNumber,
        type: "missing-alt",
        message: `<img> has no alt attribute. Add alt="…" describing the image, or alt="" if purely decorative.`,
      });
    }
  }
  return issues;
}

/** Heading levels shouldn't skip going deeper. h1 → h3 (skipping h2) breaks
 *  the outline algorithm assistive tech relies on. Going back UP (h3 → h2)
 *  is fine — that's a new section. */
function findHeadingOrder(appJs: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const re = /<h([1-6])\b/g;
  let prev = 0;
  for (const m of appJs.matchAll(re)) {
    const level = Number(m[1]);
    if (prev > 0 && level > prev + 1) {
      const line = lineOfIndex(appJs, m.index ?? 0);
      issues.push({
        severity: "info",
        path: "App.js",
        line,
        type: "heading-order",
        message: `<h${level}> appears after <h${prev}> — heading levels shouldn't skip going deeper. Use <h${prev + 1}> instead, or restructure so the level above appears first.`,
      });
    }
    prev = level;
  }
  return issues;
}

/** No CSS variables at all in :root. The model bypassed the design system. */
function findNoDesignTokens(appCss: string, tokens: AuditTokens): AuditIssue[] {
  // Empty App.css is fine (Tailwind-only apps). Only flag when there IS CSS
  // but no tokens were declared.
  if (!appCss.trim()) return [];
  const total = tokens.colors.length + tokens.fonts.length + tokens.other.length;
  if (total === 0) {
    return [
      {
        severity: "warn",
        path: "App.css",
        type: "no-design-tokens",
        message: `App.css has content but no CSS variables declared in :root. The design system needs tokens to be editable in one place — declare --bg, --accent, --ink, etc. and reference via var(--name).`,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Semantic checks — math on parsed values, not regex pattern presence.
// These catch "I added a focus-visible rule to make the audit happy" and
// "I declared a token without actually using it as a system" gaming
// patterns. Adding a rule is cheap; making the rule honor the system is
// the actual work.
// ---------------------------------------------------------------------------

/** Parse #rgb / #rgba / #rrggbb / #rrggbbaa to [r, g, b]. Alpha is ignored
 *  for contrast purposes (WCAG measures luminance, not perceived alpha). */
function parseHexColor(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  if (h.length === 6 || h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  return null;
}

/** WCAG 2.1 relative luminance: linearize each channel, then weighted sum.
 *  Inputs are 0-255 sRGB, output is 0-1. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linearize = (c: number): number => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Contrast ratio per WCAG 2.1. Always >= 1; 21:1 is max (black on white). */
export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pull a token's value from `:root`. Returns the raw string (untrimmed of
 *  units) or null if the token isn't declared or appears multiple times
 *  with conflicting values. */
function getTokenValue(appCss: string, tokenName: string): string | null {
  const re = new RegExp(`--${tokenName.replace(/^--/, "")}\\s*:\\s*([^;]+);`, "g");
  let value: string | null = null;
  for (const blockMatch of appCss.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    const body = blockMatch[1] ?? "";
    for (const m of body.matchAll(re)) {
      const v = m[1].trim();
      if (value !== null && value !== v) return null; // conflicting redeclaration
      value = v;
    }
  }
  return value;
}

/** Common foreground / background token name pairs. Order matches the way
 *  designs typically declare them; we walk in priority order and check the
 *  first pair where both sides are simple hex. */
const FG_BG_TOKEN_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["--ink", "--bg"],
  ["--fg", "--bg"],
  ["--text", "--bg"],
  ["--ink", "--paper"],
  ["--ink", "--surface"],
  ["--text", "--background"],
  ["--color", "--background"],
];

/** Check body-text contrast (WCAG 2.1 AA: 4.5:1 for normal text). Skipped
 *  when the canonical fg/bg tokens aren't both declared as hex — modern
 *  apps may use oklch()/color-mix() and parsing those is a separate job.
 *  Catches the realistic regression where the model picks a stylish but
 *  unreadable palette ("#888 on #fff" hits ~3.5:1, fails AA). */
function findLowContrast(appCss: string): AuditIssue[] {
  if (!appCss) return [];
  for (const [fgName, bgName] of FG_BG_TOKEN_PAIRS) {
    const fgValue = getTokenValue(appCss, fgName);
    const bgValue = getTokenValue(appCss, bgName);
    if (!fgValue || !bgValue) continue;
    const fg = parseHexColor(fgValue);
    const bg = parseHexColor(bgValue);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio >= 4.5) return []; // passes AA — done
    const rounded = Math.round(ratio * 10) / 10;
    if (ratio < 3) {
      return [
        {
          severity: "error",
          path: "App.css",
          type: "low-contrast",
          message: `${fgName} ${fgValue} on ${bgName} ${bgValue} has contrast ratio ${rounded}:1 — fails WCAG AA (needs 4.5:1 for body text, 3:1 for large text). Body text will be hard to read. Pick a darker foreground or lighter background.`,
        },
      ];
    }
    return [
      {
        severity: "warn",
        path: "App.css",
        type: "low-contrast",
        message: `${fgName} ${fgValue} on ${bgName} ${bgValue} has contrast ratio ${rounded}:1 — passes AA for large text (3:1) but not for normal body text (4.5:1). Either darken the foreground / lighten the background, or reserve this pairing for headings only.`,
      },
    ];
  }
  return [];
}

/** Each `:focus-visible {…}` rule should reference at least one design
 *  token (via `var(--…)`). Catches the gaming pattern: model adds one
 *  focus-visible block with hardcoded colors purely to satisfy the
 *  missing-focus-state check, while the rest of the system uses var().
 *  Only flagged when the block actually declares color-bearing properties
 *  (outline / border / box-shadow / color / background). */
function findFocusNotKeyed(appCss: string, tokens: AuditTokens): AuditIssue[] {
  if (!appCss) return [];
  // No tokens declared at all — different concern; the no-design-tokens
  // check covers it.
  if (tokens.colors.length === 0) return [];

  const issues: AuditIssue[] = [];
  // Match each block whose selector list contains `:focus-visible`. The
  // selector list runs up to `{`; we look backward from the brace to
  // confirm `:focus-visible` is in scope. Brace-counting keeps us out of
  // nested at-rules.
  const re = /([^{}]*:focus-visible[^{}]*)\{([^{}]*)\}/g;
  for (const m of appCss.matchAll(re)) {
    const body = m[2] ?? "";
    const hasColorProperty = /\b(outline|border|box-shadow|background|color|fill|stroke)\b/.test(
      body
    );
    if (!hasColorProperty) continue;
    const referencesVar = /var\(\s*--[\w-]+/.test(body);
    if (referencesVar) continue;
    const lineNumber = lineOfIndex(appCss, m.index ?? 0);
    issues.push({
      severity: "warn",
      path: "App.css",
      line: lineNumber,
      type: "focus-not-keyed",
      message: `:focus-visible rule declares ${body.match(/\b(outline|border|box-shadow|background|color|fill|stroke)\b/)?.[0] ?? "color-bearing"} properties but doesn't reference any design token. Use var(--accent) so focus rings track the design system instead of drifting.`,
    });
  }
  return issues;
}

/** Numeric value of a `--space-*` token (or similar) declared in :root.
 *  Returns the value in pixels (assuming `1rem = 16px`) or null if the
 *  value isn't a simple number with px/rem units. */
function parseSpacingTokenPx(appCss: string, tokenName: string): number | null {
  const value = getTokenValue(appCss, tokenName);
  if (!value) return null;
  const m = /^(\d+(?:\.\d+)?)(px|rem)?\s*$/.exec(value);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (Number.isNaN(num)) return null;
  return m[2] === "rem" ? num * 16 : num;
}

/** When a spacing scale (--space-*, --gap-*, --pad-*) is declared, flag
 *  `padding` / `margin` / `gap` declarations whose literal px values
 *  aren't members of the scale. Only fires when at least two spacing
 *  tokens are present — a single token isn't really a scale. */
function findOffScaleSpacing(appCss: string, tokens: AuditTokens): AuditIssue[] {
  if (!appCss) return [];
  // Spacing-flavored tokens. Be tolerant of naming conventions.
  const spaceTokenRe = /^--(space|gap|pad|padding|margin|s)(?:[-_]\d+|[-_]?(xs|sm|md|lg|xl))?$/i;
  const spaceTokens = tokens.other.filter((t) => spaceTokenRe.test(t));
  if (spaceTokens.length < 2) return [];

  const scale = new Set<number>([0]); // 0 is always allowed (no-spacing fallback)
  for (const token of spaceTokens) {
    const px = parseSpacingTokenPx(appCss, token);
    if (px !== null) scale.add(px);
  }
  if (scale.size < 3) return []; // 0 + < 2 declared values isn't a usable scale

  const rootRanges = findRootBlockRanges(appCss);
  const lines = appCss.split("\n");
  const issues: AuditIssue[] = [];
  // Only check the design-system-driven spacing properties — width / height
  // and positional offsets (top/right/bottom/left) often have legit non-
  // scale values (full-bleed layouts, 1px hairlines, etc.).
  const propRe =
    /\b(padding|padding-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end)|margin|margin-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end)|gap|row-gap|column-gap)\s*:\s*([^;]+);/gi;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideRange(i, rootRanges)) continue;
    const line = lines[i].replace(/\/\*.*?\*\//g, "");
    for (const m of line.matchAll(propRe)) {
      const property = m[1];
      const value = m[2];
      // Skip when the declaration already uses tokens / dynamic math.
      if (/var\(|calc\(|env\(|min\(|max\(|clamp\(/.test(value)) continue;
      const offScale: number[] = [];
      for (const num of value.matchAll(/(\d+(?:\.\d+)?)(px|rem)\b/g)) {
        const px = num[2] === "rem" ? parseFloat(num[1]) * 16 : parseFloat(num[1]);
        if (!scale.has(px)) offScale.push(px);
      }
      if (offScale.length === 0) continue;
      const scaleList = [...scale].sort((a, b) => a - b);
      issues.push({
        severity: "info",
        path: "App.css",
        line: i + 1,
        type: "off-scale-spacing",
        message: `${property} uses ${offScale.map((n) => `${n}px`).join(", ")} — not in the declared spacing scale (${scaleList.map((n) => `${n}px`).join(", ")}). Use var(--space-*) of the closest scale token, or extend the scale in :root.`,
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Score + main entrypoint
// ---------------------------------------------------------------------------

const SEVERITY_PENALTY: Record<AuditSeverity, number> = {
  error: 10,
  warn: 5,
  info: 1,
};

function computeScore(issues: AuditIssue[]): number {
  const penalty = issues.reduce((acc, i) => acc + SEVERITY_PENALTY[i.severity], 0);
  return Math.max(0, 100 - penalty);
}

function lineOfIndex(text: string, idx: number): number {
  return text.slice(0, idx).split("\n").length;
}

const SEVERITY_ORDER: Record<AuditSeverity, number> = { error: 0, warn: 1, info: 2 };

function sortIssues(a: AuditIssue, b: AuditIssue): number {
  if (SEVERITY_ORDER[a.severity] !== SEVERITY_ORDER[b.severity]) {
    return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  }
  if (a.path !== b.path) return a.path.localeCompare(b.path);
  return (a.line ?? 0) - (b.line ?? 0);
}

/**
 * Audit a generated app's design coherence. Pure function — no I/O.
 *
 * @param files Map of filename → content. Looks at "App.js" (or "App.jsx")
 *              and "App.css". Other files are ignored.
 */
export function auditDesign(files: Record<string, string>): AuditResult {
  const appJs = files["App.js"] ?? files["App.jsx"] ?? "";
  const appCss = files["App.css"] ?? "";

  const tokens = extractTokens(appCss);

  const issues: AuditIssue[] = [
    ...findNoDesignTokens(appCss, tokens),
    ...findRawColors(appCss),
    ...findInlineStyleColors(appJs),
    ...findUnusedTokens(appCss, appJs, tokens),
    ...findMissingFocusState(appJs, appCss),
    ...findFocusNotKeyed(appCss, tokens),
    ...findLowContrast(appCss),
    ...findOffScaleSpacing(appCss, tokens),
    ...findMissingAriaLabels(appJs),
    ...findMissingAlt(appJs),
    ...findHeadingOrder(appJs),
  ].sort(sortIssues);

  return { score: computeScore(issues), tokens, issues };
}
