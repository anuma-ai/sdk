/**
 * Anchor a Merkle root to an EVM chain via a self-send transaction.
 *
 * The simplest publishable evidence: a tx whose `data` field is the 32-byte
 * Merkle root and whose `to == from`. Anyone with the tx hash can read back
 * the data via an RPC and compare against the root reconstructed from a
 * receipt's inclusion proof.
 *
 * EIP-1559 fees, single confirmation. No contract — `to` is just the
 * deployer's own EOA, so no ABI is needed.
 */
import {
  type Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  type Hex,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export type AnchorOptions = {
  rootHex: string;
  rpcUrl: string;
  chainId: number;
  privateKey: `0x${string}`;
  /** Confirmation timeout in milliseconds. Default 120_000 (2 min). */
  confirmTimeout?: number;
};

export type AnchorResult = {
  txHash: `0x${string}`;
  blockNumber: number;
  merkleRoot: string;
  chainId: number;
  sender: `0x${string}`;
  gasUsed: number;
};

function rootToHex(rootHex: string): Hex {
  let h = rootHex;
  if (h.startsWith("sha256:")) h = h.slice("sha256:".length);
  if (h.startsWith("0x")) h = h.slice(2);
  if (!/^[0-9a-fA-F]{64}$/.test(h)) {
    throw new Error(`merkle root must be 32 bytes hex, got ${h.length / 2}`);
  }
  return ("0x" + h.toLowerCase()) as Hex;
}

/** Resolve a viem chain object for the requested chain id. */
function resolveChain(chainId: number, rpcUrl: string) {
  if (chainId === baseSepolia.id) {
    // Use baseSepolia preset but allow custom RPC.
    return defineChain({ ...baseSepolia, rpcUrls: { default: { http: [rpcUrl] } } });
  }
  return defineChain({
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

export async function anchorRoot(opts: AnchorOptions): Promise<AnchorResult> {
  const data = rootToHex(opts.rootHex);
  const chain = resolveChain(opts.chainId, opts.rpcUrl);
  const account = privateKeyToAccount(opts.privateKey);

  const publicClient = createPublicClient({ chain, transport: http(opts.rpcUrl) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(opts.rpcUrl),
  });

  const sender = account.address as Address;
  const timeout = opts.confirmTimeout ?? 120_000;

  // viem handles EIP-1559 fees automatically when chain has baseFee support.
  const txHash = await walletClient.sendTransaction({
    to: sender,
    value: 0n,
    data,
    chain,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout,
  });

  if (receipt.status !== "success") {
    throw new Error(`anchor transaction reverted: ${txHash}`);
  }

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
    merkleRoot: opts.rootHex,
    chainId: opts.chainId,
    sender,
    gasUsed: Number(receipt.gasUsed),
  };
}
