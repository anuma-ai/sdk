import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createChatStoreHarness } from "../../../test/chat/vaultHarness";
import {
  appFileId,
  deleteAppFile,
  deleteSavedTool,
  getAppFile,
  listAppFiles,
  listEveryAppFile,
  loadSavedTools,
  saveAppFile,
  saveSavedTool,
} from "./appFiles";
import { type ChatSnapshot, type ChatStore, ChatStoreError } from "./types";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

async function withConversation(id = "conv_1") {
  const harness = await createChatStoreHarness();
  await harness.write([
    {
      record: {
        kind: "conversation",
        id,
        conversationId: "",
        sortKey: 1,
        createdAt: 1,
        updatedAt: 1,
        isDeleted: false,
        data: { title: "Deck" },
      },
      expectedVersion: 0,
    },
  ]);
  return harness;
}

const tool = {
  name: "tip_calculator",
  displayName: "Tip calculator",
  description: "Splits a bill",
  parameters: "{}",
  html: "<main></main>",
  conversationId: "conv_1",
};

describe("app files in vault", () => {
  it("keeps a conversation's files, edited in place, under ids that do not reveal the path", async () => {
    const harness = await withConversation();
    const { store } = harness;

    await saveAppFile(store, { conversationId: "conv_1", path: "/slides.jsx", content: "v1" });
    await saveAppFile(store, { conversationId: "conv_1", path: "/index.html", content: "<p/>" });
    const edited = await saveAppFile(store, {
      conversationId: "conv_1",
      path: "/slides.jsx",
      content: "v2",
    });

    expect(edited).toMatchObject({ path: "slides.jsx", content: "v2", version: 2 });
    expect((await getAppFile(store, "conv_1", "/slides.jsx"))?.content).toBe("v2");
    expect((await listAppFiles(store, "conv_1")).map((f) => f.path).sort()).toEqual([
      "index.html",
      "slides.jsx",
    ]);
    expect(await appFileId("conv_1", "slides.jsx")).toBe(await appFileId("conv_1", "/slides.jsx"));
    expect((await getAppFile(store, "conv_1", "slides.jsx"))?.content).toBe("v2");
    const id = await appFileId("conv_1", "/slides.jsx");
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toBe(await appFileId("conv_2", "/slides.jsx"));
    expect((await harness.row("app_file", id))?.record.conversationId).toBe("conv_1");
  });

  it("forgets a deleted file and the files of a deleted conversation", async () => {
    const harness = await withConversation();
    const { store } = harness;
    await saveAppFile(store, { conversationId: "conv_1", path: "/a.html", content: "a" });
    await saveAppFile(store, { conversationId: "conv_1", path: "/b.html", content: "b" });

    await deleteAppFile(store, "conv_1", "/a.html");
    const writes = harness.calls.filter((c) => c === "putMany").length;
    await deleteAppFile(store, "conv_1", "/never-saved.html");
    await deleteAppFile(store, "conv_1", "/a.html");
    expect(harness.calls.filter((c) => c === "putMany")).toHaveLength(writes);
    expect(await getAppFile(store, "conv_1", "/a.html")).toBeNull();
    expect((await listAppFiles(store, "conv_1")).map((f) => f.path)).toEqual(["b.html"]);

    const conversation = (await harness.row("conversation", "conv_1"))!;
    await harness.write([
      {
        record: { ...conversation.record, isDeleted: true, updatedAt: 2, data: {} },
        expectedVersion: conversation.version,
      },
    ]);
    expect(await listAppFiles(store, "conv_1")).toEqual([]);
  });

  it("lists every live file across conversations, at its latest content", async () => {
    const harness = await withConversation();
    const { store } = harness;
    await harness.write([
      {
        record: {
          kind: "conversation",
          id: "conv_2",
          conversationId: "",
          sortKey: 2,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: false,
          data: {},
        },
        expectedVersion: 0,
      },
    ]);
    await saveAppFile(store, { conversationId: "conv_1", path: "/slides.jsx", content: "v1" });
    await saveAppFile(store, { conversationId: "conv_2", path: "/slides.jsx", content: "two" });
    await saveAppFile(store, { conversationId: "conv_1", path: "/gone.html", content: "x" });
    await saveAppFile(store, { conversationId: "conv_1", path: "/slides.jsx", content: "v2" });
    await deleteAppFile(store, "conv_1", "/gone.html");
    await saveSavedTool(store, "tool_1", tool);

    const every = await listEveryAppFile(store);

    expect(every.map((f) => [f.conversationId, f.path, f.content]).sort()).toEqual([
      ["conv_1", "slides.jsx", "v2"],
      ["conv_2", "slides.jsx", "two"],
    ]);
  });

  it("keeps a file's latest copy when the feed returns it again on a later page", async () => {
    const snapshot = (content: string): ChatSnapshot => ({
      record: {
        kind: "app_file",
        id: "f1",
        conversationId: "conv_1",
        sortKey: 0,
        createdAt: 1,
        updatedAt: 1,
        isDeleted: false,
        data: { path: "/slides.jsx", content },
      },
      version: 1,
      serverUpdatedAt: "",
    });
    const changes = vi
      .fn()
      .mockResolvedValueOnce({ items: [snapshot("old")], nextCursor: "1", changesCursor: "1" })
      .mockResolvedValueOnce({ items: [snapshot("new")], changesCursor: "2" });

    const every = await listEveryAppFile({ changes } as unknown as ChatStore);

    expect(every.map((f) => f.content)).toEqual(["new"]);
    expect(changes.mock.calls.map(([, options]) => options.kinds)).toEqual([
      ["app_file"],
      ["app_file"],
    ]);
  });

  it("saves over a write another device made meanwhile", async () => {
    const harness = await withConversation();
    harness.fail({
      op: "putMany",
      error: new ChatStoreError("changed", 409, "version_conflict"),
    });

    const saved = await saveAppFile(harness.store, {
      conversationId: "conv_1",
      path: "/slides.jsx",
      content: "mine",
    });

    expect(saved.content).toBe("mine");
  });
});

describe("saved tools in vault", () => {
  it("saves, replaces, lists and deletes a tool", async () => {
    const { store } = await withConversation();

    await saveSavedTool(store, "tool_1", tool);
    await saveSavedTool(store, "tool_1", { ...tool, displayName: "Bill splitter" });
    await saveSavedTool(store, "tool_2", { ...tool, name: "unit_converter", conversationId: null });

    const tools = await loadSavedTools(store);
    expect(tools.map((t) => [t.id, t.displayName, t.conversationId]).sort()).toEqual([
      ["tool_1", "Bill splitter", "conv_1"],
      ["tool_2", "Tip calculator", null],
    ]);

    await deleteSavedTool(store, "tool_1");
    expect((await loadSavedTools(store)).map((t) => t.id)).toEqual(["tool_2"]);
  });
});
