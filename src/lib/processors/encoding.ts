const B64_ENCODE_CHUNK = 0x8000 * 3;

export function assertFileUrlAllowed(dataUrl: string): void {
  const isNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  if (isNode && !dataUrl.startsWith("data:") && !dataUrl.startsWith("blob:")) {
    throw new Error("Server file preprocessing requires a data URL or blob URL.");
  }
}

/** Convert a data URL or blob URL to an ArrayBuffer, or an HTTP URL in a browser. */
export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  assertFileUrlAllowed(dataUrl);

  if (
    dataUrl.startsWith("blob:") ||
    dataUrl.startsWith("http://") ||
    dataUrl.startsWith("https://")
  ) {
    const response = await fetch(dataUrl);
    return response.arrayBuffer();
  }

  const base64 = dataUrl.split(",")[1];

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
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }

  let base64 = "";
  for (let i = 0; i < data.length; i += B64_ENCODE_CHUNK) {
    const slice = data.subarray(i, i + B64_ENCODE_CHUNK);
    let binary = "";
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
    base64 += btoa(binary);
  }
  return base64;
}

/**
 * Convert a base64 string to a Uint8Array.
 * Works in both browser and Node.js environments.
 */
export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
