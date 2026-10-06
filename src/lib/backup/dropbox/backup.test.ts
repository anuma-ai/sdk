/**
 * Dropbox export: one folder listing for each run, not one listing for each conversation.
 * The Dropbox API layer is mocked, so no test uses the network.
 */

import type { Database } from "@nozbe/watermelondb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "./api";
import { performDropboxExport } from "./backup";

vi.mock("./api", async (importOriginal) => {
  const orig = await importOriginal<typeof import("./api")>();
  return {
    ...orig,
    getDropboxFileMetadata: vi.fn(),
    listDropboxFiles: vi.fn(),
    uploadFileToDropbox: vi.fn(),
  };
});

// A row stands in for a stored conversation, so the test needs no database.
vi.mock("../../db/chat/operations", () => ({
  conversationToStoredRaw: (row: { conversationId: string; updatedAt: Date }) => row,
}));

const mocked = vi.mocked(api);

const T0 = Date.parse("2026-01-01T00:00:00Z");
const row = (id: string, updatedAt: number) => ({
  conversationId: id,
  updatedAt: new Date(updatedAt),
});
const dropboxFile = (name: string, modified: number): api.DropboxFile => ({
  id: `id-${name}`,
  name,
  path_lower: `/x/${name}`,
  path_display: `/x/${name}`,
  client_modified: new Date(modified).toISOString(),
  server_modified: new Date(modified).toISOString(),
  size: 1,
});

const fakeDatabase = (rows: unknown[]) =>
  ({ get: () => ({ query: () => ({ fetch: async () => rows }) }) }) as unknown as Database;

// The first query lists the conversations at the start of the run. Later queries read one
// conversation each, so they see an edit made after the run began.
const fakeDatabaseEditedDuringRun = (atStart: unknown[], later: unknown[]) => {
  let queries = 0;
  return {
    get: () => ({
      query: () => ({ fetch: async () => (queries++ === 0 ? atStart : later) }),
    }),
  } as unknown as Database;
};

// What Dropbox holds now. The folder listing and the single-file read both answer from it.
let remote: api.DropboxFile[] = [];
const listing = (files: api.DropboxFile[]) => {
  remote = files;
  mocked.listDropboxFiles.mockResolvedValue(files);
};

function makeDeps() {
  return {
    requestDropboxAccess: vi.fn(async () => "new-token"),
    requestEncryptionKey: vi.fn(async () => {}),
    exportConversation: vi.fn(async (_id: string, _address: string) => ({
      success: true,
      blob: new Blob(["x"]),
    })),
    importConversation: vi.fn(async () => ({ success: true })),
  };
}

describe("performDropboxExport", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocked.uploadFileToDropbox.mockResolvedValue({} as never);
    remote = [];
    mocked.getDropboxFileMetadata.mockImplementation(
      async (_token, filename) => remote.find((f) => f.name === filename) ?? null
    );
  });

  it("lists the folder once for many conversations", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`c${i}`, T0));
    mocked.listDropboxFiles.mockResolvedValue([]);

    const result = await performDropboxExport(fakeDatabase(rows), "0xabc", "tok", makeDeps());

    expect(mocked.listDropboxFiles).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, uploaded: 25, skipped: 0, total: 25 });
  });

  it("skips unchanged conversations and uploads the others in order", async () => {
    listing([dropboxFile("same.json", T0), dropboxFile("newer.json", T0)]);
    const deps = makeDeps();
    const progress = vi.fn();

    const result = await performDropboxExport(
      fakeDatabase([row("same", T0), row("newer", T0 + 1000), row("fresh", T0)]),
      "0xabc",
      "tok",
      deps,
      progress
    );

    expect(result).toEqual({ success: true, uploaded: 2, skipped: 1, total: 3 });
    expect(deps.exportConversation.mock.calls.map((c) => c[0])).toEqual(["newer", "fresh"]);
    expect(progress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("asks for a new token once on an auth error and lists again with it", async () => {
    mocked.listDropboxFiles.mockRejectedValueOnce(new Error("Dropbox list failed: 401"));
    mocked.listDropboxFiles.mockResolvedValueOnce([]);
    const deps = makeDeps();

    const result = await performDropboxExport(fakeDatabase([row("a", T0)]), "0xabc", "tok", deps);

    expect(deps.requestDropboxAccess).toHaveBeenCalledTimes(1);
    expect(mocked.listDropboxFiles.mock.calls.map((c) => c[0])).toEqual(["tok", "new-token"]);
    expect(result.uploaded).toBe(1);
  });

  it("uploads a conversation that was edited after the run began", async () => {
    listing([dropboxFile("a.json", T0)]);
    const database = fakeDatabaseEditedDuringRun([row("a", T0)], [row("a", T0 + 1000)]);

    const result = await performDropboxExport(database, "0xabc", "tok", makeDeps());

    expect(result).toEqual({ success: true, uploaded: 1, skipped: 0, total: 1 });
    expect(mocked.uploadFileToDropbox).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite a backup that another client wrote after the listing", async () => {
    listing([dropboxFile("a.json", T0)]);
    // Another client writes a newer file after the run listed the folder.
    mocked.getDropboxFileMetadata.mockResolvedValue(dropboxFile("a.json", T0 + 5000));
    const deps = makeDeps();

    const result = await performDropboxExport(
      fakeDatabase([row("a", T0 + 1000)]),
      "0xabc",
      "tok",
      deps
    );

    expect(result).toEqual({ success: true, uploaded: 0, skipped: 1, total: 1 });
    expect(mocked.uploadFileToDropbox).not.toHaveBeenCalled();
    expect(deps.exportConversation).not.toHaveBeenCalled();
  });

  it("uploads again when the file was deleted after the listing", async () => {
    listing([dropboxFile("a.json", T0)]);
    mocked.getDropboxFileMetadata.mockResolvedValue(null);

    const result = await performDropboxExport(
      fakeDatabase([row("a", T0 + 1000)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(result.uploaded).toBe(1);
    expect(mocked.uploadFileToDropbox).toHaveBeenCalledTimes(1);
  });

  it("uploads once when two rows share a conversation id", async () => {
    listing([]);
    mocked.uploadFileToDropbox.mockResolvedValue(dropboxFile("dup.json", Date.now()) as never);

    const result = await performDropboxExport(
      fakeDatabase([row("dup", T0), row("dup", T0)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(mocked.uploadFileToDropbox).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, uploaded: 1, skipped: 1, total: 2 });
  });
});
