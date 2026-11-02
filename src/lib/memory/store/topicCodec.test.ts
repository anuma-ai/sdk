import { describe, expect, it, vi } from "vitest";

import { deriveMemoryKeyRing, memoryCipher } from "./memoryKeys";
import { createTopicCodec } from "./topicCodec";

async function setup() {
  const cipher = memoryCipher(await deriveMemoryKeyRing(`0x${"d4".repeat(65)}`));
  const spies = {
    encrypt: vi.fn(cipher.encrypt),
    decrypt: vi.fn(cipher.decrypt),
    hashTopic: vi.fn(cipher.hashTopic),
  };
  return { cipher, spies, codec: createTopicCodec(spies) };
}

describe("topic codec", () => {
  it("round-trips memory topics with key order preserved and no plaintext names", async () => {
    const { codec } = await setup();
    const json = JSON.stringify([
      { name: "Paris", kind: "place", source: "auto", weight: 0.6 },
      { name: "Chess", source: "user" },
    ]);
    const wire = await codec.encodeTopics(json);
    expect(wire).not.toContain("Paris");
    expect(wire).not.toContain("Chess");
    const entries = JSON.parse(wire) as Record<string, unknown>[];
    expect(Object.keys(entries[0])).toEqual(["name", "kind", "source", "weight", "name_hash"]);
    expect(entries[0]).toMatchObject({ kind: "place", source: "auto", weight: 0.6 });
    expect(entries[0].name).toMatch(/^enc:v3:[0-9a-f]+$/);
    expect(entries[0].name_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(codec.isLegacy(wire)).toBe(false);

    const reader = createTopicCodec((await setup()).cipher);
    expect(await reader.decodeTopics(wire)).toBe(json);
  });

  it("hashes casing variants of one topic alike but keeps each display name", async () => {
    const { codec } = await setup();
    const wire = JSON.parse(
      await codec.encodeTopics(JSON.stringify([{ name: "Paris" }, { name: " paris " }]))
    ) as { name: string; name_hash: string }[];
    expect(wire[0].name_hash).toBe(wire[1].name_hash);
    expect(wire[0].name).not.toBe(wire[1].name);
    expect(wire[0].name_hash).toBe(await codec.hash("PARIS"));
    expect(await codec.hash("   ")).toBeNull();
  });

  it("drops entries without a usable name", async () => {
    const { codec } = await setup();
    const wire = await codec.encodeTopics(
      JSON.stringify([{ name: "  " }, "Loose", { kind: "x" }, { name: "Kept" }])
    );
    expect(wire).not.toContain("Loose");
    expect(JSON.parse(await codec.decodeTopics(wire))).toEqual([{ name: "Kept" }]);
  });

  it("rejects a name whose hash does not match", async () => {
    const { codec } = await setup();
    const [paris] = JSON.parse(
      await codec.encodeTopics(JSON.stringify([{ name: "Paris" }]))
    ) as Record<string, string>[];
    const tampered = JSON.stringify([{ ...paris, name_hash: await codec.hash("london") }]);
    await expect(codec.decodeTopics(tampered)).rejects.toThrow("does not match its hash");
    await expect(codec.decodeTopics(JSON.stringify([{ ...paris, name: "Paris" }]))).rejects.toThrow(
      "malformed"
    );
  });

  it("passes legacy and unparseable values through and reports legacy entries", async () => {
    const { codec } = await setup();
    const legacy = JSON.stringify([{ name: "Paris" }]);
    expect(await codec.decodeTopics(legacy)).toBe(legacy);
    expect(codec.isLegacy(legacy)).toBe(true);
    expect(await codec.decodeTopics("not json")).toBe("not json");
    expect(await codec.encodeTopics("not json")).toBe("not json");
    expect(codec.isLegacy("not json")).toBe(false);
    expect(codec.isLegacy(undefined)).toBe(false);
    const mixed = JSON.stringify([
      ...(JSON.parse(await codec.encodeTopics(legacy)) as unknown[]),
      { name: "Lisbon" },
    ]);
    expect(codec.isLegacy(mixed)).toBe(true);
    expect(JSON.parse(await codec.decodeTopics(mixed))).toEqual([
      { name: "Paris" },
      { name: "Lisbon" },
    ]);
  });

  it("decrypts each distinct ciphertext once and reuses ciphertext per display name", async () => {
    const writer = (await setup()).codec;
    const wire = await writer.encodeTopics(JSON.stringify([{ name: "Paris" }]));
    const { codec, spies } = await setup();
    await Promise.all([codec.decodeTopics(wire), codec.decodeTopics(wire)]);
    await codec.decodeTopics(wire);
    expect(spies.decrypt).toHaveBeenCalledTimes(1);
    expect(await codec.encodeTopics(JSON.stringify([{ name: "Paris" }]))).toBe(wire);
    expect(spies.encrypt).not.toHaveBeenCalled();
    await codec.encodeTopics(JSON.stringify([{ name: "Rome" }, { name: "Rome" }]));
    expect(spies.encrypt).toHaveBeenCalledTimes(1);
  });

  it("refuses to upload a name that encryption leaves as plaintext", async () => {
    const { cipher } = await setup();
    const codec = createTopicCodec({ ...cipher, encrypt: async (text) => text });
    await expect(codec.encodeTopics(JSON.stringify([{ name: "Paris" }]))).rejects.toThrow(
      "refusing to upload plaintext"
    );
  });

  it("seals catalog names in canonical form", async () => {
    const { codec } = await setup();
    const sealed = await codec.encodeCatalog({ name: " Coffee ", kind: "drink" });
    expect(sealed).toMatchObject({ kind: "drink", name_hash: await codec.hash("coffee") });
    expect(await codec.decodeCatalog(sealed!)).toEqual({ name: "coffee", kind: "drink" });
    expect(await codec.encodeCatalog({ name: " " })).toBeNull();
  });
});
