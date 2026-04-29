/**
 * Anuma JSX runtime — React components for the `<Anuma.*>` primitives.
 *
 * The slide / app-mockup tools emit JSX strings rooted at `<Anuma.Deck>`
 * (or `<Anuma.Screen>` for apps). This module makes that JSX renderable
 * as real React: each primitive maps to a React component, theme tokens
 * resolve via context, and absolute positioning is handled automatically
 * by `<Anuma.Slide>` / `<Anuma.Screen>`.
 *
 * Two entry points:
 *
 * 1. **Anuma primitives as React components** — for code that wants to
 *    write the tree directly:
 *
 *    ```tsx
 *    import { Anuma, AnumaThemeProvider } from "@anuma/sdk/react";
 *
 *    <AnumaThemeProvider colors={{ accent: "#10b981", textPrimary: "#fff", ... }}>
 *      <Anuma.Deck>
 *        <Anuma.Slide id="cover">
 *          <h1 x={58} y={120} w={844} style={{ fontSize: 60, color: "textPrimary" }}>
 *            Welcome
 *          </h1>
 *        </Anuma.Slide>
 *      </Anuma.Deck>
 *    </AnumaThemeProvider>
 *    ```
 *
 * 2. **`renderAnumaTree` / `renderAnumaJsx`** — for code that has a JSX
 *    string (e.g., `slides.jsx` from storage) and wants to render it:
 *
 *    ```tsx
 *    <AnumaThemeProvider>
 *      {renderAnumaJsx(slidesJsxString)}
 *    </AnumaThemeProvider>
 *    ```
 *
 * @module react/anumaRuntime
 */

import * as React from "react";
import { createPortal } from "react-dom";

import type { AnumaNode, AttrValue } from "../tools/slides/index.js";
import {
  FONT_PRESETS,
  isAnumaTag,
  isHtmlTag,
  parseJsx,
  THEME_ATTRS,
  type ThemeAttr,
} from "../tools/slides/index.js";

// ---------------------------------------------------------------------------
// Theme context
// ---------------------------------------------------------------------------

export interface AnumaTheme {
  /** `FONT_PRESETS` key. */
  fontPreset: string;
  /** Color tokens — keys are `THEME_ATTRS`. */
  colors: Partial<Record<ThemeAttr, string>>;
}

const DEFAULT_THEME: AnumaTheme = {
  fontPreset: "default",
  colors: {
    background: "#222529",
    slideBg: "#1a1b1e",
    surfaceSecondary: "#1a1b1e",
    textPrimary: "#ffffff",
    textSecondary: "#ffffff",
    textMuted: "#9a9592",
    accent: "#e67519",
    card: "#1a1a21",
    border: "#434242",
  },
};

const AnumaThemeContext = React.createContext<AnumaTheme>(DEFAULT_THEME);

/**
 * Shadow-DOM isolation for `<Anuma.Slide>` content. Default true: the
 * slide's children render inside an attached shadow root so host-page
 * CSS (Tailwind preflight, UA defaults on h2/p/button, global selectors)
 * cannot leak in. Wrap a tree in `<AnumaShadowIsolationProvider enabled={false}>`
 * to opt OUT — useful only if a direct-DOM tool inside slides has
 * trouble crossing the shadow boundary.
 */
const AnumaShadowIsolationContext = React.createContext<boolean>(true);

