import { describe, expect, it, vi } from "vitest";

import type { PdfExportProgress } from "./pdf-export";
import { exportMarkdownToPdf } from "./pdf-export";

describe("exportMarkdownToPdf", () => {
  it("produces a valid Blob from basic markdown", async () => {
    const blob = await exportMarkdownToPdf("# Hello\n\nWorld");

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a valid Blob from empty markdown", async () => {
    const blob = await exportMarkdownToPdf("");

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("applies page size option", async () => {
    const a4Blob = await exportMarkdownToPdf("# Test", { pageSize: "a4" });
    const letterBlob = await exportMarkdownToPdf("# Test", { pageSize: "letter" });

    expect(a4Blob).toBeInstanceOf(Blob);
    expect(letterBlob).toBeInstanceOf(Blob);
    // Different page sizes produce different output
    expect(a4Blob.size).not.toBe(letterBlob.size);
  });

  it("renders a title when provided", async () => {
    const withTitle = await exportMarkdownToPdf("Hello", { title: "My Document" });
    const withoutTitle = await exportMarkdownToPdf("Hello");

    expect(withTitle.size).toBeGreaterThan(withoutTitle.size);
  });

  it("handles headings at all levels", async () => {
    const md = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;
    const blob = await exportMarkdownToPdf(md);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles code blocks", async () => {
    const md = "```javascript\nconst x = 1;\nconsole.log(x);\n```";
    const blob = await exportMarkdownToPdf(md);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles ordered and unordered lists", async () => {
    const md = `- item a\n- item b\n\n1. first\n2. second`;
    const blob = await exportMarkdownToPdf(md);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles blockquotes", async () => {
    const md = "> This is a blockquote\n> with multiple lines";
    const blob = await exportMarkdownToPdf(md);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles tables", async () => {
    const md = `| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |`;
    const blob = await exportMarkdownToPdf(md);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles horizontal rules", async () => {
    const md = "Above\n\n---\n\nBelow";
    const blob = await exportMarkdownToPdf(md);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces multi-page output for long content", async () => {
    const longParagraph = "This is a paragraph of text. ".repeat(200);
    const md = Array.from({ length: 10 }, () => longParagraph).join("\n\n");

    const longBlob = await exportMarkdownToPdf(md);
    const shortBlob = await exportMarkdownToPdf("Short");

    expect(longBlob.size).toBeGreaterThan(shortBlob.size);
  });

  it("respects custom margins and fontSize", async () => {
    const blob = await exportMarkdownToPdf("# Test\n\nContent", {
      margins: { top: 30, right: 30, bottom: 30, left: 30 },
      fontSize: 16,
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("fires onProgress callbacks with correct stages", async () => {
    const events: PdfExportProgress[] = [];
    const onProgress = vi.fn((p: PdfExportProgress) => events.push({ ...p }));

    await exportMarkdownToPdf("# Hello\n\nWorld\n\n- One\n- Two", { onProgress });

    expect(onProgress).toHaveBeenCalled();
    // Should start with "preparing" stage
    expect(events[0].stage).toBe("preparing");
    // Should end with "complete" at 100%
    const last = events[events.length - 1];
    expect(last.stage).toBe("complete");
    expect(last.percent).toBe(100);
    // Should have "building" stages in between
    const buildingEvents = events.filter((e) => e.stage === "building");
    expect(buildingEvents.length).toBeGreaterThan(0);
    // Percent should be monotonically non-decreasing
    for (let i = 1; i < events.length; i++) {
      expect(events[i].percent).toBeGreaterThanOrEqual(events[i - 1].percent);
    }
  });

  it("fires onProgress for empty markdown", async () => {
    const events: PdfExportProgress[] = [];
    await exportMarkdownToPdf("", {
      onProgress: (p) => events.push({ ...p }),
    });

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].stage).toBe("preparing");
    expect(events[events.length - 1].stage).toBe("complete");
  });
});
