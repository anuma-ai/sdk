/**
 * Unit tests for the design audit. Pure-function checks against a small
 * gallery of curated App.js / App.css snippets — no LLM, no DOM.
 */

import { describe, expect, it } from "vitest";

import { auditDesign } from "./appAudit.js";

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
});
