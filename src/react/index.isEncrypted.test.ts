// @vitest-environment happy-dom
/**
 * Barrel-surface pin for `isEncrypted` on `@anuma/sdk/react`.
 *
 * `decryptField` returns the original `enc:vN:<hex>` payload when the key for
 * that version is missing or diverged. A consumer that forwards vault text
 * off-device (the Nearby publish reconciler) must be able to detect that
 * state through the public entry point, or it re-implements the prefix check
 * and drifts from the SDK's own definition.
 */
import { describe, expect, it } from "vitest";

import { isEncrypted } from "./index";

const HEX_56 = "0123456789abcdef".repeat(4).slice(0, 56);

describe("@anuma/sdk/react exports isEncrypted", () => {
  it("is the encryption-utils implementation, not a re-implementation", async () => {
    const utils = await import("../lib/db/encryption-utils");
    expect(isEncrypted).toBe(utils.isEncrypted);
  });

  it("flags a still-sealed v3 and v2 payload", () => {
    expect(isEncrypted(`enc:v3:${HEX_56}`)).toBe(true);
    expect(isEncrypted(`enc:v2:${HEX_56}`)).toBe(true);
  });

  it("does not flag plaintext or a malformed prefix", () => {
    expect(isEncrypted("Works at Acme")).toBe(false);
    // Prefix without a full hex payload is not a sealed field.
    expect(isEncrypted("enc:v3:abc")).toBe(false);
    expect(isEncrypted(`enc:v1:${HEX_56}`)).toBe(false);
  });
});
