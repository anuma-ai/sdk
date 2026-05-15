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
  isFlexRegion,
  renderCompositionLayoutRecipe,
  renderDesignSystemCatalog,
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

  it("validates items beyond defaultItems.length and applies the shrunk per-item budget", () => {
    // STAT_ROW_BOTTOM defaults to 4 audience stats — each gets ~11% of
    // the 44% region width, ~95px after canvas scaling. If the model
    // emits 8 items, the per-item budget halves; an "$149" value that
    // fits at 4 items wouldn't necessarily fit at 8. The old validator
    // iterated only 1..defaultItems.length, so items 5–8 escaped budget
    // enforcement entirely. This test pins the discovered-count path.
    const wide = "$149,999,999"; // 12 visible chars — fits 4-item single-line budget (~14), overflows the 8-item budget (~7).
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
      children: [
        { tag: "Group", attrs: { id: "audience" }, children: items },
      ],
    };
    const issues = validateSlotContent(STAT_ROW_BOTTOM, EDITORIAL_WARM, fontPreset, slide);
    // The new validator must report overflow on items beyond index 4
    // (5..8) — the old behavior silently passed them.
    const overflowingLateItem = issues.find((i) => i.id === "audience_7_value");
    expect(overflowingLateItem, "items beyond defaultItems.length must be checked").toBeDefined();
    expect(overflowingLateItem!.issue).toMatch(/single-line.*exceeds/);
  });

  it("budgets flex items by COUNT of distinct indices, not max(index) — handles sparse fills", () => {
    // CSS flex distributes N children across the region regardless of
    // what numeric idx the model wrote on them. A model emitting items
    // 1, 3, 5 (skipping 2 and 4) ships 3 children to the flex container,
    // each getting region.w/3 — NOT region.w/5. The validator must
    // budget against count(distinct indices), not max(index). A future
    // refactor that switches to max() would double the budget for the
    // sparse case and silently regress.
    const sparseValue = "10char_str"; // 10 chars
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
    // 3 items in a 44%-wide region → ~14% per item → comfortably fits 10 chars.
    // Max-index budgeting would treat this as 5 items → ~8.8% → 10 chars would
    // overflow. Assert no overflow at the value slots to pin count-based logic.
    const valueOverflows = issues.filter(
      (i) => i.id.endsWith("_value") && i.fit === "single-line"
    );
    expect(valueOverflows).toEqual([]);
  });

  it("widens the budget for a trailing partial row in grid mode (cols=2, N=3)", () => {
    // MARKETING_GRID is cols=2. With 3 items, the 3rd lives alone in
    // the trailing row and the emitter gives it full row width via
    // flex grow={1}. The validator must budget that 3rd card's title
    // against full row width, NOT region.w/cols=2 — otherwise content
    // that fits the actual rendered width gets false-positive overflow
    // reports.
    // A 65-char title fits a full-row card (~88% wide) but not a
    // half-row card (~44% wide). Three items with this title at idx 3
    // (in the trailing partial row) must NOT overflow.
    const trailingTitle =
      "Sixty-five characters here yes including this little extra bit.";
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
    // Card 3 (in the trailing partial row) gets the wider budget —
    // it MUST pass even though card 1 and card 2 (in a 2-card row)
    // would over-budget it.
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

  it("auto-applies grow={1} to item-groups in a row-layout region", () => {
    // Row-layout items have no intrinsic width — without grow they collapse
    // to content and clump at the start. STAT_ROW_BOTTOM's bottom stat row
    // (idPrefix="audience", namespaced to avoid cross-composition dedupe
    // collisions) relies on this so 3, 4, or 5 stats all distribute the
    // region width.
    const out = compile(STAT_ROW_BOTTOM, EDITORIAL_WARM, fontPreset);
    // Every audience_<n> item-group carries grow={1}.
    const itemGroups = out.match(/<Anuma\.Group id="audience_\d"[^>]*>/g) ?? [];
    expect(itemGroups.length).toBe(4);
    for (const g of itemGroups) {
      expect(g).toContain("grow={1}");
    }
    // The outer region group itself must NOT carry grow={1} — it owns a
    // fixed x/y/w/h frame on the slide canvas.
    const outer = out.match(/<Anuma\.Group id="audience"[^>]*>/)![0];
    expect(outer).not.toContain("grow={1}");
  });

  it("does NOT add grow on item-groups in a column-layout region", () => {
    // AGENDA is column-layout; row-distribution doesn't apply. Item-groups
    // are stretched horizontally by the parent's align="stretch" instead.
    const out = compile(AGENDA, EDITORIAL_WARM, fontPreset);
    const firstItem = out.match(/<Anuma\.Group id="agenda_1"[^>]*>/)![0];
    expect(firstItem).not.toContain("grow={1}");
  });

  it("emits a grid region as a column-of-rows with `columns` items per row", () => {
    // MARKETING_GRID is a 2-column grid; 4 default items should produce 2
    // row sub-groups, each holding 2 item-groups. The outer cards Group is
    // layout="column" (overrides region.layout which we still set), and
    // each row Group is layout="row" with grow={1} to fill the outer height.
    const out = compile(MARKETING_GRID, EDITORIAL_WARM, fontPreset);
    const outerCards = out.match(/<Anuma\.Group id="cards"[^>]*>/)![0];
    expect(outerCards).toContain('layout="column"');
    const itemGroups = out.match(/<Anuma\.Group id="cards_\d+"/g) ?? [];
    expect(itemGroups.length).toBe(4);
    // Each card item is layout="column" (itemLayout) with grow={1} (parent
    // row distributes width) AND carries its own fill + cornerRadius from
    // cardItems=true. The fill can be a theme token (e.g. "slideBg" for
    // palette-driven systems like editorial-warm) OR a hex (techno-bold).
    const card1 = out.match(/<Anuma\.Group id="cards_1"[^>]*>/)![0];
    expect(card1).toContain('layout="column"');
    expect(card1).toContain("grow={1}");
    expect(card1).toContain("cornerRadius={0.3}");
    expect(card1).toMatch(/fill="(#[0-9A-Fa-f]{6}|[a-zA-Z]+)"/);
  });

  it("applies per-item surface state from defaultItems.surface", () => {
    // MARKETING_GRID's 4 cards declare surfaces: default, default, dark,
    // accent. The item-group's fill should reflect each surface — cards 1+2
    // share the default fill; card 3 uses the dark surface bg; card 4 uses
    // the accent surface bg. Distinct fills prove the per-item surface flow
    // is wired through to the emitter.
    const out = compile(MARKETING_GRID, EDITORIAL_WARM, fontPreset);
    const fills = (out.match(/id="cards_\d+"[^>]*fill="([^"]+)"/g) ?? []).map(
      (m) => m.match(/fill="([^"]+)"/)![1]!.toLowerCase()
    );
    expect(fills).toHaveLength(4);
    expect(fills[0]).toBe(fills[1]); // both "default"
    expect(fills[2]).not.toBe(fills[0]); // dark != default
    expect(fills[3]).not.toBe(fills[0]); // accent != default
    expect(fills[3]).not.toBe(fills[2]); // accent != dark
  });

  it("every flex-region idPrefix is distinct across compositions (no cross-composition collisions)", () => {
    // Compositions historically shared idPrefix="stats" — the collision
    // caused dedupeIds to rewrite every slot id (stats_1_value →
    // stats_1_value-2) when two such compositions appeared in the same
    // deck, breaking the `<prefix>_<idx>_<rel>` discoverability pattern.
    // The fix: distinct per-composition prefixes. This walks ALL_COMPOSITIONS
    // and asserts every flex region's idPrefix is globally unique so a
    // future "just reuse a prefix" regression breaks loudly.
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
    // STAT_ROW_BOTTOM is 1-D row layout (no columns). The outer audience
    // Group should be layout="row" itself, not a column of row sub-groups.
    const out = compile(STAT_ROW_BOTTOM, EDITORIAL_WARM, fontPreset);
    const outer = out.match(/<Anuma\.Group id="audience"[^>]*>/)![0];
    expect(outer).toContain('layout="row"');
  });
});

