/**
 * Query decomposition for composite/abstract memory questions.
 *
 * Calls Portal LLM (open-weights, see DEFAULT_MODEL) to classify a query as
 * "specific" or "composite" and, if composite, decompose it into 3–5 concrete facet
 * sub-queries. The recall pipeline then runs the existing fused ranker
 * once per sub-query and RRF-fuses the result lists.
 *
 * Why decompose: the existing pipeline (cosine + BM25 + recency + CE +
 * graph) scores documents against a query, but composite queries like
 * "tell me about the user as a person" have no lexical or semantic
 * surface to anchor on — every personal fact embeds about equally near
 * them, so top-K is essentially noise. Decomposition rewrites the *left*
 * side of the equation into queries the existing pipeline already
 * handles well (we hit ~100% recall on direct/specific queries).
 *
 * This is the one place we deliberately depart from Hindsight's
 * "skip query rewriting" stance — their workload is factual; ours has
 * abstract user questions. See `tasks/hackathon/...` for the rationale.
 */

import { getLogger } from "../logger.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "../memory/portalLlm.js";

// Open-weights, matching the extraction/consolidation defaults — closes the
// last memory-pipeline path that sent private-mode content to a closed
// provider: decomposition runs on the user's recall query, which in a
// privacy-mode chat is private. ling-2.6-flash (not gpt-oss): this is a SHORT
// single-decision prompt on the recall hot path, exactly the shape where
// gpt-oss returns empty content ~30% of the time (see consolidate.ts); ling
// is reliable here and accepts `response_format`. Verified on the decompose
// prompt: correct specific/composite classification at ~1–2s. A failure
// degrades to the safe `{specific, [query]}` fallback below, so recall never
// breaks even on a hiccup.
const DEFAULT_MODEL = "inclusionai/ling-2.6-flash";
const MAX_SUB_QUERIES = 5;

const SYSTEM_PROMPT = `You classify a memory query and, if needed, decompose it into concrete sub-queries.

CLASSIFICATION RULES — be strict:
- "specific": asks for one fact OR a list of items in ONE category (one dimension).
  Examples: a name, a date, a preference, a location, an ID, a value, "what hobbies",
  "which conferences", "what open source projects", "what does X do for exercise".
  Even when the answer is a list, if all items belong to one dimension, it is specific.
- "composite": asks about a person, system, or setup MULTI-DIMENSIONALLY — a summary,
  an overview, a profile, "tell me about X", "what is my X setup", "describe the team's
  X". The answer must span multiple distinct fact dimensions (e.g. for a "tech stack":
  language + database + framework + tools — four different dimensions).

When in doubt, prefer "specific". Mis-classifying a single-dimension list as composite
hurts retrieval more than the reverse.

SUB-QUERY RULES (composite only, 3–5 questions):
- Each sub-query targets a DIFFERENT fact dimension.
- Use SHORT parenthetical examples — 2–4 concrete options that anchor the
  embedding to likely memory content. Examples must be terms a user would
  actually have in their notes (e.g., "Postgres" not "PostgreSQL 15.2 with
  read replicas"). No verbose qualifiers like "and versions" or "and any
  relevant configuration details".
- 8–14 words including the parenthetical. Like a human asking a follow-up.

Examples:
  "What is my dog's name?" → {"mode":"specific","subQueries":["What is my dog's name?"]}
  "What does the user do for exercise?" → {"mode":"specific","subQueries":["What does the user do for exercise?"]}
  "What conferences has the user attended?" → {"mode":"specific","subQueries":["What conferences has the user attended?"]}
  "What did I do last Tuesday?" → {"mode":"specific","subQueries":["What did I do last Tuesday?"]}
  "Tell me about the user as a person" → {"mode":"composite","subQueries":["What is the user's name?","Where does the user live?","What does the user do for work?","Any health conditions or allergies?","What are the user's hobbies (sports, music, games)?"]}
  "What is the user's tech stack?" → {"mode":"composite","subQueries":["What programming languages does the user use (Python, Go, TypeScript)?","What database does the user use (Postgres, MySQL, Mongo)?","What framework or ORM (React, Django, Prisma)?","What infrastructure (AWS, Docker, K8s)?","What testing tools (Jest, pytest, Cypress)?"]}
  "Describe the user's development environment" → {"mode":"composite","subQueries":["What operating system does the user use (macOS, Linux, Windows)?","What editor or IDE (VS Code, Vim, IntelliJ)?","What shell or terminal setup (zsh, bash, tmux)?","What keyboard or display setup (mechanical, vertical monitor)?","Any UI preferences (dark mode, font, vim keybindings)?"]}

Output strict JSON. No prose.`;

/** @public */
export interface DecomposedQuery {
  mode: "specific" | "composite";
  subQueries: string[];
}

/** Auth is the dual pattern — one of `apiKey` / `getToken` is required at
 * runtime; see {@link PortalLlmAuth}. */
interface DecomposeQueryOptions extends PortalLlmAuth {
  baseUrl?: string;
  model?: string;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
}

/**
 * Classify + decompose. On any failure (network, malformed JSON,
 * schema violation) returns a safe fallback that treats the query as
 * specific — the recall pipeline degrades to single-query behavior,
 * never blocked.
 */
export async function decomposeQuery(
  query: string,
  options: DecomposeQueryOptions
): Promise<DecomposedQuery> {
  const fallback: DecomposedQuery = { mode: "specific", subQueries: [query] };
  const trimmed = query.trim();
  if (trimmed.length === 0) return fallback;

  let parsed: unknown;
  try {
    parsed = await callPortalJsonCompletion({
      ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
      ...(options.getToken !== undefined && { getToken: options.getToken }),
      ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
      model: options.model ?? DEFAULT_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      // Wrap the bare query in a task framing so the model treats it as
      // input to classify, not as a question to answer conversationally.
      // Bare-query inputs caused Anthropic models to respond with prose
      // like "Do you mean...?" before this wrap.
      userMessage: `Classify the following memory query and decompose if composite. Respond with JSON only — do not answer the question, do not ask for clarification.\n\nQuery: ${trimmed}`,
      // Decompose runs on the recall hot path — tighter than the
      // portalLlm default (consolidate/extract can wait longer).
      timeoutMs: 20_000,
      tag: "memory/decompose",
      ...(options.fetchFn && { fetchFn: options.fetchFn }),
    });
  } catch (err) {
    // Decomposition is an optional quality stage — a misconfigured or
    // failing portal call must degrade to specific-mode, never reject
    // the recall it decorates.
    getLogger().warn("memoryVault/decompose: portal call failed, falling back to specific", err);
    return fallback;
  }
  if (parsed === null) return fallback;

  return validate(parsed, trimmed) ?? fallback;
}

function validate(parsed: unknown, originalQuery: string): DecomposedQuery | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  const mode = obj.mode === "composite" ? "composite" : "specific";
  if (!Array.isArray(obj.subQueries)) return null;

  const subQueries = obj.subQueries
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, MAX_SUB_QUERIES);

  if (subQueries.length === 0) return null;
  if (mode === "specific") {
    return { mode: "specific", subQueries: [originalQuery] };
  }
  return { mode, subQueries };
}
