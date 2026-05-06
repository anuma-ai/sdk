/**
 * Canonical JSON serialization for PromptSeal receipts.
 *
 * Every receipt is hashed and signed over canonical bytes. The browser verifier
 * (JS @noble/ed25519) and the Python `promptseal/canonical.py` must produce
 * identical bytes from the same object, so this module is the single source of
 * truth for serialization rules:
 *
 *   - sorted keys recursively
 *   - no whitespace (',' and ':' separators)
 *   - UTF-8 bytes (TextEncoder)
 *   - ASCII-safe escapes for control chars; Unicode chars pass through (matches
 *     Python `ensure_ascii=False`)
 *
 * Pitfall guarded against: Python preserves number source representation
 * (`0.0` stays `"0.0"`); JS's `JSON.parse` + `JSON.stringify` collapses to
 * `"0"`. The `parseJsonPreservingNumbers` helper preserves the original digit
 * string so canonicalize() can emit it verbatim — byte-equal to Python.
 */

const HASH_PREFIX = "sha256:";
const KEY_PREFIX = "ed25519:";

export { HASH_PREFIX, KEY_PREFIX };

/** Wrapper that preserves the original numeric source token. */
export class NumberToken {
  readonly src: string;
  constructor(src: string) {
    this.src = src;
  }
}

/**
 * Parse JSON while preserving numeric source tokens. Used by the verifier when
 * the caller pasted a receipt JSON whose numbers must round-trip byte-equal.
 * Booleans, strings, arrays, objects, null parse normally.
 */
export function parseJsonPreservingNumbers(text: string): unknown {
  let pos = 0;

  function err(msg: string): never {
    throw new Error(`JSON parse error at pos ${pos}: ${msg}`);
  }
  function skipWs(): void {
    while (pos < text.length && /\s/.test(text[pos]!)) pos++;
  }
  function expect(ch: string): void {
    if (text[pos] !== ch) err(`expected '${ch}', got '${text[pos] ?? "EOF"}'`);
    pos++;
  }

  function parseValue(): unknown {
    skipWs();
    const c = text[pos];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return parseString();
    if (c === "t" || c === "f") return parseBool();
    if (c === "n") return parseNull();
    return parseNumber();
  }

  function parseObject(): Record<string, unknown> {
    expect("{");
    const obj: Record<string, unknown> = {};
    skipWs();
    if (text[pos] === "}") {
      pos++;
      return obj;
    }
    while (true) {
      skipWs();
      const key = parseString();
      skipWs();
      expect(":");
      obj[key] = parseValue();
      skipWs();
      if (text[pos] === ",") {
        pos++;
        continue;
      }
      if (text[pos] === "}") {
        pos++;
        return obj;
      }
      err("expected ',' or '}'");
    }
  }

  function parseArray(): unknown[] {
    expect("[");
    const arr: unknown[] = [];
    skipWs();
    if (text[pos] === "]") {
      pos++;
      return arr;
    }
    while (true) {
      arr.push(parseValue());
      skipWs();
      if (text[pos] === ",") {
        pos++;
        continue;
      }
      if (text[pos] === "]") {
        pos++;
        return arr;
      }
      err("expected ',' or ']'");
    }
  }

  function parseString(): string {
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
          const map: Record<string, string> = {
            '"': '"',
            "\\": "\\",
            "/": "/",
            b: "\b",
            f: "\f",
            n: "\n",
            r: "\r",
            t: "\t",
          };
          if (esc === undefined || !(esc in map)) err(`bad escape \\${esc}`);
          s += map[esc as keyof typeof map];
          pos += 2;
        }
      } else {
        s += text[pos++];
      }
    }
    expect('"');
    return s;
  }

  function parseBool(): boolean {
    if (text.substr(pos, 4) === "true") {
      pos += 4;
      return true;
    }
    if (text.substr(pos, 5) === "false") {
      pos += 5;
      return false;
    }
    err("bad bool literal");
  }

  function parseNull(): null {
    if (text.substr(pos, 4) === "null") {
      pos += 4;
      return null;
    }
    err("bad null literal");
  }

  function parseNumber(): NumberToken {
    const start = pos;
    if (text[pos] === "-") pos++;
    while (pos < text.length && /[0-9eE+\-.]/.test(text[pos]!)) pos++;
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

function encodeJsonString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
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

/**
 * Serialize *value* to canonical JSON string. Matches Python's
 * `json.dumps(obj, sort_keys=True, separators=(',',':'), ensure_ascii=False)`.
 * NumberTokens emit their source text verbatim.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (value instanceof NumberToken) return value.src;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return encodeJsonString(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => encodeJsonString(k) + ":" + canonicalize(obj[k]));
    return "{" + parts.join(",") + "}";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`cannot canonicalize non-finite number: ${value}`);
    }
    // Mirrors Python's json.dumps for integer-valued floats: 0.0 -> "0.0".
    // Without source preservation, plain numbers go through this path; integers
    // emit as "0", floats as their JS toString. Use parseJsonPreservingNumbers
    // for byte-equal Python parity on round-trip.
    return String(value);
  }
  throw new Error(`unsupported value of type ${typeof value}`);
}

const TEXT_ENC = new TextEncoder();

/** Canonical JSON bytes (UTF-8) for *value*. */
export function canonicalJson(value: unknown): Uint8Array {
  return TEXT_ENC.encode(canonicalize(value));
}

/**
 * Coerce a Uint8Array to one whose underlying ArrayBuffer is the canonical
 * `ArrayBuffer` (not `SharedArrayBuffer`). `crypto.subtle.digest`'s
 * `BufferSource` parameter rejects `Uint8Array<ArrayBufferLike>` under
 * strict TS — copying the bytes is the simplest cross-platform fix.
 */
export function toBufferSource(b: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(b.length);
  new Uint8Array(out).set(b);
  return out;
}

/** Hex SHA-256 of canonical bytes for *value*. */
export async function canonicalSha256Hex(value: unknown): Promise<string> {
  const bytes = canonicalJson(value);
  const digest = await crypto.subtle.digest("SHA-256", toBufferSource(bytes));
  return bytesToHex(new Uint8Array(digest));
}

// -- byte helpers ----------------------------------------------------------

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`odd-length hex: ${hex}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function base64ToBytes(b64: string): Uint8Array {
  // Node 18+ exposes atob globally.
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

// -- prefix helpers --------------------------------------------------------

export function stripHashPrefix(s: string): string {
  if (typeof s !== "string" || !s.startsWith(HASH_PREFIX)) {
    throw new Error(`expected '${HASH_PREFIX}<hex>' prefix, got: ${JSON.stringify(s)}`);
  }
  return s.slice(HASH_PREFIX.length);
}

export function stripKeyPrefix(s: string): string {
  if (typeof s !== "string" || !s.startsWith(KEY_PREFIX)) {
    throw new Error(`expected '${KEY_PREFIX}<base64>' prefix, got: ${JSON.stringify(s)}`);
  }
  return s.slice(KEY_PREFIX.length);
}
