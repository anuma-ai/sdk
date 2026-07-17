import { describe, expect, it } from "vitest";

import { APP_BUILDER_PROMPT } from "./appBuilderPrompt";

describe("APP_BUILDER_PROMPT freeloader fingerprint", () => {
  // ⚠ freeloader fingerprint must stay in sync with ai-portal detection/markers.go
  // (FingerprintAppBuilder). The backend freeloader detector treats a request as a
  // genuine app-builder flow ONLY if its system prompt contains this exact substring.
  // If you change the prompt's opening, update internal/detection/markers.go in the
  // SAME PR or real app-builder traffic gets misflagged as programmatic abuse.
  it("freeloader fingerprint must stay in sync with ai-portal detection/markers.go", () => {
    expect(APP_BUILDER_PROMPT).toContain("App Builder tools (create_file, patch_file,");
  });
});
