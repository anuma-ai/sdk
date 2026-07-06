import { describe, expect, it } from "vitest";

import { resolveStoredUserContent } from "./types";

// Pins the storedUserContent override contract: the value returned here is what
// gets persisted to the DB row, embedded for storage, and embedded for
// tool selection — so injected wire context (recalled memory, precise time)
// must stay out of it when the caller passes the user's typed text, while the
// wire `messages` (untouched here) keep that context.
describe("resolveStoredUserContent", () => {
  const extracted = "what the user actually typed";

  it("uses storedUserContent when provided (override wins over extracted)", () => {
    expect(resolveStoredUserContent("typed only", extracted)).toBe("typed only");
  });

  it("falls back to the extracted text when storedUserContent is undefined", () => {
    expect(resolveStoredUserContent(undefined, extracted)).toBe(extracted);
  });

  it("treats an empty string as a real override, NOT a fallback request", () => {
    // `??` (not `||`) — an empty typed turn must persist empty, not resurrect
    // the extracted (possibly context-laden) wire text.
    expect(resolveStoredUserContent("", extracted)).toBe("");
  });

  it("does not strip/alter the override text (e.g. injected labels are the caller's job to exclude)", () => {
    const withLabels = "Relevant memories: …\nCurrent time (precise): …\nhi";
    expect(resolveStoredUserContent(withLabels, extracted)).toBe(withLabels);
  });
});
