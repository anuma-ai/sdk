/**
 * Google Drive export: one folder listing for each run, not one lookup for each conversation.
 * The Drive API layer is mocked, so no test uses the network.
 */

import type { Database } from "@nozbe/watermelondb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "./api";
import { performGoogleDriveExport } from "./backup";

vi.mock("./api", async (importOriginal) => {
  const orig = await importOriginal<typeof import("./api")>();
  return {
    ...orig,
    getBackupFolder: vi.fn(),
    getDriveFileMetadata: vi.fn(),
    listAllDriveFiles: vi.fn(),
    updateDriveFile: vi.fn(),
    uploadFileToDrive: vi.fn(),
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
const driveFile = (name: string, modified: number): api.DriveFile => ({
  id: `file-${name}`,
  name,
  createdTime: new Date(T0).toISOString(),
  modifiedTime: new Date(modified).toISOString(),
  size: "1",
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

// What Drive holds now. The folder listing and the single-file read both answer from it.
let remote: api.DriveFile[] = [];
const listing = (files: api.DriveFile[]) => {
  remote = files;
  mocked.listAllDriveFiles.mockResolvedValue(files);
};

function makeDeps() {
  return {
    requestDriveAccess: vi.fn(async () => "new-token"),
    requestEncryptionKey: vi.fn(async () => {}),
    exportConversation: vi.fn(async (_id: string, _address: string) => ({
      success: true,
      blob: new Blob(["x"]),
    })),
    importConversation: vi.fn(async () => ({ success: true })),
  };
}

describe("performGoogleDriveExport", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocked.getBackupFolder.mockResolvedValue("folder-1");
    mocked.uploadFileToDrive.mockResolvedValue({ id: "n", name: "n" });
    mocked.updateDriveFile.mockResolvedValue({ id: "n", name: "n" });
    remote = [];
    mocked.getDriveFileMetadata.mockImplementation(
      async (_token, id) => remote.find((f) => f.id === id) ?? null
    );
  });

  it("lists the folder once for many conversations", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`c${i}`, T0));
    mocked.listAllDriveFiles.mockResolvedValue([]);

    const result = await performGoogleDriveExport(fakeDatabase(rows), "0xabc", "tok", makeDeps());

    expect(mocked.listAllDriveFiles).toHaveBeenCalledTimes(1);
    expect(mocked.listAllDriveFiles).toHaveBeenCalledWith("tok", "folder-1");
    // The folder lookup runs once at the start of the run, not once for each conversation.
    expect(mocked.getBackupFolder).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, uploaded: 25, skipped: 0, total: 25 });
  });

  it("skips unchanged conversations, updates changed ones and uploads new ones in order", async () => {
    const rows = [
      row("same", T0), // local equals remote: skip
      row("older", T0 - 1000), // local older than remote: skip
      row("newer", T0 + 1000), // local newer than remote: update
      row("fresh", T0), // not on Drive: upload
    ];
    listing([driveFile("same.json", T0), driveFile("older.json", T0), driveFile("newer.json", T0)]);
    const deps = makeDeps();
    const progress = vi.fn();

    const result = await performGoogleDriveExport(
      fakeDatabase(rows),
      "0xabc",
      "tok",
      deps,
      progress
    );

    expect(result).toEqual({ success: true, uploaded: 2, skipped: 2, total: 4 });
    expect(deps.exportConversation.mock.calls.map((c) => c[0])).toEqual(["newer", "fresh"]);
    expect(mocked.updateDriveFile).toHaveBeenCalledTimes(1);
    expect(mocked.updateDriveFile.mock.calls[0][1]).toBe("file-newer.json");
    expect(mocked.uploadFileToDrive).toHaveBeenCalledTimes(1);
    expect(mocked.uploadFileToDrive.mock.calls[0][3]).toBe("fresh.json");
    expect(progress.mock.calls).toEqual([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
  });

  it("counts a conversation as failed when the export fails and goes on with the next one", async () => {
    mocked.listAllDriveFiles.mockResolvedValue([]);
    const deps = makeDeps();
    deps.exportConversation.mockResolvedValueOnce({ success: false } as never);

    const result = await performGoogleDriveExport(
      fakeDatabase([row("a", T0), row("b", T0)]),
      "0xabc",
      "tok",
      deps
    );

    expect(result).toEqual({ success: true, uploaded: 1, skipped: 0, total: 2 });
  });

  it("lists again for the next conversation when a listing fails", async () => {
    mocked.listAllDriveFiles.mockRejectedValueOnce(new Error("Failed to list files: 500"));
    mocked.listAllDriveFiles.mockResolvedValueOnce([]);

    const result = await performGoogleDriveExport(
      fakeDatabase([row("a", T0), row("b", T0)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(mocked.listAllDriveFiles).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, uploaded: 1, skipped: 0, total: 2 });
  });

  it("asks for a new token once on an auth error and lists again with it", async () => {
    mocked.listAllDriveFiles.mockRejectedValueOnce(new Error("Failed to list files: 401"));
    mocked.listAllDriveFiles.mockResolvedValueOnce([]);
    const deps = makeDeps();

    const result = await performGoogleDriveExport(
      fakeDatabase([row("a", T0)]),
      "0xabc",
      "tok",
      deps
    );

    expect(deps.requestDriveAccess).toHaveBeenCalledTimes(1);
    expect(mocked.listAllDriveFiles.mock.calls.map((c) => c[0])).toEqual(["tok", "new-token"]);
    expect(mocked.uploadFileToDrive.mock.calls[0][0]).toBe("new-token");
    expect(result.uploaded).toBe(1);
  });

  it("keeps the first file when two files share a name", async () => {
    listing([
      driveFile("dup.json", T0 + 5000),
      { ...driveFile("dup.json", T0 - 5000), id: "second" },
    ]);

    const result = await performGoogleDriveExport(
      fakeDatabase([row("dup", T0)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(result.skipped).toBe(1);
  });

  it("uploads a conversation that was edited after the run began", async () => {
    listing([driveFile("a.json", T0)]);
    // At the start the conversation is unchanged. By its turn the user has edited it.
    const database = fakeDatabaseEditedDuringRun([row("a", T0)], [row("a", T0 + 1000)]);

    const result = await performGoogleDriveExport(database, "0xabc", "tok", makeDeps());

    expect(result).toEqual({ success: true, uploaded: 1, skipped: 0, total: 1 });
    expect(mocked.updateDriveFile).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite a backup that another client wrote after the listing", async () => {
    listing([driveFile("a.json", T0)]);
    // Another client writes a newer file after the run listed the folder.
    mocked.getDriveFileMetadata.mockResolvedValue(driveFile("a.json", T0 + 5000));
    const deps = makeDeps();

    const result = await performGoogleDriveExport(
      fakeDatabase([row("a", T0 + 1000)]),
      "0xabc",
      "tok",
      deps
    );

    expect(result).toEqual({ success: true, uploaded: 0, skipped: 1, total: 1 });
    expect(mocked.getDriveFileMetadata).toHaveBeenCalledWith("tok", "file-a.json");
    expect(mocked.updateDriveFile).not.toHaveBeenCalled();
    expect(deps.exportConversation).not.toHaveBeenCalled();
  });

  it("creates the file again when it was deleted after the listing", async () => {
    listing([driveFile("a.json", T0)]);
    mocked.getDriveFileMetadata.mockResolvedValue(null);

    const result = await performGoogleDriveExport(
      fakeDatabase([row("a", T0 + 1000)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(result.uploaded).toBe(1);
    expect(mocked.updateDriveFile).not.toHaveBeenCalled();
    expect(mocked.uploadFileToDrive).toHaveBeenCalledTimes(1);
  });

  it("reads one file once for each changed conversation and not for unchanged ones", async () => {
    listing([driveFile("same.json", T0), driveFile("newer.json", T0)]);

    await performGoogleDriveExport(
      fakeDatabase([row("same", T0), row("newer", T0 + 1000), row("fresh", T0)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(mocked.listAllDriveFiles).toHaveBeenCalledTimes(1);
    expect(mocked.getDriveFileMetadata).toHaveBeenCalledTimes(1);
  });

  it("creates one file when two rows share a conversation id", async () => {
    listing([]);
    mocked.uploadFileToDrive.mockResolvedValue({ id: "created", name: "dup.json" });

    const result = await performGoogleDriveExport(
      fakeDatabase([row("dup", T0), row("dup", T0)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(mocked.uploadFileToDrive).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, uploaded: 1, skipped: 1, total: 2 });
  });

  it("updates one file when two rows share the id of a file that exists", async () => {
    listing([driveFile("dup.json", T0)]);

    const result = await performGoogleDriveExport(
      fakeDatabase([row("dup", T0 + 1000), row("dup", T0 + 1000)]),
      "0xabc",
      "tok",
      makeDeps()
    );

    expect(mocked.updateDriveFile).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, uploaded: 1, skipped: 1, total: 2 });
  });

  it("stops listing after three failed listings and fails the other conversations fast", async () => {
    mocked.listAllDriveFiles.mockRejectedValue(new Error("Failed to list files: 503"));
    const rows = Array.from({ length: 10 }, (_, i) => row(`c${i}`, T0));
    const deps = makeDeps();

    const result = await performGoogleDriveExport(fakeDatabase(rows), "0xabc", "tok", deps);

    // Before the cap, each of the 10 conversations listed the whole folder again.
    expect(mocked.listAllDriveFiles).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ success: true, uploaded: 0, skipped: 0, total: 10 });
    expect(mocked.uploadFileToDrive).not.toHaveBeenCalled();
  });

  it("does not ask for a new token for each conversation when the listing keeps failing with 401", async () => {
    mocked.listAllDriveFiles.mockRejectedValue(new Error("Failed to list files: 401"));
    const rows = Array.from({ length: 10 }, (_, i) => row(`c${i}`, T0));
    const deps = makeDeps();

    await performGoogleDriveExport(fakeDatabase(rows), "0xabc", "tok", deps);

    // The listing is tried three times. Each of the first conversations may ask once, but the
    // conversations after the cap fail with an error that holds no status code.
    expect(deps.requestDriveAccess.mock.calls.length).toBeLessThanOrEqual(3);
    expect(mocked.listAllDriveFiles.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("returns early with no listing when there are no conversations", async () => {
    const result = await performGoogleDriveExport(fakeDatabase([]), "0xabc", "tok", makeDeps());
    expect(mocked.listAllDriveFiles).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, uploaded: 0, skipped: 0, total: 0 });
  });
});

describe("listAllDriveFiles", () => {
  const realApi = async () =>
    (await vi.importActual<typeof import("./api")>("./api")).listAllDriveFiles;

  it("follows nextPageToken, asks for 1000 files a page and joins the pages", async () => {
    const listAll = await realApi();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [driveFile("a.json", T0)], nextPageToken: "t2" }))
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [driveFile("b.json", T0)], nextPageToken: "t3" }))
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [driveFile("c.json", T0)] })));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const files = await listAll("tok", "folder-1");

      expect(files.map((f) => f.name)).toEqual(["a.json", "b.json", "c.json"]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls[0]).toContain("pageSize=1000");
      expect(urls[0]).not.toContain("pageToken");
      expect(urls[1]).toContain("pageToken=t2");
      expect(urls[2]).toContain("pageToken=t3");
      expect(decodeURIComponent(urls[0])).toContain("nextPageToken");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("throws on a failed page", async () => {
    const listAll = await realApi();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 403 })));
    try {
      await expect(listAll("tok", "folder-1")).rejects.toThrow("Failed to list files: 403");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
