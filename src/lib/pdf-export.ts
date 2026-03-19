import type { jsPDF as JsPDFType } from "jspdf";
import type { Token, Tokens } from "marked";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for PDF export.
 * @category PDF Export
 */
export interface PdfExportOptions {
  /** Page size (default: "a4") */
  pageSize?: "a4" | "letter" | "legal";
  /** Font size in points for body text (default: 12) */
  fontSize?: number;
  /** Document title rendered at top of first page */
  title?: string;
  /** Page margins in mm (default: 20 on all sides) */
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Whether to include page numbers (default: true) */
  pageNumbers?: boolean;
  /** Filename used by the download helpers (default: "document.pdf") */
  filename?: string;
}

// ---------------------------------------------------------------------------
// Lazy-loaded modules (same pattern as pdf.ts)
// ---------------------------------------------------------------------------

type JsPDFModule = typeof import("jspdf");
type Html2CanvasModule = typeof import("html2canvas");
type MarkedModule = typeof import("marked");

let jspdfModule: JsPDFModule | null = null;
let html2canvasModule: Html2CanvasModule | null = null;
let markedModule: MarkedModule | null = null;

async function getJsPDF(): Promise<JsPDFModule> {
  if (!jspdfModule) {
    jspdfModule = await import("jspdf");
  }
  return jspdfModule;
}

async function getHtml2Canvas(): Promise<Html2CanvasModule> {
  if (!html2canvasModule) {
    html2canvasModule = await import("html2canvas");
  }
  return html2canvasModule;
}

async function getMarked(): Promise<MarkedModule> {
  if (!markedModule) {
    markedModule = await import("marked");
  }
  return markedModule;
}

/** @internal Reset lazy-loaded module cache. Exposed for testing only. */
export function _resetModuleCache(): void {
  jspdfModule = null;
  html2canvasModule = null;
  markedModule = null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type PageSizeKey = NonNullable<PdfExportOptions["pageSize"]>;

const PAGE_SIZES: Record<PageSizeKey, [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
  legal: [215.9, 355.6],
};

const HEADING_SIZES: Record<number, number> = {
  1: 24,
  2: 20,
  3: 16,
  4: 14,
  5: 13,
  6: 12,
};

/** Spacing constants in mm for consistent layout */
const SPACING = {
  /** Small gap after paragraphs, lists, headings-after */
  SM: 2,
  /** Medium gap before headings, between blocks */
  MD: 3,
  /** Large gap after titles, code blocks */
  LG: 4,
  /** Extra-large gap after HRs */
  XL: 5,
  /** List item indent */
  LIST_INDENT: 6,
  /** Blockquote indent */
  QUOTE_INDENT: 8,
  /** Blockquote total inset (border + padding) */
  QUOTE_INSET: 10,
  /** Code block internal padding */
  CODE_PAD: 4,
  /** Table cell padding */
  TABLE_CELL_PAD: 2,
} as const;

const DEFAULT_FILENAME = "document.pdf";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ResolvedOptions {
  pageSize: [number, number];
  fontSize: number;
  title: string | undefined;
  margins: { top: number; right: number; bottom: number; left: number };
  pageNumbers: boolean;
  filename: string;
}

function resolveOptions(options?: PdfExportOptions): ResolvedOptions {
  const size = options?.pageSize ?? "a4";
  return {
    pageSize: PAGE_SIZES[size] ?? PAGE_SIZES.a4,
    fontSize: options?.fontSize ?? 12,
    title: options?.title,
    margins: {
      top: options?.margins?.top ?? 20,
      right: options?.margins?.right ?? 20,
      bottom: options?.margins?.bottom ?? 20,
      left: options?.margins?.left ?? 20,
    },
    pageNumbers: options?.pageNumbers ?? true,
    filename: options?.filename ?? DEFAULT_FILENAME,
  };
}

function resolveJsPDFConstructor(mod: JsPDFModule): typeof JsPDFType {
  return mod.jsPDF ?? (mod as unknown as { default: typeof JsPDFType }).default;
}

function createPdfDoc(
  JsPDF: typeof JsPDFType,
  pageW: number,
  pageH: number,
): InstanceType<typeof JsPDFType> {
  return new JsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageW, pageH],
  });
}

