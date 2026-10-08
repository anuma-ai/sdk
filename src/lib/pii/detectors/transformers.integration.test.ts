import { describe, expect, it } from "vitest";

import { PiiRedactor } from "../redactor";
import { createTransformersNerDetector } from "./transformers";

describe.skipIf(!process.env.RUN_NER_E2E)("Transformers NER detector (real model)", () => {
  it("detects names, locations, and organizations and round-trips through the redactor", async () => {
    const redactor = new PiiRedactor({ nerDetector: createTransformersNerDetector() });
    const input =
      "Hi, I'm Sarah Chen. Reach me at sarah@example.com. I moved to Seattle to work at Boeing.";

    const { text, matches } = await redactor.redactTextAsync(input);

    const categories = new Set(matches.map((m) => m.category));
    expect(categories.has("PERSON")).toBe(true);
    expect(categories.has("LOCATION")).toBe(true);
    expect(categories.has("ORG")).toBe(true);
    expect(categories.has("EMAIL")).toBe(true);

    expect(text).not.toContain("Sarah Chen");
    expect(text).not.toContain("Seattle");
    expect(text).not.toContain("Boeing");
    expect(redactor.deAnonymize(text)).toBe(input);
  }, 120_000);
});
