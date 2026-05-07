/**
 * In-memory BM25 scoring sibling to cosine similarity.
 *
 * Pure function: takes a query string and items, returns a score map.
 * No index persistence — re-tokenized per call. Adequate up to several
 * thousand memories on this codepath; vault search already loads all
 * candidates into memory before ranking.
 */

const K1 = 1.5;
const B = 0.75;

const TOKEN_RE = /[a-z0-9]+/g;

/**
 * English stopwords + conversational glue. Vault memories are short
 * (often <30 tokens), so BM25 without stopword filtering lets common
 * words ("what", "is", "the", "user") dominate rare discriminative
 * terms. Filtering both query and docs.
 */
const STOPWORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "don",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "s",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "t",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "user",
  "users",
]);

function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(TOKEN_RE);
  if (!m) return [];
  return m.filter((t) => !STOPWORDS.has(t));
}

export interface BM25Item {
  id: string;
  content: string;
}

/**
 * Compute Okapi BM25 scores for each item against the query.
 *
 * Returns a Map keyed by item id with the BM25 score. Items that share
 * zero query terms are omitted from the returned Map (their score is 0).
 *
 * Constants: k1=1.5, b=0.75 (standard defaults).
 */
export function scoreBM25(query: string, items: BM25Item[]): Map<string, number> {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0 || items.length === 0) return new Map();

  const docTokens: string[][] = items.map((i) => tokenize(i.content));
  const docLens = docTokens.map((t) => t.length);
  const avgdl = docLens.reduce((a, b) => a + b, 0) / docLens.length;

  const queryTermSet = new Set(queryTerms);
  const df = new Map<string, number>();
  for (const tokens of docTokens) {
    const seen = new Set<string>();
    for (const t of tokens) {
      if (queryTermSet.has(t)) seen.add(t);
    }
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const N = items.length;
  const scores = new Map<string, number>();

  for (let i = 0; i < items.length; i++) {
    const tokens = docTokens[i];
    const dl = docLens[i];
    if (dl === 0) continue;

    const tf = new Map<string, number>();
    for (const t of tokens) {
      if (queryTermSet.has(t)) tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    if (tf.size === 0) continue;

    let score = 0;
    for (const [term, f] of tf) {
      const dft = df.get(term) ?? 0;
      const idf = Math.log((N - dft + 0.5) / (dft + 0.5) + 1);
      const tfNorm = (f * (K1 + 1)) / (f + K1 * (1 - B + (B * dl) / avgdl));
      score += idf * tfNorm;
    }

    scores.set(items[i].id, score);
  }

  return scores;
}
