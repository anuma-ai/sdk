import { describe, it, expect } from "vitest";
import type { SkillJourneyDefinition } from "@anuma/sdk";

import { SENTINEL_SKILL_JOURNEYS } from "./journeys";

describe("SENTINEL_SKILL_JOURNEYS", () => {
  it("has exactly 3 entries", () => {
    expect(Object.keys(SENTINEL_SKILL_JOURNEYS)).toHaveLength(3);
  });

  it("keys match the 3 finance skills", () => {
    expect(Object.keys(SENTINEL_SKILL_JOURNEYS).sort()).toEqual([
      "finance.chargeback-assistant",
      "finance.collection-response",
      "finance.subscription-checker",
    ]);
  });

  it("each entry satisfies SkillJourneyDefinition", () => {
    for (const journey of Object.values(SENTINEL_SKILL_JOURNEYS)) {
      const def: SkillJourneyDefinition = journey;
      expect(def.title).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.steps.length).toBeGreaterThan(0);
      expect(typeof def.acceptsFiles).toBe("boolean");
      expect(typeof def.requiresContext).toBe("boolean");
      expect(def.submitLabel).toBeTruthy();
      expect(def.promptTitle).toBeTruthy();
    }
  });

  it("subscription-checker has correct field keys", () => {
    const sc = SENTINEL_SKILL_JOURNEYS["finance.subscription-checker"];
    expect(sc.fields.map((f) => f.key)).toEqual(["statement_text", "focus_vendors"]);
  });

  it("chargeback-assistant has correct field keys", () => {
    const ca = SENTINEL_SKILL_JOURNEYS["finance.chargeback-assistant"];
    expect(ca.fields.map((f) => f.key)).toEqual([
      "charge_details",
      "merchant_name",
      "charge_amount",
    ]);
  });

  it("collection-response has correct field keys", () => {
    const cr = SENTINEL_SKILL_JOURNEYS["finance.collection-response"];
    expect(cr.fields.map((f) => f.key)).toEqual(["collection_notice", "collector_name", "state"]);
  });

  it("all three journeys accept files", () => {
    for (const journey of Object.values(SENTINEL_SKILL_JOURNEYS)) {
      expect(journey.acceptsFiles).toBe(true);
    }
  });

  it("file-enabled journeys expose extraction targets", () => {
    expect(
      SENTINEL_SKILL_JOURNEYS["finance.subscription-checker"].fileExtraction?.targetField
    ).toBe("statement_text");
    expect(
      SENTINEL_SKILL_JOURNEYS["finance.chargeback-assistant"].fileExtraction?.targetField
    ).toBe("charge_details");
    expect(SENTINEL_SKILL_JOURNEYS["finance.collection-response"].fileExtraction?.targetField).toBe(
      "collection_notice"
    );
  });

  it("required fields match the source data", () => {
    const sc = SENTINEL_SKILL_JOURNEYS["finance.subscription-checker"];
    expect(sc.fields.find((f) => f.key === "statement_text")?.required).toBe(false);
    expect(sc.fields.find((f) => f.key === "focus_vendors")?.required).toBe(false);

    const ca = SENTINEL_SKILL_JOURNEYS["finance.chargeback-assistant"];
    expect(ca.fields.find((f) => f.key === "charge_details")?.required).toBe(true);
    expect(ca.fields.find((f) => f.key === "merchant_name")?.required).toBe(false);
    expect(ca.fields.find((f) => f.key === "charge_amount")?.required).toBe(false);

    const cr = SENTINEL_SKILL_JOURNEYS["finance.collection-response"];
    expect(cr.fields.find((f) => f.key === "collection_notice")?.required).toBe(false);
    expect(cr.fields.find((f) => f.key === "collector_name")?.required).toBe(false);
    expect(cr.fields.find((f) => f.key === "state")?.required).toBe(true);
  });

  it("state field has 51 options in every skill that has one", () => {
    for (const journey of Object.values(SENTINEL_SKILL_JOURNEYS)) {
      const stateField = journey.fields.find((f) => f.key === "state");
      if (stateField) {
        expect(stateField.options).toHaveLength(51);
        expect(stateField.type).toBe("select");
        expect(stateField.placeholder).toBe("Select your U.S. state");
      }
    }
  });

  it("each entry has a non-empty systemContext", () => {
    for (const [key, journey] of Object.entries(SENTINEL_SKILL_JOURNEYS)) {
      expect(journey.systemContext, `${key} should have systemContext`).toBeTruthy();
    }
  });

  it("every select field has at least one option", () => {
    for (const [key, journey] of Object.entries(SENTINEL_SKILL_JOURNEYS)) {
      for (const field of journey.fields) {
        if (field.type === "select") {
          expect(field.options.length, `${key}.${field.key} should have options`).toBeGreaterThan(
            0
          );
        }
      }
    }
  });

  it("file metadata is present iff acceptsFiles is true", () => {
    for (const [key, journey] of Object.entries(SENTINEL_SKILL_JOURNEYS)) {
      if (journey.acceptsFiles) {
        expect(journey.fileLabel, `${key} should set fileLabel`).toBeTruthy();
        expect(journey.fileHint, `${key} should set fileHint`).toBeTruthy();
        expect(journey.fileExtraction?.strategy, `${key} should set extraction strategy`).toBe(
          "pdf-text"
        );
      } else {
        expect(journey.fileLabel, `${key} should omit fileLabel`).toBeUndefined();
        expect(journey.fileHint, `${key} should omit fileHint`).toBeUndefined();
        expect(journey.filePrompt, `${key} should omit filePrompt`).toBeUndefined();
        expect(journey.fileExtraction, `${key} should omit fileExtraction`).toBeUndefined();
      }
    }
  });
});
