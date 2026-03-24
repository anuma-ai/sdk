/**
 * Hybrid Search Module
 *
 * Combines semantic (embedding cosine similarity) and keyword (full-text)
 * search using Reciprocal Rank Fusion (RRF) to improve retrieval quality.
 *
 * Pure semantic search has a known blind spot: exact terms like error codes,
 * function names, or specific IDs can be ranked lower than tangentially
 * related content. Keyword search addresses this directly.
 */

/**
 * Configuration for hybrid search weighting.
 */
export interface HybridSearchWeights {
  /** Weight for semantic (embedding) results. Default: 0.85 */
  semantic: number;
  /** Weight for keyword results. Default: 0.15 */
  keyword: number;
}

const DEFAULT_HYBRID_WEIGHTS: HybridSearchWeights = {
  semantic: 0.85,
  keyword: 0.15,
};

/**
 * RRF constant — controls how much lower-ranked items are penalized.
 * Standard value from the original RRF paper.
 */
const RRF_K = 60;

/**
 * A ranked item from a single retrieval source.
 */
interface RankedItem<T> {
  item: T;
  rank: number;
}

/**
 * Merge two ranked lists using Reciprocal Rank Fusion.
 *
 * RRF score = w_semantic * (1 / (k + rank_semantic)) + w_keyword * (1 / (k + rank_keyword))
 *
 * Items absent from one list receive a fallback rank of (list_length + 1),
 * giving them a baseline score rather than zero. This ensures keyword matches
 * act as a relative boost between items without demoting strong semantic
 * results that happen to lack keyword overlap (e.g., paraphrase queries).
 *
 * @param semanticRanked - Items ranked by semantic similarity (best first)
 * @param keywordRanked - Items ranked by keyword relevance (best first)
 * @param getKey - Function to extract a unique key from an item
 * @param weights - Semantic vs keyword weighting
 * @returns Merged items sorted by descending RRF score
 */
export function mergeWithRRF<T>(
  semanticRanked: T[],
  keywordRanked: T[],
  getKey: (item: T) => string,
  weights: HybridSearchWeights = DEFAULT_HYBRID_WEIGHTS
): T[] {
  // Build lookup: key → 1-based rank in each list
  const semanticRank = new Map<string, number>();
  for (let i = 0; i < semanticRanked.length; i++) {
    semanticRank.set(getKey(semanticRanked[i]), i + 1);
  }

  const keywordRank = new Map<string, number>();
  for (let i = 0; i < keywordRanked.length; i++) {
    keywordRank.set(getKey(keywordRanked[i]), i + 1);
  }

  // Fallback rank for items missing from a list — placed just past the end
  const semanticFallback = semanticRanked.length + 1;
  const keywordFallback = keywordRanked.length + 1;

  // Collect all unique items
  const seen = new Map<string, T>();
  for (const item of semanticRanked) {
    const key = getKey(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  for (const item of keywordRanked) {
    const key = getKey(item);
    if (!seen.has(key)) seen.set(key, item);
  }

  // Score each item using both rank contributions
  const scored: Array<{ item: T; score: number }> = [];
  for (const [key, item] of seen) {
    const semRank = semanticRank.get(key) ?? semanticFallback;
    const kwRank = keywordRank.get(key) ?? keywordFallback;
    const score =
      weights.semantic * (1 / (RRF_K + semRank)) + weights.keyword * (1 / (RRF_K + kwRank));
    scored.push({ item, score });
  }

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.item);
}

/**
 * Common English stop words that add noise to BM25 scoring.
 * These appear in nearly every document and query, so they
 * contribute rank signal that is essentially random.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "as",
  "be",
  "was",
  "are",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "not",
  "no",
  "nor",
  "so",
  "if",
  "then",
  "than",
  "that",
  "this",
  "these",
  "those",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "when",
  "where",
  "why",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "only",
  "own",
  "same",
  "too",
  "very",
  "just",
  "about",
  "above",
  "after",
  "again",
  "also",
  "am",
  "any",
  "because",
  "before",
  "below",
  "between",
  "during",
  "further",
  "here",
  "into",
  "its",
  "me",
  "my",
  "myself",
  "our",
  "ours",
  "out",
  "over",
  "she",
  "he",
  "her",
  "him",
  "his",
  "hers",
  "i",
  "its",
  "let",
  "like",
  "make",
  "many",
  "much",
  "now",
  "off",
  "once",
  "still",
  "them",
  "their",
  "theirs",
  "there",
  "they",
  "through",
  "under",
  "until",
  "up",
  "us",
  "we",
  "were",
  "while",
  "you",
  "your",
  "yours",
  "used",
  "using",
  "use",
]);

/**
 * Tokenize text into lowercase terms for keyword matching.
 * Strips punctuation, splits on whitespace, and removes stop words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/**
 * Build a term frequency map from tokens.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

/**
 * A document prepared for keyword scoring.
 */
interface IndexedDocument<T> {
  item: T;
  tokens: string[];
  tf: Map<string, number>;
  length: number;
}

/**
 * Score documents against a query using BM25.
 *
 * BM25 is an industry-standard ranking function that considers term frequency,
 * document length normalization, and inverse document frequency.
 *
 * @param query - Search query text
 * @param documents - Array of items to score
 * @param getText - Function to extract searchable text from an item
 * @returns Items sorted by descending BM25 score (only items with score > 0)
 */
export function keywordSearch<T>(query: string, documents: T[], getText: (item: T) => string): T[] {
  if (documents.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Index all documents
  const indexed: IndexedDocument<T>[] = documents.map((item) => {
    const tokens = tokenize(getText(item));
    return {
      item,
      tokens,
      tf: termFrequency(tokens),
      length: tokens.length,
    };
  });

  // Compute average document length
  const avgDl = indexed.reduce((sum, doc) => sum + doc.length, 0) / indexed.length;

  // Compute IDF for each query term
  const idf = new Map<string, number>();
  for (const term of queryTokens) {
    const docsContaining = indexed.filter((doc) => doc.tf.has(term)).length;
    // Standard BM25 IDF with smoothing
    const idfValue = Math.log(1 + (indexed.length - docsContaining + 0.5) / (docsContaining + 0.5));
    idf.set(term, idfValue);
  }

  // BM25 parameters
  const k1 = 1.2;
  const b = 0.75;

  // Score each document
  const scored: Array<{ item: T; score: number }> = [];
  for (const doc of indexed) {
    let score = 0;
    for (const term of queryTokens) {
      const tf = doc.tf.get(term) ?? 0;
      if (tf === 0) continue;
      const termIdf = idf.get(term) ?? 0;
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (doc.length / avgDl));
      score += termIdf * (numerator / denominator);
    }
    if (score > 0) {
      scored.push({ item: doc.item, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}
