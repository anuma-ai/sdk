import { describe, it, expect } from "vitest";
import type { SkillJourneyDefinition } from "@anuma/sdk";

import { HAVEN_SKILL_JOURNEYS } from "./journeys";

describe("HAVEN_SKILL_JOURNEYS", () => {
  it("has exactly 4 entries", () => {
    expect(Object.keys(HAVEN_SKILL_JOURNEYS)).toHaveLength(4);
  });

  it("keys match the 4 housing skills", () => {
    expect(Object.keys(HAVEN_SKILL_JOURNEYS).sort()).toEqual([
      "housing.demand-letter",
      "housing.hoa-dispute",
      "housing.lease-review",
      "housing.rent-increase-checker",
    ]);
  });

  it("each entry satisfies SkillJourneyDefinition", () => {
    for (const journey of Object.values(HAVEN_SKILL_JOURNEYS)) {
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

  it("lease-review has correct field keys", () => {
    const lr = HAVEN_SKILL_JOURNEYS["housing.lease-review"];
    expect(lr.fields.map((f) => f.key)).toEqual(["home_type", "state", "lease_text"]);
  });

  it("rent-increase-checker has correct field keys", () => {
    const ric = HAVEN_SKILL_JOURNEYS["housing.rent-increase-checker"];
    expect(ric.fields.map((f) => f.key)).toEqual([
      "state",
      "city",
      "current_rent",
      "proposed_rent",
      "notice_text",
    ]);
  });

  it("demand-letter has correct field keys", () => {
    const dl = HAVEN_SKILL_JOURNEYS["housing.demand-letter"];
    expect(dl.fields.map((f) => f.key)).toEqual([
      "tenant_name",
      "landlord_name",
      "property_address",
      "landlord_address",
      "state",
      "issue_description",
    ]);
  });

  it("hoa-dispute has correct field keys", () => {
    const hoa = HAVEN_SKILL_JOURNEYS["housing.hoa-dispute"];
    expect(hoa.fields.map((f) => f.key)).toEqual(["state", "hoa_name", "issue_type", "hoa_notice"]);
  });

  it("file-enabled journeys expose extraction targets", () => {
    expect(HAVEN_SKILL_JOURNEYS["housing.lease-review"].fileExtraction?.targetField).toBe(
      "lease_text"
    );
    expect(HAVEN_SKILL_JOURNEYS["housing.rent-increase-checker"].fileExtraction?.targetField).toBe(
      "notice_text"
    );
    expect(HAVEN_SKILL_JOURNEYS["housing.demand-letter"].fileExtraction?.targetField).toBe(
      "issue_description"
    );
    expect(HAVEN_SKILL_JOURNEYS["housing.hoa-dispute"].fileExtraction?.targetField).toBe(
      "hoa_notice"
    );
  });

  it("file extraction targets map to journey fields", () => {
    for (const [key, journey] of Object.entries(HAVEN_SKILL_JOURNEYS)) {
      if (!journey.fileExtraction) continue;
      expect(
        journey.fields.some((field) => field.key === journey.fileExtraction?.targetField),
        `${key} fileExtraction.targetField should be a journey field`
      ).toBe(true);
    }
  });

  it("required fields match the source data", () => {
    // lease-review: state required, home_type not required, lease_text not required
    const lr = HAVEN_SKILL_JOURNEYS["housing.lease-review"];
    expect(lr.fields.find((f) => f.key === "state")?.required).toBe(true);
    expect(lr.fields.find((f) => f.key === "home_type")?.required).toBe(false);

    // rent-increase-checker: core rent details required; notice text is optional
    const ric = HAVEN_SKILL_JOURNEYS["housing.rent-increase-checker"];
    expect(ric.fields.find((f) => f.key === "state")?.required).toBe(true);
    expect(ric.fields.find((f) => f.key === "city")?.required).toBe(true);
    expect(ric.fields.find((f) => f.key === "current_rent")?.required).toBe(true);
    expect(ric.fields.find((f) => f.key === "proposed_rent")?.required).toBe(true);
    expect(ric.fields.find((f) => f.key === "notice_text")?.required).toBe(false);

    // demand-letter: tenant_name, landlord_name, property_address, state, issue_description required; landlord_address not
    const dl = HAVEN_SKILL_JOURNEYS["housing.demand-letter"];
    expect(dl.fields.find((f) => f.key === "tenant_name")?.required).toBe(true);
    expect(dl.fields.find((f) => f.key === "landlord_address")?.required).toBe(false);
    expect(dl.fields.find((f) => f.key === "state")?.required).toBe(true);
    expect(dl.fields.find((f) => f.key === "issue_description")?.required).toBe(true);

    // hoa-dispute: state, hoa_name, issue_type required; hoa_notice not required
    const hoa = HAVEN_SKILL_JOURNEYS["housing.hoa-dispute"];
    expect(hoa.fields.find((f) => f.key === "state")?.required).toBe(true);
    expect(hoa.fields.find((f) => f.key === "hoa_name")?.required).toBe(true);
    expect(hoa.fields.find((f) => f.key === "issue_type")?.required).toBe(true);
    expect(hoa.fields.find((f) => f.key === "hoa_notice")?.required).toBe(false);
  });

  it("state field has 51 options in every skill that has one", () => {
    for (const journey of Object.values(HAVEN_SKILL_JOURNEYS)) {
      const stateField = journey.fields.find((f) => f.key === "state");
      if (stateField) {
        expect(stateField.options).toHaveLength(51);
        expect(stateField.type).toBe("select");
        expect(stateField.placeholder).toBe("Select your U.S. state");
      }
    }
  });

  it("each entry has a non-empty systemContext", () => {
    for (const [key, journey] of Object.entries(HAVEN_SKILL_JOURNEYS)) {
      expect(journey.systemContext, `${key} should have systemContext`).toBeTruthy();
    }
  });

  it("every select field has at least one option", () => {
    for (const [key, journey] of Object.entries(HAVEN_SKILL_JOURNEYS)) {
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
    for (const [key, journey] of Object.entries(HAVEN_SKILL_JOURNEYS)) {
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