function addPageNumbers(
  doc: InstanceType<typeof JsPDFType>,
  pageW: number,
  pageH: number,
): void {
  const totalPages = doc.getNumberOfPages();
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
  }
}

function usableContentWidth(pageW: number, m: ResolvedOptions["margins"]): number {
  return pageW - m.left - m.right;
}

/** Strip inline markdown tokens to plain text */
function tokensToPlainText(tokens: Token[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "text":
      case "codespan":
      case "escape":
        parts.push(token.text);
        break;
      case "strong":
      case "em":
      case "del":
      case "link":
        parts.push(tokensToPlainText(token.tokens ?? []));
        break;
      case "br":
        parts.push("\n");
        break;
      default:
        parts.push(token.raw);
        break;
    }
  }
  return parts.join("");
}

// ---------------------------------------------------------------------------
// DOM capture path — exportElementToPdf
// ---------------------------------------------------------------------------

/**
 * Capture a rendered HTML element as a high-fidelity PDF.
 *
 * Uses html2canvas to snapshot the element, then embeds the canvas image
 * into a jsPDF document. Multi-page content is automatically split.
 *
 * @category PDF Export
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<Blob> {
  const [jspdfMod, html2canvasMod] = await Promise.all([getJsPDF(), getHtml2Canvas()]);
  const html2canvas = html2canvasMod.default ?? html2canvasMod;
  const opts = resolveOptions(options);
  const [pageW, pageH] = opts.pageSize;

  // Clone element so we can force light-mode styles without affecting the UI
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#1a1a1a";
  clone.classList.remove("dark:prose-invert");
  // Ensure the clone is in the DOM but invisible (html2canvas needs it attached)
  clone.style.position = "fixed";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.width = `${element.offsetWidth}px`;

  // Temporarily remove dark mode so Tailwind dark: utilities resolve to light values
  const root = document.documentElement;
  const hadDark = root.classList.contains("dark");
  if (hadDark) root.classList.remove("dark");

  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      useCORS: true,
      allowTaint: false,
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    const cw = usableContentWidth(pageW, opts.margins);
    const scale = cw / imgWidthPx;
    const imgHeightMm = imgHeightPx * scale;
    const usablePageH = pageH - opts.margins.top - opts.margins.bottom;

    const JsPDF = resolveJsPDFConstructor(jspdfMod);
    const doc = createPdfDoc(JsPDF, pageW, pageH);

    // Reuse a single slice canvas to avoid per-page allocation + PNG encode overhead
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgWidthPx;
    const sliceCtx = sliceCanvas.getContext("2d");
    if (!sliceCtx) {
      throw new Error("Unable to obtain 2D canvas context for PDF slicing");
    }

    let remainingH = imgHeightMm;
    let srcYPx = 0;
    let page = 0;

    while (remainingH > 0) {
      if (page > 0) doc.addPage();

      const sliceHMm = Math.min(remainingH, usablePageH);
      const sliceHPx = sliceHMm / scale;

      sliceCanvas.height = Math.ceil(sliceHPx);
      sliceCtx.clearRect(0, 0, imgWidthPx, sliceCanvas.height);
      sliceCtx.drawImage(canvas, 0, srcYPx, imgWidthPx, sliceHPx, 0, 0, imgWidthPx, sliceHPx);

      doc.addImage(sliceCanvas, "PNG", opts.margins.left, opts.margins.top, cw, sliceHMm);

      srcYPx += sliceHPx;
      remainingH -= sliceHMm;
      page++;
    }

    if (opts.pageNumbers) {
      addPageNumbers(doc, pageW, pageH);
    }

    return doc.output("blob");
  } finally {
    document.body.removeChild(clone);
    if (hadDark) root.classList.add("dark");
  }
}

// ---------------------------------------------------------------------------
// Headless path — exportMarkdownToPdf
// ---------------------------------------------------------------------------

/**
 * Convert a markdown string to a PDF. No DOM required.
 *
 * Uses `marked` to tokenize the markdown and `jsPDF` to render block-level
 * elements (headings, paragraphs, code blocks, lists, blockquotes, tables,
 * horizontal rules). Inline formatting (bold/italic) within paragraphs is
 * stripped in v1.
 *
 * @category PDF Export
 */
