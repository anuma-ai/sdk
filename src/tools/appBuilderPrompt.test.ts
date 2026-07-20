import { describe, expect, it } from "vitest";

import { APP_BUILDER_PROMPT } from "./appBuilderPrompt";

describe("APP_BUILDER_PROMPT backend-sync", () => {
  // ⚠ This exact opener is relied on by backend infrastructure; keep it in sync —
  // see internal docs. This test fails if it drifts.
  it("opener stays in sync with backend infrastructure", () => {
    expect(APP_BUILDER_PROMPT).toContain("App Builder tools (create_file, patch_file,");
  });
});
