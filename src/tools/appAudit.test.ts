/**
 * Unit tests for the design audit. Pure-function checks against a small
 * gallery of curated App.js / App.css snippets — no LLM, no DOM.
 */

import { describe, expect, it } from "vitest";

import { auditDesign, contrastRatio } from "./appAudit.js";

function findIssue(result: ReturnType<typeof auditDesign>, type: string) {
  return result.issues.filter((i) => i.type === type);
}

describe("auditDesign", () => {
  it("returns a clean score on a well-tokenized app", () => {
    const css = `:root {
  --bg: #ffffff;
  --ink: #111111;
  --accent: #b75432;
  --font-display: 'Fraunces', serif;
  --radius: 12px;
}

body { background: var(--bg); color: var(--ink); font-family: var(--font-display); }
.card { border-radius: var(--radius); background: color-mix(in oklab, var(--accent) 6%, var(--bg)); }
.btn { background: var(--accent); color: var(--bg); }
.btn:hover { opacity: 0.9; }
.btn:focus-visible { outline: 2px solid var(--accent); }
.input:focus-visible { outline: 2px solid var(--accent); }
`;
    const js = `
function App() {
  return (
    <div>
      <h1>Hello</h1>
      <button aria-label="save">⌘</button>
      <input value="x" />
      <a href="#x">link</a>
    </div>
  );
}
`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.tokens.colors).toContain("--bg");
    expect(result.tokens.colors).toContain("--accent");
    expect(result.tokens.fonts).toContain("--font-display");
    expect(result.tokens.other).toContain("--radius");
  });

  it("flags raw hex colors outside :root", () => {
    const css = `:root { --bg: #fff; }
.btn { background: #ff5733; color: rgb(80, 80, 80); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    const rawColors = findIssue(result, "raw-color");
    expect(rawColors.length).toBe(2);
    expect(rawColors.every((i) => i.path === "App.css")).toBe(true);
    expect(rawColors.find((i) => i.message.includes("#ff5733"))).toBeTruthy();
  });

  it("does not flag colors inside :root", () => {
    const css = `:root {
  --bg: #ffffff;
  --accent: rgb(183, 84, 50);
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
body { background: var(--bg); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "raw-color")).toHaveLength(0);
  });

  it("does not flag colors inside color-mix() — that's modern CSS used with tokens", () => {
    const css = `:root { --accent: #b75432; --bg: #fff; }
.tint { background: color-mix(in oklab, var(--accent) 14%, var(--bg)); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "raw-color")).toHaveLength(0);
  });

  it("flags inline style colors in JSX", () => {
    const js = `function App() {
  return <div style={{ color: '#ff0000', background: 'rgb(20, 30, 40)' }}>x</div>;
}`;
    const result = auditDesign({ "App.js": js, "App.css": "" });
    const inline = findIssue(result, "inline-style-with-color");
    expect(inline.length).toBe(2);
  });

  it("flags tokens declared but never used", () => {
    const css = `:root {
  --bg: #fff;
  --accent: #b75432;
  --unused-token: #abcdef;
}
body { background: var(--bg); color: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    const unused = findIssue(result, "unused-token");
    expect(unused).toHaveLength(1);
    expect(unused[0]?.message).toContain("--unused-token");
  });

  it("flags missing :focus-visible when the app has multiple interactive elements", () => {
    const js = `function App() {
  return (
    <div>
      <button>a</button>
      <button>b</button>
      <a href="#x">c</a>
      <input value="x" onChange={() => {}} />
    </div>
  );
}`;
    const css = `:root { --accent: #b75432; }
.btn { color: var(--accent); }
.btn:hover { opacity: 0.9; }
`; // hover but no focus-visible
    const result = auditDesign({ "App.js": js, "App.css": css });
    const focus = findIssue(result, "missing-focus-state");
    expect(focus.length).toBe(1);
    expect(focus[0]?.severity).toBe("warn");
  });

  it("does not flag focus-visible when at least some interactive elements have it", () => {
    const js = `function App() {
  return <div><button>x</button><button>y</button></div>;
}`;
    const css = `:root { --accent: #b75432; }
.btn:focus-visible { outline: 2px solid var(--accent); }
`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    expect(findIssue(result, "missing-focus-state")).toHaveLength(0);
  });

  it("flags icon-only buttons without aria-label", () => {
    const js = `function App() {
  return (
    <div>
      <button><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button>
      <button aria-label="close"><svg viewBox="0 0 24 24"/></button>
      <button>Save</button>
    </div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": "" });
    const aria = findIssue(result, "missing-aria-label");
    expect(aria).toHaveLength(1);
    // The first button (the one without aria-label) is the offender.
    expect(aria[0]?.line).toBeGreaterThan(0);
  });

  it("flags <img> without alt", () => {
    const js = `function App() {
  return (
    <div>
      <img src="a.png" />
      <img src="b.png" alt="" />
      <img src="c.png" alt="hero" />
    </div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": "" });
    const alt = findIssue(result, "missing-alt");
    expect(alt).toHaveLength(1);
  });

  it("flags heading-level skips", () => {
    const js = `function App() {
  return (
    <div>
      <h1>Title</h1>
      <h3>Skipped h2</h3>
      <h2>OK</h2>
      <h4>Skipped h3 again</h4>
    </div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": "" });
    const skips = findIssue(result, "heading-order");
    expect(skips.length).toBe(2);
  });

  it("flags no-design-tokens when App.css has content but no :root variables", () => {
    const css = `body { background: white; }
.btn { color: red; }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "no-design-tokens")).toHaveLength(1);
  });

  it("does not flag no-design-tokens when App.css is empty (Tailwind-only app)", () => {
    const result = auditDesign({
      "App.js": "function App(){return null}",
      "App.css": "",
    });
    expect(findIssue(result, "no-design-tokens")).toHaveLength(0);
  });

  it("sorts issues by severity then path then line", () => {
    const js = `function App() {
  return (
    <div>
      <img src="x.png" />
      <h1>a</h1>
      <h3>skipped</h3>
      <button><svg/></button>
      <button><svg/></button>
    </div>
  );
}`;
    const css = `body { background: #f00; color: #888; }`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    const order = result.issues.map((i) => i.severity);
    // Errors first (none here), warns next, infos last.
    let lastSev = -1;
    const sev = { error: 0, warn: 1, info: 2 } as const;
    for (const s of order) {
      const n = sev[s];
      expect(n).toBeGreaterThanOrEqual(lastSev);
      lastSev = n;
    }
  });

  it("scores degrade with more issues", () => {
    const clean = auditDesign({
      "App.js": "function App(){return null}",
      "App.css": ":root { --bg: #fff; } body { background: var(--bg); }",
    });
    const dirty = auditDesign({
      "App.js": `function App() {
  return (
    <div>
      <img src="x" />
      <button><svg/></button>
      <h1>a</h1>
      <h3>x</h3>
      <div style={{ color: '#f00' }}>z</div>
    </div>
  );
}`,
      "App.css": `body { background: #f00; color: #888; }`,
    });
    expect(dirty.score).toBeLessThan(clean.score);
    expect(dirty.score).toBeGreaterThanOrEqual(0);
  });

  it("falls back to App.jsx when App.js is absent", () => {
    const result = auditDesign({
      "App.jsx": "function App(){ return <div><img src='x'/></div> }",
    });
    expect(findIssue(result, "missing-alt")).toHaveLength(1);
  });

  it("ignores colors inside CSS comments", () => {
    const css = `:root { --bg: #fff; }
/* The accent used to be #ff5733 but we removed it */
body { background: var(--bg); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "raw-color")).toHaveLength(0);
  });

  // ---------------------------------------------------------------------
  // Semantic checks: contrast math, focus rings keyed to tokens,
  // spacing-scale adherence. The presence-based checks above catch "did
  // the model declare a focus rule"; these catch "did the model use the
  // system or game it with a one-off hardcoded value".
  // ---------------------------------------------------------------------

  it("contrastRatio computes WCAG luminance ratio correctly", () => {
    // Black on white: 21:1 (max).
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
    // #888 mid-grey on white: ~3.5:1 (a known AA-failing pairing).
    expect(contrastRatio([136, 136, 136], [255, 255, 255])).toBeCloseTo(3.54, 1);
    // Same color: 1:1.
    expect(contrastRatio([100, 100, 100], [100, 100, 100])).toBeCloseTo(1, 5);
  });

  it("flags low-contrast --ink / --bg as a warn (fails AA but >= 3:1)", () => {
    const css = `:root {
  --bg: #ffffff;
  --ink: #888888;
  --accent: #b75432;
}
body { background: var(--bg); color: var(--ink); }
.tag { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    const lc = findIssue(result, "low-contrast");
    expect(lc).toHaveLength(1);
    expect(lc[0].severity).toBe("warn");
    expect(lc[0].message).toMatch(/3\.5/);
    expect(lc[0].message).toMatch(/AA/);
  });

  it("escalates low-contrast to error when below 3:1", () => {
    const css = `:root {
  --bg: #ffffff;
  --ink: #cccccc;
  --accent: #b75432;
}
body { background: var(--bg); color: var(--ink); }
.tag { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    const lc = findIssue(result, "low-contrast");
    expect(lc).toHaveLength(1);
    expect(lc[0].severity).toBe("error");
  });

  it("does not flag low-contrast when AA passes (>= 4.5:1)", () => {
    const css = `:root { --bg: #ffffff; --ink: #111111; --accent: #b75432; }
body { background: var(--bg); color: var(--ink); }
.tag { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "low-contrast")).toHaveLength(0);
  });

  it("skips low-contrast check when --ink / --bg aren't simple hex", () => {
    const css = `:root {
  --bg: oklch(98% 0 0);
  --ink: oklch(15% 0 0);
  --accent: #b75432;
}
body { background: var(--bg); color: var(--ink); }
.tag { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "low-contrast")).toHaveLength(0);
  });

  it("flags :focus-visible rules with hardcoded colors instead of design tokens", () => {
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }
.btn:focus-visible { outline: 2px solid #ff0000; }
body { background: var(--bg); color: var(--ink); }
.tag { background: var(--accent); }
`;
    const js = `function App() {
  return (
    <div>
      <button>a</button>
      <button>b</button>
      <input value="x" />
    </div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    const fk = findIssue(result, "focus-not-keyed");
    expect(fk).toHaveLength(1);
    expect(fk[0].severity).toBe("warn");
    expect(fk[0].message).toMatch(/var\(--accent\)|design token/);
  });

  it("does not flag :focus-visible when it references any design token via var()", () => {
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }
.btn:focus-visible { outline: 2px solid var(--accent); }
.input:focus-visible { box-shadow: 0 0 0 3px var(--accent); }
body { background: var(--bg); color: var(--ink); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "focus-not-keyed")).toHaveLength(0);
  });

  it("skips focus-not-keyed when no color tokens are declared (different concern)", () => {
    const css = `.btn:focus-visible { outline: 2px solid red; }`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "focus-not-keyed")).toHaveLength(0);
  });

  it("flags padding / margin / gap that doesn't match the declared spacing scale", () => {
    const css = `:root {
  --bg: #fff;
  --ink: #111;
  --accent: #b75432;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
}
body { background: var(--bg); color: var(--ink); }
.card { padding: 17px; gap: 8px; }
.btn { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    const off = findIssue(result, "off-scale-spacing");
    expect(off).toHaveLength(1);
    expect(off[0].message).toMatch(/17px/);
    expect(off[0].message).toMatch(/8px/); // mentions a scale value
  });

  it("does not flag off-scale-spacing when the value matches the scale", () => {
    const css = `:root {
  --bg: #fff;
  --ink: #111;
  --accent: #b75432;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
}
body { background: var(--bg); color: var(--ink); }
.card { padding: 8px 12px; }
.btn { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "off-scale-spacing")).toHaveLength(0);
  });

  it("does not flag off-scale-spacing when the declaration uses var() or calc()", () => {
    const css = `:root {
  --bg: #fff;
  --ink: #111;
  --accent: #b75432;
  --space-1: 4px;
  --space-2: 8px;
}
body { background: var(--bg); color: var(--ink); }
.card { padding: var(--space-2); margin: calc(var(--space-2) * 2); }
.btn { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "off-scale-spacing")).toHaveLength(0);
  });

  it("skips off-scale-spacing entirely when no spacing scale is declared", () => {
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }
body { background: var(--bg); color: var(--ink); }
.card { padding: 17px; gap: 13px; margin: 9px; }
.btn { background: var(--accent); }
`;
    const result = auditDesign({ "App.js": "function App(){return null}", "App.css": css });
    expect(findIssue(result, "off-scale-spacing")).toHaveLength(0);
  });

  it("flags JSX class names that don't appear in App.css", () => {
    // Models renaming a wrapper class in JSX but forgetting to add the
    // corresponding CSS rule is exactly the failure mode that broke
    // kanban step-5 — the page rendered blank because the new
    // `.app-shell` had no `display: flex` rule.
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }
.app-root { display: flex; }
.sidebar { width: 220px; }
.main { flex: 1; }
`;
    const js = `function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">Boards</aside>
      <div className="main">content</div>
    </div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    const orphans = findIssue(result, "orphaned-class");
    expect(orphans).toHaveLength(1);
    expect(orphans[0].severity).toBe("warn");
    expect(orphans[0].message).toMatch(/app-shell/);
    expect(orphans[0].message).not.toMatch(/sidebar/); // sidebar IS in CSS
    expect(orphans[0].message).not.toMatch(/main/); //   main IS in CSS
  });

  it("does NOT flag Tailwind utility classes (CDN-injected, never in App.css)", () => {
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }`;
    const js = `function App() {
  return (
    <div className="flex items-center justify-between p-4 gap-2">
      <h1 className="text-2xl font-bold text-white">Title</h1>
      <button className="bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1">go</button>
      <span className="bg-[var(--accent)] text-[14px]">arbitrary value</span>
    </div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    expect(findIssue(result, "orphaned-class")).toHaveLength(0);
  });

  it("does NOT flag known library-injected class names (lucide, lucide-*)", () => {
    // lucide-react renders SVGs with `class="lucide lucide-camera"` at
    // runtime. The model never declares these in CSS — they're not its
    // responsibility.
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }`;
    const js = `function App() {
  return (
    <div className="lucide lucide-camera">icon</div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    expect(findIssue(result, "orphaned-class")).toHaveLength(0);
  });

  it("skips orphaned-class check when App.css is empty (Tailwind-only app)", () => {
    const js = `function App() { return <div className="card">x</div>; }`;
    const result = auditDesign({ "App.js": js, "App.css": "" });
    expect(findIssue(result, "orphaned-class")).toHaveLength(0);
  });

  it("ignores dynamic interpolations in template literal className", () => {
    // Static `btn` is in CSS, but `btn--${variant}` produces classes the
    // regex can't statically resolve — we strip the interpolation and
    // only check the static text. No false positive on `btn--`.
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }
.btn { background: var(--accent); }
.btn--primary { color: white; }`;
    const js = `function App({ variant }) {
  return <button className={\`btn btn--\${variant}\`}>x</button>;
}`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    expect(findIssue(result, "orphaned-class")).toHaveLength(0);
  });

  it("detects BEM-style class names used in JSX but missing from CSS", () => {
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }
.card { padding: 8px; }
.card__title { font-weight: 600; }`;
    const js = `function App() {
  return (
    <div className="card">
      <h2 className="card__title">x</h2>
      <p className="card__subtitle">y</p>
    </div>
  );
}`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    const orphans = findIssue(result, "orphaned-class");
    expect(orphans).toHaveLength(1);
    expect(orphans[0].message).toMatch(/card__subtitle/);
  });

  it("ignores CSS-comment-only class declarations when matching", () => {
    // A class commented out in App.css must NOT count as "declared" —
    // the model would think the class exists when it doesn't.
    const css = `:root { --bg: #fff; --ink: #111; --accent: #b75432; }
/* .legacy { display: none; } */`;
    const js = `function App() {
  return <div className="legacy">x</div>;
}`;
    const result = auditDesign({ "App.js": js, "App.css": css });
    const orphans = findIssue(result, "orphaned-class");
    expect(orphans).toHaveLength(1);
    expect(orphans[0].message).toMatch(/legacy/);
  });
});
