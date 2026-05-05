/**
 * Truth Layer — mock blockchain adapter.
 *
 * In-memory implementation of {@link BlockchainAdapter} suitable for development,
 * tests, and the hackathon demo. Backed by a pluggable storage interface so the
 * same code works in browser (localStorage), Node (memory), and mobile (AsyncStorage).
 *
 * Generates fake but well-formed tx hashes (`0xmock_<random>`) and explorer URLs
 * pointing at a placeholder host (`https://mock-explorer.local/tx/<hash>`).
 *
 * Replace with the real ZetaChain adapter once the chain-side integration lands.
 * The interface is identical; swap is a one-line change at adapter construction.
 */

import type {
  AnchorStateInput,
  BlockchainAdapter,
  IssueGrantInput,
} from "./blockchain";
import type { AnchorResult, Grant } from "./types";

export interface MockStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  keys(): string[];
}

/** Default in-memory storage. Swap for localStorage/AsyncStorage at construction. */
export function createMemoryStorage(): MockStorage {
  const store = new Map<string, unknown>();
  return {
    get<T>(key: string): T | null {
      return (store.get(key) as T | undefined) ?? null;
    },
    set<T>(key: string, value: T): void {
      store.set(key, value);
    },
    remove(key: string): void {
      store.delete(key);
    },
    keys(): string[] {
      return Array.from(store.keys());
    },
  };
}

export interface MockBlockchainOptions {
  /** Storage backend. Defaults to in-memory. */
  storage?: MockStorage;
  /** Simulated tx latency in ms (for realistic UI behavior). Default 250ms. */
  latencyMs?: number;
  /** Wallet address to attribute mock anchors and grants to. Required for read APIs. */
  ownerWallet: string;
}

const KEY_PREFIX = "anuma:truthlayer:mock:";
const KEY_GRANTS = `${KEY_PREFIX}grants`;
const KEY_ANCHORS = `${KEY_PREFIX}anchors`;

export function createMockBlockchainAdapter(
  opts: MockBlockchainOptions
): BlockchainAdapter {
  const storage = opts.storage ?? createMemoryStorage();
  const latency = opts.latencyMs ?? 250;
  const owner = opts.ownerWallet.toLowerCase();

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  function fakeTxHash(): string {
    const bytes = new Uint8Array(32);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return (
      "0xmock_" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 56)
    );
  }

  function fakeExplorerUrl(txHash: string): string {
    return `https://mock-explorer.local/tx/${txHash}`;
  }

  function loadGrants(): Grant[] {
    return storage.get<Grant[]>(KEY_GRANTS) ?? [];
  }

  function saveGrants(grants: Grant[]): void {
    storage.set(KEY_GRANTS, grants);
  }

  function loadAnchors(): AnchorResult[] {
    return storage.get<AnchorResult[]>(KEY_ANCHORS) ?? [];
  }

  function saveAnchors(anchors: AnchorResult[]): void {
    storage.set(KEY_ANCHORS, anchors);
  }

  return {
    getMode() {
      return "mock";
    },

    async issueGrant(input: IssueGrantInput): Promise<Grant> {
      await sleep(latency);
      const txHash = fakeTxHash();
      const grants = loadGrants();
      const grant: Grant = {
        id: `grant_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        ownerWallet: owner,
        writerKey: input.writerKey,
        label: input.label,
        scope: input.scope,
        issuedAt: Date.now(),
        expiresAt: input.expiresAt,
        txHash,
        explorerUrl: fakeExplorerUrl(txHash),
      };
      grants.push(grant);
      saveGrants(grants);
      return grant;
    },

    async revokeGrant(grantId: string) {
      await sleep(latency);
      const txHash = fakeTxHash();
      const grants = loadGrants();
      const idx = grants.findIndex((g) => g.id === grantId);
      if (idx === -1) {
        throw new Error(`Grant not found: ${grantId}`);
      }
      grants[idx] = { ...grants[idx], revokedAt: Date.now() };
      saveGrants(grants);
      return { txHash, explorerUrl: fakeExplorerUrl(txHash) };
    },

    async getGrant(grantId: string): Promise<Grant | null> {
      const grants = loadGrants();
      return grants.find((g) => g.id === grantId) ?? null;
    },

    async listGrants(ownerWallet: string): Promise<Grant[]> {
      const grants = loadGrants();
      return grants.filter(
        (g) => g.ownerWallet.toLowerCase() === ownerWallet.toLowerCase()
      );
    },

    async isGrantValid(grantId: string, at?: number): Promise<boolean> {
      const grants = loadGrants();
      const grant = grants.find((g) => g.id === grantId);
      if (!grant) return false;
      const now = at ?? Date.now();
      if (grant.revokedAt && grant.revokedAt <= now) return false;
      if (grant.expiresAt && grant.expiresAt < now) return false;
      if (grant.issuedAt > now) return false;
      return true;
    },

    async anchorState(input: AnchorStateInput): Promise<AnchorResult> {
      await sleep(latency);
      const txHash = fakeTxHash();
      const result: AnchorResult = {
        root: input.root,
        prevRoot: input.prevRoot,
        transitionHash: input.transitionHash,
        txHash,
        explorerUrl: fakeExplorerUrl(txHash),
        timestamp: Date.now(),
      };
      const anchors = loadAnchors();
      anchors.push(result);
      saveAnchors(anchors);
      return result;
    },

    async getCurrentRoot(_ownerWallet: string): Promise<string | null> {
      const anchors = loadAnchors();
      if (anchors.length === 0) return null;
      return anchors[anchors.length - 1].root;
    },

    async listAnchors(_ownerWallet: string): Promise<AnchorResult[]> {
      return loadAnchors();
    },
  };
}

/**
 * Browser-friendly storage adapter using localStorage. JSON-serializes values.
 *
 * Only use this on the web. For mobile, write a similar adapter against AsyncStorage.
 */
export function createLocalStorageStorage(prefix = "anuma:truthlayer:"): MockStorage {
  return {
    get<T>(key: string): T | null {
      try {
        const raw = localStorage.getItem(prefix + key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    set<T>(key: string, value: T): void {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
      } catch {
        /* quota or unavailable; silently drop in this mock */
      }
    },
    remove(key: string): void {
      try {
        localStorage.removeItem(prefix + key);
      } catch {
        /* ignore */
      }
    },
    keys(): string[] {
      const out: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
        }
      } catch {
        /* ignore */
      }
      return out;
    },
  };
}