export interface AnumaShadowIsolationProviderProps {
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * Toggle shadow-DOM isolation for any `<Anuma.Slide>` rendered inside
 * the children. The default for slides is isolation ON — pass
 * `enabled={false}` to render slide children in light DOM instead.
 */
export function AnumaShadowIsolationProvider({
  enabled = true,
  children,
}: AnumaShadowIsolationProviderProps): React.ReactElement {
  return (
    <AnumaShadowIsolationContext.Provider value={enabled}>
      {children}
    </AnumaShadowIsolationContext.Provider>
  );
}

export interface AnumaThemeProviderProps {
  /** Override the default font preset key. */
  fontPreset?: string;
  /** Color token overrides. Merged with the built-in defaults. */
  colors?: Partial<Record<ThemeAttr, string>>;
  children: React.ReactNode;
}

/**
 * Wrap any Anuma render with a theme. Tokens like `color: "textPrimary"` in
 * `style` props (or `fill="accent"` on shapes) resolve against the theme.
 */
export function AnumaThemeProvider({
  fontPreset,
  colors,
  children,
}: AnumaThemeProviderProps): React.ReactElement {
  const value = React.useMemo<AnumaTheme>(
    () => ({
      fontPreset: fontPreset ?? DEFAULT_THEME.fontPreset,
      colors: { ...DEFAULT_THEME.colors, ...(colors ?? {}) },
    }),
    [fontPreset, colors]
  );
  return <AnumaThemeContext.Provider value={value}>{children}</AnumaThemeContext.Provider>;
}

/** Read the current Anuma theme from context. */
export function useAnumaTheme(): AnumaTheme {
  return React.useContext(AnumaThemeContext);
}

/**
 * Resolve a color token against the theme. Pass-through for hex/rgb/named
 * CSS colors; theme tokens (`textPrimary`, `accent`, …) become their
 * contextual hex value.
 */
export function resolveThemeColor(value: unknown, theme: AnumaTheme): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) return value;
  const colors = theme.colors;
  return colors[value as ThemeAttr] ?? value;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

interface GeometryProps {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  grow?: number;
  shrink?: number;
  alignSelf?: string;
}

interface ContainerLayoutProps {
  layout?: string;
  gap?: number;
  padding?: number;
  justify?: string;
  align?: string;
}

/** Build inline style for a positioned element inside an absolute parent. */
function absoluteStyle(g: GeometryProps): React.CSSProperties {
  // box-sizing: border-box makes `width` and `height` total dimensions
  // (content + padding + border), independent of any host-page CSS that
  // might otherwise leave it as `content-box`. This matches the LLM's
  // and editor's mental model — `attrs.w/h` are the box's outer size —
  // and avoids "container drifts on resize" bugs caused by padding
  // making the visual box bigger than the AST claims.
  const out: React.CSSProperties = { position: "absolute", boxSizing: "border-box" };
  if (g.x !== undefined) out.left = g.x;
  if (g.y !== undefined) out.top = g.y;
  if (g.w !== undefined) out.width = g.w;
  if (g.h !== undefined) out.height = g.h;
  if (g.rotation !== undefined) out.transform = `rotate(${g.rotation}deg)`;
  return out;
}

/** Build inline style for a child of a flex container. */
function flexChildStyle(g: GeometryProps): React.CSSProperties {
  // See absoluteStyle for the box-sizing rationale.
  const out: React.CSSProperties = { position: "relative", boxSizing: "border-box" };
  if (g.w !== undefined) out.width = g.w;
  if (g.h !== undefined) out.height = g.h;
  if (g.grow !== undefined) out.flexGrow = g.grow;
  if (g.shrink !== undefined) out.flexShrink = g.shrink;
  if (g.alignSelf !== undefined) out.alignSelf = mapAlign(g.alignSelf);
  if (g.rotation !== undefined) out.transform = `rotate(${g.rotation}deg)`;
  return out;
}

/** Build inline style for the container portion when `layout` is set. */
function containerLayoutStyle(c: ContainerLayoutProps): React.CSSProperties {
  if (c.layout !== "row" && c.layout !== "column") return {};
  const out: React.CSSProperties = { display: "flex", flexDirection: c.layout };
  if (c.gap !== undefined) out.gap = c.gap;
  if (c.padding !== undefined) out.padding = c.padding;
  if (c.justify !== undefined) out.justifyContent = mapJustify(c.justify);
  if (c.align !== undefined) out.alignItems = mapAlign(c.align);
  return out;
}

function mapJustify(v: string): string {
  if (v === "start") return "flex-start";
  if (v === "end") return "flex-end";
  return v;
}

function mapAlign(v: string): string {
  if (v === "start") return "flex-start";
  if (v === "end") return "flex-end";
  return v;
}

// Whether the nearest layout-establishing parent is a flex container.
const FlexParentContext = React.createContext<boolean>(false);

// ---------------------------------------------------------------------------
// Style resolution — themes color tokens inside style={{}} props
// ---------------------------------------------------------------------------

/**
 * CSS properties whose string values may reference theme tokens. Anything
 * else passes through verbatim.
 */
