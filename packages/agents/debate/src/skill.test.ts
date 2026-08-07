import { describe, it, expect } from "vitest";
import type { SkillConfig } from "@anuma/sdk";

import { debateRun } from "./skill";

describe("debateRun skill", () => {
  it("satisfies SkillConfig shape", () => {
    const typed: SkillConfig = debateRun;
    expect(typeof typed.id).toBe("string");
    expect(typeof typed.name).toBe("string");
    expect(typeof typed.promptTemplate).toBe("string");
    expect(typed.promptTemplate.length).toBeGreaterThan(0);
  });

  it('has id "debate.run"', () => {
    expect(debateRun.id).toBe("debate.run");
  });

  it("requires prompt, models, rounds (DESIGN §0.6)", () => {
    expect(debateRun.requiredVariables).toEqual(["prompt", "models", "rounds"]);
  });

  it("promptTemplate interpolates every required variable", () => {
    const template = debateRun.promptTemplate;
    for (const variable of debateRun.requiredVariables ?? []) {
      expect(template).toContain(`{{${variable}}}`);
    }
  });
});
