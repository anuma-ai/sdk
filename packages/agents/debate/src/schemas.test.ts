import { describe, it, expect } from "vitest";

import {
  submitDraftSchema,
  submitCritiqueSchema,
  submitRevisionSchema,
  submitFinalSchema,
  DEBATE_SCHEMAS,
  type DebateToolSchema,
} from "./schemas";

/**
 * Minimal JSON-schema validator covering only the constructs these four
 * schemas use (object / array / string / nullable string / enum / required /
 * additionalProperties:false). Avoids pulling in ajv just for these tests
 * while still genuinely validating a sample against the schema rather than
 * asserting shape by hand. Returns the first error, or null when valid.
 */
function validate(schema: Record<string, unknown>, value: unknown, path = "$"): string | null {
  const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];

  if (types.includes("null") && value === null) return null;
  const nonNull = types.filter((t) => t !== "null");
  const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (!nonNull.includes(actual)) {
    return `${path}: expected ${nonNull.join("|")}, got ${actual}`;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return `${path}: ${JSON.stringify(value)} not in enum`;
  }

  if (actual === "object") {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    for (const key of (schema.required as string[]) ?? []) {
      if (!(key in obj)) return `${path}: missing required "${key}"`;
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) return `${path}.${key}: unexpected property`;
      }
    }
    for (const [key, sub] of Object.entries(props)) {
      if (key in obj) {
        const err = validate(sub, obj[key], `${path}.${key}`);
        if (err) return err;
      }
    }
  }

  if (actual === "array") {
    const items = schema.items as Record<string, unknown> | undefined;
    if (items) {
      const arr = value as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const err = validate(items, arr[i], `${path}[${i}]`);
        if (err) return err;
      }
    }
  }

  return null;
}

const validateAgainstTool = (tool: DebateToolSchema, sample: unknown): string | null =>
  validate(tool.function.parameters, sample);

describe("debate schemas", () => {
  it("exports four function-tool schemas keyed by tool name", () => {
    expect(Object.keys(DEBATE_SCHEMAS)).toEqual([
      "submit_draft",
      "submit_critique",
      "submit_revision",
      "submit_final",
    ]);
    for (const tool of Object.values(DEBATE_SCHEMAS)) {
      expect(tool.type).toBe("function");
      expect(typeof tool.function.name).toBe("string");
      expect(tool.function.parameters.type).toBe("object");
    }
  });

  it("submit_draft validates a sample with answer + claims (DESIGN §0.4)", () => {
    const sample = {
      answer: "Paris is the capital of France.",
      claims: [
        { id: "c1", text: "Paris is the capital of France." },
        { id: "c2", text: "France is in Europe." },
      ],
    };
    expect(validateAgainstTool(submitDraftSchema, sample)).toBeNull();
  });

  it("submit_critique validates points with claim_id (incl. null) + severity (DESIGN §0.4)", () => {
    const sample = {
      critiques: [
        {
          target: "participant-1",
          points: [
            {
              claim_id: "c1",
              issue: "Overstated certainty.",
              severity: "high",
              verdict: "overstated",
              fix: "Add a qualifier.",
            },
            {
              claim_id: null,
              issue: "Omits the cost trade-off entirely.",
              severity: "medium",
              verdict: "incomplete",
              fix: "Cover the cost angle.",
            },
          ],
        },
      ],
    };
    expect(validateAgainstTool(submitCritiqueSchema, sample)).toBeNull();
  });

  it("submit_revision validates re-emitted claims + conceded/rebutted/merged_into (DESIGN §0.4)", () => {
    const sample = {
      answer: "Revised: Paris is the capital of France, established as such in 987.",
      claims: [
        { id: "c1", text: "Paris is the capital of France." },
        { id: "c3", text: "Paris became the capital in 987." },
      ],
      conceded: ["c2"],
      rebutted: [{ claim_id: "c1" }],
      merged_into: [{ from: "c4", to: "c1" }],
    };
    expect(validateAgainstTool(submitRevisionSchema, sample)).toBeNull();
  });

  it("submit_final validates answer + disagreements + confidence (DESIGN §0.4)", () => {
    const sample = {
      answer: "The synthesized answer.",
      disagreements: [
        {
          claim_id: "c1",
          positions: [
            { participant: "participant-0", stance: "true" },
            { participant: "participant-1", stance: "unproven" },
          ],
        },
      ],
      confidence: "medium",
    };
    expect(validateAgainstTool(submitFinalSchema, sample)).toBeNull();
  });

  it("rejects a sample missing a required field", () => {
    const bad = { claims: [{ id: "c1", text: "x" }] }; // no answer
    expect(validateAgainstTool(submitDraftSchema, bad)).toMatch(/missing required "answer"/);
  });

  it("rejects an out-of-enum severity", () => {
    const bad = {
      critiques: [
        {
          target: "p1",
          points: [
            { claim_id: "c1", issue: "x", severity: "critical", verdict: "wrong", fix: "y" },
          ],
        },
      ],
    };
    expect(validateAgainstTool(submitCritiqueSchema, bad)).toMatch(/not in enum/);
  });

  it("rejects an unexpected property (additionalProperties:false)", () => {
    const bad = {
      answer: "x",
      claims: [{ id: "c1", text: "y" }],
      extra: true,
    };
    expect(validateAgainstTool(submitDraftSchema, bad)).toMatch(/unexpected property/);
  });
});
