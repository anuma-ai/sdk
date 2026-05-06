import { describe, expect, it } from "vitest";

import {
  bytesToHex,
  canonicalize,
  canonicalJson,
  canonicalSha256Hex,
  parseJsonPreservingNumbers,
} from "../canonical";

describe("canonical", () => {
  it("sorts keys recursively", () => {
    const out = canonicalize({ b: 1, a: { y: 2, x: 3 } });
    expect(out).toBe('{"a":{"x":3,"y":2},"b":1}');
  });

  it("emits no whitespace", () => {
    const out = canonicalize([1, 2, { k: "v" }]);
    expect(out).toBe('[1,2,{"k":"v"}]');
  });

  it("escapes control chars", () => {
    expect(canonicalize("a\nb")).toBe('"a\\nb"');
    expect(canonicalize("a\tb")).toBe('"a\\tb"');
    expect(canonicalize("a\"b")).toBe('"a\\"b"');
  });

  it("preserves unicode (no \\uXXXX escape)", () => {
    expect(canonicalize("✓")).toBe('"✓"');
  });

  it("canonicalJson returns UTF-8 bytes", () => {
    const out = canonicalJson({ k: "✓" });
    const text = new TextDecoder().decode(out);
    expect(text).toBe('{"k":"✓"}');
  });

  it("computes SHA-256 over canonical bytes", async () => {
    const hex = await canonicalSha256Hex({ a: 1 });
    // sha256({"a":1}) = ...
    // Verified: echo -n '{"a":1}' | sha256sum
    expect(hex).toBe(
      "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"
    );
  });

  it("parseJsonPreservingNumbers preserves 0.0 source", () => {
    const parsed = parseJsonPreservingNumbers("0.0") as { src: string };
    expect(parsed.src).toBe("0.0");
    expect(canonicalize(parsed)).toBe("0.0");
  });

  it("sorts keys regardless of input order", () => {
    const text = '{"timestamp":"2026-04-30T18:22:01.123Z","value":1.5,"flag":true}';
    const parsed = parseJsonPreservingNumbers(text);
    // canonicalize sorts keys → "flag" first, then "timestamp", then "value".
    expect(canonicalize(parsed)).toBe(
      '{"flag":true,"timestamp":"2026-04-30T18:22:01.123Z","value":1.5}'
    );
  });

  it("bytesToHex round-trips", () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    expect(bytesToHex(bytes)).toBe("deadbeef");
  });
});