const COLOR_STYLE_KEYS = new Set([
  "color",
  "background",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
]);

function resolveStyleTokens(
  style: React.CSSProperties | undefined,
  theme: AnumaTheme
): React.CSSProperties | undefined {
  if (!style) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) {
    if (COLOR_STYLE_KEYS.has(k) && typeof v === "string") {
      out[k] = resolveThemeColor(v, theme) ?? v;
    } else {
      out[k] = v;
    }
  }
  return out as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Primitive components
// ---------------------------------------------------------------------------

interface CommonProps extends GeometryProps {
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Top-level deck container. Provides the theme context (when any of the
 * theme attrs are set on this node) and renders Slides as flow children.
 */
export interface DeckProps extends CommonProps {
  fontPreset?: string;
  background?: string;
  slideBg?: string;
  surfaceSecondary?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  accent?: string;
  card?: string;
  border?: string;
}

function Deck({ children, style, ...rest }: DeckProps): React.ReactElement {
  // Pull theme attrs out of the deck props; pass non-theme rest through to
  // the wrapper div via inline style.
  const themeColors: Partial<Record<ThemeAttr, string>> = {};
  for (const k of THEME_ATTRS) {
    const v = (rest as Record<string, unknown>)[k];
    if (typeof v === "string") themeColors[k] = v;
  }
  return (
    <AnumaThemeProvider fontPreset={rest.fontPreset} colors={themeColors}>
      <div
        data-anuma-tag="Deck"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          ...(style ?? {}),
        }}
      >
        {children}
      </div>
    </AnumaThemeProvider>
  );
}

/**
 * A 960×540 slide canvas. Positioned children with `x`/`y`/`w`/`h` get
 * absolute positioning automatically. Opt into flex layout via
 * `layout="row" | "column"`.
 */
export interface SlideProps extends CommonProps, ContainerLayoutProps {
  background?: string;
}

