import { describe, expect, it } from "vitest";

import {
  AGENDA,
  ALL_COMPOSITIONS,
  BRAND_STORY_SPLIT,
  CORPORATE_MODERN,
  COVER_STATEMENT,
  EDITORIAL_WARM,
  MARKETING_GRID,
  MINIMAL_SWISS,
  STAT_ROW_BOTTOM,
  applyAccent,
  compile,
  estimateSlotBudget,
  isFlexRegion,
  renderCompositionLayoutRecipe,
  renderDesignSystemCatalog,
  validateSlotContent,
  type CompositionElement,
  type LayoutComposition,
  type RoleStyle,
} from "./designSystem";
import { FONT_PRESETS } from "./index";

const fontPreset = FONT_PRESETS.editorial ?? FONT_PRESETS.default!;

function slideWithHero3(
  text:
    | string
    | Array<{ tag: string; attrs: Record<string, unknown>; children: unknown[] } | string>
) {
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
    const issues = validateSlotContent(
      BRAND_STORY_SPLIT,
      EDITORIAL_WARM,
      fontPreset,
      slideWithHero3(["in 5 ", { tag: "Span", attrs: {}, children: ["years."] }])
    );
    expect(issues.find((i) => i.id === "hero_3")).toBeUndefined();
  });

  it("ignores slots the model didn't include (no false positive on omission)", () => {
    const issues = validateSlotContent(BRAND_STORY_SPLIT, EDITORIAL_WARM, fontPreset, {
      children: [],
    });
    expect(issues).toEqual([]);
  });

  it("validates flex-region item content against per-item budgets", () => {
    const longTitle = "An extremely long agenda item title that won't fit at all";
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

  it("validates items beyond defaultItems.length and applies the shrunk per-item budget", () => {
    const wide = "$149,999,999";
    const items = Array.from({ length: 8 }, (_, i) => ({
      tag: "Group" as const,
      attrs: { id: `audience_${i + 1}` },
      children: [
        {
          tag: "Text" as const,
          attrs: { id: `audience_${i + 1}_value` },
          children: [wide],
        },
        {
          tag: "Text" as const,
          attrs: { id: `audience_${i + 1}_label` },
          children: ["LABEL"],
        },
      ],
    }));
    const slide = {
      children: [{ tag: "Group", attrs: { id: "audience" }, children: items }],
    };
    const issues = validateSlotContent(STAT_ROW_BOTTOM, EDITORIAL_WARM, fontPreset, slide);
    const overflowingLateItem = issues.find((i) => i.id === "audience_7_value");
    expect(overflowingLateItem, "items beyond defaultItems.length must be checked").toBeDefined();
    expect(overflowingLateItem!.issue).toMatch(/single-line.*exceeds/);
  });

  it("budgets flex items by COUNT of distinct indices, not max(index) — handles sparse fills", () => {
    const sparseValue = "10char_str";
    const slide = {
      children: [
        {
          tag: "Group",
          attrs: { id: "audience" },
          children: [1, 3, 5].map((i) => ({
            tag: "Group" as const,
            attrs: { id: `audience_${i}` },
            children: [
              {
                tag: "Text" as const,
                attrs: { id: `audience_${i}_value` },
                children: [sparseValue],
              },
              {
                tag: "Text" as const,
                attrs: { id: `audience_${i}_label` },
                children: ["LABEL"],
              },
            ],
          })),
        },
      ],
    };
    const issues = validateSlotContent(STAT_ROW_BOTTOM, EDITORIAL_WARM, fontPreset, slide);
    const valueOverflows = issues.filter((i) => i.id.endsWith("_value") && i.fit === "single-line");
    expect(valueOverflows).toEqual([]);
  });

  it("widens the budget for a trailing partial row in grid mode (cols=2, N=3)", () => {
    const trailingTitle = "Sixty-five characters here yes including this little extra bit.";
    expect(trailingTitle.length).toBe(63);
    const slide = {
      children: [
        {
          tag: "Group",
          attrs: { id: "cards" },
          children: [1, 2, 3].map((i) => ({
            tag: "Group" as const,
            attrs: { id: `cards_${i}` },
            children: [
              {
                tag: "Text" as const,
                attrs: { id: `cards_${i}_eyebrow` },
                children: [`0${i}`],
              },
              {
                tag: "Text" as const,
                attrs: { id: `cards_${i}_title` },
                children: [trailingTitle],
              },
            ],
          })),
        },
      ],
    };
    const issues = validateSlotContent(MARKETING_GRID, EDITORIAL_WARM, fontPreset, slide);
    const card3TitleOverflow = issues.find((i) => i.id === "cards_3_title");
    expect(
      card3TitleOverflow,
      "card_3 in trailing partial row should not overflow at full-row width"
    ).toBeUndefined();
  });
});

