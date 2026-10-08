import { getLogger } from "../logger.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "../memory/portalLlm.js";

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

interface DecomposeQueryOptions extends PortalLlmAuth {
  baseUrl?: string;
  model?: string;
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
      taskType: "memory_decompose",
      userMessage: `Classify the following memory query and decompose if composite. Respond with JSON only — do not answer the question, do not ask for clarification.\n\nQuery: ${trimmed}`,
      timeoutMs: 20_000,
      maxAttempts: 1,
      tag: "memory/decompose",
      ...(options.fetchFn && { fetchFn: options.fetchFn }),
    });
  } catch (err) {
    getLogger().warn("memoryVault/decompose: portal call failed, falling back to specific", err);
    return fallback;
  }
  if (parsed === null) return fallback;

  return validate(parsed, trimmed) ?? fallback;
}

/**
 * Normalize caller- or LLM-supplied facet queries for the composite ranker
 * (719/B4). Trims, drops blanks, case-insensitive-dedupes, and caps at 5.
 * Duplicate facets would otherwise receive repeated RRF weight; oversized
 * lists burn embeddings for nothing.
 */
export function normalizeSubQueries(raw: readonly unknown[] | undefined): string[] {
  if (!raw || raw.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    if (typeof s !== "string") continue;
    const t = s.trim();
    if (t.length === 0) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_SUB_QUERIES) break;
  }
  return out;
}

function validate(parsed: unknown, originalQuery: string): DecomposedQuery | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  const mode = obj.mode === "composite" ? "composite" : "specific";
  if (!Array.isArray(obj.subQueries)) return null;

  const subQueries = normalizeSubQueries(obj.subQueries);

  if (subQueries.length === 0) return null;
  if (mode === "specific") {
    return { mode: "specific", subQueries: [originalQuery] };
  }
  return { mode, subQueries };
}
