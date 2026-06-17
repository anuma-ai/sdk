import { describe, expect, it } from "vitest";
import type { ToolConfig } from "../../lib/chat/useChat/types.js";
import { MapFileStorage } from "../appGeneration.js";
import { createDocumentTools, type CreateDocumentToolsOptions } from "./index.js";

const BASE = `<Document><Page><Text>Hello world</Text></Page></Document>`;

type Overrides = Partial<CreateDocumentToolsOptions>;

function makeDocumentTools(overrides?: Overrides) {
  const storage = (overrides?.storage as MapFileStorage) ?? new MapFileStorage();
  const tools = createDocumentTools({
    getConversationId: () => "conv-1",
    storage,
    logError: () => undefined,
    ...overrides,
  });
  const find = (name: string): ToolConfig => {
    const t = tools.find((tt) => (tt.function as { name: string }).name === name);
    if (!t) throw new Error(`tool ${name} not found`);
    return t;
  };
  return {
    storage,
    createDocument: find("create_document"),
    readDocument: find("read_document"),
    patchDocument: find("patch_document"),
  };
}

type Result = Record<string, unknown>;

describe("createDocumentTools — render failure after persist", () => {
  it("create_document: a displayDocument throw reports the saved-but-unrendered state", async () => {
    const { createDocument, storage } = makeDocumentTools({
      displayDocument: async () => {
        throw new Error("render boom");
      },
    });

    const res = (await createDocument.executor!({ source: BASE })) as Result;

    // The source is on disk even though rendering failed...
    expect(storage.getAll().get("document.jsx")).toBe(BASE);
    // ...and the error makes the persisted state explicit, not "Failed to create".
    expect(res.success).toBeUndefined();
    expect(res.error).toMatch(/saved but failed to render/);
    expect(res.error).toMatch(/render boom/);
  });

  it("patch_document: a displayDocument throw reports applied+persisted, not a generic failure", async () => {
    let renderShouldThrow = false;
    const { createDocument, readDocument, patchDocument, storage } = makeDocumentTools({
      displayDocument: async () => {
        if (renderShouldThrow) throw new Error("render boom");
        return {};
      },
    });

    await createDocument.executor!({ source: BASE });
    await readDocument.executor!({});

    renderShouldThrow = true;
    const res = (await patchDocument.executor!({
      patches: [{ find: "Hello world", replace: "Hi there" }],
    })) as Result;

    const patched = `<Document><Page><Text>Hi there</Text></Page></Document>`;
    // The patch was applied and saved despite the render throw.
    expect(storage.getAll().get("document.jsx")).toBe(patched);
    expect(res.success).toBe(false);
    expect(res.applied).toBe(1);
    expect(res.persisted).toBe(true);
    expect(res.renderError).toMatch(/render boom/);
    expect(res.message).toMatch(/do NOT resend the same patch/);
    // Not the generic mutation-failure path.
    expect(res.error).toBeUndefined();
  });
});

describe("createDocumentTools — title carry-over", () => {
  it("patch re-render reuses the title supplied to create_document", async () => {
    const seenTitles: Array<string | undefined> = [];
    const { createDocument, readDocument, patchDocument } = makeDocumentTools({
      displayDocument: async (args) => {
        seenTitles.push(args.title as string | undefined);
        return {};
      },
    });

    await createDocument.executor!({ documentId: "nda", title: "My NDA", source: BASE });
    await readDocument.executor!({ documentId: "nda" });
    await patchDocument.executor!({
      documentId: "nda",
      patches: [{ find: "Hello world", replace: "Hi there" }],
    });

    // Both the create render and the patch re-render carry the same title.
    expect(seenTitles).toEqual(["My NDA", "My NDA"]);
  });
});
