import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createFileStore, dumpFiles, type FileStore } from "./setup";

const tmpDirs: string[] = [];

function makeTmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "anuma-dump-"));
  tmpDirs.push(d);
  return d;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const d = tmpDirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

function seedStore(content: string): FileStore {
  const store = createFileStore();
  store.set("slides.jsx", content);
  return store;
}

describe("dumpFiles", () => {
  it("writes index.html for a deck with at least one slide", () => {
    const outDir = makeTmp();
    const store = seedStore(
      `<Anuma.Deck fontPreset="default"><Anuma.Slide id="s1" /></Anuma.Deck>`
    );
    const dir = dumpFiles(store, "happy-path", { outDir });
    expect(fs.existsSync(path.join(dir, "index.html"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "FAILED.txt"))).toBe(false);
  });

  it("writes FAILED.txt instead of index.html when the deck has zero slides", () => {
    const outDir = makeTmp();
    const store = seedStore(`<Anuma.Deck fontPreset="default" />`);
    const dir = dumpFiles(store, "empty-deck", { outDir });
    expect(fs.existsSync(path.join(dir, "index.html"))).toBe(false);
    const failedPath = path.join(dir, "FAILED.txt");
    expect(fs.existsSync(failedPath)).toBe(true);
    const reason = fs.readFileSync(failedPath, "utf-8");
    expect(reason).toMatch(/zero <Anuma.Slide>/);
  });

  it("writes FAILED.txt when slides.jsx is missing entirely", () => {
    const outDir = makeTmp();
    const store = createFileStore();
    const dir = dumpFiles(store, "no-slides-file", { outDir });
    expect(fs.existsSync(path.join(dir, "index.html"))).toBe(false);
    const reason = fs.readFileSync(path.join(dir, "FAILED.txt"), "utf-8");
    expect(reason).toMatch(/missing or unparseable/);
  });

  it("writes FAILED.txt when slides.jsx is unparseable", () => {
    const outDir = makeTmp();
    const store = seedStore("this is not JSX");
    const dir = dumpFiles(store, "bad-jsx", { outDir });
    expect(fs.existsSync(path.join(dir, "index.html"))).toBe(false);
    const reason = fs.readFileSync(path.join(dir, "FAILED.txt"), "utf-8");
    expect(reason).toMatch(/missing or unparseable/);
  });

  it("writes FAILED.txt when meta.error is passed even if the deck has slides", () => {
    const outDir = makeTmp();
    const store = seedStore(
      `<Anuma.Deck fontPreset="default"><Anuma.Slide id="s1" /></Anuma.Deck>`
    );
    const dir = dumpFiles(store, "partial-failure", {
      outDir,
      error: "SSE 503 from upstream",
    });
    expect(fs.existsSync(path.join(dir, "FAILED.txt"))).toBe(true);
    const reason = fs.readFileSync(path.join(dir, "FAILED.txt"), "utf-8");
    expect(reason).toMatch(/SSE 503 from upstream/);
  });

  it("returns the dump directory path", () => {
    const outDir = makeTmp();
    const store = seedStore(`<Anuma.Deck fontPreset="default" />`);
    const dir = dumpFiles(store, "path-check", { outDir });
    expect(dir).toBe(path.join(outDir, "path-check"));
  });

  it("clears a stale FAILED.txt left by a prior failed run when a new run succeeds", () => {
    const outDir = makeTmp();
    const emptyStore = seedStore(`<Anuma.Deck fontPreset="default" />`);
    const dir = dumpFiles(emptyStore, "rerun", { outDir });
    expect(fs.existsSync(path.join(dir, "FAILED.txt"))).toBe(true);

    const goodStore = seedStore(
      `<Anuma.Deck fontPreset="default"><Anuma.Slide id="s1" /></Anuma.Deck>`
    );
    dumpFiles(goodStore, "rerun", { outDir });
    expect(fs.existsSync(path.join(dir, "FAILED.txt"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "index.html"))).toBe(true);
  });
});
