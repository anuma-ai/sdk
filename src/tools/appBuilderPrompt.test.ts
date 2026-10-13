import { describe, expect, it } from "vitest";

import { APP_BUILDER_PROMPT } from "./appBuilderPrompt";

describe("APP_BUILDER_PROMPT backend-sync", () => {
  it("opener stays in sync with backend infrastructure", () => {
    expect(APP_BUILDER_PROMPT).toContain("App Builder tools (create_file, patch_file,");
  });
});

describe("APP_BUILDER_PROMPT edit scope", () => {
  it("keeps title edits outside the design review workflow", () => {
    expect(APP_BUILDER_PROMPT).toContain("A title rename is a text edit, not a design change.");
    expect(APP_BUILDER_PROMPT).toContain("For text, logic, or data edits, skip both design tools.");
    expect(APP_BUILDER_PROMPT).toContain(
      "Change only the files and lines required by the current user request."
    );
  });

  it("does not expand the edit scope when runtime verification is unavailable", () => {
    expect(APP_BUILDER_PROMPT).toContain(
      "An unavailable runtime verifier does not authorize design changes."
    );
  });
});
