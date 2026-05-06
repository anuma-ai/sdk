// Canonical JSON + helpers shared between the browser verifier and Node tests.
//
// MUST byte-equal promptseal/canonical.py output. The single biggest cross-
// language gotcha: Python preserves number source representation (`0.0` stays
// "0.0"), JS's JSON.parse + JSON.stringify collapses to "0". Hence the small
// parseJsonPreservingNumbers below — it keeps every number's original digit
// string so canonicalize() can re-emit it verbatim.
//
// Pure ESM, no external imports — so Node can load this file without
// resolving the @noble/ed25519 CDN URL that verify.js uses.

const HASH_PREFIX = "sha256:";
const KEY_PREFIX = "ed25519:";

export { HASH_PREFIX, KEY_PREFIX };

// -- prefix-stripping helpers ----------------------------------------------

export function stripHashPrefix(s) {
  if (typeof s !== "string" || !s.startsWith(HASH_PREFIX)) {
    throw new Error(`expected '${HASH_PREFIX}<hex>' prefix, got: ${JSON.stringify(s)}`);
  }
  return s.slice(HASH_PREFIX.length);
}

export function stripKeyPrefix(s) {
  if (typeof s !== "string" || !s.startsWith(KEY_PREFIX)) {
    throw new Error(`expected '${KEY_PREFIX}<base64>' prefix, got: ${JSON.stringify(s)}`);
  }
  return s.slice(KEY_PREFIX.length);
}

// -- hex / base64 helpers --------------------------------------------------

export function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error(`odd-length hex: ${hex}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function base64ToBytes(b64) {
  // Node 18+ exposes atob globally.
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const TEXT_ENC = new TextEncoder();
export { TEXT_ENC };

// -- JSON parser that preserves number tokens -------------------------------

export class NumberToken {
  constructor(src) { this.src = src; }
}

export function parseJsonPreservingNumbers(text) {
  let pos = 0;

  function err(msg) { throw new Error(`JSON parse error at pos ${pos}: ${msg}`); }
  function skipWs() { while (pos < text.length && /\s/.test(text[pos])) pos++; }
  function expect(ch) {
    if (text[pos] !== ch) err(`expected '${ch}', got '${text[pos] ?? "EOF"}'`);
    pos++;
  }

  function parseValue() {
    skipWs();
    const c = text[pos];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return parseString();
    if (c === "t" || c === "f") return parseBool();
    if (c === "n") return parseNull();
    return parseNumber();
  }

  function parseObject() {
    expect("{");
    const obj = {};
    skipWs();
    if (text[pos] === "}") { pos++; return obj; }
    while (true) {
      skipWs();
      const key = parseString();
      skipWs();
      expect(":");
      obj[key] = parseValue();
      skipWs();
      if (text[pos] === ",") { pos++; continue; }
      if (text[pos] === "}") { pos++; return obj; }
      err("expected ',' or '}'");
    }
  }

  function parseArray() {
    expect("[");
    const arr = [];
    skipWs();
    if (text[pos] === "]") { pos++; return arr; }
    while (true) {
      arr.push(parseValue());
      skipWs();
      if (text[pos] === ",") { pos++; continue; }
      if (text[pos] === "]") { pos++; return arr; }
      err("expected ',' or ']'");
    }
  }

  function parseString() {
    expect('"');
    let s = "";
    while (pos < text.length && text[pos] !== '"') {
      if (text[pos] === "\\") {
        const esc = text[pos + 1];
        if (esc === "u") {
          const code = parseInt(text.substr(pos + 2, 4), 16);
          s += String.fromCharCode(code);
          pos += 6;
        } else {
          const map = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
          if (!(esc in map)) err(`bad escape \\${esc}`);
          s += map[esc];
          pos += 2;
        }
      } else {
        s += text[pos++];
      }
    }
    expect('"');
    return s;
  }

  function parseBool() {
    if (text.substr(pos, 4) === "true") { pos += 4; return true; }
    if (text.substr(pos, 5) === "false") { pos += 5; return false; }
    err("bad bool literal");
  }

  function parseNull() {
    if (text.substr(pos, 4) === "null") { pos += 4; return null; }
    err("bad null literal");
  }

  function parseNumber() {
    const start = pos;
    if (text[pos] === "-") pos++;
    while (pos < text.length && /[0-9eE+\-.]/.test(text[pos])) pos++;
    const src = text.slice(start, pos);
    if (!/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(src)) {
      err(`bad number literal: ${src}`);
    }
    return new NumberToken(src);
  }

  const result = parseValue();
  skipWs();
  if (pos !== text.length) err("trailing characters after JSON value");
  return result;
}

// -- canonical JSON (mirrors promptseal/canonical.py) -----------------------

export function canonicalize(value) {
  if (value === null) return "null";
  if (value instanceof NumberToken) return value.src;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return encodeJsonString(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const parts = keys.map((k) => encodeJsonString(k) + ":" + canonicalize(value[k]));
    return "{" + parts.join(",") + "}";
  }
  if (typeof value === "number") {
    return String(value);
  }
  throw new Error(`unsupported value of type ${typeof value}`);
}

function encodeJsonString(s) {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const code = s.charCodeAt(i);
    if (c === '"') out += '\\"';
    else if (c === "\\") out += "\\\\";
    else if (code === 0x08) out += "\\b";
    else if (code === 0x09) out += "\\t";
    else if (code === 0x0a) out += "\\n";
    else if (code === 0x0c) out += "\\f";
    else if (code === 0x0d) out += "\\r";
    else if (code < 0x20) out += "\\u" + code.toString(16).padStart(4, "0");
    else out += c;
  }
  return out + '"';
}

export async function canonicalSha256Hex(value) {
  const bytes = TEXT_ENC.encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

// Convert receipt object → canonicalized body (sans event_hash + signature).
export function strippedBody(receipt) {
  const body = {};
  for (const k of Object.keys(receipt)) {
    if (k === "event_hash" || k === "signature") continue;
    body[k] = receipt[k];
  }
  return body;
}
