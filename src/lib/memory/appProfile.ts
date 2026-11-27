import type { FactType } from "./autoExtract.js";
import { type DecayPolicy, MEDIUM_TTL_MS } from "./decay.js";

export interface MemoryAppProfile {
  id: string;
  extractionGuidance?: string;
  maxContentLength?: number;
  factTypeWeights?: Partial<Record<FactType, number>>;
  factMinScore?: number;
  ttlByType?: Partial<Record<FactType, number>>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const ZETALABS_MAX_CONTENT_LENGTH = 320;

const ZETALABS_EXTRACTION_GUIDANCE = `This app is a markets and trading research assistant (crypto, perpetuals, equities, prediction markets). The user's own book, rules and views ARE durable facts here, even though they change faster than personal facts.

WHAT TO CAPTURE, AND THE TYPE TO USE
- Holdings and open positions → type "ongoing_context". State the instrument, direction, size, entry price, leverage and venue the user gave, with the date: "Long 2.5 ETH perp on Hyperliquid at 5x, entered at $3,150 on 2026-11-20". eventTime: { "kind": "ongoing", "start": the entry date, or today's date when the user gave none }.
- Entries, exits and resizes the user reports having made → type "ongoing_context", phrased as the NEW state of the position: "Closed their SOL long on 2026-11-25 at $182", "Trimmed their NVDA position to 40 shares on 2026-11-24". eventTime: { "kind": "point", "start": the trade date }.
- Watchlists → type "ongoing_context": "Watching HYPE, SOL and NVDA for entries". eventTime null.
- Theses and directional views → type "plan", never "preference". Keep the stated time horizon and the invalidation condition in the same statement: "Bullish SOL into Q1 2027 on ETF approval; invalid on a weekly close below $120". eventTime: { "kind": "range", "start": today's date, "end": the last day of the stated horizon }, or null when the user gave no horizon. A stated view counts even though it is not a commitment.
- Planned entries, exits, targets and stops that are not executed yet → type "plan": "Plans to add BTC below $90,000", "Will take profit on half their ETH at $4,000".
- Risk limits and rules the user trades by → type "constraint": "Never uses more than 3x leverage", "Risks at most 1% of the portfolio per trade", "Does not trade options".
- Preferred venues, chains, wallets and instruments → type "preference": "Prefers Hyperliquid for perps", "Trades spot only on Solana and Base", "Prefers perps over options for directional trades". Describe a wallet by its role and chain: "Keeps long-term holdings in a Ledger wallet on Ethereum".
- Standing instructions about how to present analysis → type "instruction": "Wants every trade idea to include an invalidation level", "Wants position sizes shown as a percent of portfolio".

HOW TO WRITE THEM
- Keep one position or one thesis in ONE statement with its size, price, date, horizon and invalidation. Do not split those details across candidates.
- Write tickers in uppercase without a "$" prefix (SOL, ETH, NVDA) and list each instrument, venue and chain as an entity: kind "product" for a token, contract, venue or chain, "organization" for a listed company.
- Record numbers exactly as the user stated them. Never fill in a price, size or date the user did not give.

DO NOT EXTRACT
- Prices, funding rates, market caps, news or any other market fact that came from the assistant or a tool. They are stale by the next conversation.
- One-off lookups and analysis requests ("what's the funding on ETH?", "chart SOL against BTC", "is NVDA overvalued?"). Asking about an instrument is not holding it, watching it or having a view on it.
- Views, positions or rules inside pasted or quoted third-party text (a research note, a post, another trader's call) unless the user says in their own words that it is theirs.
- Hypothetical or exploratory sizing ("what if I went 10x long?").
- Wallet addresses, transaction hashes, API keys, seed phrases or account numbers.`;

export const ZETALABS_MARKETS_PROFILE: MemoryAppProfile = {
  id: "zetalabs-markets",
  extractionGuidance: ZETALABS_EXTRACTION_GUIDANCE,
  maxContentLength: ZETALABS_MAX_CONTENT_LENGTH,
  ttlByType: { ongoing_context: MEDIUM_TTL_MS, plan: 90 * DAY_MS },
};

export function composeExtractionSystemPrompt(base: string, profile?: MemoryAppProfile): string {
  const guidance = profile?.extractionGuidance?.trim();
  const cap = profile?.maxContentLength;
  if (!guidance && cap === undefined) return base;
  const sections = [base];
  if (guidance)
    sections.push(
      "APP-SPECIFIC GUIDANCE — the rules below extend the ones above and win where the two disagree on what counts as durable or which type to use. The rules about facts asserted only by the assistant, pasted or quoted text, and tool output always apply.",
      guidance
    );
  if (cap !== undefined)
    sections.push(`A candidate's content may be up to ${cap} characters when the fact needs it.`);
  if (guidance) sections.push("Output strict JSON matching the schema. No prose.");
  return sections.join("\n\n");
}

export function profileDecayPolicy(
  profile: MemoryAppProfile | undefined,
  policy: Partial<DecayPolicy> | undefined
): Partial<DecayPolicy> | undefined {
  const ttlByType = profile?.ttlByType as Record<string, number> | undefined;
  if (!ttlByType) return policy;
  return { ...policy, ttlByType: { ...ttlByType, ...policy?.ttlByType } };
}
