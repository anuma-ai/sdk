/**
 * Forced-tool schemas for the four debate stages (DESIGN §0.4).
 *
 * The portal's `/api/v1/responses` has no `response_format` / json_schema
 * parameter, so each stage gets its structure by forcing a single tool with
 * `tool_choice: "required"`: the model emits a tool call, the portal returns it
 * unexecuted, and the orchestrator reads `tool_call.arguments` as the stage
 * output. The tool is a schema, not a capability — there is no executor, the
 * model supplies all judgment.
 *
 * Each export is an OpenAI-style function-tool definition. The orchestrator
 * passes it as the sole entry of the stage's `tools` array. `parameters` is the
 * JSON Schema the orchestrator validates the returned arguments against in the
 * parse-guard step.
 */

/** OpenAI-style function-tool definition for a forced debate stage. */
export interface DebateToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Stage A — `submit_draft`: an answer plus its enumerated claims. */
export const submitDraftSchema: DebateToolSchema = {
  type: "function",
  function: {
    name: "submit_draft",
    description:
      "Submit your draft answer to the debate, decomposed into the discrete claims it rests on.",
    parameters: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description: "The full prose answer to the question.",
        },
        claims: {
          type: "array",
          description: "The falsifiable claims the answer rests on.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Short stable claim id (e.g. c1, c2). Reused across rounds.",
              },
              text: { type: "string", description: "The claim as a single checkable assertion." },
            },
            required: ["id", "text"],
            additionalProperties: false,
          },
        },
      },
      required: ["answer", "claims"],
      additionalProperties: false,
    },
  },
};

/** Stage B — `submit_critique`: per-target points anchored to claim ids. */
export const submitCritiqueSchema: DebateToolSchema = {
  type: "function",
  function: {
    name: "submit_critique",
    description:
      "Submit critiques of the other participants' drafts, one entry per draft you reviewed.",
    parameters: {
      type: "object",
      properties: {
        critiques: {
          type: "array",
          description: "One critique entry per other participant you reviewed.",
          items: {
            type: "object",
            properties: {
              target: {
                type: "string",
                description: "The participant whose draft this critique targets.",
              },
              points: {
                type: "array",
                description: "The individual points raised against the target's draft.",
                items: {
                  type: "object",
                  properties: {
                    claim_id: {
                      type: ["string", "null"],
                      description:
                        "The claim id this point targets, or null for a missing/omitted claim.",
                    },
                    issue: { type: "string", description: "What is wrong, stated concretely." },
                    severity: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                      description: "How much this undermines the answer.",
                    },
                    verdict: {
                      type: "string",
                      description: "Verdict on the targeted claim (e.g. wrong, unsupported).",
                    },
                    fix: { type: "string", description: "A concrete proposed fix." },
                  },
                  required: ["claim_id", "issue", "severity", "verdict", "fix"],
                  additionalProperties: false,
                },
              },
            },
            required: ["target", "points"],
            additionalProperties: false,
          },
        },
      },
      required: ["critiques"],
      additionalProperties: false,
    },
  },
};

/** Stage C — `submit_revision`: revised answer, re-emitted claims, concede/rebut/merge. */
export const submitRevisionSchema: DebateToolSchema = {
  type: "function",
  function: {
    name: "submit_revision",
    description:
      "Submit your revised answer after critique, re-emitting your full claims and recording what you conceded, rebutted, and merged.",
    parameters: {
      type: "object",
      properties: {
        answer: { type: "string", description: "The revised prose answer." },
        claims: {
          type: "array",
          description:
            "The complete re-emitted claims for the revised answer (kept claims keep their id).",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Claim id (reused for kept claims)." },
              text: { type: "string", description: "The claim as a single checkable assertion." },
            },
            required: ["id", "text"],
            additionalProperties: false,
          },
        },
        conceded: {
          type: "array",
          description: "Claim ids you changed because the critique was right.",
          items: { type: "string" },
        },
        rebutted: {
          type: "array",
          description: "Claim ids you are standing by despite the critique.",
          items: {
            type: "object",
            properties: {
              claim_id: { type: "string", description: "The claim id you are defending." },
            },
            required: ["claim_id"],
            additionalProperties: false,
          },
        },
        merged_into: {
          type: "array",
          description: "Explicit claim merge map: each merged-away id and the id it merged into.",
          items: {
            type: "object",
            properties: {
              from: { type: "string", description: "The merged-away claim id." },
              to: { type: "string", description: "The claim id it merged into." },
            },
            required: ["from", "to"],
            additionalProperties: false,
          },
        },
      },
      required: ["answer", "claims", "conceded", "rebutted", "merged_into"],
      additionalProperties: false,
    },
  },
};

/** Stage D — `submit_final`: synthesized answer, surfaced disagreements, confidence. */
export const submitFinalSchema: DebateToolSchema = {
  type: "function",
  function: {
    name: "submit_final",
    description:
      "Submit the synthesized final answer, the unresolved disagreements, and an overall confidence.",
    parameters: {
      type: "object",
      properties: {
        answer: { type: "string", description: "The final user-facing answer." },
        disagreements: {
          type: "array",
          description: "Unresolved disagreements, each with every participant's stance.",
          items: {
            type: "object",
            properties: {
              claim_id: { type: "string", description: "The disputed claim id." },
              positions: {
                type: "array",
                description: "Each participant's stance on the disputed claim.",
                items: {
                  type: "object",
                  properties: {
                    participant: { type: "string", description: "The participant." },
                    stance: { type: "string", description: "That participant's stance." },
                  },
                  required: ["participant", "stance"],
                  additionalProperties: false,
                },
              },
            },
            required: ["claim_id", "positions"],
            additionalProperties: false,
          },
        },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Overall confidence reflecting how much participants converged.",
        },
      },
      required: ["answer", "disagreements", "confidence"],
      additionalProperties: false,
    },
  },
};

/** All four debate stage schemas, keyed by tool name. */
export const DEBATE_SCHEMAS = {
  submit_draft: submitDraftSchema,
  submit_critique: submitCritiqueSchema,
  submit_revision: submitRevisionSchema,
  submit_final: submitFinalSchema,
} as const;
