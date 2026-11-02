import { describe, expect, it, vi } from "vitest";

import { getLogger } from "../../logger";

import { deriveMemoryKeyRing, memoryCipher } from "./memoryKeys";
import { type NearbyRequest, RemoteMemoryError } from "./remotePersistence";
import {
  createRemoteTopic,
  createRemoteTopicPersistence,
  type RemoteTopicPersistence,
  upgradeLegacyTopicCatalog,
} from "./remoteTopics";
import { createTopicCodec } from "./topicCodec";

const entry = {
  name: "coffee",
  version: 2,
  is_deleted: false,
  server_updated_at: "2026-10-20T00:00:00Z",
};

const cipher = memoryCipher(await deriveMemoryKeyRing(`0x${"e5".repeat(65)}`));
const codec = () => createTopicCodec(cipher);
const sealed = async (name: string, extra: Record<string, unknown> = {}) => ({
  ...entry,
  ...extra,
  ...(await codec().encodeCatalog({ name })),
});

function fakeCatalog(items: Record<string, unknown>[], failPut?: (name: unknown) => Error | null) {
  const catalog = structuredClone(items);
  const request = vi.fn<NearbyRequest>(async (path, init = {}) => {
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    if (path === "/topics/import") {
      for (const t of body.topics as Record<string, unknown>[])
        if (!catalog.some((c) => c.name_hash === t.name_hash))
          catalog.push({ ...entry, is_deleted: false, ...t, version: 1 });
      return {};
    }
    if (init.method === "PUT") {
      const t = body.topic as Record<string, unknown>;
      const failure = failPut?.(t.name);
      if (failure) throw failure;
      const index = catalog.findIndex((c) => c.name_hash === undefined && c.name === t.name);
      if (index < 0 || catalog[index].version !== body.expected_version)
        throw new RemoteMemoryError("conflict", 409, "version_conflict");
      catalog[index] = { ...entry, ...t, version: (body.expected_version as number) + 1 };
      return catalog[index];
    }
    return { items: structuredClone(catalog) };
  });
  const liveLegacy = () =>
    catalog.filter((c) => c.name_hash === undefined && !c.is_deleted).map((c) => c.name);
  return { catalog, request, liveLegacy };
}

const putBodies = (request: ReturnType<typeof fakeCatalog>["request"]) =>
  request.mock.calls
    .filter((call) => call[1]?.method === "PUT")
    .map((call) => JSON.parse(String(call[1]?.body)) as Record<string, unknown>);

