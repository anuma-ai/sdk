import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { chatTermTokens, createChatTermHasher, recordTerms } from "./chatTerms";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("chatTermTokens", () => {
  it("lowercases, folds compatibility forms and splits on anything but letters, marks and digits", () => {
    expect(chatTermTokens("Coffee, COFFEE! ｃｏｆｆｅｅ shop-2 don't snake_case")).toEqual([
      "coffee",
      "shop",
      "2",
      "don",
      "t",
      "snake",
      "case",
    ]);
  });

  it("makes each character of a script written without spaces its own token", () => {
    expect(chatTermTokens("東京で tea")).toEqual(["東", "京", "で", "tea"]);
    expect(chatTermTokens("ภาษาไทย")).toEqual(["ภ", "า", "ษ", "ไ", "ท", "ย"]);
  });

  it("keeps the marks of scripts that need them inside the word", () => {
    expect(chatTermTokens("नमस्ते दुनिया")).toEqual(["नमस्ते", "दुनिया"]);
    expect(chatTermTokens("Café")).toEqual(chatTermTokens("café"));
  });

  it("drops tokens longer than 64 characters", () => {
    expect(chatTermTokens(`${"a".repeat(65)} ok ${"b".repeat(64)}`)).toEqual([
      "ok",
      "b".repeat(64),
    ]);
  });
});

describe("chat term hashes", () => {
  it("is the first 16 hex characters of the domain-separated keyed hash, cached per token", async () => {
    const cipher = memoryCipher(await deriveMemoryKeyRing("0x" + "ab".repeat(65)));
    const hashTopic = vi.fn(cipher.hashTopic);
    const hash = createChatTermHasher(hashTopic);
    const first = await hash("coffee");
    expect(first).toBe((await cipher.hashTopic("chat-term\u0000coffee")).slice(0, 16));
    expect(first).not.toBe((await cipher.hashTopic("coffee")).slice(0, 16));
    expect(await hash("coffee")).toBe(first);
    expect(hashTopic).toHaveBeenCalledTimes(1);
  });

  it("refuses a digest that is not 64 lowercase hex characters", async () => {
    await expect(createChatTermHasher(async () => "ABC")("x")).rejects.toThrow(/64 lowercase hex/);
  });

  it("keeps a record within one term per 6 characters of its ciphertext", async () => {
    const hash = createChatTermHasher(sha256Hex);
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    expect(await recordTerms(hash, words, 60)).toHaveLength(10);
    expect(await recordTerms(hash, words, 6000)).toHaveLength(20);
    expect(await recordTerms(hash, "", 6000)).toEqual([]);
    expect(await recordTerms(hash, "a", 5)).toEqual([]);
  });
});
