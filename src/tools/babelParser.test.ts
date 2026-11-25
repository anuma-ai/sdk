import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ToolConfig } from "../lib/chat/useChat/types.js";

const DOC = `<Document><Page><Text>Hello</Text></Page></Document>`;

async function freshModules() {
  vi.resetModules();
  const [parser, jsx, dsl, app, document, slides] = await Promise.all([
    import("./babelParser.js"),
    import("./slides/jsx.js"),
    import("./document/dsl.js"),
    import("./appGeneration.js"),
    import("./document/index.js"),
    import("./slides/index.js"),
  ]);
  return { parser, jsx, dsl, app, document, slides };
}

function findTool(tools: ToolConfig[], name: string): ToolConfig {
  const tool = tools.find((t) => (t.function as { name: string }).name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("lazy @babel/parser", () => {
  let mods: Awaited<ReturnType<typeof freshModules>>;

  beforeEach(async () => {
    mods = await freshModules();
  });

  it("throws a clear error from the sync parsers before the parser is loaded", () => {
    expect(() => mods.jsx.parseJsx(`<div />`)).toThrow(
      "parseJsx needs @babel/parser, which is loaded lazily. Call and await loadBabelParser() first."
    );
    expect(() => mods.dsl.parseDocumentDsl(DOC)).toThrow(
      "parseDocumentDsl needs @babel/parser, which is loaded lazily. Call and await loadBabelParser() first."
    );
  });

  it("does not wrap the not-loaded error as a parse error", () => {
    let thrown: unknown;
    try {
      mods.jsx.parseJsx(`<div />`);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(mods.jsx.AnumaJsxError);
  });

  it("parses synchronously once loadBabelParser has resolved", async () => {
    await mods.parser.loadBabelParser();
    expect(mods.jsx.parseJsx(`<h1>Hi</h1>`)).toEqual({
      tag: "h1",
      attrs: {},
      children: ["Hi"],
    });
    expect(mods.dsl.parseDocumentDsl(DOC).tag).toBe("Document");
  });

  it("keeps the existing parse-error messages after loading", async () => {
    await mods.parser.loadBabelParser();
    expect(() => mods.jsx.parseJsx(`<div>`)).toThrow(mods.jsx.AnumaJsxError);
    expect(() => mods.jsx.parseJsx(`<div>`)).toThrow(
      "Invalid JSX: Unexpected token (1:5) (line 1:5)"
    );
    expect(() => mods.dsl.parseDocumentDsl(`<Document>`)).toThrow(mods.dsl.DocDslError);
    expect(() => mods.dsl.parseDocumentDsl(`<Document>`)).toThrow(
      "Invalid JSX: Unexpected token (1:10) (line 1:10)"
    );
  });

  it("shares one module load across concurrent callers", async () => {
    await Promise.all([mods.parser.loadBabelParser(), mods.parser.loadBabelParser()]);
    expect(() => mods.jsx.parseJsx(`<div />`)).not.toThrow();
  });

  it("validateFileContent loads the parser itself", async () => {
    expect(await mods.app.validateFileContent("App.jsx", "<div />\n")).toBeNull();
    expect(await mods.app.validateFileContent("bad.js", "const x = ;\n")).toEqual({
      line: 1,
      column: 10,
      message: "Unexpected token",
    });
  });

  it("create_document validates without a prior loadBabelParser call", async () => {
    const tools = mods.document.createDocumentTools({
      getConversationId: () => "conv-1",
      storage: new mods.app.MapFileStorage(),
      logError: () => undefined,
      displayDocument: () => undefined,
    });
    const create = findTool(tools, "create_document");

    const bad = (await create.executor!({ documentId: "nda", source: `<Document>` })) as Record<
      string,
      unknown
    >;
    expect(bad.error).toBe(
      "Invalid document DSL: Invalid JSX: Unexpected token (1:10) (line 1:10)"
    );

    const ok = (await create.executor!({ documentId: "nda", source: DOC })) as Record<
      string,
      unknown
    >;
    expect(ok.error).toBeUndefined();
  });

  it("slide tools load the parser before parsing the stored deck", async () => {
    const storage = new mods.app.MapFileStorage();
    await storage.putFile(
      "conv-1",
      mods.slides.SLIDES_FILE_PATH,
      `<Anuma.Deck id="deck"><Anuma.Slide id="s1" /></Anuma.Deck>`
    );
    const tools = mods.slides.createSlideTools({
      getConversationId: () => "conv-1",
      storage,
      displaySlides: async (args) => ({ ...args, displayType: "slides" }),
    });
    const read = findTool(tools, "read_slides");

    const result = (await read.executor!({})) as Record<string, unknown>;
    expect(result.error).toBeUndefined();
  });
});
