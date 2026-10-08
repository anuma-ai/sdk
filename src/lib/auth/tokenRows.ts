const ENCRYPTED_PREFIX = "enc:oauth:";

/** Plain text row shape. The owner wallet travels with the token. */
export interface PlaintextTokenRecord<T> {
  wallet?: string;
  token: T;
}

/**
 * Parse a plain text token row and check its owner.
 * Old rows hold the token object directly, so they carry no owner.
 * A row with an owner is accepted only for that wallet.
 */
export function parsePlaintextToken<T extends { accessToken: string }>(
  raw: string,
  walletAddress?: string
): T | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Partial<PlaintextTokenRecord<T>> & Partial<T>;
  const data: T | undefined = record.token?.accessToken
    ? record.token
    : (record as Partial<T> as T);
  if (!data?.accessToken) return null;
  if (record.wallet && record.wallet !== walletAddress) return null;
  return data;
}

/**
 * Move one legacy row to the wallet-scoped key of the wallet that read it.
 * The unscoped key is dropped in the same step, so a later read for another
 * wallet cannot claim the same token.
 */
export function promoteUnscopedRow<T extends { accessToken: string }>(
  raw: string,
  data: T,
  store: Storage,
  scopedKey: string,
  unscopedKey: string,
  walletAddress: string
): void {
  const row = raw.startsWith(ENCRYPTED_PREFIX)
    ? raw
    : JSON.stringify({ wallet: walletAddress, token: data } satisfies PlaintextTokenRecord<T>);
  if (!store.getItem(scopedKey)) {
    store.setItem(scopedKey, row);
  }
  store.removeItem(unscopedKey);
}

/**
 * Read the first readable plain text row. The scoped key comes first, then the
 * legacy unscoped key. One key can hold a row in either storage, so each key
 * is checked in both. An unreadable value in one storage must not hide a
 * readable row in the other.
 */
export function readPlaintextToken<T extends { accessToken: string }>(
  scopedKey: string,
  unscopedKey: string,
  walletAddress?: string
): T | null {
  if (typeof window === "undefined") return null;
  const keys = scopedKey === unscopedKey ? [scopedKey] : [scopedKey, unscopedKey];
  for (const key of keys) {
    const candidates: [string | null, Storage][] = [
      [localStorage.getItem(key), localStorage],
      [sessionStorage.getItem(key), sessionStorage],
    ];
    for (const [raw, store] of candidates) {
      if (!raw) continue;
      const data = parsePlaintextToken<T>(raw, walletAddress);
      if (!data) continue;
      if (walletAddress && key === unscopedKey) {
        promoteUnscopedRow(raw, data, store, scopedKey, unscopedKey, walletAddress);
      }
      return data;
    }
  }
  return null;
}
