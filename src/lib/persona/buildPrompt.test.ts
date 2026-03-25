import { describe, it, expect } from "vitest";

import {
  buildSystemPrompt,
  sanitizeQuotes,
  renderTemplate,
  DEFAULT_PROMPT_TEMPLATES,
} from "./buildPrompt";
import type { PromptContext, PromptSection } from "./types";

function makeCtx(overrides?: Partial<PromptContext>): PromptContext {
  return { basePrompt: "You are a helpful assistant.", ...overrides };
}

describe("buildSystemPrompt", () => {
  // ── Base section ──

  describe("base section", () => {
    it("renders basePrompt as-is", () => {
      const result = buildSystemPrompt(makeCtx({ basePrompt: "Be kind." }));
      expect(result.prompt).toContain("Be kind.");
      expect(result.activeSections).toContain("base");
    });
  });

  // ── Date section ──

  describe("date section", () => {
    it("renders current date in en-US format", () => {
      const result = buildSystemPrompt(makeCtx());
      expect(result.activeSections).toContain("date");
      expect(result.prompt).toMatch(/Today is \w+, \w+ \d{1,2}, \d{4}/);
    });

    it("includes temporal reasoning instruction", () => {
      const result = buildSystemPrompt(makeCtx());
      expect(result.prompt).toContain("calculate exact date ranges");
    });
  });

  // ── Tools section ──

  describe("tools section", () => {
    it("returns null when no tools provided", () => {
      const result = buildSystemPrompt(makeCtx());
      expect(result.activeSections).not.toContain("tools");
    });

    it("returns null for empty tools array", () => {
      const result = buildSystemPrompt(makeCtx({ toolSummaries: [] }));
      expect(result.activeSections).not.toContain("tools");
    });

    it("renders tool list in bullet format", () => {
      const result = buildSystemPrompt(
        makeCtx({
          toolSummaries: [
            { name: "search", description: "Web search" },
            { name: "weather", description: "Get weather" },
          ],
        })
      );
      expect(result.activeSections).toContain("tools");
      expect(result.prompt).toContain("- search: Web search");
      expect(result.prompt).toContain("- weather: Get weather");
    });
  });

  // ── Persona section ──

  describe("persona section", () => {
    it("returns null when persona is null", () => {
      const result = buildSystemPrompt(makeCtx({ persona: null }));
      expect(result.activeSections).not.toContain("persona");
    });

    it("renders persona with content", () => {
      const result = buildSystemPrompt(makeCtx({ persona: "a pirate captain" }));
      expect(result.activeSections).toContain("persona");
      expect(result.prompt).toContain("a pirate captain");
    });

    it("preserves dollar signs without $-pattern corruption", () => {
      const result = buildSystemPrompt(makeCtx({ persona: "Cost is $50 and $& more" }));
      expect(result.prompt).toContain("Cost is $50 and $& more");
    });

    it("sanitizes triple quotes", () => {
      const result = buildSystemPrompt(makeCtx({ persona: 'say """hello"""' }));
      expect(result.activeSections).toContain("persona");
      expect(result.prompt).toContain('say "hello"');
      expect(result.prompt).not.toContain('say """hello"""');
    });
  });

  // ── Style section ──

  describe("style section", () => {
    it("returns null when styleProfile is null", () => {
      const result = buildSystemPrompt(makeCtx({ styleProfile: null }));
      expect(result.activeSections).not.toContain("style");
    });

    it("renders style with content", () => {
      const result = buildSystemPrompt(makeCtx({ styleProfile: "casual and brief" }));
      expect(result.activeSections).toContain("style");
      expect(result.prompt).toContain("casual and brief");
    });

    it("sanitizes triple quotes in style content", () => {
      const result = buildSystemPrompt(makeCtx({ styleProfile: 'uses """emphasis"""' }));
      expect(result.activeSections).toContain("style");
      expect(result.prompt).toContain('uses "emphasis"');
      expect(result.prompt).not.toContain('uses """emphasis"""');
    });
  });

  // ── Sentiment section ──

  describe("sentiment section", () => {
    it("returns null when sentiment is null", () => {
      const result = buildSystemPrompt(makeCtx({ sentiment: null }));
      expect(result.activeSections).not.toContain("sentiment");
    });

    it("returns null when sentiment is neutral", () => {
      const result = buildSystemPrompt(makeCtx({ sentiment: "neutral" }));
      expect(result.activeSections).not.toContain("sentiment");
    });

    it("renders frustrated template", () => {
      const result = buildSystemPrompt(makeCtx({ sentiment: "frustrated" }));
      expect(result.activeSections).toContain("sentiment");
      expect(result.prompt).toContain(DEFAULT_PROMPT_TEMPLATES.sentiment.frustrated);
    });

    it("renders positive template", () => {
      const result = buildSystemPrompt(makeCtx({ sentiment: "positive" }));
      expect(result.activeSections).toContain("sentiment");
      expect(result.prompt).toContain(DEFAULT_PROMPT_TEMPLATES.sentiment.positive);
    });
  });

  // ── Language section ──

  describe("language section", () => {
    it("returns null when preferredLanguage is null", () => {
      const result = buildSystemPrompt(makeCtx({ preferredLanguage: null }));
      expect(result.activeSections).not.toContain("language");
    });

    it("returns null for English", () => {
      const result = buildSystemPrompt(makeCtx({ preferredLanguage: "en" }));
      expect(result.activeSections).not.toContain("language");
    });

    it("renders Japanese for ja", () => {
      const result = buildSystemPrompt(makeCtx({ preferredLanguage: "ja" }));
      expect(result.activeSections).toContain("language");
      expect(result.prompt).toContain("Japanese");
    });

    it("renders generic suffix for other", () => {
      const result = buildSystemPrompt(makeCtx({ preferredLanguage: "other" }));
      expect(result.activeSections).toContain("language");
      expect(result.prompt).toContain(DEFAULT_PROMPT_TEMPLATES.languageGeneric);
    });

    it("resolves language codes via Intl.DisplayNames", () => {
      const result = buildSystemPrompt(makeCtx({ preferredLanguage: "pt" }));
      expect(result.activeSections).toContain("language");
      expect(result.prompt).toContain("Portuguese");
    });
  });

  // ── Platform formatting section ──

  describe("platformFormatting section", () => {
    it("returns null when platformFormatting is null", () => {
      const result = buildSystemPrompt(makeCtx({ platformFormatting: null }));
      expect(result.activeSections).not.toContain("platformFormatting");
    });

    it("renders formatting instructions", () => {
      const result = buildSystemPrompt(
        makeCtx({ platformFormatting: "Use plain text only, no markdown." })
      );
      expect(result.activeSections).toContain("platformFormatting");
      expect(result.prompt).toContain("Use plain text only, no markdown.");
    });
  });

  // ── Section ordering ──

  describe("section ordering", () => {
    it("renders in priority order", () => {
      const result = buildSystemPrompt(
        makeCtx({
          toolSummaries: [{ name: "search", description: "Search" }],
          persona: "tester",
          styleProfile: "formal",
          sentiment: "frustrated",
          preferredLanguage: "ja",
          platformFormatting: "Plain text only.",
        })
      );

      expect(result.activeSections).toEqual([
        "base",
        "date",
        "tools",
        "persona",
        "style",
        "sentiment",
        "language",
        "platformFormatting",
      ]);
    });
  });

  // ── Disabled sections ──

  describe("disabled config", () => {
    it("skips sections listed in disabled", () => {
      const result = buildSystemPrompt(
        makeCtx({ sentiment: "frustrated", preferredLanguage: "ja" }),
        { disabled: ["sentiment", "language"] }
      );
      expect(result.activeSections).not.toContain("sentiment");
      expect(result.activeSections).not.toContain("language");
    });
  });

  // ── maxLength budget ──

  describe("maxLength budget", () => {
    it("skips sections that exceed budget", () => {
      const base = "You are a helpful assistant.";
      const result = buildSystemPrompt(
        makeCtx({
          basePrompt: base,
          persona: "a very long persona description that should exceed the budget easily",
        }),
        { maxLength: base.length + 10 }
      );
      expect(result.activeSections).toContain("base");
      expect(result.activeSections).not.toContain("persona");
    });

    it("allows a shorter section even if an earlier one was skipped (continue not break)", () => {
      const base = "You are a helpful assistant.";
      const languageText = DEFAULT_PROMPT_TEMPLATES.language.replace(/\{language\}/g, "Japanese");
      const result = buildSystemPrompt(
        makeCtx({
          basePrompt: base,
          persona: "x".repeat(5000),
          preferredLanguage: "ja",
        }),
        { maxLength: base.length + languageText.length + 5 }
      );
      expect(result.activeSections).toContain("base");
      expect(result.activeSections).not.toContain("persona");
      expect(result.activeSections).toContain("language");
    });

    it("does not enforce budget when maxLength is 0", () => {
      const result = buildSystemPrompt(
        makeCtx({ persona: "x".repeat(50000), preferredLanguage: "ja" }),
        { maxLength: 0 }
      );
      expect(result.activeSections).toContain("persona");
      expect(result.activeSections).toContain("language");
    });
  });

  // ── extraSections ──

  describe("extraSections", () => {
    it("adds a custom section at the correct priority position", () => {
      const custom: PromptSection = {
        key: "custom",
        priority: 15,
        render: () => "\n[CUSTOM]",
      };
      const result = buildSystemPrompt(makeCtx(), { extraSections: [custom] });
      expect(result.activeSections).toContain("custom");
      expect(result.prompt).toContain("[CUSTOM]");

      const dateIdx = result.activeSections.indexOf("date");
      const customIdx = result.activeSections.indexOf("custom");
      const toolsIdx = result.activeSections.indexOf("tools");
      expect(customIdx).toBeGreaterThan(dateIdx);
      // tools is priority 25, not active here since no toolSummaries, but custom < 25
      expect(toolsIdx).toBe(-1); // tools not active
    });

    it("reads from ctx.extra", () => {
      const custom: PromptSection = {
        key: "group",
        priority: 10,
        render: (ctx) => {
          const roster = ctx.extra?.roster as string | undefined;
          return roster ? `\nGroup: ${roster}` : null;
        },
      };
      const result = buildSystemPrompt(makeCtx({ extra: { roster: "Alice, Bob" } }), {
        extraSections: [custom],
      });
      expect(result.prompt).toContain("Group: Alice, Bob");
    });
  });

  // ── Template overrides ──

  describe("template overrides", () => {
    it("uses custom persona template", () => {
      const result = buildSystemPrompt(makeCtx({ persona: "pirate" }), {
        templates: { persona: "\n\nACT AS: {content}" },
      });
      expect(result.prompt).toContain("ACT AS: pirate");
      expect(result.prompt).not.toContain("communication preference");
    });

    it("uses custom sentiment templates", () => {
      const result = buildSystemPrompt(makeCtx({ sentiment: "frustrated" }), {
        templates: { sentiment: { frustrated: "\nCalm down.", positive: "\nNice!" } },
      });
      expect(result.prompt).toContain("Calm down.");
    });
  });
});

// ── Helper unit tests ──

describe("sanitizeQuotes", () => {
  it("collapses 3+ double quotes to one", () => {
    expect(sanitizeQuotes('say """hello"""')).toBe('say "hello"');
  });

  it("leaves 1-2 quotes alone", () => {
    expect(sanitizeQuotes('say "hello"')).toBe('say "hello"');
    expect(sanitizeQuotes('say ""hello""')).toBe('say ""hello""');
  });

  it("collapses long runs", () => {
    expect(sanitizeQuotes('"""""')).toBe('"');
  });
});

describe("renderTemplate", () => {
  it("returns null for null value", () => {
    expect(renderTemplate(null, "template {content}")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(renderTemplate("", "template {content}")).toBeNull();
  });

  it("replaces {content} with sanitized value", () => {
    expect(renderTemplate("hello", "prefix: {content}")).toBe("prefix: hello");
  });

  it("preserves dollar signs in content", () => {
    expect(renderTemplate("$50 and $&", "val: {content}")).toBe("val: $50 and $&");
  });
});
