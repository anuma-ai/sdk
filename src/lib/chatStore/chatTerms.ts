import type { ChatRecord } from "./types.js";

const maxTermsPerRecord = 4096;
export const maxQueryTerms = 32;
const ciphertextCharsPerTerm = 6;
const maxTokenLength = 64;
const hashCacheSize = 50_000;
const unspaced =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/gu;
const word = /[\p{L}\p{N}\p{M}]+/gu;
const digestPattern = /^[0-9a-f]{64}$/;

/** The distinct search tokens of a text: NFKC, lowercased, letter and digit runs, and each character of scripts written without spaces. */
export function chatTermTokens(text: string): string[] {
  const tokens = new Set<string>();
  const spaced = text.normalize("NFKC").toLowerCase().replace(unspaced, " $& ");
  for (const [token] of spaced.matchAll(word)) {
    if (token.length <= maxTokenLength) tokens.add(token);
  }
  return [...tokens];
}

export function holdsEveryToken(record: ChatRecord, tokens: readonly string[]): boolean {
  const words = new Set(chatTermTokens(indexedText(record) ?? ""));
  return tokens.every((token) => words.has(token));
}

export function indexedText(record: ChatRecord): string | undefined {
  if (record.kind === "message")
    return typeof record.data.content === "string" ? record.data.content : "";
  if (record.kind === "summary")
    return typeof record.data.summary === "string" ? record.data.summary : "";
  return undefined;
}

export function createChatTermHasher(
  hashTopic: (value: string) => Promise<string>
): (token: string) => Promise<string> {
  const cache = new Map<string, Promise<string>>();
  return (token) => {
    let pending = cache.get(token);
    if (!pending) {
      if (cache.size >= hashCacheSize) cache.clear();
      const hashing = hashTopic(`chat-term\u0000${token}`).then((digest) => {
        if (!digestPattern.test(digest))
          throw new Error("Term hashing must return 64 lowercase hex characters");
        return digest.slice(0, 16);
      });
      pending = hashing;
      cache.set(token, hashing);
      hashing.catch(() => {
        if (cache.get(token) === hashing) cache.delete(token);
      });
    }
    return pending;
  };
}

export async function recordTerms(
  hash: (token: string) => Promise<string>,
  text: string,
  payloadLength: number
): Promise<string[]> {
  const room = Math.min(maxTermsPerRecord, Math.floor(payloadLength / ciphertextCharsPerTerm));
  const hashes = await Promise.all(chatTermTokens(text).slice(0, room).map(hash));
  return [...new Set(hashes)];
}
