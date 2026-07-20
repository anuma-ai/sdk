/**
 * Universal encoding utilities that work in both browser and Node.js environments.
 *
 * - `dataUrlToArrayBuffer`: Decodes data URLs, blob URLs, and HTTP URLs to ArrayBuffer
 * - `uint8ArrayToBase64`: Encodes binary data to base64 string
 * - `base64ToUint8Array`: Decodes a base64 string to binary data
 *
 * These avoid direct use of `atob`/`btoa` (unavailable in older Node.js versions)
 * by preferring `Buffer` when available, with browser globals as fallback.
 *
 * The browser fallbacks encode/decode in bounded chunks. `btoa(String.fromCharCode(...bytes))`
 * spreads every byte as a function argument, which throws
 * `RangeError: Maximum call stack size exceeded` above ~100–500KB — so it must never be used
 * on payloads of unknown size (e.g. whole-DB backups). Chunking keeps the argument count bounded
 * and only one small chunk string live at a time.
 */

// 0x8000 bytes, a multiple of 3 so base64 chunk boundaries never split a 3-byte group
// (no `=` padding lands mid-stream when concatenating per-chunk base64 output).
const B64_ENCODE_CHUNK = 0x8000 * 3;

/**
 * Convert a data URL, blob URL, or HTTP URL to an ArrayBuffer.
 * Works in both browser and Node.js environments.
 */
export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  // Handle blob URLs and HTTP(S) URLs via fetch
  if (
    dataUrl.startsWith("blob:") ||
    dataUrl.startsWith("http://") ||
    dataUrl.startsWith("https://")
  ) {
    const response = await fetch(dataUrl);
    return response.arrayBuffer();
  }

  // Data URL format: data:[<mediatype>][;base64],<data>
  const base64 = dataUrl.split(",")[1];

  // Prefer Buffer (Node.js) for base64 decoding, fall back to atob (browser)
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * Convert a Uint8Array to a base64 string.
 * Works in both browser and Node.js environments.
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  // Prefer Buffer (Node.js) for base64 encoding, fall back to btoa (browser)
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }

  // Browser: encode in bounded chunks. Concatenating per-chunk base64 is only safe when each
  // chunk (except the last) is a multiple of 3 bytes, so no `=` padding appears mid-stream.
  let base64 = "";
  for (let i = 0; i < data.length; i += B64_ENCODE_CHUNK) {
    const slice = data.subarray(i, i + B64_ENCODE_CHUNK); // view, no copy
    // apply on a bounded (<= B64_ENCODE_CHUNK) view keeps the argument count well under the limit
    const binary = String.fromCharCode.apply(null, slice as unknown as number[]);
    base64 += btoa(binary);
  }
  return base64;
}

/**
 * Convert a base64 string to a Uint8Array.
 * Works in both browser and Node.js environments.
 */
export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  // Prefer Buffer (Node.js) for base64 decoding, fall back to atob (browser)
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    // Copy into a standalone ArrayBuffer-backed Uint8Array so the result isn't a view over a
    // pooled Buffer (and isn't SharedArrayBuffer-backed).
    return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }

  // Browser: atob yields a binary string; write straight into a preallocated Uint8Array
  // (one pass, no intermediate array-of-bytes).
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
