/**
 * Universal encoding utilities that work in both browser and Node.js environments.
 *
 * - `dataUrlToArrayBuffer`: Decodes data URLs, blob URLs, and HTTP URLs to ArrayBuffer
 * - `uint8ArrayToBase64`: Encodes binary data to base64 string
 *
 * These avoid direct use of `atob`/`btoa` (unavailable in older Node.js versions)
 * by preferring `Buffer` when available, with browser globals as fallback.
 */

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

  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}
