// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { isEncrypted } from "./index";

const HEX_56 = "0123456789abcdef".repeat(4).slice(0, 56);

describe("@anuma/sdk/expo exports isEncrypted", () => {
  it("is the encryption-utils implementation, not a re-implementation", async () => {
    const utils = await import("../lib/db/encryption-utils");
    expect(isEncrypted).toBe(utils.isEncrypted);
  });

  it("flags a still-sealed payload and passes plaintext", () => {
    expect(isEncrypted(`enc:v3:${HEX_56}`)).toBe(true);
    expect(isEncrypted("Works at Acme")).toBe(false);
  });
});