describe("remote topic catalog", () => {
  it("pages and decrypts metadata including deletions and batches sealed imports at 50 topics", async () => {
    const request = vi
      .fn<NearbyRequest>()
      .mockResolvedValueOnce({ items: [await sealed("coffee")], next_cursor: "next" })
      .mockResolvedValueOnce({ items: [await sealed("old", { is_deleted: true })] });
    const persistence = createRemoteTopicPersistence(request, codec());
    expect(await persistence.topics()).toEqual([
      entry,
      { ...entry, name: "old", is_deleted: true },
    ]);
    expect(request.mock.calls[1][0]).toBe("/topics?limit=200&cursor=next");
    request.mockClear().mockResolvedValue(undefined);
    await persistence.importTopics(Array.from({ length: 123 }, (_, i) => ({ name: `T-${i}` })));
    const bodies = request.mock.calls.map(
      (call) => JSON.parse(String(call[1]?.body)) as { topics: Record<string, string>[] }
    );
    expect(bodies.map((body) => body.topics.length)).toEqual([50, 50, 23]);
    expect(JSON.stringify(bodies)).not.toMatch(/t-\d/i);
    expect(bodies[0].topics[0]).toEqual({
      name: expect.stringMatching(/^enc:v3:/),
      name_hash: await codec().hash("t-0"),
    });
  });

  it("does not accept malformed catalog versions or names that do not match their hash", async () => {
    const request = vi
      .fn<NearbyRequest>()
      .mockResolvedValue({ items: [{ ...entry, version: -1 }] });
    await expect(createRemoteTopicPersistence(request, codec()).topics()).rejects.toThrow(
      "Invalid nearby topic"
    );
    request.mockResolvedValue({
      items: [{ ...(await sealed("coffee")), name_hash: await codec().hash("tea") }],
    });
    await expect(createRemoteTopicPersistence(request, codec()).topics()).rejects.toThrow(
      "does not match its hash"
    );
  });

  it("hides a legacy entry once its hashed entry exists and creates the hashed entry on write", async () => {
    const request = vi.fn<NearbyRequest>().mockResolvedValue({
      items: [
        { ...entry, name: "coffee", version: 7 },
        await sealed("coffee", { version: 1 }),
        { ...entry, name: "tea", version: 4 },
      ],
    });
    const persistence = createRemoteTopicPersistence(request, codec());
    expect((await persistence.topics()).map((t) => [t.name, t.version])).toEqual([
      ["coffee", 1],
      ["tea", 4],
    ]);
    request.mockResolvedValueOnce(await sealed("tea", { version: 1 }));
    expect(await persistence.putTopic({ name: "tea", is_deleted: true }, 4)).toMatchObject({
      name: "tea",
      version: 1,
    });
    const body = JSON.parse(String(request.mock.calls.at(-1)![1]?.body)) as {
      topic: Record<string, unknown>;
      expected_version: number;
    };
    expect(body.expected_version).toBe(0);
    expect(body.topic).toMatchObject({ is_deleted: true, name_hash: await codec().hash("tea") });
    expect(JSON.stringify(body)).not.toContain('"tea"');
  });

  it("upgrades only legacy entries that have no hashed entry, keeping kind and deletion", async () => {
    const vault = fakeCatalog([
      { ...entry, name: "coffee" },
      await sealed("coffee"),
      { ...entry, name: "tea", kind: "drink", is_deleted: true },
      { ...entry, name: "cake" },
    ]);
    const upgrade = codec();
    expect(await upgradeLegacyTopicCatalog(vault.request, upgrade)).toBe(2);
    const [, [path, init]] = vault.request.mock.calls;
    expect(path).toBe("/topics/import");
    const topics = (JSON.parse(String(init?.body)) as { topics: Record<string, unknown>[] }).topics;
    expect(topics).toEqual([
      {
        name: expect.stringMatching(/^enc:v3:/),
        name_hash: await upgrade.hash("tea"),
        kind: "drink",
        is_deleted: true,
      },
      { name: expect.stringMatching(/^enc:v3:/), name_hash: await upgrade.hash("cake") },
    ]);
  });

  it("retires live legacy entries once their hashed entry exists", async () => {
    const vault = fakeCatalog([
      { ...entry, name: "Coffee", kind: "drink", version: 5 },
      { ...entry, name: "tea", is_deleted: true, version: 3 },
      { ...entry, name: "cake", version: 2 },
      await sealed("cake", { version: 9 }),
    ]);
    const upgrade = codec();
    expect(await upgradeLegacyTopicCatalog(vault.request, upgrade)).toBe(2);
    expect(putBodies(vault.request)).toEqual([
      { topic: { name: "Coffee", kind: "drink", is_deleted: true }, expected_version: 5 },
      { topic: { name: "cake", is_deleted: true }, expected_version: 2 },
    ]);
    expect(vault.liveLegacy()).toEqual([]);
    expect(
      (await createRemoteTopicPersistence(vault.request, upgrade).topics()).map((t) => [
        t.name,
        t.kind,
        t.version,
        t.is_deleted,
      ])
    ).toEqual([
      ["cake", undefined, 9, false],
      ["coffee", "drink", 1, false],
      ["tea", undefined, 1, true],
    ]);
    vault.request.mockClear();
    expect(await upgradeLegacyTopicCatalog(vault.request, upgrade)).toBe(0);
    expect(vault.request.mock.calls.map((call) => call[1]?.method ?? "GET")).toEqual(["GET"]);
  });

  it("imports a live legacy duplicate over a deleted one", async () => {
    const vault = fakeCatalog([
      { ...entry, name: "Coffee", is_deleted: true },
      { ...entry, name: "coffee", version: 4 },
    ]);
    const upgrade = codec();
    await upgradeLegacyTopicCatalog(vault.request, upgrade);
    expect(putBodies(vault.request)).toEqual([
      { topic: { name: "coffee", is_deleted: true }, expected_version: 4 },
    ]);
    expect(
      (await createRemoteTopicPersistence(vault.request, upgrade).topics()).map((t) => [
        t.name,
        t.is_deleted,
      ])
    ).toEqual([["coffee", false]]);
  });

  it("skips legacy entries changed elsewhere and continues past failed retirements", async () => {
    const vault = fakeCatalog(
      [
        { ...entry, name: "coffee", version: 2 },
        { ...entry, name: "tea", version: 2 },
        { ...entry, name: "cake", version: 2 },
      ],
      (name) => (name === "cake" ? new RemoteMemoryError("unavailable", 503) : null)
    );
    vault.request.mockImplementationOnce(async () => ({
      items: [
        { ...entry, name: "coffee", version: 1 },
        { ...entry, name: "tea", version: 2 },
        { ...entry, name: "cake", version: 2 },
      ],
    }));
    const upgrade = codec();
    const warn = vi.spyOn(getLogger(), "warn").mockImplementation(() => {});
    await expect(upgradeLegacyTopicCatalog(vault.request, upgrade)).resolves.toBe(3);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][1]).toMatchObject({ status: 503 });
    warn.mockRestore();
    expect(putBodies(vault.request).map((b) => (b.topic as { name: string }).name)).toEqual([
      "coffee",
      "tea",
      "cake",
    ]);
    expect(vault.liveLegacy()).toEqual(["coffee", "cake"]);
    expect(
      (await createRemoteTopicPersistence(vault.request, upgrade).topics()).map((t) => [
        t.name,
        t.is_deleted,
      ])
    ).toEqual([
      ["coffee", false],
      ["tea", false],
      ["cake", false],
    ]);
  });

  it("stops retiring legacy entries when cancelled", async () => {
    const controller = new AbortController();
    const vault = fakeCatalog([
      { ...entry, name: "coffee" },
      { ...entry, name: "tea" },
    ]);
    vault.request.mockImplementation(async (path, init) => {
      if (init?.method !== "PUT") return path === "/topics/import" ? {} : { items: vault.catalog };
      controller.abort(new Error("cancelled"));
      throw new Error("aborted");
    });
    await expect(
      upgradeLegacyTopicCatalog(vault.request, codec(), controller.signal)
    ).rejects.toThrow("aborted");
    expect(putBodies(vault.request)).toHaveLength(1);
  });

  it.each([1, 123])("honors cancellation for an import of %i topics", async (count) => {
    const topics = Array.from({ length: count }, (_, i) => ({ name: `t-${i}` }));
    const controller = new AbortController();
    const request = vi.fn<NearbyRequest>().mockResolvedValue(undefined);
    const persistence = createRemoteTopicPersistence(request, codec());
    await persistence.importTopics(topics, controller.signal);
    expect(request.mock.calls).toHaveLength(Math.ceil(count / 50));
    expect(request.mock.calls.every((call) => call[2] === controller.signal)).toBe(true);

    request.mockClear().mockImplementation(async () => controller.abort(new Error("cancelled")));
    await expect(persistence.importTopics(topics, controller.signal)).rejects.toThrow("cancelled");
    expect(request).toHaveBeenCalledTimes(1);
    request.mockClear();
    await expect(persistence.importTopics(topics, controller.signal)).rejects.toThrow("cancelled");
    expect(request).not.toHaveBeenCalled();
  });

  it("restores a topic only on an explicit create with the current version", async () => {
    const persistence: RemoteTopicPersistence = {
      topics: vi.fn(async () => [{ ...entry, is_deleted: true }]),
      putTopic: vi.fn(async () => ({ ...entry, version: 3 })),
      importTopics: vi.fn(),
    };
    expect(await createRemoteTopic(persistence, " COFFEE ")).toBe("coffee");
    expect(persistence.putTopic).toHaveBeenCalledWith({ name: "coffee", is_deleted: false }, 2);
  });

  it("coalesces concurrent creates without overwriting a deletion", async () => {
    const topics = vi
      .fn<RemoteTopicPersistence["topics"]>()
      .mockResolvedValueOnce([])
      .mockResolvedValue([entry]);
    const persistence: RemoteTopicPersistence = {
      topics,
      putTopic: vi
        .fn()
        .mockRejectedValue(new RemoteMemoryError("conflict", 409, "version_conflict")),
      importTopics: vi.fn(),
    };
    expect(await createRemoteTopic(persistence, "coffee")).toBe("coffee");
    topics.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...entry, is_deleted: true }]);
    await expect(createRemoteTopic(persistence, "coffee")).rejects.toThrow("conflict");
  });
});
