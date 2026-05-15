/**
 * Unit coverage for `dumpFiles` in setup.ts. Runs against a tmp dir so
 * the canonical `.output/` isn't polluted. Lives under test/ rather
 * than src/ because the SUT itself is a test helper; vitest.config.mts
 * explicitly includes this file.
 *
 * The reason this exists: an earlier e2e run produced empty Deck-shell
 * `slides.jsx` files (test errored before any add_slide landed) and
 * those got listed in the top-level .output/index.html as if they had
 * passed. dumpFiles now writes a FAILED.txt for those cases and skips
 * the index entry — this test pins that behavior.
 */

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
    // A deck shell with no <Anuma.Slide> child is the canonical "test
    // errored before any add_slide landed" failure mode.
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
    const store = createFileStore(); // no slides.jsx
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
    // Caller knows the run errored mid-flow after a few add_slide calls
    // landed. Surface that in the dump so reviewers see the partial
    // result is from a failed run.
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
    // Reproduces a real e2e churn: a test failed → FAILED.txt written.
    // The next run with the same testName succeeds — without cleanup,
    // reviewers see FAILED.txt sitting next to a valid index.html and
    // can't tell whether the dump passed or failed at a glance.
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