describe("compile() with flex regions", () => {
  it("emits an Anuma.Group for the region with one Group per item", () => {
    const out = compile(AGENDA, EDITORIAL_WARM, fontPreset);
    expect(out).toContain('<Anuma.Group id="agenda"');
    expect(out).toContain('layout="column"');
    const innerMatches = out.match(/<Anuma\.Group id="agenda_\d"/g);
    expect(innerMatches).toHaveLength(6);
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
    expect(out).toContain(">01</Anuma.Text>");
    expect(out).toContain(">Action tracker from SC-03</Anuma.Text>");
    expect(out).toContain(">6 MIN</Anuma.Text>");
  });

  it("isFlexRegion type guard discriminates correctly", () => {
    const agendaRegion = AGENDA.elements.find(isFlexRegion);
    expect(agendaRegion).toBeDefined();
    expect(agendaRegion!.idPrefix).toBe("agenda");
    const _typed: LayoutComposition["elements"][number] = agendaRegion!;
    expect(_typed).toBeTruthy();
  });

  it("auto-applies grow={1} to item-groups in a row-layout region", () => {
    const out = compile(STAT_ROW_BOTTOM, EDITORIAL_WARM, fontPreset);
    const itemGroups = out.match(/<Anuma\.Group id="audience_\d"[^>]*>/g) ?? [];
    expect(itemGroups.length).toBe(4);
    for (const g of itemGroups) {
      expect(g).toContain("grow={1}");
    }
    const outer = out.match(/<Anuma\.Group id="audience"[^>]*>/)![0];
    expect(outer).not.toContain("grow={1}");
  });

  it("does NOT add grow on item-groups in a column-layout region", () => {
    const out = compile(AGENDA, EDITORIAL_WARM, fontPreset);
    const firstItem = out.match(/<Anuma\.Group id="agenda_1"[^>]*>/)![0];
    expect(firstItem).not.toContain("grow={1}");
  });

  it("emits a grid region as a column-of-rows with `columns` items per row", () => {
    const out = compile(MARKETING_GRID, EDITORIAL_WARM, fontPreset);
    const outerCards = out.match(/<Anuma\.Group id="cards"[^>]*>/)![0];
    expect(outerCards).toContain('layout="column"');
    const itemGroups = out.match(/<Anuma\.Group id="cards_\d+"/g) ?? [];
    expect(itemGroups.length).toBe(4);
    const card1 = out.match(/<Anuma\.Group id="cards_1"[^>]*>/)![0];
    expect(card1).toContain('layout="column"');
    expect(card1).toContain("grow={1}");
    expect(card1).toContain("cornerRadius={0.3}");
    expect(card1).toMatch(/fill="(#[0-9A-Fa-f]{6}|[a-zA-Z]+)"/);
  });

  it("applies per-item surface state from defaultItems.surface", () => {
    const out = compile(MARKETING_GRID, EDITORIAL_WARM, fontPreset);
    const fills = (out.match(/id="cards_\d+"[^>]*fill="([^"]+)"/g) ?? []).map((m) =>
      m.match(/fill="([^"]+)"/)![1]!.toLowerCase()
    );
    expect(fills).toHaveLength(4);
    expect(fills[0]).toBe(fills[1]);
    expect(fills[2]).not.toBe(fills[0]);
    expect(fills[3]).not.toBe(fills[0]);
    expect(fills[3]).not.toBe(fills[2]);
  });

  it("every flex-region idPrefix is distinct across compositions (no cross-composition collisions)", () => {
    const allPrefixes: string[] = [];
    for (const composition of ALL_COMPOSITIONS) {
      for (const child of composition.elements) {
        if (isFlexRegion(child)) allPrefixes.push(child.idPrefix);
      }
    }
    expect(new Set(allPrefixes).size, `duplicate idPrefix: ${allPrefixes.join(", ")}`).toBe(
      allPrefixes.length
    );
  });

  it("does NOT emit grid row-groups when `columns` is unset", () => {
    const out = compile(STAT_ROW_BOTTOM, EDITORIAL_WARM, fontPreset);
    const outer = out.match(/<Anuma\.Group id="audience"[^>]*>/)![0];
    expect(outer).toContain('layout="row"');
  });

  it("estimateSlotBudget tightens charsPerLine for uppercase + letterSpacing styles", () => {
    const baseEl: CompositionElement = {
      id: "test",
      role: "stat-label",
      x: 0,
      y: 0,
      w: 30,
      h: 5,
      fit: "single-line",
    };
    const plainStyle: RoleStyle = {
      fontFamily: "Inter",
      fontSize: 1.5,
      color: "#000",
    };
    const upperStyle: RoleStyle = { ...plainStyle, textTransform: "uppercase" };
    const spacedStyle: RoleStyle = { ...plainStyle, letterSpacing: 0.16 };
    const upperSpacedStyle: RoleStyle = {
      ...plainStyle,
      textTransform: "uppercase",
      letterSpacing: 0.16,
    };
    const plain = estimateSlotBudget(baseEl, plainStyle, fontPreset);
    const upper = estimateSlotBudget(baseEl, upperStyle, fontPreset);
    const spaced = estimateSlotBudget(baseEl, spacedStyle, fontPreset);
    const both = estimateSlotBudget(baseEl, upperSpacedStyle, fontPreset);
    expect(upper.charsPerLine).toBeLessThan(plain.charsPerLine);
    expect(spaced.charsPerLine).toBeLessThan(plain.charsPerLine);
    expect(both.charsPerLine).toBeLessThan(upper.charsPerLine);
    expect(both.charsPerLine).toBeLessThan(spaced.charsPerLine);
  });
});

