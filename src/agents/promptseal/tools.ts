/**
 * Three tools for the hiring agent — `resume_parse → score_candidate → decide`.
 *
 * `score_candidate` is **synthetic** (no inner LLM call) by deliberate v0.3
 * scope decision (D2 in ARCHITECTURE.md). The synthetic formula tunes to
 * match the `expected_decision` field on each resume so the demo is
 * predictable. Running this in the SDK's `runToolLoop` produces a flat
 * sequence of receipts; the Python demo's nested-call shape is preserved
 * separately by re-running the Python flow.
 */
import type { ToolConfig } from "../../lib/chat/useChat/types";

import { findResume } from "./resumes";

type ScoreInput = {
  name: string;
  yoe_react: number;
  yoe_python: number;
  education: string;
  highlights: string;
};

type Scores = {
  technical_score: number;
  culture_score: number;
  ambiguity_score: number;
};

type DecideInput = {
  technical_score: number;
  culture_score: number;
  ambiguity_score: number;
  candidate_id: string;
};

type Decision = {
  decision: "hire" | "reject";
  reasoning: string;
  candidate_id: string;
};

/**
 * Synthetic scoring formula. Designed to produce hire/reject outcomes that
 * line up with each resume's `expected_decision`:
 *   - Alice (7+5y, Stanford, unicorn) → high technical, hire
 *   - Bob (0y, bootcamp, no prod) → low technical, reject
 *   - Carol (4+6y, MIT, FAANG) → high technical, hire
 *   - David (2+3y, Lit BA) → mid scores, ambiguous → reject
 *   - Eva (8+2y, frontend specialist) → mixed, ambiguous → reject
 */
function syntheticScore(input: ScoreInput): Scores {
  const totalYoe = (input.yoe_react ?? 0) + (input.yoe_python ?? 0);
  const technical_score = Math.min(10, Math.max(1, Math.floor(totalYoe * 0.7) + 1));
  const blob = `${input.education} ${input.highlights}`;
  const culture_score = /Stanford|MIT|FAANG|unicorn/i.test(blob) ? 8 : 5;
  // High ambiguity when both stacks are present and the total experience is
  // borderline (>5 years means likely-strong; ambiguity drops). Career
  // switchers with low experience push ambiguity high.
  const hasReact = (input.yoe_react ?? 0) > 0;
  const hasPython = (input.yoe_python ?? 0) > 0;
  const ambiguity_score = hasReact && hasPython && totalYoe > 5 ? 3 : 7;
  return { technical_score, culture_score, ambiguity_score };
}

/**
 * Build the three hiring tools. Returned as `ToolConfig[]` so they plug
 * straight into `runToolLoop({ tools })`.
 */
export function createHiringTools(): ToolConfig[] {
  return [
    {
      type: "function",
      function: {
        name: "resume_parse",
        description: "Look up a candidate resume by id.",
        parameters: {
          type: "object",
          required: ["resume_id"],
          properties: {
            resume_id: {
              type: "string",
              description: "Resume id (e.g. 'res_001').",
            },
          },
        },
      },
      executor: (args) => {
        const id = String((args as { resume_id?: unknown }).resume_id ?? "");
        const r = findResume(id);
        if (!r) return { error: `unknown resume_id: ${id}` };
        // Strip ground-truth before returning to the LLM.
        const { expected_decision: _, ...rest } = r;
        return rest;
      },
    },
    {
      type: "function",
      function: {
        name: "score_candidate",
        description:
          "Score a candidate on technical, culture, and ambiguity axes (1-10 each).",
        parameters: {
          type: "object",
          required: ["name", "yoe_react", "yoe_python", "education", "highlights"],
          properties: {
            name: { type: "string" },
            yoe_react: { type: "number" },
            yoe_python: { type: "number" },
            education: { type: "string" },
            highlights: { type: "string" },
          },
        },
      },
      executor: (args) => syntheticScore(args as ScoreInput),
    },
    {
      type: "function",
      function: {
        name: "decide",
        description:
          "Make a hire/reject decision based on candidate scores. Returns {decision, reasoning, candidate_id}.",
        parameters: {
          type: "object",
          required: ["technical_score", "culture_score", "ambiguity_score", "candidate_id"],
          properties: {
            technical_score: { type: "number" },
            culture_score: { type: "number" },
            ambiguity_score: { type: "number" },
            candidate_id: { type: "string" },
          },
        },
      },
      executor: (args) => decideRule(args as DecideInput),
    },
  ];
}

/** Pure decision rule, byte-equal to Python `agent/tools.py:108-127`. */
export function decideRule(input: DecideInput): Decision {
  const tech = Math.floor(input.technical_score ?? 0);
  const culture = Math.floor(input.culture_score ?? 0);
  const ambiguity = Math.floor(input.ambiguity_score ?? 10);

  if (tech >= 7 && culture >= 6 && ambiguity <= 5) {
    return {
      decision: "hire",
      reasoning: `Strong technical (${tech}/10) and culture (${culture}/10), low ambiguity (${ambiguity}/10).`,
      candidate_id: input.candidate_id,
    };
  }
  if (tech < 4 || culture < 4) {
    return {
      decision: "reject",
      reasoning: `Weak fundamentals: technical ${tech}/10, culture ${culture}/10.`,
      candidate_id: input.candidate_id,
    };
  }
  return {
    decision: "reject",
    reasoning: `Ambiguous case (ambiguity ${ambiguity}/10) with mid-tier technical ${tech}/10; defaulting to reject.`,
    candidate_id: input.candidate_id,
  };
}
