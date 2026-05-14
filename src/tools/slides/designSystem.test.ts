import { describe, expect, it } from "vitest";

import {
  AGENDA,
  BRAND_STORY_SPLIT,
  EDITORIAL_WARM,
  compile,
  isFlexRegion,
  validateSlotContent,
  type LayoutComposition,
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

  it("validates flex-region item content against per-item budgets", () => {
    // AGENDA's `title` rel is single-line ≤ ~33 chars in techno-bold. A
    // long title should overflow; a short one should pass.
    const longTitle = "An extremely long agenda item title that won't fit at all";
    const slide = {
      children: [
        // Nested inside an Anuma.Group (item wrapper) inside the region's
        // outer group — the recursive walker should find the Text.
        {
          tag: "Group",
          attrs: { id: "agenda" },
          children: [
            {
              tag: "Group",
              attrs: { id: "agenda_1" },
              children: [
                {
                  tag: "Text",
                  attrs: { id: "agenda_1_title" },
                  children: [longTitle],
                },
              ],
            },
          ],
        },
      ],
    };
    const issues = validateSlotContent(AGENDA, EDITORIAL_WARM, fontPreset, slide);
    const overflow = issues.find((i) => i.id === "agenda_1_title");
    expect(overflow).toBeDefined();
    expect(overflow!.issue).toMatch(/single-line.*exceeds/);
  });

  it("accepts flex-region items that fit their per-instance budgets", () => {
    const slide = {
      children: [
        {
          tag: "Group",
          attrs: { id: "agenda" },
          children: [
            {
              tag: "Group",
              attrs: { id: "agenda_1" },
              children: [
                { tag: "Text", attrs: { id: "agenda_1_title" }, children: ["Kickoff"] },
                { tag: "Text", attrs: { id: "agenda_1_number" }, children: ["01"] },
              ],
            },
          ],
        },
      ],
    };
    const issues = validateSlotContent(AGENDA, EDITORIAL_WARM, fontPreset, slide);
    expect(issues.filter((i) => i.id.startsWith("agenda_"))).toEqual([]);
  });
});

describe("compile() with flex regions", () => {
  it("emits an Anuma.Group for the region with one Group per item", () => {
    const out = compile(AGENDA, EDITORIAL_WARM, fontPreset);
    // Outer region group: id="agenda" with layout="column"
    expect(out).toContain('<Anuma.Group id="agenda"');
    expect(out).toContain('layout="column"');
    // One inner Group per defaultItems entry (6 in AGENDA).
    const innerMatches = out.match(/<Anuma\.Group id="agenda_\d"/g);
    expect(innerMatches).toHaveLength(6);
    // Each inner Group uses row layout (itemLayout: "row").
    expect(out).toMatch(/<Anuma\.Group id="agenda_1"[^>]*layout="row"/);
  });

  it("interpolates 1-based item index into relative slot ids", () => {
    const out = compile(AGENDA, EDITORIAL_WARM, fontPreset);
    expect(out).toContain('id="agenda_1_title"');
    expect(out).toContain('id="agenda_1_number"');
    expect(out).toContain('id="agenda_6_duration"');
  });

  it("populates each item's slot text from the defaultItems entry", () => {
    const out = compile(AGENDA, EDITORIAL_WARM, fontPreset);
    // Item 1's defaults from the composition.
    expect(out).toContain(">01</Anuma.Text>");
    expect(out).toContain(">Action tracker from SC-03</Anuma.Text>");
    // Item 4's duration.
    expect(out).toContain(">6 MIN</Anuma.Text>");
  });

  it("isFlexRegion type guard discriminates correctly", () => {
    const agendaRegion = AGENDA.elements.find(isFlexRegion);
    expect(agendaRegion).toBeDefined();
    expect(agendaRegion!.idPrefix).toBe("agenda");
    // Cast to discard the rest of the union for the type assertion below.
    const _typed: LayoutComposition["elements"][number] = agendaRegion!;
    expect(_typed).toBeTruthy();
  });
});
