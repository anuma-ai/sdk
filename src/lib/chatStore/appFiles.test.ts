import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createChatStoreHarness } from "../../../test/chat/vaultHarness";
import {
  appFileId,
  deleteAppFile,
  deleteSavedTool,
  getAppFile,
  listAppFiles,
  loadSavedTools,
  saveAppFile,
  saveSavedTool,
} from "./appFiles";
import { ChatStoreError } from "./types";

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

    expect(edited).toMatchObject({ path: "/slides.jsx", content: "v2", version: 2 });
    expect((await getAppFile(store, "conv_1", "/slides.jsx"))?.content).toBe("v2");
    expect((await listAppFiles(store, "conv_1")).map((f) => f.path).sort()).toEqual([
      "/index.html",
      "/slides.jsx",
    ]);
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
    expect((await listAppFiles(store, "conv_1")).map((f) => f.path)).toEqual(["/b.html"]);

    const conversation = (await harness.row("conversation", "conv_1"))!;
    await harness.write([
      {
        record: { ...conversation.record, isDeleted: true, updatedAt: 2, data: {} },
        expectedVersion: conversation.version,
      },
    ]);
    expect(await listAppFiles(store, "conv_1")).toEqual([]);
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
