const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4)), (c) =>
    c.charCodeAt(0)
  );
}

export async function sealInboxItem(
  recipientPublicKey: string,
  id: string,
  plaintext: unknown
): Promise<string> {
  const recipientRaw = fromBase64Url(recipientPublicKey);
  const recipient = await crypto.subtle.importKey(
    "raw",
    recipientRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const epk = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: recipient },
    ephemeral.privateKey,
    256
  );
  const salt = new Uint8Array([...epk, ...recipientRaw]);
  const ikm = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode("anuma-inbox-v1:" + id) },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(id) },
      key,
      encoder.encode(JSON.stringify(plaintext))
    )
  );
  return JSON.stringify({
    v: 1,
    alg: "ECDH-ES+HKDF-SHA256+A256GCM",
    epk: toBase64Url(epk),
    iv: toBase64Url(iv),
    ct: toBase64Url(ct),
  });
}
