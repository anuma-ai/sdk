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
  | "orphaned-class"
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

function extractTokens(appCss: string): AuditTokens {
  const colors: string[] = [];
  const fonts: string[] = [];
  const other: string[] = [];
  const seen = new Set<string>();

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

function findRawColors(appCss: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!appCss) return issues;
  const rootRanges = findRootBlockRanges(appCss);
  const lines = appCss.split("\n");
  const colorRe =
    /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d[^)]*\)|hsla?\(\s*\d[^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)/g;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideRange(i, rootRanges)) continue;
    const line = lines[i].replace(/\/\*.*?\*\//g, "");
    for (const m of line.matchAll(colorRe)) {
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

function findInlineStyleColors(appJs: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!appJs) return issues;
  const lines = appJs.split("\n");
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

function findUnusedTokens(appCss: string, appJs: string, tokens: AuditTokens): AuditIssue[] {
  const all = [...tokens.colors, ...tokens.fonts, ...tokens.other];
  if (all.length === 0) return [];
  const issues: AuditIssue[] = [];
  const cssOutsideRoot = appCss.replace(/:root\s*\{[\s\S]*?\}/g, "");
  const haystack = `${cssOutsideRoot}\n${appJs}`;
  for (const token of all) {
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

function findMissingAriaLabels(appJs: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  for (const m of appJs.matchAll(re)) {
    const attrs = m[1] ?? "";
    const content = m[2] ?? "";
    const hasSvg = /<svg\b/.test(content);
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

function findNoDesignTokens(appCss: string, tokens: AuditTokens): AuditIssue[] {
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

function getTokenValue(appCss: string, tokenName: string): string | null {
  const re = new RegExp(`--${tokenName.replace(/^--/, "")}\\s*:\\s*([^;}]+);?`, "g");
  let value: string | null = null;
  for (const blockMatch of appCss.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    const body = blockMatch[1] ?? "";
    for (const m of body.matchAll(re)) {
      const v = m[1].trim();
      if (value !== null && value !== v) return null;
      value = v;
    }
  }
  return value;
}

const FG_BG_TOKEN_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["--ink", "--bg"],
  ["--fg", "--bg"],
  ["--text", "--bg"],
  ["--ink", "--paper"],
  ["--ink", "--surface"],
  ["--text", "--background"],
  ["--color", "--background"],
];

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
    if (ratio >= 4.5) return [];
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

function findFocusNotKeyed(appCss: string, tokens: AuditTokens): AuditIssue[] {
  if (!appCss) return [];
  if (tokens.colors.length === 0) return [];

  if (!appCss.includes(":focus-visible")) return [];

  const issues: AuditIssue[] = [];
  for (const block of leafRuleBlocks(appCss)) {
    if (!block.selector.includes(":focus-visible")) continue;
    const body = block.body;
    const colorProp = body.match(/\b(outline|border|box-shadow|background|color|fill|stroke)\b/);
    if (!colorProp) continue;
    const referencesVar = /var\(\s*--[\w-]+/.test(body);
    if (referencesVar) continue;
    issues.push({
      severity: "warn",
      path: "App.css",
      line: lineOfIndex(appCss, block.selectorStart),
      type: "focus-not-keyed",
      message: `:focus-visible rule declares ${colorProp[0]} properties but doesn't reference any design token. Use var(--accent) so focus rings track the design system instead of drifting.`,
    });
  }
  return issues;
}

interface LeafRuleBlock {
  selector: string;
  body: string;
  selectorStart: number;
}

function leafRuleBlocks(css: string): LeafRuleBlock[] {
  const blocks: LeafRuleBlock[] = [];
  const stack: Array<{ selectorStart: number; bodyStart: number; hasChild: boolean }> = [];
  let segStart = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      if (stack.length > 0) stack[stack.length - 1].hasChild = true;
      stack.push({ selectorStart: segStart, bodyStart: i + 1, hasChild: false });
      segStart = i + 1;
    } else if (ch === "}") {
      const frame = stack.pop();
      if (frame && !frame.hasChild) {
        blocks.push({
          selector: css.slice(frame.selectorStart, frame.bodyStart - 1),
          body: css.slice(frame.bodyStart, i),
          selectorStart: frame.selectorStart,
        });
      }
      segStart = i + 1;
    }
  }
  return blocks;
}

function parseSpacingTokenPx(appCss: string, tokenName: string): number | null {
  const value = getTokenValue(appCss, tokenName);
  if (!value) return null;
  const m = /^(\d+(?:\.\d+)?)(px|rem)?\s*$/.exec(value);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (Number.isNaN(num)) return null;
  return m[2] === "rem" ? num * 16 : num;
}

function findOffScaleSpacing(appCss: string, tokens: AuditTokens): AuditIssue[] {
  if (!appCss) return [];
  const spaceTokenRe = /^--(space|gap|pad|padding|margin|s)(?:[-_]\d+|[-_]?(xs|sm|md|lg|xl))?$/i;
  const spaceTokens = tokens.other.filter((t) => spaceTokenRe.test(t));
  if (spaceTokens.length < 2) return [];

  const scale = new Set<number>([0]);
  for (const token of spaceTokens) {
    const px = parseSpacingTokenPx(appCss, token);
    if (px !== null) scale.add(px);
  }
  if (scale.size < 3) return [];

  const rootRanges = findRootBlockRanges(appCss);
  const lines = appCss.split("\n");
  const issues: AuditIssue[] = [];
  const propRe =
    /\b(padding|padding-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end)|margin|margin-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end)|gap|row-gap|column-gap)\s*:\s*([^;]+);/gi;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideRange(i, rootRanges)) continue;
    const line = lines[i].replace(/\/\*.*?\*\//g, "");
    for (const m of line.matchAll(propRe)) {
      const property = m[1];
      const value = m[2];
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

const TAILWIND_PREFIX_RE =
  /^(bg|text|p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|w|h|min-w|min-h|max-w|max-h|gap|space|border|rounded|shadow|ring|outline|opacity|z|top|right|bottom|left|inset|translate|rotate|scale|skew|origin|transition|duration|ease|delay|animate|cursor|select|resize|list|appearance|pointer-events|overflow|scroll|snap|object|items|justify|content|self|place|col|row|order|font|leading|tracking|decoration|whitespace|break|indent|align|fill|stroke|grid-cols|grid-rows|aspect|backdrop|filter|blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|isolate|backface)-/;
const TAILWIND_BARE_WORDS = new Set([
  "flex",
  "grid",
  "table",
  "block",
  "inline",
  "hidden",
  "static",
  "relative",
  "absolute",
  "fixed",
  "sticky",
  "transform",
  "transition",
  "italic",
  "uppercase",
  "lowercase",
  "capitalize",
  "underline",
  "overline",
  "no-underline",
  "antialiased",
  "truncate",
  "container",
  "group",
  "peer",
]);

function looksTailwind(token: string): boolean {
  if (!token) return true;
  if (token.includes(":")) return true;
  if (token.includes("[")) return true;
  if (token.includes("/")) return true;
  if (TAILWIND_BARE_WORDS.has(token)) return true;
  return TAILWIND_PREFIX_RE.test(token);
}

function looksLibraryInjected(token: string): boolean {
  return token === "lucide" || token.startsWith("lucide-");
}

function extractClassNamesFromJsx(appJs: string): Set<string> {
  const out = new Set<string>();
  for (const m of appJs.matchAll(/\bclassName\s*=\s*["']([^"']+)["']/g)) {
    for (const c of m[1].split(/\s+/)) if (c) out.add(c);
  }
  for (const m of appJs.matchAll(/\bclassName\s*=\s*\{\s*`([^`]+)`\s*\}/g)) {
    const stripped = m[1].replace(/\$\{[^}]*\}/g, "\x00");
    for (const c of stripped.split(/\s+/)) {
      if (c && !c.includes("\x00")) out.add(c);
    }
  }
  for (const m of appJs.matchAll(/\bclassName\s*=\s*\{\s*["']([^"']+)["']\s*\}/g)) {
    for (const c of m[1].split(/\s+/)) if (c) out.add(c);
  }
  return out;
}

function extractClassNamesFromCss(appCss: string): Set<string> {
  const out = new Set<string>();
  const stripped = appCss.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of stripped.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
    out.add(m[1]);
  }
  return out;
}

function findOrphanedClasses(appJs: string, appCss: string): AuditIssue[] {
  if (!appJs || !appCss) return [];
  const jsxClasses = extractClassNamesFromJsx(appJs);
  if (jsxClasses.size === 0) return [];
  const cssClasses = extractClassNamesFromCss(appCss);

  const orphaned: string[] = [];
  for (const cls of jsxClasses) {
    if (looksTailwind(cls)) continue;
    if (looksLibraryInjected(cls)) continue;
    if (cssClasses.has(cls)) continue;
    orphaned.push(cls);
  }
  if (orphaned.length === 0) return [];
  orphaned.sort();
  return [
    {
      severity: "warn",
      path: "App.js",
      type: "orphaned-class",
      message: `JSX uses class name(s) with no matching selector in App.css: ${orphaned.join(", ")}. These render unstyled — for each, either add the rule to App.css, fix the typo, or remove from JSX. Most common cause: a wrapper class renamed in JSX without updating CSS rules. Patch before shipping.`,
    },
  ];
}

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
    ...findOrphanedClasses(appJs, appCss),
    ...findMissingAriaLabels(appJs),
    ...findMissingAlt(appJs),
    ...findHeadingOrder(appJs),
  ].sort(sortIssues);

  return { score: computeScore(issues), tokens, issues };
}