export async function exportMarkdownToPdf(
  markdown: string,
  options?: PdfExportOptions,
): Promise<Blob> {
  const [jspdfMod, markedMod] = await Promise.all([getJsPDF(), getMarked()]);
  const { Lexer } = markedMod;
  const opts = resolveOptions(options);
  const [pageW, pageH] = opts.pageSize;
  const cw = usableContentWidth(pageW, opts.margins);
  const lineHeight = 1.4;

  const JsPDF = resolveJsPDFConstructor(jspdfMod);
  const doc = createPdfDoc(JsPDF, pageW, pageH);

  let cursorY = opts.margins.top;

  // --- Utilities ---

  function ensureSpace(needed: number) {
    const maxY = pageH - opts.margins.bottom;
    if (cursorY + needed > maxY) {
      doc.addPage();
      cursorY = opts.margins.top;
    }
  }

  function ptToMm(pt: number): number {
    return pt * 0.352778;
  }

  function lineHeightMm(fontSizePt: number): number {
    return ptToMm(fontSizePt) * lineHeight;
  }

  function renderWrappedText(
    text: string,
    x: number,
    maxW: number,
    fontSizePt: number,
    fontStyle: string = "normal",
    fontFamily: string = "Helvetica",
  ) {
    doc.setFont(fontFamily, fontStyle);
    doc.setFontSize(fontSizePt);
    const lines: string[] = doc.splitTextToSize(text, maxW);
    const lh = lineHeightMm(fontSizePt);

    for (const line of lines) {
      ensureSpace(lh);
      doc.text(line, x, cursorY);
      cursorY += lh;
    }
  }

  // --- Title ---

  if (opts.title) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(opts.title, cw);
    const titleLh = lineHeightMm(22);
    for (const line of titleLines) {
      ensureSpace(titleLh);
      doc.text(line, opts.margins.left, cursorY);
      cursorY += titleLh;
    }
    cursorY += SPACING.LG;
  }

  // --- Token rendering ---

  const tokens = Lexer.lex(markdown);

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const size = HEADING_SIZES[token.depth] ?? opts.fontSize;
        cursorY += SPACING.MD;
        renderWrappedText(
          tokensToPlainText(token.tokens ?? []),
          opts.margins.left,
          cw,
          size,
          "bold",
        );
        cursorY += SPACING.SM;
        break;
      }

      case "paragraph": {
        renderWrappedText(
          tokensToPlainText(token.tokens ?? []),
          opts.margins.left,
          cw,
          opts.fontSize,
        );
        cursorY += SPACING.SM;
        break;
      }

      case "code": {
        const codeFontSize = opts.fontSize - 2;
        doc.setFont("Courier", "normal");
        doc.setFontSize(codeFontSize);
        const lines: string[] = doc.splitTextToSize(token.text, cw - SPACING.CODE_PAD * 2);
        const lh = lineHeightMm(codeFontSize);
        const blockH = lines.length * lh + SPACING.LG;

        ensureSpace(Math.min(blockH, 40));

        doc.setFillColor(245, 245, 245);
        doc.roundedRect(opts.margins.left, cursorY - SPACING.SM, cw, blockH, 1, 1, "F");

        cursorY += SPACING.SM;
        doc.setTextColor(40);
        for (const line of lines) {
          ensureSpace(lh);
          doc.text(line, opts.margins.left + SPACING.CODE_PAD, cursorY);
          cursorY += lh;
        }
        doc.setTextColor(0);
        cursorY += SPACING.LG;
        break;
      }

      case "list": {
        const { items, ordered } = token;
        const indentX = opts.margins.left + SPACING.LIST_INDENT;
        const itemW = cw - SPACING.LIST_INDENT;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(opts.fontSize);
        const lh = lineHeightMm(opts.fontSize);

        for (let i = 0; i < items.length; i++) {
          const prefix = ordered ? `${(token.start || 1) + i}. ` : "\u2022 ";
          const text = tokensToPlainText(items[i].tokens);

          ensureSpace(lh);
          doc.text(prefix, opts.margins.left, cursorY);
          const lines: string[] = doc.splitTextToSize(text, itemW);
          for (const line of lines) {
            ensureSpace(lh);
            doc.text(line, indentX, cursorY);
            cursorY += lh;
          }
        }
        cursorY += SPACING.SM;
        break;
      }

      case "blockquote": {
        const text = tokensToPlainText(token.tokens ?? []);
        const indentX = opts.margins.left + SPACING.QUOTE_INDENT;
        const quoteW = cw - SPACING.QUOTE_INSET;

        doc.setFont("Helvetica", "italic");
        doc.setFontSize(opts.fontSize);
        const lines: string[] = doc.splitTextToSize(text, quoteW);
        const lh = lineHeightMm(opts.fontSize);

        const blockH = lines.length * lh;
        ensureSpace(Math.min(blockH, 20));
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.8);
        doc.line(
          opts.margins.left + SPACING.MD,
          cursorY - SPACING.SM,
          opts.margins.left + SPACING.MD,
          cursorY + blockH,
        );

        doc.setTextColor(100);
        for (const line of lines) {
          ensureSpace(lh);
          doc.text(line, indentX, cursorY);
          cursorY += lh;
        }
        doc.setTextColor(0);
        cursorY += SPACING.MD;
        break;
      }

      case "hr": {
        cursorY += SPACING.MD;
        ensureSpace(SPACING.SM);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.4);
        doc.line(opts.margins.left, cursorY, opts.margins.left + cw, cursorY);
        cursorY += SPACING.XL;
        break;
      }

      case "table": {
        const { header, rows } = token as Tokens.Table;
        const numCols = header.length;
        const colW = cw / numCols;
        const tableFontSize = opts.fontSize - 1;
        const lh = lineHeightMm(tableFontSize);
        const cellContentW = colW - SPACING.TABLE_CELL_PAD * 2;

        /** Render a table row, returning the number of lines in the tallest cell */
        function renderRow(
          cells: Tokens.TableCell[],
          fontStyle: "bold" | "normal",
        ): number {
          doc.setFont("Helvetica", fontStyle);
          doc.setFontSize(tableFontSize);

          // Pre-compute wrapped lines for each cell to determine row height
          const cellLines: string[][] = cells.map((cell) => {
            const text = tokensToPlainText(cell.tokens);
            return doc.splitTextToSize(text, cellContentW) as string[];
          });
          const maxLines = Math.max(1, ...cellLines.map((l) => l.length));

          ensureSpace(maxLines * lh + SPACING.SM);
          for (let c = 0; c < numCols; c++) {
            const lines = cellLines[c];
            const cellX = opts.margins.left + c * colW + SPACING.TABLE_CELL_PAD;
            for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
              doc.text(lines[lineIdx], cellX, cursorY + lineIdx * lh);
            }
          }
          cursorY += maxLines * lh + 1;
          return maxLines;
        }

        // Header row
        ensureSpace(lh + SPACING.LG);
        doc.setFillColor(240, 240, 240);
        // Draw header background (will be overdrawn if multi-line, but font metrics are stable)
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(tableFontSize);
        const headerLines = header.map((cell) =>
          doc.splitTextToSize(tokensToPlainText(cell.tokens), cellContentW),
        );
        const headerMaxLines = Math.max(1, ...headerLines.map((l: string[]) => l.length));
        doc.rect(
          opts.margins.left,
          cursorY - lh + 1,
          cw,
          headerMaxLines * lh + SPACING.SM,
          "F",
        );
        renderRow(header, "bold");

        // Header bottom border
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(opts.margins.left, cursorY - 1, opts.margins.left + cw, cursorY - 1);

        // Data rows
        for (const row of rows) {
          renderRow(row, "normal");
        }
        cursorY += SPACING.MD;
        break;
      }

      case "space": {
        cursorY += SPACING.MD;
        break;
      }

      default:
        if (token.raw.trim()) {
          renderWrappedText(token.raw.trim(), opts.margins.left, cw, opts.fontSize);
          cursorY += SPACING.SM;
        }
        break;
    }
  }

  if (opts.pageNumbers) {
    addPageNumbers(doc, pageW, pageH);
  }

  return doc.output("blob");
}