describe("applyAccent", () => {
  it("swaps the base accent across all role styles", () => {
    // Swiss's base accent is #DC2626; eyebrow, hero-accent, marker, etc.
    // all use it.
    expect(MINIMAL_SWISS.accent?.base).toBe("#DC2626");
    const themed = applyAccent(MINIMAL_SWISS, {
      base: "#16A34A",
      onDark: "#4ADE80",
    });
    expect(themed.styles.eyebrow.color).toBe("#16A34A");
    expect(themed.styles["hero-accent"].color).toBe("#16A34A");
    expect(themed.styles.marker.color).toBe("#16A34A");
    expect(themed.styles["accent-bar"].color).toBe("#16A34A");
    // Non-accent roles are untouched.
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
    // Swiss's accent surface bg IS its accent color #DC2626 — swap to
    // green and the bg becomes green.
    expect(MINIMAL_SWISS.surfaces?.accent?.background).toBe("#DC2626");
    const themed = applyAccent(MINIMAL_SWISS, {
      base: "#16A34A",
      onDark: "#4ADE80",
    });
    expect(themed.surfaces?.accent?.background).toBe("#16A34A");
  });

  it("returns the input unchanged for palette-driven systems (no accent slot)", () => {
    // EDITORIAL_WARM is palette-driven (colors resolve from deck tokens),
    // not literal-hex like the colored systems, so applyAccent has
    // nothing to swap and returns the input unchanged.
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
    // Typical LLM call: one hex, let us pick the dark-surface variant.
    const themed = applyAccent(MINIMAL_SWISS, { base: "#16A34A" });
    expect(themed.accent?.base).toBe("#16A34A");
    // The derived onDark should differ from base, be a valid hex, and
    // land on a lighter color (higher mean channel value).
    const derived = themed.accent!.onDark;
    expect(derived).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(derived.toLowerCase()).not.toBe("#16a34a");
    const meanOf = (h: string) => {
      const n = parseInt(h.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    expect(meanOf(derived)).toBeGreaterThan(meanOf("#16A34A"));
    // The derived value is also applied on the dark surface override.
    expect(themed.surfaces?.dark?.overrides["hero-accent"]?.color).toBe(derived);
  });
});

describe("renderCompositionLayoutRecipe image-note conditionality", () => {
  // The recipe note for image-bearing compositions has historically
  // advertised AnumaImageMCP-generate_cloud_image unconditionally, even
  // when the host hasn't bound that MCP to the loop. The model then
  // hallucinates calls to a tool that doesn't exist. The
  // `hasImageGenerator` flag adapts the recipe text accordingly.
  it("advertises AnumaImageMCP when hasImageGenerator=true", () => {
    const recipe = renderCompositionLayoutRecipe(
      "cover-split-portrait--editorial-warm",
      { heading: "Playfair Display", body: "Source Sans 3" },
      undefined,
      true
    );
    expect(recipe).toBeTruthy();
    expect(recipe).toContain("AnumaImageMCP-generate_cloud_image");
  });

  it("omits the AnumaImageMCP reference when hasImageGenerator is false or unset", () => {
    const recipe = renderCompositionLayoutRecipe(
      "cover-split-portrait--editorial-warm",
      { heading: "Playfair Display", body: "Source Sans 3" }
    );
    expect(recipe).toBeTruthy();
    expect(recipe).not.toContain("AnumaImageMCP");
    // Still tells the model how to handle an unfilled image slot.
    expect(recipe).toContain("attached:N");
    expect(recipe).toContain("remove the <Anuma.Image> element");
  });

  it("emits no image note at all for compositions without an image slot", () => {
    // COVER_STATEMENT is image-less by design — the recipe shouldn't
    // surface image guidance the model can't act on.
    const recipe = renderCompositionLayoutRecipe(
      "cover-statement--editorial-warm",
      { heading: "Playfair Display", body: "Source Sans 3" }
    );
    expect(recipe).toBeTruthy();
    expect(recipe).not.toContain("Image slots:");
  });
});

describe("renderDesignSystemCatalog", () => {
  it("appends composition hints in [brackets] when the system declares them", () => {
    // techno-bold sets both preferAsymmetric and preferDarkVariants —
    // the catalog should surface both so the model knows to bias
    // layouts accordingly.
    const out = renderDesignSystemCatalog();
    const technoLine = out
      .split("\n")
      .find((l) => l.startsWith("- techno-bold —"))!;
    expect(technoLine).toMatch(/\[.*prefers asymmetric layouts.*prefers dark-surface variants.*\]/);
  });

  it("omits the brackets for systems that declare no composition hints", () => {
    // minimal-swiss has composition.preferAsymmetric=false and
    // preferDarkVariants=false — falsy values shouldn't generate a
    // misleading empty `[]` annotation.
    const out = renderDesignSystemCatalog();
    const swissLine = out
      .split("\n")
      .find((l) => l.startsWith("- minimal-swiss —"))!;
    expect(swissLine).not.toMatch(/\[/);
  });
});