function Slide({
  id,
  background,
  layout,
  gap,
  padding,
  justify,
  align,
  style,
  children,
}: SlideProps): React.ReactElement {
  const theme = useAnumaTheme();
  const isFlex = layout === "row" || layout === "column";
  const containerStyle = containerLayoutStyle({ layout, gap, padding, justify, align });
  const bg = resolveThemeColor(background, theme) ?? theme.colors.slideBg ?? "#1a1b1e";
  const fontPreset = FONT_PRESETS[theme.fontPreset] ?? FONT_PRESETS.default;

  // Shadow-DOM isolation is opt-in via context. Read-only surfaces
  // (thumbnails, presentation, exports) wrap their render in
  // `<AnumaShadowIsolationProvider enabled>` to get full style
  // isolation. Editors leave it off so direct-DOM tools like
  // react-moveable see slide elements in the same document — its
  // bounding-rect math drifts when targets are inside a shadow root.
  const shadowIsolated = React.useContext(AnumaShadowIsolationContext);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = React.useState<ShadowRoot | null>(null);
  React.useLayoutEffect(() => {
    if (!shadowIsolated) return;
    const host = hostRef.current;
    if (!host) return;
    // attachShadow throws if one is already attached; reuse the existing
    // root in that case (e.g. across HMR or strict-mode double mounts).
    setShadowRoot(host.shadowRoot ?? host.attachShadow({ mode: "open" }));
  }, [shadowIsolated]);

  const merged: React.CSSProperties = {
    position: "relative",
    width: 960,
    height: 540,
    overflow: "hidden",
    background: bg,
    boxSizing: "border-box",
    // Inheritable defaults applied either way. With shadow isolation
    // these stop host-page styles leaking into the shadow tree. Without
    // isolation, the same baseline keeps the slide reliably themed even
    // if the host has aggressive globals — at the cost of these
    // inherited values then propagating into slide children unless
    // they (or our `<Anuma.Text>` style) override them, which they do.
    margin: 0,
    padding: 0,
    fontFamily: `'${fontPreset?.body ?? "Inter"}', system-ui, sans-serif`,
    color: theme.colors.textPrimary ?? "#fff",
    lineHeight: 1.3,
    fontSize: 16,
    fontWeight: 400,
    fontStyle: "normal",
    fontVariant: "normal",
    textTransform: "none",
    textAlign: "left",
    letterSpacing: "normal",
    wordSpacing: "normal",
    ...containerStyle,
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return (
    <FlexParentContext.Provider value={isFlex}>
      <div ref={hostRef} data-anuma-tag="Slide" data-id={id} style={merged}>
        {shadowIsolated ? shadowRoot && createPortal(children, shadowRoot) : children}
      </div>
    </FlexParentContext.Provider>
  );
}

/**
 * App-mockup screen container. Like Slide but with configurable
 * dimensions (width/height default to a mobile preset).
 */
export interface ScreenProps extends CommonProps, ContainerLayoutProps {
  background?: string;
  width?: number;
  height?: number;
}

function Screen({
  id,
  background,
  layout = "column",
  gap,
  padding,
  justify,
  align,
  width = 390,
  height = 844,
  style,
  children,
}: ScreenProps): React.ReactElement {
  const theme = useAnumaTheme();
  const isFlex = layout === "row" || layout === "column";
  const containerStyle = containerLayoutStyle({ layout, gap, padding, justify, align });
  const bg = resolveThemeColor(background, theme) ?? theme.colors.slideBg ?? "#fff";
  const merged: React.CSSProperties = {
    position: "relative",
    width,
    height,
    overflow: "hidden",
    background: bg,
    ...containerStyle,
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return (
    <FlexParentContext.Provider value={isFlex}>
      <div data-anuma-tag="Screen" data-id={id} style={merged}>
        {children}
      </div>
    </FlexParentContext.Provider>
  );
}

/**
 * Structural group. Defaults to absolute positioning of children;
 * opt into flex via `layout="row" | "column"`.
 */
export interface GroupProps extends CommonProps, ContainerLayoutProps {
  /**
   * Background fill, applied as `background-color` on the Group's
   * div. Resolves theme color tokens (e.g. "accent", "card") via
   * `resolveThemeColor`. Mirrors the `fill` prop on Rect/Circle/Line —
   * a Group is a layout container, but design-tool consumers
   * frequently want it to also carry a fill (auto-layout frames, card
   * surfaces, button bodies). `style.background` still works as an
   * override / for gradients.
   */
  fill?: string;
}

function Group({
  id,
  x,
  y,
  w,
  h,
  rotation,
  grow,
  shrink,
  alignSelf,
  layout,
  gap,
  padding,
  justify,
  align,
  fill,
  style,
  children,
}: GroupProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const isFlex = layout === "row" || layout === "column";
  const positioning = parentIsFlex
    ? flexChildStyle({ x, y, w, h, rotation, grow, shrink, alignSelf })
    : absoluteStyle({ x, y, w, h, rotation });
  const containerStyle = containerLayoutStyle({ layout, gap, padding, justify, align });
  const merged: React.CSSProperties = {
    ...positioning,
    ...containerStyle,
    ...(fill !== undefined ? { background: resolveThemeColor(fill, theme) } : {}),
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return (
    <FlexParentContext.Provider value={isFlex}>
      <div data-anuma-tag="Group" data-id={id} style={merged}>
        {children}
      </div>
    </FlexParentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Shape primitives — rendered as positioned divs (SVG would be more
// faithful for circle/line stroke; deferred until shapes need it).
// ---------------------------------------------------------------------------

export interface RectProps extends CommonProps {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

function Rect({
  id,
  x,
  y,
  w,
  h,
  rotation,
  grow,
  shrink,
  alignSelf,
  fill,
  stroke,
  strokeWidth,
  cornerRadius,
  style,
}: RectProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const positioning = parentIsFlex
    ? flexChildStyle({ x, y, w, h, rotation, grow, shrink, alignSelf })
    : absoluteStyle({ x, y, w, h, rotation });
  const merged: React.CSSProperties = {
    ...positioning,
    background: resolveThemeColor(fill, theme),
    border: stroke
      ? `${strokeWidth ?? 1}px solid ${resolveThemeColor(stroke, theme) ?? stroke}`
      : undefined,
    borderRadius: cornerRadius,
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return <div data-anuma-tag="Rect" data-id={id} style={merged} />;
}

export interface CircleProps extends CommonProps {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

function Circle({
  id,
  x,
  y,
  w,
  h,
  rotation,
  grow,
  shrink,
  alignSelf,
  fill,
  stroke,
  strokeWidth,
  style,
}: CircleProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const positioning = parentIsFlex
    ? flexChildStyle({ x, y, w, h, rotation, grow, shrink, alignSelf })
    : absoluteStyle({ x, y, w, h, rotation });
  const merged: React.CSSProperties = {
    ...positioning,
    background: resolveThemeColor(fill, theme),
    borderRadius: "50%",
    border: stroke
      ? `${strokeWidth ?? 1}px solid ${resolveThemeColor(stroke, theme) ?? stroke}`
      : undefined,
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return <div data-anuma-tag="Circle" data-id={id} style={merged} />;
}

export interface LineProps extends CommonProps {
  stroke?: string;
  strokeWidth?: number;
}

function Line({
  id,
  x,
  y,
  w,
  h,
  rotation,
  stroke,
  strokeWidth,
  style,
}: LineProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const positioning = parentIsFlex
    ? flexChildStyle({ x, y, w, h, rotation })
    : absoluteStyle({ x, y, w, h, rotation });
  const sw = strokeWidth ?? 1;
  const color = resolveThemeColor(stroke, theme) ?? stroke ?? theme.colors.textMuted ?? "#999";
  const merged: React.CSSProperties = {
    ...positioning,
    borderTop: `${sw}px solid ${color}`,
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return <div data-anuma-tag="Line" data-id={id} style={merged} />;
}

// ---------------------------------------------------------------------------
// Text / Image / Icon — preserved aliases over their HTML equivalents
// ---------------------------------------------------------------------------

export interface TextProps extends CommonProps {
  fontRole?: "heading" | "body";
}

function Text({
  id,
  x,
  y,
  w,
  h,
  rotation,
  grow,
  shrink,
  alignSelf,
  fontRole,
  style,
  children,
}: TextProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const positioning = parentIsFlex
    ? flexChildStyle({ x, y, w, h, rotation, grow, shrink, alignSelf })
    : absoluteStyle({ x, y, w, h, rotation });
  const merged: React.CSSProperties = {
    ...positioning,
    // <h2>/<p> carry user-agent default margins (~0.83em / 1em). With
    // `position: absolute` the margin still offsets the visible content
    // below the box's `top` line — so the rendered text drifts down from
    // the slide-pixel y the LLM specified, and any overlay (e.g. the
    // text-edit textarea) anchored to the same y misaligns.
    margin: 0,
    // Hard clip at box bounds. We deliberately don't use
    // `display: -webkit-box` + `-webkit-line-clamp` here: when the box
    // height comfortably fits the rendered text, the implicit
    // pack-axis alignment of -webkit-box anchors content to the
    // bottom of the box in some engines, which breaks single-line
    // titles in tall slots. Overflow:hidden alone gives a predictable
    // top-anchored layout; relying on the budget hints in the LLM
    // system prompt to keep content within the slot.
    overflow: "hidden",
    whiteSpace: "pre-line",
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  const Tag = fontRole === "heading" ? "h2" : "p";
  return (
    <Tag data-anuma-tag="Text" data-id={id} style={merged}>
      {children}
    </Tag>
  );
}

export interface ImageProps extends CommonProps {
  src?: string;
}

function Image({
  id,
  x,
  y,
  w,
  h,
  rotation,
  grow,
  shrink,
  alignSelf,
  src,
  style,
}: ImageProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const positioning = parentIsFlex
    ? flexChildStyle({ x, y, w, h, rotation, grow, shrink, alignSelf })
    : absoluteStyle({ x, y, w, h, rotation });
  const merged: React.CSSProperties = {
    ...positioning,
    objectFit: "cover",
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  if (src && (src.startsWith("http") || src.startsWith("data:"))) {
    // draggable={false}: slide images should never participate in HTML5
    // native drag-and-drop. Without this, click-dragging an image inside
    // an editor (or any interactive consumer of the runtime) starts the
    // browser's translucent-ghost drag before the editor's gesture
    // handler can claim the pointer.
    return (
      <img data-anuma-tag="Image" data-id={id} src={src} alt="" draggable={false} style={merged} />
    );
  }
  // Placeholder for attached:N or unresolved sources.
  return (
    <div
      data-anuma-tag="Image"
      data-id={id}
      style={{
        ...merged,
        background: theme.colors.card,
        color: theme.colors.textMuted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
      }}
    >
      {src ?? ""}
    </div>
  );
}

export interface IconProps extends CommonProps {
  name?: string;
}

function Icon({
  id,
  x,
  y,
  w,
  h,
  rotation,
  grow,
  shrink,
  alignSelf,
  name,
  style,
}: IconProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const positioning = parentIsFlex
    ? flexChildStyle({ x, y, w, h, rotation, grow, shrink, alignSelf })
    : absoluteStyle({ x, y, w, h, rotation });
  const merged: React.CSSProperties = {
    ...positioning,
    fontFamily: "'Material Symbols Rounded', system-ui, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return (
    <span data-anuma-tag="Icon" data-id={id} style={merged}>
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Public namespace export
// ---------------------------------------------------------------------------

/**
 * Anuma primitive components, namespaced. Use as `<Anuma.Slide>`,
 * `<Anuma.Rect>`, etc.
 */
export const Anuma = {
  Deck,
  Slide,
  Screen,
  Group,
  Rect,
  Circle,
  Line,
  Text,
  Image,
  Icon,
};

// ---------------------------------------------------------------------------
// AST renderer — turn an AnumaNode tree into React elements
// ---------------------------------------------------------------------------

/**
 * Attrs whose values are interpreted as URLs by the browser. We refuse to
 * forward `javascript:` / `vbscript:` payloads on any of these to avoid
 * turning LLM-generated trees into XSS vectors.
 */
const URL_ATTRS = new Set(["href", "src", "action", "formAction", "formaction", "ping"]);

function isUnsafeUrl(value: string): boolean {
  // Browsers strip leading C0 controls + SPACE when resolving a URL attr,
  // so skip that prefix before checking the protocol. Done in code (rather
  // than a regex char class) to avoid the no-control-regex eslint rule.
  let i = 0;
  while (i < value.length && value.charCodeAt(i) <= 0x20) i++;
  return /^(javascript|vbscript)\s*:/i.test(value.slice(i));
}

/**
 * Generic HTML-tag renderer used for non-Anuma children of a parsed
 * tree. Geometry attrs and `style` get the same treatment as Anuma
 * primitives (theme tokens resolved, x/y/w/h projected to absolute
 * positioning). Other attrs pass through.
 */
function renderHtml(node: AnumaNode, key: string | number): React.ReactElement | null {
  // We use React.createElement to avoid TypeScript trying to type-check
  // a dynamic intrinsic-element name.
  const Tag = node.tag as keyof React.JSX.IntrinsicElements;
  const props: Record<string, unknown> = { key, "data-anuma-tag": node.tag };
  const styleObj = pickStyle(node.attrs.style);

  // Geometry attrs → CSS positioning when present.
  const geo: GeometryProps = {};
  for (const k of ["x", "y", "w", "h", "rotation", "grow", "shrink"] as const) {
    const v = node.attrs[k];
    if (typeof v === "number") (geo as Record<string, number>)[k] = v;
  }
  if (typeof node.attrs.alignSelf === "string") geo.alignSelf = node.attrs.alignSelf;
  const hasGeo = Object.keys(geo).length > 0;

  // Pass-through scalar attrs (id, src, href, type, placeholder, etc.).
  const SKIP = new Set([
    "x",
    "y",
    "w",
    "h",
    "rotation",
    "grow",
    "shrink",
    "alignSelf",
    "layout",
    "gap",
    "padding",
    "justify",
    "align",
    "style",
  ]);
  for (const [k, v] of Object.entries(node.attrs)) {
    if (SKIP.has(k)) continue;
    if (typeof v === "string") {
      if (URL_ATTRS.has(k) && isUnsafeUrl(v)) continue;
      props[k] = v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      props[k] = v;
    }
  }

  return (
    <ReactNodeWithGeometry
      Tag={Tag}
      props={props}
      style={styleObj}
      geo={geo}
      hasGeo={hasGeo}
      key={key}
    >
      {node.children.map((c, i) =>
        typeof c === "string" ? c : renderTreeChild(c, keyForChild(c, i))
      )}
    </ReactNodeWithGeometry>
  );
}

interface ReactNodeWithGeometryProps {
  Tag: keyof React.JSX.IntrinsicElements;
  props: Record<string, unknown>;
  style: React.CSSProperties | undefined;
  geo: GeometryProps;
  hasGeo: boolean;
  children: React.ReactNode;
}

/** Internal helper that resolves geometry against parent flex context. */
function ReactNodeWithGeometry({
  Tag,
  props,
  style,
  geo,
  hasGeo,
  children,
}: ReactNodeWithGeometryProps): React.ReactElement {
  const theme = useAnumaTheme();
  const parentIsFlex = React.useContext(FlexParentContext);
  const positioning = hasGeo ? (parentIsFlex ? flexChildStyle(geo) : absoluteStyle(geo)) : {};
  const merged: React.CSSProperties = {
    ...positioning,
    ...(resolveStyleTokens(style, theme) ?? {}),
  };
  return React.createElement(Tag, { ...props, style: merged }, children);
}

function pickStyle(value: AttrValue | undefined): React.CSSProperties | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as React.CSSProperties;
  }
  return undefined;
}

function renderTreeChild(node: AnumaNode, key: string | number): React.ReactElement | null {
  if (isAnumaTag(node.tag)) {
    return renderAnumaPrimitive(node, key);
  }
  if (isHtmlTag(node.tag)) {
    return renderHtml(node, key);
  }
  return null;
}

/**
 * React key for an AnumaNode child. Prefers `attrs.id` when available
 * so DOM identity survives sibling reorders (e.g., flex children
 * dragged to a new position). Falls back to the array index for nodes
 * with no id.
 *
 * Without this — keying by index — React's reconciler would swap
 * props in place between DOM siblings on reorder rather than moving
 * DOM nodes, which breaks any consumer that has imperatively mutated
 * style on a specific node (drag handlers, transitions, focus).
 */
function keyForChild(node: AnumaNode, fallbackIndex: number): string | number {
  const id = node.attrs.id;
  return typeof id === "string" && id.length > 0 ? id : fallbackIndex;
}

/** Dispatch to the correct Anuma component for a parsed node. */
function renderAnumaPrimitive(node: AnumaNode, key: string | number): React.ReactElement | null {
  const props = anumaPropsFromAttrs(node.attrs);
  const children = node.children.map((c, i) =>
    typeof c === "string" ? c : renderTreeChild(c, keyForChild(c, i))
  );
  switch (node.tag) {
    case "Deck":
      return (
        <Deck key={key} {...(props as DeckProps)}>
          {children}
        </Deck>
      );
    case "Slide":
      return (
        <Slide key={key} {...(props as SlideProps)}>
          {children}
        </Slide>
      );
    case "Screen":
      return (
        <Screen key={key} {...(props as ScreenProps)}>
          {children}
        </Screen>
      );
    case "Group":
      return (
        <Group key={key} {...(props as GroupProps)}>
          {children}
        </Group>
      );
    case "Rect":
      return <Rect key={key} {...(props as RectProps)} />;
    case "Circle":
      return <Circle key={key} {...(props as CircleProps)} />;
    case "Line":
      return <Line key={key} {...(props as LineProps)} />;
    case "Text":
      return (
        <Text key={key} {...(props as TextProps)}>
          {children}
        </Text>
      );
    case "Image":
      return <Image key={key} {...(props as ImageProps)} />;
    case "Icon":
      return <Icon key={key} {...(props as IconProps)} />;
    default:
      return null;
  }
}

function anumaPropsFromAttrs(attrs: Record<string, AttrValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Render a parsed `AnumaNode` tree. Wrap with `<AnumaThemeProvider>` if
 * you want to override the deck's own theme attrs.
 */
export function renderAnumaTree(node: AnumaNode): React.ReactElement | null {
  return renderTreeChild(node, 0);
}

/**
 * Parse a JSX string and render it. Convenience over
 * `parseJsx(jsx) → renderAnumaTree(node)`.
 */
export function renderAnumaJsx(jsx: string): React.ReactElement | null {
  const node = parseJsx(jsx);
  return renderAnumaTree(node);
}
