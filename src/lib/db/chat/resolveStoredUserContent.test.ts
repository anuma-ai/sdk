import { describe, expect, it } from "vitest";

import { resolveStoredUserContent } from "./types";

describe("resolveStoredUserContent", () => {
  const extracted = "what the user actually typed";

  it("uses storedUserContent when provided (override wins over extracted)", () => {
    expect(resolveStoredUserContent("typed only", extracted)).toBe("typed only");
  });

  it("falls back to the extracted text when storedUserContent is undefined", () => {
    expect(resolveStoredUserContent(undefined, extracted)).toBe(extracted);
  });

  it("treats an empty string as a real override, NOT a fallback request", () => {
    expect(resolveStoredUserContent("", extracted)).toBe("");
  });

  it("does not strip/alter the override text (e.g. injected labels are the caller's job to exclude)", () => {
    const withLabels = "Relevant memories: …\nCurrent time (precise): …\nhi";
    expect(resolveStoredUserContent(withLabels, extracted)).toBe(withLabels);
  });
});
