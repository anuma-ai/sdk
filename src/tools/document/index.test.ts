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

describe("createDocumentTools — create_document", () => {
  it("validates, persists, and reports success for the default document", async () => {
    const { createDocument, storage } = makeDocumentTools();
    const res = (await createDocument.executor!({ source: BASE })) as Result;
    expect(res.success).toBe(true);
    expect(res.documentId).toBe("document");
    expect(storage.getAll().get("document.jsx")).toBe(BASE);
  });

  it("rejects invalid DSL with a structured dslError and does not persist", async () => {
    const { createDocument, storage } = makeDocumentTools();
    const res = (await createDocument.executor!({
      source: `<Page><Text>x</Text></Page>`,
    })) as Result;
    expect(res.success).toBeUndefined();
    expect(res.error).toMatch(/Invalid document DSL/);
    expect(res.dslError).toBeDefined();
    expect(storage.getAll().size).toBe(0);
  });

  it("rejects an empty source", async () => {
    const { createDocument } = makeDocumentTools();
    const res = (await createDocument.executor!({ source: "   " })) as Result;
    expect(res.error).toMatch(/source is required/);
  });

  it("rejects a documentId that is not a safe slug", async () => {
    const { createDocument } = makeDocumentTools();
    const res = (await createDocument.executor!({
      documentId: "../etc/passwd",
      source: BASE,
    })) as Result;
    expect(res.error).toMatch(/Invalid documentId/);
  });

  it("errors when there is no active conversation", async () => {
    const { createDocument } = makeDocumentTools({ getConversationId: () => null });
    const res = (await createDocument.executor!({ source: BASE })) as Result;
    expect(res.error).toMatch(/No active conversation/);
  });

  it("keeps distinct documentIds in separate files", async () => {
    const { createDocument, storage } = makeDocumentTools();
    await createDocument.executor!({ documentId: "nda", source: BASE });
    await createDocument.executor!({ documentId: "cover-letter", source: BASE });
    expect(storage.getAll().has("nda.jsx")).toBe(true);
    expect(storage.getAll().has("cover-letter.jsx")).toBe(true);
  });
});

describe("createDocumentTools — read_document", () => {
  it("errors before the document exists", async () => {
    const { readDocument } = makeDocumentTools();
    const res = (await readDocument.executor!({})) as Result;
    expect(res.error).toMatch(/No document/);
  });

  it("returns line-numbered source after create", async () => {
    const { createDocument, readDocument } = makeDocumentTools();
    await createDocument.executor!({ source: BASE });
    const res = (await readDocument.executor!({})) as Result;
    expect(res.documentId).toBe("document");
    expect((res.source as string).startsWith("1: ")).toBe(true);
  });
});

describe("createDocumentTools — patch_document", () => {
  it("refuses an empty patches array", async () => {
    const { patchDocument } = makeDocumentTools();
    const res = (await patchDocument.executor!({ patches: [] })) as Result;
    expect(res.error).toMatch(/patches array is required/);
  });

  it("enforces read-before-write on a document it has not seen", async () => {
    const storage = new MapFileStorage();
    storage.getAll().set("document.jsx", BASE);
    const { patchDocument } = makeDocumentTools({ storage });
    const res = (await patchDocument.executor!({
      patches: [{ find: "Hello world", replace: "Hi" }],
    })) as Result;
    expect(res.success).toBeUndefined();
    expect(res.error).toMatch(/Call read_document/);
  });

  it("applies a patch and persists after a prior read", async () => {
    const { createDocument, readDocument, patchDocument, storage } = makeDocumentTools();
    await createDocument.executor!({ source: BASE });
    await readDocument.executor!({});
    const res = (await patchDocument.executor!({
      patches: [{ find: "Hello world", replace: "Hi there" }],
    })) as Result;
    expect(res.success).toBe(true);
    expect(res.applied).toBe(1);
    expect(storage.getAll().get("document.jsx")).toBe(
      `<Document><Page><Text>Hi there</Text></Page></Document>`
    );
  });

  it("reports a single not-found patch without modifying the document", async () => {
    const { createDocument, readDocument, patchDocument, storage } = makeDocumentTools();
    await createDocument.executor!({ source: BASE });
    await readDocument.executor!({});
    const res = (await patchDocument.executor!({
      patches: [{ find: "does-not-exist", replace: "x" }],
    })) as Result;
    expect(res.success).toBe(false);
    expect(res.failed).toBe(1);
    expect(Array.isArray(res.failedPatches)).toBe(true);
    expect(storage.getAll().get("document.jsx")).toBe(BASE);
  });

  it("demands a re-read after two consecutive not-found failures", async () => {
    const { createDocument, readDocument, patchDocument } = makeDocumentTools();
    await createDocument.executor!({ source: BASE });
    await readDocument.executor!({});
    const r1 = (await patchDocument.executor!({
      patches: [{ find: "nope-one", replace: "x" }],
    })) as Result;
    expect(r1.message).not.toMatch(/STOP retrying/);
    const r2 = (await patchDocument.executor!({
      patches: [{ find: "nope-two", replace: "x" }],
    })) as Result;
    expect(r2.message).toMatch(/STOP retrying/);
  });

  it("re-validates the patched source and rejects an edit that breaks the DSL", async () => {
    const { createDocument, readDocument, patchDocument, storage } = makeDocumentTools();
    await createDocument.executor!({ source: BASE });
    await readDocument.executor!({});
    const res = (await patchDocument.executor!({
      patches: [{ find: "</Text>", replace: "</Tex>" }],
    })) as Result;
    expect(res.success).toBe(false);
    expect(res.dslError).toBeDefined();
    expect(res.message).toMatch(/invalid document/);
    // Invalid result is rejected before persisting.
    expect(storage.getAll().get("document.jsx")).toBe(BASE);
  });
});

describe("createDocumentTools — display result + conversation scope", () => {
  it("spreads the displayDocument return value into the create result", async () => {
    const { createDocument } = makeDocumentTools({
      displayDocument: async () => ({ pdfId: "pdf_123" }),
    });
    const res = (await createDocument.executor!({ source: BASE })) as Result;
    expect(res.success).toBe(true);
    expect(res.pdfId).toBe("pdf_123");
  });

  it("does not let displayDocument clobber the tool's own status fields", async () => {
    const { createDocument, readDocument, patchDocument } = makeDocumentTools({
      displayDocument: async () => ({ success: false, documentId: "evil", error: "nope" }),
    });
    const created = (await createDocument.executor!({ source: BASE })) as Result;
    expect(created.success).toBe(true);
    expect(created.documentId).toBe("document");
    expect(created.error).toBeUndefined();

    await readDocument.executor!({});
    const patched = (await patchDocument.executor!({
      patches: [{ find: "Hello world", replace: "Hi there" }],
    })) as Result;
    expect(patched.success).toBe(true);
    expect(patched.applied).toBe(1);
    expect(patched.documentId).toBe("document");
  });

  it("scopes the read-before-write gate per conversation", async () => {
    let conv = "conv-A";
    const { createDocument, readDocument, patchDocument } = makeDocumentTools({
      getConversationId: () => conv,
    });
    await createDocument.executor!({ source: BASE });
    await readDocument.executor!({});

    // Same document, different conversation: the seen-state must not carry over.
    conv = "conv-B";
    const res = (await patchDocument.executor!({
      patches: [{ find: "Hello world", replace: "Hi" }],
    })) as Result;
    expect(res.error).toMatch(/Call read_document/);
  });
});
