import type { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
import type { RecallOptions, RecallResult } from "./types.js";

export type MemoryContextLane = "profile" | "fact" | "episode" | "session";
export interface MemoryContextItem {
  id: string;
  content: string;
  score: number;
  lane: MemoryContextLane;
  sourceIds: string[];
  /** Ranked fact evidence, retained when profile deduplication wins placement. */
  recalled?: boolean;
}
export interface MemoryContextOptions {
  query: string;
  recall: (query: string, options: RecallOptions) => Promise<RecallResult>;
  loadFacts?:
    | ((options: Parameters<typeof getAllVaultMemoriesOp>[1]) => Promise<StoredVaultMemory[]>)
    | null;
  loadSessionRefs?: (() => Promise<Array<{ memoryId: string; score: number }>>) | null;
  recallOptions?: RecallOptions;
  /** Topic membership is applied before ranking and to every context lane. */
  memoryIds?: string[];
  /** Character budget for contents (formatting overhead is excluded). Default 12000. */
  maxChars?: number;
  includeEpisodes?: boolean;
  onDegraded?: (lane: MemoryContextLane, error: unknown) => void;
}
export interface MemoryContextResult {
  items: MemoryContextItem[];
  ranked: boolean;
  rankedCount: number;
  degraded: MemoryContextLane[];
  truncated: boolean;
}

/** Only skip confidently trivial utterances. Word counts reject useful short
 * queries and languages whose writing does not separate words with spaces.
 *
 * The stoplist is an exact-match allowance for greetings and acknowledgments,
 * not a language model: anything not listed still recalls, so a missing
 * language costs a wasted lookup, never a missed memory. Kept to the handful of
 * forms that cannot carry a fact in the languages the app ships in. */
export function shouldRecallMemory(query: string): boolean {
  const normalized = query
    .trim()
    .toLowerCase()
    .replace(/[.!?。！？¡¿]+$/u, "")
    .replace(/^[¡¿]+/u, "");
  return (
    normalized.length > 0 &&
    !/^(hi|hi there|hello|hey|yes|no|yep|nope|sure|k|ok|okay|thanks|thank you|thank you very much|thanks a lot|cool|great|got it|sounds good|hola|buenos días|buenas|sí|si|gracias|muchas gracias|vale|bonjour|salut|oui|non|merci|merci beaucoup|d'accord|hallo|guten tag|ja|nein|danke|danke schön|alles klar|olá|obrigado|obrigada|ciao|grazie|sì|你好|谢谢|好的|こんにちは|ありがとう|안녕하세요|감사합니다)$/u.test(
      normalized
    )
  );
}

/** Assemble bounded stable/dynamic profile, relevant facts, source excerpts and
 * prior-turn facts. Lane failures are isolated: an outage cannot replace a
 * legitimate empty search with unrelated vault contents. */
export async function assembleMemoryContext(
  options: MemoryContextOptions
): Promise<MemoryContextResult> {
  const { query, recall, loadFacts, loadSessionRefs } = options;
  const memoryIds = options.memoryIds ?? options.recallOptions?.memoryIds;
  const ranked = shouldRecallMemory(query);
  const degraded: MemoryContextLane[] = [];
  const guard = async <T>(
    lane: MemoryContextLane,
    run: () => Promise<T>,
    fallback: T
  ): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      degraded.push(lane);
      try {
        options.onDegraded?.(lane, error);
      } catch {
        /* diagnostics are observational */
      }
      return fallback;
    }
  };
  const scoped =
    memoryIds !== undefined ||
    options.recallOptions?.scopes !== undefined ||
    options.recallOptions?.folderId !== undefined;
  const allowed = memoryIds !== undefined ? new Set(memoryIds) : undefined;
  const filters = {
    ...(options.recallOptions?.scopes && { scopes: options.recallOptions.scopes }),
    ...(options.recallOptions?.folderId !== undefined && {
      folderId: options.recallOptions.folderId,
    }),
  };
  const active = (m: StoredVaultMemory) =>
    !m.isDeleted &&
    !m.archivedAt &&
    !m.supersededBy &&
    m.trustTier !== "quarantined" &&
    (!allowed || allowed.has(m.uniqueId));
  const asItem = (m: StoredVaultMemory, lane: MemoryContextLane, score = 1): MemoryContextItem => ({
    id: m.uniqueId,
    content: m.content,
    score,
    lane,
    sourceIds: m.sourceChunkIds ?? [],
  });
  const empty: RecallResult = {
    memories: [],
    usedBudget: options.recallOptions?.budget ?? "low",
    reranked: false,
    candidateCount: 0,
  };
  const [facts, episodes, profile, session] = await Promise.all([
    ranked
      ? guard(
          "fact",
          () => recall(query, { ...options.recallOptions, types: ["fact"], limit: 20, memoryIds }),
          empty
        )
      : empty,
    ranked && !scoped && options.includeEpisodes !== false
      ? guard(
          "episode",
          () =>
            recall(query, {
              ...options.recallOptions,
              types: ["chunk"],
              limit: 4,
              minScore: 0.5,
              onDiagnostics: undefined,
            }),
          empty
        )
      : empty,
    loadFacts
      ? guard(
          "profile",
          async () => {
            const stable = await loadFacts({
              ...filters,
              memoryIds,
              factTypes: ["identity", "preference", "constraint", "relationship"],
              limit: 8,
            });
            const dynamic = await loadFacts({
              ...filters,
              memoryIds,
              factTypes: ["ongoing_context", "plan"],
              limit: 4,
            });
            return [...stable, ...dynamic].filter(active).map((m) => asItem(m, "profile"));
          },
          []
        )
      : [],
    loadFacts && loadSessionRefs
      ? guard(
          "session",
          async () => {
            const refs = (await loadSessionRefs())
              .filter((r) => !allowed || allowed.has(r.memoryId))
              .sort((a, b) => b.score - a.score)
              .slice(0, 10);
            if (!refs.length) return [];
            const rows = await loadFacts({ ...filters, memoryIds: refs.map((r) => r.memoryId) });
            const byId = new Map(rows.filter(active).map((m) => [m.uniqueId, m]));
            return refs.flatMap((ref) => {
              const m = byId.get(ref.memoryId);
              return m ? [asItem(m, "session", ref.score)] : [];
            });
          },
          []
        )
      : [],
  ]);
  const toItems = (result: RecallResult, lane: MemoryContextLane): MemoryContextItem[] =>
    result.memories
      .filter((m) => !allowed || allowed.has(m.id))
      .map((m) => ({
        id: m.id,
        content: m.content,
        score: m.score,
        lane,
        ...(lane === "fact" && { recalled: true }),
        sourceIds: m.sourceChunkIds ?? (m.messageId ? [m.messageId] : []),
      }));
  const recalledFacts = toItems(facts, "fact");
  const recalledScores = new Map<string, number>();
  const recalledContentScores = new Map<string, number>();
  for (const item of recalledFacts) {
    recalledScores.set(item.id, Math.max(recalledScores.get(item.id) ?? -Infinity, item.score));
    const content = item.content.trim();
    recalledContentScores.set(
      content,
      Math.max(recalledContentScores.get(content) ?? -Infinity, item.score)
    );
  }
  const rankedProfile = profile.map((item) => {
    // Match both identities used by the final deduplication pass.
    const score = Math.max(
      recalledScores.get(item.id) ?? -Infinity,
      recalledContentScores.get(item.content.trim()) ?? -Infinity
    );
    return score === -Infinity ? item : { ...item, score, recalled: true };
  });
  const lanes: Array<[MemoryContextItem[], number]> = [
    [rankedProfile, 2000],
    [recalledFacts, 6000],
    [toItems(episodes, "episode"), 3000],
    [session, 1000],
  ];
  const items: MemoryContextItem[] = [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  let remaining = Math.max(0, options.maxChars ?? 12000);
  let truncated = false;
  for (const [candidates, laneBudget] of lanes) {
    let laneRemaining = Math.min(laneBudget, remaining);
    for (const item of candidates) {
      const content = item.content?.trim();
      const key = `${item.lane === "episode" ? "episode" : "fact"}:${item.id}`;
      if (!content || seenIds.has(key) || seenContent.has(content)) continue;
      // Never cut a factual statement in half. Continue so smaller facts can fit.
      if (content.length > laneRemaining) {
        truncated = true;
        continue;
      }
      items.push({ ...item, content });
      seenIds.add(key);
      seenContent.add(content);
      remaining -= content.length;
      laneRemaining -= content.length;
    }
  }
  // Count what survived the topic filter, not the raw recall payload: on a
  // scoped assembly the two differ and the caller reads this as "how much
  // ranked evidence is in `items`".
  return { items, ranked, rankedCount: recalledFacts.length, degraded, truncated };
}
