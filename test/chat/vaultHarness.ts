import { deriveMemoryKeyRing, memoryCipher } from "../../src/lib/memory/store/memoryKeys";
import { createFakeChatStore, type FakeChatStoreFault } from "./fakeChatStore";
import { createRemoteChatStore } from "../../src/lib/chatStore/remote";
import type {
  ChatRecordKind,
  ChatSnapshot,
  ChatStore,
  ChatWrite,
} from "../../src/lib/chatStore/types";

/** A chat store for tests plus the controls they need: fault injection, a call log and a second device. */
export interface ChatStoreHarness {
  store: ChatStore;
  calls: string[];
  fail(fault: FakeChatStoreFault): void;
  heal(): void;
  row(kind: ChatRecordKind, id: string): Promise<ChatSnapshot | undefined>;
  write(writes: ChatWrite[]): Promise<ChatSnapshot[]>;
  /** Stored vectors; only the in-memory fake can show them. */
  vectors?(kind: ChatRecordKind, id: string): number[][] | undefined;
}

const env = typeof process === "undefined" ? {} : process.env;
const vaultFetch = globalThis.fetch.bind(globalThis);

/** True when tests run against a real vault named by `VAULT_CONFORMANCE_URL`. */
export const conformance = !!env.VAULT_CONFORMANCE_URL;

function base64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let binary = "";
  for (const b of raw) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let signingKey: Promise<CryptoKey> | undefined;

function privateKey(): Promise<CryptoKey> {
  signingKey ??= (async () => {
    const pem = env.VAULT_CONFORMANCE_PRIVATE_KEY ?? "";
    const der = Uint8Array.from(
      atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")),
      (c) => c.charCodeAt(0)
    );
    return crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, [
      "sign",
    ]);
  })();
  return signingKey;
}

async function privyToken(did: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: "privy.io",
      aud: env.VAULT_CONFORMANCE_APP_ID,
      sub: did,
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    await privateKey(),
    new TextEncoder().encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
}

function withFaults(store: ChatStore, calls: string[], faults: FakeChatStoreFault[]): ChatStore {
  const wrap =
    <A extends unknown[], R>(op: FakeChatStoreFault["op"], call: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      calls.push(op);
      const index = faults.findIndex(
        (f) => f.op === op && (!f.when || f.when(args[0] as readonly ChatWrite[]))
      );
      const fault = index >= 0 ? faults[index] : undefined;
      if (fault && !fault.sticky) faults.splice(index, 1);
      if (fault && !fault.after) throw fault.error;
      const result = await call(...args);
      if (fault?.after) throw fault.error;
      return result;
    };
  return {
    get: wrap("get", (...a: Parameters<ChatStore["get"]>) => store.get(...a)),
    list: wrap("list", (...a: Parameters<ChatStore["list"]>) => store.list(...a)),
    putMany: wrap("putMany", (...a: Parameters<ChatStore["putMany"]>) => store.putMany(...a)),
    getMany: wrap("getMany", (...a: Parameters<ChatStore["getMany"]>) => store.getMany(...a)),
    account: wrap("account", (...a: Parameters<ChatStore["account"]>) => store.account(...a)),
    importRecords: wrap("importRecords", (...a: Parameters<ChatStore["importRecords"]>) =>
      store.importRecords(...a)
    ),
    verify: wrap("verify", (...a: Parameters<ChatStore["verify"]>) => store.verify(...a)),
    activate: wrap("activate", (...a: Parameters<ChatStore["activate"]>) => store.activate(...a)),
    changes: wrap("changes", (...a: Parameters<ChatStore["changes"]>) => store.changes(...a)),
    search: wrap("search", (...a: Parameters<ChatStore["search"]>) => store.search(...a)),
    deleteAll: wrap("deleteAll", (...a: Parameters<ChatStore["deleteAll"]>) =>
      store.deleteAll(...a)
    ),
    attachments: store.attachments,
  };
}

async function realVault(): Promise<ChatStoreHarness> {
  const random = crypto.getRandomValues(new Uint32Array(2));
  const accountId = 2 ** 40 + (random[0] % 2 ** 20) * 2 ** 12 + (random[1] % 2 ** 12);
  const did = `did:privy:conformance-${accountId}`;
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(65)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  const ring = await deriveMemoryKeyRing(`0x${seed}`);
  const options = {
    baseUrl: env.VAULT_CONFORMANCE_URL!,
    getToken: () => privyToken(did),
    keyId: ring.keyId,
    fetch: vaultFetch,
    ...memoryCipher(ring),
  };
  const direct = await createRemoteChatStore(options);
  const calls: string[] = [];
  const faults: FakeChatStoreFault[] = [];
  return {
    store: withFaults(await createRemoteChatStore(options), calls, faults),
    calls,
    fail: (fault) => faults.push(fault),
    heal: () => {
      faults.length = 0;
    },
    row: async (kind, id) => (await direct.get(kind, id)) ?? undefined,
    write: (writes) => direct.putMany(writes),
  };
}

/** A fresh, empty account: in-memory by default, on a real vault when `VAULT_CONFORMANCE_URL` is set. */
export function createChatStoreHarness(
  options: { maxVectors?: number; maxBytes?: number } = {}
): Promise<ChatStoreHarness> {
  return conformance ? realVault() : Promise.resolve(createFakeChatStore(options));
}
