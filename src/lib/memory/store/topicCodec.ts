import { normalizeEntityName } from "../../db/entities/types.js";

export const ciphertextPattern = /^enc:v\d+:[0-9a-f]+$/i;
const topicHashPattern = /^[0-9a-f]{64}$/;
/** Nearby's limit for the sealed `name` of a hashed topic entry or catalog entry. */
export const MAX_SEALED_TOPIC_NAME_BYTES = 1024;

/**
 * Topic matching key: trimmed, lowercased and NFC-normalized, so composed and
 * decomposed spellings of one name (as different keyboards produce) hash alike.
 */
export function normalizeTopicName(name: string): string {
  return normalizeEntityName(name).normalize("NFC");
}

/** Whether every hashed entry of a sealed topics array fits nearby's name limit. */
export function sealedTopicNamesFit(json: string | undefined): boolean {
  return (entries(json) ?? []).every(
    (entry) =>
      !hashed(entry) ||
      typeof entry.name !== "string" ||
      entry.name.length <= MAX_SEALED_TOPIC_NAME_BYTES
  );
}

interface TopicCipher {
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertext: string) => Promise<string>;
  hashTopic: (normalized: string) => Promise<string>;
}

export interface SealedTopicName {
  name_hash: string;
  name: string;
}

export interface CatalogTopicFields {
  name: string;
  name_hash?: string;
}

export interface TopicCodec {
  hash(name: string): Promise<string | null>;
  seal(display: string): Promise<SealedTopicName | null>;
  open(entry: CatalogTopicFields): Promise<string>;
  encodeTopics(json: string): Promise<string>;
  decodeTopics(json: string): Promise<string>;
  isLegacy(json: string | undefined): boolean;
  matchesLegacy(
    json: unknown,
    names: ReadonlySet<string>,
    hashes: ReadonlySet<string>
  ): Promise<boolean>;
  encodeCatalog<T extends { name: string }>(
    topic: T
  ): Promise<(Omit<T, "name"> & SealedTopicName) | null>;
  decodeCatalog<T extends CatalogTopicFields>(item: T): Promise<Omit<T, "name_hash">>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashed(entry: unknown): entry is Record<string, unknown> & { name_hash: string } {
  return record(entry) && typeof entry.name_hash === "string";
}

function entries(json: string | undefined): unknown[] | undefined {
  if (typeof json !== "string") return undefined;
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>) {
  let pending = cache.get(key);
  if (!pending) {
    const loading = load();
    pending = loading;
    cache.set(key, loading);
    loading.catch(() => {
      if (cache.get(key) === loading) cache.delete(key);
    });
  }
  return pending;
}

export function createTopicCodec(cipher: TopicCipher): TopicCodec {
  const hashes = new Map<string, Promise<string>>();
  const opened = new Map<string, Promise<string>>();
  const seals = new Map<string, Promise<SealedTopicName>>();
  const legacyNames = new Map<string, Promise<string>>();

  const hash = async (name: string): Promise<string | null> => {
    const normalized = normalizeTopicName(name);
    if (!normalized) return null;
    return cached(hashes, normalized, async () => {
      const digest = await cipher.hashTopic(normalized);
      if (!topicHashPattern.test(digest))
        throw new Error("Topic hashing must return 64 lowercase hex characters");
      return digest;
    });
  };

  const seal = async (display: string): Promise<SealedTopicName | null> => {
    const nameHash = await hash(display);
    if (nameHash === null) return null;
    return cached(seals, display, async () => {
      const name = await cipher.encrypt(display);
      if (name === display || !ciphertextPattern.test(name))
        throw new Error(
          "Topic encryption must return SDK ciphertext; refusing to upload plaintext"
        );
      opened.set(name, Promise.resolve(display));
      return { name_hash: nameHash, name };
    });
  };

  // An entry without name_hash whose name is ciphertext was written back by a
  // client that dropped name_hash from a sealed entry. Its name is decrypted
  // rather than treated, and sealed again, as a plaintext name. A name that does
  // not decrypt under this key stays as it is.
  const plain = (name: string): Promise<string> => {
    if (!ciphertextPattern.test(name)) return Promise.resolve(name);
    let pending = legacyNames.get(name);
    if (!pending) {
      pending = cipher.decrypt(name).catch(() => name);
      legacyNames.set(name, pending);
    }
    return pending;
  };

  const open = async ({ name, name_hash: nameHash }: CatalogTopicFields): Promise<string> => {
    if (nameHash === undefined) return plain(name);
    if (
      typeof name !== "string" ||
      typeof nameHash !== "string" ||
      !topicHashPattern.test(nameHash) ||
      !ciphertextPattern.test(name)
    )
      throw new Error("Nearby returned a malformed topic name");
    const plaintext = await cached(opened, name, async () => {
      const value = await cipher.decrypt(name);
      if (value === name) throw new Error("Topic decryption failed");
      return value;
    });
    if ((await hash(plaintext)) !== nameHash) throw new Error("Topic name does not match its hash");
    if (!seals.has(plaintext)) seals.set(plaintext, Promise.resolve({ name_hash: nameHash, name }));
    return plaintext;
  };

  return {
    hash,
    seal,
    open,
    encodeTopics: async (json) => {
      const list = entries(json);
      if (!list) return json;
      const sealed = await Promise.all(
        list.map(async (entry) => {
          if (!record(entry) || typeof entry.name !== "string") return null;
          const name = await seal(await plain(entry.name));
          return name && { ...entry, name: name.name, name_hash: name.name_hash };
        })
      );
      return JSON.stringify(sealed.filter((entry) => entry !== null));
    },
    decodeTopics: async (json) => {
      const list = entries(json);
      if (
        !list?.some(
          (entry) =>
            hashed(entry) ||
            (record(entry) && typeof entry.name === "string" && ciphertextPattern.test(entry.name))
        )
      )
        return json;
      const decoded = await Promise.all(
        list.map(async (entry) => {
          if (!hashed(entry))
            return record(entry) && typeof entry.name === "string"
              ? { ...entry, name: await plain(entry.name) }
              : entry;
          const { name_hash: nameHash, ...rest } = entry;
          return { ...rest, name: await open({ name: entry.name as string, name_hash: nameHash }) };
        })
      );
      return JSON.stringify(decoded);
    },
    isLegacy: (json) =>
      (entries(json) ?? []).some(
        (entry) => record(entry) && typeof entry.name === "string" && !hashed(entry)
      ),
    matchesLegacy: async (json, names, hashes) => {
      const list = typeof json === "string" ? (entries(json) ?? []) : [];
      if (list.some((entry) => hashed(entry) && hashes.has(entry.name_hash))) return false;
      const legacy = await Promise.all(
        list.map(async (entry) =>
          record(entry) && typeof entry.name === "string" && !hashed(entry)
            ? normalizeTopicName(await plain(entry.name))
            : null
        )
      );
      return legacy.some((name) => name !== null && names.has(name));
    },
    encodeCatalog: async (topic) => {
      const sealed = await seal(normalizeTopicName(await plain(topic.name)));
      return sealed && { ...topic, name: sealed.name, name_hash: sealed.name_hash };
    },
    decodeCatalog: async (item) => {
      const { name_hash: nameHash, ...rest } = item;
      return { ...rest, name: await open({ name: item.name, name_hash: nameHash }) };
    },
  };
}