describe("applyAccent", () => {
  it("swaps the base accent across all role styles", () => {
    expect(MINIMAL_SWISS.accent?.base).toBe("#DC2626");
    const themed = applyAccent(MINIMAL_SWISS, {
      base: "#16A34A",
      onDark: "#4ADE80",
    });
    expect(themed.styles.eyebrow.color).toBe("#16A34A");
    expect(themed.styles["hero-accent"].color).toBe("#16A34A");
    expect(themed.styles.marker.color).toBe("#16A34A");
    expect(themed.styles["accent-bar"].color).toBe("#16A34A");
    expect(themed.styles.hero.color).toBe(MINIMAL_SWISS.styles.hero.color);
    expect(themed.styles.body.color).toBe(MINIMAL_SWISS.styles.body.color);
  });

  it("swaps the dark-surface accent variant on dark overrides", () => {
    const themed = applyAccent(MINIMAL_SWISS, {
      base: "#16A34A",
      onDark: "#4ADE80",
    });
    expect(themed.surfaces?.dark?.overrides["hero-accent"]?.color).toBe("#4ADE80");
    expect(themed.surfaces?.dark?.overrides.eyebrow?.color).toBe("#4ADE80");
  });

  it("swaps the accent-surface background when it matches the base accent", () => {
    expect(MINIMAL_SWISS.surfaces?.accent?.background).toBe("#DC2626");
    const themed = applyAccent(MINIMAL_SWISS, {
      base: "#16A34A",
      onDark: "#4ADE80",
    });
    expect(themed.surfaces?.accent?.background).toBe("#16A34A");
  });

  it("returns the input unchanged for palette-driven systems (no accent slot)", () => {
    expect(EDITORIAL_WARM.accent).toBeUndefined();
    const themed = applyAccent(EDITORIAL_WARM, {
      base: "#16A34A",
      onDark: "#4ADE80",
    });
    expect(themed).toBe(EDITORIAL_WARM);
  });

  it("does not mutate the input system", () => {
    const before = MINIMAL_SWISS.styles.eyebrow.color;
    applyAccent(MINIMAL_SWISS, { base: "#16A34A", onDark: "#4ADE80" });
    expect(MINIMAL_SWISS.styles.eyebrow.color).toBe(before);
  });

  it("records the new accent pair on the returned system", () => {
    const themed = applyAccent(MINIMAL_SWISS, {
      base: "#16A34A",
      onDark: "#4ADE80",
    });
    expect(themed.accent).toEqual({ base: "#16A34A", onDark: "#4ADE80" });
  });

  it("auto-derives onDark via HSL lightening when caller passes only base", () => {
    const themed = applyAccent(MINIMAL_SWISS, { base: "#16A34A" });
    expect(themed.accent?.base).toBe("#16A34A");
    const derived = themed.accent!.onDark;
    expect(derived).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(derived.toLowerCase()).not.toBe("#16a34a");
    const meanOf = (h: string) => {
      const n = parseInt(h.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    expect(meanOf(derived)).toBeGreaterThan(meanOf("#16A34A"));
    expect(themed.surfaces?.dark?.overrides["hero-accent"]?.color).toBe(derived);
  });
});

describe("renderCompositionLayoutRecipe image-note conditionality", () => {
  it("advertises anuma_create_image when hasImageGenerator=true", () => {
    const recipe = renderCompositionLayoutRecipe(
      "cover-split-portrait--editorial-warm",
      { heading: "Playfair Display", body: "Source Sans 3" },
      undefined,
      true
    );
    expect(recipe).toBeTruthy();
    expect(recipe).toContain("AnumaMediaMCP-anuma_create_image");
  });

  it("omits the anuma_create_image reference when hasImageGenerator is false or unset", () => {
    const recipe = renderCompositionLayoutRecipe("cover-split-portrait--editorial-warm", {
      heading: "Playfair Display",
      body: "Source Sans 3",
    });
    expect(recipe).toBeTruthy();
    expect(recipe).not.toContain("AnumaMediaMCP-anuma_create_image");
    expect(recipe).toContain("attached:N");
    expect(recipe).toContain("remove the <Anuma.Image> element");
  });

  it("emits no image note at all for compositions without an image slot", () => {
    const recipe = renderCompositionLayoutRecipe("cover-statement--editorial-warm", {
      heading: "Playfair Display",
      body: "Source Sans 3",
    });
    expect(recipe).toBeTruthy();
    expect(recipe).not.toContain("Image slots:");
  });
});

describe("renderDesignSystemCatalog", () => {
  it("appends composition hints in [brackets] when the system declares them", () => {
    const out = renderDesignSystemCatalog();
    const technoLine = out.split("\n").find((l) => l.startsWith("- techno-bold —"))!;
    expect(technoLine).toMatch(/\[.*prefers asymmetric layouts.*prefers dark-surface variants.*\]/);
  });

  it("omits the brackets for systems that declare no composition hints", () => {
    const out = renderDesignSystemCatalog();
    const swissLine = out.split("\n").find((l) => l.startsWith("- minimal-swiss —"))!;
    expect(swissLine).not.toMatch(/\[/);
  });
});
