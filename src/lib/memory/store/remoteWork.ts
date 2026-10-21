import { getLogger } from "../../logger.js";
import type { NearbyRequest } from "./remotePersistence.js";

/** @public */
export type RemoteMemoryWorkKind = "topics" | "embeddings";

/** @public */
export interface RemoteMemoryWorkLease {
  kind: RemoteMemoryWorkKind;
  token: string;
  processor_version: string;
  expires_at: string;
}

/** @public */
export interface RemoteMemoryWorkPersistence {
  claimWork(
    kind: RemoteMemoryWorkKind,
    processorVersion: string,
    token?: string
  ): Promise<RemoteMemoryWorkLease | null>;
  releaseWork(kind: RemoteMemoryWorkKind, token: string): Promise<void>;
}

export function createRemoteWorkPersistence(request: NearbyRequest): RemoteMemoryWorkPersistence {
  return {
    claimWork: async (kind, processorVersion, token) => {
      const result = (await request("/work/claim", {
        method: "POST",
        body: JSON.stringify({
          kind,
          processor_version: processorVersion,
          ...(token && { token }),
        }),
      })) as { lease?: Partial<RemoteMemoryWorkLease> };
      if (!result || typeof result !== "object") throw new Error("Invalid nearby work lease");
      const lease = result.lease;
      if (lease === undefined) return null;
      if (
        !lease ||
        lease.kind !== kind ||
        typeof lease.token !== "string" ||
        !lease.token ||
        lease.processor_version !== processorVersion ||
        typeof lease.expires_at !== "string" ||
        !Number.isFinite(Date.parse(lease.expires_at))
      )
        throw new Error("Invalid nearby work lease");
      return lease as RemoteMemoryWorkLease;
    },
    releaseWork: async (kind, token) => {
      await request("/work/release", { method: "POST", body: JSON.stringify({ kind, token }) });
    },
  };
}

export async function withRemoteWorkLease<T>(
  persistence: RemoteMemoryWorkPersistence,
  kind: RemoteMemoryWorkKind,
  processorVersion: string,
  task: (token: string) => Promise<T>
): Promise<T | null> {
  const lease = await persistence.claimWork(kind, processorVersion);
  if (!lease) return null;
  let renewing: Promise<unknown> | undefined;
  const timer = setInterval(() => {
    if (renewing) return;
    renewing = persistence
      .claimWork(kind, processorVersion, lease.token)
      .catch((error: unknown) => getLogger().warn("[memory/work] Lease renewal failed:", error))
      .finally(() => {
        renewing = undefined;
      });
  }, 30_000);
  try {
    return await task(lease.token);
  } finally {
    clearInterval(timer);
    await renewing;
    await persistence
      .releaseWork(kind, lease.token)
      .catch((error: unknown) => getLogger().warn("[memory/work] Lease release failed:", error));
  }
}
