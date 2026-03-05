import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresMemoryStore, type PostgresClient } from "./postgresStore";

function makeRow(id: string, content: string, scope = "private") {
  return {
    id,
    content,
    scope,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    is_deleted: false,
  };
}

describe("PostgresMemoryStore", () => {
  let mockClient: PostgresClient;
  let store: PostgresMemoryStore;

  beforeEach(() => {
    mockClient = { query: vi.fn() };
    store = new PostgresMemoryStore({
      client: mockClient,
      accountId: "acc-1",
      appId: "app-1",
    });
  });

  describe("getAll", () => {
    it("queries with account_id and app_id", async () => {
      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] });

      await store.getAll();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("account_id = $1 AND app_id = $2"),
        ["acc-1", "app-1"]
      );
    });

    it("adds scope filter when scopes provided", async () => {
      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] });

      await store.getAll({ scopes: ["private", "shared"] });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("scope = ANY($3)"),
        ["acc-1", "app-1", ["private", "shared"]]
      );
    });

    it("maps rows to StoredVaultMemory", async () => {
      vi.mocked(mockClient.query).mockResolvedValue({
        rows: [makeRow("m1", "hello world")],
      });

      const results = await store.getAll();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        uniqueId: "m1",
        content: "hello world",
        scope: "private",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        isDeleted: false,
      });
    });
  });

  describe("getById", () => {
    it("returns memory when found", async () => {
      vi.mocked(mockClient.query).mockResolvedValue({
        rows: [makeRow("m1", "found it")],
      });

      const result = await store.getById("m1");

      expect(result).not.toBeNull();
      expect(result!.uniqueId).toBe("m1");
      expect(result!.content).toBe("found it");
    });

    it("returns null when not found", async () => {
      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] });

      const result = await store.getById("missing");

      expect(result).toBeNull();
    });

    it("queries with id, account_id, and app_id", async () => {
      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] });

      await store.getById("m1");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("id = $1 AND account_id = $2 AND app_id = $3"),
        ["m1", "acc-1", "app-1"]
      );
    });
  });

  describe("custom table", () => {
    it("uses custom table name", async () => {
      const customStore = new PostgresMemoryStore({
        client: mockClient,
        accountId: "acc-1",
        appId: "app-1",
        table: "custom_memories",
      });
      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] });

      await customStore.getAll();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM custom_memories"),
        expect.any(Array)
      );
    });
  });
});
