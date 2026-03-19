import { useCallback, useRef, useState } from "react";

import type { PdfExportOptions } from "../lib/pdf-export";
import { exportElementToPdf, exportMarkdownToPdf } from "../lib/pdf-export";

/**
 * Result returned by the useExportPdf hook.
 * @category Hooks
 */
export interface UseExportPdfResult {
  /** DOM capture: export a rendered HTML element as a high-fidelity PDF */
  exportElementToPdf: (element: HTMLElement, options?: PdfExportOptions) => Promise<Blob>;
  /** Headless: export a raw markdown string as PDF (no DOM required) */
  exportMarkdownToPdf: (markdown: string, options?: PdfExportOptions) => Promise<Blob>;
  /** Convenience: export element and trigger browser download */
  downloadElementAsPdf: (element: HTMLElement, options?: PdfExportOptions) => Promise<void>;
  /** Convenience: export markdown and trigger browser download */
  downloadMarkdownAsPdf: (markdown: string, options?: PdfExportOptions) => Promise<void>;
  /** Whether a PDF export is currently in progress */
  isExporting: boolean;
  /** Error from the last export attempt */
  error: Error | null;
}

const DEFAULT_FILENAME = "document.pdf";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * React hook for exporting content as PDF.
 *
 * Provides two export paths:
 * - **DOM capture** (`exportElementToPdf` / `downloadElementAsPdf`): captures a
 *   rendered HTML element with full styling (syntax highlighting, math, diagrams).
 * - **Headless** (`exportMarkdownToPdf` / `downloadMarkdownAsPdf`): converts raw
 *   markdown to a formatted PDF without requiring a DOM.
 *
 * @category Hooks
 */
export function useExportPdf(): UseExportPdfResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable ref for the generic wrapper to avoid re-creating callbacks
  const wrapExport = useRef(
    <TArgs extends unknown[]>(fn: (...args: TArgs) => Promise<Blob>) =>
      async (...args: TArgs): Promise<Blob> => {
        setIsExporting(true);
        setError(null);
        try {
          return await fn(...args);
        } catch (err) {
          const processed = toError(err);
          setError(processed);
          throw processed;
        } finally {
          setIsExporting(false);
        }
      },
  ).current;

  const wrappedExportElement = useCallback(wrapExport(exportElementToPdf), []);
  const wrappedExportMarkdown = useCallback(wrapExport(exportMarkdownToPdf), []);

  const downloadElementAsPdf = useCallback(
    async (element: HTMLElement, options?: PdfExportOptions): Promise<void> => {
      const blob = await wrappedExportElement(element, options);
      triggerDownload(blob, options?.filename ?? DEFAULT_FILENAME);
    },
    [wrappedExportElement],
  );

  const downloadMarkdownAsPdf = useCallback(
    async (markdown: string, options?: PdfExportOptions): Promise<void> => {
      const blob = await wrappedExportMarkdown(markdown, options);
      triggerDownload(blob, options?.filename ?? DEFAULT_FILENAME);
    },
    [wrappedExportMarkdown],
  );

  return {
    exportElementToPdf: wrappedExportElement,
    exportMarkdownToPdf: wrappedExportMarkdown,
    downloadElementAsPdf,
    downloadMarkdownAsPdf,
    isExporting,
    error,
  };
}
