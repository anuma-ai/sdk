const B64_ENCODE_CHUNK = 0x8000 * 3;

/**
 * Convert a data URL, blob URL, or HTTP URL to an ArrayBuffer.
 * Works in both browser and Node.js environments.
 */
export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
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
