/**
 * ERC-8004 agent-card read-back.
 *
 * The registry on Base Sepolia (`0x7177...d09A`) emits a custom event on
 * register() whose data field is the ABI-encoded agent card URI string.
 * Topic[0] is captured from the on-chain receipt for token #633:
 *
 *   0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a
 *
 * The registry does NOT implement ERC-721 Metadata's `tokenURI(uint256)`,
 * so we read the URI from this log instead. From the URI we decode the
 * agent card JSON (typically a `data:application/json;base64,...` URI) and
 * extract the publicKey + agent name.
 */
import { createPublicClient, decodeAbiParameters, defineChain, type Hex, http } from "viem";
import { baseSepolia } from "viem/chains";

export const AGENT_CARD_EVENT_TOPIC: Hex =
  "0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a";

export type ReadAgentCardOptions = {
  rpcUrl: string;
  /** Reserved for future filtering; not used today. */
  registryAddress?: `0x${string}`;
  txHash: `0x${string}`;
  chainId?: number;
};

export type AgentCard = {
  publicKey: string;
  agentId: string;
  raw: Record<string, unknown>;
  cardUri: string;
};

function resolveChain(chainId: number, rpcUrl: string) {
  if (chainId === baseSepolia.id) {
    return defineChain({ ...baseSepolia, rpcUrls: { default: { http: [rpcUrl] } } });
  }
  return defineChain({
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

function decodeDataUriJson(uri: string): Record<string, unknown> {
  if (uri.startsWith("data:application/json;base64,")) {
    const b64 = uri.slice("data:application/json;base64,".length);
    const bin = atob(b64);
    return JSON.parse(bin) as Record<string, unknown>;
  }
  if (uri.startsWith("data:application/json,")) {
    const text = decodeURIComponent(uri.slice("data:application/json,".length));
    return JSON.parse(text) as Record<string, unknown>;
  }
  // Caller can fetch external URIs themselves; we don't auto-fetch here.
  throw new Error(`agent card URI is not inline JSON: ${uri.slice(0, 64)}...`);
}

/**
 * Read the agent card from a register() transaction's logs and extract the
 * agent's public key + id. Returns the parsed card object too for callers
 * that want to inspect `endpoints` / `version`.
 */
export async function readAgentCard(opts: ReadAgentCardOptions): Promise<AgentCard> {
  const chainId = opts.chainId ?? baseSepolia.id;
  const chain = resolveChain(chainId, opts.rpcUrl);
  const client = createPublicClient({ chain, transport: http(opts.rpcUrl) });

  const receipt = await client.getTransactionReceipt({ hash: opts.txHash });
  for (const log of receipt.logs ?? []) {
    if (!log.topics || log.topics.length === 0) continue;
    if (log.topics[0]?.toLowerCase() !== AGENT_CARD_EVENT_TOPIC.toLowerCase()) continue;
    const [uri] = decodeAbiParameters([{ type: "string" }], log.data);
    const card = decodeDataUriJson(uri as string);
    const publicKey = String(card.publicKey ?? "");
    const agentId = String(card.name ?? card.agentId ?? "");
    return { publicKey, agentId, raw: card, cardUri: uri as string };
  }
  throw new Error(
    `no agent-card event (topic ${AGENT_CARD_EVENT_TOPIC}) in register tx ${opts.txHash}`
  );
}
