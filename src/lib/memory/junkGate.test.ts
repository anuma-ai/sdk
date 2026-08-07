import { describe, expect, it } from "vitest";

import { isJunkMemoryContent, MIN_CONTENT_LENGTH } from "./junkGate";

describe("isJunkMemoryContent", () => {
  it("exports MIN_CONTENT_LENGTH = 3", () => {
    expect(MIN_CONTENT_LENGTH).toBe(3);
  });

  describe("accepts durable facts", () => {
    it("accepts a legit one-word Latin fact", () => {
      expect(isJunkMemoryContent("Vegan")).toBe(false);
    });

    it("accepts a CJK fact with no spaces", () => {
      // "vegetarian" in Japanese/Chinese — has ideographs, above min length.
      expect(isJunkMemoryContent("菜食主義")).toBe(false);
    });

    it("accepts a 2-char CJK fact below the Latin length floor", () => {
      // "single" / "married" in Japanese — 2 kanji is a full word, so the CJK
      // floor of 2 (not the Latin floor of 3) must let it through.
      expect(isJunkMemoryContent("独身")).toBe(false);
      expect(isJunkMemoryContent("既婚")).toBe(false);
    });

    it("accepts a short-but-real fact at the length boundary", () => {
      // 3 chars, has letters → durable.
      expect(isJunkMemoryContent("cat")).toBe(false);
    });

    it("accepts a fact with numbers as long as it has letters", () => {
      expect(isJunkMemoryContent("Runs 5k daily")).toBe(false);
    });

    it("accepts a 4-digit year (letter-free but structured)", () => {
      expect(isJunkMemoryContent("2024")).toBe(false);
    });

    it("accepts a phone-number-like token (digits + punctuation, not pure digits)", () => {
      expect(isJunkMemoryContent("555-1234")).toBe(false);
    });

    it("accepts content with trailing punctuation as long as the stem is durable", () => {
      expect(isJunkMemoryContent("Vegan.")).toBe(false);
    });
  });

  describe("rejects junk", () => {
    it("rejects a bare single digit", () => {
      expect(isJunkMemoryContent("1")).toBe(true);
    });

    it("rejects another bare single digit", () => {
      expect(isJunkMemoryContent("2")).toBe(true);
    });

    it("rejects a multi-digit number (letter-free, catches list indices)", () => {
      expect(isJunkMemoryContent("42")).toBe(true);
    });

    it("rejects a punctuation-only string", () => {
      expect(isJunkMemoryContent("---")).toBe(true);
    });

    it("rejects whitespace + trailing dots that normalize to empty", () => {
      expect(isJunkMemoryContent("  ..")).toBe(true);
    });

    it("rejects the empty string", () => {
      expect(isJunkMemoryContent("")).toBe(true);
    });

    it("rejects a too-short letter fragment below MIN_CONTENT_LENGTH", () => {
      expect(isJunkMemoryContent("hi")).toBe(true);
    });
  });
});
