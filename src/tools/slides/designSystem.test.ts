import { describe, expect, it } from "vitest";

import {
  BRAND_STORY_SPLIT,
  EDITORIAL_WARM,
  validateSlotContent,
} from "./designSystem";
import { FONT_PRESETS } from "./index";

const fontPreset = FONT_PRESETS.editorial ?? FONT_PRESETS.default!;

function slideWithHero3(text: string | Array<{ tag: string; attrs: Record<string, unknown>; children: unknown[] } | string>) {
  return {
    children: [
      {
        tag: "Text",
        attrs: { id: "hero_3" },
        children: typeof text === "string" ? [text] : text,
      },
    ],
  };
}

describe("validateSlotContent", () => {
  it("reports overflow when a single-line hero slot is exceeded", () => {
    // hero_3 in BRAND_STORY_SPLIT is fit: single-line. "100K+ subscribers."
    // exceeds the char budget at 57.6px italic in a ~422px-wide slot.
    const issues = validateSlotContent(
      BRAND_STORY_SPLIT,
      EDITORIAL_WARM,
      fontPreset,
      slideWithHero3("100K+ subscribers.")
    );
    const hero = issues.find((i) => i.id === "hero_3");
    expect(hero).toBeDefined();
    expect(hero!.issue).toMatch(/single-line.*exceeds/);
  });

  it("accepts content that fits inside the slot budget", () => {
    const issues = validateSlotContent(
      BRAND_STORY_SPLIT,
      EDITORIAL_WARM,
      fontPreset,
      slideWithHero3("in 5 years.")
    );
    expect(issues.find((i) => i.id === "hero_3")).toBeUndefined();
  });

  it("counts visible characters across inline Span children", () => {
    // Text + Anuma.Span joined: "in 5 years." = 11 chars, well under budget.
    const issues = validateSlotContent(
      BRAND_STORY_SPLIT,
      EDITORIAL_WARM,
      fontPreset,
      slideWithHero3([
        "in 5 ",
        { tag: "Span", attrs: {}, children: ["years."] },
      ])
    );
    expect(issues.find((i) => i.id === "hero_3")).toBeUndefined();
  });

  it("ignores slots the model didn't include (no false positive on omission)", () => {
    // Slide with no Text children — validation is a content check, not a
    // coverage check.
    const issues = validateSlotContent(BRAND_STORY_SPLIT, EDITORIAL_WARM, fontPreset, {
      children: [],
    });
    expect(issues).toEqual([]);
  });
});
