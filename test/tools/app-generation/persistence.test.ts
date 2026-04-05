/**
 * Tests that multi-file apps round-trip correctly through the
 * encode/decode pipeline:
 *
 *   encode: files -> JSON { _multiFile: '__memoryless_mf_v1__', files: { path: content } }
 *   decode: JSON -> parse -> detect marker -> extract files -> apply params
 *
 * These are pure unit tests — no LLM calls required.
 */

import { describe, expect, it } from "vitest";

const MARKER = "__memoryless_mf_v1__";

// -- Encode (mirrors SaveToolDialog logic) ------------------------------------

function encodeMultiFile(files: Record<string, string>): string {
  return JSON.stringify({ _multiFile: MARKER, files });
}

function encodeSingleFile(html: string): string {
  return html;
}

// -- Decode (mirrors useSavedTools logic) -------------------------------------

function decodeHtml(
  rawHtml: string
): { isMultiFile: true; files: Record<string, string> } | { isMultiFile: false; html: string } {
  try {
    const parsed = JSON.parse(rawHtml) as {
      _multiFile?: string;
      files?: Record<string, string>;
    };
    if (parsed._multiFile === MARKER && parsed.files) {
      return { isMultiFile: true, files: parsed.files };
    }
  } catch {
    // Not JSON
  }
  return { isMultiFile: false, html: rawHtml };
}

// -- Parameter substitution (mirrors useSavedTools applyParams) ---------------

function applyParams(
  text: string,
  args: Record<string, string>,
  paramDefs: Record<string, { defaultValue?: string }>
): string {
  let result = text;
  for (const [key, def] of Object.entries(paramDefs)) {
    if (!(key in args)) continue;
    const newValue = args[key]!;
    const sentinel = `{{${key}}}`;
    if (result.includes(sentinel)) {
      result = result.replaceAll(sentinel, newValue);
    } else if (def.defaultValue && newValue !== def.defaultValue) {
      result = result.replaceAll(def.defaultValue, newValue);
    }
  }
  return result;
}

// -- Tests --------------------------------------------------------------------

describe("multi-file persistence", () => {
  it("round-trips a multi-file app through encode/decode", () => {
    const files = {
      "package.json": '{"dependencies":{"react":"^18.2.0"}}',
      "App.js": "export default function App() { return <div>Hello</div>; }",
      "App.css": "body { margin: 0; }",
    };

    const encoded = encodeMultiFile(files);
    const decoded = decodeHtml(encoded);

    expect(decoded.isMultiFile).toBe(true);
    if (decoded.isMultiFile) {
      expect(decoded.files).toEqual(files);
      expect(Object.keys(decoded.files)).toEqual(["package.json", "App.js", "App.css"]);
    }
  });

  it("single-file HTML passes through without marker detection", () => {
    const html = "<!DOCTYPE html><html><body>Hello</body></html>";
    const encoded = encodeSingleFile(html);
    const decoded = decodeHtml(encoded);

    expect(decoded.isMultiFile).toBe(false);
    if (!decoded.isMultiFile) {
      expect(decoded.html).toBe(html);
    }
  });

  it("does not false-positive on JSON that lacks the marker", () => {
    const jsonHtml = '{"title":"test","content":"hello"}';
    const decoded = decodeHtml(jsonHtml);
    expect(decoded.isMultiFile).toBe(false);
  });

  it("applies sentinel parameter substitution to multi-file content", () => {
    const files = {
      "App.js": 'const name = "{{userName}}"; const age = {{userAge}};',
      "App.css": ".name { color: red; }",
    };

    const encoded = encodeMultiFile(files);
    const decoded = decodeHtml(encoded);
    expect(decoded.isMultiFile).toBe(true);

    if (decoded.isMultiFile) {
      const params = {
        userName: { defaultValue: "World" },
        userAge: { defaultValue: "25" },
      };
      const args = { userName: "Alice", userAge: "30" };

      const patchedJs = applyParams(decoded.files["App.js"]!, args, params);
      expect(patchedJs).toBe('const name = "Alice"; const age = 30;');

      // CSS should be untouched (no params)
      const patchedCss = applyParams(decoded.files["App.css"]!, args, params);
      expect(patchedCss).toBe(".name { color: red; }");
    }
  });

  it("applies default-value substitution when no sentinels present", () => {
    const files = {
      "App.js": "const bpm = 65; // default heart rate",
    };

    const encoded = encodeMultiFile(files);
    const decoded = decodeHtml(encoded);
    expect(decoded.isMultiFile).toBe(true);

    if (decoded.isMultiFile) {
      const params = { bpm: { defaultValue: "65" } };
      const args = { bpm: "72" };

      const patched = applyParams(decoded.files["App.js"]!, args, params);
      expect(patched).toBe("const bpm = 72; // default heart rate");
    }
  });

  it("preserves files after patch_file edits", () => {
    // Simulate: create 3 files, patch App.css, re-encode, decode
    const original = {
      "package.json": '{"dependencies":{"react":"^18.2.0"}}',
      "App.js": 'export default function App() { return <div className="app">Hello</div>; }',
      "App.css": ".app { background: blue; color: white; }",
    };

    // Simulate patch_file: change blue to green
    const patched = { ...original };
    patched["App.css"] = original["App.css"]!.replace("blue", "green");

    // Re-encode (as SaveToolDialog would when saving after edits)
    const encoded = encodeMultiFile(patched);
    const decoded = decodeHtml(encoded);

    expect(decoded.isMultiFile).toBe(true);
    if (decoded.isMultiFile) {
      expect(decoded.files["App.css"]).toBe(".app { background: green; color: white; }");
      expect(decoded.files["App.js"]).toBe(original["App.js"]);
      expect(decoded.files["package.json"]).toBe(original["package.json"]);
    }
  });

  it("handles empty files gracefully", () => {
    const files = {
      "App.js": "",
      "App.css": "",
    };

    const encoded = encodeMultiFile(files);
    const decoded = decodeHtml(encoded);

    expect(decoded.isMultiFile).toBe(true);
    if (decoded.isMultiFile) {
      expect(decoded.files["App.js"]).toBe("");
      expect(decoded.files["App.css"]).toBe("");
    }
  });
});
