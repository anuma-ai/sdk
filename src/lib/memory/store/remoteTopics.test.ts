import { describe, expect, it, vi } from "vitest";

import { type NearbyRequest, RemoteMemoryError } from "./remotePersistence";
import {
  createRemoteTopic,
  createRemoteTopicPersistence,
  type RemoteTopicPersistence,
} from "./remoteTopics";

const entry = {
  name: "coffee",
  version: 2,
  is_deleted: false,
  server_updated_at: "2026-10-20T00:00:00Z",
};

describe("remote topic catalog", () => {
  it("pages metadata including deletions and batches imports at 50 topics", async () => {
    const request = vi
      .fn<NearbyRequest>()
      .mockResolvedValueOnce({ items: [entry], next_cursor: "next" })
      .mockResolvedValueOnce({ items: [{ ...entry, name: "old", is_deleted: true }] });
    const persistence = createRemoteTopicPersistence(request);
    expect(await persistence.topics()).toHaveLength(2);
    expect(request.mock.calls[1][0]).toBe("/topics?limit=200&cursor=next");
    request.mockClear().mockResolvedValue(undefined);
    await persistence.importTopics(Array.from({ length: 123 }, (_, i) => ({ name: `t-${i}` })));
    expect(
      request.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).topics.length)
    ).toEqual([50, 50, 23]);
  });

  it("does not accept malformed catalog versions", async () => {
    const request = vi
      .fn<NearbyRequest>()
      .mockResolvedValue({ items: [{ ...entry, version: -1 }] });
    await expect(createRemoteTopicPersistence(request).topics()).rejects.toThrow(
      "Invalid nearby topic"
    );
  });

  it.each([1, 123])("honors cancellation for an import of %i topics", async (count) => {
    const topics = Array.from({ length: count }, (_, i) => ({ name: `t-${i}` }));
    const controller = new AbortController();
    const request = vi.fn<NearbyRequest>().mockResolvedValue(undefined);
    const persistence = createRemoteTopicPersistence(request);
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
