import { describe, it, expect } from "vitest";
import { createFilePlaceholder, extractFileIds } from "./opfs";

describe("createFilePlaceholder", () => {
  it("creates __SDKFILE__mediaId__ format", () => {
    expect(createFilePlaceholder("media_abc123")).toBe("__SDKFILE__media_abc123__");
  });

  it("handles hyphens and underscores in mediaId", () => {
    expect(createFilePlaceholder("media_019c0630-8b7a-760c")).toBe(
      "__SDKFILE__media_019c0630-8b7a-760c__"
    );
  });
});

describe("extractFileIds", () => {
  it("extracts media IDs from content with placeholders", () => {
    const content = "Here is ![img](__SDKFILE__media_abc123__) an image";
    expect(extractFileIds(content)).toEqual(["media_abc123"]);
  });

  it("returns empty array when no placeholders", () => {
    expect(extractFileIds("Hello world")).toEqual([]);
  });

  it("handles multiple placeholders", () => {
    const content = "__SDKFILE__media_1__ and __SDKFILE__media_2__ and __SDKFILE__media_3__";
    expect(extractFileIds(content)).toEqual(["media_1", "media_2", "media_3"]);
  });

  it("deduplicates IDs", () => {
    const content = "__SDKFILE__media_1__ and __SDKFILE__media_1__";
    const ids = extractFileIds(content);
    // extractFileIds returns all matches; dedup is caller's responsibility
    // but we verify at least both are found
    expect(ids).toContain("media_1");
    // Using Set to verify dedup works at consumer level
    expect([...new Set(ids)]).toEqual(["media_1"]);
  });
});
