/**
 * Query decomposition for composite/abstract memory questions.
 *
 * Calls Portal LLM (gpt-5-mini) to classify a query as "specific" or
 * "composite" and, if composite, decompose it into 3–5 concrete facet
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

const DEFAULT_MODEL = "openai/gpt-5-mini";
const DEFAULT_BASE_URL = "https://portal.anuma-dev.ai";
const REQUEST_TIMEOUT_MS = 20_000;
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

export interface DecomposedQuery {
  mode: "specific" | "composite";
  subQueries: string[];
}

interface DecomposeQueryOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
}

interface ChoicesResponse {
  choices?: Array<{ message?: { content?: string } }>;
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

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchFn ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: { "x-api-key": options.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: trimmed },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return fallback;
  }
  clearTimeout(timer);

  if (!response.ok) return fallback;

  let body: ChoicesResponse;
  try {
    body = (await response.json()) as ChoicesResponse;
  } catch {
    return fallback;
  }

  const content = body.choices?.[0]?.message?.content ?? "";
  if (!content) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return fallback;
  }

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
